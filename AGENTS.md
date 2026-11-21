# Observed agent guide

Read [docs/ai/README.md](docs/ai/README.md), the [architecture guide](docs/architecture/overview.md), and the relevant feature documentation before changing code. Complete user and developer documentation is available in [docs/README.md](docs/README.md). The user's instructions for the active task determine the scope of work.

## Working rules

- Preserve Observed branding for structural sensor monitoring, the AMTI logo, and the existing UI system. Use Nuxt UI and semantic tokens instead of new numeric or arbitrary sizing utilities.
- Keep business rules in application services or shared pure functions, database and HTTP access in adapters, and dependency composition in `server/bootstrap`. Keep routes and views thin.
- Admins have full access. Editors can create resources and receive revocable Edit grants; existing resources follow permissions. Viewers read assigned resources. Every signed-in user can query all sources.
- Notifications follow alert access without a separate ACL. Preserve session revocation, refresh rotation, one-time setup, credential encryption, dashboard revisions, desktop/mobile layouts, and bigint notification cursors represented as strings.
- Do not read or print `.env` secrets, send real notifications, run destructive tests against an active database, or push/deploy unless the task authorizes it. Use isolated test databases.
- Do not restore removed features (Playground, Grafana ID import, stars/sharing, source ACLs) without an explicit request.
- Update documentation, contracts, and examples when behavior changes. Run the appropriate [checks](docs/development/testing.md), `bun run docs:check`, and regenerate the inventory when source changes. Report actual results and verification limits.
- Write documentation, application-owned messages, examples, and code comments in English. Preserve proper names, public identifiers, and user-authored content.
