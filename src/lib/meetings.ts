import { getDb } from '@/lib/db';

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

function parseJsonArray<T>(raw: string, fallback: T[] = []): T[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function buildMeetingTitle(transcript: string) {
  const normalized = transcript.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return 'Meeting mode';
  }

  return normalized.length > 72 ? `${normalized.slice(0, 69)}...` : normalized;
}

function extractTranscriptPreview(transcript: string) {
  const normalized = transcript.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return 'No transcript yet.';
  }

  return normalized.length > 180 ? `${normalized.slice(0, 177)}...` : normalized;
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

function mapMeetingRow(
  row:
    | {
        id: number;
        user_id: number;
        title: string;
        status: MeetingSessionStatus;
        language_mode: string;
        transcript: string;
        insights: string;
        suggested_responses: string;
        citations: string;
        started_at: string;
        created_at: string;
        updated_at: string;
        ended_at: string | null;
      }
    | undefined
): MeetingSessionDetail | null {
  if (!row) {
    return null;
  }

  const insights = parseJsonArray<MeetingInsight>(row.insights);
  const suggestedResponses = parseJsonArray<MeetingSuggestedResponse>(row.suggested_responses);
  const citations = parseJsonArray<MeetingCitation>(row.citations);

  return {
    id: row.id,
    userId: row.user_id,
    title: row.title || 'Meeting mode',
    status: row.status,
    languageMode: row.language_mode,
    transcript: row.transcript,
    transcriptPreview: extractTranscriptPreview(row.transcript),
    insightCount: insights.length,
    insights,
    suggestedResponses,
    citations,
    startedAt: row.started_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    endedAt: row.ended_at,
  };
}

function insertMeetingEvent(
  sessionId: number,
  eventType: MeetingSessionEvent['eventType'],
  payload: Record<string, unknown>
) {
  const db = getDb();
  db.prepare(
    `INSERT INTO meeting_session_events (session_id, event_type, payload)
     VALUES (?, ?, ?)`
  ).run(sessionId, eventType, JSON.stringify(payload));
}

function getOwnedMeetingSessionRow(userId: number, sessionId: number) {
  const db = getDb();
  return db
    .prepare(
      `SELECT
         id,
         user_id,
         title,
         status,
         language_mode,
         transcript,
         insights,
         suggested_responses,
         citations,
         started_at,
         created_at,
         updated_at,
         ended_at
       FROM meeting_sessions
       WHERE id = ? AND user_id = ?`
    )
    .get(sessionId, userId) as
    | {
        id: number;
        user_id: number;
        title: string;
        status: MeetingSessionStatus;
        language_mode: string;
        transcript: string;
        insights: string;
        suggested_responses: string;
        citations: string;
        started_at: string;
        created_at: string;
        updated_at: string;
        ended_at: string | null;
      }
    | undefined;
}

export function createMeetingSession(userId: number, languageMode = 'th-en') {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO meeting_sessions (user_id, title, status, language_mode)
       VALUES (?, ?, 'listening', ?)`
    )
    .run(userId, 'Meeting mode', languageMode);

  const sessionId = Number(result.lastInsertRowid);
  insertMeetingEvent(sessionId, 'status', { status: 'listening' });
  return getMeetingSessionByIdForUser(userId, sessionId);
}

export function appendMeetingTranscriptChunk(userId: number, sessionId: number, text: string) {
  const db = getDb();
  const row = getOwnedMeetingSessionRow(userId, sessionId);

  if (!row) {
    return null;
  }

  if (row.status === 'finished') {
    throw new Error('This meeting session is already finished.');
  }

  const chunk = text.trim();
  if (!chunk) {
    return mapMeetingRow(row);
  }

  const transcript = row.transcript.trim() ? `${row.transcript.trim()}\n${chunk}` : chunk;
  const title = buildMeetingTitle(transcript);

  db.prepare(
    `UPDATE meeting_sessions
     SET transcript = ?, title = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`
  ).run(transcript, title, sessionId, userId);

  insertMeetingEvent(sessionId, 'transcript', {
    text: chunk,
    transcript,
  });

  return getMeetingSessionByIdForUser(userId, sessionId);
}

export function updateMeetingSessionInsights(
  userId: number,
  sessionId: number,
  insights: MeetingInsight[],
  suggestedResponses: MeetingSuggestedResponse[]
) {
  const db = getDb();
  const row = getOwnedMeetingSessionRow(userId, sessionId);

  if (!row) {
    return null;
  }

  if (row.status === 'finished') {
    throw new Error('This meeting session is already finished.');
  }

  const citations = dedupeCitations([
    ...insights.flatMap(insight => insight.citations),
    ...suggestedResponses.flatMap(response => response.citations),
  ]);

  db.prepare(
    `UPDATE meeting_sessions
     SET status = 'listening',
         insights = ?,
         suggested_responses = ?,
         citations = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`
  ).run(
    JSON.stringify(insights),
    JSON.stringify(suggestedResponses),
    JSON.stringify(citations),
    sessionId,
    userId
  );

  insertMeetingEvent(sessionId, 'insight', {
    insights,
  });
  insertMeetingEvent(sessionId, 'response', {
    suggestedResponses,
  });

  return getMeetingSessionByIdForUser(userId, sessionId);
}

export function setMeetingSessionStatus(
  userId: number,
  sessionId: number,
  status: Extract<MeetingSessionStatus, 'listening' | 'processing'>
) {
  const db = getDb();
  const result = db
    .prepare(
      `UPDATE meeting_sessions
       SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ? AND status != 'finished'`
    )
    .run(status, sessionId, userId);

  if (result.changes === 0) {
    return null;
  }

  insertMeetingEvent(sessionId, 'status', { status });
  return getMeetingSessionByIdForUser(userId, sessionId);
}

export function finishMeetingSession(userId: number, sessionId: number) {
  const db = getDb();
  const row = getOwnedMeetingSessionRow(userId, sessionId);
  if (!row) {
    return null;
  }

  const title = buildMeetingTitle(row.transcript);
  db.prepare(
    `UPDATE meeting_sessions
     SET title = ?, status = 'finished', ended_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`
  ).run(title, sessionId, userId);

  insertMeetingEvent(sessionId, 'status', { status: 'finished' });
  return getMeetingSessionByIdForUser(userId, sessionId);
}

export function getMeetingSessionByIdForUser(userId: number, sessionId: number) {
  return mapMeetingRow(getOwnedMeetingSessionRow(userId, sessionId));
}

export function listMeetingSessionsForUser(userId: number, limit = 8): MeetingSessionSummary[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT
         id,
         user_id,
         title,
         status,
         language_mode,
         transcript,
         insights,
         suggested_responses,
         citations,
         started_at,
         created_at,
         updated_at,
         ended_at
       FROM meeting_sessions
       WHERE user_id = ?
       ORDER BY updated_at DESC, id DESC
       LIMIT ?`
    )
    .all(userId, limit) as Array<{
    id: number;
    user_id: number;
    title: string;
    status: MeetingSessionStatus;
    language_mode: string;
    transcript: string;
    insights: string;
    suggested_responses: string;
    citations: string;
    started_at: string;
    created_at: string;
    updated_at: string;
    ended_at: string | null;
  }>;

  return rows
    .map(row => mapMeetingRow(row))
    .filter((session): session is MeetingSessionDetail => session !== null)
    .map(session => ({
      id: session.id,
      title: session.title,
      status: session.status,
      transcriptPreview: session.transcriptPreview,
      insightCount: session.insightCount,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      endedAt: session.endedAt,
    }));
}

export function countMeetingSessionsForUser(userId: number) {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT COUNT(*) as count
       FROM meeting_sessions
       WHERE user_id = ?`
    )
    .get(userId) as { count: number };

  return row.count;
}

export function listMeetingSessionEventsAfterId(userId: number, sessionId: number, afterId = 0) {
  const session = getOwnedMeetingSessionRow(userId, sessionId);
  if (!session) {
    return null;
  }

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, session_id, event_type, payload, created_at
       FROM meeting_session_events
       WHERE session_id = ? AND id > ?
       ORDER BY id ASC`
    )
    .all(sessionId, afterId) as Array<{
    id: number;
    session_id: number;
    event_type: MeetingSessionEvent['eventType'];
    payload: string;
    created_at: string;
  }>;

  return rows.map(row => ({
    id: row.id,
    sessionId: row.session_id,
    eventType: row.event_type,
    payload: JSON.parse(row.payload) as Record<string, unknown>,
    createdAt: row.created_at,
  }));
}
