import { getWatchFreshness } from '@/lib/watch';
import type { LiveAirQualityReading } from '@/lib/live-signals';

interface LiveAirStripProps {
  reading: LiveAirQualityReading;
  compact?: boolean;
}

const bandColors: Record<LiveAirQualityReading['band'], string> = {
  good: 'text-emerald-300',
  moderate: 'text-amber-200',
  sensitive: 'text-amber-300',
  unhealthy: 'text-red-300',
  very_unhealthy: 'text-red-200',
  hazardous: 'text-fuchsia-300',
  unknown: 'text-neutral-300',
};

export default function LiveAirStrip({ reading, compact = false }: LiveAirStripProps) {
  const freshness = getWatchFreshness(reading.fetchedAt);
  const tone = bandColors[reading.band] || bandColors.unknown;
  const staleText = reading.stale ? 'Stale cache' : 'Live model';

  return (
    <section className={`${compact ? 'border-y border-neutral-900/90 py-3' : 'border border-neutral-900/90 bg-black/35 px-4 py-4'}`}>
      <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr_auto] lg:items-end">
        <div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                reading.stale ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
              }`}
            />
            <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">
              Bangkok live air
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-1">
            <div className="text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
              {reading.pm25 == null ? 'N/A' : reading.pm25.toFixed(1)}
            </div>
            <div className="pb-1 text-sm uppercase tracking-[0.18em] text-neutral-500">PM2.5 µg/m3</div>
            <div className={`pb-1 text-sm uppercase tracking-[0.18em] ${tone}`}>{reading.bandLabel}</div>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-300">{reading.guidance}</p>
        </div>

        <div className="grid gap-2 text-sm text-neutral-400 sm:grid-cols-2 lg:grid-cols-1">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">Observed</div>
            <div className="mt-1">
              {reading.observedAt
                ? new Date(reading.observedAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : 'Unavailable'}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">Fetch state</div>
            <div className="mt-1">
              {staleText} · {freshness.ageText}
            </div>
          </div>
        </div>

        <div className="text-right text-[11px] uppercase tracking-[0.22em] text-neutral-600">
          <div>{reading.sourceLabel}</div>
          <a href={reading.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-neutral-400 hover:text-white">
            Source
          </a>
        </div>
      </div>
    </section>
  );
}
