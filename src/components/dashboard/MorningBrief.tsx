'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface StoredBrief {
  id: number;
  headline: string;
  content: string;
  generatedAt: string;
}

interface MorningBriefProps {
  fallbackHeadline?: string;
  fallbackSummary?: string;
  fallbackWatchouts?: string[];
}

export default function MorningBrief({
  fallbackHeadline,
  fallbackSummary,
  fallbackWatchouts,
}: MorningBriefProps) {
  const [brief, setBrief] = useState<StoredBrief | null>(null);
  const [streamedContent, setStreamedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/watch/brief/latest');
        const data = await res.json();
        if (data.brief) setBrief(data.brief);
      } catch { /* silent */ }
      finally { setLoaded(true); }
    })();
  }, []);

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = contentRef.current.scrollHeight;
  }, [streamedContent]);

  const generate = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setStreamedContent('');
    try {
      const res = await fetch('/api/watch/brief', { method: 'POST' });
      if (!res.ok || !res.body) { setStreamedContent(`// ERROR: ${res.status}`); setIsGenerating(false); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '', full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const payload = line.slice(6);
            if (payload === '[DONE]') continue;
            try { const p = JSON.parse(payload); if (p.text) { full += p.text; setStreamedContent(full); } } catch {}
          }
        }
      }
      const latestRes = await fetch('/api/watch/brief/latest');
      const latestData = await latestRes.json();
      if (latestData.brief) setBrief(latestData.brief);
    } catch (err) {
      setStreamedContent(prev => prev + `\n// ERROR: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally { setIsGenerating(false); }
  }, [isGenerating]);

  const displayContent = isGenerating ? streamedContent : brief?.content;
  const displayTime = brief?.generatedAt
    ? new Date(brief.generatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null;

  // Fallback content from watch bundle
  const fallbackContent = fallbackHeadline
    ? `BRIEF: ${fallbackHeadline}\n\n${fallbackSummary || ''}\n\nWATCH NEXT:\n${(fallbackWatchouts || []).map((w, i) => `${String(i + 1).padStart(2, '0')}. ${w}`).join('\n')}`
    : null;

  return (
    <div className="cmd-panel p-2 flex flex-col overflow-hidden h-full">
      <div className="flex items-center justify-between shrink-0">
        <div className="font-mono text-[6px] uppercase tracking-[0.3em] text-green-700">{'// '}MORNING_BRIEF</div>
        <div className="flex items-center gap-1.5">
          {displayTime && !isGenerating && <span className="font-mono text-[5px] text-green-900">{displayTime}</span>}
          <button onClick={generate} disabled={isGenerating}
            className="font-mono text-[6px] uppercase tracking-[0.2em] px-1.5 py-0.5 border border-green-900/20 text-green-600 hover:text-green-400 hover:border-green-600/30 transition-colors disabled:opacity-30">
            {isGenerating ? 'GENERATING...' : 'GENERATE'}
          </button>
        </div>
      </div>
      <div ref={contentRef} className="mt-1 flex-1 overflow-y-auto thin-scroll min-h-0">
        {displayContent ? (
          <pre className="font-mono text-[7px] leading-[11px] text-green-400/80 whitespace-pre-wrap break-words">
            {displayContent}
            {isGenerating && <span className="signal-pulse">_</span>}
          </pre>
        ) : fallbackContent ? (
          <pre className="font-mono text-[7px] leading-[11px] text-green-500/60 whitespace-pre-wrap break-words">
            {fallbackContent}
          </pre>
        ) : loaded ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <div className="font-mono text-[8px] text-green-900">// AWAITING DATA</div>
          </div>
        ) : (
          <div className="font-mono text-[7px] text-green-900">// LOADING...</div>
        )}
      </div>
    </div>
  );
}
