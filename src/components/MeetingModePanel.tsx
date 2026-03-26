'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  MeetingInsight,
  MeetingSessionDetail,
  MeetingSuggestedResponse,
} from '@/lib/meetings';

type DashboardMeetingStatus = 'idle' | 'listening' | 'processing' | 'saved' | 'error';

interface MeetingCapabilities {
  serverTranscription: boolean;
  webResearch: boolean;
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly 0: { transcript: string };
}

interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

const statusTone: Record<DashboardMeetingStatus, string> = {
  idle: 'text-neutral-500',
  listening: 'text-red-300',
  processing: 'text-amber-300',
  saved: 'text-emerald-300',
  error: 'text-red-300',
};

function dispatchMeetingStatus(status: DashboardMeetingStatus) {
  window.dispatchEvent(new CustomEvent('drnon:meeting-status', { detail: { status } }));
}

function extractSessionPayload(payload: unknown): MeetingSessionDetail | null {
  if (!payload || typeof payload !== 'object' || !('id' in payload)) {
    return null;
  }

  return payload as MeetingSessionDetail;
}

export default function MeetingModePanel() {
  const router = useRouter();
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const sendQueueRef = useRef(Promise.resolve());
  const mountedRef = useRef(true);
  const stoppingRef = useRef(false);
  const statusRef = useRef<DashboardMeetingStatus>('idle');
  const [supported, setSupported] = useState(false);
  const [checked, setChecked] = useState(false);
  const [status, setStatus] = useState<DashboardMeetingStatus>('idle');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [capabilities, setCapabilities] = useState<MeetingCapabilities>({
    serverTranscription: false,
    webResearch: false,
  });
  const [transcript, setTranscript] = useState('');
  const [insights, setInsights] = useState<MeetingInsight[]>([]);
  const [suggestedResponses, setSuggestedResponses] = useState<MeetingSuggestedResponse[]>([]);
  const [error, setError] = useState('');
  const [savedUrl, setSavedUrl] = useState('');

  const updateStatus = (nextStatus: DashboardMeetingStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
    dispatchMeetingStatus(nextStatus);
  };

  useEffect(() => {
    mountedRef.current = true;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupported(Boolean(Recognition));
    setChecked(true);
    dispatchMeetingStatus('idle');

    return () => {
      mountedRef.current = false;
      recognitionRef.current?.abort();
      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach(track => track.stop());
      eventSourceRef.current?.close();
      dispatchMeetingStatus('idle');
    };
  }, []);

  function closeStream() {
    if (eventSourceRef.current) {
      eventSourceRef.current.onmessage = null;
      eventSourceRef.current.onerror = null;
      eventSourceRef.current.close();
    }
    eventSourceRef.current = null;
  }

  function stopAudioCapture() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;
  }

  function openStream(nextSessionId: number) {
    closeStream();
    const source = new EventSource(`/api/meeting-sessions/${nextSessionId}/stream`);
    source.onmessage = event => {
      const payload = JSON.parse(event.data) as
        | {
            type: 'snapshot';
            session?: MeetingSessionDetail;
          }
        | {
            type: 'event';
            event?: {
              eventType?: string;
              payload?: Record<string, unknown>;
            };
          }
        | {
            type: 'error';
            error?: string;
          }
        | {
            type: 'ping';
          };

      if (payload.type === 'snapshot') {
        const session = extractSessionPayload(payload.session);
        if (session) {
          setTranscript(session.transcript || '');
          setInsights(session.insights || []);
          setSuggestedResponses(session.suggestedResponses || []);
        }
        return;
      }

      if (payload.type === 'error') {
        setError(payload.error || 'Meeting stream failed.');
        updateStatus('error');
        return;
      }

      if (payload.type !== 'event' || !payload.event) {
        return;
      }

      if (payload.event.eventType === 'transcript') {
        const nextTranscript = payload.event.payload?.transcript;
        if (typeof nextTranscript === 'string') {
          setTranscript(nextTranscript);
        }
        return;
      }

      if (payload.event.eventType === 'insight') {
        const nextInsights = payload.event.payload?.insights;
        if (Array.isArray(nextInsights)) {
          setInsights(nextInsights as MeetingInsight[]);
        }
        return;
      }

      if (payload.event.eventType === 'response') {
        const nextResponses = payload.event.payload?.suggestedResponses;
        if (Array.isArray(nextResponses)) {
          setSuggestedResponses(nextResponses as MeetingSuggestedResponse[]);
        }
        return;
      }

      if (payload.event.eventType === 'status') {
        const nextStatus = payload.event.payload?.status;
        if (nextStatus === 'listening') {
          updateStatus('listening');
        } else if (nextStatus === 'processing') {
          updateStatus('processing');
        } else if (nextStatus === 'finished') {
          updateStatus('saved');
        }
      }
    };

    source.onerror = () => {
      setError('Meeting stream disconnected.');
      updateStatus('error');
    };

    eventSourceRef.current = source;
  }

  async function sendChunk(text: string, nextSessionId: number) {
    const chunk = text.trim();
    if (!chunk) {
      return;
    }

    sendQueueRef.current = sendQueueRef.current.catch(() => undefined).then(async () => {
      const response = await fetch(`/api/meeting-sessions/${nextSessionId}/chunks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: chunk }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Could not process meeting chunk.');
      }
    });

    try {
      await sendQueueRef.current;
    } catch (chunkError) {
      if (mountedRef.current) {
        setError(chunkError instanceof Error ? chunkError.message : 'Meeting chunk failed.');
        updateStatus('error');
      }
    }
  }

  async function blobToBase64(blob: Blob) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }
    return btoa(binary);
  }

  async function sendAudioChunk(audioBase64: string, mimeType: string, nextSessionId: number) {
    sendQueueRef.current = sendQueueRef.current.catch(() => undefined).then(async () => {
      const response = await fetch(`/api/meeting-sessions/${nextSessionId}/chunks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64, mimeType }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Could not process audio chunk.');
      }
    });

    try {
      await sendQueueRef.current;
    } catch (chunkError) {
      if (mountedRef.current) {
        setError(chunkError instanceof Error ? chunkError.message : 'Audio chunk failed.');
        updateStatus('error');
      }
    }
  }

  function startRecognition(nextSessionId: number) {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setError('This browser does not expose SpeechRecognition.');
      updateStatus('error');
      return false;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'th-TH';

    recognition.onresult = event => {
      let finalText = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result?.isFinal) {
          finalText += `${result[0]?.transcript || ''} `;
        }
      }

      if (finalText.trim()) {
        void sendChunk(finalText, nextSessionId);
      }
    };

    recognition.onerror = event => {
      setError(event.error || 'Speech recognition failed.');
      updateStatus('error');
    };

    recognition.onend = () => {
      if (!stoppingRef.current && statusRef.current === 'listening') {
        recognition.start();
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      return true;
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'Could not start speech recognition.');
      updateStatus('error');
      return false;
    }
  }

  async function startAudioCapture(nextSessionId: number) {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType =
        ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(type =>
          MediaRecorder.isTypeSupported(type)
        ) || '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = event => {
        if (event.data.size === 0) {
          return;
        }

        void blobToBase64(event.data).then(base64 =>
          sendAudioChunk(base64, recorder.mimeType || event.data.type || mimeType || 'audio/webm', nextSessionId)
        );
      };

      recorder.onerror = () => {
        setError('Audio recording failed.');
        updateStatus('error');
      };

      recorder.start(6000);
      return true;
    } catch (captureError) {
      setError(
        captureError instanceof Error ? captureError.message : 'Could not access the microphone.'
      );
      updateStatus('error');
      return false;
    }
  }

  async function handleStart() {
    setError('');
    setSavedUrl('');
    setTranscript('');
    setInsights([]);
    setSuggestedResponses([]);
    stoppingRef.current = false;

    const response = await fetch('/api/meeting-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ languageMode: 'th-en' }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.session?.id) {
      setError(payload?.error || 'Could not start Meeting Mode.');
      updateStatus('error');
      return;
    }

    setCapabilities({
      serverTranscription: Boolean(payload?.capabilities?.serverTranscription),
      webResearch: Boolean(payload?.capabilities?.webResearch),
    });

    const nextSessionId = payload.session.id as number;
    setSessionId(nextSessionId);
    openStream(nextSessionId);
    const started =
      Boolean(payload?.capabilities?.serverTranscription) &&
      (await startAudioCapture(nextSessionId));

    const fallbackStarted = started ? true : startRecognition(nextSessionId);
    if (fallbackStarted) {
      updateStatus('listening');
    }
  }

  async function handleStop() {
    if (!sessionId) {
      return;
    }

    stoppingRef.current = true;
    recognitionRef.current?.stop();
    let recorderStopped = Promise.resolve();
    if (mediaRecorderRef.current?.state === 'recording') {
      const recorder = mediaRecorderRef.current;
      recorderStopped = new Promise(resolve => {
        const previousOnStop = recorder.onstop;
        recorder.onstop = event => {
          previousOnStop?.call(recorder, event);
          resolve(undefined);
        };
      });
      recorder.requestData();
    }
    stopAudioCapture();
    updateStatus('processing');

    try {
      await recorderStopped;
      await sendQueueRef.current;

      const response = await fetch(`/api/meeting-sessions/${sessionId}/finish`, {
        method: 'POST',
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.session?.id) {
        throw new Error(payload?.error || 'Could not finish Meeting Mode.');
      }

      const nextSavedUrl = `/profile/meetings/${sessionId}`;
      setSavedUrl(nextSavedUrl);
      updateStatus('saved');
      router.refresh();
    } catch (finishError) {
      setError(finishError instanceof Error ? finishError.message : 'Could not finish Meeting Mode.');
      updateStatus('error');
    } finally {
      closeStream();
    }
  }

  return (
    <section className="border border-neutral-900/90 bg-black/40 p-5 sm:p-6">
      <div className="flex flex-col gap-4 border-b border-neutral-900 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#d7d2c3]">Meeting mode</div>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight">JARVIS in the room</h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-300">
            Start the mic explicitly. Browser speech recognition handles Thai plus embedded English
            as the room moves when server transcription is unavailable. When an OpenAI key is present,
            the dashboard records audio chunks and transcribes them on the server instead.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className={`text-[11px] uppercase tracking-[0.22em] ${statusTone[status]}`}>
            {status}
          </div>
          {status === 'listening' ? (
            <button
              type="button"
              onClick={handleStop}
              className="border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200 transition-colors hover:bg-red-500/20"
            >
              Stop meeting
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStart}
              disabled={!checked || !supported}
              className="border border-[#d7d2c3]/30 bg-[#d7d2c3]/10 px-4 py-2 text-sm text-[#f5f1e7] transition-colors hover:bg-[#d7d2c3]/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Start meeting
            </button>
          )}
        </div>
      </div>

      {!supported && checked && (
        <div className="mt-4 border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          This browser does not expose speech recognition. Chrome or Safari usually does.
        </div>
      )}

      {error && (
        <div className="mt-4 border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {savedUrl && (
        <div className="mt-4 border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          Session saved. <Link href={savedUrl} className="text-white underline">Open transcript</Link>
        </div>
      )}

      <div className="mt-5 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="border border-neutral-900/90 bg-black/30">
          <div className="border-b border-neutral-900 px-4 py-3 text-[11px] uppercase tracking-[0.22em] text-neutral-500">
            Transcript · {capabilities.serverTranscription ? 'server audio' : 'browser speech'}
          </div>
          <div className="max-h-[420px] overflow-y-auto px-4 py-4">
            {transcript ? (
              <p className="whitespace-pre-wrap text-sm leading-7 text-neutral-200">{transcript}</p>
            ) : (
              <p className="text-sm leading-7 text-neutral-500">
                The room is quiet for now. Once you start, transcript segments will stack here.
              </p>
            )}
          </div>
        </div>

        <div className="border border-neutral-900/90 bg-black/30">
          <div className="border-b border-neutral-900 px-4 py-3 text-[11px] uppercase tracking-[0.22em] text-neutral-500">
            Insight stack {capabilities.webResearch ? '· web-backed' : '· local sources'}
          </div>
          <div className="max-h-[420px] overflow-y-auto px-4 py-4">
            <div className="space-y-4">
              {insights.length === 0 ? (
                <div className="text-sm leading-7 text-neutral-500">
                  Claims, context, macro comparisons, and response lines land here as the session develops.
                </div>
              ) : (
                insights.map(insight => (
                  <article key={insight.id} className="border-b border-neutral-900 pb-4 last:border-b-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                        {insight.kind.replaceAll('_', ' ')}
                      </div>
                      <div className={`text-[11px] uppercase tracking-[0.18em] ${statusTone[insight.tone === 'risk' ? 'error' : insight.tone === 'action' ? 'saved' : insight.tone === 'macro' ? 'processing' : 'idle']}`}>
                        {insight.tone}
                      </div>
                    </div>
                    <h4 className="mt-2 text-lg font-semibold text-white">{insight.title}</h4>
                    <p className="mt-2 text-sm leading-7 text-neutral-300">{insight.body}</p>
                    {insight.citations.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {insight.citations.map(citation => (
                          <a
                            key={`${citation.label}-${citation.url}`}
                            href={citation.url}
                            target="_blank"
                            rel="noreferrer"
                            className="border border-neutral-900 px-2 py-1 text-[11px] uppercase tracking-[0.14em] text-neutral-400 transition-colors hover:border-neutral-700 hover:text-white"
                          >
                            {citation.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </article>
                ))
              )}
            </div>

            {suggestedResponses.length > 0 && (
              <div className="mt-6 border-t border-neutral-900 pt-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                  Suggested response lines
                </div>
                <div className="mt-3 space-y-3">
                  {suggestedResponses.map(response => (
                    <div key={response.id} className="border border-neutral-900/90 px-3 py-3">
                      <p className="text-sm leading-7 text-neutral-200">{response.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
