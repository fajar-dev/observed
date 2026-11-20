# Dashboard audit — 20 November 2026

Scope: row accordions, panel positioning/resizing, edit toolbar and kiosk on desktop, tablet and mobile. Sidebar, global header, palette and fluid white content are retained.

## Findings and fixes

| Finding | Fix |
| --- | --- |
| At narrow widths, long absolute time ranges pushed refresh controls outside the visible toolbar. On 320px screens, action buttons could also be clipped despite the document reporting no overflow. | Constrained and shrinkable time control; compact mobile action labels with accessible names; full Save and Exit kiosk labels remain available. Regression tests measure each control's visible bounds. |
| Escape dismissed the time picker and exited kiosk in the same key press. | Kiosk exits only when an open dialog, menu or listbox is not consuming Escape. Time-picker and refresh-select dismissal are tested separately. |
| Moving a panel into a collapsed row kept that row closed because its temporary collapse override took precedence. | Moving into a row clears both its default collapsed flag and temporary override, revealing the moved panel. |
| Removing/moving panels in the one-column mobile grid could leave empty space and put a touch menu outside the viewport. | Repack the mobile presentation after panel changes; synchronize from saved coordinates when returning to desktop. Mobile reflow does not overwrite saved desktop width/height. Drag indicators appear only where grid dragging is enabled. |

A concurrent change to the 404 status size was preserved visually: its numeric utility was replaced with an equal-size semantic token so the repository's lint rule still passes.

## Verification

- **Nine viewport widths:** 1920, 1440, 1280, 1024, 768, 430, 390, 360 and 320px.
- **54 toolbar combinations:** each viewport × view/edit/kiosk × relative/absolute time range. Every visible control must fit within the viewport; desktop controls remain aligned on one toolbar row.
- **Actual touch emulation:** expand/collapse rows; move into a collapsed row; duplicate; save; return to desktop and verify retained panel widths/heights.
- **Desktop mouse interaction:** drag and resize, save and reload, row reorder/rename/remove, compact layout and discard without persisting draft changes.
- **Kiosk:** toolbar/filter availability, hidden editing actions, manual refresh, selection persistence on reload/exit, toolbar exit and Escape handling.
- **Visualization regression:** nine visualization types, large tables and long names; desktop/tablet/mobile in light and dark modes.
- **Existing Proxmox dashboard:** 24 panels rendered with real InfluxDB query results. Collapsing the first row hid seven panels; reopening restored all 24. No panel overflow or unexpected browser console errors/warnings were observed.
- **Repository checks:** lint, Nuxt typecheck, production build, 43 unit tests and six browser tests passed.

Browser workflow tests use synthetic API fixtures so save/discard and layout operations do not modify the user's real dashboard. The live Proxmox check uses a synthetic browser session with read-only application queries against the existing source. No Telegram test messages are sent by this audit.

On desktop, panel headers and bottom-right handles support drag/resize. Mobile uses a single-column presentation and touch menus for row/panel operations, preserving the desktop geometry.
