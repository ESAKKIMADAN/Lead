import { createGroq } from '@ai-sdk/groq';
import { streamText, generateObject } from 'ai';
import { z } from 'zod';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { messages, profileData } = await req.json();

    let chatMessages = messages;
    if (!chatMessages || chatMessages.length === 0) {
      chatMessages = [
        {
          role: 'user',
          content: `[System Instruction: Open with ONE punchy sentence that calls out the user by name and hits them with their raw reason "${profileData?.reason || 'Unknown'}". Then ask ONE short question about what they are doing RIGHT NOW for their goal "${profileData?.goal || 'Unknown'}". Simple English. Max 2 sentences total.]`
        }
      ];
    }

    const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

    // ----------------------------------------------------
    // STEP 1: The Analyzer Engine (State Pre-Processing)
    // ----------------------------------------------------
    const recentMessages = chatMessages.slice(-4).map((m: any) => `${m.role}: ${m.content}`).join('\n');
    
    let state = {
      emotion: 'focused',
      recommended_communication: {
        directness: 0.7,
        energy: 0.6,
        emotional_support: 0.5,
        detail: 0.3,
        challenge: 0.7,
        humor: 0.3
      }
    };

    try {
      const analysisResult = await generateObject({
        model: groq('openai/gpt-oss-20b'),
        schema: z.object({
          emotion: z.string().describe("The user's current emotional state (e.g. frustrated, motivated, procrastinating)."),
          recommended_communication: z.object({
            directness: z.number().min(0).max(1).describe("How blunt should LEAD be? (0.0 = gentle, 1.0 = extremely blunt)"),
            energy: z.number().min(0).max(1).describe("How energetic should LEAD sound? (0.0 = calm/serious, 1.0 = highly energetic/excited)"),
            emotional_support: z.number().min(0).max(1).describe("How much empathy does the user need? (0.0 = cold logic, 1.0 = highly empathetic)"),
            detail: z.number().min(0).max(1).describe("Length of response (0.0 = short/one sentence, 1.0 = detailed explanation)"),
            challenge: z.number().min(0).max(1).describe("Accountability level (0.0 = gentle push, 1.0 = aggressive accountability)"),
            humor: z.number().min(0).max(1).describe("Tone seriousness (0.0 = serious/urgent, 1.0 = playful/funny)")
          }).describe("The exact communication profile you recommend LEAD uses for the very next response.")
        }),
        prompt: `Analyze the user's current state based on their recent messages and behavior.
      Name: ${profileData?.name}
      Goal: ${profileData?.goal}
      Tasks Today: ${profileData?.behavioralHistory?.completedTasks || 0} completed, ${profileData?.behavioralHistory?.pendingTasks || 0} pending.
      
      Historical Communication Profile (What usually works best for this user):
      ${JSON.stringify(profileData?.communication_profile || { directness: 0.5, energy: 0.5, emotional_support: 0.5, detail: 0.5, challenge: 0.5, humor: 0.5 })}
      
      Declared onboarding preferences:
      Avoidance response: ${profileData?.psychology_profile?.avoidance_response || 'Not specified'}
      Action trigger: ${profileData?.psychology_profile?.action_trigger || 'Not specified'}
      
      Recent chat:
      ${recentMessages}
      
      Determine their emotion and the exact communication profile values (0.0 to 1.0) to use.`
      });
      if (analysisResult?.object) {
        state = analysisResult.object;
      }
    } catch (err: any) {
      console.warn('Analysis fallback used due to:', err?.message || err);
    }

    // ----------------------------------------------------
    // STEP 2: The Communicator Engine (Response Gen)
    // ----------------------------------------------------
    const now = new Date();
    const currentDateStr = now.toISOString().split('T')[0];
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const systemPrompt = `You are LEAD — an adaptive AI personal accountability engine.
Your purpose is to help the user take meaningful action toward their long-term goals.

USER PROFILE:
Name: ${profileData?.name || 'User'}
Long-term Goal: ${profileData?.goal || 'Unknown'}
The Reason WHY: ${profileData?.reason || 'Unknown'}
Category: ${profileData?.category || 'Unknown'}
Today: ${dayOfWeek}, ${currentDateStr}
Tomorrow: ${tomorrowStr}

BEHAVIORAL HISTORY:
Tasks Today: ${profileData?.behavioralHistory?.completedTasks || 0} completed, ${profileData?.behavioralHistory?.pendingTasks || 0} pending.

STATE ANALYSIS:
User Emotion: ${state.emotion}
Communication Profile for THIS response (0.0 to 1.0 scale):
- Directness: ${state.recommended_communication.directness} (0 = gentle, 1 = extremely blunt)
- Energy: ${state.recommended_communication.energy} (0 = calm, 1 = highly excited)
- Emotional Support: ${state.recommended_communication.emotional_support} (0 = cold logic, 1 = high empathy)
- Detail: ${state.recommended_communication.detail} (0 = short, 1 = detailed)
- Challenge: ${state.recommended_communication.challenge} (0 = gentle push, 1 = aggressive accountability)
- Humor: ${state.recommended_communication.humor} (0 = serious, 1 = playful)

COMMUNICATION PRINCIPLES:
1. Calibrate your response STRICTLY according to the Communication Profile above. These 6 dimensions were calculated to be the most effective style for them right now.
2. If they have 0 completed tasks and high pending tasks, push them. If they have completed tasks, acknowledge it.
3. Max 2-3 sentences per reply. Never go longer. Use simple, easy English. No fluff.

ACTIONS (STRICT & RELIABLE COMMAND EXECUTION):
Whenever the user asks to add a reminder, schedule a test, birthday, exam, meeting, deadline, or to-do task:
- You MUST append an action command tag [ACTION:TASK|Title|Type|HH:MM|YYYY-MM-DD] to your response.
- "Title": Clean, clear title (e.g. "Birthday", "Maths Test", "Friend's Birthday", "Doctor Appointment", "English Study").
- "Type": Use 'short_term' for any task, reminder, test, or to-do; use 'event' for birthdays or special calendar occasions; use 'daily' for recurring habits. (Both 'short_term' and 'event' appear directly in the user's Tasks and Calendar).
- "HH:MM": 24-hour format (e.g. "16:00" for 4 PM, "09:30" for 9:30 AM). Leave blank if no time mentioned.
- "YYYY-MM-DD": Target date calculated relative to Today (${currentDateStr}). If user says "tomorrow", use ${tomorrowStr}. If user specifies a weekday or month/day (e.g. "Friday", "Oct 15"), calculate the exact YYYY-MM-DD. If no date is given, default to Today (${currentDateStr}).
- If user says "add note", "take a note", "save thought" -> append [ACTION:NOTE|Title|Content of Note|mint].
- ALWAYS include a brief verbal confirmation in your message confirming what was added to their tasks.

Examples:
- User: "remind me about maths test tomorrow" -> "Got it. Added Maths Test for tomorrow to your tasks. [ACTION:TASK|Maths Test|short_term||${tomorrowStr}]"
- User: "birthday test date oct 12" -> "Scheduled Birthday Test for Oct 12 in your tasks. [ACTION:TASK|Birthday Test|short_term||2026-10-12]"
- User: "remind me friend birthday on friday" -> "Added Friend's Birthday to your tasks. [ACTION:TASK|Friend's Birthday|event||${currentDateStr}]"
- User: "add reminder call doctor at 3pm" -> "Reminder set for doctor call today at 3:00 PM. [ACTION:TASK|Call Doctor|short_term|15:00|${currentDateStr}]"`;

    const result = await streamText({
      model: groq('openai/gpt-oss-120b'),
      system: systemPrompt,
      messages: chatMessages,
    });

    const encoder = new TextEncoder();
    const customStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            const formatted = `0:${JSON.stringify(chunk)}\n`;
            controller.enqueue(encoder.encode(formatted));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      }
    });

    return new Response(customStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache, no-transform',
        'X-Used-Communication': JSON.stringify(state.recommended_communication),
        'X-Used-Tone': state.emotion,
        'Access-Control-Expose-Headers': 'X-Used-Communication, X-Used-Tone',
      },
    });
  } catch (error: any) {
    const msg = error?.message || 'Unknown error';
    console.error('Chat API Error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
