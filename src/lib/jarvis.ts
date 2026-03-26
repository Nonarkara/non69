import Anthropic from '@anthropic-ai/sdk';
import { getWatchBundle, type WatchSignal } from '@/lib/db';
import { getLiveAirQuality } from '@/lib/live-signals';
import {
  getMacroCitations,
  getMacroComparisonSnapshot,
  type MacroComparisonSnapshot,
} from '@/lib/macro';
import type { MeetingCitation, MeetingInsight, MeetingSuggestedResponse } from '@/lib/meetings';
import { searchMeetingContext } from '@/lib/openai';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-20250514';

interface JarvisContext {
  transcript: string;
  watchBundle: Awaited<ReturnType<typeof getWatchBundle>>;
  liveAir: Awaited<ReturnType<typeof getLiveAirQuality>>;
  macro: MacroComparisonSnapshot;
}

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return null;
  }

  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

function clip(text: string, limit: number) {
  return text.length > limit ? `${text.slice(0, limit - 3)}...` : text;
}

function dedupeCitations(citations: MeetingCitation[]) {
  const seen = new Set<string>();
  return citations.filter(citation => {
    const key = `${citation.label}|${citation.url}|${citation.note}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function getRecentTranscriptSlice(transcript: string) {
  const chunks = transcript
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean);

  return clip(chunks.slice(-3).join(' '), 320) || 'The conversation has started, but the room signal is still thin.';
}

function getRelevantSignal(transcript: string, bundle: NonNullable<JarvisContext['watchBundle']>) {
  const lower = transcript.toLowerCase();
  const topicMap: Array<{ signal: WatchSignal['slug']; keywords: string[] }> = [
    { signal: 'air-quality', keywords: ['air', 'pm2.5', 'pollution', 'haze', 'lungs', 'mask'] },
    { signal: 'heat-stress', keywords: ['heat', 'temperature', 'hot', 'weather', 'outdoor'] },
    { signal: 'flood-weather', keywords: ['flood', 'storm', 'rain', 'drainage', 'weather'] },
    { signal: 'transit-disruption', keywords: ['transit', 'rail', 'bts', 'mrt', 'traffic', 'mobility'] },
    { signal: 'safety-incidents', keywords: ['safety', 'incident', 'crime', 'road', 'police'] },
    { signal: 'civic-service', keywords: ['complaint', 'service', 'city', 'governance', 'maintenance'] },
  ];

  const match = topicMap.find(entry => entry.keywords.some(keyword => lower.includes(keyword)));
  return bundle.signals.find(signal => signal.slug === match?.signal) ?? bundle.signals[0];
}

function formatMacroComparison(snapshot: MacroComparisonSnapshot) {
  if (snapshot.countries.length < 2) {
    const [country] = snapshot.countries;
    if (!country) {
      return 'Macro comparison unavailable.';
    }

    return `${country.name}: GDP growth ${country.metrics.gdpGrowth.valueText}, inflation ${country.metrics.inflation.valueText}, GDP per capita ${country.metrics.gdpPerCapita.valueText}.`;
  }

  const [left, right] = snapshot.countries;
  return `${left.name} vs ${right.name}: GDP growth ${left.metrics.gdpGrowth.valueText} vs ${right.metrics.gdpGrowth.valueText}; inflation ${left.metrics.inflation.valueText} vs ${right.metrics.inflation.valueText}; GDP per capita ${left.metrics.gdpPerCapita.valueText} vs ${right.metrics.gdpPerCapita.valueText}. Policy frame: ${left.metrics.policyRate.valueText} / ${right.metrics.policyRate.valueText}.`;
}

function buildDeterministicInsights(context: JarvisContext) {
  const bundle = context.watchBundle;
  if (!bundle) {
    return {
      insights: [
        {
          id: 'claim-0',
          kind: 'claim',
          title: 'Room signal',
          body: getRecentTranscriptSlice(context.transcript),
          tone: 'neutral',
          citations: [],
        },
      ] satisfies MeetingInsight[],
      suggestedResponses: [
        {
          id: 'response-0',
          text: 'Anchor the discussion in what changed, who pays for it, and what action follows next.',
          citations: [],
        },
      ] satisfies MeetingSuggestedResponse[],
    };
  }

  const relevantSignal = getRelevantSignal(context.transcript, bundle);
  const signalCitations = relevantSignal.sources.map(source => ({
    label: source.label,
    url: source.url,
    note: source.note,
  }));
  const liveAirCitations: MeetingCitation[] = [
    {
      label: context.liveAir.sourceLabel,
      url: context.liveAir.sourceUrl,
      note: `Observed ${context.liveAir.observedAt ?? 'unknown'} · fetched ${context.liveAir.fetchedAt}`,
    },
  ];
  const macroCitations = dedupeCitations(getMacroCitations(context.macro).slice(0, 6));

  const insights: MeetingInsight[] = [
    {
      id: 'claim-0',
      kind: 'claim',
      title: 'Claim forming in the room',
      body: getRecentTranscriptSlice(context.transcript),
      tone: 'neutral',
      citations: [],
    },
    {
      id: 'impact-0',
      kind: 'why_it_matters',
      title: relevantSignal.title,
      body: `${relevantSignal.summary} ${relevantSignal.whyItMatters}`,
      tone:
        relevantSignal.status === 'high' || relevantSignal.status === 'elevated' ? 'risk' : 'action',
      citations: signalCitations,
    },
    {
      id: 'comparison-0',
      kind: 'comparison',
      title: 'Macro comparison',
      body: formatMacroComparison(context.macro),
      tone: 'macro',
      citations: macroCitations,
    },
    {
      id: 'source-0',
      kind: 'source',
      title: 'Live Bangkok air layer',
      body:
        context.liveAir.pm25 == null
          ? context.liveAir.note
          : `Bangkok PM2.5 is ${context.liveAir.pm25.toFixed(1)} µg/m3, band ${context.liveAir.bandLabel}. ${context.liveAir.guidance}`,
      tone: context.liveAir.band === 'good' || context.liveAir.band === 'moderate' ? 'neutral' : 'risk',
      citations: liveAirCitations,
    },
  ];

  const suggestedResponses: MeetingSuggestedResponse[] = [
    {
      id: 'response-0',
      text: `If you want the practical line: ${relevantSignal.whatToDo}`,
      citations: signalCitations,
    },
    {
      id: 'response-1',
      text: `If they want comparison instead of vibes: ${formatMacroComparison(context.macro)}`,
      citations: macroCitations,
    },
  ];

  return { insights, suggestedResponses };
}

function safeParseModelPayload(text: string) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }

    const parsed = JSON.parse(match[0]) as {
      insights?: MeetingInsight[];
      suggestedResponses?: MeetingSuggestedResponse[];
    };

    if (!Array.isArray(parsed.insights) || !Array.isArray(parsed.suggestedResponses)) {
      return null;
    }

    return {
      insights: parsed.insights.slice(0, 4),
      suggestedResponses: parsed.suggestedResponses.slice(0, 3),
    };
  } catch {
    return null;
  }
}

async function buildModelInsights(context: JarvisContext) {
  const client = getClient();
  if (!client || context.transcript.trim().length < 80 || !context.watchBundle) {
    return null;
  }

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1400,
    system: `You are DrNon JARVIS, a private meeting-assist dashboard. Respond only as JSON.
Return:
{
  "insights": [
    {
      "id": "string",
      "kind": "claim" | "why_it_matters" | "comparison" | "source",
      "title": "string",
      "body": "string",
      "tone": "neutral" | "risk" | "action" | "macro",
      "citations": [{ "label": "string", "url": "string", "note": "string" }]
    }
  ],
  "suggestedResponses": [
    {
      "id": "string",
      "text": "string",
      "citations": [{ "label": "string", "url": "string", "note": "string" }]
    }
  ]
}
Keep it brutally concise, source-backed, and useful in a live room. No markdown.`,
    messages: [
      {
        role: 'user',
        content: JSON.stringify({
          transcript: clip(context.transcript, 1600),
          watchBrief: context.watchBundle.brief,
          signals: context.watchBundle.signals.map(signal => ({
            title: signal.title,
            status: signal.status,
            summary: signal.summary,
            whyItMatters: signal.whyItMatters,
            whatToDo: signal.whatToDo,
            sources: signal.sources,
          })),
          liveAir: context.liveAir,
          macro: context.macro,
        }),
      },
    ],
  });

  const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
  return safeParseModelPayload(text);
}

export async function generateMeetingInsights(transcript: string) {
  const watchBundle = await getWatchBundle('th');
  const [liveAir, macro, webResearch] = await Promise.all([
    getLiveAirQuality('bangkok'),
    getMacroComparisonSnapshot(transcript),
    searchMeetingContext(clip(transcript, 500)),
  ]);

  const context: JarvisContext = {
    transcript,
    watchBundle,
    liveAir,
    macro,
  };

  try {
    const model = await buildModelInsights(context);
    if (model) {
      return {
        insights: model.insights,
        suggestedResponses: model.suggestedResponses,
      };
    }
  } catch {
    // deterministic fallback below
  }

  const fallback = buildDeterministicInsights(context);

  if (webResearch?.summary) {
    const webInsight: MeetingInsight = {
      id: 'web-0',
      kind: 'source',
      title: 'Current web context',
      body: webResearch.summary,
      tone: 'neutral',
      citations: webResearch.citations,
    };
    const webResponse: MeetingSuggestedResponse = {
      id: 'response-web-0',
      text: `If they want the latest external context: ${webResearch.summary}`,
      citations: webResearch.citations,
    };

    fallback.insights = [
      ...fallback.insights,
      webInsight,
    ].slice(0, 5);

    fallback.suggestedResponses = [
      ...fallback.suggestedResponses,
      webResponse,
    ].slice(0, 3);
  }

  return fallback;
}
