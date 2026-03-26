import type { PlatformPulse } from '@/lib/db';

interface PlatformPulseProps {
  pulse: PlatformPulse;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-black/50 px-2 py-1.5">
      <div className="font-mono text-lg font-bold text-green-400">{value}</div>
      <div className="font-mono text-[5px] uppercase tracking-widest text-green-900">{label}</div>
    </div>
  );
}

function formatAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function PlatformPulsePanel({ pulse }: PlatformPulseProps) {
  return (
    <div className="cmd-panel p-3 flex flex-col overflow-hidden">
      <div className="text-[7px] uppercase tracking-[0.3em] text-green-700 shrink-0">
        {'// '}PLATFORM_PULSE
      </div>

      <div className="mt-2 grid grid-cols-3 gap-[1px] bg-green-900/10 shrink-0">
        <Stat label="USERS" value={pulse.totalUsers} />
        <Stat label="SESSIONS" value={pulse.totalConversations} />
        <Stat label="PRACTICE" value={pulse.totalPracticeRuns} />
        <Stat label="POSTS" value={pulse.totalPosts} />
        <Stat label="EVENTS" value={pulse.totalAnalyticsEvents} />
        <Stat label="REVISIONS" value={pulse.totalWatchRevisions} />
      </div>

      <div className="mt-2 border-t border-green-900/15 pt-1.5 flex-1 overflow-y-auto thin-scroll">
        <div className="text-[6px] uppercase tracking-widest text-green-900">RECENT EVENTS</div>
        <div className="mt-1 space-y-0.5">
          {pulse.recentEvents.map((e, i) => (
            <div key={i} className="flex items-center gap-2 text-[7px]">
              <span className="text-green-900 tabular-nums shrink-0 w-[24px]">{formatAgo(e.createdAt)}</span>
              <span className="text-green-600 truncate">{e.eventType}</span>
            </div>
          ))}
        </div>

        <div className="mt-2 text-[6px] uppercase tracking-widest text-green-900">RECENT SESSIONS</div>
        <div className="mt-1 space-y-0.5">
          {pulse.recentConversations.map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-[7px]">
              <span className="text-green-900 tabular-nums shrink-0 w-[24px]">{formatAgo(c.createdAt)}</span>
              <span className="text-green-500/70">[{c.mode}]</span>
              <span className="text-green-800">#{c.id}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
