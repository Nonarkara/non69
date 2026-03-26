import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import type { NextRequest } from 'next/server';
import { getClient } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'non69-dev-secret-change-in-production';
export const AUTH_COOKIE_NAME = 'drnon_session';
export const AUTH_SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export interface User {
  id: number;
  email: string;
  display_name: string;
  is_admin: boolean;
  bio: string;
  thinking_profile: string;
  total_sessions: number;
  logic_growth: number;
  clarity_growth: number;
}

export interface AdminUserSummary {
  id: number;
  email: string;
  display_name: string;
  is_admin: boolean;
  total_sessions: number;
  created_at: string;
  updated_at: string;
}

function mapUserRow(row: Record<string, unknown> | null | undefined): User | null {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    email: String(row.email),
    display_name: String(row.display_name),
    is_admin: Boolean(row.is_admin),
    bio: String(row.bio ?? ''),
    thinking_profile: String(row.thinking_profile ?? ''),
    total_sessions: Number(row.total_sessions ?? 0),
    logic_growth: Number(row.logic_growth ?? 0),
    clarity_growth: Number(row.clarity_growth ?? 0),
  };
}

export async function createUser(email: string, password: string, displayName: string): Promise<User> {
  const c = getClient();
  const { rows: existingRows } = await c.execute({
    sql: 'SELECT id FROM users WHERE email = ?',
    args: [email],
  });
  if (existingRows.length > 0) {
    throw new Error('Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const { rows: countRows } = await c.execute('SELECT COUNT(*) as c FROM users');
  const userCount = Number(countRows[0]?.c ?? 0);

  const result = await c.execute({
    sql: 'INSERT INTO users (email, password_hash, display_name, is_admin) VALUES (?, ?, ?, ?)',
    args: [email, passwordHash, displayName, userCount === 0 ? 1 : 0],
  });

  const { rows } = await c.execute({
    sql: `SELECT
           id,
           email,
           display_name,
           is_admin,
           bio,
           thinking_profile,
           total_sessions,
           logic_growth,
           clarity_growth
         FROM users
         WHERE id = ?`,
    args: [Number(result.lastInsertRowid)],
  });

  return mapUserRow(rows[0]) as User;
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const { rows } = await getClient().execute({
    sql: `SELECT
           id,
           email,
           display_name,
           is_admin,
           bio,
           thinking_profile,
           total_sessions,
           logic_growth,
           clarity_growth,
           password_hash
         FROM users
         WHERE email = ?`,
    args: [email],
  });

  const row = rows[0];
  if (!row) return null;

  const valid = await bcrypt.compare(password, String(row.password_hash));
  if (!valid) return null;

  return mapUserRow(row);
}

export function createSessionToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifySessionToken(token: string): { userId: number } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number };
  } catch {
    return null;
  }
}

export async function getUserById(id: number): Promise<User | null> {
  const { rows } = await getClient().execute({
    sql: `SELECT
           id,
           email,
           display_name,
           is_admin,
           bio,
           thinking_profile,
           total_sessions,
           logic_growth,
           clarity_growth
         FROM users
         WHERE id = ?`,
    args: [id],
  });

  return mapUserRow(rows[0]);
}

function mapAdminUserSummaryRow(
  row: Record<string, unknown> | null | undefined
): AdminUserSummary | null {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    email: String(row.email),
    display_name: String(row.display_name),
    is_admin: Boolean(row.is_admin),
    total_sessions: Number(row.total_sessions ?? 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

async function getAdminUserSummaryById(id: number): Promise<AdminUserSummary | null> {
  const { rows } = await getClient().execute({
    sql: `SELECT id, email, display_name, is_admin, total_sessions, created_at, updated_at
         FROM users
         WHERE id = ?`,
    args: [id],
  });

  return mapAdminUserSummaryRow(rows[0]);
}

export async function listUsersForAdmin(): Promise<AdminUserSummary[]> {
  const { rows } = await getClient().execute(
    `SELECT id, email, display_name, is_admin, total_sessions, created_at, updated_at
     FROM users
     ORDER BY is_admin DESC, created_at ASC, id ASC`
  );

  return rows
    .map(row => mapAdminUserSummaryRow(row))
    .filter((row): row is AdminUserSummary => row !== null);
}

export async function updateUserAdminRole(
  actorUserId: number,
  targetUserId: number,
  nextIsAdmin: boolean
): Promise<AdminUserSummary> {
  const c = getClient();
  const { rows: targetRows } = await c.execute({
    sql: 'SELECT id, is_admin FROM users WHERE id = ?',
    args: [targetUserId],
  });

  const target = targetRows[0];
  if (!target) {
    throw new Error('User not found.');
  }

  const currentIsAdmin = Boolean(target.is_admin);
  if (currentIsAdmin === nextIsAdmin) {
    return (await getAdminUserSummaryById(targetUserId)) as AdminUserSummary;
  }

  if (!nextIsAdmin) {
    if (actorUserId === targetUserId) {
      throw new Error('Use another admin account to remove your own admin access.');
    }

    const { rows: adminCountRows } = await c.execute(
      'SELECT COUNT(*) as c FROM users WHERE is_admin = 1'
    );
    const adminCount = Number(adminCountRows[0]?.c ?? 0);

    if (adminCount <= 1) {
      throw new Error('At least one admin must remain.');
    }
  }

  await c.execute({
    sql: `UPDATE users
     SET is_admin = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    args: [nextIsAdmin ? 1 : 0, targetUserId],
  });

  return (await getAdminUserSummaryById(targetUserId)) as AdminUserSummary;
}

export async function getUserFromSessionToken(token?: string | null): Promise<User | null> {
  if (!token) {
    return null;
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    return null;
  }

  return await getUserById(payload.userId);
}

export async function getUserFromRequest(request: NextRequest): Promise<User | null> {
  return await getUserFromSessionToken(request.cookies.get(AUTH_COOKIE_NAME)?.value);
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  return await getUserFromSessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);
}

export function generateToken(userId: number): string {
  return createSessionToken(userId);
}

export function verifyToken(token: string): { userId: number } | null {
  return verifySessionToken(token);
}

export function isAdminUser(user: User | null | undefined): user is User & { is_admin: true } {
  return Boolean(user?.is_admin);
}
