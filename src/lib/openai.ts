import type { MeetingCitation } from '@/lib/meetings';

const OPENAI_API_BASE = 'https://api.openai.com/v1';
const TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe';
const SEARCH_MODEL = process.env.OPENAI_SEARCH_MODEL || 'gpt-5-mini';

interface OpenAITextAnnotation {
  type?: string;
  url?: string;
  title?: string;
}

interface OpenAIMessageContent {
  type?: string;
  text?: string;
  annotations?: OpenAITextAnnotation[];
}

interface OpenAIResponseOutputItem {
  type?: string;
  content?: OpenAIMessageContent[];
}

function getApiKey() {
  return process.env.OPENAI_API_KEY || null;
}

export function isOpenAIConfigured() {
  return Boolean(getApiKey());
}

async function callOpenAI<T>(path: string, init: RequestInit): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured.');
  }

  const response = await fetch(`${OPENAI_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `OpenAI request failed with ${response.status}.`);
  }

  return (await response.json()) as T;
}

export async function transcribeAudioChunk(args: {
  audioBase64: string;
  mimeType: string;
}) {
  const binary = Buffer.from(args.audioBase64, 'base64');
  const blob = new Blob([binary], {
    type: args.mimeType || 'audio/webm',
  });
  const formData = new FormData();
  formData.append('file', blob, 'meeting-chunk.webm');
  formData.append('model', TRANSCRIBE_MODEL);
  formData.append(
    'prompt',
    'Transcribe mixed Thai and English faithfully. Keep names, numbers, and code-switching intact.'
  );
  formData.append('response_format', 'json');

  const payload = await callOpenAI<{ text?: string }>('/audio/transcriptions', {
    method: 'POST',
    body: formData,
  });

  return typeof payload.text === 'string' ? payload.text.trim() : '';
}

export async function searchMeetingContext(query: string): Promise<{
  summary: string;
  citations: MeetingCitation[];
} | null> {
  if (!getApiKey() || !query.trim()) {
    return null;
  }

  const payload = await callOpenAI<{
    output_text?: string;
    output?: OpenAIResponseOutputItem[];
  }>('/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: SEARCH_MODEL,
      reasoning: {
        effort: 'low',
      },
      tools: [
        {
          type: 'web_search',
          user_location: {
            type: 'approximate',
            approximate: {
              country: 'TH',
              city: 'Bangkok',
              region: 'Bangkok',
            },
          },
        },
      ],
      tool_choice: 'auto',
      input: `Find the most relevant current context for this meeting snippet. Return a short factual answer.\n\n${query}`,
    }),
  });

  const outputText = payload.output_text?.trim();
  const citations = (payload.output || [])
    .flatMap(item => item.content || [])
    .flatMap(content => content.annotations || [])
    .filter(annotation => annotation.type === 'url_citation' && typeof annotation.url === 'string')
    .map(annotation => ({
      label: annotation.title || 'Web citation',
      url: annotation.url as string,
      note: 'OpenAI web search',
    }));

  if (!outputText) {
    return null;
  }

  return {
    summary: outputText,
    citations,
  };
}
