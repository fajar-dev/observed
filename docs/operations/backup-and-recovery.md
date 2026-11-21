# Backup and recovery

## What to preserve

PostgreSQL backups include source/Telegram settings, dashboards/versions, rules/evaluations, accounts, permissions, sessions, and notifications. They do not contain InfluxDB measurements; sensor databases need separate backup policies.

Keep the `OBSERVE_SECRET_KEY` matching each backup. Without it, saved credentials cannot be decrypted. Protect dumps containing account hashes, sessions, and sensitive configuration even though source credentials are encrypted.

## Docker

```sh
sh docker/backup.sh
sh docker/backup.sh backups/observed-before-update.dump
```

The helper uses custom-format `pg_dump` without ownership/ACLs, private files, atomic publication after success, and refuses overwrite. Backups are Git-ignored. Copy them to separate storage according to your operational policy; a backup on the same disk is insufficient for host-loss recovery.

The following restore replaces the target database contents. Confirm the stack/dump and matching key before running:

```sh
sh docker/compose.sh stop app
sh docker/compose.sh exec -T database sh -c \
  'exec pg_restore --clean --if-exists --single-transaction --exit-on-error --no-owner --no-acl --username="$POSTGRES_USER" --role="$OBSERVE_DB_USER" --dbname="$POSTGRES_DB"' \
  < backups/observed-before-update.dump
sh docker/compose.sh up -d --wait app
```

For a new deployment, start the database first, restore, then start the app. Restoring as the application role preserves object ownership for future migrations.

## External databases

Use infrastructure-managed PostgreSQL backups or `pg_dump --format=custom --no-owner --no-acl` with the appropriate role/PGPASSFILE. Avoid passwords on command lines or in logs. Stop application writers during restore and restore as the schema owner. Use PostgreSQL client tools compatible with the server version.

## Recovery verification

1. Restore into a separate database, not the active one.
2. Supply its matching key. Pause rules on the restored copy before starting the verification server to avoid unintended notifications.
3. Check health and sign-in.
4. Inspect dashboards, permissions, notifications, and versions.
5. Verify credential decryption with a known source query.
6. Test scheduling/delivery only with controlled test sources/destinations.

Deleting users or the setup marker is not an administrator recovery procedure. If all administrator access is lost, use a known backup and the database operator's assistance; do not reopen public bootstrap over production configuration. Record recovery duration and acceptable data loss in the installation's operating procedure.

For an isolated recovery/QA database, run as schema owner through psql **before** starting the verification application:

```sql
UPDATE observe.alert_rules SET enabled = false;
```

Do not run this on an active database unless intentionally pausing every rule. After verification, enable only the rules you intend to test through the UI.
