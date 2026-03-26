'use client';

import { useEffect, useState } from 'react';

interface TrendItem {
  query: string;
  rank: number;
}

// Google Trends daily trending via RSS proxy — we'll scrape the embed
const TREND_QUERIES = [
  'Bangkok', 'Thailand', 'PM2.5', 'flood Bangkok',
  'heat wave Thailand', 'BTS Bangkok', 'smart city',
  'AI Thailand', 'depa Thailand', 'climate Bangkok',
  'traffic Bangkok', 'air quality index', 'typhoon',
  'monsoon Thailand', 'real estate Bangkok', 'crypto THB',
];

export default function TrendsFeed() {
  const [trends, setTrends] = useState<TrendItem[]>([]);

  useEffect(() => {
    // Simulated trending topics with rotation for visual density
    // In production, replace with Google Trends API or SerpAPI
    const shuffled = [...TREND_QUERIES].sort(() => Math.random() - 0.5);
    setTrends(shuffled.map((q, i) => ({ query: q, rank: i + 1 })));

    const interval = setInterval(() => {
      const reshuffled = [...TREND_QUERIES].sort(() => Math.random() - 0.5);
      setTrends(reshuffled.map((q, i) => ({ query: q, rank: i + 1 })));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="cmd-panel p-2 flex flex-col overflow-hidden">
      <div className="text-[6px] uppercase tracking-[0.3em] text-green-700 shrink-0">
        {'// '}TREND_RADAR · TH+BKK
      </div>
      <div className="mt-1 flex-1 overflow-y-auto thin-scroll">
        {trends.map((t) => (
          <div key={t.query} className="flex items-center gap-1.5 py-0.5 hover:bg-green-900/10">
            <span className="text-[6px] tabular-nums text-green-900 w-[14px] shrink-0 text-right">
              {String(t.rank).padStart(2, '0')}
            </span>
            <div className="flex-1 h-[3px] bg-green-900/20 overflow-hidden">
              <div
                className="h-full bg-green-500/30"
                style={{ width: `${Math.max(10, 100 - t.rank * 6)}%` }}
              />
            </div>
            <span className="text-[7px] text-green-500/70 truncate max-w-[80px]">{t.query}</span>
          </div>
        ))}
      </div>
      <div className="mt-1 text-[5px] text-green-900 shrink-0">
        SRC://TREND_RADAR · 30s CYCLE
      </div>
    </div>
  );
}
