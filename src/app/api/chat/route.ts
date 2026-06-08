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

YOUR PERSONA:
- Talk like a no-nonsense friend. Short. Blunt. Real.
- Use simple, easy English. No big words.
- Max 2 sentences per reply. Never go longer.
- Call them out. Make them feel it. Then ask one sharp question.
- No fluff. No full stops on long thoughts.
- Tough love when they slack. Quick praise when they act.`;

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
