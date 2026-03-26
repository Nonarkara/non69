import type { WatchSignal } from '@/lib/db';
import { getWatchFreshness } from '@/lib/watch';
import SaveWatchButton from '@/components/SaveWatchButton';
import ShareButton from '@/components/ShareButton';

interface SignalLadderProps {
  signals: WatchSignal[];
  defaultSavedSlugs?: string[];
  interactive?: boolean;
  compact?: boolean;
  defaultOpenCount?: number;
}

const statusTone: Record<string, string> = {
  high: 'text-red-300',
  elevated: 'text-amber-300',
  watch: 'text-sky-300',
  mixed: 'text-neutral-200',
  active: 'text-emerald-300',
};

export default function SignalLadder({
  signals,
  defaultSavedSlugs = [],
  interactive = true,
  compact = false,
  defaultOpenCount = 1,
}: SignalLadderProps) {
  return (
    <div className="border-t border-neutral-900/90">
      {signals.map((signal, index) => {
        const freshness = getWatchFreshness(signal.updatedAt);
        const statusClass = statusTone[signal.status] || 'text-neutral-200';

        return (
          <details
            key={signal.slug}
            id={signal.slug}
            open={index < defaultOpenCount}
            className="group border-b border-neutral-900/90 py-4 scroll-mt-24"
          >
            <summary className="list-none cursor-pointer">
              <div className="grid gap-4 lg:grid-cols-[72px_1.2fr_0.9fr_auto] lg:items-end">
                <div className="text-4xl font-semibold tracking-[-0.08em] text-neutral-800 transition-colors group-open:text-neutral-500">
                  {String(index + 1).padStart(2, '0')}
                </div>

                <div>
                  <div className={`text-[11px] uppercase tracking-[0.22em] ${statusClass}`}>
                    {signal.status}
                  </div>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                    {signal.title}
                  </h3>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-300">{signal.summary}</p>
                </div>

                <div className="grid gap-3 text-sm leading-6 text-neutral-400">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">Metric</div>
                    <div className="mt-1">{signal.metricText}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">Trend</div>
                    <div className="mt-1">{signal.trendText}</div>
                  </div>
                </div>

                <div className="text-right text-[11px] uppercase tracking-[0.22em] text-neutral-600">
                  <div>{freshness.label}</div>
                  <div className="mt-1">{freshness.ageText}</div>
                  <div className="mt-3 text-neutral-400 group-open:text-white">Expand</div>
                </div>
              </div>
            </summary>

            <div className={`grid gap-6 ${compact ? 'mt-4 lg:grid-cols-[1fr_1fr]' : 'mt-6 lg:grid-cols-[1fr_1fr_auto]'}`}>
              <div className="grid gap-5 border-l border-neutral-900 pl-4 sm:pl-6">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">
                    Why it matters
                  </div>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-neutral-300">
                    {signal.whyItMatters}
                  </p>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">
                    What to do
                  </div>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-neutral-300">{signal.whatToDo}</p>
                </div>
              </div>

              <div className="border-l border-neutral-900 pl-4 sm:pl-6">
                <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">Sources</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {signal.sources.map(source => (
                    <a
                      key={source.url}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="border border-neutral-900 px-3 py-2 text-xs leading-5 text-neutral-300 transition-colors hover:border-neutral-700 hover:text-white"
                    >
                      <div className="uppercase tracking-[0.16em] text-neutral-500">{source.label}</div>
                      <div className="mt-1">{source.note}</div>
                    </a>
                  ))}
                </div>
              </div>

              {interactive && !compact && (
                <div className="flex items-start gap-2 lg:flex-col lg:items-stretch lg:justify-between">
                  <SaveWatchButton
                    geography="th"
                    itemKind="signal"
                    itemSlug={signal.slug}
                    defaultSaved={defaultSavedSlugs.includes(signal.slug)}
                  />
                  <ShareButton
                    payload={{
                      kind: 'watch_signal',
                      title: signal.title,
                      geography: 'th',
                      summary: signal.summary,
                      status: signal.status,
                      metricText: signal.metricText,
                      trendText: signal.trendText,
                      whatToDo: signal.whatToDo,
                    }}
                    align="right"
                  />
                </div>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}
