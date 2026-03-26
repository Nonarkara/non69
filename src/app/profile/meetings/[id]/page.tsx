import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getMeetingSessionByIdForUser } from '@/lib/meetings';

export const metadata: Metadata = {
  title: 'Meeting Transcript',
  description: 'A saved JARVIS Meeting Mode transcript with source-backed insights and response lines.',
};

export const dynamic = 'force-dynamic';

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/access?next=/profile');
  }

  const { id } = await params;
  const sessionId = Number(id);
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    notFound();
  }

  const session = await getMeetingSessionByIdForUser(user.id, sessionId);
  if (!session) {
    notFound();
  }

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <Link
              href="/profile"
              className="text-sm text-neutral-500 transition-colors hover:text-white"
            >
              Back to profile
            </Link>
            <div className="mt-4 inline-flex border border-neutral-800 bg-neutral-950 px-3 py-1 text-xs uppercase tracking-[0.18em] text-neutral-400">
              Meeting Mode
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              {session.title}
            </h1>
            <p className="mt-4 text-sm leading-7 text-neutral-400">
              Private transcript with the insight stack the dashboard built while the room was
              talking. This is memory, not marketing.
            </p>
          </div>

          <div className="border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-400">
            {session.status}
          </div>
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="border border-neutral-800 bg-neutral-950">
            <div className="border-b border-neutral-900 px-5 py-4 text-[11px] uppercase tracking-[0.22em] text-neutral-500">
              Transcript
            </div>
            <div className="px-5 py-5">
              <div className="mb-5 flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.18em] text-neutral-600">
                <span>
                  Started{' '}
                  {new Date(session.startedAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
                {session.endedAt && (
                  <span>
                    Ended{' '}
                    {new Date(session.endedAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
              <div className="whitespace-pre-wrap text-[15px] leading-8 text-neutral-200">
                {session.transcript || 'No transcript saved.'}
              </div>
            </div>
          </section>

          <section className="grid gap-6">
            <div className="border border-neutral-800 bg-neutral-950">
              <div className="border-b border-neutral-900 px-5 py-4 text-[11px] uppercase tracking-[0.22em] text-neutral-500">
                Insight stack
              </div>
              <div className="space-y-4 px-5 py-5">
                {session.insights.length === 0 ? (
                  <p className="text-sm leading-7 text-neutral-500">
                    No insights were stored for this session.
                  </p>
                ) : (
                  session.insights.map(insight => (
                    <article key={insight.id} className="border-b border-neutral-900 pb-4 last:border-b-0 last:pb-0">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                        {insight.kind.replaceAll('_', ' ')}
                      </div>
                      <h2 className="mt-2 text-lg font-semibold">{insight.title}</h2>
                      <p className="mt-2 text-sm leading-7 text-neutral-300">{insight.body}</p>
                      {insight.citations.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {insight.citations.map(citation => (
                            <a
                              key={`${citation.label}-${citation.url}`}
                              href={citation.url}
                              target="_blank"
                              rel="noreferrer"
                              className="border border-neutral-900 px-2 py-1 text-[11px] uppercase tracking-[0.14em] text-neutral-400 transition-colors hover:border-neutral-700 hover:text-white"
                            >
                              {citation.label}
                            </a>
                          ))}
                        </div>
                      )}
                    </article>
                  ))
                )}
              </div>
            </div>

            <div className="border border-neutral-800 bg-neutral-950">
              <div className="border-b border-neutral-900 px-5 py-4 text-[11px] uppercase tracking-[0.22em] text-neutral-500">
                Suggested responses
              </div>
              <div className="space-y-3 px-5 py-5">
                {session.suggestedResponses.length === 0 ? (
                  <p className="text-sm leading-7 text-neutral-500">
                    No response lines were stored for this session.
                  </p>
                ) : (
                  session.suggestedResponses.map(response => (
                    <article key={response.id} className="border border-neutral-900 px-4 py-4">
                      <p className="text-sm leading-7 text-neutral-200">{response.text}</p>
                    </article>
                  ))
                )}
              </div>
            </div>

            <div className="border border-neutral-800 bg-neutral-950 px-5 py-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">Next move</div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/cockpit?scene=ops#meeting-mode"
                  className="border border-[#d7d2c3]/30 bg-[#d7d2c3]/10 px-4 py-2 text-sm text-[#f5f1e7] transition-colors hover:bg-[#d7d2c3]/20"
                >
                  Start another meeting
                </Link>
                <Link
                  href="/profile"
                  className="border border-neutral-800 px-4 py-2 text-sm text-neutral-300 transition-colors hover:border-neutral-600 hover:text-white"
                >
                  Back to archive
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
