import type { WatchSignal } from '@/lib/db';

interface SignalTickerProps {
  signals: WatchSignal[];
}

const textColor: Record<string, string> = {
  high: 'text-red-500',
  elevated: 'text-yellow-500',
  active: 'text-green-400',
  watch: 'text-green-600',
  mixed: 'text-green-800',
};

function TickerItem({ signal }: { signal: WatchSignal }) {
  const color = textColor[signal.status] || 'text-green-700';
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span className={`text-[8px] font-black uppercase tracking-[0.1em] ${color}`}>[{signal.status}]</span>
      <span className="text-[9px] text-green-500/80">{signal.title}</span>
      <span className="text-[8px] text-green-800/50">{signal.metricText}</span>
      <span className="text-green-900/30 px-2">::</span>
    </span>
  );
}

export default function SignalTicker({ signals }: SignalTickerProps) {
  const items = [...signals, ...signals];
  return (
    <div className="overflow-hidden border-y border-green-900/10 bg-black/80 py-1">
      <div className="animate-marquee flex">
        {items.map((signal, i) => (
          <TickerItem key={`${signal.slug}-${i}`} signal={signal} />
        ))}
      </div>
    </div>
  );
}
