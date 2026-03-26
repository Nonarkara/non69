import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import CockpitLiveBar from '@/components/CockpitLiveBar';
import MeetingModePanel from '@/components/MeetingModePanel';
import LiveAirStrip from '@/components/dashboard/LiveAirStrip';
import SceneSwitch from '@/components/dashboard/SceneSwitch';
import SignalLadder from '@/components/dashboard/SignalLadder';
import { getCurrentUser, isAdminUser } from '@/lib/auth';
import {
  computeWatchStatusSummary,
  getChallengeStreak,
  getContactRequestStats,
  getProfileStats,
  getWatchBundle,
  listContactRequests,
  listConversationsForUser,
  listPracticeRunsForUser,
  listSavedWatchItemsForUser,
  listWatchRevisions,
} from '@/lib/db';
import { getLiveAirQuality } from '@/lib/live-signals';
import { listMeetingSessionsForUser } from '@/lib/meetings';

export const metadata: Metadata = {
  title: 'Cockpit',
  description: 'Large-screen private dashboard for sensing pressure, deciding priorities, and acting fast.',
};

const statusOrder: Record<string, number> = {
  high: 0,
  elevated: 1,
  active: 2,
  watch: 3,
  mixed: 4,
};

const statusColors: Record<string, string> = {
  high: 'text-red-300',
  elevated: 'text-amber-300',
  active: 'text-emerald-300',
  watch: 'text-sky-300',
  mixed: 'text-neutral-300',
};

function resolveScene(scene?: string) {
  if (scene === 'ops' || scene === 'ambient') {
    return scene;
  }

  return 'briefing';
}

function getTopActions(args: {
  freshnessVersionHref: string;
  topSignal:
    | {
        title: string;
        whatToDo: string;
        slug: string;
      }
    | undefined;
  latestSession:
    | {
        id: number;
        mode: string;
        title: string;
      }
    | undefined;
  latestMeetingId: number | null;
  isAdmin: boolean;
  newRequestCount: number;
}) {
  const actions = [
    {
      title: 'Reframe the room in one line',
      body: 'Use Meeting Mode when the conversation goes loose and you need a fast, source-backed intervention.',
      href: '/cockpit?scene=ops#meeting-mode',
      cta: 'Open Meeting Mode',
    },
  ];

  if (args.topSignal) {
    actions.push({
      title: `${args.topSignal.title} is the live pressure point`,
      body: args.topSignal.whatToDo,
      href: `/watch?scene=briefing#${args.topSignal.slug}`,
      cta: 'Open signal',
    });
  }

  if (args.latestSession) {
    actions.push({
      title: `Resume ${args.latestSession.mode}`,
      body: args.latestSession.title,
      href: `/${args.latestSession.mode}?session=${args.latestSession.id}`,
      cta: 'Resume',
    });
  }

  if (args.latestMeetingId) {
    actions.push({
      title: 'Review the last saved meeting',
      body: 'The transcript and insight stack are already in memory. Reuse the good lines.',
      href: `/profile/meetings/${args.latestMeetingId}`,
      cta: 'Open meeting',
    });
  }

  if (args.isAdmin && args.newRequestCount > 0) {
    actions.push({
      title: `${args.newRequestCount} new briefing request${args.newRequestCount === 1 ? '' : 's'}`,
      body: 'Demand is a live input. Somebody raised a hand. Don’t let it go cold.',
      href: '/ops',
      cta: 'Open ops',
    });
  }

  actions.push({
    title: 'Keep the watch honest',
    body: 'Revision history, freshness, and publish discipline are part of the product. Protect them.',
    href: args.freshnessVersionHref,
    cta: 'Open watch ops',
  });

  return actions.slice(0, 5);
}

export const dynamic = 'force-dynamic';

export default async function CockpitPage({
  searchParams,
}: {
  searchParams: Promise<{ scene?: string }>;
}) {
  const params = await searchParams;
  const scene = resolveScene(params.scene);
  const user = await getCurrentUser();
  if (!user) {
    redirect('/access?next=/cockpit');
  }

  const bundle = await getWatchBundle('th');
  if (!bundle) {
    redirect('/watch');
  }

  const isAdmin = isAdminUser(user);
  const revisions = await listWatchRevisions('th');
  const liveAir = await getLiveAirQuality('bangkok');
  const conversations = (await listConversationsForUser(user.id)).slice(0, 5);
  const savedItems = (await listSavedWatchItemsForUser(user.id)).slice(0, 5);
  const practiceRuns = await listPracticeRunsForUser(user.id, 5);
  const profileStats = await getProfileStats(user.id);
  const challengeStreak = await getChallengeStreak(user.id);
  const meetingSessions = await listMeetingSessionsForUser(user.id, 5);
  const contactStats = isAdmin ? await getContactRequestStats() : null;
  const contactRequests = isAdmin ? await listContactRequests(5) : [];

  const currentRevision = revisions[0] ?? null;
  const sortedSignals = [...bundle.signals].sort(
    (left, right) => (statusOrder[left.status] ?? 99) - (statusOrder[right.status] ?? 99)
  );
  const topSignal = sortedSignals[0];
  const statusSummary = computeWatchStatusSummary(bundle.signals);
  const sceneItems = [
    {
      key: 'briefing',
      label: 'Briefing',
      description: 'Decision surface',
      href: '/cockpit?scene=briefing',
    },
    {
      key: 'ops',
      label: 'Ops',
      description: 'Research + publish',
      href: '/cockpit?scene=ops',
    },
    {
      key: 'ambient',
      label: 'Ambient',
      description: 'Wallboard mode',
      href: '/cockpit?scene=ambient',
    },
  ];

  const topActions = getTopActions({
    freshnessVersionHref: isAdmin ? '/ops/watch' : '/watch',
    topSignal,
    latestSession: conversations[0],
    latestMeetingId: meetingSessions[0]?.id ?? null,
    isAdmin,
    newRequestCount: contactStats?.newCount ?? 0,
  });

  return (
    <main className="flex-1">
      <section className="border-b border-neutral-900/90">
        <div className="mx-auto max-w-[1880px] px-4 py-8 sm:px-6">
          <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-5xl">
              <div className="text-[11px] uppercase tracking-[0.24em] text-[#d7d2c3]">
                Private cockpit
              </div>
              <h1 className="mt-5 text-5xl font-semibold leading-[0.9] tracking-[-0.06em] sm:text-7xl">
                Sense fast. Decide cleanly. Act before the room catches up.
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-8 text-neutral-300 sm:text-lg">
                This is the operating wall. Public watch for the outside world, decision stack in
                the center, action rails on the right, and Meeting Mode when someone starts saying
                something expensive.
              </p>
            </div>

            <SceneSwitch items={sceneItems} activeKey={scene} />
          </div>

          <div className="mt-8 border border-neutral-900/90 bg-black/35 px-4 py-4">
            <CockpitLiveBar
              generatedAt={bundle.generatedAt}
              currentVersion={currentRevision?.version ?? null}
            />
          </div>
        </div>
      </section>

      {scene === 'ambient' ? (
        <section>
          <div className="mx-auto max-w-[1920px] px-4 py-10 sm:px-6">
            <LiveAirStrip reading={liveAir} compact />

            <div className="mt-8 grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
              <section className="border border-neutral-900/90 bg-black/35 p-8 sm:p-10">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#d7d2c3]">
                  Decision brief
                </div>
                <h2 className="mt-6 max-w-5xl text-5xl font-semibold leading-[0.88] tracking-[-0.06em] sm:text-7xl">
                  {bundle.brief.headline}
                </h2>
                <p className="mt-8 max-w-4xl text-lg leading-9 text-neutral-300">
                  {bundle.brief.summary}
                </p>

                <div className="mt-10 grid gap-5 border-t border-neutral-900 pt-6 md:grid-cols-3">
                  {bundle.brief.watchouts.map((watchout, index) => (
                    <div key={watchout}>
                      <div className="text-3xl font-semibold tracking-[-0.06em] text-neutral-800">
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <p className="mt-3 text-sm leading-7 text-neutral-300">{watchout}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid gap-6 border border-neutral-900/90 bg-black/35 p-6 sm:p-8">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">
                    Top pressure
                  </div>
                  <div className={`mt-4 text-6xl font-semibold tracking-[-0.08em] ${statusColors[topSignal.status] || 'text-white'}`}>
                    {topSignal.title}
                  </div>
                  <p className="mt-4 max-w-lg text-base leading-8 text-neutral-300">
                    {topSignal.summary}
                  </p>
                </div>

                <div className="grid gap-3 border-t border-neutral-900 pt-6 sm:grid-cols-2">
                  <div className="border border-neutral-900/80 px-4 py-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                      Posture
                    </div>
                    <div className={`mt-3 text-4xl font-semibold tracking-[-0.08em] ${statusColors[statusSummary.worstStatus] || 'text-white'}`}>
                      {statusSummary.worstStatus}
                    </div>
                  </div>
                  <div className="border border-neutral-900/80 px-4 py-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                      Challenge streak
                    </div>
                    <div className="mt-3 text-4xl font-semibold tracking-[-0.08em] text-white">
                      {challengeStreak}
                    </div>
                  </div>
                </div>

                <div className="border-t border-neutral-900 pt-6">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                    Latest saved meeting
                  </div>
                  <div className="mt-3 text-2xl font-semibold">
                    {meetingSessions[0]?.title || 'No meeting saved yet'}
                  </div>
                  <p className="mt-3 text-sm leading-7 text-neutral-400">
                    {meetingSessions[0]?.transcriptPreview ||
                      'Use Meeting Mode in Ops and the best lines come back here as memory.'}
                  </p>
                </div>
              </section>
            </div>
          </div>
        </section>
      ) : scene === 'ops' ? (
        <section>
          <div className="mx-auto max-w-[1880px] px-4 py-10 sm:px-6">
            <div className="grid gap-8 xl:grid-cols-[0.8fr_0.72fr_1.12fr]">
              <section className="grid gap-6">
                <LiveAirStrip reading={liveAir} compact />

                <div className="border border-neutral-900/90 bg-black/35 p-6">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">
                    Signal ladder
                  </div>
                  <div className="mt-4">
                    <SignalLadder
                      signals={sortedSignals}
                      interactive={false}
                      compact
                      defaultOpenCount={1}
                    />
                  </div>
                </div>
              </section>

              <section className="grid gap-6">
                <div className="border border-neutral-900/90 bg-black/35 p-6">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">
                        Operator priorities
                      </div>
                      <h2 className="mt-3 text-3xl font-semibold tracking-tight">What moves the board</h2>
                    </div>
                    <Link
                      href={isAdmin ? '/ops/watch' : '/watch'}
                      className="text-[11px] uppercase tracking-[0.18em] text-[#d7d2c3] transition-colors hover:text-white"
                    >
                      {isAdmin ? 'Publish watch' : 'Open watch'}
                    </Link>
                  </div>

                  <div className="mt-6 space-y-4">
                    {topActions.map(action => (
                      <article key={action.title} className="border border-neutral-900/80 px-4 py-4">
                        <div className="text-lg font-semibold">{action.title}</div>
                        <p className="mt-2 text-sm leading-7 text-neutral-400">{action.body}</p>
                        <Link
                          href={action.href}
                          className="mt-4 inline-block text-[11px] uppercase tracking-[0.18em] text-[#d7d2c3] transition-colors hover:text-white"
                        >
                          {action.cta}
                        </Link>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="border border-neutral-900/90 bg-black/35 p-6">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">
                    Demand and revisions
                  </div>
                  <div className="mt-5 space-y-4">
                    {isAdmin &&
                      contactRequests.map(request => (
                        <article key={request.id} className="border-b border-neutral-900 pb-4 last:border-b-0 last:pb-0">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-medium">{request.name}</div>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">
                              {request.status}
                            </div>
                          </div>
                          <p className="mt-2 text-sm leading-7 text-neutral-400">{request.useCase}</p>
                        </article>
                      ))}

                    {revisions.slice(0, 3).map(revision => (
                      <article key={revision.id} className="border-b border-neutral-900 pb-4 last:border-b-0 last:pb-0">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">
                          v{revision.version} · {revision.action}
                        </div>
                        <div className="mt-2 text-sm font-medium">{revision.headline}</div>
                        <div className="mt-2 text-xs leading-6 text-neutral-500">
                          {revision.actor?.displayName || 'Unknown admin'}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>

              <section id="meeting-mode">
                <MeetingModePanel />
              </section>
            </div>
          </div>
        </section>
      ) : (
        <section>
          <div className="mx-auto max-w-[1880px] px-4 py-10 sm:px-6">
            <div className="grid gap-8 xl:grid-cols-[0.88fr_1.16fr_0.96fr]">
              <section className="grid gap-6">
                <LiveAirStrip reading={liveAir} compact />

                <div className="border border-neutral-900/90 bg-black/35 p-6">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">
                    Sense
                  </div>
                  <div className="mt-4">
                    <SignalLadder
                      signals={sortedSignals.slice(0, 4)}
                      interactive={false}
                      compact
                      defaultOpenCount={1}
                    />
                  </div>
                </div>

                <div className="border border-neutral-900/90 bg-black/35 p-6">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">
                    {isAdmin ? 'Incoming demand' : 'Pinned watch'}
                  </div>
                  <div className="mt-5 space-y-4">
                    {isAdmin ? (
                      contactRequests.length > 0 ? (
                        contactRequests.map(request => (
                          <article key={request.id} className="border-b border-neutral-900 pb-4 last:border-b-0 last:pb-0">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-medium">{request.name}</div>
                              <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">
                                {request.status}
                              </div>
                            </div>
                            <p className="mt-2 text-sm leading-7 text-neutral-400">{request.useCase}</p>
                          </article>
                        ))
                      ) : (
                        <p className="text-sm leading-7 text-neutral-500">
                          No inbound demand right now.
                        </p>
                      )
                    ) : savedItems.length > 0 ? (
                      savedItems.map(item => (
                        <article key={item.id} className="border-b border-neutral-900 pb-4 last:border-b-0 last:pb-0">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">
                            {item.itemKind === 'brief' ? 'Brief' : item.status || 'Signal'}
                          </div>
                          <div className="mt-2 text-sm font-medium">{item.title}</div>
                          <p className="mt-2 text-sm leading-7 text-neutral-400">{item.summary}</p>
                        </article>
                      ))
                    ) : (
                      <p className="text-sm leading-7 text-neutral-500">
                        Pin signals from the public watch and they show up here.
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <section className="border border-neutral-900/90 bg-black/35 p-8 sm:p-10">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#d7d2c3]">Decide</div>
                <h2 className="mt-6 max-w-5xl text-5xl font-semibold leading-[0.9] tracking-[-0.06em] sm:text-7xl">
                  {bundle.brief.headline}
                </h2>
                <p className="mt-8 max-w-4xl text-lg leading-9 text-neutral-300">
                  {bundle.brief.summary}
                </p>

                <div className="mt-10 grid gap-5 border-t border-neutral-900 pt-6 md:grid-cols-3">
                  {bundle.brief.watchouts.map((watchout, index) => (
                    <div key={watchout}>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">
                        Decision {index + 1}
                      </div>
                      <p className="mt-2 text-sm leading-7 text-neutral-300">{watchout}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-10 border-t border-neutral-900 pt-6">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">
                    Action ladder
                  </div>
                  <div className="mt-5 space-y-4">
                    {topActions.map(action => (
                      <article key={action.title} className="border border-neutral-900/80 px-4 py-4">
                        <div className="text-lg font-semibold">{action.title}</div>
                        <p className="mt-2 text-sm leading-7 text-neutral-400">{action.body}</p>
                        <Link
                          href={action.href}
                          className="mt-4 inline-block text-[11px] uppercase tracking-[0.18em] text-[#d7d2c3] transition-colors hover:text-white"
                        >
                          {action.cta}
                        </Link>
                      </article>
                    ))}
                  </div>
                </div>
              </section>

              <section className="grid gap-6">
                <div className="border border-neutral-900/90 bg-black/35 p-6">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">Act</div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="border border-neutral-900/80 px-4 py-4">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                        Saved sessions
                      </div>
                      <div className="mt-3 text-4xl font-semibold tracking-[-0.08em] text-white">
                        {profileStats.conversationCount}
                      </div>
                    </div>
                    <div className="border border-neutral-900/80 px-4 py-4">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                        Pinned watch
                      </div>
                      <div className="mt-3 text-4xl font-semibold tracking-[-0.08em] text-white">
                        {profileStats.savedCount}
                      </div>
                    </div>
                    <div className="border border-neutral-900/80 px-4 py-4">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                        Practice runs
                      </div>
                      <div className="mt-3 text-4xl font-semibold tracking-[-0.08em] text-white">
                        {profileStats.practiceCount}
                      </div>
                    </div>
                    <div className="border border-neutral-900/80 px-4 py-4">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                        Meetings saved
                      </div>
                      <div className="mt-3 text-4xl font-semibold tracking-[-0.08em] text-white">
                        {meetingSessions.length}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border border-neutral-900/90 bg-black/35 p-6">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">
                    Recent memory
                  </div>
                  <div className="mt-5 space-y-4">
                    {conversations.map(conversation => (
                      <article key={conversation.id} className="border-b border-neutral-900 pb-4 last:border-b-0 last:pb-0">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium">{conversation.title}</div>
                          <Link
                            href={`/${conversation.mode}?session=${conversation.id}`}
                            className="text-[11px] uppercase tracking-[0.18em] text-[#d7d2c3] transition-colors hover:text-white"
                          >
                            Resume
                          </Link>
                        </div>
                        <p className="mt-2 text-sm leading-7 text-neutral-400">{conversation.preview}</p>
                      </article>
                    ))}
                    {meetingSessions.slice(0, 2).map(session => (
                      <article key={`meeting-${session.id}`} className="border-b border-neutral-900 pb-4 last:border-b-0 last:pb-0">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium">{session.title}</div>
                          <Link
                            href={`/profile/meetings/${session.id}`}
                            className="text-[11px] uppercase tracking-[0.18em] text-[#d7d2c3] transition-colors hover:text-white"
                          >
                            Open
                          </Link>
                        </div>
                        <p className="mt-2 text-sm leading-7 text-neutral-400">{session.transcriptPreview}</p>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="border border-neutral-900/90 bg-black/35 p-6">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">
                    Practice momentum
                  </div>
                  <div className="mt-5 space-y-4">
                    {practiceRuns.length > 0 ? (
                      practiceRuns.map(run => (
                        <article key={run.id} className="border-b border-neutral-900 pb-4 last:border-b-0 last:pb-0">
                          <div className="text-sm font-medium">{run.title}</div>
                          <p className="mt-2 text-sm leading-7 text-neutral-400">{run.summary}</p>
                        </article>
                      ))
                    ) : (
                      <p className="text-sm leading-7 text-neutral-500">
                        No practice runs yet. Use challenge, arena, or simulate to thicken the archive.
                      </p>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
