import type { WatchSignal } from '@/lib/db';

interface SignalMatrixProps {
  signals: WatchSignal[];
}

const STATUS_NUM: Record<string, number> = {
  high: 4, elevated: 3, active: 2, watch: 1, mixed: 0,
};

const INTENSITY: Record<number, string> = {
  0: 'bg-green-900/10',
  1: 'bg-green-800/20',
  2: 'bg-green-700/20',
  3: 'bg-green-600/25',
  4: 'bg-green-500/25',
  5: 'bg-green-400/20',
  6: 'bg-yellow-500/15',
  7: 'bg-yellow-400/20',
  8: 'bg-red-500/15',
};

export default function SignalMatrix({ signals }: SignalMatrixProps) {
  return (
    <div className="cmd-panel p-2 flex flex-col overflow-hidden">
      <div className="text-[6px] uppercase tracking-[0.3em] text-green-700 shrink-0">
        {'// '}SIGNAL_CORRELATION
      </div>
      <div className="mt-1 flex-1">
        {/* Header row */}
        <div className="flex">
          <div className="w-[50px] shrink-0" />
          {signals.map(s => (
            <div key={`h-${s.slug}`} className="flex-1 text-center">
              <span className="text-[4px] uppercase tracking-widest text-green-900 writing-mode-vertical" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                {s.title.substring(0, 6)}
              </span>
            </div>
          ))}
        </div>
        {/* Matrix rows */}
        {signals.map((row) => (
          <div key={`r-${row.slug}`} className="flex items-center">
            <div className="w-[50px] shrink-0 text-[5px] uppercase tracking-wider text-green-800 truncate pr-1">
              {row.title.substring(0, 8)}
            </div>
            {signals.map((col) => {
              const combined = (STATUS_NUM[row.status] ?? 0) + (STATUS_NUM[col.status] ?? 0);
              const bg = INTENSITY[combined] || 'bg-green-900/5';
              return (
                <div
                  key={`${row.slug}-${col.slug}`}
                  className={`flex-1 aspect-square ${bg} border border-green-900/5 flex items-center justify-center`}
                >
                  {row.slug === col.slug ? (
                    <span className="text-[5px] text-green-600 font-bold">{STATUS_NUM[row.status]}</span>
                  ) : (
                    <span className="text-[4px] text-green-800/50">{combined}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-1 text-[5px] text-green-900 shrink-0">HEAT=COMBINED_SEVERITY</div>
    </div>
  );
}
