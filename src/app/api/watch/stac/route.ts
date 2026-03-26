import { searchStac, BBOX_BANGKOK, type StacSearchParams } from '@/lib/stac';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const params: StacSearchParams = {
    bbox: body?.bbox || BBOX_BANGKOK,
    collections: body?.collections,
    dateRange: body?.dateRange,
    maxCloudCover: body?.maxCloudCover ?? 30,
    limit: body?.limit ?? 10,
  };

  try {
    const result = await searchStac(params);
    return Response.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'STAC search failed';
    return Response.json({ error: msg }, { status: 502 });
  }
}
