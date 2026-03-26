import { getDb } from '@/lib/db';

export type LiveSignalCacheStatus = 'fresh' | 'stale' | 'failed';

export interface CachedSignalRecord<T> {
  slug: string;
  area: string;
  payload: T;
  sourceLabel: string;
  sourceUpdatedAt: string | null;
  fetchedAt: string;
  status: LiveSignalCacheStatus;
}

export interface LiveAirQualityReading {
  slug: 'air-quality';
  area: 'bangkok';
  areaLabel: string;
  sourceLabel: string;
  sourceUrl: string;
  pm25: number | null;
  usAqi: number | null;
  band: 'good' | 'moderate' | 'sensitive' | 'unhealthy' | 'very_unhealthy' | 'hazardous' | 'unknown';
  bandLabel: string;
  observedAt: string | null;
  fetchedAt: string;
  stale: boolean;
  status: LiveSignalCacheStatus;
  guidance: string;
  note: string;
}

/* ---------- Weather types ---------- */

export interface LiveWeatherReading {
  slug: 'weather';
  area: string;
  areaLabel: string;
  sourceLabel: string;
  tempC: number | null;
  feelsLikeC: number | null;
  humidity: number | null;
  fetchedAt: string;
  stale: boolean;
  status: LiveSignalCacheStatus;
}

const WEATHER_CACHE_TTL_MS = 15 * 60 * 1000;
const OPEN_METEO_WEATHER_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=13.7563&longitude=100.5018&current=temperature_2m,relative_humidity_2m,apparent_temperature&timezone=Asia%2FBangkok';

async function fetchBangkokWeatherFromSource(): Promise<LiveWeatherReading> {
  const response = await fetch(OPEN_METEO_WEATHER_URL, {
    next: { revalidate: 0 },
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) throw new Error(`Open-Meteo weather returned ${response.status}`);

  const payload = (await response.json()) as {
    current?: {
      temperature_2m?: number;
      relative_humidity_2m?: number;
      apparent_temperature?: number;
    };
  };

  const c = payload.current;
  return {
    slug: 'weather',
    area: 'bangkok',
    areaLabel: 'Bangkok',
    sourceLabel: 'Open-Meteo Forecast',
    tempC: c?.temperature_2m ?? null,
    feelsLikeC: c?.apparent_temperature ?? null,
    humidity: c?.relative_humidity_2m ?? null,
    fetchedAt: new Date().toISOString(),
    stale: false,
    status: 'fresh',
  };
}

export async function getLiveWeather(area: string = 'bangkok'): Promise<LiveWeatherReading> {
  if (area !== 'bangkok') throw new Error('Only bangkok is available in this MVP.');

  const cached = getCacheRow<LiveWeatherReading>('weather', area);
  if (cached && isCacheFresh(cached.fetchedAt, WEATHER_CACHE_TTL_MS)) {
    return { ...cached.payload, status: cached.status, stale: false, fetchedAt: cached.fetchedAt };
  }

  try {
    const fresh = await fetchBangkokWeatherFromSource();
    upsertCachedSignalRecord<LiveWeatherReading>({
      slug: 'weather',
      area,
      payload: fresh,
      sourceLabel: fresh.sourceLabel,
      sourceUpdatedAt: fresh.fetchedAt,
      fetchedAt: fresh.fetchedAt,
      status: 'fresh',
    });
    return fresh;
  } catch {
    if (cached) {
      return { ...cached.payload, status: 'stale', stale: true, fetchedAt: cached.fetchedAt };
    }
    return {
      slug: 'weather',
      area: 'bangkok',
      areaLabel: 'Bangkok',
      sourceLabel: 'Open-Meteo Forecast',
      tempC: null,
      feelsLikeC: null,
      humidity: null,
      fetchedAt: new Date().toISOString(),
      stale: true,
      status: 'failed',
    };
  }
}

/* ---------- Hourly forecast for sparkline ---------- */

export interface HourlyForecast {
  hours: Array<{ time: string; tempC: number; humidity: number }>;
  fetchedAt: string;
  status: LiveSignalCacheStatus;
}

const HOURLY_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=13.7563&longitude=100.5018&hourly=temperature_2m,relative_humidity_2m&timezone=Asia%2FBangkok&forecast_days=1';

export async function getHourlyForecast(): Promise<HourlyForecast> {
  const cached = getCacheRow<HourlyForecast>('hourly-forecast', 'bangkok');
  if (cached && isCacheFresh(cached.fetchedAt, 30 * 60 * 1000)) {
    return { ...cached.payload, status: cached.status, fetchedAt: cached.fetchedAt };
  }

  try {
    const res = await fetch(HOURLY_URL, { next: { revalidate: 0 }, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json() as {
      hourly?: { time?: string[]; temperature_2m?: number[]; relative_humidity_2m?: number[] };
    };

    const times = data.hourly?.time ?? [];
    const temps = data.hourly?.temperature_2m ?? [];
    const hums = data.hourly?.relative_humidity_2m ?? [];
    const hours = times.map((t: string, i: number) => ({
      time: t,
      tempC: temps[i] ?? 0,
      humidity: hums[i] ?? 0,
    }));

    const result: HourlyForecast = { hours, fetchedAt: new Date().toISOString(), status: 'fresh' };
    upsertCachedSignalRecord<HourlyForecast>({
      slug: 'hourly-forecast', area: 'bangkok', payload: result,
      sourceLabel: 'Open-Meteo', sourceUpdatedAt: result.fetchedAt,
      fetchedAt: result.fetchedAt, status: 'fresh',
    });
    return result;
  } catch {
    if (cached) return { ...cached.payload, status: 'stale', fetchedAt: cached.fetchedAt };
    return { hours: [], fetchedAt: new Date().toISOString(), status: 'failed' };
  }
}

const AIR_CACHE_TTL_MS = 15 * 60 * 1000;
const OPEN_METEO_SOURCE_URL = 'https://open-meteo.com/en/docs/air-quality-api';
const OPEN_METEO_API_URL =
  'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=13.7563&longitude=100.5018&current=pm2_5,us_aqi&timezone=Asia%2FBangkok';

function getCacheRow<T>(slug: string, area: string): CachedSignalRecord<T> | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT slug, area, payload, source_label, source_updated_at, fetched_at, status
       FROM live_signal_cache
       WHERE slug = ? AND area = ?`
    )
    .get(slug, area) as
    | {
        slug: string;
        area: string;
        payload: string;
        source_label: string;
        source_updated_at: string | null;
        fetched_at: string;
        status: LiveSignalCacheStatus;
      }
    | undefined;

  if (!row) {
    return null;
  }

  return {
    slug: row.slug,
    area: row.area,
    payload: JSON.parse(row.payload) as T,
    sourceLabel: row.source_label,
    sourceUpdatedAt: row.source_updated_at,
    fetchedAt: row.fetched_at,
    status: row.status,
  };
}

export function getCachedSignalRecord<T>(slug: string, area: string): CachedSignalRecord<T> | null {
  return getCacheRow<T>(slug, area);
}

export function isCacheFresh(fetchedAt: string, ttlMs: number, now = Date.now()) {
  return now - new Date(fetchedAt).getTime() <= ttlMs;
}

export function upsertCachedSignalRecord<T>(input: CachedSignalRecord<T>) {
  const db = getDb();
  db.prepare(
    `INSERT INTO live_signal_cache
      (slug, area, payload, source_label, source_updated_at, fetched_at, status, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(slug, area)
     DO UPDATE SET
       payload = excluded.payload,
       source_label = excluded.source_label,
       source_updated_at = excluded.source_updated_at,
       fetched_at = excluded.fetched_at,
       status = excluded.status,
       updated_at = excluded.updated_at`
  ).run(
    input.slug,
    input.area,
    JSON.stringify(input.payload),
    input.sourceLabel,
    input.sourceUpdatedAt,
    input.fetchedAt,
    input.status,
    input.fetchedAt
  );
}

function getBandFromUsAqi(
  usAqi: number | null
): Pick<LiveAirQualityReading, 'band' | 'bandLabel' | 'guidance' | 'note'> {
  if (usAqi == null || Number.isNaN(usAqi)) {
    return {
      band: 'unknown',
      bandLabel: 'Unknown',
      guidance: 'Live PM2.5 data is incomplete. Use the curated Thailand Watch brief until the feed stabilizes.',
      note: 'Upstream model returned incomplete air-quality fields.',
    };
  }

  if (usAqi <= 50) {
    return {
      band: 'good',
      bandLabel: 'Good',
      guidance: 'Normal outdoor movement is fine. Keep the reading in peripheral view and move on.',
      note: 'Modeled air conditions remain low-friction right now.',
    };
  }

  if (usAqi <= 100) {
    return {
      band: 'moderate',
      bandLabel: 'Moderate',
      guidance: 'Most people are fine, but sensitive groups should keep longer outdoor exposure honest.',
      note: 'Not catastrophic. Not free either.',
    };
  }

  if (usAqi <= 150) {
    return {
      band: 'sensitive',
      bandLabel: 'Sensitive Groups',
      guidance: 'Treat outdoor exercise and long street exposure as a decision, not background noise.',
      note: 'Sensitive groups are already paying the tax here.',
    };
  }

  if (usAqi <= 200) {
    return {
      band: 'unhealthy',
      bandLabel: 'Unhealthy',
      guidance: 'Pull exercise indoors, carry a mask, and avoid pretending productivity is immune to particulate matter.',
      note: 'This is a real operational drag, not a cosmetic weather story.',
    };
  }

  if (usAqi <= 300) {
    return {
      band: 'very_unhealthy',
      bandLabel: 'Very Unhealthy',
      guidance: 'Minimize outdoor time, protect vulnerable people, and treat movement planning as risk management.',
      note: 'The air is actively rude now.',
    };
  }

  return {
    band: 'hazardous',
    bandLabel: 'Hazardous',
    guidance: 'Avoid outdoor exposure unless absolutely necessary and escalate mitigation immediately.',
    note: 'This is genuine hazard territory.',
  };
}

function buildAirReading(input: {
  pm25: number | null;
  usAqi: number | null;
  observedAt: string | null;
  fetchedAt: string;
  status: LiveSignalCacheStatus;
  stale: boolean;
  note?: string;
}): LiveAirQualityReading {
  const band = getBandFromUsAqi(input.usAqi);

  return {
    slug: 'air-quality',
    area: 'bangkok',
    areaLabel: 'Bangkok',
    sourceLabel: 'Open-Meteo Air Quality',
    sourceUrl: OPEN_METEO_SOURCE_URL,
    pm25: input.pm25,
    usAqi: input.usAqi,
    band: band.band,
    bandLabel: band.bandLabel,
    observedAt: input.observedAt,
    fetchedAt: input.fetchedAt,
    stale: input.stale,
    status: input.status,
    guidance: band.guidance,
    note: input.note ?? band.note,
  };
}

async function fetchBangkokAirQualityFromSource(): Promise<LiveAirQualityReading> {
  const response = await fetch(OPEN_METEO_API_URL, {
    next: { revalidate: 0 },
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Open-Meteo returned ${response.status}`);
  }

  const payload = (await response.json()) as {
    current?: {
      time?: string;
      pm2_5?: number;
      us_aqi?: number;
    };
  };

  const current = payload.current;
  if (!current || typeof current.time !== 'string') {
    throw new Error('Open-Meteo current air data is missing.');
  }

  const fetchedAt = new Date().toISOString();
  const pm25 = typeof current.pm2_5 === 'number' ? current.pm2_5 : null;
  const usAqi = typeof current.us_aqi === 'number' ? current.us_aqi : null;

  return buildAirReading({
    pm25,
    usAqi,
    observedAt: current.time,
    fetchedAt,
    status: 'fresh',
    stale: false,
  });
}

export async function getLiveAirQuality(area: string = 'bangkok'): Promise<LiveAirQualityReading> {
  if (area !== 'bangkok') {
    throw new Error('Only bangkok is available in this MVP.');
  }

  const cached = getCacheRow<LiveAirQualityReading>('air-quality', area);
  if (cached && isCacheFresh(cached.fetchedAt, AIR_CACHE_TTL_MS)) {
    return {
      ...cached.payload,
      status: cached.status,
      stale: cached.status !== 'fresh',
      fetchedAt: cached.fetchedAt,
      observedAt: cached.sourceUpdatedAt ?? cached.payload.observedAt,
    };
  }

  try {
    const fresh = await fetchBangkokAirQualityFromSource();
    upsertCachedSignalRecord<LiveAirQualityReading>({
      slug: 'air-quality',
      area,
      payload: fresh,
      sourceLabel: fresh.sourceLabel,
      sourceUpdatedAt: fresh.observedAt,
      fetchedAt: fresh.fetchedAt,
      status: 'fresh',
    });
    return fresh;
  } catch (error) {
    if (cached) {
      const staleReading = buildAirReading({
        pm25: cached.payload.pm25,
        usAqi: cached.payload.usAqi,
        observedAt: cached.sourceUpdatedAt ?? cached.payload.observedAt,
        fetchedAt: cached.fetchedAt,
        status: 'stale',
        stale: true,
        note: 'Upstream fetch failed. Showing the last trustworthy cached reading.',
      });

      upsertCachedSignalRecord<LiveAirQualityReading>({
        slug: 'air-quality',
        area,
        payload: staleReading,
        sourceLabel: staleReading.sourceLabel,
        sourceUpdatedAt: staleReading.observedAt,
        fetchedAt: cached.fetchedAt,
        status: 'stale',
      });

      return staleReading;
    }

    const failedReading = buildAirReading({
      pm25: null,
      usAqi: null,
      observedAt: null,
      fetchedAt: new Date().toISOString(),
      status: 'failed',
      stale: true,
      note:
        error instanceof Error
          ? `Live air feed unavailable: ${error.message}`
          : 'Live air feed unavailable.',
    });

    upsertCachedSignalRecord<LiveAirQualityReading>({
      slug: 'air-quality',
      area,
      payload: failedReading,
      sourceLabel: failedReading.sourceLabel,
      sourceUpdatedAt: failedReading.observedAt,
      fetchedAt: failedReading.fetchedAt,
      status: 'failed',
    });

    return failedReading;
  }
}
