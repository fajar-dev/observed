export const initialWorkspaceMigration = `
CREATE SCHEMA IF NOT EXISTS observe;
CREATE TABLE IF NOT EXISTS observe.schema_migrations (
  version integer PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS observe.data_sources (
  id uuid PRIMARY KEY,
  document jsonb NOT NULL CHECK (jsonb_typeof(document) = 'object'),
  name text GENERATED ALWAYS AS (document->>'name') STORED,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS observe.dashboards (LIKE observe.data_sources INCLUDING ALL);
CREATE TABLE IF NOT EXISTS observe.alert_rules (LIKE observe.data_sources INCLUDING ALL);
CREATE TABLE IF NOT EXISTS observe.telegram_destinations (LIKE observe.data_sources INCLUDING ALL);
CREATE TABLE IF NOT EXISTS observe.dashboard_folders (LIKE observe.data_sources INCLUDING ALL);
CREATE UNIQUE INDEX IF NOT EXISTS dashboard_folder_name ON observe.dashboard_folders (lower(name));
CREATE TABLE IF NOT EXISTS observe.dashboard_versions (
  id uuid PRIMARY KEY,
  document jsonb NOT NULL CHECK (jsonb_typeof(document) = 'object'),
  dashboard_id uuid GENERATED ALWAYS AS ((document->>'dashboardId')::uuid) STORED REFERENCES observe.dashboards(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dashboard_versions_dashboard ON observe.dashboard_versions (dashboard_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS alert_rules_enabled ON observe.alert_rules ((document->>'enabled'));
INSERT INTO observe.schema_migrations (version) VALUES (1) ON CONFLICT DO NOTHING;
`
