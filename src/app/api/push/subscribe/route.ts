import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { user_id, endpoint, p256dh, auth } = await request.json();

    if (!user_id || !endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    // Use service role to bypass RLS completely
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Delete any old subscription for this user+endpoint, then insert fresh
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user_id)
      .eq('endpoint', endpoint);

    const { error } = await supabase
      .from('push_subscriptions')
      .insert({ user_id, endpoint, p256dh, auth });

    if (error) {
      console.error('[Subscribe] DB error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Subscribe] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
