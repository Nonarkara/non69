import { NextRequest } from 'next/server';
import { createPracticeRun, trackEvent } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-20250514';

function getSimulationPrompt(scenario: { title: string; aiRole: string; description: string }) {
  return `You are roleplaying in a Conversation Simulator on DrNon. Your role:

"${scenario.aiRole}"

Context: ${scenario.description}

RULES:
- Stay in character at all times
- Be realistic — don't make it too easy or too hard
- React naturally to what the user says
- Show real emotions appropriate to the character
- Keep responses short (2-4 sentences max) — this is a conversation, not a monologue
- If the user handles things well, show positive response; if poorly, show realistic negative response
- Never break character or give meta-commentary

You are NOT an AI assistant. You ARE this person. Act like them.`;
}

const EVALUATION_PROMPT = `You are evaluating a user's performance in a simulated difficult conversation on DrNon.

Review the entire conversation and score the user on:
- communication_score (0.0-1.0): How clearly and effectively did they communicate?
- empathy_score (0.0-1.0): Did they show understanding of the other person's perspective?
- assertiveness_score (0.0-1.0): Did they stand their ground while remaining respectful?
- outcome_score (0.0-1.0): How well did the conversation go overall? Did they achieve their goal?
- overall_score (0.0-1.0): Holistic assessment

Also provide:
- feedback: 2-3 sentences of specific analysis
- what_worked: 2-3 things they did well
- what_to_improve: 2-3 areas for growth

Return as JSON:
{
  "communication_score": 0.0,
  "empathy_score": 0.0,
  "assertiveness_score": 0.0,
  "outcome_score": 0.0,
  "overall_score": 0.0,
  "feedback": "...",
  "what_worked": ["..."],
  "what_to_improve": ["..."]
}

Be honest. Real growth comes from honest feedback. As Dr. Non says: "Confidence is built by failing."`;

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null) as {
    action: 'start' | 'respond' | 'evaluate';
    scenario: { id: string; title: string; description: string; aiRole: string };
    messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  } | null;

  if (!body || !body.scenario) {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  trackEvent('simulation', {
    action: body.action,
    scenarioId: body.scenario.id,
    messageCount: body.messages?.length ?? 0,
    timestamp: new Date().toISOString(),
  });

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('API key not configured');
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    if (body.action === 'start') {
      const result = await client.messages.create({
        model: MODEL,
        max_tokens: 256,
        system: getSimulationPrompt(body.scenario),
        messages: [{
          role: 'user',
          content: '[The conversation is starting. You speak first — set the scene with your opening line in character. Keep it to 1-2 sentences.]',
        }],
      });
      const text = result.content[0].type === 'text' ? result.content[0].text : '';
      return Response.json({ message: text });
    }

    if (body.action === 'respond') {
      const messages = (body.messages || []).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const result = await client.messages.create({
        model: MODEL,
        max_tokens: 256,
        system: getSimulationPrompt(body.scenario),
        messages,
      });
      const text = result.content[0].type === 'text' ? result.content[0].text : '';
      return Response.json({ message: text });
    }

    if (body.action === 'evaluate') {
      const conversationText = (body.messages || [])
        .map(m => `${m.role === 'user' ? 'USER' : 'OTHER PERSON'}: ${m.content}`)
        .join('\n');

      const result = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: EVALUATION_PROMPT,
        messages: [{
          role: 'user',
          content: `Scenario: "${body.scenario.title}" - ${body.scenario.description}\nThe other person's role: ${body.scenario.aiRole}\n\nFull conversation:\n${conversationText}`,
        }],
      });

      const text = result.content[0].type === 'text' ? result.content[0].text : '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const results = JSON.parse(jsonMatch[0]);
        createPracticeRun({
          userId: user.id,
          tool: 'simulate',
          itemId: body.scenario.id,
          title: body.scenario.title,
          summary: (body.messages || [])
            .filter(message => message.role === 'user')
            .map(message => message.content)
            .join(' ')
            .slice(0, 220),
          score: results.overall_score ?? null,
          details: {
            scenario: body.scenario,
            results,
            exchanges: body.messages?.length ?? 0,
          },
        });
        return Response.json({ results });
      }
      throw new Error('Invalid evaluation format');
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Simulation error:', error);
    if (body.action === 'evaluate') {
      return Response.json({
        results: {
          communication_score: 0.5, empathy_score: 0.5, assertiveness_score: 0.5,
          outcome_score: 0.5, overall_score: 0.5,
          feedback: 'Evaluation unavailable — configure your API key.',
          what_worked: ['You completed the simulation'],
          what_to_improve: ['Try again with API connection'],
        },
      });
    }
    return Response.json({
      message: body.action === 'start'
        ? 'The simulation engine needs an API key to work. Please configure it in .env.local.'
        : 'Connection lost. Try again.',
    });
  }
}
