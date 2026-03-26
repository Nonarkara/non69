import { getUserFromRequest } from '@/lib/auth';
import {
  getMeetingSessionByIdForUser,
  listMeetingSessionEventsAfterId,
} from '@/lib/meetings';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

function encodeSse(data: Record<string, unknown>) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const sessionId = Number(id);
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return Response.json({ error: 'Invalid meeting session id.' }, { status: 400 });
  }

  const session = await getMeetingSessionByIdForUser(user.id, sessionId);
  if (!session) {
    return Response.json({ error: 'Meeting session not found.' }, { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastEventId = 0;
      let closed = false;

      const push = (payload: Record<string, unknown>) => {
        if (!closed) {
          controller.enqueue(encoder.encode(encodeSse(payload)));
        }
      };

      const syncEvents = async () => {
        const events = await listMeetingSessionEventsAfterId(user.id, sessionId, lastEventId);
        if (!events) {
          push({ type: 'error', error: 'Meeting session not found.' });
          closed = true;
          controller.close();
          return;
        }

        for (const event of events) {
          lastEventId = event.id;
          push({
            type: 'event',
            event,
          });
        }
      };

      push({
        type: 'snapshot',
        session,
      });
      await syncEvents();

      const interval = setInterval(syncEvents, 1000);
      const heartbeat = setInterval(() => {
        push({ type: 'ping', at: new Date().toISOString() });
      }, 15000);

      const close = () => {
        if (closed) {
          return;
        }

        closed = true;
        clearInterval(interval);
        clearInterval(heartbeat);
        controller.close();
      };

      request.signal.addEventListener('abort', close);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
