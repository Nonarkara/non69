import { getCurrentUser, isAdminUser } from '@/lib/auth';
import { updateContactRequestStatus } from '@/lib/db';

export const runtime = 'nodejs';

const VALID_STATUSES = new Set(['new', 'contacted', 'scheduled', 'closed']);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!isAdminUser(user)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const requestId = Number(id);
  const body = (await request.json().catch(() => null)) as { status?: string } | null;

  if (!Number.isInteger(requestId) || requestId <= 0 || !body?.status || !VALID_STATUSES.has(body.status)) {
    return Response.json({ error: 'Invalid contact request update.' }, { status: 400 });
  }

  const updated = await updateContactRequestStatus(requestId, body.status);
  if (!updated) {
    return Response.json({ error: 'Contact request not found.' }, { status: 404 });
  }

  return Response.json({ ok: true });
}
