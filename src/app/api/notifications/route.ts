import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase credentials missing' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bodyJson = await req.json().catch(() => ({}));
    const {
      title = '🔔 LEAD Notification',
      body = 'Time to check in on your ambitions.',
      icon = '/logo.png',
      badge = '/logo-white.png',
      url = '/',
    } = bodyJson;

    let sentCount = 0;
    let failedCount = 0;

    if (vapidPublic && vapidPrivate) {
      try {
        webpush.setVapidDetails('mailto:notifications@leadapp.local', vapidPublic, vapidPrivate);

        const { data: subscriptions, error: subError } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', user.id);

        if (!subError && subscriptions && subscriptions.length > 0) {
          const payload = JSON.stringify({
            title,
            body,
            icon,
            badge,
            url,
          });

          await Promise.all(
            subscriptions.map(async (sub) => {
              const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh,
                  auth: sub.auth,
                },
              };

              try {
                await webpush.sendNotification(pushSubscription, payload);
                sentCount++;
              } catch (pushErr: any) {
                failedCount++;
                if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
                  // Expired endpoint, delete from database
                  await supabase.from('push_subscriptions').delete().eq('id', sub.id);
                }
              }
            })
          );
        }
      } catch (vapidErr: any) {
        console.error('VAPID error:', vapidErr.message);
      }
    }

    // Record notification log in Supabase
    try {
      await supabase.from('notification_logs').insert({
        user_id: user.id,
        notification_title: title,
        notification_body: body,
        delivered_at: new Date().toISOString(),
        pushed: sentCount > 0,
        opened: false,
      });
    } catch (logErr: any) {
      console.warn('Could not record notification log:', logErr.message);
    }

    return NextResponse.json({
      success: true,
      sentCount,
      failedCount,
      message: sentCount > 0 ? 'Notification pushed successfully' : 'Notification processed',
    });
  } catch (error: any) {
    console.error('Notification API Error:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
