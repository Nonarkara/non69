import { getClient } from '@/lib/db';

export type MeetingSessionStatus = 'listening' | 'processing' | 'finished';

export interface MeetingCitation {
  label: string;
  url: string;
  note: string;
}

export interface MeetingInsight {
  id: string;
  kind: 'claim' | 'why_it_matters' | 'comparison' | 'source';
  title: string;
  body: string;
  tone: 'neutral' | 'risk' | 'action' | 'macro';
  citations: MeetingCitation[];
}

export interface MeetingSuggestedResponse {
  id: string;
  text: string;
  citations: MeetingCitation[];
}

export interface MeetingSessionSummary {
  id: number;
  title: string;
  status: MeetingSessionStatus;
  transcriptPreview: string;
  insightCount: number;
  createdAt: string;
  updatedAt: string;
  endedAt: string | null;
}

export interface MeetingSessionDetail extends MeetingSessionSummary {
  userId: number;
  languageMode: string;
  transcript: string;
  insights: MeetingInsight[];
  suggestedResponses: MeetingSuggestedResponse[];
  citations: MeetingCitation[];
  startedAt: string;
}

export interface MeetingSessionEvent {
  id: number;
  sessionId: number;
  eventType: 'status' | 'transcript' | 'insight' | 'response';
  payload: Record<string, unknown>;
  createdAt: string;
}

function parseJsonArray<T>(raw: string | unknown, fallback: T[] = []): T[] {
  try {
    const str = typeof raw === 'string' ? raw : JSON.stringify(raw);
    const parsed = JSON.parse(str) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function buildMeetingTitle(transcript: string) {
  const normalized = transcript.replace(/\s+/g, ' ').trim();
  if (!normalized) return 'Meeting mode';
  return normalized.length > 72 ? `${normalized.slice(0, 69)}...` : normalized;
}

function extractTranscriptPreview(transcript: string) {
  const normalized = transcript.replace(/\s+/g, ' ').trim();
  if (!normalized) return 'No transcript yet.';
  return normalized.length > 180 ? `${normalized.slice(0, 177)}...` : normalized;
}

function dedupeCitations(citations: MeetingCitation[]) {
  const seen = new Set<string>();
  return citations.filter(citation => {
    const key = `${citation.label}|${citation.url}|${citation.note}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mapMeetingRow(row: Record<string, unknown> | undefined): MeetingSessionDetail | null {
  if (!row) return null;

  const insights = parseJsonArray<MeetingInsight>(row.insights as string);
  const suggestedResponses = parseJsonArray<MeetingSuggestedResponse>(row.suggested_responses as string);
  const citations = parseJsonArray<MeetingCitation>(row.citations as string);

  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    title: String(row.title || 'Meeting mode'),
    status: String(row.status) as MeetingSessionStatus,
    languageMode: String(row.language_mode),
    transcript: String(row.transcript ?? ''),
    transcriptPreview: extractTranscriptPreview(String(row.transcript ?? '')),
    insightCount: insights.length,
    insights,
    suggestedResponses,
    citations,
    startedAt: String(row.started_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    endedAt: row.ended_at ? String(row.ended_at) : null,
  };
}

async function insertMeetingEvent(
  sessionId: number,
  eventType: MeetingSessionEvent['eventType'],
  payload: Record<string, unknown>
) {
  await getClient().execute({
    sql: `INSERT INTO meeting_session_events (session_id, event_type, payload) VALUES (?, ?, ?)`,
    args: [sessionId, eventType, JSON.stringify(payload)],
  });
}

async function getOwnedMeetingSessionRow(userId: number, sessionId: number) {
  const { rows } = await getClient().execute({
    sql: `SELECT id, user_id, title, status, language_mode, transcript, insights, suggested_responses, citations, started_at, created_at, updated_at, ended_at
          FROM meeting_sessions WHERE id = ? AND user_id = ?`,
    args: [sessionId, userId],
  });
  return rows[0] as Record<string, unknown> | undefined;
}

export async function createMeetingSession(userId: number, languageMode = 'th-en') {
  const result = await getClient().execute({
    sql: `INSERT INTO meeting_sessions (user_id, title, status, language_mode) VALUES (?, ?, 'listening', ?)`,
    args: [userId, 'Meeting mode', languageMode],
  });
  const sessionId = Number(result.lastInsertRowid);
  await insertMeetingEvent(sessionId, 'status', { status: 'listening' });
  return await getMeetingSessionByIdForUser(userId, sessionId);
}

export async function appendMeetingTranscriptChunk(userId: number, sessionId: number, text: string) {
  const row = await getOwnedMeetingSessionRow(userId, sessionId);
  if (!row) return null;
  if (String(row.status) === 'finished') throw new Error('This meeting session is already finished.');

  const chunk = text.trim();
  if (!chunk) return mapMeetingRow(row);

  const prev = String(row.transcript ?? '').trim();
  const transcript = prev ? `${prev}\n${chunk}` : chunk;
  const title = buildMeetingTitle(transcript);

  await getClient().execute({
    sql: `UPDATE meeting_sessions SET transcript = ?, title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`,
    args: [transcript, title, sessionId, userId],
  });

  await insertMeetingEvent(sessionId, 'transcript', { text: chunk, transcript });
  return await getMeetingSessionByIdForUser(userId, sessionId);
}

export async function updateMeetingSessionInsights(
  userId: number,
  sessionId: number,
  insights: MeetingInsight[],
  suggestedResponses: MeetingSuggestedResponse[]
) {
  const row = await getOwnedMeetingSessionRow(userId, sessionId);
  if (!row) return null;
  if (String(row.status) === 'finished') throw new Error('This meeting session is already finished.');

  const citations = dedupeCitations([
    ...insights.flatMap(i => i.citations),
    ...suggestedResponses.flatMap(r => r.citations),
  ]);

  await getClient().execute({
    sql: `UPDATE meeting_sessions SET status = 'listening', insights = ?, suggested_responses = ?, citations = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`,
    args: [JSON.stringify(insights), JSON.stringify(suggestedResponses), JSON.stringify(citations), sessionId, userId],
  });

  await insertMeetingEvent(sessionId, 'insight', { insights });
  await insertMeetingEvent(sessionId, 'response', { suggestedResponses });
  return await getMeetingSessionByIdForUser(userId, sessionId);
}

export async function setMeetingSessionStatus(
  userId: number,
  sessionId: number,
  status: Extract<MeetingSessionStatus, 'listening' | 'processing'>
) {
  const result = await getClient().execute({
    sql: `UPDATE meeting_sessions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? AND status != 'finished'`,
    args: [status, sessionId, userId],
  });

  if (result.rowsAffected === 0) return null;

  await insertMeetingEvent(sessionId, 'status', { status });
  return await getMeetingSessionByIdForUser(userId, sessionId);
}

export async function finishMeetingSession(userId: number, sessionId: number) {
  const row = await getOwnedMeetingSessionRow(userId, sessionId);
  if (!row) return null;

  const title = buildMeetingTitle(String(row.transcript ?? ''));
  await getClient().execute({
    sql: `UPDATE meeting_sessions SET title = ?, status = 'finished', ended_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`,
    args: [title, sessionId, userId],
  });

  await insertMeetingEvent(sessionId, 'status', { status: 'finished' });
  return await getMeetingSessionByIdForUser(userId, sessionId);
}

export async function getMeetingSessionByIdForUser(userId: number, sessionId: number) {
  return mapMeetingRow(await getOwnedMeetingSessionRow(userId, sessionId));
}

export async function listMeetingSessionsForUser(userId: number, limit = 8): Promise<MeetingSessionSummary[]> {
  const { rows } = await getClient().execute({
    sql: `SELECT id, user_id, title, status, language_mode, transcript, insights, suggested_responses, citations, started_at, created_at, updated_at, ended_at
          FROM meeting_sessions WHERE user_id = ? ORDER BY updated_at DESC, id DESC LIMIT ?`,
    args: [userId, limit],
  });

  return (rows as Array<Record<string, unknown>>)
    .map(row => mapMeetingRow(row))
    .filter((s): s is MeetingSessionDetail => s !== null)
    .map(s => ({
      id: s.id,
      title: s.title,
      status: s.status,
      transcriptPreview: s.transcriptPreview,
      insightCount: s.insightCount,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      endedAt: s.endedAt,
    }));
}

export async function countMeetingSessionsForUser(userId: number) {
  const { rows } = await getClient().execute({
    sql: `SELECT COUNT(*) as count FROM meeting_sessions WHERE user_id = ?`,
    args: [userId],
  });
  return Number(rows[0]?.count ?? 0);
}

export async function listMeetingSessionEventsAfterId(userId: number, sessionId: number, afterId = 0) {
  const session = await getOwnedMeetingSessionRow(userId, sessionId);
  if (!session) return null;

  const { rows } = await getClient().execute({
    sql: `SELECT id, session_id, event_type, payload, created_at FROM meeting_session_events WHERE session_id = ? AND id > ? ORDER BY id ASC`,
    args: [sessionId, afterId],
  });

  return (rows as Array<Record<string, unknown>>).map(row => ({
    id: Number(row.id),
    sessionId: Number(row.session_id),
    eventType: String(row.event_type) as MeetingSessionEvent['eventType'],
    payload: JSON.parse(String(row.payload)) as Record<string, unknown>,
    createdAt: String(row.created_at),
  }));
}
