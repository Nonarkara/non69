import type { Metadata } from 'next';
import Link from 'next/link';
import CockpitLiveBar from '@/components/CockpitLiveBar';
import { getWatchBundle, listWatchRevisions } from '@/lib/db';
import { getWatchFreshness } from '@/lib/watch';

export const metadata: Metadata = {
  title: 'Cockpit Preview',
  description: 'Preview of the DrNon cockpit layout and information hierarchy.',
};

const statusOrder: Record<string, number> = {
  high: 0,
  elevated: 1,
  active: 2,
  watch: 3,
  mixed: 4,
};

const statusTone: Record<string, string> = {
  high: 'text-red-300',
  elevated: 'text-amber-300',
  active: 'text-emerald-300',
  watch: 'text-sky-300',
  mixed: 'text-neutral-300',
};

const demoSessions = [
  {
    id: 1,
    mode: 'communicate',
    title: 'Bangkok mayor briefing draft',
    preview:
      'Cut the fluff. Lead with heat stress, mobility reliability, and what the city can fix in 30 days.',
  },
  {
    id: 2,
    mode: 'think',
    title: 'Phuket transit trust problem',
    preview:
      'People do not hate buses. They hate uncertainty, false promises, and dead waiting time.',
  },
  {
    id: 3,
    mode: 'reflect',
    title: 'What the dashboard is actually for',
    preview:
      'It is not for decoration. It is a machine for reducing ambiguity before action.',
  },
];

const demoPracticeRuns = [
  {
    id: 1,
    tool: 'challenge',
    title: 'Daily challenge: explain heat policy without bullshit',
    summary: 'Strong framing, weak conclusion. Needed a cleaner action ladder.',
    score: 0.78,
  },
  {
    id: 2,
    tool: 'arena',
    title: 'Debate: should city rankings exist at all?',
    summary: 'Good attack on prestige metrics. Needed stronger alternative benchmarks.',
    score: 0.81,
  },
  {
    id: 3,
    tool: 'simulate',
    title: 'Emergency media briefing under flood pressure',
    summary: 'Calm delivery, but too many caveats before instructions.',
    score: 0.74,
  },
];

const demoDemand = [
  {
    id: 1,
    name: 'Municipal innovation office',
    status: 'new',
    useCase: 'Need a compact operations dashboard for drainage, complaints, and mobility failures.',
  },
  {
    id: 2,
    name: 'Regional newsroom',
    status: 'scheduled',
    useCase: 'Wants a daily civic signal briefing that can sit next to politics and business.',
  },
  {
    id: 3,
    name: 'University lab',
    status: 'contacted',
    useCase: 'Needs a live teaching console for urban systems, policy incentives, and service friction.',
  },
];

const demoPinned = [
  {
    id: 1,
    kind: 'signal',
    title: 'Heat Stress',
    summary: 'The most punishing daily signal because it hits function, not just comfort.',
  },
  {
    id: 2,
    kind: 'brief',
    title: 'Thailand Watch daily brief',
    summary: 'The top-line frame for the day before diving into six separate signals.',
  },
];

export default async function CockpitPreviewPage() {
  const bundle = await getWatchBundle('th');
  const revisions = await listWatchRevisions('th');

  if (!bundle) {
    return (
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="border border-neutral-800 p-8">
            <h1 className="text-3xl font-semibold">Cockpit preview unavailable.</h1>
          </div>
        </div>
      </main>
    );
  }

  const freshness = getWatchFreshness(bundle.generatedAt);
  const signals = [...bundle.signals].sort(
    (left, right) => (statusOrder[left.status] ?? 99) - (statusOrder[right.status] ?? 99)
  );
  const topSignal = signals[0];
  const currentRevision = revisions[0] ?? null;

  return (
    <main className="flex-1 min-h-[calc(100vh-57px)]">
      <section className="border-b border-neutral-900">
        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#d7d2c3]">
                Cockpit preview
              </div>
              <h1 className="mt-3 text-4xl font-semibold leading-none tracking-tight sm:text-6xl">
                Three screens. One mind.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-neutral-300">
                This preview uses the live public watch plus sample private rails so you can judge
                composition before wiring more live operator systems into it.
              </p>
            </div>

            <div className="min-w-[320px] border border-neutral-800 bg-black/40 px-4 py-3">
              <CockpitLiveBar
                generatedAt={bundle.generatedAt}
                currentVersion={currentRevision?.version ?? null}
              />
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6">
          <div className="grid xl:grid-cols-[1fr_1.18fr_1fr]">
            <section className="border-b border-neutral-900 py-8 xl:border-b-0 xl:border-r xl:pr-8">
              <div className="border-b border-neutral-900 pb-5">
                <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-600">Sense</div>
                <h2 className="mt-3 text-2xl font-semibold">World pressure</h2>
              </div>

              <div className="divide-y divide-neutral-900">
                {signals.map(signal => (
                  <article key={signal.slug} className="py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className={`text-[11px] uppercase tracking-[0.18em] ${statusTone[signal.status] || 'text-neutral-300'}`}>
                          {signal.status}
                        </div>
                        <h3 className="mt-2 text-lg font-medium">{signal.title}</h3>
                      </div>
                      <Link
                        href={`/watch#${signal.slug}`}
                        className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 hover:text-white"
                      >
                        Open
                      </Link>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-neutral-300">{signal.metricText}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-neutral-600">
                      {signal.trendText}
                    </p>
                  </article>
                ))}
              </div>

              <div className="mt-8 border-t border-neutral-900 pt-5">
                <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-600">
                  Incoming demand
                </div>
                <div className="mt-4 divide-y divide-neutral-900">
                  {demoDemand.map(request => (
                    <article key={request.id} className="py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium">{request.name}</div>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">
                          {request.status}
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-neutral-400">{request.useCase}</p>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section className="border-b border-neutral-900 py-8 xl:border-b-0 xl:border-r xl:px-8">
              <div className="border-b border-neutral-900 pb-5">
                <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-600">Decide</div>
                <h2 className="mt-3 text-2xl font-semibold">Decision stack</h2>
              </div>

              <div className="py-8">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#d7d2c3]">
                  Current brief
                </div>
                <h3 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">
                  {bundle.brief.headline}
                </h3>
                <p className="mt-6 max-w-3xl text-lg leading-9 text-neutral-300">
                  {bundle.brief.summary}
                </p>
              </div>

              <div className="grid gap-8 border-t border-neutral-900 py-8 lg:grid-cols-2">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-600">
                    What changed
                  </div>
                  <div className="mt-4 space-y-5">
                    {bundle.brief.watchouts.map((item, index) => (
                      <div key={item} className="grid grid-cols-[28px_1fr] gap-4">
                        <div className="text-sm text-neutral-500">{String(index + 1).padStart(2, '0')}</div>
                        <p className="text-base leading-7 text-neutral-200">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-600">
                    Operational posture
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="border border-neutral-900 p-4">
                      <div className="text-3xl font-semibold">{revisions.length}</div>
                      <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-neutral-600">
                        Watch revisions
                      </div>
                    </div>
                    <div className="border border-neutral-900 p-4">
                      <div className="text-3xl font-semibold">{signals.length}</div>
                      <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-neutral-600">
                        Signals in view
                      </div>
                    </div>
                    <div className="border border-neutral-900 p-4">
                      <div className="text-3xl font-semibold">{demoSessions.length}</div>
                      <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-neutral-600">
                        Session threads
                      </div>
                    </div>
                    <div className="border border-neutral-900 p-4">
                      <div className="text-3xl font-semibold">{freshness.label}</div>
                      <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-neutral-600">
                        Publish cadence
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-neutral-900 py-8">
                <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-600">
                  If nothing else, do this
                </div>
                <div className="mt-6 space-y-5">
                  <article className="grid gap-4 border-b border-neutral-900 pb-5 md:grid-cols-[32px_1fr_auto]">
                    <div className="text-sm text-neutral-500">01</div>
                    <div>
                      <h3 className="text-lg font-medium">{topSignal.title} is the current pressure point</h3>
                      <p className="mt-2 max-w-2xl text-sm leading-7 text-neutral-400">
                        {topSignal.whatToDo}
                      </p>
                    </div>
                    <div>
                      <Link
                        href={`/watch#${topSignal.slug}`}
                        className="text-[11px] uppercase tracking-[0.18em] text-[#d7d2c3] hover:text-white"
                      >
                        Open signal
                      </Link>
                    </div>
                  </article>

                  <article className="grid gap-4 border-b border-neutral-900 pb-5 md:grid-cols-[32px_1fr_auto]">
                    <div className="text-sm text-neutral-500">02</div>
                    <div>
                      <h3 className="text-lg font-medium">Keep the public watch inside a 24-hour cadence</h3>
                      <p className="mt-2 max-w-2xl text-sm leading-7 text-neutral-400">
                        A dashboard dies the moment people suspect it has stopped breathing.
                      </p>
                    </div>
                    <div>
                      <Link
                        href="/ops/watch"
                        className="text-[11px] uppercase tracking-[0.18em] text-[#d7d2c3] hover:text-white"
                      >
                        Open publisher
                      </Link>
                    </div>
                  </article>

                  <article className="grid gap-4 md:grid-cols-[32px_1fr_auto]">
                    <div className="text-sm text-neutral-500">03</div>
                    <div>
                      <h3 className="text-lg font-medium">Turn raw signal into briefable language</h3>
                      <p className="mt-2 max-w-2xl text-sm leading-7 text-neutral-400">
                        Make the dashboard explainable to a mayor, a journalist, or a tired citizen in one breath.
                      </p>
                    </div>
                    <div>
                      <Link
                        href="/communicate"
                        className="text-[11px] uppercase tracking-[0.18em] text-[#d7d2c3] hover:text-white"
                      >
                        Open comms
                      </Link>
                    </div>
                  </article>
                </div>
              </div>
            </section>

            <section className="py-8 xl:pl-8">
              <div className="border-b border-neutral-900 pb-5">
                <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-600">Act</div>
                <h2 className="mt-3 text-2xl font-semibold">Output rail</h2>
              </div>

              <div className="grid gap-3 py-6 sm:grid-cols-2 xl:grid-cols-1">
                <Link
                  href="/ops/watch"
                  className="border border-[#d7d2c3]/25 px-4 py-4 text-sm text-[#d7d2c3] hover:bg-[#d7d2c3]/5"
                >
                  Publish Thailand Watch
                </Link>
                <Link
                  href="/think"
                  className="border border-neutral-900 px-4 py-4 text-sm text-neutral-300 hover:border-neutral-700 hover:text-white"
                >
                  Start a think session
                </Link>
                <Link
                  href="/challenge"
                  className="border border-neutral-900 px-4 py-4 text-sm text-neutral-300 hover:border-neutral-700 hover:text-white"
                >
                  Run daily challenge
                </Link>
                <Link
                  href="/ops"
                  className="border border-neutral-900 px-4 py-4 text-sm text-neutral-300 hover:border-neutral-700 hover:text-white"
                >
                  Open ops room
                </Link>
              </div>

              <div className="border-t border-neutral-900 py-6">
                <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-600">Recent sessions</div>
                <div className="mt-4 divide-y divide-neutral-900">
                  {demoSessions.map(session => (
                    <article key={session.id} className="py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">
                          {session.mode}
                        </div>
                        <Link
                          href={`/${session.mode}`}
                          className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 hover:text-white"
                        >
                          Resume
                        </Link>
                      </div>
                      <h3 className="mt-2 text-base font-medium">{session.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-neutral-400">{session.preview}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="border-t border-neutral-900 py-6">
                <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-600">Practice history</div>
                <div className="mt-4 divide-y divide-neutral-900">
                  {demoPracticeRuns.map(run => (
                    <article key={run.id} className="py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">
                          {run.tool}
                        </div>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                          Score {Math.round(run.score * 100)}
                        </div>
                      </div>
                      <h3 className="mt-2 text-base font-medium">{run.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-neutral-400">{run.summary}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="border-t border-neutral-900 py-6">
                <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-600">Pinned watch</div>
                <div className="mt-4 divide-y divide-neutral-900">
                  {demoPinned.map(item => (
                    <article key={item.id} className="py-4">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">
                        {item.kind}
                      </div>
                      <h3 className="mt-2 text-base font-medium">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-neutral-400">{item.summary}</p>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
