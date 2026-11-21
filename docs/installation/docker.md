# Running with Docker

The stack contains Observed and PostgreSQL. The host needs Docker Engine, Docker Compose v2.20+, and OpenSSL. Node.js, Bun, and a host PostgreSQL installation are not required for this deployment.

## Quick start

From the repository root:

```sh
sh docker/setup.sh
sh docker/compose.sh up -d --build --wait
sh docker/compose.sh ps
```

Open **http://localhost:3000/sign-in** and create the first administrator. There is no default account/password. Migrations run automatically; setup cannot be repeated after completion.

`setup.sh` creates `.env.docker` with different application/administrator database passwords, a random 32-byte encryption key, and file permissions 0600. Existing files are not overwritten. Alternatively, copy the [template](../../docker/.env.example) and provide your own secrets. The development `.env` is separate and is not copied into the image.

## Network access

By default the application is published only on `127.0.0.1:3000`. To allow access from other machines, edit `.env.docker`:

```dotenv
OBSERVE_BIND_ADDRESS=0.0.0.0
OBSERVE_HTTP_PORT=3000
```

Open the server address using the selected host port. The container still listens on port 3000. PostgreSQL does not publish a host port. Apply changes with:

```sh
sh docker/compose.sh up -d --wait
```

The built-in listener uses HTTP. Domains and TLS are handled by infrastructure outside the application. Preserve the correct request host and scheme so OAuth callbacks and cookies match the browser address.

## Sensor sources and Telegram

InfluxDB is not bundled. Add existing sources through Configuration after signing in. For InfluxDB running on the Docker host, use `http://host.docker.internal:8086`; the Linux host-gateway mapping is included. LAN addresses work if reachable from the container. Check the InfluxDB listener and host firewall.

The alert scheduler always runs while the application is running. Pause is configured per rule. Google/Microsoft remain disabled until enabled and configured. Telegram destinations are added through the UI, not through global environment variables. See the [environment reference](../configuration/environment.md).

## Image, runtime, and volume

The [Dockerfile](../../Dockerfile) uses a multi-stage build and locked dependencies. The runtime contains `.output` and startup/health scripts. It runs as the non-root `bun` user with a read-only filesystem, temporary `/tmp`, dropped capabilities, and no additional privileges. Secrets and build dependencies are not copied into the image.

PostgreSQL 18 stores data in the `postgres_data` named volume mounted at `/var/lib/postgresql`. The application role owns its database/schema but is not a superuser and cannot create roles/databases. A separate administrator password initializes PostgreSQL.

The application starts after the database is healthy. `/api/health` also checks database/migration readiness. Both services use restart policies and log rotation. Image architectures follow the available base images; repository container validation was performed on Linux ARM64, not every possible platform.

## Daily operations

```sh
sh docker/compose.sh logs --tail=100 -f app
sh docker/compose.sh restart app
sh docker/backup.sh backups/observed-before-update.dump
sh docker/compose.sh up -d --build --wait
sh docker/compose.sh down
```

`down` preserves the volume. `down --volumes` deletes its data. Keep the encryption key unchanged during upgrades. Do not change the PostgreSQL major version on an existing volume without a database migration. Editing an environment password does not rotate an initialized database role.

[Backup and recovery](../operations/backup-and-recovery.md) covers ownership, matching keys, and controlled restoration. [Troubleshooting](../operations/troubleshooting.md) covers network and startup issues.

## Another environment file

```sh
sh docker/setup.sh /absolute/path/observed.env
OBSERVE_ENV_FILE=/absolute/path/observed.env sh docker/compose.sh up -d --build --wait
```

`COMPOSE_PROJECT_NAME` separates deployments and volume namespaces. Point all helper scripts at the same file/project for a deployment. Do not use a test stack for production data.

## Image with external PostgreSQL

```sh
docker build -t observed:local .
docker run -d --name observed --restart unless-stopped --init \
  --read-only --tmpfs /tmp:size=64m,mode=1777 \
  --cap-drop ALL --security-opt no-new-privileges:true \
  --add-host host.docker.internal:host-gateway \
  --env-file /absolute/path/to/observed.env \
  -p 127.0.0.1:3000:3000 observed:local
```

Provide `DATABASE_URL`, `OBSERVE_SECRET_KEY`, and any optional settings in the environment file. The database user must be able to create/maintain the observe schema. The entrypoint supports secret `_FILE` variants listed in the [environment reference](../configuration/environment.md). Do not set both plain and `_FILE` values; mounted files must be readable by UID 1000.

See [testing](../development/testing.md) for Docker runtime tests. These modify and restore a database in an isolated stack.
