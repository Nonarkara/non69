import Anthropic from '@anthropic-ai/sdk';
import { buildAnalysisContext, BRIEF_SYSTEM_PROMPT, extractPredictions } from '@/lib/narrative-engine';
import { insertIntelBrief, insertIntelMemory } from '@/lib/db';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-20250514';

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export async function POST() {
  const context = await buildAnalysisContext('th');
  const userMessage = `${context}\n\nGenerate the daily intelligence brief for Thailand Watch. Today is ${new Date().toISOString().split('T')[0]}.`;

  const encoder = new TextEncoder();
  let fullResponse = '';

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const msgStream = getClient().messages.stream({
          model: MODEL,
          max_tokens: 4096,
          system: BRIEF_SYSTEM_PROMPT,
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

        // Post-stream: store brief and extract predictions
        try {
          // Extract headline from first ## HEADLINE section
          const headlineMatch = fullResponse.match(/##\s*HEADLINE\s*\n+(.+)/i);
          const headline = headlineMatch?.[1]?.trim() || 'Daily Intelligence Brief';

          const briefId = insertIntelBrief('th', headline, fullResponse, context);

          const predictions = extractPredictions(fullResponse);
          for (const pred of predictions) {
            insertIntelMemory({
              geography: 'th',
              kind: 'prediction',
              claim: pred.claim,
              confidence: pred.confidence,
              sourceBriefId: briefId,
            });
          }
        } catch {
          // Non-critical
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Brief generation failed';
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
