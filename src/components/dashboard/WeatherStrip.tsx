import type { LiveWeatherReading } from '@/lib/live-signals';

interface WeatherStripProps {
  reading: LiveWeatherReading;
}

export default function WeatherStrip({ reading }: WeatherStripProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-lg font-bold tracking-tight text-green-400">
        {reading.tempC != null ? `${reading.tempC.toFixed(0)}°` : '--'}
      </span>
      <span className="text-[6px] uppercase tracking-[0.2em] text-green-900">TMP</span>
      <span className="text-green-900/30">|</span>
      <span className="text-sm font-bold tracking-tight text-green-600">
        {reading.feelsLikeC != null ? `${reading.feelsLikeC.toFixed(0)}°` : '--'}
      </span>
      <span className="text-[6px] uppercase tracking-[0.2em] text-green-900">FL</span>
      <span className="text-green-900/30">|</span>
      <span className="text-sm font-bold tracking-tight text-green-600">
        {reading.humidity != null ? `${reading.humidity}%` : '--'}
      </span>
      <span className="text-[6px] uppercase tracking-[0.2em] text-green-900">RH</span>
      {reading.stale && <span className="text-[7px] text-red-500 signal-pulse">[STALE]</span>}
    </div>
  );
}
