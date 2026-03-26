import { getWatchFreshness } from '@/lib/watch';

interface WatchFreshnessPanelProps {
  generatedAt: string;
  currentVersion?: number | null;
  revisionCount?: number;
  mode?: 'default' | 'compact' | 'ops';
}

const statusStyles: Record<string, string> = {
  current: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
  aging: 'border-amber-500/30 bg-amber-500/15 text-amber-300',
  stale: 'border-red-500/30 bg-red-500/15 text-red-300',
};

const guidanceByMode: Record<'default' | 'compact' | 'ops', Record<string, string>> = {
  default: {
    current: 'Within the daily publishing window.',
    aging: 'Still usable, but due for a tighter operator pass.',
    stale: 'Treat this as lagging until the next publish lands.',
  },
  compact: {
    current: 'Inside the daily publishing window.',
    aging: 'Due for a refresh soon.',
    stale: 'Needs a fresh publish.',
  },
  ops: {
    current: 'Cadence is holding. Keep the next publish inside 24 hours.',
    aging: 'You are drifting. Tighten the brief before this starts looking lazy.',
    stale: 'Overdue. Publish a fresh snapshot before asking people to trust it.',
  },
};

export default function WatchFreshnessPanel({
  generatedAt,
  currentVersion = null,
  revisionCount,
  mode = 'default',
}: WatchFreshnessPanelProps) {
  const freshness = getWatchFreshness(generatedAt);
  const style = statusStyles[freshness.status] || statusStyles.stale;
  const guidance = guidanceByMode[mode][freshness.status];

  if (mode === 'compact') {
    return (
      <div className="rounded-2xl border border-neutral-800 bg-black/30 px-4 py-3 text-sm text-neutral-300">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${style}`}>
            {freshness.label}
          </span>
          <span>Published {freshness.ageText}</span>
          {currentVersion && <span>v{currentVersion}</span>}
        </div>
        <p className="mt-2 text-xs leading-6 text-neutral-500">{guidance}</p>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-neutral-800 bg-neutral-950 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${style}`}>
          {freshness.label}
        </span>
        {currentVersion && (
          <span className="rounded-full border border-neutral-800 bg-black px-3 py-1 text-xs uppercase tracking-[0.18em] text-neutral-400">
            v{currentVersion}
          </span>
        )}
        {typeof revisionCount === 'number' && (
          <span className="rounded-full border border-neutral-800 bg-black px-3 py-1 text-xs uppercase tracking-[0.18em] text-neutral-500">
            {revisionCount} revision{revisionCount === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">Published</div>
          <div className="mt-2 text-sm text-neutral-200">
            {new Date(generatedAt).toLocaleString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">Age</div>
          <div className="mt-2 text-sm text-neutral-200">{freshness.ageText}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">
            Next target
          </div>
          <div className="mt-2 text-sm text-neutral-200">
            {new Date(freshness.nextTargetAt).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm leading-7 text-neutral-300">{guidance}</p>
    </div>
  );
}
