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

    const state = analysisResult.object;

    // ----------------------------------------------------
    // STEP 2: The Communicator Engine (Response Gen)
    // ----------------------------------------------------
    const systemPrompt = `You are LEAD — an adaptive AI personal accountability engine.
Your purpose is to help the user take meaningful action toward their long-term goals.

USER PROFILE:
Name: ${profileData?.name || 'User'}
Long-term Goal: ${profileData?.goal || 'Unknown'}
The Reason WHY: ${profileData?.reason || 'Unknown'}
Category: ${profileData?.category || 'Unknown'}
Current Date: ${new Date().toISOString().split('T')[0]}

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

ACTIONS:
You MUST append a hidden command to your response if the user asks you to:
1. Schedule an EVENT (e.g. "it's my birthday", "schedule a meeting") -> append [ACTION:TASK|Title|event|HH:MM|YYYY-MM-DD]
   - Use 'event' for anything related to dates, calendars, or events (like birthdays, meetings).
2. Add a TASK to the todolist (e.g. "I need to read a book", "remind me to...", "add to my todo list") -> append [ACTION:TASK|Title|short_term|HH:MM|YYYY-MM-DD]
   - Use 'short_term' for any actionable tasks, to-dos, or single actions. Do NOT use NOTE for actionable tasks.
3. Add a RECURRING DAILY TASK (e.g. "I need to read every day", "daily habit") -> append [ACTION:TASK|Title|daily|HH:MM|YYYY-MM-DD]
   - Use 'daily' for habits or tasks that repeat every day.
4. Take a NOTE (e.g. "study notes", "grocery list", "food list", "diary entry", "save this thought") -> append [ACTION:NOTE|Title|Content of Note|mint]
   - Use 'NOTE' ONLY for passive information, lists, journaling, or reference material. Do NOT use NOTE for actionable tasks.
   - 'HH:MM' (24h format, leave empty if none) and 'YYYY-MM-DD' (Target date, calculate based on Current Date).

Example 1: "Added to your calendar. [ACTION:TASK|Birthday|event||2026-08-09]"
Example 2: "Task created. [ACTION:TASK|Buy groceries|short_term||2026-08-09]"
Example 3: "Daily habit added. [ACTION:TASK|Read 10 pages|daily||2026-08-09]"
Example 4: "Note saved. [ACTION:NOTE|My Idea|Need to build a cool app|mint]"
Always provide a brief verbal confirmation in your text alongside the hidden command.`;

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
        'Access-Control-Expose-Headers': 'X-Used-Communication',
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
