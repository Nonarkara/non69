import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import AdminTeamPanel from '@/components/AdminTeamPanel';
import ContactRequestInbox from '@/components/ContactRequestInbox';
import { getCurrentUser, isAdminUser, listUsersForAdmin } from '@/lib/auth';
import {
  getChallengeStreak,
  getContactRequestStats,
  getProfileStats,
  listContactRequests,
  listConversationsForUser,
  listSavedWatchItemsForUser,
} from '@/lib/db';

export const metadata: Metadata = {
  title: 'Ops Room',
  description: 'Private operator room for briefing demand, session flow, and pinned civic signals.',
};

export const dynamic = 'force-dynamic';

export default async function OpsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/access?next=/ops');
  }

  if (!isAdminUser(user)) {
    notFound();
  }

  const leadStats = getContactRequestStats();
  const profileStats = getProfileStats(user.id);
  const challengeStreak = getChallengeStreak(user.id);
  const contactRequests = listContactRequests(12);
  const team = listUsersForAdmin();
  const recentSessions = listConversationsForUser(user.id).slice(0, 4);
  const savedItems = listSavedWatchItemsForUser(user.id).slice(0, 4);

  return (
    <main className="flex-1">
      <div className="max-w-6xl mx-auto px-4 py-14">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#d7d2c3]">Ops room</p>
            <h1 className="mt-4 text-4xl sm:text-5xl font-semibold leading-[0.96] tracking-tight">
              Run the machine. See the demand. Keep momentum.
            </h1>
            <p className="mt-5 text-base leading-8 text-neutral-300">
              This is the operator view: who asked for help, what your private lab has already
              produced, and which public signals you decided were worth keeping close.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/ops/watch"
              className="rounded-full bg-[#d7d2c3] px-4 py-2 text-sm font-medium text-black hover:bg-[#e4decf] transition-colors"
            >
              Publish Thailand Watch
            </Link>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-400">
              Admin access · {user.email}
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[24px] border border-neutral-800 bg-neutral-950 p-5">
            <div className="text-3xl font-semibold">{leadStats.newCount || 0}</div>
            <div className="mt-2 text-xs uppercase tracking-[0.18em] text-neutral-500">New briefing requests</div>
          </div>
          <div className="rounded-[24px] border border-neutral-800 bg-neutral-950 p-5">
            <div className="text-3xl font-semibold">{leadStats.recentCount || 0}</div>
            <div className="mt-2 text-xs uppercase tracking-[0.18em] text-neutral-500">Requests in 7 days</div>
          </div>
          <div className="rounded-[24px] border border-neutral-800 bg-neutral-950 p-5">
            <div className="text-3xl font-semibold">{leadStats.totalCount || 0}</div>
            <div className="mt-2 text-xs uppercase tracking-[0.18em] text-neutral-500">Total requests</div>
          </div>
          <div className="rounded-[24px] border border-neutral-800 bg-neutral-950 p-5">
            <div className="text-3xl font-semibold">{challengeStreak}</div>
            <div className="mt-2 text-xs uppercase tracking-[0.18em] text-neutral-500">Daily challenge streak</div>
          </div>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[28px] border border-neutral-800 bg-neutral-950 p-6 sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">Briefing inbox</p>
                <h2 className="mt-3 text-2xl font-semibold">People who raised their hand</h2>
              </div>
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                Public CTA wired to SQLite
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <ContactRequestInbox initialRequests={contactRequests} />
            </div>
          </section>

          <div className="space-y-8">
            <section className="rounded-[28px] border border-neutral-800 bg-neutral-950 p-6 sm:p-8">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">
                    Team control
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold">Who can run the machine</h2>
                </div>
                <div className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                  Promote carefully
                </div>
              </div>

              <div className="mt-6">
                <AdminTeamPanel currentUserId={user.id} initialUsers={team} />
              </div>
            </section>

            <section className="rounded-[28px] border border-neutral-800 bg-neutral-950 p-6 sm:p-8">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">Private momentum</p>
                  <h2 className="mt-3 text-2xl font-semibold">Recent lab output</h2>
                </div>
                <Link href="/profile" className="text-sm text-[#d7d2c3] hover:text-white transition-colors">
                  Open profile
                </Link>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-neutral-900 p-4">
                  <div className="text-2xl font-semibold">{profileStats.conversationCount}</div>
                  <div className="mt-2 text-xs uppercase tracking-[0.18em] text-neutral-500">Saved lab sessions</div>
                </div>
                <div className="rounded-2xl border border-neutral-900 p-4">
                  <div className="text-2xl font-semibold">{profileStats.practiceCount}</div>
                  <div className="mt-2 text-xs uppercase tracking-[0.18em] text-neutral-500">Practice runs</div>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {recentSessions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-neutral-800 p-4 text-sm text-neutral-400">
                    No saved sessions yet.
                  </div>
                ) : (
                  recentSessions.map(session => (
                    <article key={session.id} className="rounded-2xl border border-neutral-900 p-4">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">
                        {session.mode}
                      </div>
                      <h3 className="mt-3 text-base font-semibold">{session.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-neutral-400">{session.preview}</p>
                      <div className="mt-3">
                        <Link
                          href={`/profile/sessions/${session.id}`}
                          className="text-sm text-[#d7d2c3] hover:text-white transition-colors"
                        >
                          Open transcript
                        </Link>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-neutral-800 bg-neutral-950 p-6 sm:p-8">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">Watch discipline</p>
                  <h2 className="mt-3 text-2xl font-semibold">Pinned civic signals</h2>
                </div>
                <Link href="/watch" className="text-sm text-[#d7d2c3] hover:text-white transition-colors">
                  Open watch
                </Link>
              </div>

              <div className="mt-6 space-y-4">
                {savedItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-neutral-800 p-4 text-sm text-neutral-400">
                    Nothing pinned yet. Use Thailand Watch like a grown-up control room.
                  </div>
                ) : (
                  savedItems.map(item => (
                    <article key={item.id} className="rounded-2xl border border-neutral-900 p-4">
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs uppercase tracking-[0.18em] text-neutral-400">
                          {item.itemKind === 'brief' ? 'Brief' : item.status || 'Signal'}
                        </span>
                        <span className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                          {item.geography}
                        </span>
                      </div>
                      <h3 className="mt-3 text-base font-semibold">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-neutral-400">{item.summary}</p>
                      <div className="mt-3">
                        <Link
                          href={`/watch#${item.itemKind === 'brief' ? 'daily-brief' : item.itemSlug}`}
                          className="text-sm text-[#d7d2c3] hover:text-white transition-colors"
                        >
                          Open signal
                        </Link>
                      </div>
                    </article>
                  ))
                )}
              </div>

              <div className="mt-6 rounded-2xl border border-[#d7d2c3]/20 bg-[#d7d2c3]/6 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[#d7d2c3]">
                  Publishing
                </div>
                <p className="mt-3 text-sm leading-7 text-neutral-200">
                  Update the public brief and all six signals from the operator layer instead of
                  living in SQLite.
                </p>
                <div className="mt-4">
                  <Link
                    href="/ops/watch"
                    className="text-sm text-[#d7d2c3] hover:text-white transition-colors"
                  >
                    Open watch publisher
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
