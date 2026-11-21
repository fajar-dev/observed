# Introduction

Observed helps civil engineers, contractors, and structure owners read IoT sensor metrics through customizable dashboards. Measurements remain in InfluxDB. Observed stores configuration, accounts, permissions, evaluation history, and notifications in PostgreSQL.

## Current capabilities

| Area | Capabilities |
| --- | --- |
| Data | Multiple InfluxDB sources; Flux and InfluxQL according to the source server API |
| Dashboards | Multiple panels, collapsible rows, desktop drag/resize, mobile presentation, folders, tags, variables, time ranges, refresh, versions, kiosk |
| Visualizations | Time series, area, bar, metric, gauge, bar gauge, pie, table, text |
| Portability | Observed JSON import/export; partial conversion of classic Grafana dashboard JSON files |
| Alerts | Numeric queries, reducers, thresholds, pending periods, scheduled evaluation, pause, mute, history |
| Notifications | Permission-filtered inbox, realtime toasts with a per-user preference, optional Telegram delivery to multiple destinations |
| Accounts | One-time administrator setup, passwords, JWT and refresh tokens, sessions, optional Google/Microsoft sign-in |
| Access | Admin, Editor, Viewer; View/Edit permissions per dashboard and alert |

## Product boundaries

- Observed reads sensor data. It is not an ingestion gateway or a time-series database. Sensor ingestion into InfluxDB is handled outside this application.
- Asset/sensor catalogs, BIM mapping, alert acknowledgment, escalation policies, PDF reporting, and third-party visualization plugins are not implemented.
- Grafana ID/URL import, a separate playground, stars, and public sharing are not available. Queries are written in panel and alert editors.
- Grafana JSON compatibility covers only queries, layouts, variables, and options supported by the converter. Plugins, transformations, and other schemas require manual review.
- Dashboard/alert permissions protect those resources. All signed-in users can still read source metadata and query every source.
- Thresholds are monitoring configuration. Qualified professionals determine thresholds and interpret structural safety; the application does not certify structural fitness.

Continue with [getting started](guides/getting-started.md) or [installation](installation/local.md).
