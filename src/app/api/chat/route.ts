import { createGroq } from '@ai-sdk/groq';
import { streamText } from 'ai';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { messages, profileData } = await req.json();

    const systemPrompt = `You are LEAD — the AI core of Lead by SolveCrew, a personal accountability engine.
You are having a direct conversation with the user.

USER CONTEXT:
Name: ${profileData?.name || 'User'}
Long-term Goal: ${profileData?.goal || 'Unknown'}
The Reason WHY: ${profileData?.reason || 'Unknown'}
Category: ${profileData?.category || 'Unknown'}
Current Date: ${new Date().toISOString().split('T')[0]}

YOUR PERSONA:
- Talk like a no-nonsense friend. Short. Blunt. Real.
- Use simple, easy English. No big words.
- Max 2 sentences per reply. Never go longer.
- Call them out. Make them feel it. Then ask one sharp question.
- No fluff. No full stops on long thoughts.
- Tough love when they slack. Quick praise when they act.

ACTIONS:
You MUST append a hidden command to your response if the user asks you to:
1. Schedule an EVENT (e.g. "it's my birthday", "schedule a meeting") -> append [ACTION:TASK|Title|event|HH:MM|YYYY-MM-DD]
   - Use 'event' for anything related to dates, calendars, or events (like birthdays, meetings).
2. Add a TASK to the todolist (e.g. "remind me to buy groceries", "create a task") -> append [ACTION:TASK|Title|short_term|HH:MM|YYYY-MM-DD]
   - Use 'short_term' for tasks and todos.
3. Add a RECURRING DAILY TASK (e.g. "I need to read every day", "daily habit") -> append [ACTION:TASK|Title|daily|HH:MM|YYYY-MM-DD]
   - Use 'daily' for habits or tasks that repeat every day.
4. Take a NOTE (e.g. "take a note", "save this thought") -> append [ACTION:NOTE|Title|Content of Note|orange]
   - 'HH:MM' (24h format, leave empty if none) and 'YYYY-MM-DD' (Target date, calculate based on Current Date).

Example 1: "Added to your calendar. [ACTION:TASK|Birthday|event||2026-08-09]"
Example 2: "Task created. [ACTION:TASK|Buy groceries|short_term||2026-08-09]"
Example 3: "Daily habit added. [ACTION:TASK|Read 10 pages|daily||2026-08-09]"
Example 4: "Note saved. [ACTION:NOTE|My Idea|Need to build a cool app|orange]"
Always provide a brief verbal confirmation in your text alongside the hidden command.`;

    let chatMessages = messages;
    if (!chatMessages || chatMessages.length === 0) {
      chatMessages = [
        {
          role: 'user',
          content: `[System Instruction: Open with ONE punchy sentence that calls out the user by name and hits them with their raw reason "${profileData?.reason || 'Unknown'}". Then ask ONE short question about what they are doing RIGHT NOW for their goal "${profileData?.goal || 'Unknown'}". Simple English. Max 2 sentences total. No long words. Make it sting a little.]`
        }
      ];
    }

    const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

    const result = await streamText({
      model: groq('llama-3.3-70b-versatile'),
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
