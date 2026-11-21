# Local installation

## Prerequisites

Install Git, the Bun version declared by `packageManager` in [package.json](../../package.json) (currently 1.4.4), Node.js compatible with the Nuxt dependencies for tooling, and PostgreSQL. The Docker deployment uses PostgreSQL 18. Choose [Docker](docker.md) if you do not want a local database installation.

Provide an InfluxDB instance containing sensor data. The application does not create buckets or insert sensor samples automatically.

## Start the application

From the repository root:

```sh
bun install --frozen-lockfile
cp .env.example .env
openssl rand -base64 32
```

Set `OBSERVE_SECRET_KEY` in `.env` to the generated value. Never commit secrets. Create a dedicated database role, for example through `psql` as a PostgreSQL administrator:

```sql
CREATE ROLE observed LOGIN;
\password observed
CREATE DATABASE observed OWNER observed;
```

Use the password you created. Percent-encode special characters in the password section of the database URL:

```dotenv
DATABASE_URL=postgresql://observed:YOUR_URL_ENCODED_PASSWORD@127.0.0.1:5432/observed
OBSERVE_SECRET_KEY=YOUR_32_BYTE_BASE64_KEY
```

```sh
bun run dev
```

Open `http://localhost:3000/sign-in` and enter the first administrator's name, email, and password (12–128 characters). Setup completion is persisted and does not reopen after a restart. There is no setup token or default account.

Migrations run automatically when the database is first used, including through the health check. The application role must be able to create and maintain the `observe` schema. After signing in, continue with [Configuration](../configuration/data-sources.md).

## Production build without Docker

```sh
bun run build
bun --env-file=.env .output/server/index.mjs
```

Build output is written to `.output`. `bun run start` runs that output, but the calling process must load the production environment; do not assume Nuxt reads `.env` when running the built server. Set `HOST`/`PORT` or `NITRO_HOST`/`NITRO_PORT` for the listener. Authentication callbacks follow the incoming request URL without an origin environment setting.

## Verify readiness

```sh
curl --fail http://localhost:3000/api/health
bun run lint
bun run typecheck
bun run test
```

A successful health check returns `{"status":"ok"}`. HTTP 503 means the application/database is not ready; see [troubleshooting](../operations/troubleshooting.md). Integration tests require a separate database, not this application database.
