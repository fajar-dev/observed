# Deployment and operations

Use [Docker](../installation/docker.md) for the application/PostgreSQL stack or a [local build](../installation/local.md) for a Bun runtime with an external database.

## Configuration checklist

1. Use an application database role separate from the PostgreSQL administrator.
2. Preserve and back up `OBSERVE_SECRET_KEY`, which must decode to exactly 32 bytes.
3. Infrastructure must preserve the browser's request host and scheme.
4. The server runtime must reach InfluxDB; browsers do not receive source credentials.
5. Permit outbound Telegram/provider connections when those integrations are used.
6. Keep the process alive continuously; the alert scheduler is always active.
7. Monitor the database, volume, backups, and host access.

Domains and TLS belong to infrastructure outside the application. OAuth callbacks and Secure cookie attributes follow the runtime request URL. Host/scheme must match the browser address; no domain or network-trust environment settings are provided. Authentication throttling uses the client address supplied by the runtime.

## Health and diagnostics

`GET /api/health` is public, uses `Cache-Control: no-store`, and returns `{"status":"ok"}` (200) or `{"status":"unavailable"}` (503). The probe checks database connectivity and migration readiness. It does not establish the health of every InfluxDB source, Telegram, or OAuth provider. Test sources/destinations through Configuration and inspect alert evaluations separately.

```sh
sh docker/compose.sh ps
sh docker/compose.sh logs --tail=100 app
sh docker/compose.sh logs --tail=100 database
curl --fail http://localhost:3000/api/health
```

Never expose environment secrets, credential URLs, password hashes, tokens, or raw cookies in logs. Issue reports should include HTTP status, sanitized messages, reproduction steps, and event time.

## Multiple instances

All instances must share the database and encryption key. Each has its own connection pools. Per-rule locks reduce duplicate evaluation and PostgreSQL-backed notifications allow streaming across instances. Telegram is still not exactly-once if a process crashes during external delivery.

Every instance runs its scheduler. Database locks coordinate individual rules. Use per-rule enable/pause controls; no global scheduler switch exists. Consider InfluxDB load, panel/user counts, refresh, and evaluation intervals before adding replicas.

## Upgrades

Back up the database/key, review schema/environment changes, build the new version, check readiness, and verify sign-in, source queries, dashboards, and alert previews. Automatic migration is not automatic rollback. Returning to an older binary needs a compatible database recovery plan. Do not upgrade PostgreSQL's major version merely by changing the image tag on an existing volume.
