import { getUserFromRequest } from '@/lib/auth';
import { getMeetingSessionByIdForUser } from '@/lib/meetings';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const sessionId = Number(id);
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return Response.json({ error: 'Invalid meeting session id.' }, { status: 400 });
  }

  const session = getMeetingSessionByIdForUser(user.id, sessionId);
  if (!session) {
    return Response.json({ error: 'Meeting session not found.' }, { status: 404 });
  }

  return Response.json({ session });
}
