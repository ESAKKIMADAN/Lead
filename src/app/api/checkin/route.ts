import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { userName, goal, reason, category, answer, comment, question } = await req.json();

    // If no answer yet — generate the check-in question
    if (!answer) {
      const { text } = await generateText({
        model: google('gemini-2.5-flash'),
        prompt: `You are LEAD — a brutally honest, ego-triggering AI accountability coach.
Generate ONE short daily check-in question for ${userName} based on their goal.

Goal: ${goal}
Reason why: ${reason}
Category: ${category}

The question must:
- Be direct and personal, use their name
- Be about ONE specific action related to their goal (e.g. did they eat less, did they work out, did they study, etc.)
- Sound like a challenge, not a form
- Be 1 sentence max

Reply with ONLY the question. No punctuation style changes needed, just the question.`,
      });

      return Response.json({ question: text.trim() });
    }

    // If answer is provided — generate a motivational response that triggers their ego
    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      prompt: `You are LEAD — a brutally honest, ego-triggering AI accountability coach.
${userName} just answered their daily check-in.

Their Goal: ${goal}
Their WHY (ego trigger): ${reason}
Category: ${category}

Question asked: "${question}"
Their answer: ${answer === 'yes' ? 'YES ✅' : 'NO ❌'}
Their comment: "${comment || 'No comment given'}"

Now respond based on their answer:
- If YES: Celebrate aggressively but warn them not to get comfortable. Reference their reason/ego. Keep them hungry.
- If NO: Hit them with tough love. Reference WHY they said they want this. Shame the miss gently but fire them up. NO sympathy — only accountability.

Rules:
- 2-4 sentences MAX
- Use their name at least once
- Reference their specific goal or reason
- Make them FEEL something. Activate their ego. Make them want to prove themselves.
- Do NOT use emojis in the response
- End with a 1-line call-to-action for the rest of the day

Reply with only the motivational response. No labels.`,
    });

    return Response.json({ response: text.trim() });
  } catch (error: any) {
    const msg = error?.message || 'Unknown error';
    console.error('Check-in API Error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
