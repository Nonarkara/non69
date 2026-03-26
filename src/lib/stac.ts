/**
 * STAC (SpatioTemporal Asset Catalog) integration.
 * Queries Microsoft Planetary Computer for satellite imagery metadata.
 */

export interface StacSearchParams {
  bbox: [number, number, number, number]; // [west, south, east, north]
  collections?: string[];
  dateRange?: string; // ISO 8601 interval, e.g. "2026-03-20/2026-03-26"
  maxCloudCover?: number;
  limit?: number;
}

export interface StacItem {
  id: string;
  collection: string;
  datetime: string;
  cloudCover: number | null;
  bbox: [number, number, number, number];
  thumbnailUrl: string | null;
  properties: Record<string, unknown>;
}

export interface StacSearchResult {
  items: StacItem[];
  matched: number;
  returned: number;
}

// Bounding box presets
export const BBOX_BANGKOK: [number, number, number, number] = [100.3, 13.5, 100.9, 14.0];
export const BBOX_THAILAND: [number, number, number, number] = [97.3, 5.6, 105.6, 20.5];
export const BBOX_ASEAN: [number, number, number, number] = [92.0, -11.0, 141.0, 28.5];

const PLANETARY_COMPUTER_STAC = 'https://planetarycomputer.microsoft.com/api/stac/v1/search';

const DEFAULT_COLLECTIONS = ['sentinel-2-l2a', 'landsat-c2-l2'];

export function buildStacQuery(params: StacSearchParams): Record<string, unknown> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const defaultRange = `${weekAgo.toISOString().split('T')[0]}/${now.toISOString().split('T')[0]}`;

  const query: Record<string, unknown> = {
    bbox: params.bbox,
    collections: params.collections || DEFAULT_COLLECTIONS,
    datetime: params.dateRange || defaultRange,
    limit: params.limit || 10,
    sortby: [{ field: 'datetime', direction: 'desc' }],
  };

  if (params.maxCloudCover != null) {
    query.query = {
      'eo:cloud_cover': { lt: params.maxCloudCover },
    };
  }

  return query;
}

export function simplifyStacItem(raw: Record<string, unknown>): StacItem {
  const props = (raw.properties || {}) as Record<string, unknown>;
  const assets = (raw.assets || {}) as Record<string, { href?: string }>;

  const thumbnail =
    assets.thumbnail?.href ||
    assets.rendered_preview?.href ||
    null;

  return {
    id: String(raw.id || ''),
    collection: String(raw.collection || ''),
    datetime: String(props.datetime || ''),
    cloudCover: typeof props['eo:cloud_cover'] === 'number' ? props['eo:cloud_cover'] : null,
    bbox: (raw.bbox as [number, number, number, number]) || [0, 0, 0, 0],
    thumbnailUrl: thumbnail,
    properties: props,
  };
}

export async function searchStac(params: StacSearchParams): Promise<StacSearchResult> {
  const body = buildStacQuery(params);

  const response = await fetch(PLANETARY_COMPUTER_STAC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`STAC search failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const features = Array.isArray(data.features) ? data.features : [];

  return {
    items: features.map(simplifyStacItem),
    matched: data.numberMatched ?? features.length,
    returned: data.numberReturned ?? features.length,
  };
}
