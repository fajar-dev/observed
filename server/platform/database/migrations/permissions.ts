export const permissionsMigration = `
CREATE TABLE IF NOT EXISTS observe.user_access (
  user_id uuid PRIMARY KEY REFERENCES observe.users(id) ON DELETE CASCADE,
  dashboard_scope text NOT NULL DEFAULT 'none' CHECK(dashboard_scope IN ('none','selected','all')),
  dashboard_access text NOT NULL DEFAULT 'view' CHECK(dashboard_access IN ('view','edit')),
  alert_scope text NOT NULL DEFAULT 'none' CHECK(alert_scope IN ('none','selected','all')),
  alert_access text NOT NULL DEFAULT 'view' CHECK(alert_access IN ('view','edit'))
);
CREATE TABLE IF NOT EXISTS observe.user_dashboard_permissions (
  user_id uuid NOT NULL REFERENCES observe.users(id) ON DELETE CASCADE,
  dashboard_id uuid NOT NULL REFERENCES observe.dashboards(id) ON DELETE CASCADE,
  access text NOT NULL CHECK(access IN ('view','edit')),
  PRIMARY KEY(user_id,dashboard_id)
);
CREATE TABLE IF NOT EXISTS observe.user_alert_permissions (
  user_id uuid NOT NULL REFERENCES observe.users(id) ON DELETE CASCADE,
  alert_rule_id uuid NOT NULL REFERENCES observe.alert_rules(id) ON DELETE CASCADE,
  access text NOT NULL CHECK(access IN ('view','edit')),
  PRIMARY KEY(user_id,alert_rule_id)
);
CREATE INDEX IF NOT EXISTS user_dashboard_permissions_resource ON observe.user_dashboard_permissions(dashboard_id);
CREATE INDEX IF NOT EXISTS user_alert_permissions_resource ON observe.user_alert_permissions(alert_rule_id);
-- Preserve existing access once. Accounts created after this migration start with no grants.
INSERT INTO observe.user_access(user_id,dashboard_scope,dashboard_access,alert_scope,alert_access)
SELECT id,'all',CASE WHEN role IN ('admin','editor') THEN 'edit' ELSE 'view' END,
'all',CASE WHEN role IN ('admin','editor') THEN 'edit' ELSE 'view' END
FROM observe.users WHERE NOT EXISTS(SELECT 1 FROM observe.schema_migrations WHERE version=6)
ON CONFLICT DO NOTHING;
INSERT INTO observe.schema_migrations(version) VALUES(6) ON CONFLICT DO NOTHING;
-- Retire the preliminary independent notification settings without changing alert grants.
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='observe' AND table_name='user_access' AND column_name='notification_scope') THEN
    UPDATE observe.auth_sessions SET revoked_at=now() WHERE revoked_at IS NULL;
  END IF;
END $$;
DROP TABLE IF EXISTS observe.user_notification_permissions;
ALTER TABLE observe.user_access DROP COLUMN IF EXISTS notification_scope;
INSERT INTO observe.schema_migrations(version) VALUES(7) ON CONFLICT DO NOTHING;

ALTER TABLE observe.dashboards ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES observe.users(id) ON DELETE SET NULL;
ALTER TABLE observe.alert_rules ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES observe.users(id) ON DELETE SET NULL;
INSERT INTO observe.schema_migrations(version) VALUES(8) ON CONFLICT DO NOTHING;
-- Remove the retired data-source ACL from installations that used it.
DROP TABLE IF EXISTS observe.user_data_source_permissions;
ALTER TABLE observe.user_access DROP COLUMN IF EXISTS query_scope;
INSERT INTO observe.schema_migrations(version) VALUES(9) ON CONFLICT DO NOTHING;
`
