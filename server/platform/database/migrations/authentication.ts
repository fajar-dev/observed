export const authenticationMigration = `
CREATE SCHEMA IF NOT EXISTS observe;
CREATE TABLE IF NOT EXISTS observe.schema_migrations (
  version integer PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS observe.users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE CHECK (email = lower(email)),
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  enabled boolean NOT NULL DEFAULT true,
  password_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_sign_in_at timestamptz
);
CREATE TABLE IF NOT EXISTS observe.auth_setup (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  completed_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO observe.auth_setup(singleton)
SELECT true WHERE EXISTS (SELECT 1 FROM observe.users)
ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS observe.auth_identities (
  provider text NOT NULL CHECK (provider IN ('google', 'microsoft')),
  subject text NOT NULL,
  user_id uuid NOT NULL REFERENCES observe.users(id) ON DELETE CASCADE,
  PRIMARY KEY (provider, subject),
  UNIQUE (provider, user_id)
);
CREATE TABLE IF NOT EXISTS observe.auth_sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES observe.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  user_agent text NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_sessions_user ON observe.auth_sessions(user_id);
CREATE TABLE IF NOT EXISTS observe.auth_refresh_tokens (
  token_hash text PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES observe.auth_sessions(id) ON DELETE CASCADE,
  consumed_at timestamptz
);
CREATE INDEX IF NOT EXISTS auth_refresh_session ON observe.auth_refresh_tokens(session_id);
CREATE TABLE IF NOT EXISTS observe.auth_throttles (
  key text PRIMARY KEY,
  attempts integer NOT NULL,
  resets_at timestamptz NOT NULL
);
INSERT INTO observe.schema_migrations(version) VALUES(2), (3) ON CONFLICT DO NOTHING;
`
