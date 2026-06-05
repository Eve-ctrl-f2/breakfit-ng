-- ============================================================================
-- BreakFit — Postgres schema (v1)
-- Passwordless auth (magic code) + per-user settings + history sync.
-- Run: psql "$DATABASE_URL" -f db/schema.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";    -- case-insensitive email

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         CITEXT UNIQUE NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- login_codes  (one-time passwordless codes; short TTL, also kept in Redis)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS login_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       CITEXT NOT NULL,
  code_hash   TEXT NOT NULL,            -- hashed 6-digit code, never plaintext
  expires_at  TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  attempts    SMALLINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_login_codes_email ON login_codes (email);

-- ---------------------------------------------------------------------------
-- sessions  (opaque bearer tokens; token stored hashed)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);

-- ---------------------------------------------------------------------------
-- user_settings  (1:1 with user; JSONB mirrors the client UserSettings shape)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_settings (
  user_id    UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  settings   JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- history  (break outcomes; client id is the idempotency key for sync)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS history (
  id            UUID PRIMARY KEY,                 -- client-generated UUID
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at    TIMESTAMPTZ NOT NULL,
  outcome       TEXT NOT NULL CHECK (outcome IN ('completed','skipped','snoozed')),
  exercise_id   TEXT,
  exercise_name TEXT,
  category      TEXT,
  amount_done   INTEGER NOT NULL DEFAULT 0,
  feedback      SMALLINT CHECK (feedback IN (-1,0,1)),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_history_user_time ON history (user_id, started_at DESC);

-- ---------------------------------------------------------------------------
-- custom_exercises  (user-created additions to the pool)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS custom_exercises (
  id          TEXT NOT NULL,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  difficulty  TEXT NOT NULL,
  unit        TEXT NOT NULL CHECK (unit IN ('reps','seconds')),
  default_amount INTEGER NOT NULL,
  intensity   SMALLINT NOT NULL DEFAULT 3,
  icon        TEXT NOT NULL DEFAULT 'pi-bolt',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

-- ---------------------------------------------------------------------------
-- push_subscriptions  (Web Push / VAPID; one row per browser endpoint)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint    TEXT PRIMARY KEY,                 -- unique per browser/device
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions (user_id);

-- ---------------------------------------------------------------------------
-- reminders  (per-user daily nudge prefs; drives the server-side scheduler)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reminders (
  user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  timezone      TEXT NOT NULL DEFAULT 'UTC',   -- IANA tz from the client
  locale        TEXT NOT NULL DEFAULT 'de',
  enabled       BOOLEAN NOT NULL DEFAULT true,
  last_nudge_on DATE                            -- local date of last sent nudge
);
