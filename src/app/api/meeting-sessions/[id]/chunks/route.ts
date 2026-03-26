import { getUserFromRequest } from '@/lib/auth';
import { generateMeetingInsights } from '@/lib/jarvis';
import {
  appendMeetingTranscriptChunk,
  getMeetingSessionByIdForUser,
  setMeetingSessionStatus,
  updateMeetingSessionInsights,
} from '@/lib/meetings';
import { transcribeAudioChunk } from '@/lib/openai';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const sessionId = Number(id);
  const body = (await request.json().catch(() => null)) as
    | {
        text?: string;
        audioBase64?: string;
        mimeType?: string;
      }
    | null;

  if (
    !Number.isInteger(sessionId) ||
    sessionId <= 0 ||
    !body ||
    ((typeof body.text !== 'string' || !body.text.trim()) &&
      (typeof body.audioBase64 !== 'string' || !body.audioBase64.trim()))
  ) {
    return Response.json({ error: 'Invalid meeting chunk payload.' }, { status: 400 });
  }

  try {
    await setMeetingSessionStatus(user.id, sessionId, 'processing');

    let transcriptChunk = typeof body.text === 'string' ? body.text.trim() : '';
    if (!transcriptChunk && body.audioBase64) {
      transcriptChunk = await transcribeAudioChunk({
        audioBase64: body.audioBase64,
        mimeType: body.mimeType || 'audio/webm',
      });
    }

    if (!transcriptChunk) {
      const session = await getMeetingSessionByIdForUser(user.id, sessionId);
      return Response.json({ session });
    }

    const appended = await appendMeetingTranscriptChunk(user.id, sessionId, transcriptChunk);
    if (!appended) {
      return Response.json({ error: 'Meeting session not found.' }, { status: 404 });
    }

    const research = await generateMeetingInsights(appended.transcript);
    const updated = await updateMeetingSessionInsights(
      user.id,
      sessionId,
      research.insights,
      research.suggestedResponses
    );

    return Response.json({ session: updated ?? appended });
  } catch (error) {
    await setMeetingSessionStatus(user.id, sessionId, 'listening');
    const message = error instanceof Error ? error.message : 'Could not process meeting chunk.';
    return Response.json({ error: message }, { status: 400 });
  }
}
