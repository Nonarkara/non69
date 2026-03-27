import { NextResponse } from 'next/server';

const CACHE = new Map<string, { videoId: string; resolvedAt: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

async function resolveYouTubeLiveId(handle: string): Promise<string | null> {
  const cached = CACHE.get(handle);
  if (cached && Date.now() - cached.resolvedAt < CACHE_TTL_MS) {
    return cached.videoId;
  }

  try {
    // Try /@handle/streams first
    const url = `https://www.youtube.com/${handle}/streams`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;

    const html = await res.text();

    // Look for live video ID patterns
    const patterns = [
      /"videoId":"([a-zA-Z0-9_-]{11})"/,
      /watch\?v=([a-zA-Z0-9_-]{11})/,
      /\/embed\/([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        CACHE.set(handle, { videoId: match[1], resolvedAt: Date.now() });
        return match[1];
      }
    }

    return null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const handle = searchParams.get('handle');

  if (!handle) {
    return NextResponse.json({ error: 'handle is required' }, { status: 400 });
  }

  const videoId = await resolveYouTubeLiveId(handle);

  if (!videoId) {
    return NextResponse.json({ videoId: null, resolved: false });
  }

  return NextResponse.json({ videoId, resolved: true });
}
