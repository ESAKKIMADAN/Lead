import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.warn('VAPID keys missing. Web push is disabled.');
      return NextResponse.json({ error: 'Push notifications not configured' }, { status: 500 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    webpush.setVapidDetails(
      'mailto:test@example.com',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    // Always use service role so we can read push_subscriptions regardless of RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { user_id, test } = body;
    let { title, body: notifBody } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    // If test=true, pick a random notification from notification_logs for this user
    if (test) {
      const { data: logs, error: logsErr } = await supabase
        .from('notification_logs')
        .select('notification_title, notification_body')
        .eq('user_id', user_id)
        .limit(50);

      if (logsErr || !logs || logs.length === 0) {
        // Fallback if no logs exist yet
        title = 'LEAD is Ready';
        notifBody = 'Push notifications are working. Your scheduled notifications will arrive on time.';
      } else {
        // Pick a random one
        const pick = logs[Math.floor(Math.random() * logs.length)];
        title = pick.notification_title;
        notifBody = pick.notification_body;
      }
    }

    if (!title || !notifBody) {
      return NextResponse.json({ error: 'Missing title or body' }, { status: 400 });
    }

    // Fetch all push subscriptions for this user
    const { data: subscriptions, error: subErr } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id);

    if (subErr) {
      console.error('Error fetching subscriptions:', subErr);
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: false, message: 'No push subscription found. Enable notifications first.' }, { status: 404 });
    }

    const payload = JSON.stringify({
      title,
      body: notifBody,
      icon: '/logo.png',
      badge: '/logo-white.png',
      url: '/',
    });

    let sent = 0;
    for (const sub of subscriptions) {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      try {
        await webpush.sendNotification(pushSub, payload);
        sent++;
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Expired — clean up
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        } else {
          console.error('Push error:', err.message);
        }
      }
    }

    if (sent === 0) {
      return NextResponse.json({ success: false, message: 'All subscriptions expired. Please re-enable notifications.' }, { status: 410 });
    }

    return NextResponse.json({ success: true, sent });
  } catch (err: any) {
    console.error('Push API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
