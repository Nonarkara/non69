import { NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { listSavedWatchItemsForUser, removeSavedWatchItem, saveWatchItem } from '@/lib/db';

export const runtime = 'nodejs';

function requireUser(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) {
    return null;
  }

  return user;
}

export async function GET(request: NextRequest) {
  const user = requireUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return Response.json({ items: listSavedWatchItemsForUser(user.id) });
}

export async function POST(request: NextRequest) {
  const user = requireUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    geography?: string;
    itemKind?: 'signal' | 'brief';
    itemSlug?: string;
  } | null;

  if (!body?.geography || !body.itemKind || !body.itemSlug) {
    return Response.json({ error: 'Invalid saved item request.' }, { status: 400 });
  }

  saveWatchItem(user.id, body.geography, body.itemKind, body.itemSlug);
  return Response.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const user = requireUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    geography?: string;
    itemKind?: 'signal' | 'brief';
    itemSlug?: string;
  } | null;

  if (!body?.geography || !body.itemKind || !body.itemSlug) {
    return Response.json({ error: 'Invalid saved item request.' }, { status: 400 });
  }

  removeSavedWatchItem(user.id, body.geography, body.itemKind, body.itemSlug);
  return Response.json({ ok: true });
}
