import type { Metadata } from 'next';
import SaveWatchButton from '@/components/SaveWatchButton';
import ShareButton from '@/components/ShareButton';
import AirSparkline from '@/components/dashboard/AirSparkline';
import AnalysisPanel from '@/components/dashboard/AnalysisPanel';
import CommandHeader from '@/components/dashboard/CommandHeader';
import MorningBrief from '@/components/dashboard/MorningBrief';
import SatelliteMapController from '@/components/dashboard/SatelliteMapController';
import DataThroughput from '@/components/dashboard/DataThroughput';
import NewsFeed from '@/components/dashboard/NewsFeed';
import NonismFeed from '@/components/dashboard/NonismFeed';
import PlatformPulsePanel from '@/components/dashboard/PlatformPulse';
import SignalCharts from '@/components/dashboard/SignalCharts';
import SignalLadder from '@/components/dashboard/SignalLadder';
import SignalMatrix from '@/components/dashboard/SignalMatrix';
import SignalTicker from '@/components/dashboard/SignalTicker';
import StatusStrip from '@/components/dashboard/StatusStrip';
import SystemStatus from '@/components/dashboard/SystemStatus';
import TrendsFeed from '@/components/dashboard/TrendsFeed';
import WeatherStrip from '@/components/dashboard/WeatherStrip';
import WorldClocks from '@/components/dashboard/WorldClocks';
import { getCurrentUser } from '@/lib/auth';
import {
  computeWatchStatusSummary,
  getPlatformPulse,
  getRandomNonisms,
  getSignalHistory,
  getWatchBundle,
  listSavedWatchItemsForUser,
  listWatchRevisions,
} from '@/lib/db';
import { getLiveAirQuality, getLiveWeather, getHourlyForecast } from '@/lib/live-signals';
import { getLiveNewsFeed } from '@/lib/news-feeds';
import { getWatchFreshness } from '@/lib/watch';

export const metadata: Metadata = {
  title: 'Thailand Watch | Command',
  description:
    'A Thailand-first civic signal dashboard for air, heat, flood, transit, safety, and service reliability.',
};

const statusOrder: Record<string, number> = {
  high: 0, elevated: 1, active: 2, watch: 3, mixed: 4,
};
const statusColors: Record<string, string> = {
  high: 'text-red-500', elevated: 'text-yellow-500', active: 'text-green-400',
  watch: 'text-green-600', mixed: 'text-green-800',
};
const statusGlow: Record<string, string> = {
  high: 'neon-text-green', elevated: 'text-yellow-400', active: 'text-green-400',
  watch: 'text-green-600', mixed: 'text-green-800',
};
const dotGlow: Record<string, string> = {
  high: 'bg-red-500 shadow-[0_0_4px_rgba(255,50,50,0.5)]',
  elevated: 'bg-yellow-500 shadow-[0_0_4px_rgba(255,200,0,0.4)]',
  active: 'bg-green-400 shadow-[0_0_4px_rgba(0,255,65,0.4)]',
  watch: 'bg-green-600',
  mixed: 'bg-green-800',
};

function resolveScene(scene?: string) {
  return scene === 'ambient' ? 'ambient' : 'briefing';
}

export const dynamic = 'force-dynamic';

export default async function WatchPage({
  searchParams,
}: {
  searchParams: Promise<{ scene?: string }>;
}) {
  const params = await searchParams;
  const scene = resolveScene(params.scene);
  const bundle = getWatchBundle('th');
  const revisions = listWatchRevisions('th');
  const currentRevision = revisions[0] ?? null;
  const user = await getCurrentUser();
  const savedItems = user ? listSavedWatchItemsForUser(user.id) : [];
  const savedSet = new Set(savedItems.map(i => `${i.itemKind}:${i.itemSlug}`));

  const [liveAir, liveWeather, newsItems, hourly] = await Promise.all([
    getLiveAirQuality('bangkok'),
    getLiveWeather('bangkok'),
    getLiveNewsFeed(),
    getHourlyForecast(),
  ]);

  // Platform data
  const pulse = getPlatformPulse();
  const nonisms = getRandomNonisms(8);

  // Signal history for sparkline charts
  const historyRows = getSignalHistory('th', 30);
  const chartData: Record<string, Array<{ value: number; date: string }>> = {};
  for (const row of historyRows) {
    if (!chartData[row.signalSlug]) chartData[row.signalSlug] = [];
    chartData[row.signalSlug].push({ value: row.severity, date: row.recordedAt });
  }

  if (!bundle) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="cmd-panel p-8">
          <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-green-700">Thailand Watch</div>
          <h1 className="mt-2 text-xl font-semibold">Watch state unavailable.</h1>
        </div>
      </main>
    );
  }

  const sortedSignals = [...bundle.signals].sort(
    (a, b) => (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99)
  );
  const ss = computeWatchStatusSummary(bundle.signals);

  return (
    <main className="flex-1 flex flex-col min-h-0">
      <CommandHeader
        worstStatus={ss.worstStatus}
        headline={bundle.brief.headline}
        scene={scene}
        generatedAt={bundle.generatedAt}
      />

      {/* Telemetry bar — crushed */}
      <section className="border-b border-green-900/15 bg-black/60">
        <div className="mx-auto flex max-w-none items-center justify-between gap-3 px-4 py-1.5 sm:px-6">
          <div className="flex items-center gap-3 font-mono">
            <span className={`h-1.5 w-1.5 rounded-full ${liveAir.stale ? 'bg-amber-400 signal-pulse' : 'bg-green-400 shadow-[0_0_6px_rgba(0,240,255,0.5)]'}`} />
            <span className="text-xl font-bold tracking-tight neon-text-green">{liveAir.pm25 != null ? liveAir.pm25.toFixed(1) : '--'}</span>
            <span className="text-[8px] uppercase tracking-[0.2em] text-green-800">PM2.5</span>
            <span className={`text-[8px] font-bold uppercase tracking-[0.15em] ${liveAir.band === 'good' ? 'neon-text-green' : liveAir.band === 'moderate' ? 'text-amber-400' : 'text-red-400'}`}>{liveAir.bandLabel}</span>
            <div className="h-4 w-px bg-green-900/20 hidden sm:block" />
            <div className="hidden sm:block"><WeatherStrip reading={liveWeather} /></div>
          </div>
          <span className="font-mono text-[7px] uppercase tracking-[0.2em] text-green-900">SRC://OPEN-METEO</span>
        </div>
      </section>

      {scene === 'ambient' ? (
        /* ============ WALLBOARD — 74" DENSE CYBERPUNK ============ */
        <section className="flex-1 crt-overlay">
          <div className="mx-auto max-w-none px-4 py-3 sm:px-6">
            {/* Row 1: Posture + Brief + Counts — everything in one line */}
            <div className="grid gap-[1px] bg-green-900/10 lg:grid-cols-[200px_1fr_280px]">
              {/* Posture */}
              <div className="cmd-panel flex flex-col justify-center p-4">
                <div className="font-mono text-[8px] uppercase tracking-[0.3em] text-green-800">Posture</div>
                <div className={`mt-1 text-5xl font-black uppercase leading-none tracking-[-0.04em] xl:text-7xl ${statusGlow[ss.worstStatus] || 'text-green-300'}`}>
                  {ss.worstStatus}
                </div>
                <div className="mt-2 flex gap-[1px]">
                  {Object.entries(ss.counts).sort(([a], [b]) => (statusOrder[a] ?? 99) - (statusOrder[b] ?? 99)).map(([st, ct]) => (
                    <div key={st} className="bg-black/50 px-2 py-1 text-center">
                      <div className={`font-mono text-sm font-bold ${statusColors[st]}`}>{ct}</div>
                      <div className="font-mono text-[6px] uppercase tracking-widest text-green-900">{st}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Brief */}
              <div className="cmd-panel p-4 scan-sweep relative overflow-hidden">
                <div className="font-mono text-[8px] uppercase tracking-[0.3em] text-green-800">Current brief</div>
                <h2 className="mt-2 text-2xl font-semibold leading-[0.92] tracking-tight xl:text-4xl">
                  {bundle.brief.headline}
                </h2>
                <p className="mt-2 text-[11px] leading-5 text-green-300/50 line-clamp-2 xl:text-sm xl:leading-6">
                  {bundle.brief.summary}
                </p>
              </div>

              {/* Watchouts stacked */}
              <div className="cmd-panel p-4">
                <div className="font-mono text-[8px] uppercase tracking-[0.3em] text-green-800">Watch next</div>
                <div className="mt-2 space-y-2">
                  {bundle.brief.watchouts.map((w, i) => (
                    <div key={w} className="flex gap-2">
                      <span className="font-mono text-[10px] font-bold text-green-900/50 shrink-0">{String(i+1).padStart(2,'0')}</span>
                      <p className="text-[10px] leading-4 text-green-300/60">{w}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 2: All 6 signals as dense cards */}
            <div className="mt-[1px] grid gap-[1px] bg-green-900/10 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {sortedSignals.map((signal, i) => {
                const fresh = getWatchFreshness(signal.updatedAt);
                return (
                  <div key={signal.slug} className="cmd-panel p-3 group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${dotGlow[signal.status] || 'bg-neutral-500'}`} />
                        <span className={`font-mono text-[8px] font-black uppercase tracking-[0.12em] ${statusColors[signal.status]}`}>{signal.status}</span>
                      </div>
                      <span className="font-mono text-lg font-bold text-green-900/25">{String(i+1).padStart(2,'0')}</span>
                    </div>
                    <div className="mt-1.5 text-[11px] font-semibold text-green-300 leading-tight">{signal.title}</div>
                    <p className="mt-1 text-[9px] leading-4 text-green-300/40 line-clamp-2">{signal.summary}</p>
                    <div className="mt-2 border-t border-green-900/15 pt-1.5 flex items-center justify-between">
                      <span className="font-mono text-[8px] text-green-700/50">{signal.metricText}</span>
                      <span className="font-mono text-[7px] text-green-900/40">{fresh.ageText}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Row 3: Intelligence grid — 4 columns */}
            <div className="mt-[1px] grid gap-[1px] bg-green-900/10 grid-cols-2 lg:grid-cols-4" style={{ minHeight: '200px' }}>
              <NonismFeed nonisms={nonisms} />
              <PlatformPulsePanel pulse={pulse} />
              <SystemStatus signalCount={sortedSignals.length} newsCount={newsItems.length} airStatus={liveAir.bandLabel} weatherStatus={liveWeather.status} dbRevisions={revisions.length} />
              <WorldClocks />
            </div>

            {/* Row 4: Signal ladder collapsed */}
            <section className="mt-[1px]">
              <SignalLadder signals={sortedSignals} interactive={false} compact defaultOpenCount={0} />
            </section>
          </div>
        </section>
      ) : (
        /* ============ COCKPIT — MAP CENTER · INTELLIGENCE FLANKING ============ */
        <section className="flex-1 flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>

          {/* PRIMARY: Left sidebar + MAP + Right sidebar */}
          <div className="flex flex-1 min-h-0 gap-[2px] px-[3px] pt-[3px]">

            {/* LEFT SIDEBAR — 320px: Brief + Posture + Signals */}
            <div className="w-[320px] shrink-0 flex flex-col gap-[2px] overflow-hidden">
              {/* Brief */}
              <section id="daily-brief" className="cmd-panel p-3 shrink-0">
                <div className="text-[6px] uppercase tracking-[0.25em] text-green-600">{'// '}BRIEF</div>
                <h2 className="mt-1.5 text-[12px] font-semibold leading-[1.15] tracking-tight">{bundle.brief.headline}</h2>
                <p className="mt-1.5 text-[7px] leading-[11px] text-green-500/50">{bundle.brief.summary}</p>
              </section>

              {/* Posture */}
              <div className="cmd-panel p-3 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="text-[6px] uppercase tracking-[0.25em] text-green-700">{'// '}POSTURE</div>
                  <div className="flex gap-1">
                    <SaveWatchButton geography="th" itemKind="brief" itemSlug="daily-brief" defaultSaved={savedSet.has('brief:daily-brief')} />
                    <ShareButton payload={{ kind: 'daily_brief', title: bundle.brief.headline, summary: bundle.brief.summary, geography: 'th', watchouts: bundle.brief.watchouts }} />
                  </div>
                </div>
                <div className={`text-4xl font-black uppercase leading-none mt-2 ${statusGlow[ss.worstStatus] || 'text-green-300'}`}>{ss.worstStatus}</div>
                <div className="flex gap-[2px] mt-2">
                  {Object.entries(ss.counts).sort(([a], [b]) => (statusOrder[a] ?? 99) - (statusOrder[b] ?? 99)).map(([st, ct]) => (
                    <div key={st} className="bg-black/40 px-2 py-1 text-center flex-1">
                      <div className={`text-[11px] font-bold ${statusColors[st]}`}>{ct}</div>
                      <div className="text-[4px] uppercase tracking-widest text-green-900">{st}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6 Signals stacked */}
              <div className="flex-1 overflow-y-auto thin-scroll flex flex-col gap-[2px] min-h-0">
                {sortedSignals.map((signal, i) => (
                  <div key={signal.slug} id={signal.slug} className="cmd-panel p-2.5 shrink-0 scroll-mt-12">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${dotGlow[signal.status]}`} />
                        <span className={`text-[6px] font-black uppercase ${statusColors[signal.status]}`}>{signal.status}</span>
                        <span className="text-[8px] font-bold text-green-300">{signal.title}</span>
                      </div>
                      <span className="text-[8px] font-bold text-green-900/15">{String(i+1).padStart(2,'0')}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[6px] text-green-700 flex-1">{signal.metricText}</span>
                      <span className="text-[5px] text-green-900">{getWatchFreshness(signal.updatedAt).ageText}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CENTER — MAP DOMINANT */}
            <div className="flex-1 flex flex-col gap-[2px] min-w-0">
              {/* Satellite map with layer controls — takes most of the space */}
              <div className="flex-1 relative overflow-hidden min-h-0">
                <SatelliteMapController satellite signalStatuses={Object.fromEntries(sortedSignals.map(s => [s.slug, s.status]))} />
              </div>

              {/* Analytics strip below map — charts + matrix */}
              <div className="grid grid-cols-[1fr_200px] gap-[2px] shrink-0" style={{ height: '180px' }}>
                <SignalCharts history={chartData} signalOrder={sortedSignals.map(s => s.slug)} />
                <SignalMatrix signals={sortedSignals} />
              </div>
            </div>

            {/* RIGHT SIDEBAR — 360px: Brief + Analysis + News + Clocks + Trends + Env */}
            <div className="w-[360px] shrink-0 flex flex-col gap-[2px] overflow-hidden">
              {/* Morning brief — 35% */}
              <div style={{ flex: '3.5 1 0%' }} className="min-h-0">
                <MorningBrief />
              </div>

              {/* Analysis terminal — 25% */}
              <div style={{ flex: '2.5 1 0%' }} className="min-h-0">
                <AnalysisPanel />
              </div>

              {/* News feed — 25% */}
              <div style={{ flex: '2.5 1 0%' }} className="min-h-0">
                <NewsFeed items={newsItems} />
              </div>

              {/* WorldClocks + AirSparkline row */}
              <div className="grid grid-cols-2 gap-[2px] shrink-0" style={{ height: '100px' }}>
                <WorldClocks />
                <AirSparkline hourly={hourly} />
              </div>

              {/* TrendsFeed + DataThroughput row */}
              <div className="grid grid-cols-2 gap-[2px] shrink-0" style={{ height: '90px' }}>
                <TrendsFeed />
                <DataThroughput />
              </div>

              {/* Env metrics row */}
              <div className="grid grid-cols-3 gap-[2px] shrink-0" style={{ height: '50px' }}>
                <div className="cmd-panel p-1.5 flex flex-col justify-center overflow-hidden">
                  <div className="text-[5px] uppercase text-green-900">PM2.5</div>
                  <div className="text-[12px] font-bold text-green-400 leading-none">{liveAir.pm25?.toFixed(1) ?? '--'}</div>
                  <div className={`text-[5px] mt-0.5 ${liveAir.band === 'good' ? 'text-green-400' : 'text-yellow-400'}`}>{liveAir.bandLabel}</div>
                </div>
                <div className="cmd-panel p-1.5 flex flex-col justify-center overflow-hidden">
                  <div className="text-[5px] uppercase text-green-900">TEMP</div>
                  <div className="text-[12px] font-bold text-green-400 leading-none">{liveWeather.tempC?.toFixed(0)}°</div>
                  <div className="text-[5px] text-green-700 mt-0.5">FL {liveWeather.feelsLikeC?.toFixed(0)}°</div>
                </div>
                <div className="cmd-panel p-1.5 flex flex-col justify-center overflow-hidden">
                  <div className="text-[5px] uppercase text-green-900">SIGNALS</div>
                  <div className="text-[12px] font-bold neon-text-green leading-none">{sortedSignals.length}</div>
                  <div className="text-[5px] text-green-700 mt-0.5">v{currentRevision?.version ?? 0}</div>
                </div>
              </div>
            </div>

          </div>

          {/* BOTTOM: Ticker + Status */}
          <div className="shrink-0 px-[3px] pb-[3px] mt-[2px]">
            <SignalTicker signals={sortedSignals} />
            <StatusStrip signals={sortedSignals} generatedAt={bundle.generatedAt} version={currentRevision?.version ?? null} />
          </div>
        </section>
      )}
    </main>
  );
}
