'use client';

import { ResponsiveContainer, LineChart, Line, YAxis } from 'recharts';

interface ChartData {
  [signalSlug: string]: Array<{ value: number; date: string }>;
}

interface SignalChartsProps {
  history: ChartData;
  signalOrder: string[];
}

const STATUS_LABELS: Record<number, string> = {
  0: 'MIXED',
  1: 'WATCH',
  2: 'ACTIVE',
  3: 'ELEV',
  4: 'HIGH',
};

export default function SignalCharts({ history, signalOrder }: SignalChartsProps) {
  return (
    <div className="cmd-panel p-3 flex flex-col overflow-hidden">
      <div className="text-[7px] uppercase tracking-[0.3em] text-green-700 shrink-0">
        {'// '}SIGNAL_HISTORY [30d]
      </div>

      <div className="mt-2 flex-1 flex flex-col gap-1 overflow-y-auto thin-scroll">
        {signalOrder.map(slug => {
          const data = history[slug] || [];
          const currentValue = data.length > 0 ? data[data.length - 1].value : null;

          return (
            <div key={slug} className="flex items-center gap-2 shrink-0" style={{ height: '52px' }}>
              {/* Label */}
              <div className="w-[80px] shrink-0">
                <div className="text-[7px] uppercase tracking-wider text-green-800 truncate">
                  {slug.replace(/-/g, ' ')}
                </div>
                {currentValue != null && (
                  <div className="text-[6px] text-green-600 mt-0.5">
                    {STATUS_LABELS[currentValue] || currentValue}
                  </div>
                )}
              </div>

              {/* Sparkline */}
              <div className="flex-1 h-full">
                {data.length >= 2 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                      <YAxis domain={[0, 4]} hide />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#00ff41"
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center">
                    <span className="text-[7px] text-green-900">// AWAITING_DATA</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 text-[6px] text-green-900 shrink-0">
        Y: 0=MIXED 1=WATCH 2=ACTIVE 3=ELEVATED 4=HIGH
      </div>
    </div>
  );
}
