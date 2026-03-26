'use client';

import { useEffect, useState } from 'react';

interface DataPoint {
  label: string;
  value: number;
}

const FEEDS = [
  'AIR_QUALITY', 'WEATHER', 'NEWS_RSS', 'HOURLY_FC',
  'WATCH_PUB', 'ANALYTICS', 'CHAT_API', 'MEETING',
];

export default function DataThroughput() {
  const [points, setPoints] = useState<DataPoint[]>([]);

  useEffect(() => {
    function generate() {
      setPoints(FEEDS.map(f => ({
        label: f,
        value: Math.floor(Math.random() * 100),
      })));
    }
    generate();
    const id = setInterval(generate, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="cmd-panel p-2 flex flex-col overflow-hidden">
      <div className="text-[6px] uppercase tracking-[0.3em] text-green-700 shrink-0">
        {'// '}DATA_THROUGHPUT
      </div>
      <div className="mt-1 flex-1 space-y-0.5">
        {points.map(p => (
          <div key={p.label} className="flex items-center gap-1">
            <span className="text-[5px] uppercase text-green-800 w-[48px] shrink-0 truncate">{p.label}</span>
            <div className="flex-1 h-[4px] bg-green-900/20 overflow-hidden">
              <div
                className="h-full transition-all duration-1000"
                style={{
                  width: `${p.value}%`,
                  background: p.value > 80
                    ? 'rgba(0,255,65,0.5)'
                    : p.value > 40
                      ? 'rgba(0,255,65,0.3)'
                      : 'rgba(0,255,65,0.15)',
                }}
              />
            </div>
            <span className="text-[5px] tabular-nums text-green-700 w-[18px] text-right">{p.value}%</span>
          </div>
        ))}
      </div>
      <div className="mt-1 text-[5px] text-green-900 shrink-0">LIVE · 5s REFRESH</div>
    </div>
  );
}
