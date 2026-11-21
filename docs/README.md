# Observed documentation

Observed is a custom dashboard application for structural health monitoring of buildings, bridges, and other structures. This documentation describes the implementation in this repository, rather than a list of planned features. Documentation and application-owned text use English.

## Reading paths

| Audience | Start here | Continue with |
| --- | --- | --- |
| Users | [Introduction](introduction.md), [getting started](guides/getting-started.md) | Dashboards, panels, alerts, notifications |
| Administrators | [Local installation](installation/local.md), [Docker](installation/docker.md) | Configuration, accounts, permissions, operations |
| Developers | [Architecture](architecture/overview.md), [contributing](development/contributing.md) | Database, API, contracts, testing |
| AI coding agents | [AI guide](ai/README.md), [repository rules](../AGENTS.md) | Source map, invariants, verification workflow |

## Introduction and installation

- [Purpose, capabilities, and limitations](introduction.md)
- [Local installation and production builds](installation/local.md)
- [Docker: application and PostgreSQL](installation/docker.md)
- [Environment reference](configuration/environment.md)
- [Configuration: InfluxDB](configuration/data-sources.md)
- [Configuration: Telegram](configuration/telegram.md)

## User guides

1. [Getting started and navigation](guides/getting-started.md)
2. [Overview and dashboard library](guides/overview-and-library.md)
3. [Dashboards, rows, layouts, versions, and kiosk](guides/dashboards.md)
4. [Panels, queries, visualizations, and inspector](guides/panels-and-queries.md)
5. [Dashboard variables](guides/variables.md)
6. [JSON import and export](guides/json-import.md)
7. [Sensor alerts](guides/alerts.md)
8. [In-app notifications](guides/notifications.md)
9. [Users, roles, and permissions](guides/users-and-permissions.md)
10. [Sign-in, profile, sessions, Google, and Microsoft](guides/authentication.md)

## Developer reference

- [Architecture and request flow](architecture/overview.md)
- [Database and migrations](architecture/database.md)
- [HTTP API and complete endpoint catalog](reference/api.md)
- [Data contracts, input limits, and examples](reference/data-contracts.md)
- [Branding and UI system](reference/branding-and-ui.md)
- [Generated source inventory](reference/source-inventory.json)
- [Dashboard example](examples/dashboard.json), [query](examples/query.json), [alert](examples/alert-rule.json), [permissions](examples/permissions.json)

## Operations and development

- [Deployment and health](operations/deployment.md)
- [Backup and recovery](operations/backup-and-recovery.md)
- [Troubleshooting](operations/troubleshooting.md)
- [Security and trust boundaries](security.md)
- [Contribution workflow](development/contributing.md)
- [Testing and quality checks](development/testing.md)
- [Extending the application](development/extension-guide.md)
- [AI workflow and change map](ai/README.md)

## Maintaining documentation

Update the relevant guides, contracts, and examples whenever behavior changes. Run `bun run docs:check` to validate local links, JSON examples against schemas, environment templates, and endpoint coverage. Regenerate the inventory with `bun run audit:architecture --inventory`. Test results apply to the revision and environment tested; they do not guarantee compatibility with every deployment or Grafana dashboard.
