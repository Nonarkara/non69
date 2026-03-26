'use client';

import { ResponsiveContainer, AreaChart, Area, YAxis } from 'recharts';
import type { HourlyForecast } from '@/lib/live-signals';

interface AirSparklineProps {
  hourly: HourlyForecast;
}

export default function AirSparkline({ hourly }: AirSparklineProps) {
  const data = hourly.hours.map(h => ({
    temp: h.tempC,
    hum: h.humidity,
    label: h.time.split('T')[1]?.substring(0, 5) || '',
  }));

  return (
    <div className="cmd-panel p-2 flex flex-col overflow-hidden">
      <div className="text-[6px] uppercase tracking-[0.3em] text-green-700 shrink-0">
        {'// '}24H_TEMP_CURVE
      </div>
      <div className="mt-1 flex-1 min-h-0">
        {data.length > 2 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
              <YAxis hide domain={['auto', 'auto']} />
              <Area type="monotone" dataKey="temp" stroke="#00ff41" fill="rgba(0,255,65,0.08)" strokeWidth={1} dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-[7px] text-green-900">// AWAITING_DATA</div>
        )}
      </div>
      <div className="flex justify-between text-[5px] text-green-900 shrink-0">
        <span>{data[0]?.label || '00:00'}</span>
        <span>TEMP °C</span>
        <span>{data[data.length - 1]?.label || '23:00'}</span>
      </div>
    </div>
  );
}
