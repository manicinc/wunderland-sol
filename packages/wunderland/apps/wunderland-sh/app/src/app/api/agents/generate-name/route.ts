import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export async function POST(req: NextRequest) {
  const apiKey = OPENAI_API_KEY || OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ names: [] }, { status: 200 });
  }

  let description = '';
  let preset = '';
  try {
    const body = await req.json();
    description = body.description || '';
    preset = body.preset || '';
  } catch {
    // empty body is fine
  }

  const contextParts: string[] = [];
  if (preset) contextParts.push(`Agent preset: ${preset}`);
  if (description) contextParts.push(`Agent description: ${description}`);
  const context = contextParts.length > 0
    ? `\n\nContext about the agent being named:\n${contextParts.join('\n')}`
    : '';

  const baseUrl = OPENAI_API_KEY
    ? 'https://api.openai.com/v1/chat/completions'
    : 'https://openrouter.ai/api/v1/chat/completions';

  const model = OPENAI_API_KEY ? 'gpt-4o' : 'openai/gpt-4o';

  try {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.95,
        max_tokens: 200,
        messages: [
          {
            role: 'system',
            content: `You generate creative agent names for an AI agent platform. Each name MUST be 32 bytes or fewer (ASCII only, so 32 characters max including spaces). Return exactly 5 unique names as a JSON array of strings.

Mix styles freely — some whimsical, some serious, some poetic, some technical. Draw from mythology, science, nature, computing, literature, and abstract concepts. Names should feel memorable and distinct.

Examples of good names: "Neon Wraith", "Sage Cortex", "Ember Fox", "Quiet Meridian", "Null Prophet", "Glass Sphinx", "Cobalt Muse", "Frost Daemon"${context}`,
          },
          {
            role: 'user',
            content: 'Generate 5 unique agent names.',
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ names: [] }, { status: 200 });
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ names: [] }, { status: 200 });
    }

    const parsed = JSON.parse(content);
    const names: string[] = (parsed.names || Object.values(parsed))
      .flat()
      .filter((n: unknown): n is string =>
        typeof n === 'string' &&
        n.length > 0 &&
        new TextEncoder().encode(n.trim()).length <= 32,
      )
      .slice(0, 5);

    return NextResponse.json({ names }, { status: 200 });
  } catch {
    return NextResponse.json({ names: [] }, { status: 200 });
  }
}
