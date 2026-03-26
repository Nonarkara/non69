import Anthropic from '@anthropic-ai/sdk';
import { buildAnalysisContext, NARRATIVE_SYSTEM_PROMPT, extractPredictions } from '@/lib/narrative-engine';
import { logAnalysis, insertIntelMemory } from '@/lib/db';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-20250514';

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const question = body?.question;

  if (!question || typeof question !== 'string') {
    return Response.json({ error: 'question is required' }, { status: 400 });
  }

  const context = await buildAnalysisContext('th');
  const userMessage = `${context}\n\n## QUERY\n${question}`;

  const encoder = new TextEncoder();
  let fullResponse = '';

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const msgStream = getClient().messages.stream({
          model: MODEL,
          max_tokens: 4096,
          system: NARRATIVE_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userMessage }],
        });

        for await (const event of msgStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            fullResponse += event.delta.text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();

        // Post-stream: log analysis and extract predictions
        try {
          logAnalysis('th', question, fullResponse);

          const predictions = extractPredictions(fullResponse);
          for (const pred of predictions) {
            insertIntelMemory({
              geography: 'th',
              kind: 'prediction',
              claim: pred.claim,
              confidence: pred.confidence,
              sourceAnalysisQuestion: question,
            });
          }
        } catch {
          // Non-critical — don't break the stream
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Analysis failed';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: `\n// ERROR: ${msg}` })}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
