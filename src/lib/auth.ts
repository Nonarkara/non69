import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import type { NextRequest } from 'next/server';
import { getDb } from './db';

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

interface UserRow {
  id: number;
  email: string;
  display_name: string;
  is_admin: number;
  bio: string;
  thinking_profile: string;
  total_sessions: number;
  logic_growth: number;
  clarity_growth: number;
}

function mapUserRow(row: UserRow | null | undefined): User | null {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    is_admin: Boolean(row.is_admin),
    bio: row.bio,
    thinking_profile: row.thinking_profile,
    total_sessions: row.total_sessions,
    logic_growth: row.logic_growth,
    clarity_growth: row.clarity_growth,
  };
}

export async function createUser(email: string, password: string, displayName: string): Promise<User> {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    throw new Error('Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
  const result = db.prepare(
    'INSERT INTO users (email, password_hash, display_name, is_admin) VALUES (?, ?, ?, ?)'
  ).run(email, passwordHash, displayName, userCount.c === 0 ? 1 : 0);

  const row = db
    .prepare(
      `SELECT
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
       WHERE id = ?`
    )
    .get(result.lastInsertRowid) as UserRow;

  return mapUserRow(row) as User;
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT
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
       WHERE email = ?`
    )
    .get(email) as (UserRow & { password_hash: string }) | undefined;
  if (!row) return null;

  const valid = await bcrypt.compare(password, row.password_hash);
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

export function getUserById(id: number): User | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT
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
       WHERE id = ?`
    )
    .get(id) as UserRow | undefined;

  return mapUserRow(row);
}

function mapAdminUserSummaryRow(
  row:
    | {
        id: number;
        email: string;
        display_name: string;
        is_admin: number;
        total_sessions: number;
        created_at: string;
        updated_at: string;
      }
    | null
    | undefined
): AdminUserSummary | null {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    is_admin: Boolean(row.is_admin),
    total_sessions: row.total_sessions,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function getAdminUserSummaryById(id: number): AdminUserSummary | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, email, display_name, is_admin, total_sessions, created_at, updated_at
       FROM users
       WHERE id = ?`
    )
    .get(id) as
    | {
        id: number;
        email: string;
        display_name: string;
        is_admin: number;
        total_sessions: number;
        created_at: string;
        updated_at: string;
      }
    | undefined;

  return mapAdminUserSummaryRow(row);
}

export function listUsersForAdmin(): AdminUserSummary[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, email, display_name, is_admin, total_sessions, created_at, updated_at
       FROM users
       ORDER BY is_admin DESC, created_at ASC, id ASC`
    )
    .all() as Array<{
    id: number;
    email: string;
    display_name: string;
    is_admin: number;
    total_sessions: number;
    created_at: string;
    updated_at: string;
  }>;

  return rows
    .map(row => mapAdminUserSummaryRow(row))
    .filter((row): row is AdminUserSummary => row !== null);
}

export function updateUserAdminRole(
  actorUserId: number,
  targetUserId: number,
  nextIsAdmin: boolean
): AdminUserSummary {
  const db = getDb();
  const target = db
    .prepare('SELECT id, is_admin FROM users WHERE id = ?')
    .get(targetUserId) as { id: number; is_admin: number } | undefined;

  if (!target) {
    throw new Error('User not found.');
  }

  const currentIsAdmin = Boolean(target.is_admin);
  if (currentIsAdmin === nextIsAdmin) {
    return getAdminUserSummaryById(targetUserId) as AdminUserSummary;
  }

  if (!nextIsAdmin) {
    if (actorUserId === targetUserId) {
      throw new Error('Use another admin account to remove your own admin access.');
    }

    const adminCount = db.prepare('SELECT COUNT(*) as c FROM users WHERE is_admin = 1').get() as {
      c: number;
    };

    if (adminCount.c <= 1) {
      throw new Error('At least one admin must remain.');
    }
  }

  db.prepare(
    `UPDATE users
     SET is_admin = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(nextIsAdmin ? 1 : 0, targetUserId);

  return getAdminUserSummaryById(targetUserId) as AdminUserSummary;
}

export function getUserFromSessionToken(token?: string | null): User | null {
  if (!token) {
    return null;
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    return null;
  }

  return getUserById(payload.userId);
}

export function getUserFromRequest(request: NextRequest): User | null {
  return getUserFromSessionToken(request.cookies.get(AUTH_COOKIE_NAME)?.value);
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  return getUserFromSessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);
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
