import { NextRequest, NextResponse } from 'next/server';
import { Opik } from 'opik';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.CHATGPT });

const opikClient = new Opik({
  apiKey: process.env.OPIK_API_KEY,
  apiUrl: 'https://www.comet.com/opik/api',
  projectName: 'proompter',
  workspaceName: 'ivan-top',
});

export async function POST(req: NextRequest) {
  try {
    const { task, prompts } = await req.json();
    if (!task || !Array.isArray(prompts)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    const results = [];
    for (const prompt of prompts) {
      const trace = opikClient.trace({
        name: 'RunPrompt',
        input: { task, prompt },
      });
      const start = Date.now();
      const res = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: `Task: ${task}` },
          { role: 'user', content: prompt },
        ],
      });
      const latency = Date.now() - start;
      const output = res.choices[0].message.content;
      const tokens = res.usage?.total_tokens || 0;
      const cost = tokens * 0.00001; // Example cost calculation, adjust as needed
      trace.span({
        name: 'llm',
        type: 'llm',
        input: { task, prompt },
        output: { response: output, latency, tokens, cost },
      });
      results.push({ prompt, output, latency, tokens });
    }
    await opikClient.flush();
    return NextResponse.json(results);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
} 