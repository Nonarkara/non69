export type WatchFreshnessStatus = 'current' | 'aging' | 'stale';

export interface WatchFreshness {
  status: WatchFreshnessStatus;
  label: string;
  ageHours: number;
  ageText: string;
  nextTargetAt: string;
}

function formatAgeText(ageHours: number) {
  if (ageHours < 1) {
    const minutes = Math.max(1, Math.round(ageHours * 60));
    return `${minutes}m ago`;
  }

  if (ageHours < 24) {
    return `${Math.round(ageHours)}h ago`;
  }

  const days = Math.floor(ageHours / 24);
  const hours = Math.round(ageHours % 24);
  return hours === 0 ? `${days}d ago` : `${days}d ${hours}h ago`;
}

export function getWatchFreshness(updatedAt: string, now = new Date()): WatchFreshness {
  const updated = new Date(updatedAt);
  const ageMs = Math.max(0, now.getTime() - updated.getTime());
  const ageHours = ageMs / (1000 * 60 * 60);

  let status: WatchFreshnessStatus = 'current';
  let label = 'Current';

  if (ageHours > 30) {
    status = 'stale';
    label = 'Stale';
  } else if (ageHours > 18) {
    status = 'aging';
    label = 'Aging';
  }

  return {
    status,
    label,
    ageHours,
    ageText: formatAgeText(ageHours),
    nextTargetAt: new Date(updated.getTime() + 24 * 60 * 60 * 1000).toISOString(),
  };
}
