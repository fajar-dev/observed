# Extending the application

## Domain and API features

1. Find the closest feature through the [AI change map](../ai/README.md); do not create a parallel domain unnecessarily.
2. Define shared request/response schemas with defaults, bounds, and enums.
3. Add a pure function or application service method. Define a port for external dependencies, implement an adapter, and inject it through the composition root.
4. Add repository methods and migrations for persisted changes; consider locks, transactions, cascades, and revisions.
5. Add a thin `server/api` handler using validateBody/resourceId and the principal.
6. Update role and resource policies for new endpoints. A path not recognized by old rules must not become a bypass.
7. Add client/composable behavior and UI using existing loading/error/success patterns.
8. Test meaningful behavior, document the endpoint/contract, and regenerate the inventory.

## New visualizations

Update the visualization identifier/schema/catalog, QueryVisualization/QueryChart mapping, panel settings/defaults, editor preview, and import converter when applicable. Test empty/null series, large/small numbers, many labels, resizing, mobile, long legends, field overrides, and inspector CSV. Never silently convert measurement units just to make a chart fit.

## Layout changes

Use shared layout functions and the GridStack adapter. Preserve panel IDs, row membership, desktop coordinates, 12/24 columns, dimensions, and save/import/export round trips. Check collapsed rows, moving panels between rows, removing rows while retaining panels, compaction, mobile, and kiosk. Do not automatically save mobile's one-column presentation over desktop coordinates.

## Alerts and notifications

Separate evaluation from delivery. Add transition behavior to the evaluator/service, then test pending, no_data/error, duplicate evaluations, mute/pause, one firing per episode, recovery, partial destination failure, and retry. In-app events remain atomic with evaluation and follow alert access. Do not add notification or source ACLs without an explicit product decision.

The alert pop-up preference must affect only presentation. Disabling it cannot stop the inbox stream, unread updates, normal action toasts, or Telegram; re-enabling must not replay suppressed events.

## Integrations and providers

Separate server configuration and identity flows from UI. Validate claims, expiry, state/linking, and account boundaries. Do not store provider tokens without a requirement. A UI toggle does not replace server authorization.

## Documentation and recovery

Describe each new feature's purpose, steps, access, input/output, errors, limits, and verification in English. Define database recovery through backups or forward migrations; do not promise an automatic rollback that is not implemented.
