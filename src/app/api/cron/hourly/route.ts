import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import { createGroq } from '@ai-sdk/groq';
import { generateObject } from 'ai';
import { z } from 'zod';

export const runtime = 'nodejs';

// Add the same LEAD system prompt
const LEAD_SYSTEM_PROMPT = `You are LEAD — the AI core of LEAD, a personal accountability engine built by Solvecrew.

Your entire personality is shaped by the user's stored "Ego Profile": their long-term goals, their stated reasons (the WHY behind each goal), and their daily task completion history.

You do NOT speak like a generic AI assistant. You speak like the most honest mentor the user has ever had — someone who respects them too much to coddle them, and cares too much to stay silent when they slack.

### YOUR TONE RULES:
- **Morning Reminder (06:00-09:00 local time):** Energy-forward. Set the intention for the day. Reference today's top task if available. Never more than 3 sentences.
- **Lunch Check-in (12:00-13:00 local time):** Mid-day pulse check. Is the user on course? Quick calibration message. Ask one micro-question tied to their goal if streak < 3.
- **Evening Reflection (20:00-21:00 local time):** Trigger the progress check. If YES: Celebrate briefly. Update the streak narrative. If NO: Compassionate but unflinching. Remind them of their Ego. Set tomorrow's micro-commitment.
- **Hourly Check-in:** A quick, sharp, and highly motivating pulse check. Remind them of what's at stake. One sentence max.

### NOTIFICATION STYLE RULES:
1. No emoji unless it's the ONLY one and it earns its place.
2. Never start with "Hey" or "Hi" or "Don't forget."
3. Reference the user's actual goal or reason at least once per evening message.
4. The notification title should feel like a headline from the user's future biography.
5. Never use the word "productive," "crush it," "amazing," "awesome," or "journey."
6. Morning titles are declarations. Evening titles are questions or verdicts.
7. If the user has a 7-day streak, the message must feel like a ceremony.
`;

export async function GET(request: Request) {
  try {
    // Basic protection (Optional: verify CRON_SECRET from Vercel)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('Missing SUPABASE_SERVICE_ROLE_KEY - Cron cannot fetch user data.');
      return NextResponse.json({ error: 'Missing configuration' }, { status: 500 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        'mailto:test@example.com',
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
    } else {
      return NextResponse.json({ error: 'Push not configured' }, { status: 500 });
    }

    const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
    const now = new Date();
    const hours = now.getHours();

    let timeOfDay: 'morning' | 'lunch' | 'evening' | 'hourly' = 'hourly';
    if (hours === 8) timeOfDay = 'morning';
    else if (hours === 12) timeOfDay = 'lunch';
    else if (hours === 18) timeOfDay = 'evening';

    // 1. Fetch all active egos and their profiles
    const { data: egos, error: egosError } = await supabase
      .from('egos')
      .select('*, profiles(name, streak)');

    if (egosError || !egos) {
      return NextResponse.json({ error: 'Failed to fetch egos' }, { status: 500 });
    }

    // 2. Fetch all push subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (subsError || !subscriptions) {
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
    }

    let pushesSent = 0;

    // 3. Process each user that has an active ego and a push subscription
    for (const ego of egos) {
      if (!ego.active || !ego.profiles) continue;

      const userSubs = subscriptions.filter(sub => sub.user_id === ego.user_id);
      if (userSubs.length === 0) continue;

      // Generate the personalized notification
      const payload = {
        user_name: (ego.profiles as any).name,
        ego_profile: {
          goal: ego.goal,
          reason: ego.reason,
          category: ego.category,
        },
        current_streak: (ego.profiles as any).streak || 0,
        time_of_day: timeOfDay,
      };

      try {
        const { object } = await generateObject({
          model: groq('llama-3.3-70b-versatile'),
          system: LEAD_SYSTEM_PROMPT,
          prompt: `Generate a notification based on the following context:\n${JSON.stringify(payload, null, 2)}`,
          schema: z.object({
            notification_title: z.string().max(60),
            notification_body: z.string().max(180),
            tone: z.enum(['fire', 'truth', 'challenge', 'celebrate', 'calibrate']),
            micro_action: z.string().nullable(),
          }),
        });

        const pushPayload = JSON.stringify({
          title: object.notification_title,
          body: object.notification_body,
          icon: '/logo.png',
          badge: '/logo-white.png',
          url: '/',
        });

        // Broadcast to all of this user's devices
        for (const sub of userSubs) {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            }
          };

          try {
            await webpush.sendNotification(pushSubscription, pushPayload);
            pushesSent++;
          } catch (err: any) {
            if (err.statusCode === 404 || err.statusCode === 410) {
              await supabase.from('push_subscriptions').delete().eq('id', sub.id);
            } else {
              console.error('Failed to push to endpoint:', sub.endpoint, err);
            }
          }
        }
      } catch (err) {
        console.error('Failed to generate/send push for user', ego.user_id, err);
      }
    }

    return NextResponse.json({ success: true, pushesSent });
  } catch (error: any) {
    console.error('Cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
