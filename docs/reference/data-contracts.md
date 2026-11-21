# Data contracts and examples

Zod schemas in [shared/domain](../../shared/domain) are the source of truth. TypeScript types are inferred where applicable; frontend validation alone is insufficient. The API uses UUIDs, ISO 8601 timestamps, and JSON. `z.object` generally strips unknown properties; import and some request schemas use strict objects and reject extras.

## Validated examples

- [dashboard.json](../examples/dashboard.json): a native dashboard with one row, a time-series panel, and a table.
- [query.json](../examples/query.json): a Flux query request.
- [alert-rule.json](../examples/alert-rule.json): a threshold rule with no Telegram destinations and automatic in-app events.
- [permissions.json](../examples/permissions.json): Selected dashboard/alert grants.

All example IDs and sensor names are placeholders. Replace `dataSourceId` with an existing source ID and permission grants with real resource IDs. Examples contain no credentials and do not create sensor measurements.

## Dashboards and panels

Required dashboard fields: `name`, `description`, `range`, `refresh`, `panels`. Required panel fields: `id`, `title`, `type`, `span`, `dataSourceId`, `query`; `additionalQueries` defaults to empty. `dataSourceId` may be null for draft/text panels, but data queries need a valid source.

Geometry uses `x`, `y`, `height`, `span`, and `columns` (12 or 24). Rows use `sections` containing UUID, title, y, collapsed; panels reference `sectionId`. Array order is not a replacement for layout coordinates. Updates include the current revision to detect concurrent edits.

| Limit | Value |
| --- | --- |
| Resource name | 1–120 characters after trimming |
| Dashboard description / panel note | Up to 1,000 characters |
| Panels and sections per dashboard | 100 each |
| Dashboard variables | 20, unique names |
| Queries per panel | One primary + nine additional |
| Query length | 25,000 characters |
| Dashboard tags | 20, each 1–40 characters |
| Panel height | 2–100 grid units |
| Panel width | 1–24; must fit the layout columns |
| Decimals | 0–8 |
| Color thresholds | Up to 10 |
| Palette | 1–30 six-digit hex colors |

`PanelOptions` covers units, decimals, min/max, fixed/palette/threshold colors, reducers, legend placement/list/table/calculations, tooltip, line width/fill/interpolation/stacking, axes, field ordering/renaming/visibility/units, field appearance, stat modes, table header/cell modes/alignment, and text. See [panel.ts](../../shared/domain/panel.ts) for exact types. An advanced JSON option does not imply a separate editor control exists.

## QueryRequest and QueryResponse

Request: `dataSourceId`, `query`, `range`; optional `from`, `to`, `variables`. Relative ranges: `5m`, `15m`, `30m`, `1h`, `6h`, `24h`, `7d`, `30d`. Absolute `from`/`to` must be supplied together, start before end, and span at most 366 days.

Response:

```json
{
  "columns": ["_time", "_value", "sensor"],
  "rows": [{"_time": "2026-01-01T00:00:00Z", "_value": 0.12, "sensor": "P2"}],
  "duration": 24,
  "truncated": false,
  "timeRange": {"from": "2025-12-31T23:00:00.000Z", "to": "2026-01-01T00:00:00.000Z"}
}
```

`duration` is milliseconds. Cells are strings, numbers, booleans, or null. Influx integers unsafe to represent as JavaScript Number remain strings. Results are limited to 5,000 rows; alert evaluation treats truncation as an error.

Dashboard refresh is `"auto"` or seconds: 0 means Off; other valid values are 5–86,400. Variable values are strings or arrays of strings, up to 500 values of up to 500 characters each.

## Alerts and permissions

Alerts extend QueryRequest with name, enabled, operator, reducer, field, threshold, interval, and Telegram destinations. Summary/severity/folder/pending/mute are optional. Thresholds must be finite. Preview omits name, enabled, and telegramDestinationIds from the rule contract.

Permissions contain `dashboards` and `alerts`, each `{scope, access, grants}`. Scope is `none|selected|all`, access is `view|edit`, and grants are `{id,access}` with up to 1,000 unique IDs. Admin is unrestricted; Viewer cannot gain Edit through a payload.

## Notifications

Events include ID, string sequence, alert ID/name, source name, `state: firing|recovered`, value, threshold, operator, occurredAt, readAt, and optional metadata. Snapshot is `{items, unread, cursor}`; updates add `events`. Cursors are digit strings limited to PostgreSQL bigint (`9223372036854775807`), never Number.

API bodies are limited to 2 MiB. Source credentials/Telegram tokens are accepted only by configuration endpoints; responses expose `hasSecret`/`hasToken`, not saved plaintext.

## Credential update semantics

For source updates, omitting `secret` preserves it, `secret: ""` removes it, and a nonempty value replaces it. The UI turns an empty edit field into an omitted property and Remove saved credential into an empty string. An empty UI field and an empty API string have different meanings.

For Telegram, omitting `token` preserves it; an empty string fails token validation. Creating a user through Users requires a password even though the input schema makes it optional for updates. OAuth-only accounts are created through the provider flow, not by omitting a local-create password.

## Alert pop-up preference

AuthUser includes `realtimeAlertToasts: boolean`, default true in the database. `PUT auth/notification-preferences` accepts a strict object containing that property only and updates the principal's own account. False suppresses alert toasts, not streams/inbox or Telegram. The endpoint does not change passwords, names, roles, grants, or sessions.
