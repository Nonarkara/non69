'use client';

import { useEffect, useState } from 'react';

const ZONES = [
  { label: 'BKK', tz: 'Asia/Bangkok', flag: 'TH' },
  { label: 'NYC', tz: 'America/New_York', flag: 'US' },
  { label: 'LON', tz: 'Europe/London', flag: 'UK' },
  { label: 'TYO', tz: 'Asia/Tokyo', flag: 'JP' },
  { label: 'SHA', tz: 'Asia/Shanghai', flag: 'CN' },
  { label: 'SYD', tz: 'Australia/Sydney', flag: 'AU' },
];

export default function WorldClocks() {
  const [times, setTimes] = useState<Record<string, string>>({});

  useEffect(() => {
    function tick() {
      const now = new Date();
      const result: Record<string, string> = {};
      for (const zone of ZONES) {
        result[zone.label] = now.toLocaleString('en-US', {
          timeZone: zone.tz,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
      }
      setTimes(result);
    }
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="cmd-panel p-3 flex flex-col">
      <div className="text-[7px] uppercase tracking-[0.3em] text-green-700 shrink-0">
        {'// '}WORLD_CLOCK
      </div>
      <div className="mt-2 grid grid-cols-3 gap-[1px] bg-green-900/10 flex-1">
        {ZONES.map(zone => (
          <div key={zone.label} className="bg-black/50 px-2 py-2 flex flex-col items-center justify-center">
            <div className="text-[6px] uppercase tracking-widest text-green-900">{zone.flag}</div>
            <div className="font-mono text-sm font-bold tabular-nums text-green-400 neon-text-green">
              {times[zone.label] || '--:--'}
            </div>
            <div className="text-[6px] uppercase tracking-widest text-green-800">{zone.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
