# Dashboards, layouts, rows, and kiosk

## Reading a dashboard

The toolbar shows the title/description, time range, manual refresh, and refresh interval. Variables appear in the dashboard content below the toolbar. Time ranges can be relative or absolute; absolute ranges need valid start/end times and cannot exceed 366 days.

Use panel menu → **Inspect data** to examine query results. **Check panel data** in the dashboard menu diagnoses variables and panels, distinguishing ready data, empty results, errors, and missing configuration.

## Editing

1. Choose **Edit dashboard** with Edit access.
2. Use **Add → Add panel** for a visualization or **Add → Add row** for a panel group.
3. On desktop, drag a panel by its header and resize it using the grid handle. The grid stores position, width, and height, preserving 12- or 24-column layouts.
4. Use the panel menu to edit, duplicate, remove, or **Move to row**. Removing a panel from the draft does not delete the dashboard.
5. Use **Compact layout** in the edit menu to reduce layout gaps.
6. Choose **Save** to persist changes or **Discard** to abandon the draft.

On mobile, panels are presented in one column for readability. This presentation must not replace desktop coordinates. Use desktop for precise drag/resize, then verify charts with many series and wide tables on both viewport sizes.

## Collapsible rows

Rows group panels and collapse through their headings. In edit mode, row menus provide title, ordering, and removal controls. Move panels between rows or to **No row**. Removing a row keeps its panels in the dashboard.

Collapsing a row in view mode is temporary. Saving row configuration in edit mode determines its initial state on future visits.

## Settings and versions

**Dashboard settings** contains **General**, **Variables**, **Versions**, and **JSON** tabs. General controls the name, short description, folder, and tags. [Variables](variables.md) are covered separately.

Dashboard updates use revisions to detect concurrent edits. On a 409 save conflict, preserve a separate draft if needed, reload the latest version, and reapply the intended changes instead of overwriting another user's work.

Versions contains previous snapshots, up to 100. Restoring a snapshot loads it into the draft; review and Save it. New dashboards have no previous snapshot until an update occurs. JSON changes are also applied to the draft before saving.

## Refresh

Options are **Off**, **Auto**, **5s**, **10s**, **30s**, **1m**, **5m**, **15m**, **30m**, **1h**, **2h**, and **1d**. Valid saved custom values such as 15 seconds may also appear for existing dashboards.

Auto calculates `ceil(time-range duration in seconds / 300)`, clamped to 5 seconds–1 day. A one-hour range produces 12 seconds. The panel timer pauses while the browser tab is hidden or the dashboard is being edited. Server alert evaluation is independent of dashboard refresh.

## Kiosk

Choose **Kiosk mode** or open a saved dashboard with `?kiosk=1`. The global sidebar/header are hidden, but the dashboard toolbar, variables, time range, refresh, and **Exit kiosk** remain available. Edit controls and action menus are hidden. Escape closes an active overlay first, or exits kiosk when no overlay is open. Kiosk still requires authentication and resource access; it is not a public link.
