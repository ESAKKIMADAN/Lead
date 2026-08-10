import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Basic protection — verify CRON_SECRET from Vercel
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('Missing SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json({ error: 'Missing configuration' }, { status: 500 });
    }

    // Setup VAPID
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      return NextResponse.json({ error: 'Push not configured' }, { status: 500 });
    }

    webpush.setVapidDetails(
      'mailto:test@example.com',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    // Use service role to bypass RLS — cron runs server-side
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const now = new Date().toISOString();

    // 1. Fetch all notification_logs that are due and not yet pushed
    //    scheduled_at <= now AND pushed = false
    const { data: pendingLogs, error: logsErr } = await supabase
      .from('notification_logs')
      .select('*')
      .eq('pushed', false)
      .lte('scheduled_at', now);

    if (logsErr) {
      console.error('Failed to fetch pending notification logs:', logsErr);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    if (!pendingLogs || pendingLogs.length === 0) {
      return NextResponse.json({ success: true, pushesSent: 0, message: 'No pending notifications' });
    }

    // 2. Fetch all push subscriptions (grouped by user)
    const { data: subscriptions, error: subsErr } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (subsErr || !subscriptions) {
      console.error('Failed to fetch push subscriptions:', subsErr);
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
    }

    // Build a map of user_id -> subscriptions[]
    const subsByUser: Record<string, typeof subscriptions> = {};
    for (const sub of subscriptions) {
      if (!subsByUser[sub.user_id]) subsByUser[sub.user_id] = [];
      subsByUser[sub.user_id].push(sub);
    }

    let pushesSent = 0;
    const pushedLogIds: string[] = [];

    // 3. For each pending notification, push to the user's devices
    for (const log of pendingLogs) {
      const userSubs = subsByUser[log.user_id];
      if (!userSubs || userSubs.length === 0) {
        // No device subscribed for this user — mark as pushed so we don't retry endlessly
        pushedLogIds.push(log.id);
        continue;
      }

      const payload = JSON.stringify({
        title: log.notification_title,
        body: log.notification_body,
        icon: '/logo.png',
        badge: '/logo-white.png',
        url: '/',
      });

      let atLeastOneSent = false;

      for (const sub of userSubs) {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, payload);
          pushesSent++;
          atLeastOneSent = true;
        } catch (err: any) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            // Subscription expired — remove it
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          } else {
            console.error('Failed to push to endpoint:', sub.endpoint, err.message);
          }
        }
      }

      if (atLeastOneSent) {
        pushedLogIds.push(log.id);
      }
    }

    // 4. Mark all pushed notifications as delivered
    if (pushedLogIds.length > 0) {
      const { error: updateErr } = await supabase
        .from('notification_logs')
        .update({ pushed: true, delivered_at: now })
        .in('id', pushedLogIds);

      if (updateErr) {
        console.error('Failed to mark notifications as pushed:', updateErr);
      }
    }

    return NextResponse.json({
      success: true,
      pushesSent,
      logsProcessed: pendingLogs.length,
      logsPushed: pushedLogIds.length,
    });
  } catch (error: any) {
    console.error('Cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
