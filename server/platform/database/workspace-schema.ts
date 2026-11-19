export const workspaceSchema = `
CREATE TABLE IF NOT EXISTS observe.data_sources (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  url text NOT NULL,
  query_language text NOT NULL CHECK (query_language IN ('flux','influxql')),
  organization text NOT NULL DEFAULT '',
  database_name text NOT NULL,
  username text NOT NULL DEFAULT '',
  credential_ciphertext text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS observe.telegram_destinations (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  chat_id text NOT NULL,
  bot_token_ciphertext text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS observe.dashboard_folders (
  id uuid PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS dashboard_folders_name_normalized ON observe.dashboard_folders(lower(name));
CREATE TABLE IF NOT EXISTS observe.dashboards (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  folder_name text REFERENCES observe.dashboard_folders(name) ON UPDATE CASCADE ON DELETE RESTRICT,
  tags jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(tags)='array'),
  revision integer NOT NULL DEFAULT 1 CHECK (revision>0),
  definition jsonb NOT NULL CHECK (jsonb_typeof(definition)='object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dashboards_updated ON observe.dashboards(updated_at DESC,id);
CREATE TABLE IF NOT EXISTS observe.dashboard_versions (
  id uuid PRIMARY KEY,
  dashboard_id uuid NOT NULL REFERENCES observe.dashboards(id) ON DELETE CASCADE,
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot)='object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dashboard_versions_lookup ON observe.dashboard_versions(dashboard_id,updated_at DESC);
CREATE TABLE IF NOT EXISTS observe.dashboard_data_sources (
  dashboard_id uuid NOT NULL REFERENCES observe.dashboards(id) ON DELETE CASCADE,
  data_source_id uuid NOT NULL REFERENCES observe.data_sources(id) ON DELETE RESTRICT,
  PRIMARY KEY(dashboard_id,data_source_id)
);
CREATE TABLE IF NOT EXISTS observe.alert_rules (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  data_source_id uuid NOT NULL REFERENCES observe.data_sources(id) ON DELETE RESTRICT,
  folder_name text REFERENCES observe.dashboard_folders(name) ON UPDATE CASCADE ON DELETE RESTRICT,
  enabled boolean NOT NULL,
  next_evaluation_at timestamptz NOT NULL DEFAULT now(),
  evaluation_interval integer NOT NULL CHECK (evaluation_interval BETWEEN 30 AND 86400),
  configuration jsonb NOT NULL CHECK (jsonb_typeof(configuration)='object'),
  runtime jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(runtime)='object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE observe.alert_rules ADD COLUMN IF NOT EXISTS next_evaluation_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS alert_rules_next_evaluation ON observe.alert_rules(next_evaluation_at) WHERE enabled;
CREATE TABLE IF NOT EXISTS observe.alert_rule_destinations (
  alert_rule_id uuid NOT NULL REFERENCES observe.alert_rules(id) ON DELETE CASCADE,
  telegram_destination_id uuid NOT NULL REFERENCES observe.telegram_destinations(id) ON DELETE RESTRICT,
  PRIMARY KEY(alert_rule_id,telegram_destination_id)
);
`
