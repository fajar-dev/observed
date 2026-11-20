# Docker deployment

This stack runs Observed and PostgreSQL directly, without a reverse proxy. Only Docker Engine, Docker Compose v2.20+ and OpenSSL are needed on the host. Node.js, Bun and a host PostgreSQL installation are not required.

## Start

From the repository root:

```sh
sh docker/setup.sh
sh docker/compose.sh up -d --build --wait
sh docker/compose.sh ps
```

Open **http://localhost:3000/sign-in** and create the first administrator. Setup is available once. Database tables and migrations are created automatically; there is no default user or password.

`setup.sh` creates `.env.docker` with unique application/database credentials and a 32-byte encryption key, using file permissions `0600`. Running it again preserves the existing file. The local development `.env` is separate and is never copied into the image. You can also copy `docker/.env.example` to `.env.docker` and supply your own secrets.

## Port and host

The default binding is `127.0.0.1:3000`. To allow direct access from another machine, edit `.env.docker`:

```dotenv
OBSERVE_BIND_ADDRESS=0.0.0.0
OBSERVE_HTTP_PORT=3000
OBSERVE_ORIGIN=http://your-server-address:3000
```

Use the exact browser origin, including the port. When changing the host port, update `OBSERVE_ORIGIN` too. The container always listens on port 3000. PostgreSQL is reachable only inside the Compose network; its port is not published.

Apply configuration changes with:

```sh
sh docker/compose.sh up -d --wait
```

The bundled listener is HTTP. An externally provided HTTPS deployment must set `OBSERVE_ORIGIN` to its HTTPS origin so session cookies and OAuth callbacks use the correct scheme. No proxy is installed by this stack.

## Container contents and data

- The Dockerfile builds with the locked dependencies and Bun version from `package.json`, using separate build and runtime stages.
- The runtime includes the generated Nuxt output and container startup/health scripts. Build dependencies, source credentials and `.env` files are excluded.
- Observed runs as the non-root `bun` user with a read-only filesystem, temporary `/tmp`, dropped capabilities and no additional privileges.
- The application database role owns its database and can run migrations, but is not a PostgreSQL superuser and cannot create roles or databases. A separate generated administrator password initializes PostgreSQL.
- The `postgres_data` named volume stores database files. The PostgreSQL 18 volume is mounted at `/var/lib/postgresql`, following the official image layout.
- Application health uses `/api/health`, including database connectivity and migrations. It returns only `ok` or `unavailable`; failure uses HTTP 503.
- The application starts after PostgreSQL becomes healthy. Both services restart unless explicitly stopped; logs rotate automatically.

The image supports the architectures available in the official Bun/PostgreSQL images; local validation was performed on Linux ARM64.

## InfluxDB and Telegram

Configure sources and optional Telegram destinations in Observed after administrator setup. There is no bundled InfluxDB: the application connects to existing sensor sources.

Inside a container, `localhost` refers to that container. For an InfluxDB instance on the Docker host, use `http://host.docker.internal:8086`; the Compose file includes the Linux host-gateway mapping. LAN source URLs can be used directly if the Docker host can reach them. Container-to-host traffic must also be accepted by the host service/firewall.

`OBSERVE_ALERTS_ENABLED=true` enables scheduled evaluation by default. Set it to `false` only on an application instance that should not evaluate rules. Google/Microsoft remain disabled by default; the existing provider variables in `.env.docker` are passed to the application. Their registered callbacks must match `OBSERVE_ORIGIN`.

## Backup

```sh
sh docker/backup.sh
# Or choose an output filename:
sh docker/backup.sh backups/observed-before-update.dump
```

The helper creates a complete custom-format PostgreSQL dump, publishes it only after success, and refuses to overwrite a destination. Backups use private file permissions and are ignored by Git and Docker builds.

Keep the matching `.env.docker` or its `OBSERVE_SECRET_KEY` in secure backup storage as well. The database contains encrypted InfluxDB credentials and Telegram tokens; changing or losing the key prevents decrypting them. The database volume and key must survive application upgrades.

## Restore

These commands replace the database contents with the chosen backup. Use them on the intended deployment, with its matching encryption key configured:

```sh
sh docker/compose.sh stop app
sh docker/compose.sh exec -T database sh -c \
  'exec pg_restore --clean --if-exists --single-transaction --exit-on-error --no-owner --no-acl --username="$POSTGRES_USER" --role="$OBSERVE_DB_USER" --dbname="$POSTGRES_DB"' \
  < backups/observed-before-update.dump
sh docker/compose.sh up -d --wait app
```

Restoring as the application role preserves ownership needed by future migrations. For a fresh deployment, start `database` first, restore, then start `app`. Application updates should be backed up before deployment because schema migrations run on readiness/startup.

## Update and operate

```sh
sh docker/backup.sh
sh docker/compose.sh up -d --build --wait
sh docker/compose.sh logs --tail=100 -f app
sh docker/compose.sh restart app
sh docker/compose.sh down
```

`down` keeps the named database volume. Adding `--volumes` removes its data. Keep PostgreSQL on the configured major version until you deliberately perform a PostgreSQL major-version upgrade; do not attach an existing volume to a different major without migrating it. Credential changes in `.env.docker` do not rotate an initialized PostgreSQL role automatically.

For another configuration file, set `OBSERVE_ENV_FILE=/absolute/path/to/settings.env` when using the helper scripts. Compose's `COMPOSE_PROJECT_NAME` separates independent deployments and their volumes.

## Existing PostgreSQL / standalone image

The image also accepts the application's existing `DATABASE_URL`:

```sh
docker build -t observed:local .
docker run -d --name observed --restart unless-stopped --init \
  --read-only --tmpfs /tmp:size=64m,mode=1777 \
  --cap-drop ALL --security-opt no-new-privileges:true \
  --add-host host.docker.internal:host-gateway \
  --env-file /absolute/path/to/observed.env \
  -p 127.0.0.1:3000:3000 observed:local
```

That environment file must contain `DATABASE_URL`, `OBSERVE_SECRET_KEY` and the correct `OBSERVE_ORIGIN`; add provider/scheduler variables as needed. Its database user must be able to create and maintain the `observe` schema. Startup also supports `DATABASE_URL_FILE`, `POSTGRES_PASSWORD_FILE`, `OBSERVE_SECRET_KEY_FILE`, and the Google/Microsoft client-secret `_FILE` equivalents for mounted secret files. Set the plain variable or its `_FILE` variant, not both, and make mounted files readable by UID 1000.

## Verification

Optional container tests also require the project development dependencies, Node.js and Chrome/Chromium on the test host. They use a separate stack with a project name ending in `-smoke`, a fresh database and local origin:

```sh
sh docker/setup.sh /tmp/observed-smoke.env
# Set COMPOSE_PROJECT_NAME=observed-smoke, OBSERVE_HTTP_PORT=3113,
# OBSERVE_ORIGIN=http://127.0.0.1:3113, OBSERVE_ALERTS_ENABLED=false in that file.
OBSERVE_ENV_FILE=/tmp/observed-smoke.env sh docker/compose.sh up -d --build --wait
DOCKER_TEST_URL=http://127.0.0.1:3113 \
DOCKER_TEST_PROJECT=observed-smoke \
DOCKER_TEST_ENV_FILE=/tmp/observed-smoke.env \
node --test tests/docker/runtime.test.mjs
```

The test creates QA accounts/resources in that isolated stack, calls a simulated host InfluxDB server, verifies firing/recovery and direct SSE, recreates the app, checks database-outage readiness, then tests backup/restore, credential decryption and browser sign-in. It does not send Telegram messages. Never point this test at a real deployment. After testing, remove only that dedicated project and its volumes.

References: [Bun Docker guide](https://bun.sh/guides/ecosystem/docker), [Compose readiness ordering](https://docs.docker.com/compose/how-tos/startup-order/), [official PostgreSQL image](https://hub.docker.com/_/postgres).
