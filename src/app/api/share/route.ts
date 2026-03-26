import { NextRequest } from 'next/server';
import { trackEvent } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as {
    kind: 'lab' | 'watch_signal' | 'daily_brief';
    mode?: string;
    summary?: string;
    title?: string;
    geography?: string;
    status?: string;
    metricText?: string;
    trendText?: string;
    whatToDo?: string;
    watchouts?: string[];
    scores?: { logic?: number; clarity?: number };
    nonism?: string;
  } | null;

  if (!body?.kind) {
    return Response.json({ error: 'Invalid share request' }, { status: 400 });
  }

  await trackEvent('share', {
    kind: body.kind,
    mode: body.mode ?? null,
    geography: body.geography ?? null,
    timestamp: new Date().toISOString(),
  });

  let shareText = '';

  const logicPct = body.scores?.logic ? Math.round(body.scores.logic * 100) : null;
  const clarityPct = body.scores?.clarity ? Math.round(body.scores.clarity * 100) : null;

  if (body.kind === 'lab') {
    if (!body.mode || !body.summary) {
      return Response.json({ error: 'Mode and summary are required for lab sharing.' }, { status: 400 });
    }

    const modeLabels: Record<string, string> = {
      think: 'Stress-tested my thinking',
      communicate: 'Sharpened my communication',
      reflect: 'Reflected on my thoughts',
    };

    shareText = `${modeLabels[body.mode] || 'Explored ideas'} on DrNon\n\n`;
    shareText += `"${body.summary.slice(0, 180)}${body.summary.length > 180 ? '...' : ''}"\n\n`;

    if (logicPct !== null) shareText += `Logic: ${logicPct}/100 `;
    if (clarityPct !== null) shareText += `Clarity: ${clarityPct}/100`;
    if (logicPct !== null || clarityPct !== null) shareText += '\n\n';

    if (body.nonism) {
      shareText += `Nonism: "${body.nonism}"\n\n`;
    }
  }

  if (body.kind === 'watch_signal') {
    if (!body.title || !body.summary || !body.status || !body.whatToDo) {
      return Response.json(
        { error: 'Title, summary, status, and next step are required for watch signal sharing.' },
        { status: 400 }
      );
    }

    shareText = `Thailand Watch: ${body.title}\n\n`;
    shareText += `Status: ${body.status.toUpperCase()}\n`;
    if (body.metricText) shareText += `${body.metricText}\n`;
    if (body.trendText) shareText += `${body.trendText}\n`;
    shareText += `\n${body.summary.slice(0, 180)}${body.summary.length > 180 ? '...' : ''}\n\n`;
    shareText += `What to do: ${body.whatToDo.slice(0, 140)}${body.whatToDo.length > 140 ? '...' : ''}\n\n`;
  }

  if (body.kind === 'daily_brief') {
    if (!body.title || !body.summary) {
      return Response.json({ error: 'Title and summary are required for brief sharing.' }, { status: 400 });
    }

    shareText = `${body.title}\n\n`;
    shareText += `${body.summary.slice(0, 240)}${body.summary.length > 240 ? '...' : ''}\n\n`;
    if (body.watchouts?.length) {
      shareText += `Watch next: ${body.watchouts.slice(0, 3).join(' | ')}\n\n`;
    }
  }

  shareText += `Signal over bullshit.\ndrnon.app${body.kind === 'lab' ? '/access' : '/watch'}`;

  const encoded = encodeURIComponent(shareText);
  const shareUrls = {
    twitter: `https://x.com/intent/tweet?text=${encoded}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      `https://drnon.app${body.kind === 'lab' ? '/access' : '/watch'}`
    )}&summary=${encoded}`,
    copy: shareText,
  };

  return Response.json({ shareText, shareUrls });
}
