'use client';

import { useState, useCallback } from 'react';
import BangkokMap from './BangkokMap';
import LayerTogglePanel from './LayerTogglePanel';

interface SatelliteMapControllerProps {
  satellite?: boolean;
  signalStatuses?: Record<string, string>;
}

export default function SatelliteMapController({
  satellite = true,
  signalStatuses,
}: SatelliteMapControllerProps) {
  const [activeOverlays, setActiveOverlays] = useState<string[]>([]);
  const [showPanel, setShowPanel] = useState(true);

  const handleToggle = useCallback((id: string) => {
    setActiveOverlays(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  return (
    <div className="relative w-full h-full">
      <BangkokMap
        satellite={satellite}
        signalStatuses={signalStatuses}
        activeOverlays={activeOverlays}
      />

      {/* Layer toggle panel — top right */}
      <div className="absolute top-6 right-1 z-[500]">
        <button
          onClick={() => setShowPanel(p => !p)}
          className="cmd-panel px-1.5 py-0.5 text-[6px] uppercase tracking-[0.2em] text-green-600 hover:text-green-400 transition-colors mb-[2px]"
        >
          {showPanel ? '[-] LAYERS' : '[+] LAYERS'}
        </button>
        {showPanel && (
          <LayerTogglePanel
            activeOverlays={activeOverlays}
            onToggle={handleToggle}
          />
        )}
      </div>
    </div>
  );
}
