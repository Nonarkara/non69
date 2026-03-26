-- Non69 Database Schema
-- "Non's First Society" — a living database that learns and evolves

-- Users: The thinkers
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  bio TEXT DEFAULT '',
  thinking_profile TEXT DEFAULT '{}',
  total_sessions INTEGER DEFAULT 0,
  logic_growth REAL DEFAULT 0.0,
  clarity_growth REAL DEFAULT 0.0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Conversations with the Socratic Engine
CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  mode TEXT CHECK(mode IN ('think', 'communicate', 'reflect')) NOT NULL,
  title TEXT DEFAULT '',
  messages TEXT NOT NULL DEFAULT '[]',
  insights TEXT DEFAULT '[]',
  logic_score REAL,
  clarity_score REAL,
  fallacies_found TEXT DEFAULT '[]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Forum posts
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  logic_score REAL,
  clarity_score REAL,
  upvotes INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Forum replies
CREATE TABLE IF NOT EXISTS replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER REFERENCES posts(id),
  user_id INTEGER REFERENCES users(id),
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- System analytics: real-time data to evolve the algorithm
CREATE TABLE IF NOT EXISTS analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  data TEXT DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Nonisms: Dr. Non's philosophy fragments, surfaced contextually
CREATE TABLE IF NOT EXISTS nonisms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  source TEXT,
  category TEXT,
  trigger_keywords TEXT DEFAULT '[]'
);

-- Watch definitions: stable signal registry
CREATE TABLE IF NOT EXISTS watch_signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  geography TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(geography, slug)
);

-- Watch snapshots: curated current-state intelligence for each signal
CREATE TABLE IF NOT EXISTS watch_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  signal_id INTEGER NOT NULL REFERENCES watch_signals(id) ON DELETE CASCADE,
  geography TEXT NOT NULL,
  status TEXT NOT NULL,
  summary TEXT NOT NULL,
  why_it_matters TEXT NOT NULL,
  what_to_do TEXT NOT NULL,
  metric_text TEXT DEFAULT '',
  trend_text TEXT DEFAULT '',
  sources TEXT DEFAULT '[]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(signal_id, geography)
);

-- Watch briefs: top-line overview for a geography
CREATE TABLE IF NOT EXISTS watch_briefs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  geography TEXT NOT NULL UNIQUE,
  headline TEXT NOT NULL,
  summary TEXT NOT NULL,
  watchouts TEXT DEFAULT '[]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Watch revisions: immutable publish and rollback history
CREATE TABLE IF NOT EXISTS watch_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  geography TEXT NOT NULL,
  version INTEGER NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('publish', 'rollback')),
  snapshot TEXT NOT NULL,
  headline TEXT NOT NULL,
  status_summary TEXT DEFAULT '{}',
  actor_user_id INTEGER NOT NULL REFERENCES users(id),
  restored_from_revision_id INTEGER REFERENCES watch_revisions(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(geography, version)
);

-- Live signal cache: additive operational feeds with stale fallback
CREATE TABLE IF NOT EXISTS live_signal_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  area TEXT NOT NULL,
  payload TEXT NOT NULL,
  source_label TEXT NOT NULL,
  source_updated_at TEXT,
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL CHECK(status IN ('fresh', 'stale', 'failed')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(slug, area)
);

-- Saved watch items: user pins for follow-up
CREATE TABLE IF NOT EXISTS saved_watch_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  geography TEXT NOT NULL,
  item_kind TEXT NOT NULL CHECK(item_kind IN ('signal', 'brief')),
  item_slug TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, geography, item_kind, item_slug)
);

-- Briefing / partnership leads
CREATE TABLE IF NOT EXISTS contact_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  organization TEXT DEFAULT '',
  use_case TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Meeting sessions: explicit, user-started listening sessions for the JARVIS dashboard
CREATE TABLE IF NOT EXISTS meeting_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT DEFAULT '',
  status TEXT NOT NULL CHECK(status IN ('listening', 'processing', 'finished')),
  language_mode TEXT NOT NULL DEFAULT 'th-en',
  transcript TEXT DEFAULT '',
  insights TEXT DEFAULT '[]',
  suggested_responses TEXT DEFAULT '[]',
  citations TEXT DEFAULT '[]',
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meeting_session_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES meeting_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK(event_type IN ('status', 'transcript', 'insight', 'response')),
  payload TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Practice runs: challenge, debate arena, and conversation simulator history
CREATE TABLE IF NOT EXISTS watch_signal_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  geography TEXT NOT NULL,
  signal_slug TEXT NOT NULL,
  status TEXT NOT NULL,
  severity INTEGER NOT NULL DEFAULT 0,
  metric_value REAL,
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wsh_geo_slug_date
  ON watch_signal_history(geography, signal_slug, recorded_at);

CREATE TABLE IF NOT EXISTS practice_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tool TEXT NOT NULL CHECK(tool IN ('challenge', 'arena', 'simulate')),
  item_id TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT DEFAULT '',
  score REAL,
  local_day TEXT NOT NULL,
  details TEXT DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Intelligence briefs: auto-generated daily intelligence products
CREATE TABLE IF NOT EXISTS intel_briefs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  geography TEXT NOT NULL DEFAULT 'th',
  headline TEXT NOT NULL,
  content TEXT NOT NULL,
  context_snapshot TEXT NOT NULL DEFAULT '{}',
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_intel_briefs_geo_date
  ON intel_briefs(geography, generated_at DESC);

-- Intelligence memory: predictions, observations, tracked claims
CREATE TABLE IF NOT EXISTS intel_memory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  geography TEXT NOT NULL DEFAULT 'th',
  kind TEXT NOT NULL CHECK(kind IN ('prediction', 'observation', 'correlation', 'alert')),
  claim TEXT NOT NULL,
  confidence TEXT CHECK(confidence IN ('high', 'medium', 'low')),
  source_brief_id INTEGER REFERENCES intel_briefs(id),
  source_analysis_question TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'confirmed', 'refuted', 'expired')),
  resolution_note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  expires_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_intel_memory_status
  ON intel_memory(status, created_at DESC);

-- Analysis log: every query to the intelligence engine
CREATE TABLE IF NOT EXISTS intel_analysis_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  geography TEXT NOT NULL DEFAULT 'th',
  question TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
