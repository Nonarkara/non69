import { NextRequest } from 'next/server';
import { createPracticeRun, trackEvent } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-20250514';

const ARENA_SYSTEM_PROMPT = `You are the Debate Arena engine for DrNon. You serve two roles:

ROLE 1 - DEBATER: You argue the opposite side of the user's position. Your arguments should be:
- Logically rigorous (no fallacies)
- Well-structured (claim, evidence, reasoning)
- Respectful but forceful
- Around 150-200 words
- Never condescending, but never pulling punches

ROLE 2 - JUDGE: You evaluate BOTH arguments fairly. You must be impartial.

Return your response as JSON:
{
  "aiArgument": "Your counter-argument here (150-200 words)",
  "scores": {
    "userScore": {
      "logic": 0.0-1.0,
      "clarity": 0.0-1.0,
      "persuasion": 0.0-1.0,
      "overall": 0.0-1.0
    },
    "aiScore": {
      "logic": 0.0-1.0,
      "clarity": 0.0-1.0,
      "persuasion": 0.0-1.0,
      "overall": 0.0-1.0
    },
    "verdict": "One sentence explaining why the winner won",
    "userStrengths": ["strength 1", "strength 2"],
    "userWeaknesses": ["area to improve 1", "area to improve 2"],
    "winner": "user" or "ai" or "draw"
  }
}

IMPORTANT: Be willing to let the user WIN if their argument is genuinely better. Don't be biased toward yourself. Dr. Non says: "The power of logic is limitless" — let logic decide.`;

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null) as {
    topicId: string;
    topic: string;
    userSide: string;
    aiSide: string;
    userArgument: string;
    round: number;
  } | null;

  if (!body || !body.userArgument) {
    return Response.json({ error: 'Argument required' }, { status: 400 });
  }

  trackEvent('arena_debate', {
    topicId: body.topicId,
    round: body.round,
    wordCount: body.userArgument.split(/\s+/).length,
    timestamp: new Date().toISOString(),
  });

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('API key not configured');
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const result = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: ARENA_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Topic: "${body.topic}"\nUser's position: "${body.userSide}"\nYour position: "${body.aiSide}"\nRound: ${body.round}\n\nUser's argument:\n${body.userArgument}`,
      }],
    });

    const text = result.content[0].type === 'text' ? result.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      createPracticeRun({
        userId: user.id,
        tool: 'arena',
        itemId: body.topicId,
        title: body.topic,
        summary: body.userArgument.trim().slice(0, 220),
        score: data?.scores?.userScore?.overall ?? null,
        details: {
          round: body.round,
          topic: body.topic,
          userSide: body.userSide,
          aiSide: body.aiSide,
          aiArgument: data?.aiArgument ?? '',
          verdict: data?.scores?.verdict ?? '',
          winner: data?.scores?.winner ?? null,
        },
      });
      return Response.json(data);
    }

    throw new Error('Invalid response');
  } catch (error) {
    console.error('Arena error:', error);
    return Response.json({
      aiArgument: 'The debate engine is temporarily unavailable. Please ensure your API key is configured.',
      scores: {
        userScore: { logic: 0.7, clarity: 0.7, persuasion: 0.6, overall: 0.67 },
        aiScore: { logic: 0.7, clarity: 0.7, persuasion: 0.7, overall: 0.7 },
        verdict: 'Evaluation unavailable — try again with API key configured.',
        userStrengths: ['You showed up to debate'],
        userWeaknesses: ['Full evaluation requires API connection'],
        winner: 'draw' as const,
      },
    });
  }
}
