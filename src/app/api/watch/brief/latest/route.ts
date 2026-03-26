import { getLatestIntelBrief } from '@/lib/db';

export async function GET() {
  const brief = getLatestIntelBrief('th');

  if (!brief) {
    return Response.json({ brief: null });
  }

  return Response.json({ brief });
}
