export const notificationsMigration = `
CREATE TABLE IF NOT EXISTS observe.alert_notifications (
  id uuid PRIMARY KEY,
  sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  alert_rule_id uuid NOT NULL,
  occurred_at timestamptz NOT NULL,
  payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object')
);
CREATE TABLE IF NOT EXISTS observe.notification_reads (
  user_id uuid NOT NULL REFERENCES observe.users(id) ON DELETE CASCADE,
  notification_id uuid NOT NULL REFERENCES observe.alert_notifications(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,notification_id)
);
CREATE INDEX IF NOT EXISTS notification_reads_notification ON observe.notification_reads(notification_id);
INSERT INTO observe.schema_migrations(version) VALUES(5) ON CONFLICT DO NOTHING;
`
