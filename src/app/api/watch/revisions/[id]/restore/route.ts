import { getCurrentUser, isAdminUser } from '@/lib/auth';
import { restoreWatchRevision, trackEvent } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(
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
    const result = await restoreWatchRevision(revisionId, {
      userId: user.id,
      displayName: user.display_name,
    });

    if (!result) {
      return Response.json({ error: 'Watch revision not found.' }, { status: 404 });
    }

    await trackEvent('watch_restore', {
      geography: result.bundle.geography,
      sourceRevisionId: revisionId,
      revisionId: result.revision.id,
      version: result.revision.version,
      timestamp: new Date().toISOString(),
    });

    return Response.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not restore watch revision.';
    return Response.json({ error: message }, { status: 400 });
  }
}
