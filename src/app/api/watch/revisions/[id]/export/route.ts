import { getCurrentUser, isAdminUser } from '@/lib/auth';
import { getWatchRevisionById } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!isAdminUser(user)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const revisionId = Number(id);
  if (!Number.isInteger(revisionId) || revisionId <= 0) {
    return Response.json({ error: 'Invalid revision id.' }, { status: 400 });
  }

  try {
    const revision = getWatchRevisionById(revisionId);
    if (!revision) {
      return Response.json({ error: 'Watch revision not found.' }, { status: 404 });
    }

    return new Response(JSON.stringify(revision, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="th-watch-v${revision.version}.json"`,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not export watch revision.';
    return Response.json({ error: message }, { status: 400 });
  }
}
