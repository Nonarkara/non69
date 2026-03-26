import { getCurrentUser, isAdminUser, updateUserAdminRole } from '@/lib/auth';
import { trackEvent } from '@/lib/db';

export const runtime = 'nodejs';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!isAdminUser(user)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const targetUserId = Number(id);
  if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
    return Response.json({ error: 'Invalid user id.' }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as { isAdmin?: boolean } | null;
  if (!body || typeof body.isAdmin !== 'boolean') {
    return Response.json({ error: '`isAdmin` must be provided.' }, { status: 400 });
  }

  try {
    const updatedUser = await updateUserAdminRole(user.id, targetUserId, body.isAdmin);

    await trackEvent('admin_role_update', {
      actorUserId: user.id,
      targetUserId,
      isAdmin: updatedUser.is_admin,
      timestamp: new Date().toISOString(),
    });

    return Response.json({ user: updatedUser });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update admin role.';
    const status = message === 'User not found.' ? 404 : 400;
    return Response.json({ error: message }, { status });
  }
}
