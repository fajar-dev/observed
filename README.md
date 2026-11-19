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

Set `DATABASE_URL` and paste the generated key into `OBSERVE_SECRET_KEY` before starting. The key encrypts InfluxDB credentials and Telegram tokens with AES-256-GCM; keep it with database backups. Changing it makes previously encrypted credentials unreadable.

The application creates the `observe` PostgreSQL schema and its feature tables automatically. This rewrite starts with a new schema; it does not read or migrate previous application tables.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `OBSERVE_SECRET_KEY` | Base64 encoded 32-byte encryption key |
| `OBSERVE_AUTH_USER` | Basic authentication username, defaults to `admin` |
| `OBSERVE_AUTH_PASSWORD` | Authentication password; required outside development unless an authenticating proxy is configured |
| `OBSERVE_TRUST_PROXY_AUTH` | `true` only when access is restricted to an authenticating reverse proxy |
| `OBSERVE_ORIGIN` | Public origin when a reverse proxy changes the origin seen by the app |
| `OBSERVE_ALERTS_ENABLED` | Set `false` on processes that should not run the alert scheduler |

Development uses Node.js for Nuxt SSR. Production can run the generated server with Bun:

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
- **Dashboards:** folders, tags, list/grid browsing, duplication, JSON export, version history, conflict detection, and draggable/resizable panels. Dashboard variables live within dashboard content. Kiosk mode hides navigation, dashboard controls and panel menus; exit with Escape or the exit button. A saved dashboard can open directly with `?kiosk=1`, preserving time range and variable selections. Relative/absolute ranges and auto-refresh control queries.
- **Panel editor:** metadata discovery, a visual query builder, raw Flux/InfluxQL, multiple queries, result inspection and CSV export. Visualization options include units, decimals, colors, thresholds, bounds, legends and field appearance. Supported types are line, area, bar, pie, stat, gauge, bar gauge, table and text.
- **JSON import:** native workspace JSON and supported Grafana Classic JSON. Review source mappings and query checks before saving. Supported panel layout, units, colors, legends, table options and variables are converted. Plugin-specific panels, advanced transformations and schema v2 require manual conversion. Remote Grafana ID/URL import is deliberately absent.
- **Telegram alerts:** query preview, thresholds, reducers, evaluation intervals, pending periods, pause/mute, evaluation history and multiple destinations per rule. The scheduler checks due rules every ten seconds. PostgreSQL advisory locks prevent concurrent evaluation of the same rule. Firing and recovery notifications are tracked per destination, with retry on a later evaluation after failed delivery. Manual evaluation of enabled rules may send notifications.

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
  core/                        Ports and dependency composition
  application/                 Feature services and use cases
  infrastructure/              PostgreSQL, encryption, HTTP, InfluxDB, imports and Telegram
  http/                        Request validation
  api/observe/                 Thin HTTP controllers
  middleware/                  Authentication and origin validation
  plugins/                     Alert scheduler and lifecycle
shared/
  domain/                      Validated domain contracts and query builder
  utils/                       Pure interpolation, layout and variable helpers
tests/unit/                    Domain and application tests
```

Services receive interfaces through constructors. `server/core/container.ts` composes concrete adapters. HTTP controllers validate input and invoke services. Database table names, API paths and resource state are defined consistently around data sources, dashboards, alert rules and Telegram destinations.

Persistence uses separate `observe.data_sources`, `dashboards`, `dashboard_folders`, `dashboard_versions`, `alert_rules` and `telegram_destinations` tables. Versioned documents are validated at the application boundary; revision checks and dashboard snapshots are committed together. Schema changes belong in `server/infrastructure/database/migrations`.

## UI conventions

Use Nuxt UI components and their semantic `xs`, `sm`, `md`, `lg`, `xl` size props. Shared component themes live in `app/app.config.ts`. Pages use `WorkspacePage`; fields use `UFormField`; forms, tables, tabs, cards, charts and dialogs use Nuxt UI. Charts use `UChart` with TanStack definitions for field colors, named secondary axes and unit formatting. Custom renderers are limited to visualization-specific gauges, statistics and the dashboard grid.

Spacing uses `space-xs`, `space-sm`, `space-md`, `space-lg`, `space-xl`, `space-xxl`, `space-section` and `space-page`. Role sizes include `control-md`, `icon-md`, `field`, `drawer`, `modal` and `chart`. Values are centralized in `app/assets/styles/tokens.css`; avoid numeric or arbitrary utility classes. The local `semantic-ui/semantic-sizes` ESLint rule enforces this convention. Do not override Tailwind container namespaces with spacing tokens: Nuxt UI uses those for overlay widths.

Manrope is the interface font; JetBrains Mono is for query text. Theme colors and typography apply in light and dark modes. The shell uses a compact sidebar rail and a full-width top header. Dense data stays scrollable inside its panel rather than expanding the dashboard.

Reference: [Nuxt UI documentation](https://ui.nuxt.com/docs/getting-started), [design system](https://ui.nuxt.com/docs/getting-started/theme/design-system), [components](https://ui.nuxt.com/docs/components).
