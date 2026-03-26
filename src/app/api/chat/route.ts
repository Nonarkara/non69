import { NextRequest } from 'next/server';
import { streamChat, type Mode, type ChatMessage } from '@/lib/claude';
import {
  createConversation,
  trackEvent,
  updateConversation,
  type ChatTranscriptMessage,
} from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return Response.json({ error: 'Please sign in to use the private lab.' }, { status: 401 });
  }

  const payload = (await req.json().catch(() => null)) as {
    mode: Mode;
    messages: ChatMessage[];
    conversationId?: number | null;
  } | null;

  if (!payload) {
    return Response.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const { mode, messages, conversationId } = payload;

  const isValidMode = ['think', 'communicate', 'reflect'].includes(mode);
  const isValidMessages =
    Array.isArray(messages) &&
    messages.every(message => {
      return (
        message &&
        (message.role === 'user' || message.role === 'assistant') &&
        typeof message.content === 'string'
      );
    });

  const isValidConversationId =
    conversationId === undefined ||
    conversationId === null ||
    (Number.isInteger(conversationId) && conversationId > 0);

  if (!isValidMode || !isValidMessages || !isValidConversationId) {
    return Response.json({ error: 'Invalid chat payload' }, { status: 400 });
  }

  try {
    trackEvent('chat_session', {
      mode,
      messageCount: messages.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Analytics tracking failed:', error);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let assistantContent = '';

      try {
        for await (const chunk of streamChat(mode, messages)) {
          assistantContent += chunk;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
        }

        if (assistantContent.trim()) {
          const transcript: ChatTranscriptMessage[] = [
            ...messages,
            { role: 'assistant', content: assistantContent },
          ];
          const persistedConversationId =
            conversationId == null
              ? createConversation(user.id, mode, transcript)
              : updateConversation(user.id, conversationId, mode, transcript) ??
                createConversation(user.id, mode, transcript);

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ conversationId: persistedConversationId })}\n\n`
            )
          );
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
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
