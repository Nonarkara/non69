import { getCurrentUser, isAdminUser, listUsersForAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();
  if (!isAdminUser(user)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    return Response.json({ users: await listUsersForAdmin() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load admin users.';
    return Response.json({ error: message }, { status: 400 });
  }
}
