import Anthropic from '@anthropic-ai/sdk';
import { THINK_MODE_PROMPT, COMMUNICATE_MODE_PROMPT, REFLECT_MODE_PROMPT, FORUM_ANALYSIS_PROMPT } from './prompts';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-20250514';

export type Mode = 'think' | 'communicate' | 'reflect';

const MODE_PROMPTS: Record<Mode, string> = {
  think: THINK_MODE_PROMPT,
  communicate: COMMUNICATE_MODE_PROMPT,
  reflect: REFLECT_MODE_PROMPT,
};

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured.');
  }

  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

export async function* streamChat(mode: Mode, messages: ChatMessage[]) {
  const systemPrompt = MODE_PROMPTS[mode];

  const stream = getClient().messages.stream({
    model: MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}

export async function analyzePost(content: string): Promise<{
  logic_score: number;
  clarity_score: number;
  insights: string[];
  fallacies: string[];
}> {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: FORUM_ANALYSIS_PROMPT,
    messages: [{ role: 'user', content }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // fallback
  }

  return { logic_score: 0.5, clarity_score: 0.5, insights: [], fallacies: [] };
}
