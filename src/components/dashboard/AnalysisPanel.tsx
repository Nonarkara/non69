'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export default function AnalysisPanel() {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const responseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [response]);

  const handleSubmit = useCallback(async () => {
    if (!question.trim() || isStreaming) return;

    setIsStreaming(true);
    setResponse('');
    const q = question;
    setQuestion('');

    try {
      const res = await fetch('/api/watch/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });

      if (!res.ok || !res.body) {
        setResponse(`// ERROR: ${res.status} ${res.statusText}`);
        setIsStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

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
            try {
              const parsed = JSON.parse(payload);
              if (parsed.text) {
                setResponse(prev => prev + parsed.text);
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      }
    } catch (err) {
      setResponse(prev => prev + `\n// ERROR: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setIsStreaming(false);
    }
  }, [question, isStreaming]);

  return (
    <div className="cmd-panel p-2 flex flex-col overflow-hidden min-h-0">
      <div className="text-[6px] uppercase tracking-[0.3em] text-green-700 shrink-0">{'// '}ANALYSIS</div>
      <div ref={responseRef} className="mt-1 flex-1 overflow-y-auto thin-scroll min-h-0">
        {response ? (
          <pre className="text-[7px] leading-3 text-green-400/80 whitespace-pre-wrap break-words">{response}{isStreaming && <span className="signal-pulse">_</span>}</pre>
        ) : (
          <div className="text-[6px] text-green-900">{isStreaming ? '// CONNECTING...' : '// QUERY CLAUDE'}</div>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-1 border-t border-green-900/15 pt-1 mt-1">
        <span className="text-[8px] text-green-600">{'>'}</span>
        <input type="text" value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }} disabled={isStreaming} placeholder="query..." className="flex-1 bg-transparent text-[7px] text-green-400 placeholder:text-green-900 outline-none caret-green-400 disabled:opacity-50" />
      </div>
    </div>
  );
}
