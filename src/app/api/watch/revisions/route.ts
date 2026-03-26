import { getCurrentUser, isAdminUser } from '@/lib/auth';
import { listWatchRevisions } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!isAdminUser(user)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const geography = searchParams.get('geography') ?? 'th';

  if (geography !== 'th') {
    return Response.json({ error: 'Only th is available in this MVP.' }, { status: 400 });
  }

  try {
    return Response.json({ revisions: await listWatchRevisions(geography) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not load watch revision history.';
    return Response.json({ error: message }, { status: 400 });
  }
}
