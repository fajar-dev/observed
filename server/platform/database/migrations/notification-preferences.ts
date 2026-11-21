export const notificationPreferencesMigration = `
ALTER TABLE observe.users ADD COLUMN IF NOT EXISTS realtime_alert_toasts boolean NOT NULL DEFAULT true;
INSERT INTO observe.schema_migrations(version) VALUES(10) ON CONFLICT DO NOTHING;
`
