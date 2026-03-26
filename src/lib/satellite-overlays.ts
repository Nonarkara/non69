export interface SatelliteOverlay {
  id: string;
  name: string;
  category: 'imagery' | 'fire' | 'weather' | 'air' | 'ocean' | 'vegetation' | 'night';
  description: string;
  layer: string;
  format: 'png' | 'jpg';
  tileMatrixSet: string;
  maxZoom: number;
  opacity: number;
  dateDependent: boolean;
  refreshNote: string;
}

function gibsUrl(layer: string, format: string, tileMatrixSet: string): string {
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer}/default/{time}/${tileMatrixSet}/{z}/{y}/{x}.${format}`;
}

export const SATELLITE_OVERLAYS: SatelliteOverlay[] = [
  // ── Imagery ──
  {
    id: 'viirs-true-color',
    name: 'VIIRS True Color',
    category: 'imagery',
    description: 'Daily corrected reflectance from Suomi NPP',
    layer: 'VIIRS_SNPP_CorrectedReflectance_TrueColor',
    format: 'jpg',
    tileMatrixSet: 'GoogleMapsCompatible_Level9',
    maxZoom: 9,
    opacity: 0.8,
    dateDependent: true,
    refreshNote: 'Daily',
  },
  {
    id: 'modis-true-color',
    name: 'MODIS True Color',
    category: 'imagery',
    description: 'Daily corrected reflectance from Terra',
    layer: 'MODIS_Terra_CorrectedReflectance_TrueColor',
    format: 'jpg',
    tileMatrixSet: 'GoogleMapsCompatible_Level9',
    maxZoom: 9,
    opacity: 0.8,
    dateDependent: true,
    refreshNote: 'Daily',
  },

  // ── Fire ──
  {
    id: 'modis-fire',
    name: 'MODIS Thermal',
    category: 'fire',
    description: 'Active fire/thermal anomalies from Terra',
    layer: 'MODIS_Terra_Thermal_Anomalies_All',
    format: 'png',
    tileMatrixSet: 'GoogleMapsCompatible_Level8',
    maxZoom: 8,
    opacity: 0.9,
    dateDependent: true,
    refreshNote: 'Daily',
  },
  {
    id: 'viirs-fire',
    name: 'VIIRS Fire 375m',
    category: 'fire',
    description: 'High-res fire detection from Suomi NPP',
    layer: 'VIIRS_SNPP_Thermal_Anomalies_375m_All',
    format: 'png',
    tileMatrixSet: 'GoogleMapsCompatible_Level8',
    maxZoom: 8,
    opacity: 0.9,
    dateDependent: true,
    refreshNote: 'Daily',
  },

  // ── Weather ──
  {
    id: 'precipitation',
    name: 'Precipitation Rate',
    category: 'weather',
    description: 'IMERG global precipitation estimate',
    layer: 'IMERG_Precipitation_Rate',
    format: 'png',
    tileMatrixSet: 'GoogleMapsCompatible_Level6',
    maxZoom: 6,
    opacity: 0.7,
    dateDependent: false,
    refreshNote: '30min',
  },
  {
    id: 'cloud-top',
    name: 'Cloud Top Height',
    category: 'weather',
    description: 'MODIS cloud top height',
    layer: 'MODIS_Terra_Cloud_Top_Height',
    format: 'png',
    tileMatrixSet: 'GoogleMapsCompatible_Level6',
    maxZoom: 6,
    opacity: 0.6,
    dateDependent: true,
    refreshNote: 'Daily',
  },

  // ── Air ──
  {
    id: 'aerosol',
    name: 'Aerosol Depth',
    category: 'air',
    description: 'MODIS aerosol optical depth (proxy for PM2.5)',
    layer: 'MODIS_Terra_Aerosol_Optical_Depth_3km',
    format: 'png',
    tileMatrixSet: 'GoogleMapsCompatible_Level6',
    maxZoom: 6,
    opacity: 0.7,
    dateDependent: true,
    refreshNote: 'Daily',
  },

  // ── Ocean ──
  {
    id: 'sst',
    name: 'Sea Surface Temp',
    category: 'ocean',
    description: 'MODIS daytime sea surface temperature',
    layer: 'MODIS_Terra_Sea_Surface_Temp_Day',
    format: 'png',
    tileMatrixSet: 'GoogleMapsCompatible_Level7',
    maxZoom: 7,
    opacity: 0.7,
    dateDependent: true,
    refreshNote: 'Daily',
  },

  // ── Vegetation ──
  {
    id: 'ndvi',
    name: 'Vegetation Index',
    category: 'vegetation',
    description: 'MODIS NDVI 8-day composite',
    layer: 'MODIS_Terra_NDVI_8Day',
    format: 'png',
    tileMatrixSet: 'GoogleMapsCompatible_Level8',
    maxZoom: 8,
    opacity: 0.7,
    dateDependent: true,
    refreshNote: '8-day',
  },
  {
    id: 'evi',
    name: 'Enhanced Vegetation',
    category: 'vegetation',
    description: 'MODIS EVI 8-day composite',
    layer: 'MODIS_Terra_EVI_8Day',
    format: 'png',
    tileMatrixSet: 'GoogleMapsCompatible_Level8',
    maxZoom: 8,
    opacity: 0.7,
    dateDependent: true,
    refreshNote: '8-day',
  },

  // ── Night ──
  {
    id: 'night-lights',
    name: 'Night Lights',
    category: 'night',
    description: 'VIIRS Day-Night Band (city lights, fires)',
    layer: 'VIIRS_SNPP_DayNightBand_AtSensor_M22',
    format: 'png',
    tileMatrixSet: 'GoogleMapsCompatible_Level8',
    maxZoom: 8,
    opacity: 0.85,
    dateDependent: true,
    refreshNote: 'Daily',
  },
  {
    id: 'blue-marble',
    name: 'Blue Marble',
    category: 'imagery',
    description: 'Monthly composite (no clouds)',
    layer: 'BlueMarble_NextGeneration',
    format: 'jpg',
    tileMatrixSet: 'GoogleMapsCompatible_Level8',
    maxZoom: 8,
    opacity: 0.9,
    dateDependent: false,
    refreshNote: 'Monthly',
  },
];

export const OVERLAY_CATEGORIES = [
  { id: 'imagery', label: 'IMAGERY' },
  { id: 'fire', label: 'FIRE/THERMAL' },
  { id: 'weather', label: 'WEATHER' },
  { id: 'air', label: 'AIR QUALITY' },
  { id: 'ocean', label: 'OCEAN' },
  { id: 'vegetation', label: 'VEGETATION' },
  { id: 'night', label: 'NIGHT' },
] as const;

export function getOverlayUrl(overlay: SatelliteOverlay, date: string): string {
  const time = overlay.dateDependent ? date : '';
  return gibsUrl(overlay.layer, overlay.format, overlay.tileMatrixSet).replace('{time}', time);
}

export function getOverlayById(id: string): SatelliteOverlay | undefined {
  return SATELLITE_OVERLAYS.find(o => o.id === id);
}

export function getOverlaysByCategory(category: string): SatelliteOverlay[] {
  return SATELLITE_OVERLAYS.filter(o => o.category === category);
}
