-- 0002_digest.sql — weekly recap ("digest") push preference.
-- Opt-in (default off), gated once per ISO week by last_digest_on (user-local date).
ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS digest_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_digest_on DATE;
