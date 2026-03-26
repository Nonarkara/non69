import { getWatchBundle } from './db';
import { getIntelMemoryForContext, getRecentAnalyses } from './db';
import { getLiveAirQuality, getLiveWeather } from './live-signals';
import { getLiveNewsFeed } from './news-feeds';
import { searchStac, BBOX_THAILAND } from './stac';

/**
 * Builds the full intelligence context for Claude analysis.
 * Gathers: watch signals, live env data, news, STAC satellite metadata, memory.
 */
export async function buildAnalysisContext(geography: string): Promise<string> {
  const bundle = getWatchBundle(geography);
  const memory = getIntelMemoryForContext(geography, 15);
  const recentAnalyses = getRecentAnalyses(geography, 3);

  const [air, weather, news, stac] = await Promise.all([
    getLiveAirQuality('bangkok').catch(() => null),
    getLiveWeather('bangkok').catch(() => null),
    getLiveNewsFeed().catch(() => []),
    searchStac({ bbox: BBOX_THAILAND, maxCloudCover: 30, limit: 5 }).catch(() => null),
  ]);

  let ctx = '';

  // Watch signals
  if (bundle) {
    ctx += '## WATCH STATE\n';
    ctx += `Posture: ${bundle.brief.headline}\n`;
    ctx += `Summary: ${bundle.brief.summary}\n`;
    ctx += `Watchouts: ${bundle.brief.watchouts.join(' | ')}\n\n`;
    ctx += '## SIGNALS\n';
    for (const s of bundle.signals) {
      ctx += `- [${s.status.toUpperCase()}] ${s.title}: ${s.summary} (Metric: ${s.metricText}, Trend: ${s.trendText})\n`;
    }
    ctx += '\n';
  }

  // Live environment
  if (air) {
    ctx += `## LIVE AIR\nPM2.5: ${air.pm25} µg/m³ | AQI: ${air.usAqi} | Band: ${air.bandLabel}\n\n`;
  }
  if (weather) {
    ctx += `## LIVE WEATHER\nTemp: ${weather.tempC}°C | Feels like: ${weather.feelsLikeC}°C | Humidity: ${weather.humidity}%\n\n`;
  }

  // News
  if (news.length > 0) {
    ctx += '## RECENT NEWS\n';
    for (const n of news.slice(0, 12)) {
      ctx += `- [${n.source}] ${n.title}\n`;
    }
    ctx += '\n';
  }

  // Satellite data availability
  if (stac && stac.items.length > 0) {
    ctx += '## SATELLITE DATA AVAILABLE\n';
    for (const item of stac.items) {
      ctx += `- ${item.collection} | ${item.datetime} | Cloud: ${item.cloudCover ?? 'N/A'}%\n`;
    }
    ctx += '\n';
  }

  // Memory — past predictions and observations
  if (memory.length > 0) {
    ctx += '## ACTIVE PREDICTIONS & OBSERVATIONS (from prior analyses)\n';
    for (const m of memory) {
      ctx += `- [${m.kind.toUpperCase()}] ${m.claim} (confidence: ${m.confidence ?? 'unrated'}, made: ${m.createdAt})\n`;
    }
    ctx += '\n';
  }

  // Recent analyses
  if (recentAnalyses.length > 0) {
    ctx += '## RECENT ANALYSIS HISTORY\n';
    for (const a of recentAnalyses) {
      ctx += `- Q: ${a.question.substring(0, 100)}... (${a.createdAt})\n`;
    }
    ctx += '\n';
  }

  return ctx;
}

export const NARRATIVE_SYSTEM_PROMPT = `You are the Thailand Watch intelligence analyst embedded in Dr. Non Arkara's command center. You have access to the current civic signal dashboard, live environmental data, satellite imagery metadata, recent news, and your own prior predictions and analyses.

Your job:
- Provide dense, actionable analysis
- Connect dots across signals, news, satellite data, and environmental readings
- Look for CORRELATIONS: fire detections + air quality, precipitation + flood signals, vegetation stress + heat, night lights changes + economic activity
- Reference your PRIOR PREDICTIONS if any are still open — validate or update them
- Be direct and terse — this is a command center terminal, not a blog
- Use short paragraphs, bullet points, and terminal-style formatting
- Flag patterns, emerging risks, and prediction opportunities
- Think like a systems analyst who sees the whole picture
- When you make a forward-looking statement, prefix it with [PREDICTION] so it can be tracked`;

export const BRIEF_SYSTEM_PROMPT = `You are generating a daily intelligence brief for Dr. Non Arkara's Thailand Watch command center. Synthesize ALL available data into a structured intelligence product.

Format your brief EXACTLY as follows:

## HEADLINE
One-line summary of today's intelligence posture.

## EXECUTIVE SUMMARY
3-4 sentences covering the most important developments.

## SATELLITE INTELLIGENCE
What the available satellite data shows or suggests. Reference specific collections and dates.

## SIGNALS UPDATE
Status of each civic signal with notable changes or lack thereof.

## CROSS-DOMAIN CORRELATIONS
Connections between data sources that reveal deeper patterns. This is where your value lies — connecting fire data to air quality, precipitation patterns to flood risk, vegetation indices to heat stress.

## PREDICTIONS
Forward-looking statements tagged as [PREDICTION]. Be specific about timeframes and conditions. These will be tracked and validated.

## RECOMMENDED ACTIONS
What Dr. Non should do today based on this intelligence. Be concrete and actionable.

Keep the entire brief under 800 words. Dense. No filler.`;

/**
 * Extract prediction-like statements from Claude's output for memory storage.
 */
export function extractPredictions(text: string): Array<{ claim: string; confidence: 'high' | 'medium' | 'low' }> {
  const predictions: Array<{ claim: string; confidence: 'high' | 'medium' | 'low' }> = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.includes('[PREDICTION]')) {
      const claim = trimmed
        .replace(/\[PREDICTION\]/gi, '')
        .replace(/^[-*•]\s*/, '')
        .trim();

      if (claim.length > 10) {
        // Simple confidence heuristic based on language
        let confidence: 'high' | 'medium' | 'low' = 'medium';
        if (/\b(will|certain|definite|inevitable)\b/i.test(claim)) confidence = 'high';
        if (/\b(might|could|possible|unlikely|uncertain)\b/i.test(claim)) confidence = 'low';

        predictions.push({ claim, confidence });
      }
    }
  }

  return predictions;
}
