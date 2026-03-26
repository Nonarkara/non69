/**
 * NASA GIBS has ~1 day latency for most products.
 * This module picks the best date for satellite imagery queries.
 */

export function formatGibsDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function getBestGibsDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatGibsDate(yesterday);
}

export function getGibsDateForDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return formatGibsDate(d);
}

/** For 8-day composites (NDVI, EVI), find the most recent period start */
export function getBest8DayDate(): string {
  const now = new Date();
  const doy = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
  );
  // 8-day composites start on DOY 1, 9, 17, 25, ...
  const periodStart = doy - ((doy - 1) % 8);
  // Use previous period for safety (current may not be available)
  const safePeriod = periodStart - 8;
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const target = new Date(startOfYear.getTime() + (safePeriod - 1) * 86400000);
  return formatGibsDate(target);
}

export interface ImageFreshness {
  status: 'fresh' | 'acceptable' | 'stale';
  label: string;
  ageText: string;
  ageDays: number;
}

export function classifyImageFreshness(dateStr: string): ImageFreshness {
  const imageDate = new Date(dateStr);
  const now = new Date();
  const ageDays = Math.floor((now.getTime() - imageDate.getTime()) / 86400000);

  if (ageDays <= 2) {
    return { status: 'fresh', label: 'FRESH', ageText: `${ageDays}d ago`, ageDays };
  }
  if (ageDays <= 7) {
    return { status: 'acceptable', label: 'ACCEPTABLE', ageText: `${ageDays}d ago`, ageDays };
  }
  return { status: 'stale', label: 'STALE', ageText: `${ageDays}d ago`, ageDays };
}
