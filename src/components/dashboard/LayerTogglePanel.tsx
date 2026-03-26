'use client';

import { SATELLITE_OVERLAYS, OVERLAY_CATEGORIES } from '@/lib/satellite-overlays';

interface LayerTogglePanelProps {
  activeOverlays: string[];
  onToggle: (id: string) => void;
}

export default function LayerTogglePanel({ activeOverlays, onToggle }: LayerTogglePanelProps) {
  const activeSet = new Set(activeOverlays);

  return (
    <div className="cmd-panel p-2 w-[180px] max-h-[320px] overflow-y-auto thin-scroll">
      <div className="text-[6px] uppercase tracking-[0.3em] text-green-700 shrink-0">
        {'// '}SAT_LAYERS [{activeOverlays.length}]
      </div>

      {OVERLAY_CATEGORIES.map(cat => {
        const overlays = SATELLITE_OVERLAYS.filter(o => o.category === cat.id);
        if (overlays.length === 0) return null;

        return (
          <div key={cat.id} className="mt-1.5">
            <div className="text-[5px] uppercase tracking-[0.25em] text-green-900 mb-0.5">
              {cat.label}
            </div>
            {overlays.map(overlay => {
              const isActive = activeSet.has(overlay.id);
              return (
                <button
                  key={overlay.id}
                  onClick={() => onToggle(overlay.id)}
                  className={`w-full flex items-center gap-1.5 px-1 py-0.5 text-left transition-colors hover:bg-green-900/10 ${
                    isActive ? 'bg-green-900/15' : ''
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full shrink-0 transition-colors ${
                      isActive
                        ? 'bg-green-400 shadow-[0_0_4px_rgba(0,255,65,0.5)]'
                        : 'bg-green-900/30'
                    }`}
                  />
                  <span className={`text-[7px] truncate ${isActive ? 'text-green-400' : 'text-green-700'}`}>
                    {overlay.name}
                  </span>
                  <span className="text-[5px] text-green-900 ml-auto shrink-0">
                    {overlay.refreshNote}
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
