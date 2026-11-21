# AI coding agent guide

This is repository context, not an instruction to implement every idea mentioned in documentation. Read [AGENTS.md](../../AGENTS.md) first. The active user's explicit request determines scope; documentation describes existing behavior.

## Reading order

1. [Product introduction and limits](../introduction.md).
2. [Architecture](../architecture/overview.md) and [database](../architecture/database.md).
3. [Permissions](../guides/users-and-permissions.md), [security](../security.md), [UI](../reference/branding-and-ui.md).
4. Relevant `shared/domain` schemas and feature controllers/services.
5. Related tests and [how to run them](../development/testing.md).
6. The [API catalog](../reference/api.md), JSON examples, and inventory as indexes, not substitutes for source inspection.

## Change map

| Request | Start with |
| --- | --- |
| Dashboard/header/kiosk | `app/features/dashboards`, shared dashboard/layout utilities |
| Drag/resize/rows | DashboardGrid, DashboardPanelGrid, useDashboardSections, shared layout utilities |
| Queries/No data | `app/features/queries`, `server/features/queries`, DataSourceService |
| JSON import | DashboardImportDialog, useDashboardImport, dashboard-json-importer, import-appearance |
| Alerts/Telegram | `server/features/alerts`, `server/features/telegram`, `app/features/alerts` |
| Inbox/toasts/SSE | `app/features/notifications`, `server/features/notifications`, notification migrations |
| Users/auth/OAuth/profile | `app/features/auth`, `server/features/auth`, authorization middleware |
| Resource access | `shared/domain/permissions.ts`, PermissionService, permission repository, collection handlers |
| Forms/dialogs/tabs/styles | `app/app.config.ts`, `app/assets/styles`, shared components |
| Database | `server/platform/database`, feature repositories, migrations |
| Runtime/Docker | Dockerfile, compose.yaml, `docker`, health feature |
| Branding/metadata | `shared/config/product.ts`, SEO helpers, nuxt.config |

## Invariants

- Preserve Observed structural sensor identity and the AMTI logo. Do not alter sidebar/header/palette without clear scope.
- Admin has full access. Editor can create, edits existing resources by grant, and deletes own resources with Edit access. Viewer reads assigned resources. All users can query every source.
- Notifications follow alert access; the bell is available without alert grants. There are no separate source/notification ACLs.
- Administrator setup is atomic and one-time. Session revocation, refresh rotation/replay protection, and explicit OAuth linking remain enforced.
- Secrets never leave APIs or enter logs/fixtures/Git as plaintext. The key must match encrypted data.
- Preserve dashboard revisions, 12/24-column geometry, row membership, and desktop layout when presenting mobile.
- Kiosk retains toolbar/variables/time/refresh/exit while hiding edit/actions and the global shell.
- Firing/recovery follows transitions; no_data/error is not recovery; preview never notifies. The scheduler always runs; pause is per rule. Do not reintroduce global scheduler or domain/network environment switches.
- Notification cursors remain bigint strings, replay respects permissions, and streams clean up on logout.
- Alert pop-ups default on and persist per account. Turning them off affects alert toasts only; inbox updates and other notifications remain active.
- Prefer Nuxt UI and semantic tokens. Toasts require a title and useful description, without progress. Do not add UAlert.
- Do not restore Playground, Grafana ID import, or stars/sharing without an explicit new feature request.
- Use English for documentation, UI/notification copy, examples, and comments. Preserve proper names, public/persisted identifiers, and user-authored content.

## Agent workflow

Inspect status/diffs first. Search and read relevant source; do not infer behavior from class names or old audit reports. Make the smallest complete change, including service/UI/schema/docs as needed. Do not rewrite unrelated domains for a copy edit.

Do not read or print `.env` to find example credentials. Do not run integration/live browser/container tests against production databases. Simulations that create real rules or send Telegram require test sources/destinations or explicit user instructions. Do not push/deploy/reset/drop data without authorization.

Run appropriate lint/type/unit and targeted checks. Report actual passes, skips, failures, and unverified limits. Reproduce bugs using representative fixtures without copying confidential data.

When schemas/source change, update related guides/API/contracts/examples, run `bun run docs:check`, and regenerate with `bun run audit:architecture --inventory`. Never invent features, Grafana compatibility guarantees, or test results. Static reachability is not proof of complete runtime correctness.
