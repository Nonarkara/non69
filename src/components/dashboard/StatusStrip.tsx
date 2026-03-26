import type { WatchSignal } from '@/lib/db';
import { getWatchFreshness } from '@/lib/watch';

interface StatusStripProps {
  signals: WatchSignal[];
  generatedAt: string;
  version: number | null;
}

const dotColor: Record<string, string> = {
  high: 'bg-red-500 shadow-[0_0_4px_rgba(255,50,50,0.5)]',
  elevated: 'bg-yellow-500 shadow-[0_0_4px_rgba(255,200,0,0.4)]',
  active: 'bg-green-400 shadow-[0_0_4px_rgba(0,255,65,0.4)]',
  watch: 'bg-green-600',
  mixed: 'bg-green-800',
};

const textColor: Record<string, string> = {
  high: 'text-red-500',
  elevated: 'text-yellow-500',
  active: 'text-green-400',
  watch: 'text-green-600',
  mixed: 'text-green-800',
};

export default function StatusStrip({ signals, generatedAt, version }: StatusStripProps) {
  const freshness = getWatchFreshness(generatedAt);

  return (
    <div className="border-t border-green-900/15 bg-black/95">
      <div className="mx-auto flex max-w-none items-center gap-0 overflow-x-auto thin-scroll">
        {signals.map(signal => (
          <a
            key={signal.slug}
            href={`#${signal.slug}`}
            className="flex shrink-0 items-center gap-1.5 border-r border-green-900/10 px-3 py-2 transition-colors hover:bg-green-900/5"
          >
            <span className={`h-1 w-1 rounded-full ${dotColor[signal.status] || 'bg-green-800'} ${signal.status === 'high' ? 'signal-pulse' : ''}`} />
            <span className="text-[7px] font-bold uppercase tracking-[0.15em] text-green-800">{signal.title}</span>
            <span className={`text-[7px] font-bold uppercase tracking-[0.1em] ${textColor[signal.status] || 'text-green-800'}`}>{signal.status}</span>
          </a>
        ))}
        <div className="flex-1" />
        <div className="flex shrink-0 items-center gap-2 border-l border-green-900/10 px-3 py-2">
          <span className={`text-[7px] font-bold uppercase tracking-[0.15em] ${
            freshness.status === 'current' ? 'text-green-400' : freshness.status === 'aging' ? 'text-yellow-500' : 'text-red-500'
          }`}>{freshness.label}</span>
          <span className="text-[7px] tracking-wider text-green-900">{freshness.ageText}</span>
          {version && <span className="text-[7px] text-green-900">v{version}</span>}
        </div>
      </div>
    </div>
  );
}
