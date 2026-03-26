'use client';

import { useEffect, useState } from 'react';
import { getWatchFreshness } from '@/lib/watch';

interface CockpitLiveBarProps {
  generatedAt: string;
  currentVersion?: number | null;
}

const statusStyles: Record<string, string> = {
  current: 'text-emerald-300',
  aging: 'text-amber-300',
  stale: 'text-red-300',
};

const meetingStyles: Record<string, string> = {
  idle: 'text-neutral-500',
  listening: 'text-red-300',
  processing: 'text-amber-300',
  saved: 'text-emerald-300',
  error: 'text-red-300',
};

function formatBangkokTime(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

export default function CockpitLiveBar({
  generatedAt,
  currentVersion = null,
}: CockpitLiveBarProps) {
  const [now, setNow] = useState(() => new Date());
  const [meetingStatus, setMeetingStatus] = useState('idle');

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleStatus = (event: Event) => {
      const detail = (event as CustomEvent<{ status?: string }>).detail;
      if (detail?.status) {
        setMeetingStatus(detail.status);
      }
    };

    window.addEventListener('drnon:meeting-status', handleStatus);
    return () => window.removeEventListener('drnon:meeting-status', handleStatus);
  }, []);

  const freshness = getWatchFreshness(generatedAt, now);
  const statusClass = statusStyles[freshness.status] || statusStyles.stale;
  const meetingClass = meetingStyles[meetingStatus] || meetingStyles.idle;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.18em] text-neutral-500">
      <div className="flex items-center gap-2">
        <span className={`inline-block h-2 w-2 rounded-full ${freshness.status === 'current' ? 'bg-emerald-400' : freshness.status === 'aging' ? 'bg-amber-400' : 'bg-red-400 animate-pulse'}`} />
        <span className={statusClass}>{freshness.label}</span>
      </div>
      <div className={`flex items-center gap-2 ${meetingClass}`}>
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            meetingStatus === 'listening'
              ? 'bg-red-400 animate-pulse'
              : meetingStatus === 'processing'
                ? 'bg-amber-400 animate-pulse'
                : meetingStatus === 'saved'
                  ? 'bg-emerald-400'
                  : 'bg-neutral-700'
          }`}
        />
        <span>{meetingStatus}</span>
      </div>
      <div>Bangkok {formatBangkokTime(now)}</div>
      <div>Published {freshness.ageText}</div>
      {currentVersion && <div>Version {currentVersion}</div>}
      <div>
        Target{' '}
        {new Date(freshness.nextTargetAt).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })}
      </div>
    </div>
  );
}
