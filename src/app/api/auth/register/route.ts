import { cookies } from 'next/headers';
import { createSessionToken, createUser, AUTH_COOKIE_NAME, AUTH_SESSION_MAX_AGE } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
    displayName?: string;
  } | null;

  if (!body?.email || !body.password || !body.displayName) {
    return Response.json(
      { error: 'Email, password, and display name are required.' },
      { status: 400 }
    );
  }

  try {
    const user = await createUser(body.email, body.password, body.displayName);
    const token = createSessionToken(user.id);
    const cookieStore = await cookies();

    cookieStore.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: AUTH_SESSION_MAX_AGE,
    });

    return Response.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to register.';
    return Response.json({ error: message }, { status: 400 });
  }
}
