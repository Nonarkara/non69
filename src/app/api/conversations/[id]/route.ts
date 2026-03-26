import { getUserFromRequest } from '@/lib/auth';
import { getConversationByIdForUser } from '@/lib/db';
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
  const conversationId = Number(id);

  if (!Number.isInteger(conversationId) || conversationId <= 0) {
    return Response.json({ error: 'Invalid conversation id.' }, { status: 400 });
  }

  const conversation = getConversationByIdForUser(user.id, conversationId);
  if (!conversation) {
    return Response.json({ error: 'Conversation not found.' }, { status: 404 });
  }

  return Response.json({ conversation });
}
