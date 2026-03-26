import { getCurrentUser, isAdminUser } from '@/lib/auth';
import { getWatchBundle, publishWatchBundle, trackEvent } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const geography = searchParams.get('geography') ?? 'th';

  if (geography !== 'th') {
    return Response.json({ error: 'Only th is available in this MVP.' }, { status: 400 });
  }

  const bundle = await getWatchBundle(geography);
  if (!bundle) {
    return Response.json({ error: 'Watch data unavailable.' }, { status: 404 });
  }

  return Response.json(bundle);
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!isAdminUser(user)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    geography?: string;
    brief?: {
      headline?: string;
      summary?: string;
      watchouts?: string[];
    };
    signals?: Array<{
      slug?: string;
      status?: string;
      summary?: string;
      whyItMatters?: string;
      whatToDo?: string;
      metricText?: string;
      trendText?: string;
      sources?: Array<{
        label?: string;
        url?: string;
        note?: string;
      }>;
    }>;
  } | null;

  if (body?.geography !== 'th') {
    return Response.json({ error: 'Only th is available in this MVP.' }, { status: 400 });
  }

  const brief = body.brief;
  const signals = body.signals;
  const validBrief =
    brief &&
    typeof brief.headline === 'string' &&
    typeof brief.summary === 'string' &&
    Array.isArray(brief.watchouts) &&
    brief.watchouts.every(item => typeof item === 'string');
  const validSignals =
    Array.isArray(signals) &&
    signals.length === 6 &&
    new Set(signals.map(signal => signal?.slug)).size === 6 &&
    signals.every(signal => {
      return (
        signal &&
        typeof signal.slug === 'string' &&
        typeof signal.status === 'string' &&
        typeof signal.summary === 'string' &&
        typeof signal.whyItMatters === 'string' &&
        typeof signal.whatToDo === 'string' &&
        typeof signal.metricText === 'string' &&
        typeof signal.trendText === 'string' &&
        Array.isArray(signal.sources) &&
        signal.sources.every(source => {
          return (
            source &&
            typeof source.label === 'string' &&
            typeof source.url === 'string' &&
            typeof source.note === 'string'
          );
        })
      );
    });

  if (!validBrief || !validSignals) {
    return Response.json({ error: 'Invalid watch publish payload.' }, { status: 400 });
  }

  try {
    const safeBrief = brief as {
      headline: string;
      summary: string;
      watchouts: string[];
    };
    const briefInput = {
      headline: safeBrief.headline,
      summary: safeBrief.summary,
      watchouts: safeBrief.watchouts,
    };
    const safeSignals = signals as Array<{
      slug: string;
      status: string;
      summary: string;
      whyItMatters: string;
      whatToDo: string;
      metricText: string;
      trendText: string;
      sources: Array<{
        label: string;
        url: string;
        note: string;
      }>;
    }>;
    const signalInputs = safeSignals.map(signal => ({
      slug: signal.slug,
      status: signal.status,
      summary: signal.summary,
      whyItMatters: signal.whyItMatters,
      whatToDo: signal.whatToDo,
      metricText: signal.metricText,
      trendText: signal.trendText,
      sources: signal.sources.map(source => ({
        label: source.label,
        url: source.url,
        note: source.note,
      })),
    }));

    const result = await publishWatchBundle(body.geography, briefInput, signalInputs, {
      userId: user.id,
      displayName: user.display_name,
    });

    await trackEvent('watch_publish', {
      geography: body.geography,
      revisionId: result.revision.id,
      version: result.revision.version,
      signalCount: signalInputs.length,
      timestamp: new Date().toISOString(),
    });

    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not publish watch bundle.';
    return Response.json({ error: message }, { status: 400 });
  }
}
