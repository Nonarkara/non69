import { getCurrentUser, isAdminUser } from '@/lib/auth';
import { createContactRequest, listContactRequests, trackEvent } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();
  if (!isAdminUser(user)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return Response.json({ requests: listContactRequests() });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    name?: string;
    email?: string;
    organization?: string;
    useCase?: string;
  } | null;

  if (!body?.name || !body.email || !body.useCase) {
    return Response.json(
      { error: 'Name, email, and use case are required.' },
      { status: 400 }
    );
  }

  const id = createContactRequest({
    name: body.name,
    email: body.email,
    organization: body.organization,
    useCase: body.useCase,
  });

  trackEvent('contact_request', {
    id,
    organization: body.organization ?? '',
    timestamp: new Date().toISOString(),
  });

  return Response.json({ ok: true, id });
}
