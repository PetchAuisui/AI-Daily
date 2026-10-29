-- AI Daily schema (PostgreSQL). รันซ้ำได้ปลอดภัย
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  salt          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower ON users (lower(username));

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions (user_id);

CREATE TABLE IF NOT EXISTS trackers (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  weekly_limit DOUBLE PRECISION NOT NULL,
  unit         TEXT NOT NULL DEFAULT 'tokens',
  reset_dow    SMALLINT NOT NULL DEFAULT 1,
  reset_hour   SMALLINT NOT NULL DEFAULT 0,
  active_days  TEXT NOT NULL DEFAULT '1111111',
  reserve_pct  DOUBLE PRECISION NOT NULL DEFAULT 10,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trackers_user ON trackers (user_id);

CREATE TABLE IF NOT EXISTS usage (
  id         SERIAL PRIMARY KEY,
  tracker_id INTEGER NOT NULL REFERENCES trackers(id) ON DELETE CASCADE,
  ts         BIGINT NOT NULL, -- epoch ms
  amount     DOUBLE PRECISION NOT NULL,
  note       TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS usage_tracker_ts ON usage (tracker_id, ts);
