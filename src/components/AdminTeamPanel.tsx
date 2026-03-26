'use client';

import { useState } from 'react';

interface AdminUserSummary {
  id: number;
  email: string;
  display_name: string;
  is_admin: boolean;
  total_sessions: number;
  created_at: string;
  updated_at: string;
}

interface AdminTeamPanelProps {
  currentUserId: number;
  initialUsers: AdminUserSummary[];
}

function sortUsers(users: AdminUserSummary[]) {
  return [...users].sort((left, right) => {
    if (left.is_admin !== right.is_admin) {
      return left.is_admin ? -1 : 1;
    }

    return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
  });
}

export default function AdminTeamPanel({
  currentUserId,
  initialUsers,
}: AdminTeamPanelProps) {
  const [users, setUsers] = useState(() => sortUsers(initialUsers));
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const adminCount = users.filter(user => user.is_admin).length;

  async function handleRoleChange(target: AdminUserSummary, nextIsAdmin: boolean) {
    if (workingId === target.id || target.is_admin === nextIsAdmin) {
      return;
    }

    setWorkingId(target.id);
    setError('');

    const response = await fetch(`/api/admin/users/${target.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAdmin: nextIsAdmin }),
    }).catch(() => null);

    if (!response) {
      setError('Could not reach the admin role endpoint.');
      setWorkingId(null);
      return;
    }

    const data = (await response.json().catch(() => null)) as
      | { user?: AdminUserSummary; error?: string }
      | null;

    if (!response.ok || !data?.user) {
      setError(data?.error || 'Could not update admin role.');
      setWorkingId(null);
      return;
    }

    setUsers(prev =>
      sortUsers(prev.map(user => (user.id === data.user!.id ? data.user! : user)))
    );
    setWorkingId(null);
  }

  if (users.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-800 p-6 text-sm text-neutral-400">
        No users yet. The auth layer is ready; now it needs operators.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-neutral-900 p-4">
          <div className="text-2xl font-semibold">{adminCount}</div>
          <div className="mt-2 text-xs uppercase tracking-[0.18em] text-neutral-500">Admins</div>
        </div>
        <div className="rounded-2xl border border-neutral-900 p-4">
          <div className="text-2xl font-semibold">{users.length - adminCount}</div>
          <div className="mt-2 text-xs uppercase tracking-[0.18em] text-neutral-500">Members</div>
        </div>
        <div className="rounded-2xl border border-neutral-900 p-4">
          <div className="text-2xl font-semibold">{users.length}</div>
          <div className="mt-2 text-xs uppercase tracking-[0.18em] text-neutral-500">Accounts</div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#d7d2c3]/20 bg-[#d7d2c3]/6 p-4 text-sm leading-7 text-neutral-200">
        Promote other operators when they are ready. Self-demotion is blocked here, and the last
        admin cannot be removed. No clown-car lockouts.
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {users.map(user => {
        const isCurrentUser = user.id === currentUserId;

        return (
          <article key={user.id} className="rounded-2xl border border-neutral-900 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em] ${
                      user.is_admin
                        ? 'border border-[#d7d2c3]/30 bg-[#d7d2c3]/10 text-[#d7d2c3]'
                        : 'border border-neutral-800 bg-neutral-900 text-neutral-400'
                    }`}
                  >
                    {user.is_admin ? 'Admin' : 'Member'}
                  </span>
                  {isCurrentUser && (
                    <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-sky-300">
                      You
                    </span>
                  )}
                  <span className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                    {user.total_sessions} session{user.total_sessions === 1 ? '' : 's'}
                  </span>
                </div>

                <h3 className="mt-4 text-lg font-semibold">{user.display_name}</h3>
                <p className="mt-1 text-sm text-[#d7d2c3]">{user.email}</p>

                <div className="mt-3 flex flex-wrap gap-4 text-sm text-neutral-400">
                  <span>
                    Joined{' '}
                    {new Date(user.created_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <span>
                    Updated{' '}
                    {new Date(user.updated_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {user.is_admin ? (
                  <button
                    type="button"
                    onClick={() => handleRoleChange(user, false)}
                    disabled={isCurrentUser || workingId === user.id}
                    className="rounded-full border border-neutral-800 px-4 py-2 text-sm text-neutral-300 hover:text-white hover:border-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {isCurrentUser
                      ? 'Your account'
                      : workingId === user.id
                        ? 'Updating...'
                        : 'Remove admin'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRoleChange(user, true)}
                    disabled={workingId === user.id}
                    className="rounded-full bg-[#d7d2c3] px-4 py-2 text-sm font-medium text-black hover:bg-[#e4decf] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {workingId === user.id ? 'Promoting...' : 'Make admin'}
                  </button>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
