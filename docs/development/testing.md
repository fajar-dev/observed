# Testing and quality checks

Run from the repository root after installing dependencies and preparing Nuxt. Do not use an active application database. Report checks skipped for missing dependencies/environment as skipped, not passed.

## Core checks

```sh
bun run lint
bun run typecheck
bun run test
bun run docs:check
bun run audit:architecture --inventory
bun run build
```

Lint covers semantic UI and Tailwind rules. Typecheck verifies Nuxt/TypeScript contracts. Unit tests cover auth/permissions, layout/refresh/import, queries, services, transport, container environment, health, and notifications. Build verifies deployable output. The architecture audit checks static dependencies/reachability and prohibited inline notifications; it does not prove all runtime behavior correct.

`docs:check` validates local Markdown links, schema examples, environment templates, and endpoint coverage. Regenerate the inventory when runtime source changes. Historical test counts are not permanent requirements.

## PostgreSQL integration

Create an isolated database whose name ends in `_test` and point `TEST_DATABASE_URL` at it. Integration files DROP/recreate the `observe` schema. The suffix is a guard, not a substitute for selecting the correct database.

Run files sequentially when sharing a database to avoid schema-reset races:

```sh
export TEST_DATABASE_URL='postgresql://TEST_USER:TEST_PASSWORD@127.0.0.1:5432/observed_test'
(
  set -e
  for spec in tests/integration/*.test.ts; do
    bun test --timeout 30000 --tsconfig-override .nuxt/tsconfig.server.json "$spec"
  done
)
```

The `set -e` subshell propagates failures. `test:integration` is also available, but do not run mutually destructive schema-reset files concurrently on one database. Coverage includes one-time setup, refresh/sessions, resource persistence/revisions, encryption, grants, atomic notifications, and per-user pop-up preferences/migration. For temporary Docker PostgreSQL, wait for its final TCP listener rather than only the initialization server's Unix socket.

## Fixture browser tests

Run the application server, for example on port 3000. Playwright-core uses installed Chrome: macOS Chrome detection, `BROWSER_EXECUTABLE` for an explicit executable, or the installed `chrome` channel. It does not download a browser automatically.

```sh
BROWSER_BASE_URL=http://localhost:3000 \
  node --test --test-concurrency=1 tests/browser/*.test.mjs
```

Most browser tests mock APIs and check auth layout, identity, sidebar activation, rows, kiosk, responsive drag/resize, refresh, dialogs, visualizations, and alert pop-up preferences. Temporary screenshots go to `/tmp`, not committed artifacts.

## Live browser tests: permissions and inbox

Two opt-in tests use `PERMISSION_TEST_DATABASE_URL` and `NOTIFICATION_TEST_DATABASE_URL`. Their database must end in `_test` and match the application's DATABASE_URL at BROWSER_BASE_URL. Use a valid test key and simulated sources. Scheduling is also active in tests; keep rules paused outside controlled evaluation steps, or use a long interval after the initial manual evaluation.

```sh
BROWSER_BASE_URL=http://127.0.0.1:3001 \
PERMISSION_TEST_DATABASE_URL='postgresql://TEST_USER:TEST_PASSWORD@127.0.0.1:5432/observed_browser_test' \
NOTIFICATION_TEST_DATABASE_URL='postgresql://TEST_USER:TEST_PASSWORD@127.0.0.1:5432/observed_browser_test' \
node --test --test-concurrency=1 \
  tests/browser/permissions.test.mjs tests/browser/alert-notifications.test.mjs
```

These tests initialize/sign in the fixture account `notifications@example.test` using test credentials in source, create accounts/resources, insert events, and may TRUNCATE notifications. Start with a fresh QA database to avoid conflicting administrator credentials. Sensor data comes from a simulated server, not production InfluxDB/Telegram. Never target an active deployment merely to obtain a screenshot.

## Docker runtime

The test host needs development dependencies, Node.js, and Chrome in addition to Docker. Create an isolated environment/stack:

```sh
sh docker/setup.sh /tmp/observed-smoke.env
```

Set `COMPOSE_PROJECT_NAME=observed-smoke` and `OBSERVE_HTTP_PORT=3113` in that file, then run:

```sh
OBSERVE_ENV_FILE=/tmp/observed-smoke.env sh docker/compose.sh up -d --build --wait
DOCKER_TEST_URL=http://127.0.0.1:3113 \
DOCKER_TEST_PROJECT=observed-smoke \
DOCKER_TEST_ENV_FILE=/tmp/observed-smoke.env \
node --test tests/docker/runtime.test.mjs
```

The test requires a local origin and a project name ending in `-smoke`. It checks container privileges, setup/auth, host sensor simulation, queries, firing/recovery, SSE, persistence after app recreation, readiness during database outage, backup/restore, credential decryption, and browser sign-in. It sends no real Telegram messages. Remove only the dedicated QA stack/volumes:

```sh
OBSERVE_ENV_FILE=/tmp/observed-smoke.env sh docker/compose.sh down --volumes
```

## Choosing checks

Simple copy/style changes need lint, documentation checks, and relevant visual inspection. Contract changes need typecheck/unit tests. Permissions/persistence need integration and direct requests. Stream/layout lifecycle changes need the relevant browser checks. Real Telegram tests require an authorized test destination. Avoid tests that merely mirror implementation without checking meaningful behavior.
