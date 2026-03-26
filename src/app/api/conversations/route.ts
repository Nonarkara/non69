import { getUserFromRequest } from '@/lib/auth';
import { listConversationsForUser } from '@/lib/db';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return Response.json({ conversations: await listConversationsForUser(user.id) });
}
