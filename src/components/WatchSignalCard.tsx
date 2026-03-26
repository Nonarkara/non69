import type { WatchSignal } from '@/lib/db';
import { getWatchFreshness } from '@/lib/watch';
import SaveWatchButton from './SaveWatchButton';
import ShareButton from './ShareButton';

interface WatchSignalCardProps {
  signal: WatchSignal;
  compact?: boolean;
  defaultSaved?: boolean;
}

const statusStyles: Record<string, string> = {
  high: 'bg-red-500/15 text-red-300 border-red-500/30',
  elevated: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  watch: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  mixed: 'bg-neutral-700/30 text-neutral-200 border-neutral-600',
  active: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

export default function WatchSignalCard({
  signal,
  compact = false,
  defaultSaved = false,
}: WatchSignalCardProps) {
  const statusClass =
    statusStyles[signal.status] || 'bg-neutral-900 text-neutral-200 border-neutral-700';
  const freshness = getWatchFreshness(signal.updatedAt);
  const freshnessClass =
    freshness.status === 'current'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      : freshness.status === 'aging'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
        : 'border-red-500/30 bg-red-500/10 text-red-300';

  return (
    <article
      id={signal.slug}
      className="scroll-mt-24 border border-neutral-800 bg-neutral-950 rounded-[28px] p-5 sm:p-6 h-full shadow-[0_0_0_1px_rgba(255,255,255,0.02)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${statusClass}`}>
            {signal.status}
          </div>
          <h3 className="mt-4 text-xl font-semibold text-white">{signal.title}</h3>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${freshnessClass}`}>
              {freshness.label}
            </span>
            <p className="text-sm text-neutral-500">
              Updated{' '}
              {new Date(signal.updatedAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}{' '}
              · {freshness.ageText}
            </p>
          </div>
        </div>

        <SaveWatchButton
          geography="th"
          itemKind="signal"
          itemSlug={signal.slug}
          defaultSaved={defaultSaved}
        />
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">Summary</div>
          <p className="mt-2 text-sm leading-7 text-neutral-200">{signal.summary}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-neutral-900 bg-black/40 p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">Why it matters</div>
            <p className="mt-2 text-sm text-neutral-300 leading-6">{signal.whyItMatters}</p>
          </div>
          <div className="rounded-2xl border border-neutral-900 bg-black/40 p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">What to do</div>
            <p className="mt-2 text-sm text-neutral-300 leading-6">{signal.whatToDo}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-neutral-900 p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">Metric</div>
            <p className="mt-2 text-sm text-neutral-300">{signal.metricText}</p>
          </div>
          <div className="rounded-2xl border border-neutral-900 p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">Trend</div>
            <p className="mt-2 text-sm text-neutral-300">{signal.trendText}</p>
          </div>
        </div>

        {!compact && (
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">Sources</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {signal.sources.map(source => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-neutral-800 px-3 py-1.5 text-xs text-neutral-300 hover:border-neutral-600 hover:text-white transition-colors"
                >
                  <span>{source.label}</span>
                  <span className="text-neutral-600">{source.note}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">Thailand Watch signal</div>
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
    </article>
  );
}
