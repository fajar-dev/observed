# Audit and rewrite — 19 November 2026

## Scope

The audit covers the Nuxt application, Nitro APIs, shared contracts, PostgreSQL persistence, authentication, InfluxDB queries, dashboard JSON conversion, Telegram evaluation, styles and dependency composition. The generated [source inventory](source-inventory.json) records 195 runtime modules and six stylesheets. It is regenerated with `bun run audit:architecture --inventory`.

The workspace keeps its established sidebar, header, blue palette and fluid white content. This rewrite changes ownership and behavior behind those interfaces rather than introducing another visual design.

## Changes and findings

| Area | Finding | Implemented result |
| --- | --- | --- |
| Dependency composition | Persistence and transport construction were spread across layers. | `server/bootstrap/workspace.ts` constructs adapters once and injects feature services through typed ports. |
| Backend structure | Horizontal folders made feature ownership difficult to follow. | Feature application/domain/infrastructure folders; shared platform adapters; thin HTTP controllers. Old runtime folders are removed. |
| Resource persistence | A generic JSON document store obscured metadata and references. | Explicit relational columns, typed resource mapping, foreign keys and reference joins. Flexible panel definitions remain JSONB. |
| Database upgrade | Existing document records needed a safe transition. | One transactional conversion preserves credentials, dashboards, history and auth, then removes temporary document tables. Runtime uses only relational repositories. |
| Concurrent saves | Revisions, snapshots and relationship writes must agree. | Row-locked transactions; stale revision returns 409; version retention is bounded. A concurrent-save integration test verifies exactly one winner. |
| Alert scheduler | Loading every rule wastes work and can race across processes. | Indexed due-rule query and PostgreSQL advisory locks; delivery state remains per destination. |
| HTTP/API ownership | Controllers could reach authentication persistence directly. | Account/session operations live on `AuthService`; repositories are private implementation dependencies. |
| Query validation | A regular expression rejected harmless quoted InfluxQL literals. | Read-only lexer distinguishes executable tokens from strings, identifiers, comments and regexes. |
| Variables | Prototype property names could masquerade as variable values. | Reserved names are rejected; interpolation uses own-property lookup. |
| Frontend controllers | Library, dashboard editor and query components mixed unrelated state. | Dedicated import, settings, time, panel editing, metadata discovery and query runner controllers. |
| Asynchronous Vue context | Capturing Nuxt helpers after awaits can lose component context. | API/router dependencies are captured during setup and injected into asynchronous operations. |
| Duplicate requests | Each panel could load the same source collection. | Shared collection state, deferred request deduplication and a bounded freshness window. Browser regression asserts one source request for nine panels. |
| Query races | Older requests could complete after a new selection. | AbortController, generation checks and scope disposal prevent stale query/metadata/variable results from overwriting current state. |
| Session rendering | SSR and browser-restored users produced hydration warnings and inconsistent tab IDs. | Private UI renders on the client; session initialization precedes protected navigation. API authentication remains server-enforced. No warning suppression. |
| HTTP failure mapping | Expected domain rejections were logged as unhandled exceptions. | Explicit HTTP adapters preserve 4xx statuses without unhandled logs; unexpected and 5xx failures remain reportable, covered by regression tests. |
| Anonymous initialization | A routine signed-out page caused an expected 401 in the console. | Public nullable session discovery; protected endpoints still enforce 401. |
| Refresh concurrency | Parallel requests/tabs could reuse rotating refresh tokens. | Single-flight renewal and Web Locks where supported; strict token replay revokes the session. Temporary server failures do not clear cookies. |
| First administrator | Setup reopening or racing could create unintended accounts. | Transactional durable setup marker, independent of remaining users. No setup token or default credentials. |
| Password changes | Concurrent password changes needed an explicit prior-state check. | Optimistic password-hash comparison and enabled-account validation before changing credentials. |
| Provider identity | Matching email alone must not attach an OAuth identity. | Explicit account linking, verified signed OIDC tokens, PKCE/state/nonce, exact Microsoft tenant and optional Viewer signup. |
| Notifications | Inline error boxes and progress toasts were inconsistent. | Shared Nuxt UI toast controller, no progress/spinner; stable notices avoid repeated polling notifications. Field validation remains inline. |
| Dependency warning | Nuxt Icon used a deprecated DevTools registration API. | A versioned Bun patch migrates registration to the supported docks API. |
| Architecture drift | Imports and unreachable runtime modules were difficult to track. | Automated layer/reachability/import checks plus semantic-size ESLint rules. |

## Verification

The following checks passed against this rewrite. Negative authentication/validation tests deliberately exercise rejected requests; those are expected responses, not suppressed failures.

| Check | Coverage |
| --- | --- |
| ESLint | Runtime, tests, tooling and semantic UI conventions; no warnings. |
| Nuxt typecheck | Frontend, shared contracts and server types. |
| Unit suite | 33 passing tests: services, query building/interpolation, JSON appearance/layout, password/JWT policy, simulated OIDC and HTTP renewal behavior. |
| PostgreSQL integration | Three passing scenarios: normalized CRUD/references/concurrent saves; historical schema conversion; setup/sessions/replay/roles/password/account linking. No skipped database tests. |
| Production build | Bun Nitro build; deprecated registration warning eliminated. |
| Architecture inventory | 195 runtime modules, six stylesheets, no invalid imports, forbidden layer dependencies or unreachable runtime modules detected. |
| Browser console | Overview, dashboards, alerts, configuration and nine-visualization dashboard: no unexpected warnings, errors or page exceptions. |
| Authentication browser flow | Real isolated database: initial setup, stale second setup, users, roles, CSRF rejection, refresh rotation, simultaneous tabs, profile, logout and JWT revocation. |
| Auth layout | Local sign-in, two-provider sign-in and first setup; 20 viewport sizes, including short landscape screens; validation, no page scrolling and controls within viewport. |
| Visualization layout | Nine types, long names, 600 table rows, light/dark and 1600/1024/390 widths; content stays within panel bounds; panel editor opens correctly. |
| Configuration dialogs | Source and Telegram create/edit, Flux/InfluxQL switching, validation, preserve/remove credentials, mobile layout. |
| Header and notifications | Native search, keyboard shortcut, mobile search, account menu, toast errors/recovery; no toast progress bars or spinners. |
| Existing InfluxDB source | An earlier read-only query succeeded after migration. The final probe could not reach `192.168.100.104:8086`; a direct unauthenticated health request independently timed out after eight seconds. Live query availability therefore remains dependent on restoring connectivity to that endpoint. |

Portable layout/console regression tests live in `tests/browser`. Unit and integration suites live in `tests/unit` and `tests/integration`. Integration tests require an explicitly isolated `TEST_DATABASE_URL` ending in `_test`; browser fixtures contain only synthetic data. Additional real-session/browser checks used a disposable production server and database.

## Practical boundaries

Google and Microsoft exchanges are covered with simulated signed OIDC providers. Live sign-in still needs the operator's provider applications and credentials. Telegram transport, destination validation and evaluation behavior are tested without sending real messages. Live delivery must be verified using the intended bot and chat. Grafana Classic JSON conversion supports documented panel/query options; plugin panels, unsupported transformations and schema v2 are not full Grafana compatibility.

These results describe the tested code and environment. They cannot guarantee future availability of PostgreSQL, InfluxDB, Telegram or identity providers. Unexpected failures remain visible through HTTP errors, server logs and user-facing toasts.
