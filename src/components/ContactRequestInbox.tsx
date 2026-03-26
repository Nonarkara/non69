'use client';

import { useState } from 'react';

interface ContactRequestItem {
  id: number;
  name: string;
  email: string;
  organization: string;
  useCase: string;
  status: string;
  createdAt: string;
}

interface ContactRequestInboxProps {
  initialRequests: ContactRequestItem[];
}

const STATUSES = ['new', 'contacted', 'scheduled', 'closed'] as const;

export default function ContactRequestInbox({ initialRequests }: ContactRequestInboxProps) {
  const [requests, setRequests] = useState(initialRequests);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [errorById, setErrorById] = useState<Record<number, string>>({});

  async function handleStatusChange(requestId: number, nextStatus: string) {
    const current = requests.find(request => request.id === requestId);
    if (!current || current.status === nextStatus || workingId === requestId) {
      return;
    }

    setWorkingId(requestId);
    setErrorById(prev => ({ ...prev, [requestId]: '' }));
    setRequests(prev =>
      prev.map(request =>
        request.id === requestId ? { ...request, status: nextStatus } : request
      )
    );

    const response = await fetch(`/api/contact/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    }).catch(() => null);

    if (!response || !response.ok) {
      const data = response ? await response.json().catch(() => null) : null;
      setRequests(prev =>
        prev.map(request =>
          request.id === requestId ? { ...request, status: current.status } : request
        )
      );

      setErrorById(prev => ({
        ...prev,
        [requestId]: data?.error || 'Could not update contact request status.',
      }));
    }

    setWorkingId(null);
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-800 p-6 text-sm text-neutral-400">
        No contact requests yet. The intake pipe is ready. Now it needs traffic.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map(request => (
        <article key={request.id} className="rounded-2xl border border-neutral-900 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs uppercase tracking-[0.18em] text-neutral-400">
              {request.status}
            </span>
            {request.organization && (
              <span className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                {request.organization}
              </span>
            )}
            <span className="text-xs text-neutral-600">
              {new Date(request.createdAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </div>

          <h3 className="mt-4 text-lg font-semibold">{request.name}</h3>
          <a
            href={`mailto:${request.email}`}
            className="mt-1 inline-block text-sm text-[#d7d2c3] hover:text-white transition-colors"
          >
            {request.email}
          </a>
          <p className="mt-4 text-sm leading-7 text-neutral-300">{request.useCase}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {STATUSES.map(status => (
              <button
                key={status}
                type="button"
                onClick={() => handleStatusChange(request.id, status)}
                disabled={workingId === request.id}
                className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] transition-colors ${
                  request.status === status
                    ? 'border-[#d7d2c3] bg-[#d7d2c3]/10 text-[#d7d2c3]'
                    : 'border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {errorById[request.id] && (
            <p className="mt-3 text-sm text-red-400">{errorById[request.id]}</p>
          )}
        </article>
      ))}
    </div>
  );
}
