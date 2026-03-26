import { getUserFromRequest } from '@/lib/auth';
import { createMeetingSession } from '@/lib/meetings';
import { isOpenAIConfigured } from '@/lib/openai';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { languageMode?: string } | null;
  const session = await createMeetingSession(user.id, body?.languageMode || 'th-en');

  return Response.json({
    session,
    capabilities: {
      serverTranscription: isOpenAIConfigured(),
      webResearch: isOpenAIConfigured(),
    },
  });
}
