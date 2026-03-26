import { cookies } from 'next/headers';
import { authenticateUser, createSessionToken, AUTH_COOKIE_NAME, AUTH_SESSION_MAX_AGE } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
  } | null;

  if (!body?.email || !body.password) {
    return Response.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  const user = await authenticateUser(body.email, body.password);
  if (!user) {
    return Response.json({ error: 'Invalid credentials.' }, { status: 401 });
  }

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
}
