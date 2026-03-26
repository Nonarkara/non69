import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import {
  getChallengeStreak,
  getProfileStats,
  listConversationsForUser,
  listPracticeRunsForUser,
  listSavedWatchItemsForUser,
} from '@/lib/db';
import { countMeetingSessionsForUser, listMeetingSessionsForUser } from '@/lib/meetings';

export const metadata: Metadata = {
  title: 'Profile',
  description: 'Private memory, saved watch items, and session history inside the DrNon lab.',
};

const modeLabels: Record<string, string> = {
  think: 'Think',
  communicate: 'Communicate',
  reflect: 'Reflect',
};

export const dynamic = 'force-dynamic';

const practiceLabels: Record<string, string> = {
  challenge: 'Daily Challenge',
  arena: 'Arena',
  simulate: 'Simulate',
};

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/access?next=/profile');
  }

  const stats = getProfileStats(user.id);
  const challengeStreak = getChallengeStreak(user.id);
  const conversations = listConversationsForUser(user.id).slice(0, 8);
  const savedItems = listSavedWatchItemsForUser(user.id);
  const practiceRuns = listPracticeRunsForUser(user.id, 8);
  const meetingSessions = listMeetingSessionsForUser(user.id, 6);
  const meetingCount = countMeetingSessionsForUser(user.id);

  return (
    <main className="flex-1">
      <div className="max-w-6xl mx-auto px-4 py-14">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#d7d2c3]">Private memory</p>
            <h1 className="mt-3 text-4xl sm:text-5xl font-semibold leading-[0.96] tracking-tight">
              {user.display_name}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-neutral-300">
              No fake self-optimization horoscope here. Just the work you have done, the sessions
              you have saved, and the public signals you decided were worth keeping an eye on.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-400">
            {user.email}
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-4 xl:grid-cols-8">
          <div className="rounded-[24px] border border-neutral-800 bg-neutral-950 p-5">
            <div className="text-3xl font-semibold">{stats.conversationCount}</div>
            <div className="mt-2 text-xs uppercase tracking-[0.18em] text-neutral-500">Saved sessions</div>
          </div>
          <div className="rounded-[24px] border border-neutral-800 bg-neutral-950 p-5">
            <div className="text-3xl font-semibold">{stats.thinkCount}</div>
            <div className="mt-2 text-xs uppercase tracking-[0.18em] text-neutral-500">Think</div>
          </div>
          <div className="rounded-[24px] border border-neutral-800 bg-neutral-950 p-5">
            <div className="text-3xl font-semibold">{stats.communicateCount}</div>
            <div className="mt-2 text-xs uppercase tracking-[0.18em] text-neutral-500">Communicate</div>
          </div>
          <div className="rounded-[24px] border border-neutral-800 bg-neutral-950 p-5">
            <div className="text-3xl font-semibold">{stats.reflectCount}</div>
            <div className="mt-2 text-xs uppercase tracking-[0.18em] text-neutral-500">Reflect</div>
          </div>
          <div className="rounded-[24px] border border-neutral-800 bg-neutral-950 p-5">
            <div className="text-3xl font-semibold">{stats.savedCount}</div>
            <div className="mt-2 text-xs uppercase tracking-[0.18em] text-neutral-500">Pinned watch items</div>
          </div>
          <div className="rounded-[24px] border border-neutral-800 bg-neutral-950 p-5">
            <div className="text-3xl font-semibold">{meetingCount}</div>
            <div className="mt-2 text-xs uppercase tracking-[0.18em] text-neutral-500">Saved meetings</div>
          </div>
          <div className="rounded-[24px] border border-neutral-800 bg-neutral-950 p-5">
            <div className="text-3xl font-semibold">{stats.practiceCount}</div>
            <div className="mt-2 text-xs uppercase tracking-[0.18em] text-neutral-500">Practice runs</div>
          </div>
          <div className="rounded-[24px] border border-neutral-800 bg-neutral-950 p-5">
            <div className="text-3xl font-semibold">{challengeStreak}</div>
            <div className="mt-2 text-xs uppercase tracking-[0.18em] text-neutral-500">Challenge streak</div>
          </div>
        </div>

        <div className="mt-12 grid gap-8 xl:grid-cols-[1fr_0.9fr_0.85fr]">
          <section className="rounded-[28px] border border-neutral-800 bg-neutral-950 p-6 sm:p-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">Recent sessions</p>
                <h2 className="mt-3 text-2xl font-semibold">What you have already worked through</h2>
              </div>
              <Link
                href="/think"
                className="text-sm text-[#d7d2c3] hover:text-white transition-colors"
              >
                New session
              </Link>
            </div>

            <div className="mt-6 space-y-4">
              {conversations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-800 p-6 text-sm text-neutral-400">
                  No saved sessions yet. Start with `Think`, `Communicate`, or `Reflect` and the lab will store the transcript automatically.
                </div>
              ) : (
                conversations.map(conversation => (
                  <article key={conversation.id} className="rounded-2xl border border-neutral-900 p-5">
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs uppercase tracking-[0.18em] text-neutral-400">
                        {modeLabels[conversation.mode]}
                      </span>
                      <span className="text-xs text-neutral-600">
                        {new Date(conversation.updatedAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">{conversation.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-neutral-400">{conversation.preview}</p>
                    <div className="mt-4 flex items-center justify-between gap-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                        {conversation.messageCount} messages
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Link
                          href={`/profile/sessions/${conversation.id}`}
                          className="text-neutral-400 hover:text-white transition-colors"
                        >
                          Open
                        </Link>
                        <Link
                          href={`/${conversation.mode}?session=${conversation.id}`}
                          className="text-[#d7d2c3] hover:text-white transition-colors"
                        >
                          Resume
                        </Link>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-neutral-800 bg-neutral-950 p-6 sm:p-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">Pinned from watch</p>
              <h2 className="mt-3 text-2xl font-semibold">Signals worth keeping in view</h2>
            </div>

            <div className="mt-6 space-y-4">
              {savedItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-800 p-6 text-sm text-neutral-400">
                  Nothing pinned yet. Save signals or the daily brief from <Link href="/watch" className="text-[#d7d2c3] hover:text-white">Thailand Watch</Link>.
                </div>
              ) : (
                savedItems.map(item => (
                  <article key={item.id} className="rounded-2xl border border-neutral-900 p-5">
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs uppercase tracking-[0.18em] text-neutral-400">
                        {item.itemKind === 'brief' ? 'Brief' : item.status || 'Signal'}
                      </span>
                      <span className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                        {item.geography}
                      </span>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-neutral-400">{item.summary}</p>
                    <div className="mt-4 flex items-center justify-between gap-4">
                      <div className="text-xs text-neutral-600">
                        Updated{' '}
                        {new Date(item.updatedAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </div>
                      <Link
                        href={`/watch#${item.itemKind === 'brief' ? 'daily-brief' : item.itemSlug}`}
                        className="text-sm text-[#d7d2c3] hover:text-white transition-colors"
                      >
                        Open in watch
                      </Link>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-neutral-800 bg-neutral-950 p-6 sm:p-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">Meeting memory</p>
              <h2 className="mt-3 text-2xl font-semibold">Saved transcripts and insight stacks</h2>
            </div>

            <div className="mt-6 space-y-4">
              {meetingSessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-800 p-6 text-sm text-neutral-400">
                  No Meeting Mode sessions yet. Open <Link href="/cockpit?scene=ops#meeting-mode" className="text-[#d7d2c3] hover:text-white">Cockpit Ops</Link> and start one when the room gets expensive.
                </div>
              ) : (
                meetingSessions.map(session => (
                  <article key={session.id} className="rounded-2xl border border-neutral-900 p-5">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs uppercase tracking-[0.18em] text-neutral-400">
                        Meeting
                      </span>
                      <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs uppercase tracking-[0.18em] text-neutral-500">
                        {session.status}
                      </span>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">{session.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-neutral-400">{session.transcriptPreview}</p>
                    <div className="mt-4 flex items-center justify-between gap-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                        {session.insightCount} insight{session.insightCount === 1 ? '' : 's'}
                      </div>
                      <Link
                        href={`/profile/meetings/${session.id}`}
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
        </div>

        <section className="mt-8 rounded-[28px] border border-neutral-800 bg-neutral-950 p-6 sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">Practice record</p>
              <h2 className="mt-3 text-2xl font-semibold">Challenge, debate, and simulation history</h2>
            </div>
            <div className="text-xs uppercase tracking-[0.18em] text-neutral-600">
              Daily {stats.challengeCount} · Arena {stats.arenaCount} · Simulate {stats.simulateCount}
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {practiceRuns.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-800 p-6 text-sm text-neutral-400">
                No practice runs yet. Start with <Link href="/challenge" className="text-[#d7d2c3] hover:text-white">Daily Challenge</Link>, <Link href="/arena" className="text-[#d7d2c3] hover:text-white">Arena</Link>, or <Link href="/simulate" className="text-[#d7d2c3] hover:text-white">Simulate</Link>.
              </div>
            ) : (
              practiceRuns.map(run => (
                <article key={run.id} className="rounded-2xl border border-neutral-900 p-5">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs uppercase tracking-[0.18em] text-neutral-400">
                      {practiceLabels[run.tool]}
                    </span>
                    {typeof run.score === 'number' && (
                      <span className="text-xs uppercase tracking-[0.18em] text-[#d7d2c3]">
                        Score {Math.round(run.score * 100)}
                      </span>
                    )}
                    <span className="text-xs text-neutral-600">
                      {new Date(run.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{run.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-neutral-400">{run.summary}</p>
                  <div className="mt-4">
                    <Link
                      href={`/${run.tool}`}
                      className="text-sm text-[#d7d2c3] hover:text-white transition-colors"
                    >
                      Run it again
                    </Link>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
