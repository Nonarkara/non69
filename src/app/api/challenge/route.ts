import { NextRequest } from 'next/server';
import { getDailyChallenge, getAllChallenges, CHALLENGE_EVALUATION_PROMPT } from '@/lib/challenges';
import { createPracticeRun, getChallengeStreak, trackEvent } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-20250514';

// GET: Fetch today's challenge
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const challenge = getDailyChallenge();
  return Response.json({
    challenge,
    streak: await getChallengeStreak(user.id),
    totalChallenges: getAllChallenges().length,
  });
}

// POST: Submit response for evaluation
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null) as {
    challengeId: string;
    response: string;
    timeUsed: number;
  } | null;

  if (!body || !body.response) {
    return Response.json({ error: 'Response required' }, { status: 400 });
  }

  await trackEvent('challenge_submit', {
    challengeId: body.challengeId,
    wordCount: body.response.split(/\s+/).length,
    timeUsed: body.timeUsed,
    timestamp: new Date().toISOString(),
  });

  // Find the challenge
  const challenge = getAllChallenges().find(c => c.id === body.challengeId) || getDailyChallenge();

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('API key not configured');
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const result = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: CHALLENGE_EVALUATION_PROMPT,
      messages: [{
        role: 'user',
        content: `Challenge: "${challenge.title}"\nPrompt: "${challenge.prompt}"\nCategory: ${challenge.category}\nDifficulty: ${challenge.difficulty}\nTime used: ${body.timeUsed} seconds\n\nUser's response:\n${body.response}`,
      }],
    });

    const text = result.content[0].type === 'text' ? result.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const scores = JSON.parse(jsonMatch[0]);
      // Ensure overall_score exists
      if (!scores.overall_score) {
        scores.overall_score = (scores.logic_score + scores.clarity_score + scores.depth_score + scores.courage_score) / 4;
      }

      await createPracticeRun({
        userId: user.id,
        tool: 'challenge',
        itemId: challenge.id,
        title: challenge.title,
        summary: body.response.trim().slice(0, 220),
        score: scores.overall_score ?? null,
        details: {
          category: challenge.category,
          difficulty: challenge.difficulty,
          scores,
          timeUsed: body.timeUsed,
        },
      });

      return Response.json({ scores, streak: await getChallengeStreak(user.id) });
    }

    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Challenge evaluation failed:', error);
    // Fallback scores
    return Response.json({
      scores: {
        logic_score: 0.6,
        clarity_score: 0.6,
        depth_score: 0.5,
        courage_score: 0.7,
        overall_score: 0.6,
        feedback: 'Evaluation service is temporarily unavailable. Your response has been recorded.',
        strengths: ['You completed the challenge'],
        growth_areas: ['Try again when the AI is available for detailed feedback'],
      },
      streak: await getChallengeStreak(user.id),
    });
  }
}
