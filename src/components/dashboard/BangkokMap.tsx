'use client';

import { useEffect, useRef } from 'react';
import type L_Type from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SATELLITE_OVERLAYS, getOverlayUrl } from '@/lib/satellite-overlays';
import { getBestGibsDate, getBest8DayDate } from '@/lib/satellite-freshness';

interface Signal {
  slug: string;
  title: string;
  status: string;
  lat: number;
  lng: number;
}

const SIGNALS: Signal[] = [
  { slug: 'heat-stress', title: 'Heat Stress', status: 'high', lat: 13.7563, lng: 100.5018 },
  { slug: 'air-quality', title: 'Air Quality', status: 'elevated', lat: 13.7900, lng: 100.5500 },
  { slug: 'civic-complaints', title: 'Civic', status: 'active', lat: 13.7250, lng: 100.4800 },
  { slug: 'flood-weather', title: 'Flood', status: 'watch', lat: 13.6900, lng: 100.5300 },
  { slug: 'safety', title: 'Safety', status: 'watch', lat: 13.7450, lng: 100.5700 },
  { slug: 'transit', title: 'Transit', status: 'mixed', lat: 13.7650, lng: 100.5150 },
];

const STATUS_COLOR: Record<string, string> = {
  high: '#ff3333',
  elevated: '#ffaa00',
  active: '#00ff41',
  watch: '#00aa2a',
  mixed: '#004d00',
};

interface BangkokMapProps {
  satellite?: boolean;
  signalStatuses?: Record<string, string>;
  activeOverlays?: string[];
}

export default function BangkokMap({
  satellite = true,
  signalStatuses,
  activeOverlays = [],
}: BangkokMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L_Type.Map | null>(null);
  const overlayLayersRef = useRef<Map<string, L_Type.TileLayer>>(new Map());

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default;

      if (cancelled || !mapRef.current) return;

      const map = L.map(mapRef.current, {
        center: [13.5, 101.0],
        zoom: 7,
        zoomControl: true,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        touchZoom: true,
      });

      // Base layer
      if (satellite) {
        L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          { maxZoom: 18 }
        ).addTo(map);
      } else {
        L.tileLayer(
          'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
          { maxZoom: 18 }
        ).addTo(map);
      }

      // Signal markers
      for (const signal of SIGNALS) {
        const status = signalStatuses?.[signal.slug] || signal.status;
        const color = STATUS_COLOR[status] || '#004d00';

        L.circleMarker([signal.lat, signal.lng], {
          radius: 6,
          color,
          fillColor: color,
          fillOpacity: 0.5,
          weight: 1,
        })
          .bindTooltip(
            `<span style="font-family:monospace;font-size:9px;color:${color}">[${status.toUpperCase()}] ${signal.title}</span>`,
            { permanent: false, className: 'matrix-tooltip' }
          )
          .addTo(map);

        if (status === 'high' || status === 'elevated') {
          L.circleMarker([signal.lat, signal.lng], {
            radius: 12,
            color,
            fillOpacity: 0,
            weight: 1,
            opacity: 0.3,
            dashArray: '3 3',
          }).addTo(map);
        }
      }

      mapInstanceRef.current = map;
    })();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      overlayLayersRef.current.clear();
    };
  }, [satellite, signalStatuses]);

  // Manage overlay layers reactively
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentLayers = overlayLayersRef.current;
    const activeSet = new Set(activeOverlays);
    const dailyDate = getBestGibsDate();
    const compositeDate = getBest8DayDate();

    // Remove layers no longer active
    for (const [id, layer] of currentLayers) {
      if (!activeSet.has(id)) {
        map.removeLayer(layer);
        currentLayers.delete(id);
      }
    }

    // Add new active layers
    (async () => {
      const L = (await import('leaflet')).default;

      for (const id of activeOverlays) {
        if (currentLayers.has(id)) continue;

        const overlay = SATELLITE_OVERLAYS.find(o => o.id === id);
        if (!overlay) continue;

        const date = overlay.refreshNote === '8-day' ? compositeDate : dailyDate;
        const url = getOverlayUrl(overlay, date);

        const tileLayer = L.tileLayer(url, {
          maxZoom: overlay.maxZoom,
          opacity: overlay.opacity,
          bounds: [[-85, -180], [85, 180]],
        });

        tileLayer.addTo(map);
        currentLayers.set(id, tileLayer);
      }
    })();
  }, [activeOverlays]);

  const overlayCount = activeOverlays.length;

  return (
    <div className="cmd-panel absolute inset-0 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 p-1.5 z-[500] pointer-events-none">
        <div className="flex items-center justify-between">
          <div className="text-[5px] uppercase tracking-[0.3em] text-green-700">
            {'// '}{satellite ? 'SAT' : 'MAP'} · TH 13.5°N 101°E
            {overlayCount > 0 && ` · ${overlayCount} OVERLAY${overlayCount > 1 ? 'S' : ''}`}
          </div>
          <div className="text-[5px] uppercase tracking-[0.3em] text-green-900">
            GIBS/{getBestGibsDate()}
          </div>
        </div>
      </div>
      <div
        ref={mapRef}
        className="absolute inset-0"
        style={{
          filter: satellite && activeOverlays.length === 0
            ? 'saturate(0.4) brightness(0.85) contrast(1.1) hue-rotate(80deg)'
            : 'none',
        }}
      />
      <style>{`
        .matrix-tooltip {
          background: rgba(0,0,0,0.9) !important;
          border: 1px solid rgba(0,255,65,0.2) !important;
          border-radius: 0 !important;
          padding: 2px 6px !important;
          box-shadow: 0 0 8px rgba(0,255,65,0.1) !important;
        }
        .matrix-tooltip::before { display: none !important; }
        .leaflet-container { background: #000 !important; }
        .leaflet-control-zoom a {
          background: rgba(0,4,0,0.9) !important;
          color: #00ff41 !important;
          border: 1px solid rgba(0,255,65,0.15) !important;
          font-family: monospace !important;
          width: 22px !important;
          height: 22px !important;
          line-height: 22px !important;
          font-size: 12px !important;
        }
        .leaflet-control-zoom a:hover {
          background: rgba(0,255,65,0.1) !important;
        }
        .leaflet-control-zoom {
          border: none !important;
        }
      `}</style>
    </div>
  );
}
