import { createClient, type Client, type Row } from '@libsql/client';
import fs from 'fs';
import path from 'path';

let client: Client | undefined;

export function getClient(): Client {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL || 'file:db/non69.db',
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

export type ConversationMode = 'think' | 'communicate' | 'reflect';

export interface ChatTranscriptMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface WatchSource {
  label: string;
  url: string;
  note: string;
}

export interface WatchSignal {
  slug: string;
  title: string;
  status: string;
  summary: string;
  whyItMatters: string;
  whatToDo: string;
  updatedAt: string;
  sources: WatchSource[];
  metricText: string;
  trendText: string;
}

export interface WatchBrief {
  headline: string;
  summary: string;
  watchouts: string[];
  updatedAt: string;
}

export interface WatchBriefInput {
  headline: string;
  summary: string;
  watchouts: string[];
}

export interface WatchSignalInput {
  slug: string;
  status: string;
  summary: string;
  whyItMatters: string;
  whatToDo: string;
  metricText: string;
  trendText: string;
  sources: WatchSource[];
}

export type WatchRevisionAction = 'publish' | 'rollback';

export interface WatchStatusSummary {
  worstStatus: string;
  counts: Record<string, number>;
}

export interface WatchBundle {
  geography: string;
  generatedAt: string;
  brief: WatchBrief;
  signals: WatchSignal[];
}

export interface WatchRevisionSummary {
  id: number;
  geography: string;
  version: number;
  action: WatchRevisionAction;
  headline: string;
  statusSummary: WatchStatusSummary;
  actor: {
    id: number;
    displayName: string;
  } | null;
  restoredFromRevisionId: number | null;
  restoredFromRevisionVersion: number | null;
  createdAt: string;
}

export interface WatchRevision extends WatchRevisionSummary {
  actorUserId: number;
  snapshot: WatchBundle;
}

export interface WatchPublishResult {
  bundle: WatchBundle;
  revision: WatchRevisionSummary;
}

export interface ConversationSummary {
  id: number;
  mode: ConversationMode;
  title: string;
  preview: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SavedWatchItemSummary {
  id: number;
  geography: string;
  itemKind: 'signal' | 'brief';
  itemSlug: string;
  title: string;
  summary: string;
  status: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface ContactRequestInput {
  name: string;
  email: string;
  organization?: string;
  useCase: string;
}

export interface ContactRequestSummary {
  id: number;
  name: string;
  email: string;
  organization: string;
  useCase: string;
  status: string;
  createdAt: string;
}

export interface PracticeRunInput {
  userId: number;
  tool: 'challenge' | 'arena' | 'simulate';
  itemId: string;
  title: string;
  summary: string;
  score?: number | null;
  localDay?: string;
  details?: Record<string, unknown>;
}

export interface PracticeRunSummary {
  id: number;
  tool: 'challenge' | 'arena' | 'simulate';
  itemId: string;
  title: string;
  summary: string;
  score: number | null;
  localDay: string;
  createdAt: string;
}

interface WatchSignalDefinition {
  id: number;
  slug: string;
  title: string;
  sortOrder: number;
}

interface CreateWatchRevisionInput {
  geography: string;
  action: WatchRevisionAction;
  snapshot: WatchBundle;
  actorUserId: number;
  actorDisplayName: string;
  restoredFromRevisionId?: number | null;
  createdAt?: string;
}

const WATCH_STATUS_ORDER: Record<string, number> = {
  high: 0,
  elevated: 1,
  active: 2,
  watch: 3,
  mixed: 4,
};

// ---------- initDb: schema + migrations + seeds ----------

export async function initDb() {
  const c = getClient();
  const schemaPath = path.join(process.cwd(), 'db', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  await c.executeMultiple(schema);
  await runMigrations(c);

  // Seed Nonisms if empty
  const { rows: countRows } = await c.execute('SELECT COUNT(*) as c FROM nonisms');
  if (Number(countRows[0].c) === 0) {
    await seedNonisms(c);
  }

  const { rows: watchRows } = await c.execute({
    sql: 'SELECT COUNT(*) as c FROM watch_signals WHERE geography = ?',
    args: ['th'],
  });
  if (Number(watchRows[0].c) === 0) {
    await seedWatchData(c);
  }
}

async function runMigrations(database: Client) {
  await ensureColumn(database, 'users', 'is_admin', 'INTEGER NOT NULL DEFAULT 0');

  const { rows } = await database.execute('SELECT COUNT(*) as c FROM users WHERE is_admin = 1');
  if (Number(rows[0].c) === 0) {
    await database.execute(
      `UPDATE users
       SET is_admin = 1
       WHERE id = (
         SELECT id
         FROM users
         ORDER BY id ASC
         LIMIT 1
       )`
    );
  }
}

async function ensureColumn(
  database: Client,
  tableName: string,
  columnName: string,
  columnDefinition: string
) {
  const { rows: columns } = await database.execute(`PRAGMA table_info(${tableName})`);
  if (columns.some(column => String(column.name) === columnName)) {
    return;
  }

  await database.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
}

async function getWatchSignalDefinitions(database: Client, geography: string): Promise<WatchSignalDefinition[]> {
  const { rows } = await database.execute({
    sql: `SELECT id, slug, title, sort_order as sortOrder
       FROM watch_signals
       WHERE geography = ? AND active = 1
       ORDER BY sort_order ASC, id ASC`,
    args: [geography],
  });

  return rows.map(row => ({
    id: Number(row.id),
    slug: String(row.slug),
    title: String(row.title),
    sortOrder: Number(row.sortOrder),
  }));
}

export function computeWatchStatusSummary(
  signals: Array<Pick<WatchSignal, 'status'>>
): WatchStatusSummary {
  const counts: Record<string, number> = {};

  for (const signal of signals) {
    counts[signal.status] = (counts[signal.status] || 0) + 1;
  }

  const worstStatus =
    Object.keys(counts).sort(
      (left, right) => (WATCH_STATUS_ORDER[left] ?? 99) - (WATCH_STATUS_ORDER[right] ?? 99)
    )[0] ?? 'mixed';

  return {
    worstStatus,
    counts,
  };
}

function parseWatchStatusSummary(raw: string): WatchStatusSummary {
  const parsed = JSON.parse(raw) as {
    worstStatus?: unknown;
    counts?: unknown;
  };

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof parsed.worstStatus !== 'string' ||
    !parsed.counts ||
    typeof parsed.counts !== 'object' ||
    Array.isArray(parsed.counts)
  ) {
    throw new Error('Corrupted watch revision status summary.');
  }

  const counts = Object.fromEntries(
    Object.entries(parsed.counts).map(([status, count]) => {
      if (typeof count !== 'number') {
        throw new Error('Corrupted watch revision status summary.');
      }

      return [status, count];
    })
  );

  return {
    worstStatus: parsed.worstStatus,
    counts,
  };
}

async function seedNonisms(database: Client) {
  const nonisms = [
    {
      text: "The power of logic is limitless. Sometimes the will alone cannot save you from yourself, but the power of logic will.",
      source: "Day 72: The Power of Logic",
      category: "logic",
      trigger_keywords: '["logic", "willpower", "habit", "addiction", "change"]'
    },
    {
      text: "We could live in a much better world if we can solve two problems: miscommunication and illogical thinking.",
      source: "Day 71: How to Change the World Part 1",
      category: "communication",
      trigger_keywords: '["communication", "world", "problem", "change", "society"]'
    },
    {
      text: "The unexamined life is not worth living. Take a step back, instead of moving forward, and carefully scrutinize the problem.",
      source: "Day 72: The Power of Logic",
      category: "reflection",
      trigger_keywords: '["reflection", "examine", "think", "pause", "problem"]'
    },
    {
      text: "You don't think yourself into confidence. You do. And you fail. A lot. And then you keep doing.",
      source: "Day 123: Confidence Is Built by Failing",
      category: "courage",
      trigger_keywords: '["confidence", "failure", "courage", "fear", "try"]'
    },
    {
      text: "Expertise isn't born from talent. It's born from patterns. And patterns are born from failure.",
      source: "Day 123: Confidence Is Built by Failing",
      category: "growth",
      trigger_keywords: '["expertise", "talent", "pattern", "learning", "growth"]'
    },
    {
      text: "Writing is essential to people who write to learn. When I write I think much more carefully.",
      source: "Day 1: What does writing do to me",
      category: "reflection",
      trigger_keywords: '["writing", "thinking", "learn", "reflect", "journal"]'
    },
    {
      text: "Our thought process is often both intertwined and non-linear. Language forces us to communicate through non-intertwined and linear systems. Language always simplifies our thoughts.",
      source: "Day 71: How to Change the World Part 1",
      category: "communication",
      trigger_keywords: '["language", "thought", "expression", "simplify", "complex"]'
    },
    {
      text: "We tend to think that something sounds simplistic simply because the message we receive is linear, leaving out many important messages. The absence of those messages is what makes us feel the idea is not comprehensible.",
      source: "Day 71: How to Change the World Part 1",
      category: "communication",
      trigger_keywords: '["simplistic", "misunderstand", "nuance", "meaning", "listen"]'
    },
    {
      text: "Perception might not be the thing that makes us unhappy, but caring too much for the perceptions of others on the thing that you call 'I' is what brings about pain, dissatisfaction, and discomfort.",
      source: "Day 4: Because We Are Living in the Best of All Possible Worlds",
      category: "philosophy",
      trigger_keywords: '["perception", "self", "ego", "happiness", "others"]'
    },
    {
      text: "Reflection is key: Even recalling negative feelings and emotions helps strengthen the sense of individual personhood.",
      source: "Day 2: Some More Reasons to Reflect",
      category: "reflection",
      trigger_keywords: '["reflection", "negative", "emotion", "strength", "self"]'
    },
    {
      text: "I have set the goal in life to not chase after money or fame, but after things that would give me the total feeling of contentment with my life.",
      source: "Day 71: How to Change the World Part 1",
      category: "philosophy",
      trigger_keywords: '["money", "fame", "contentment", "purpose", "meaning"]'
    },
    {
      text: "Know your damn material. Don't memorize words. Understand ideas. Deeply. If you can't explain it to a 10-year-old, you don't know it.",
      source: "Day 123: Confidence Is Built by Failing",
      category: "communication",
      trigger_keywords: '["knowledge", "understand", "explain", "depth", "clarity"]'
    },
    {
      text: "People don't want bullet points — they want stories. Nobody remembers your numbers. They remember the story.",
      source: "Day 123: Confidence Is Built by Failing",
      category: "communication",
      trigger_keywords: '["story", "narrative", "persuasion", "presentation", "connect"]'
    },
    {
      text: "The best depository of ethnographic knowledge isn't the field notes — but right here in our head.",
      source: "Day 3: Writing Stream of Consciousness",
      category: "reflection",
      trigger_keywords: '["knowledge", "memory", "intuition", "experience", "wisdom"]'
    },
    {
      text: "Health is the vehicle that carries you through life. If it breaks down, you're stranded.",
      source: "Day 124: The Only Thing That Matters",
      category: "philosophy",
      trigger_keywords: '["health", "body", "wellness", "priority", "foundation"]'
    }
  ];

  for (const n of nonisms) {
    await database.execute({
      sql: 'INSERT INTO nonisms (text, source, category, trigger_keywords) VALUES (?, ?, ?, ?)',
      args: [n.text, n.source, n.category, n.trigger_keywords],
    });
  }
}

async function seedWatchData(database: Client) {
  const signals = [
    {
      geography: 'th',
      slug: 'air-quality',
      title: 'Air Quality',
      description: 'PM2.5 and haze conditions affecting respiratory risk.',
      sortOrder: 1,
      status: 'elevated',
      summary:
        'Bangkok and several central provinces are sitting in a grey zone: not apocalypse, but bad enough to change how you move through the day if you have lungs worth protecting.',
      whyItMatters:
        'Air quality is the classic silent tax on city life. Productivity drops, symptoms rise, and vulnerable people pay first.',
      whatToDo:
        'Check district-level PM2.5 before longer outdoor trips, shift exercise indoors when the air turns, and keep a mask ready instead of pretending resilience is a filtration system.',
      metricText: 'PM2.5 hotspots remain above healthy thresholds in parts of Greater Bangkok.',
      trendText: 'Morning inversion is pushing conditions worse before midday.',
      updatedAt: '2026-03-24T08:30:00+07:00',
      sources: [
        { label: 'Air4Thai', url: 'https://www.air4thai.com/', note: 'National air quality monitoring' },
        { label: 'Bangkok Air Quality', url: 'https://www.bangkokairquality.com/', note: 'City-facing PM2.5 reporting' },
      ],
    },
    {
      geography: 'th',
      slug: 'heat-stress',
      title: 'Heat Stress',
      description: 'Heat index risk across dense urban areas.',
      sortOrder: 2,
      status: 'high',
      summary:
        'Thailand is running hot enough that the question is not comfort, it is function. Long exposure outside is becoming a planning mistake, not a badge of honor.',
      whyItMatters:
        'Heat stress hits workers, commuters, elderly residents, and school routines. It is a public health issue disguised as weather.',
      whatToDo:
        'Move outdoor errands earlier, carry water like it matters, and treat midday exposure as a risk management decision rather than background climate wallpaper.',
      metricText: 'Urban heat index remains in dangerous territory through the afternoon.',
      trendText: 'Persistent heat is extending later into the evening than usual.',
      updatedAt: '2026-03-24T08:30:00+07:00',
      sources: [
        { label: 'Thai Meteorological Department', url: 'https://www.tmd.go.th/', note: 'Weather outlook and heat advisories' },
        { label: 'Department of Health', url: 'https://www.anamai.moph.go.th/', note: 'Heat-health guidance' },
      ],
    },
    {
      geography: 'th',
      slug: 'flood-weather',
      title: 'Flood / Severe Weather',
      description: 'Heavy-rain and localized flood risk affecting mobility and safety.',
      sortOrder: 3,
      status: 'watch',
      summary:
        'Localized flooding remains the kind of thing that can turn a normal commute into a multi-hour insult. The point is not national drama; it is neighborhood disruption.',
      whyItMatters:
        'Short-duration severe weather breaks trust in transport timing, weakens street safety, and hits lower-lying communities hardest.',
      whatToDo:
        'Watch district-level alerts before evening travel, avoid low-lying shortcuts after heavy rain, and assume underpass routes fail first when drainage loses the fight.',
      metricText: 'Localized flood risk remains elevated in drainage-sensitive corridors.',
      trendText: 'Storm-driven disruption is episodic rather than system-wide.',
      updatedAt: '2026-03-24T08:30:00+07:00',
      sources: [
        { label: 'Thai Meteorological Department', url: 'https://www.tmd.go.th/', note: 'Rainfall and storm tracking' },
        { label: 'DDPM', url: 'https://www.disaster.go.th/', note: 'Disaster prevention and warning notices' },
      ],
    },
    {
      geography: 'th',
      slug: 'transit-disruption',
      title: 'Transit Disruption',
      description: 'Urban mobility reliability across rail and road corridors.',
      sortOrder: 4,
      status: 'mixed',
      summary:
        'Transit is functioning, but reliability is uneven. The difference between a decent day and a stupid day still comes down to whether a system tells you the truth early enough.',
      whyItMatters:
        'Mobility reliability determines whether people trust cities. Small disruptions cascade into missed work, missed care, and wasted hours.',
      whatToDo:
        'Check operator feeds before peak transfers, keep a backup route for cross-city trips, and do not trust a single mobility mode when the network looks fragile.',
      metricText: 'Peak-hour reliability is holding, but incidents continue to create uneven cross-network delays.',
      trendText: 'Road congestion and rail advisories remain choppy through commuter peaks.',
      updatedAt: '2026-03-24T08:30:00+07:00',
      sources: [
        { label: 'MRTA', url: 'https://www.mrta.co.th/', note: 'Rail system and transport announcements' },
        { label: 'BTS SkyTrain', url: 'https://www.bts.co.th/', note: 'Operator updates and service notices' },
      ],
    },
    {
      geography: 'th',
      slug: 'safety-incidents',
      title: 'Safety / Incident Signal',
      description: 'Public incident patterns that affect urban risk perception and movement.',
      sortOrder: 5,
      status: 'watch',
      summary:
        'No single national emergency, but enough scattered incidents and traffic-safety noise to justify paying attention instead of sleepwalking through the city.',
      whyItMatters:
        'Urban safety is cumulative. Repeated minor incidents change behavior, trust, and where people feel able to move.',
      whatToDo:
        'Use trusted incident feeds before late travel, favor well-lit transfer points, and factor event-driven congestion into safety as well as speed.',
      metricText: 'Incident chatter remains elevated around major roads and dense activity zones.',
      trendText: 'Risk is fragmented and local, not evenly distributed.',
      updatedAt: '2026-03-24T08:30:00+07:00',
      sources: [
        { label: 'Bangkok Metropolitan Police', url: 'https://www.metro.police.go.th/', note: 'Metropolitan police notices' },
        { label: 'DDPM', url: 'https://www.disaster.go.th/', note: 'Emergency incident updates' },
      ],
    },
    {
      geography: 'th',
      slug: 'civic-service',
      title: 'Civic Complaints / Service Reliability',
      description: 'Signals from complaint and maintenance systems that show where the city is fraying.',
      sortOrder: 6,
      status: 'active',
      summary:
        'Civic friction is not abstract. Broken sidewalks, drainage complaints, and service lag are the real dashboard of whether a city respects your time.',
      whyItMatters:
        'Complaint patterns are one of the fastest ways to see where lived reality diverges from official performance theater.',
      whatToDo:
        'Track recurring complaint themes, note unresolved clusters, and treat service responsiveness as a practical governance signal, not a PR score.',
      metricText: 'Complaint-driven service friction remains visible in high-density urban districts.',
      trendText: 'Recurring maintenance issues are clustering faster than trust is recovering.',
      updatedAt: '2026-03-24T08:30:00+07:00',
      sources: [
        { label: 'Traffy Fondue', url: 'https://landing.traffy.in.th/fondue', note: 'Citizen issue reporting platform' },
        { label: 'BMA', url: 'https://www.bangkok.go.th/', note: 'City service announcements and administration' },
      ],
    },
  ];

  for (const signal of signals) {
    const result = await database.execute({
      sql: `INSERT INTO watch_signals (geography, slug, title, description, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      args: [signal.geography, signal.slug, signal.title, signal.description, signal.sortOrder],
    });

    await database.execute({
      sql: `INSERT INTO watch_snapshots
        (signal_id, geography, status, summary, why_it_matters, what_to_do, metric_text, trend_text, sources, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        Number(result.lastInsertRowid),
        signal.geography,
        signal.status,
        signal.summary,
        signal.whyItMatters,
        signal.whatToDo,
        signal.metricText,
        signal.trendText,
        JSON.stringify(signal.sources),
        signal.updatedAt,
      ],
    });
  }

  await database.execute({
    sql: `INSERT INTO watch_briefs (geography, headline, summary, watchouts, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    args: [
      'th',
      'Thailand Watch: daily urban friction is up, but the useful story is where it bites first.',
      'Air, heat, and everyday service reliability are the big pressure points today. Nothing here is cinematic. That is exactly why it matters. The signal is in repeat irritation, reduced resilience, and the small failures that citizens absorb as normal.',
      JSON.stringify([
        'Morning air quality remains the easiest self-own if you leave home unprepared.',
        'Heat is turning ordinary errands into physiological stress tests.',
        'Localized weather and maintenance failures still punish people who trust the system too much.',
      ]),
      '2026-03-24T08:30:00+07:00',
    ],
  });
}

// Analytics: track events for the self-improving algorithm
export async function trackEvent(eventType: string, data: Record<string, unknown>) {
  await getClient().execute({
    sql: 'INSERT INTO analytics (event_type, data) VALUES (?, ?)',
    args: [eventType, JSON.stringify(data)],
  });
}

// Get a contextual Nonism based on keywords
export async function getRelevantNonism(text: string): Promise<{ text: string; source: string } | null> {
  const { rows } = await getClient().execute('SELECT * FROM nonisms');

  const words = text.toLowerCase();
  let bestMatch: { text: string; source: string } | null = null;
  let bestScore = 0;

  for (const n of rows) {
    const keywords = JSON.parse(String(n.trigger_keywords)) as string[];
    const score = keywords.filter(k => words.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = { text: String(n.text), source: String(n.source) };
    }
  }

  return bestScore > 0 ? bestMatch : null;
}

function buildConversationTitle(messages: ChatTranscriptMessage[]) {
  const firstUserMessage = messages.find(message => message.role === 'user')?.content ?? 'Untitled session';
  const normalized = firstUserMessage.replace(/\s+/g, ' ').trim();
  return normalized.length > 72 ? `${normalized.slice(0, 69)}...` : normalized;
}

export async function createConversation(
  userId: number,
  mode: ConversationMode,
  messages: ChatTranscriptMessage[]
): Promise<number> {
  const c = getClient();
  const title = buildConversationTitle(messages);
  const result = await c.execute({
    sql: `INSERT INTO conversations (user_id, mode, title, messages)
       VALUES (?, ?, ?, ?)`,
    args: [userId, mode, title, JSON.stringify(messages)],
  });

  await c.execute({
    sql: `UPDATE users
     SET total_sessions = total_sessions + 1, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    args: [userId],
  });

  return Number(result.lastInsertRowid);
}

export async function updateConversation(
  userId: number,
  conversationId: number,
  mode: ConversationMode,
  messages: ChatTranscriptMessage[]
): Promise<number | null> {
  const title = buildConversationTitle(messages);
  const result = await getClient().execute({
    sql: `UPDATE conversations
       SET mode = ?, title = ?, messages = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
    args: [mode, title, JSON.stringify(messages), conversationId, userId],
  });

  return result.rowsAffected > 0 ? conversationId : null;
}

export async function listConversationsForUser(userId: number): Promise<ConversationSummary[]> {
  const { rows } = await getClient().execute({
    sql: `SELECT id, mode, title, messages, created_at, updated_at
       FROM conversations
       WHERE user_id = ?
       ORDER BY updated_at DESC, id DESC`,
    args: [userId],
  });

  return rows.map(row => {
    const messages = JSON.parse(String(row.messages)) as ChatTranscriptMessage[];
    const assistantMessage = [...messages].reverse().find(message => message.role === 'assistant');
    const preview = (assistantMessage?.content ?? messages[0]?.content ?? '').replace(/\s+/g, ' ').trim();

    return {
      id: Number(row.id),
      mode: String(row.mode) as ConversationMode,
      title: String(row.title),
      preview: preview.length > 180 ? `${preview.slice(0, 177)}...` : preview,
      messageCount: messages.length,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  });
}

export async function getConversationByIdForUser(userId: number, conversationId: number) {
  const { rows } = await getClient().execute({
    sql: `SELECT id, mode, title, messages, created_at, updated_at
       FROM conversations
       WHERE id = ? AND user_id = ?`,
    args: [conversationId, userId],
  });

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    mode: String(row.mode) as ConversationMode,
    title: String(row.title),
    messages: JSON.parse(String(row.messages)) as ChatTranscriptMessage[],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function getProfileStats(userId: number) {
  const c = getClient();

  const { rows: totalRows } = await c.execute({
    sql: `SELECT
         COUNT(*) as conversationCount,
         SUM(CASE WHEN mode = 'think' THEN 1 ELSE 0 END) as thinkCount,
         SUM(CASE WHEN mode = 'communicate' THEN 1 ELSE 0 END) as communicateCount,
         SUM(CASE WHEN mode = 'reflect' THEN 1 ELSE 0 END) as reflectCount
       FROM conversations
       WHERE user_id = ?`,
    args: [userId],
  });
  const totals = totalRows[0];

  const { rows: savedRows } = await c.execute({
    sql: 'SELECT COUNT(*) as savedCount FROM saved_watch_items WHERE user_id = ?',
    args: [userId],
  });

  const { rows: practiceRows } = await c.execute({
    sql: `SELECT
         COUNT(*) as practiceCount,
         SUM(CASE WHEN tool = 'challenge' THEN 1 ELSE 0 END) as challengeCount,
         SUM(CASE WHEN tool = 'arena' THEN 1 ELSE 0 END) as arenaCount,
         SUM(CASE WHEN tool = 'simulate' THEN 1 ELSE 0 END) as simulateCount
       FROM practice_runs
       WHERE user_id = ?`,
    args: [userId],
  });
  const practice = practiceRows[0];

  return {
    conversationCount: Number(totals.conversationCount),
    thinkCount: Number(totals.thinkCount),
    communicateCount: Number(totals.communicateCount),
    reflectCount: Number(totals.reflectCount),
    savedCount: Number(savedRows[0].savedCount),
    practiceCount: Number(practice.practiceCount),
    challengeCount: Number(practice.challengeCount),
    arenaCount: Number(practice.arenaCount),
    simulateCount: Number(practice.simulateCount),
  };
}

async function getWatchBundleFromDb(database: Client, geography: string): Promise<WatchBundle | null> {
  const { rows: briefRows } = await database.execute({
    sql: `SELECT geography, headline, summary, watchouts, updated_at
       FROM watch_briefs
       WHERE geography = ?`,
    args: [geography],
  });
  const briefRow = briefRows[0];

  const { rows: signalRows } = await database.execute({
    sql: `SELECT
         ws.slug,
         ws.title,
         snap.status,
         snap.summary,
         snap.why_it_matters,
         snap.what_to_do,
         snap.metric_text,
         snap.trend_text,
         snap.sources,
         snap.updated_at
       FROM watch_signals ws
       JOIN watch_snapshots snap
         ON snap.signal_id = ws.id AND snap.geography = ws.geography
       WHERE ws.geography = ? AND ws.active = 1
       ORDER BY ws.sort_order ASC, ws.id ASC`,
    args: [geography],
  });

  if (!briefRow || signalRows.length === 0) {
    return null;
  }

  return {
    geography,
    generatedAt: String(briefRow.updated_at),
    brief: {
      headline: String(briefRow.headline),
      summary: String(briefRow.summary),
      watchouts: JSON.parse(String(briefRow.watchouts)) as string[],
      updatedAt: String(briefRow.updated_at),
    },
    signals: signalRows.map(row => ({
      slug: String(row.slug),
      title: String(row.title),
      status: String(row.status),
      summary: String(row.summary),
      whyItMatters: String(row.why_it_matters),
      whatToDo: String(row.what_to_do),
      updatedAt: String(row.updated_at),
      sources: JSON.parse(String(row.sources)) as WatchSource[],
      metricText: String(row.metric_text),
      trendText: String(row.trend_text),
    })),
  };
}

function parseWatchBundleSnapshot(snapshot: string, geography?: string): WatchBundle {
  const parsed = JSON.parse(snapshot) as {
    geography?: unknown;
    generatedAt?: unknown;
    brief?: {
      headline?: unknown;
      summary?: unknown;
      watchouts?: unknown;
      updatedAt?: unknown;
    };
    signals?: unknown;
  };

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof parsed.geography !== 'string' ||
    typeof parsed.generatedAt !== 'string' ||
    !parsed.brief ||
    typeof parsed.brief.headline !== 'string' ||
    typeof parsed.brief.summary !== 'string' ||
    !Array.isArray(parsed.brief.watchouts) ||
    parsed.brief.watchouts.some(item => typeof item !== 'string') ||
    typeof parsed.brief.updatedAt !== 'string' ||
    !Array.isArray(parsed.signals)
  ) {
    throw new Error('Corrupted watch revision snapshot.');
  }

  const signals = parsed.signals.map(signal => {
    const typed = signal as {
      slug?: unknown;
      title?: unknown;
      status?: unknown;
      summary?: unknown;
      whyItMatters?: unknown;
      whatToDo?: unknown;
      updatedAt?: unknown;
      metricText?: unknown;
      trendText?: unknown;
      sources?: unknown;
    };

    if (
      !typed ||
      typeof typed.slug !== 'string' ||
      typeof typed.title !== 'string' ||
      typeof typed.status !== 'string' ||
      typeof typed.summary !== 'string' ||
      typeof typed.whyItMatters !== 'string' ||
      typeof typed.whatToDo !== 'string' ||
      typeof typed.updatedAt !== 'string' ||
      typeof typed.metricText !== 'string' ||
      typeof typed.trendText !== 'string' ||
      !Array.isArray(typed.sources)
    ) {
      throw new Error('Corrupted watch revision snapshot.');
    }

    const sources = typed.sources.map(source => {
      const typedSource = source as {
        label?: unknown;
        url?: unknown;
        note?: unknown;
      };

      if (
        !typedSource ||
        typeof typedSource.label !== 'string' ||
        typeof typedSource.url !== 'string' ||
        typeof typedSource.note !== 'string'
      ) {
        throw new Error('Corrupted watch revision snapshot.');
      }

      return {
        label: typedSource.label,
        url: typedSource.url,
        note: typedSource.note,
      };
    });

    return {
      slug: typed.slug,
      title: typed.title,
      status: typed.status,
      summary: typed.summary,
      whyItMatters: typed.whyItMatters,
      whatToDo: typed.whatToDo,
      updatedAt: typed.updatedAt,
      metricText: typed.metricText,
      trendText: typed.trendText,
      sources,
    };
  });

  if (geography && parsed.geography !== geography) {
    throw new Error('Corrupted watch revision snapshot.');
  }

  if (new Set(signals.map(signal => signal.slug)).size !== signals.length) {
    throw new Error('Corrupted watch revision snapshot.');
  }

  return {
    geography: parsed.geography,
    generatedAt: parsed.generatedAt,
    brief: {
      headline: parsed.brief.headline,
      summary: parsed.brief.summary,
      watchouts: parsed.brief.watchouts,
      updatedAt: parsed.brief.updatedAt,
    },
    signals,
  };
}

async function createWatchRevisionInDb(
  database: Client,
  input: CreateWatchRevisionInput
): Promise<WatchRevisionSummary> {
  const statusSummary = computeWatchStatusSummary(input.snapshot.signals);
  const { rows: versionRows } = await database.execute({
    sql: `SELECT COALESCE(MAX(version), 0) + 1 as nextVersion
       FROM watch_revisions
       WHERE geography = ?`,
    args: [input.geography],
  });
  const nextVersion = Number(versionRows[0].nextVersion);
  const createdAt = input.createdAt ?? input.snapshot.generatedAt;

  let restoredFromRevisionVersion: number | null = null;
  if (input.restoredFromRevisionId) {
    const { rows: sourceRows } = await database.execute({
      sql: 'SELECT version FROM watch_revisions WHERE id = ?',
      args: [input.restoredFromRevisionId],
    });
    restoredFromRevisionVersion = sourceRows[0] ? Number(sourceRows[0].version) : null;
  }

  const result = await database.execute({
    sql: `INSERT INTO watch_revisions
        (geography, version, action, snapshot, headline, status_summary, actor_user_id, restored_from_revision_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      input.geography,
      nextVersion,
      input.action,
      JSON.stringify(input.snapshot),
      input.snapshot.brief.headline,
      JSON.stringify(statusSummary),
      input.actorUserId,
      input.restoredFromRevisionId ?? null,
      createdAt,
    ],
  });

  return {
    id: Number(result.lastInsertRowid),
    geography: input.geography,
    version: nextVersion,
    action: input.action,
    headline: input.snapshot.brief.headline,
    statusSummary,
    actor: {
      id: input.actorUserId,
      displayName: input.actorDisplayName,
    },
    restoredFromRevisionId: input.restoredFromRevisionId ?? null,
    restoredFromRevisionVersion,
    createdAt,
  };
}

export async function createWatchRevision(input: CreateWatchRevisionInput): Promise<WatchRevisionSummary> {
  return createWatchRevisionInDb(getClient(), input);
}

async function getWatchRevisionByIdInDb(
  database: Client,
  revisionId: number
): Promise<WatchRevision | null> {
  const { rows } = await database.execute({
    sql: `SELECT
         wr.id,
         wr.geography,
         wr.version,
         wr.action,
         wr.snapshot,
         wr.headline,
         wr.status_summary,
         wr.actor_user_id,
         wr.restored_from_revision_id,
         wr.created_at,
         u.display_name as actor_display_name,
         source.version as restored_from_revision_version
       FROM watch_revisions wr
       LEFT JOIN users u
         ON u.id = wr.actor_user_id
       LEFT JOIN watch_revisions source
         ON source.id = wr.restored_from_revision_id
       WHERE wr.id = ?`,
    args: [revisionId],
  });

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    geography: String(row.geography),
    version: Number(row.version),
    action: String(row.action) as WatchRevisionAction,
    headline: String(row.headline),
    statusSummary: parseWatchStatusSummary(String(row.status_summary)),
    actor: {
      id: Number(row.actor_user_id),
      displayName: row.actor_display_name ? String(row.actor_display_name) : 'Unknown admin',
    },
    actorUserId: Number(row.actor_user_id),
    restoredFromRevisionId: row.restored_from_revision_id != null ? Number(row.restored_from_revision_id) : null,
    restoredFromRevisionVersion: row.restored_from_revision_version != null ? Number(row.restored_from_revision_version) : null,
    createdAt: String(row.created_at),
    snapshot: parseWatchBundleSnapshot(String(row.snapshot), String(row.geography)),
  };
}

async function applyWatchBundleState(
  database: Client,
  geography: string,
  brief: WatchBriefInput,
  signals: WatchSignalInput[],
  timestamp: string
) {
  const definitions = await getWatchSignalDefinitions(database, geography);
  if (definitions.length === 0) {
    throw new Error('Watch signal definitions not found.');
  }

  if (signals.length !== definitions.length) {
    throw new Error('Invalid watch signal count.');
  }

  const definitionBySlug = new Map(definitions.map(definition => [definition.slug, definition]));
  if (new Set(signals.map(signal => signal.slug)).size !== signals.length) {
    throw new Error('Duplicate watch signal slugs.');
  }

  const briefResult = await database.execute({
    sql: `UPDATE watch_briefs
       SET headline = ?, summary = ?, watchouts = ?, updated_at = ?
       WHERE geography = ?`,
    args: [brief.headline, brief.summary, JSON.stringify(brief.watchouts), timestamp, geography],
  });

  if (briefResult.rowsAffected === 0) {
    throw new Error('Watch brief not found.');
  }

  for (const signal of signals) {
    const definition = definitionBySlug.get(signal.slug);
    if (!definition) {
      throw new Error(`Unknown signal slug: ${signal.slug}`);
    }

    const result = await database.execute({
      sql: `UPDATE watch_snapshots
     SET status = ?,
         summary = ?,
         why_it_matters = ?,
         what_to_do = ?,
         metric_text = ?,
         trend_text = ?,
         sources = ?,
         updated_at = ?
     WHERE signal_id = ? AND geography = ?`,
      args: [
        signal.status,
        signal.summary,
        signal.whyItMatters,
        signal.whatToDo,
        signal.metricText,
        signal.trendText,
        JSON.stringify(signal.sources),
        timestamp,
        definition.id,
        geography,
      ],
    });

    if (result.rowsAffected === 0) {
      throw new Error(`Watch snapshot missing for signal: ${signal.slug}`);
    }
  }
}

async function publishWatchBundleInDb(
  database: Client,
  geography: string,
  brief: WatchBriefInput,
  signals: WatchSignalInput[],
  actor: {
    userId: number;
    displayName: string;
  },
  action: WatchRevisionAction,
  restoredFromRevisionId?: number | null
): Promise<WatchPublishResult> {
  const timestamp = new Date().toISOString();
  await applyWatchBundleState(database, geography, brief, signals, timestamp);

  // Record signal history for sparkline charts
  await recordSignalHistory(geography, signals.map(s => ({ slug: s.slug, status: s.status, metricText: s.metricText })));

  const bundle = await getWatchBundleFromDb(database, geography);
  if (!bundle) {
    throw new Error('Watch data unavailable.');
  }

  const revision = await createWatchRevisionInDb(database, {
    geography,
    action,
    snapshot: bundle,
    actorUserId: actor.userId,
    actorDisplayName: actor.displayName,
    restoredFromRevisionId: restoredFromRevisionId ?? null,
    createdAt: timestamp,
  });

  return {
    bundle,
    revision,
  };
}

/* ---------- Signal history for sparkline charts ---------- */

const STATUS_SEVERITY: Record<string, number> = {
  mixed: 0, watch: 1, active: 2, elevated: 3, high: 4,
};

function parseLeadingNumber(text: string): number | null {
  const match = text.match(/^[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

export async function recordSignalHistory(geography: string, signals: Array<{ slug: string; status: string; metricText: string }>) {
  const c = getClient();
  const now = new Date().toISOString();
  for (const s of signals) {
    await c.execute({
      sql: `INSERT INTO watch_signal_history (geography, signal_slug, status, severity, metric_value, recorded_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
      args: [geography, s.slug, s.status, STATUS_SEVERITY[s.status] ?? 0, parseLeadingNumber(s.metricText), now],
    });
  }
}

export interface SignalHistoryPoint {
  signalSlug: string;
  status: string;
  severity: number;
  metricValue: number | null;
  recordedAt: string;
}

export async function getSignalHistory(geography: string, days: number = 30): Promise<SignalHistoryPoint[]> {
  const { rows } = await getClient().execute({
    sql: `SELECT signal_slug, status, severity, metric_value, recorded_at
     FROM watch_signal_history
     WHERE geography = ? AND recorded_at >= datetime('now', '-' || ? || ' days')
     ORDER BY signal_slug, recorded_at ASC`,
    args: [geography, days],
  });

  return rows.map(r => ({
    signalSlug: String(r.signal_slug),
    status: String(r.status),
    severity: Number(r.severity),
    metricValue: r.metric_value != null ? Number(r.metric_value) : null,
    recordedAt: String(r.recorded_at),
  }));
}

/* ---------- Platform pulse stats for command dashboard ---------- */

export interface PlatformPulse {
  totalUsers: number;
  totalConversations: number;
  totalPracticeRuns: number;
  totalPosts: number;
  totalAnalyticsEvents: number;
  totalWatchRevisions: number;
  recentConversations: Array<{ id: number; mode: string; createdAt: string }>;
  recentEvents: Array<{ eventType: string; createdAt: string }>;
}

export async function getPlatformPulse(): Promise<PlatformPulse> {
  const c = getClient();

  const countTable = async (table: string) => {
    const { rows } = await c.execute(`SELECT COUNT(*) as c FROM ${table}`);
    return Number(rows[0].c);
  };

  const [totalUsers, totalConversations, totalPracticeRuns, totalPosts, totalAnalyticsEvents, totalWatchRevisions] =
    await Promise.all([
      countTable('users'),
      countTable('conversations'),
      countTable('practice_runs'),
      countTable('posts'),
      countTable('analytics'),
      countTable('watch_revisions'),
    ]);

  const { rows: recentConvos } = await c.execute(
    `SELECT id, mode, created_at FROM conversations ORDER BY created_at DESC LIMIT 8`
  );

  const { rows: recentEvents } = await c.execute(
    `SELECT event_type, created_at FROM analytics ORDER BY created_at DESC LIMIT 12`
  );

  return {
    totalUsers,
    totalConversations,
    totalPracticeRuns,
    totalPosts,
    totalAnalyticsEvents,
    totalWatchRevisions,
    recentConversations: recentConvos.map(r => ({ id: Number(r.id), mode: String(r.mode), createdAt: String(r.created_at) })),
    recentEvents: recentEvents.map(r => ({ eventType: String(r.event_type), createdAt: String(r.created_at) })),
  };
}

export async function getRandomNonisms(count: number = 5): Promise<Array<{ text: string; category: string }>> {
  const { rows } = await getClient().execute({
    sql: `SELECT text, category FROM nonisms ORDER BY RANDOM() LIMIT ?`,
    args: [count],
  });
  return rows.map(r => ({ text: String(r.text), category: String(r.category) }));
}

export async function getRecentConversationPreviews(limit: number = 10): Promise<Array<{ id: number; mode: string; preview: string; createdAt: string }>> {
  const { rows } = await getClient().execute({
    sql: `SELECT id, mode, messages, created_at FROM conversations ORDER BY created_at DESC LIMIT ?`,
    args: [limit],
  });

  return rows.map(r => {
    let preview = '';
    try {
      const msgs = JSON.parse(String(r.messages));
      const first = msgs.find((m: { role: string; content: string }) => m.role === 'user');
      preview = first?.content?.substring(0, 80) || '';
    } catch { /* skip */ }
    return { id: Number(r.id), mode: String(r.mode), preview, createdAt: String(r.created_at) };
  });
}

export async function getPracticeStats(): Promise<{ totalRuns: number; avgScore: number; streakDays: number; byTool: Record<string, number> }> {
  const c = getClient();
  const { rows: totalRows } = await c.execute('SELECT COUNT(*) as c FROM practice_runs');
  const total = Number(totalRows[0].c);
  const { rows: avgRows } = await c.execute('SELECT AVG(score) as a FROM practice_runs WHERE score IS NOT NULL');
  const avg = avgRows[0].a != null ? Number(avgRows[0].a) : 0;
  const { rows: toolRows } = await c.execute('SELECT tool, COUNT(*) as c FROM practice_runs GROUP BY tool');
  const { rows: dayRows } = await c.execute('SELECT COUNT(DISTINCT local_day) as d FROM practice_runs');

  const byTool: Record<string, number> = {};
  for (const t of toolRows) byTool[String(t.tool)] = Number(t.c);

  return { totalRuns: total, avgScore: Math.round(avg * 100) / 100, streakDays: Number(dayRows[0].d), byTool };
}

export async function getWatchBundle(geography: string): Promise<WatchBundle | null> {
  return getWatchBundleFromDb(getClient(), geography);
}

export async function listWatchRevisions(geography: string): Promise<WatchRevisionSummary[]> {
  const { rows } = await getClient().execute({
    sql: `SELECT
         wr.id,
         wr.geography,
         wr.version,
         wr.action,
         wr.headline,
         wr.status_summary,
         wr.actor_user_id,
         wr.restored_from_revision_id,
         wr.created_at,
         u.display_name as actor_display_name,
         source.version as restored_from_revision_version
       FROM watch_revisions wr
       LEFT JOIN users u
         ON u.id = wr.actor_user_id
       LEFT JOIN watch_revisions source
         ON source.id = wr.restored_from_revision_id
       WHERE wr.geography = ?
       ORDER BY wr.version DESC, wr.id DESC`,
    args: [geography],
  });

  return rows.map(row => ({
    id: Number(row.id),
    geography: String(row.geography),
    version: Number(row.version),
    action: String(row.action) as WatchRevisionAction,
    headline: String(row.headline),
    statusSummary: parseWatchStatusSummary(String(row.status_summary)),
    actor: {
      id: Number(row.actor_user_id),
      displayName: row.actor_display_name ? String(row.actor_display_name) : 'Unknown admin',
    },
    restoredFromRevisionId: row.restored_from_revision_id != null ? Number(row.restored_from_revision_id) : null,
    restoredFromRevisionVersion: row.restored_from_revision_version != null ? Number(row.restored_from_revision_version) : null,
    createdAt: String(row.created_at),
  }));
}

export async function getWatchRevisionById(revisionId: number): Promise<WatchRevision | null> {
  return getWatchRevisionByIdInDb(getClient(), revisionId);
}

export async function publishWatchBundle(
  geography: string,
  brief: WatchBriefInput,
  signals: WatchSignalInput[],
  actor: {
    userId: number;
    displayName: string;
  }
): Promise<WatchPublishResult> {
  return publishWatchBundleInDb(getClient(), geography, brief, signals, actor, 'publish');
}

export async function restoreWatchRevision(
  revisionId: number,
  actor: {
    userId: number;
    displayName: string;
  }
): Promise<WatchPublishResult | null> {
  const c = getClient();
  const revision = await getWatchRevisionByIdInDb(c, revisionId);
  if (!revision) {
    return null;
  }

  return publishWatchBundleInDb(
    c,
    revision.snapshot.geography,
    {
      headline: revision.snapshot.brief.headline,
      summary: revision.snapshot.brief.summary,
      watchouts: revision.snapshot.brief.watchouts,
    },
    revision.snapshot.signals.map(signal => ({
      slug: signal.slug,
      status: signal.status,
      summary: signal.summary,
      whyItMatters: signal.whyItMatters,
      whatToDo: signal.whatToDo,
      metricText: signal.metricText,
      trendText: signal.trendText,
      sources: signal.sources,
    })),
    actor,
    'rollback',
    revision.id
  );
}

export async function saveWatchItem(
  userId: number,
  geography: string,
  itemKind: 'signal' | 'brief',
  itemSlug: string
) {
  await getClient().execute({
    sql: `INSERT OR IGNORE INTO saved_watch_items (user_id, geography, item_kind, item_slug)
     VALUES (?, ?, ?, ?)`,
    args: [userId, geography, itemKind, itemSlug],
  });
}

export async function removeSavedWatchItem(
  userId: number,
  geography: string,
  itemKind: 'signal' | 'brief',
  itemSlug: string
) {
  await getClient().execute({
    sql: `DELETE FROM saved_watch_items
     WHERE user_id = ? AND geography = ? AND item_kind = ? AND item_slug = ?`,
    args: [userId, geography, itemKind, itemSlug],
  });
}

export async function listSavedWatchItemsForUser(userId: number): Promise<SavedWatchItemSummary[]> {
  const c = getClient();

  const { rows } = await c.execute({
    sql: `SELECT
         swi.id,
         swi.geography,
         swi.item_kind,
         swi.item_slug,
         swi.created_at,
         ws.title as signal_title,
         snap.summary as signal_summary,
         snap.status as signal_status,
         snap.updated_at as signal_updated_at
       FROM saved_watch_items swi
       LEFT JOIN watch_signals ws
         ON swi.item_kind = 'signal' AND ws.geography = swi.geography AND ws.slug = swi.item_slug
       LEFT JOIN watch_snapshots snap
         ON ws.id = snap.signal_id AND snap.geography = ws.geography
       WHERE swi.user_id = ?
       ORDER BY swi.created_at DESC, swi.id DESC`,
    args: [userId],
  });

  const { rows: briefs } = await c.execute(
    'SELECT geography, headline, summary, updated_at FROM watch_briefs'
  );
  const briefByGeography = new Map(briefs.map(brief => [String(brief.geography), brief]));

  return rows.map(row => {
    if (String(row.item_kind) === 'brief') {
      const brief = briefByGeography.get(String(row.geography));
      return {
        id: Number(row.id),
        geography: String(row.geography),
        itemKind: String(row.item_kind) as 'signal' | 'brief',
        itemSlug: String(row.item_slug),
        title: brief ? String(brief.headline) : 'Thailand Brief',
        summary: brief ? String(brief.summary) : 'Saved watch brief',
        status: null,
        updatedAt: brief ? String(brief.updated_at) : String(row.created_at),
        createdAt: String(row.created_at),
      };
    }

    return {
      id: Number(row.id),
      geography: String(row.geography),
      itemKind: String(row.item_kind) as 'signal' | 'brief',
      itemSlug: String(row.item_slug),
      title: row.signal_title ? String(row.signal_title) : String(row.item_slug),
      summary: row.signal_summary ? String(row.signal_summary) : 'Saved watch signal',
      status: row.signal_status != null ? String(row.signal_status) : null,
      updatedAt: row.signal_updated_at ? String(row.signal_updated_at) : String(row.created_at),
      createdAt: String(row.created_at),
    };
  });
}

export async function createContactRequest(input: ContactRequestInput): Promise<number> {
  const result = await getClient().execute({
    sql: `INSERT INTO contact_requests (name, email, organization, use_case)
       VALUES (?, ?, ?, ?)`,
    args: [input.name, input.email, input.organization ?? '', input.useCase],
  });

  return Number(result.lastInsertRowid);
}

export async function listContactRequests(limit = 50): Promise<ContactRequestSummary[]> {
  const { rows } = await getClient().execute({
    sql: `SELECT id, name, email, organization, use_case, status, created_at
       FROM contact_requests
       ORDER BY created_at DESC, id DESC
       LIMIT ?`,
    args: [limit],
  });

  return rows.map(row => ({
    id: Number(row.id),
    name: String(row.name),
    email: String(row.email),
    organization: String(row.organization),
    useCase: String(row.use_case),
    status: String(row.status),
    createdAt: String(row.created_at),
  }));
}

export async function updateContactRequestStatus(id: number, status: string): Promise<boolean> {
  const result = await getClient().execute({
    sql: `UPDATE contact_requests
       SET status = ?
       WHERE id = ?`,
    args: [status, id],
  });

  return result.rowsAffected > 0;
}

export async function getContactRequestStats() {
  const { rows } = await getClient().execute(
    `SELECT
         COUNT(*) as totalCount,
         SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as newCount,
         SUM(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) as recentCount
       FROM contact_requests`
  );

  const row = rows[0];
  return {
    totalCount: Number(row.totalCount),
    newCount: Number(row.newCount),
    recentCount: Number(row.recentCount),
  };
}

function getBangkokLocalDay(date: Date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export async function createPracticeRun(input: PracticeRunInput): Promise<number> {
  const result = await getClient().execute({
    sql: `INSERT INTO practice_runs
        (user_id, tool, item_id, title, summary, score, local_day, details)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      input.userId,
      input.tool,
      input.itemId,
      input.title,
      input.summary,
      input.score ?? null,
      input.localDay ?? getBangkokLocalDay(),
      JSON.stringify(input.details ?? {}),
    ],
  });

  return Number(result.lastInsertRowid);
}

export async function listPracticeRunsForUser(userId: number, limit = 8): Promise<PracticeRunSummary[]> {
  const { rows } = await getClient().execute({
    sql: `SELECT id, tool, item_id, title, summary, score, local_day, created_at
       FROM practice_runs
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT ?`,
    args: [userId, limit],
  });

  return rows.map(row => ({
    id: Number(row.id),
    tool: String(row.tool) as 'challenge' | 'arena' | 'simulate',
    itemId: String(row.item_id),
    title: String(row.title),
    summary: String(row.summary),
    score: row.score != null ? Number(row.score) : null,
    localDay: String(row.local_day),
    createdAt: String(row.created_at),
  }));
}

export async function getChallengeStreak(userId: number, today: Date = new Date()): Promise<number> {
  const { rows } = await getClient().execute({
    sql: `SELECT DISTINCT local_day
       FROM practice_runs
       WHERE user_id = ? AND tool = 'challenge'
       ORDER BY local_day DESC`,
    args: [userId],
  });

  const days = new Set(rows.map(row => String(row.local_day)));
  let streak = 0;
  const cursor = new Date(today);

  while (true) {
    const day = getBangkokLocalDay(cursor);
    if (!days.has(day)) {
      break;
    }

    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

// ============ INTELLIGENCE MEMORY ============

export interface IntelBrief {
  id: number;
  geography: string;
  headline: string;
  content: string;
  contextSnapshot: string;
  generatedAt: string;
}

export async function insertIntelBrief(
  geography: string,
  headline: string,
  content: string,
  contextSnapshot: string
): Promise<number> {
  const result = await getClient().execute({
    sql: `INSERT INTO intel_briefs (geography, headline, content, context_snapshot)
       VALUES (?, ?, ?, ?)`,
    args: [geography, headline, content, contextSnapshot],
  });
  return Number(result.lastInsertRowid);
}

export async function getLatestIntelBrief(geography: string): Promise<IntelBrief | null> {
  const { rows } = await getClient().execute({
    sql: `SELECT id, geography, headline, content, context_snapshot, generated_at
       FROM intel_briefs
       WHERE geography = ?
       ORDER BY generated_at DESC
       LIMIT 1`,
    args: [geography],
  });

  const row = rows[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    geography: String(row.geography),
    headline: String(row.headline),
    content: String(row.content),
    contextSnapshot: String(row.context_snapshot),
    generatedAt: String(row.generated_at),
  };
}

export interface IntelMemoryItem {
  id: number;
  geography: string;
  kind: 'prediction' | 'observation' | 'correlation' | 'alert';
  claim: string;
  confidence: 'high' | 'medium' | 'low' | null;
  sourceBriefId: number | null;
  status: 'open' | 'confirmed' | 'refuted' | 'expired';
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export async function insertIntelMemory(params: {
  geography: string;
  kind: 'prediction' | 'observation' | 'correlation' | 'alert';
  claim: string;
  confidence?: 'high' | 'medium' | 'low';
  sourceBriefId?: number;
  sourceAnalysisQuestion?: string;
  expiresAt?: string;
}): Promise<number> {
  const result = await getClient().execute({
    sql: `INSERT INTO intel_memory (geography, kind, claim, confidence, source_brief_id, source_analysis_question, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      params.geography,
      params.kind,
      params.claim,
      params.confidence ?? null,
      params.sourceBriefId ?? null,
      params.sourceAnalysisQuestion ?? null,
      params.expiresAt ?? null,
    ],
  });
  return Number(result.lastInsertRowid);
}

export async function getIntelMemoryForContext(geography: string, limit = 20): Promise<IntelMemoryItem[]> {
  const { rows } = await getClient().execute({
    sql: `SELECT id, geography, kind, claim, confidence, source_brief_id, status, resolution_note, created_at, resolved_at
       FROM intel_memory
       WHERE geography = ? AND status = 'open'
       ORDER BY created_at DESC
       LIMIT ?`,
    args: [geography, limit],
  });

  return rows.map(r => ({
    id: Number(r.id),
    geography: String(r.geography),
    kind: String(r.kind) as IntelMemoryItem['kind'],
    claim: String(r.claim),
    confidence: r.confidence != null ? String(r.confidence) as IntelMemoryItem['confidence'] : null,
    sourceBriefId: r.source_brief_id != null ? Number(r.source_brief_id) : null,
    status: String(r.status) as IntelMemoryItem['status'],
    resolutionNote: r.resolution_note != null ? String(r.resolution_note) : null,
    createdAt: String(r.created_at),
    resolvedAt: r.resolved_at != null ? String(r.resolved_at) : null,
  }));
}

export async function resolveIntelMemory(id: number, status: 'confirmed' | 'refuted' | 'expired', note?: string) {
  await getClient().execute({
    sql: `UPDATE intel_memory SET status = ?, resolution_note = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?`,
    args: [status, note ?? null, id],
  });
}

export async function logAnalysis(geography: string, question: string, response: string) {
  await getClient().execute({
    sql: `INSERT INTO intel_analysis_log (geography, question, response) VALUES (?, ?, ?)`,
    args: [geography, question, response],
  });
}

export async function getRecentAnalyses(geography: string, limit = 5): Promise<Array<{ question: string; response: string; createdAt: string }>> {
  const { rows } = await getClient().execute({
    sql: `SELECT question, response, created_at FROM intel_analysis_log
       WHERE geography = ? ORDER BY created_at DESC LIMIT ?`,
    args: [geography, limit],
  });
  return rows.map(r => ({ question: String(r.question), response: String(r.response), createdAt: String(r.created_at) }));
}
