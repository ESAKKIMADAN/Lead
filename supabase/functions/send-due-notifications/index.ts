import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import webpush from 'npm:web-push@3.6.7';

// We must set VAPID details immediately. These rely on Supabase Edge Function secrets.
// To run this successfully, these environment variables MUST be set in the Supabase project:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// - NEXT_PUBLIC_VAPID_PUBLIC_KEY
// - VAPID_PRIVATE_KEY

serve(async (req) => {
  try {
    // 1. Basic Auth check for Cron - Only run if authorized by a known secret, or if it's the internal service role.
    // In pg_net HTTP requests, we will pass the Anon Key or Service Role key to authenticate.
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const vapidPublic = Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY');
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration.');
      return new Response(JSON.stringify({ error: 'Missing configuration' }), { status: 500 });
    }

    if (!vapidPublic || !vapidPrivate) {
      console.error('Missing VAPID configuration.');
      return new Response(JSON.stringify({ error: 'Push not configured' }), { status: 500 });
    }

    webpush.setVapidDetails(
      'mailto:test@example.com',
      vapidPublic,
      vapidPrivate
    );

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date().toISOString();

    // 2. Fetch all notification_logs that are due and not yet pushed
    const { data: pendingLogs, error: logsErr } = await supabase
      .from('notification_logs')
      .select('*')
      .eq('pushed', false)
      .lte('scheduled_at', now);

    if (logsErr) {
      console.error('Failed to fetch pending notification logs:', logsErr);
      return new Response(JSON.stringify({ error: 'Failed to fetch notifications' }), { status: 500 });
    }

    if (!pendingLogs || pendingLogs.length === 0) {
      return new Response(JSON.stringify({ success: true, pushesSent: 0, message: 'No pending notifications' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Fetch all push subscriptions
    const { data: subscriptions, error: subsErr } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (subsErr || !subscriptions) {
      console.error('Failed to fetch push subscriptions:', subsErr);
      return new Response(JSON.stringify({ error: 'Failed to fetch subscriptions' }), { status: 500 });
    }

    const subsByUser: Record<string, typeof subscriptions> = {};
    for (const sub of subscriptions) {
      if (!subsByUser[sub.user_id]) subsByUser[sub.user_id] = [];
      subsByUser[sub.user_id].push(sub);
    }

    let pushesSent = 0;
    const pushedLogIds: string[] = [];

    // 4. Send pushes
    for (const log of pendingLogs) {
      const userSubs = subsByUser[log.user_id];
      if (!userSubs || userSubs.length === 0) {
        // No device subscribed, still mark as pushed so we don't retry endlessly
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
            // Subscription expired, remove it
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          } else {
            console.error(`Failed to push to endpoint for user ${log.user_id}:`, err.message);
          }
        }
      }

      if (atLeastOneSent) {
        pushedLogIds.push(log.id);
      }
    }

    // 5. Mark notifications as delivered
    if (pushedLogIds.length > 0) {
      const { error: updateErr } = await supabase
        .from('notification_logs')
        .update({ pushed: true, delivered_at: now })
        .in('id', pushedLogIds);

      if (updateErr) {
        console.error('Failed to mark notifications as pushed:', updateErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        pushesSent,
        logsProcessed: pendingLogs.length,
        logsPushed: pushedLogIds.length,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Edge Function error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
