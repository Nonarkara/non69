interface SystemStatusProps {
  signalCount: number;
  newsCount: number;
  airStatus: string;
  weatherStatus: string;
  dbRevisions: number;
}

const SYSTEMS = [
  'CLAUDE_API',
  'OPENAI_API',
  'OPEN_METEO',
  'RSS_FEEDS',
  'SQLITE_DB',
  'AUTH_LAYER',
  'WATCH_PUB',
  'ANALYTICS',
];

export default function SystemStatus({ signalCount, newsCount, airStatus, weatherStatus, dbRevisions }: SystemStatusProps) {
  return (
    <div className="cmd-panel p-3 flex flex-col overflow-hidden">
      <div className="text-[7px] uppercase tracking-[0.3em] text-green-700 shrink-0">
        {'// '}SYSTEM_STATUS
      </div>

      <div className="mt-2 space-y-0.5 flex-1">
        {SYSTEMS.map(sys => (
          <div key={sys} className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-green-400 shadow-[0_0_3px_rgba(0,255,65,0.4)]" />
            <span className="text-[7px] uppercase tracking-wider text-green-600 flex-1">{sys}</span>
            <span className="text-[6px] text-green-800">OK</span>
          </div>
        ))}
      </div>

      <div className="mt-2 border-t border-green-900/15 pt-1.5 grid grid-cols-2 gap-[1px] bg-green-900/10 shrink-0">
        <div className="bg-black/50 px-1.5 py-1">
          <div className="font-mono text-[10px] font-bold text-green-400">{signalCount}</div>
          <div className="text-[5px] uppercase tracking-widest text-green-900">SIGNALS</div>
        </div>
        <div className="bg-black/50 px-1.5 py-1">
          <div className="font-mono text-[10px] font-bold text-green-400">{newsCount}</div>
          <div className="text-[5px] uppercase tracking-widest text-green-900">NEWS</div>
        </div>
        <div className="bg-black/50 px-1.5 py-1">
          <div className="font-mono text-[10px] font-bold text-green-400">{airStatus}</div>
          <div className="text-[5px] uppercase tracking-widest text-green-900">AIR</div>
        </div>
        <div className="bg-black/50 px-1.5 py-1">
          <div className="font-mono text-[10px] font-bold text-green-400">v{dbRevisions}</div>
          <div className="text-[5px] uppercase tracking-widest text-green-900">REV</div>
        </div>
      </div>
    </div>
  );
}
