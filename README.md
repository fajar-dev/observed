# Observe workspace

A Nuxt 4 application for InfluxDB dashboards and Telegram alerts. It uses Nuxt UI 4, PostgreSQL, Flux and InfluxQL. There is no separate query playground: queries are built and previewed in the panel editor.

## Run locally

Install Node.js, Bun, and PostgreSQL, then:

```sh
cp .env.example .env
openssl rand -base64 32
bun install
bun run dev
```

Set `DATABASE_URL` and paste the base64 key into `OBSERVE_SECRET_KEY` before starting. Open `/sign-in` to create the first administrator directly with a name, email and password. No setup token is needed. Complete this step before exposing a new installation publicly. A durable database marker closes setup permanently once it succeeds, including after a restart or deletion of user records; no default account or password is created. Existing installations with users are marked as already configured automatically. The key encrypts InfluxDB credentials and Telegram tokens with AES-256-GCM; keep it with database backups. Changing it makes previously encrypted credentials unreadable.

The application creates the `observe` PostgreSQL schema and its feature tables automatically. A transactional, one-time migration converts the previous document tables into relational tables, including credentials and dashboard history. Normal runtime reads only the new schema.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `OBSERVE_SECRET_KEY` | Base64 encoded 32-byte encryption key |
| `OBSERVE_TRUST_PROXY` | Trust X-Forwarded-For for login throttling only behind a trusted proxy |
| `OBSERVE_ORIGIN` | Public origin when a reverse proxy changes the origin seen by the app |
| `OBSERVE_ALERTS_ENABLED` | Set `false` on processes that should not run the alert scheduler |

## Authentication and authorization

Local sign-in uses email and password. Passwords use salted scrypt hashes. Access tokens are HS256 JWTs with issuer/audience validation and a 10-minute lifetime, signed with a key derived separately from `OBSERVE_SECRET_KEY`. Refresh tokens are random opaque values, stored only as SHA-256 hashes in PostgreSQL. Sessions have an absolute 30-day expiry. Every refresh rotates its token; reuse revokes that session. Browser credentials use HttpOnly, SameSite=Lax cookies and Secure cookies on HTTPS. Tokens are never stored in localStorage.

The browser renews expired access tokens automatically, sharing renewal across tabs through Web Locks where supported. Signing out revokes the current session. Profile lists active sessions and allows revocation. Password changes revoke all sessions. Role, account status and session validity are checked against PostgreSQL on every authenticated API request. Disabling/deleting a user or changing their role takes effect immediately. Self-deletion, self-demotion and removal of the last active administrator are blocked.

| Capability | Viewer | Editor | Admin |
| --- | --- | --- | --- |
| Read dashboards, alerts, query results and source metadata | Yes | Yes | Yes |
| Create/edit/delete dashboards, folders and alert rules; import JSON; evaluate alerts | No | Yes | Yes |
| Configure/test InfluxDB and Telegram | No | No | Yes |
| Manage users and roles | No | No | Yes |
| Update own profile/password; manage own sessions | Yes | Yes | Yes |

Users are workspace-wide; per-dashboard ACLs and organizations are not implemented. Configure InfluxDB connections with read-only credentials scoped to the intended buckets. Telegram chat IDs are omitted from metadata responses for non-admin users. All protected endpoints enforce role checks on the server. Cookie-authenticated mutations validate the request origin. Password sign-in is rate-limited by account and client IP. The old Basic authentication and trusted-auth-proxy bypass are no longer supported.

Use **Users → Add user** to provision accounts. New local accounts require a password of at least 12 characters; share initial credentials securely. There is no public local registration, email delivery or forgotten-password flow. An administrator can reset another user's password.

### Google and Microsoft sign-in

Providers are disabled by default. Set `OBSERVE_ORIGIN` to the exact public origin (for example `https://observe.example.com`). Register a confidential web OAuth/OIDC application with each provider, then configure:

| Provider | Environment | Registered redirect URI |
| --- | --- | --- |
| Google | `OBSERVE_GOOGLE_ENABLED=true`, `OBSERVE_GOOGLE_CLIENT_ID`, `OBSERVE_GOOGLE_CLIENT_SECRET` | `{OBSERVE_ORIGIN}/api/observe/auth/oauth/google/callback` |
| Microsoft Entra ID | `OBSERVE_MICROSOFT_ENABLED=true`, `OBSERVE_MICROSOFT_CLIENT_ID`, `OBSERVE_MICROSOFT_CLIENT_SECRET`, `OBSERVE_MICROSOFT_TENANT_ID` | `{OBSERVE_ORIGIN}/api/observe/auth/oauth/microsoft/callback` |

Microsoft requires a specific tenant UUID and an application configured to supply an email claim; `common`/`organizations` multi-tenant issuers are not accepted. Both providers use Authorization Code with PKCE (S256), state, nonce, issuer/audience validation and signed ID-token verification. Provider access/refresh tokens are discarded after identifying the user.

By default, an existing user signs in locally and connects Google/Microsoft from **Profile → Sign-in methods**. Provider identities are bound by provider + subject and never automatically attached by matching email. Set `OBSERVE_OAUTH_ALLOW_SIGNUP=true` to let new identities create Viewer accounts after administrator setup. An identity whose email matches an existing account must still link from Profile. OAuth cannot create the first administrator or elevate roles. Disabled providers reject both initiation and callback requests. Restart the server after changing provider environment settings.

Database authentication tables are relational: `auth_setup`, `users`, `auth_identities`, `auth_sessions`, `auth_refresh_tokens` and `auth_throttles`. They are added automatically without replacing dashboards or configuration.

The private dashboard is client-rendered (`ssr: false`). Authentication is restored before protected navigation, avoiding competing server/client session renders and hydration mismatches. APIs and authorization remain on the Nitro server. Production runs the generated server with Bun:

```sh
bun run test
bun run lint
bun run typecheck
bun run build
bun --env-file=.env .output/server/index.mjs
```

Use HTTPS and persistent PostgreSQL in production. Operators can configure private InfluxDB endpoints and execute queries, so restrict workspace and network access to the intended operators and services.

## Features

- **Configuration:** multiple named InfluxDB sources and Telegram destinations. Credentials stay encrypted on the server. Flux needs an organization and bucket; InfluxQL needs a database and token or username/password. InfluxDB 2 InfluxQL also needs a DBRP mapping.
- **Dashboards:** folders, tags, list/grid browsing, duplication, JSON export, version history, conflict detection, and draggable/resizable panels. Dashboard variables live within dashboard content. Kiosk mode hides workspace navigation, editing actions and panel menus. The dashboard toolbar, variables, time picker and refresh controls remain available; exit with Escape or **Exit kiosk** in the toolbar. A saved dashboard can open directly with `?kiosk=1`, preserving time range and variable selections. Relative/absolute ranges and auto-refresh control queries.
- **Panel editor:** metadata discovery, a visual query builder, raw Flux/InfluxQL, multiple queries, result inspection and CSV export. Visualization options include units, decimals, colors, thresholds, bounds, legends and field appearance. Supported types are line, area, bar, pie, stat, gauge, bar gauge, table and text.
- **JSON import:** native workspace JSON and supported Grafana Classic JSON. Review source mappings and query checks before saving. Supported panel layout, units, colors, legends, table options and variables are converted. Plugin-specific panels, advanced transformations and schema v2 require manual conversion. Remote Grafana ID/URL import is deliberately absent.
- **Telegram alerts:** query preview, thresholds, reducers, evaluation intervals, pending periods, pause/mute, evaluation history and multiple destinations per rule. The scheduler checks due rules every ten seconds. PostgreSQL advisory locks prevent concurrent evaluation of the same rule. Firing and recovery notifications are tracked per destination, with retry on a later evaluation after failed delivery. Manual evaluation of enabled rules may send notifications.

Dashboard rows are real collapsible sections: click a row heading to hide or reveal its panels. In **Edit dashboard**, use **Add → Add row**, the row menu to rename/reorder/remove a row while keeping its panels, and **Panel actions → Move to row** to change membership. On desktop, drag a panel header to reposition it, drag its bottom-right corner to resize it, or use **Dashboard actions → Compact layout** to remove gaps. Save stores row order, default collapse state and panel geometry; mobile stacking does not overwrite the desktop layout. Collapsing in view mode is temporary and does not mark the dashboard as modified. Mobile touch menus support row and panel operations while the grid presents a single column. See the [desktop/mobile dashboard audit](docs/dashboard-audit.md) for regression coverage.

Telegram notifications use escaped [Telegram HTML](https://core.telegram.org/bots/api#html-style) for status and field labels. Firing and recovery messages include the alert name, source name, current value, original threshold condition and event time in WIB (Asia/Jakarta), plus optional severity and description. Values retain the query’s units; no unit is inferred from alert names.

Flux queries support `v.defaultBucket`, `v.timeRangeStart`, `v.timeRangeStop` and `v.windowPeriod`. InfluxQL supports `$timeFilter`, `$__timeFilter()` and `$__interval`. Include a time predicate for time-picker behavior. Reference dashboard variables as `$name` or `${name}`. Multi-value variables use escaped regex/set interpolation as appropriate to the query language.

## Architecture

```text
app/
  pages/                       Route entry points
  layouts/                     Workspace shell
  components/layout/           Sidebar, header and brand
  components/ui/               Shared presentation components
  core/http/                   Injected API client
  core/composables/            Shared resource state and feature contexts
  features/
    dashboards/                Library, editor, import and variables
    panels/                    Panel editor and appearance controls
    queries/                   Builder, inspector and visualizations
    alerts/                    Rule editor and history
    configuration/             InfluxDB and Telegram management
  assets/styles/               Semantic tokens, base, shell and visualization styles
server/
  bootstrap/                   Configuration and dependency composition
  domain/                      Repository/gateway ports and shared entities
  features/                    Feature application services and adapters
    auth/                      Accounts, sessions, JWT, passwords and OIDC
    dashboards/                Dashboard services, imports and diagnostics
    data-sources/              InfluxDB source management
    queries/                   Query execution and variable resolution
    alerts/                    Evaluation, state and delivery coordination
    telegram/                  Destination management and transport
  platform/                    Database, encryption, HTTP and clock adapters
    database/migrations/       Versioned, transactional schema changes
  http/                        Request validation and authentication helpers
  api/observe/                 Thin HTTP controllers
  middleware/                  Authorization and origin validation
  plugins/                     Alert scheduler and lifecycle
shared/
  domain/                      Validated domain contracts and query builder
  utils/                       Pure interpolation, layout and variable helpers
tests/unit/                    Domain and application tests
tests/integration/             Isolated PostgreSQL integration tests
tests/browser/                 Portable browser regression tests
tooling/audit/                 Architecture and source inventory checks
```

Services receive interfaces through constructors. `server/bootstrap/workspace.ts` composes concrete adapters. HTTP controllers validate input and invoke services. Database table names, API paths and resource state are defined consistently around data sources, dashboards, alert rules and Telegram destinations.

Persistence uses typed resource repositories over explicit metadata columns. Flexible dashboard definitions, alert configuration and runtime state remain JSONB; source credentials and Telegram tokens have dedicated encrypted columns. `dashboard_data_sources` and `alert_rule_destinations` enforce references through foreign keys. Folder references, cascading version deletion, atomic revision checks and snapshots are enforced in transactions. Alert scheduling selects indexed due rules instead of scanning every rule. Authentication has independent relational tables. Schema changes belong in `server/platform/database/migrations`.

Frontend controllers are organized by feature. Shared HTTP transport, renewal, resource caching and query cancellation live in dedicated modules. The API client is injected once; Vue controllers capture it during setup. Superseded queries are aborted and stale results cannot replace the latest result. Collection fetches are deduplicated across panel instances.

## UI conventions

Use Nuxt UI components and their semantic `xs`, `sm`, `md`, `lg`, `xl` size props. Shared component themes live in `app/app.config.ts`. All tabs inherit the same underline variant, text size, spacing and active-state colors from that theme; individual pages do not define separate pill or underline styles. Pages use `WorkspacePage`; fields use `UFormField`; forms, tables, tabs, cards, charts and dialogs use Nuxt UI. Charts use `UChart` with TanStack definitions for field colors, named secondary axes and unit formatting. Custom renderers are limited to visualization-specific gauges, statistics and the dashboard grid.

Spacing uses `space-xs`, `space-sm`, `space-md`, `space-lg`, `space-xl`, `space-xxl`, `space-section` and `space-page`. Role sizes include `control-md`, `icon-md`, `field`, `drawer`, `modal` and `chart`. Values are centralized in `app/assets/styles/tokens.css`; avoid numeric or arbitrary utility classes. The local `semantic-ui/semantic-sizes` ESLint rule enforces this convention. Do not override Tailwind container namespaces with spacing tokens: Nuxt UI uses those for overlay widths.

Inter is the interface and form font; Manrope gives headings and metrics a distinct shape, and preserves the established shell typography. JetBrains Mono is for query text. Titles use semibold weight, labels and controls use medium, and descriptions and input values use regular weight. Theme colors and typography apply in light and dark modes. The shell uses a compact sidebar rail and a full-width top header. Dense data stays scrollable inside its panel rather than expanding the dashboard.

Reference: [Nuxt UI documentation](https://ui.nuxt.com/docs/getting-started), [design system](https://ui.nuxt.com/docs/getting-started/theme/design-system), [components](https://ui.nuxt.com/docs/components).


## Verification

```sh
bun run lint
bun run typecheck
bun run test
bun run audit:architecture --inventory
bun run build
```

Database integration tests require a disposable PostgreSQL database with a name ending in `_test`. They reset its `observe` schema and refuse to run without an explicit test database:

```sh
TEST_DATABASE_URL=postgresql://.../observe_test bun run test:integration
```

Browser tests require the application to be running and Chrome installed. They use synthetic API fixtures and do not send Telegram messages or modify the real database:

```sh
bun run dev
# In another terminal:
bun run test:browser
```

Override `BROWSER_BASE_URL` for another server and `BROWSER_EXECUTABLE` for a custom Chrome/Chromium executable. Tests check three authentication states at twenty viewport sizes, validation layout, nine visualization types, editor rendering, overflow and unexpected browser warnings/errors.

`audit:architecture` checks module reachability, imports and layer boundaries. The inventory covers every runtime source file and stylesheet. See [audit findings and verification](docs/audit.md).

The versioned Bun patch for `@nuxt/icon@2.6.3` replaces its deprecated DevTools registration API with `onDevtoolsReady`/`docks.register`. It fixes the dependency warning at its source; logs are not filtered or suppressed. Reassess the patch when upgrading Nuxt Icon.
