import { getLiveAirQuality } from '@/lib/live-signals';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const area = searchParams.get('area') ?? 'bangkok';

  if (area !== 'bangkok') {
    return Response.json({ error: 'Only bangkok is available in this MVP.' }, { status: 400 });
  }

  try {
    const reading = await getLiveAirQuality(area);
    return Response.json(reading);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load live air quality.';
    return Response.json({ error: message }, { status: 400 });
  }
}
