# Database and migrations

PostgreSQL stores application state in the `observe` schema. Sensor time-series measurements remain in InfluxDB. The database combines relational metadata and foreign keys with JSONB for flexible panel/alert configuration.

## Active tables

| Table | Main contents |
| --- | --- |
| `schema_migrations` | Applied migration versions |
| `data_sources` | InfluxDB connections and encrypted credentials |
| `telegram_destinations` | Chat IDs and encrypted bot tokens |
| `dashboard_folders` | Unique folder names with normalized-name constraints |
| `dashboards` | Metadata, JSONB definition, revision, `created_by` |
| `dashboard_versions` | Previous snapshots |
| `dashboard_data_sources` | Source references enforcing dashboard integrity |
| `alert_rules` | JSONB configuration/runtime, enabled state, next evaluation, creator |
| `alert_rule_destinations` | Multiple Telegram destinations per alert |
| `users` | Account identity, role, enabled state, optional password hash, alert pop-up preference |
| `auth_setup` | Durable singleton setup-completion marker |
| `auth_identities` | Provider + subject bindings to users |
| `auth_sessions` | Sessions, expiration, revocation, user agent |
| `auth_refresh_tokens` | Hashed refresh tokens and consumed state |
| `auth_throttles` | Authentication attempt counters |
| `user_access` | Dashboard/alert scope and base access level per user |
| `user_dashboard_permissions` | Individual dashboard grants |
| `user_alert_permissions` | Individual alert grants |
| `alert_notifications` | Firing/recovery snapshots and bigint sequence |
| `notification_reads` | Per-user notification read timestamps |

DDL sources: [resource schema](../../server/platform/database/workspace-schema.ts), [authentication](../../server/platform/database/migrations/authentication.ts), [permissions](../../server/platform/database/migrations/permissions.ts), [notifications](../../server/platform/database/migrations/notifications.ts), [notification preferences](../../server/platform/database/migrations/notification-preferences.ts). The active model has no independent source or notification ACL.

## Relationships and deletion

Dashboards/alerts have nullable creator references. Deleting a user sets creator references to null rather than deleting structural monitoring configuration. Referenced sources/destinations cannot be deleted. Grants and dashboard versions cascade with their resources according to foreign keys.

`alert_notifications.alert_rule_id` deliberately has no rule foreign key so historical snapshots survive rule deletion. Read access remains permission-filtered. Read receipts reference users and events with cascading deletion.

## Transactions and concurrency

- SQL uses parameters; resource table mappings are controlled by code, not user input.
- Resource creation and the creator's Edit grant share a transaction.
- Dashboard updates check revisions and atomically save previous-version snapshots.
- Per-rule advisory locks prevent concurrent evaluations. A separate lock pool retains the connection throughout each operation.
- Evaluation state and in-app events share a transaction. Event ordering prevents cursor replay from skipping late commits.

Each instance has a main pool of up to 12 connections and a lock pool of up to four, with a five-second connection timeout. Account for replica count when sizing PostgreSQL capacity.

## Migrations

[PostgresDatabase.ready](../../server/platform/database/database.ts) runs automatic migrations through one initialization promise per process. Migrations use a transaction and schema advisory lock so simultaneous instances do not change the schema concurrently. Failure rolls back and permits a later initialization retry.

Legacy normalization and numbered migrations are implementation details, not manual installation instructions. Never delete setup or schema_migrations markers to repair sign-in. There is no automatic schema rollback CLI.

For a new migration, use a new version, appropriate idempotent SQL, guarded one-time backfills, and tests against fresh and previous-version databases. Do not reinterpret historical data by editing old migrations without a transition. Back up before upgrading; downgrading the application binary does not undo its schema changes.

Migration 10 adds `users.realtime_alert_toasts BOOLEAN NOT NULL DEFAULT true`. This is a per-user presentation preference, not notification authorization. Updating it does not revoke sessions or modify alert grants.

## Retention and backup

Dashboard versions retain up to 100 snapshots; evaluation history retains 50 entries per rule. Notifications are not automatically capped at 50 database rows: 50 is the inbox display limit. No configurable notification-retention job is implemented. Plan database maintenance for event volume.

Back up the database and its matching encryption key, storing them securely and separately. [Backup and recovery](../operations/backup-and-recovery.md) covers ownership restoration and credential verification.
