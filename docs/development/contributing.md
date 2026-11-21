# Development workflow

## Start a change

1. Read the [introduction](../introduction.md), [architecture](../architecture/overview.md), and [UI rules](../reference/branding-and-ui.md).
2. Complete [local installation](../installation/local.md). Do not use production data for development or testing.
3. Inspect `git status`, existing diffs, and the relevant schemas, ports, controllers, and services.
4. Define the intended behavior and access rules before changing components.
5. Use `codex/<change-name>` when an agent creates a new branch; human contributors should follow the team's branch convention.

## Code conventions

Use TypeScript, shared schemas/types, descriptive names, structured errors, and constructor injection for services/adapters. Keep transformations/evaluators as pure functions when appropriate. Do not introduce another abstraction or generic repository when existing ports already cover the need.

Feature views orchestrate UI; composables handle state/lifecycle; server application services own business rules; handlers validate/map HTTP only. Database/HTTP infrastructure stays in adapters. Remove dead code, dependencies, and imports after a change instead of maintaining duplicate legacy paths.

Follow repository ESLint formatting, including no trailing commas. Prefer Nuxt UI and semantic tokens. Public/persisted endpoint names, JSON fields, and SQL columns require migrations and contract updates when changed. Write comments, examples, documentation, and application-owned copy in English.

## Database and API changes

Update Zod schemas, services, repositories/migrations, clients, and UI as one coherent change. Check saved-data compatibility and concurrency. Handlers continue using shared body/ID validation and principal context. Access changes require direct request tests and filtered-collection verification, not just hidden buttons.

## Before review

Run the relevant [checks](testing.md). Update affected user guides, API/environment references, and examples. Regenerate the inventory after source changes. Inspect the diff for secrets, generated builds, backups, production credentials in fixtures, and unrelated files.

Separate commits by logical change, such as domain/API, UI, tests, and documentation. Describe the resulting behavior. Do not invent test results or report skipped checks as passed. Push/deploy only when authorized by the task owner.
