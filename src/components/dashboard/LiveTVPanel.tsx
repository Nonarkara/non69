'use client';

import { useState, useEffect, useCallback } from 'react';

interface TVChannel {
  id: string;
  label: string;
  handle: string;
  focus: string;
  videoId?: string;
  channelId?: string;
}

const CHANNELS: TVChannel[] = [
  { id: 'thaipbs', label: 'PBS', handle: '@ThaiPBSNews', focus: 'Public service', channelId: 'UCN2pMKkr8Bsm7MyqPYGl4Wg' },
  { id: 'tnn', label: 'TNN', handle: '@TNNOnline', focus: 'Markets', channelId: 'UCXR5NAMsU9fFdCMh1uG0eUw' },
  { id: 'nationtv', label: 'Nation', handle: '@NationTV22', focus: 'Breaking', channelId: 'UCRCgKsWMEgZ5vKPIBQlodsA' },
  { id: 'amarin', label: 'Amarin', handle: '@AMARINTVHD', focus: 'Public', channelId: 'UCtwFiAmQN7mKL44bml3FnNg' },
  { id: 'france24', label: 'FR24', handle: '@FRANCE24English', focus: 'World', channelId: 'UCQfwfsi5VrQ8yKZ-UWmAEFg' },
  { id: 'aljazeera', label: 'AJ', handle: '@AlJazeeraEnglish', focus: 'MENA', videoId: 'gCNeDWCI0vo' },
];

export default function LiveTVPanel() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const [resolvedIds, setResolvedIds] = useState<Record<string, string>>({});
  const [resolving, setResolving] = useState(false);

  const active = CHANNELS[activeIdx];

  // Resolve live stream IDs via API
  const resolveStreams = useCallback(async () => {
    setResolving(true);
    const results: Record<string, string> = {};

    await Promise.allSettled(
      CHANNELS.filter(ch => ch.handle && !ch.videoId).map(async (ch) => {
        try {
          const res = await fetch(`/api/live-tv?handle=${encodeURIComponent(ch.handle)}`);
          const data = await res.json();
          if (data.videoId) {
            results[ch.id] = data.videoId;
          }
        } catch { /* skip */ }
      })
    );

    setResolvedIds(prev => ({ ...prev, ...results }));
    setResolving(false);
  }, []);

  useEffect(() => {
    resolveStreams();
  }, [resolveStreams]);

  function getEmbedUrl(): string {
    const ch = active;
    const muteParam = muted ? '1' : '0';
    const resolved = resolvedIds[ch.id];

    // Prefer resolved video ID
    if (resolved) {
      return `https://www.youtube.com/embed/${resolved}?autoplay=1&mute=${muteParam}&controls=0&modestbranding=1&playsinline=1&rel=0`;
    }
    // Fallback: hardcoded video ID
    if (ch.videoId) {
      return `https://www.youtube.com/embed/${ch.videoId}?autoplay=1&mute=${muteParam}&controls=0&modestbranding=1&playsinline=1&rel=0`;
    }
    // Fallback: channel live stream
    if (ch.channelId) {
      return `https://www.youtube.com/embed/live_stream?channel=${ch.channelId}&autoplay=1&mute=${muteParam}&controls=0&modestbranding=1&playsinline=1&rel=0`;
    }
    return '';
  }

  const hasResolved = resolvedIds[active.id] || active.videoId;

  return (
    <div className="cmd-panel flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-1.5 py-1 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[6px] uppercase tracking-[0.25em] text-green-700">{'// '}LIVE_TV</span>
          {resolving && <span className="font-mono text-[5px] text-green-900 animate-pulse">RESOLVING...</span>}
          {hasResolved && <span className="h-1 w-1 rounded-full bg-red-500 shadow-[0_0_4px_rgba(255,0,0,0.6)]" />}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resolveStreams}
            className="font-mono text-[5px] uppercase tracking-wider text-green-800 hover:text-green-400"
          >
            [REFRESH]
          </button>
          <button
            onClick={() => setMuted(m => !m)}
            className="font-mono text-[6px] uppercase tracking-wider text-green-600 hover:text-green-400"
          >
            {muted ? '[UNMUTE]' : '[MUTE]'}
          </button>
        </div>
      </div>

      {/* Main video */}
      <div className="flex-1 relative min-h-0 bg-black">
        <iframe
          key={`${active.id}-${muted}-${resolvedIds[active.id] || ''}`}
          src={getEmbedUrl()}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ border: 'none' }}
        />
        <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1 bg-gradient-to-t from-black/90 to-transparent pointer-events-none">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-[9px] text-green-400 font-bold">{active.label}</span>
              <span className="font-mono text-[6px] text-green-700 ml-2">{active.focus}</span>
            </div>
            <span className="font-mono text-[5px] text-green-900">{active.handle}</span>
          </div>
        </div>
      </div>

      {/* Channel strip */}
      <div className="flex gap-[1px] shrink-0 mt-[1px]">
        {CHANNELS.map((ch, i) => {
          const isResolved = !!resolvedIds[ch.id] || !!ch.videoId;
          return (
            <button
              key={ch.id}
              onClick={() => setActiveIdx(i)}
              className={`flex-1 py-1 font-mono text-[6px] uppercase tracking-wider transition-colors ${
                i === activeIdx
                  ? 'bg-green-900/30 text-green-400 border-t border-green-500/50'
                  : 'bg-black/50 text-green-800 hover:text-green-600'
              }`}
            >
              <span>{ch.label}</span>
              {isResolved && <span className="inline-block ml-0.5 h-1 w-1 rounded-full bg-red-500 align-middle" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
