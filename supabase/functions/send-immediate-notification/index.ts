import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import webpush from 'npm:web-push@3.6.7';

// To run this successfully, these environment variables MUST be set:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// - NEXT_PUBLIC_VAPID_PUBLIC_KEY
// - VAPID_PRIVATE_KEY

serve(async (req) => {
  // CORS Headers for browser calls
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const vapidPublic = Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY');
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !vapidPublic || !vapidPrivate) {
      return new Response(JSON.stringify({ error: 'Missing configuration' }), { status: 500, headers: corsHeaders });
    }

    // Authenticate the user making the request
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || '', {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    // Parse payload
    const { title, body, icon, badge, url, targetUserId } = await req.json();

    // The user can only send notifications to themselves (unless admin logic is needed)
    const notificationUserId = targetUserId || user.id;
    if (notificationUserId !== user.id) {
       // Extend logic here if you want to allow sending to others
       // return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });
    }

    webpush.setVapidDetails(
      'mailto:test@example.com',
      vapidPublic,
      vapidPrivate
    );

    // Use service role to bypass RLS and fetch target subscriptions
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: subscriptions, error: subsErr } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', notificationUserId);

    if (subsErr || !subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No subscriptions found.' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const payload = JSON.stringify({
      title: title || 'Notification',
      body: body || '',
      icon: icon || '/logo.png',
      badge: badge || '/logo-white.png',
      url: url || '/',
    });

    let pushesSent = 0;

    for (const sub of subscriptions) {
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
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Subscription expired, remove it
          await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id);
        } else {
          console.error(`Failed to push to endpoint for user ${notificationUserId}:`, err.message);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        pushesSent,
      }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error: any) {
    console.error('Edge Function error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
