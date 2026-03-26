'use client';

import { useState } from 'react';

interface TVChannel {
  id: string;
  label: string;
  handle: string;
  focus: string;
  videoId?: string;
  channelId?: string;
}

const THAI_CHANNELS: TVChannel[] = [
  { id: 'thaipbs', label: 'Thai PBS', handle: '@ThaiPBSNews', focus: 'Public service', channelId: 'UCN2pMKkr8Bsm7MyqPYGl4Wg' },
  { id: 'tnn', label: 'TNN', handle: '@TNNOnline', focus: 'Markets', channelId: 'UCXR5NAMsU9fFdCMh1uG0eUw' },
  { id: 'nationtv', label: 'NationTV', handle: '@NationTV22', focus: 'Breaking', channelId: 'UCRCgKsWMEgZ5vKPIBQlodsA' },
  { id: 'amarin', label: 'Amarin', handle: '@AMARINTVHD', focus: 'Public', channelId: 'UCtwFiAmQN7mKL44bml3FnNg' },
];

const INTL_CHANNELS: TVChannel[] = [
  { id: 'france24', label: 'France 24', handle: '@FRANCE24English', focus: 'World', channelId: 'UCQfwfsi5VrQ8yKZ-UWmAEFg' },
  { id: 'aljazeera', label: 'Al Jazeera', handle: '@AlJazeeraEnglish', focus: 'MENA', videoId: 'gCNeDWCI0vo' },
];

function getEmbedUrl(ch: TVChannel, muted: boolean): string {
  const muteParam = muted ? '1' : '0';
  if (ch.videoId) {
    return `https://www.youtube.com/embed/${ch.videoId}?autoplay=1&mute=${muteParam}&controls=0&modestbranding=1&playsinline=1&rel=0`;
  }
  if (ch.channelId) {
    return `https://www.youtube.com/embed/live_stream?channel=${ch.channelId}&autoplay=1&mute=${muteParam}&controls=0&modestbranding=1&playsinline=1&rel=0`;
  }
  return '';
}

export default function LiveTVPanel() {
  const allChannels = [...THAI_CHANNELS, ...INTL_CHANNELS];
  const [activeIdx, setActiveIdx] = useState(0);
  const [muted, setMuted] = useState(true);

  const active = allChannels[activeIdx];

  return (
    <div className="cmd-panel flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between p-1.5 shrink-0">
        <div className="font-mono text-[6px] uppercase tracking-[0.25em] text-green-700">{'// '}LIVE_TV</div>
        <button
          onClick={() => setMuted(m => !m)}
          className="font-mono text-[6px] uppercase tracking-wider text-green-600 hover:text-green-400"
        >
          {muted ? '[UNMUTE]' : '[MUTE]'}
        </button>
      </div>

      {/* Main video */}
      <div className="flex-1 relative min-h-0 bg-black">
        <iframe
          key={`${active.id}-${muted}`}
          src={getEmbedUrl(active, muted)}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ border: 'none' }}
        />
        <div className="absolute bottom-0 left-0 right-0 p-1 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
          <div className="font-mono text-[8px] text-green-400 font-bold">{active.label}</div>
          <div className="font-mono text-[5px] text-green-700">{active.focus}</div>
        </div>
      </div>

      {/* Channel strip */}
      <div className="flex gap-[1px] shrink-0 mt-[1px]">
        {allChannels.map((ch, i) => (
          <button
            key={ch.id}
            onClick={() => setActiveIdx(i)}
            className={`flex-1 py-1 font-mono text-[5px] uppercase tracking-wider transition-colors ${
              i === activeIdx
                ? 'bg-green-900/30 text-green-400 border-t border-green-500/50'
                : 'bg-black/50 text-green-800 hover:text-green-600'
            }`}
          >
            {ch.label}
          </button>
        ))}
      </div>
    </div>
  );
}
