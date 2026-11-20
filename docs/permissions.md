# Monitoring permissions

Administrators assign permissions from **Users → User actions → Permissions**. Roles define capabilities; resource permissions define which dashboards and alert rules a user can access. Data sources are shared by all signed-in users, without per-user grants.

| Capability | Admin | Editor | Viewer |
| --- | --- | --- | --- |
| Create dashboards and alerts | Yes | Yes, even without existing resource access | No |
| Read existing dashboards and alerts | All | Assigned View/Edit | Assigned View |
| Edit existing dashboards and alerts | All | Assigned Edit | No |
| List data sources and run sensor queries | All sources | All sources | All sources |
| Delete dashboards or alerts | All | Own creations, while Edit remains granted | No |
| Manage users, permissions, connections and Telegram settings | Yes | No | No |
| Receive in-app notifications | All alert rules | Alert rules with View/Edit | Alert rules with View |

## Dashboard and alert access

Scopes are **No access**, **Selected resources**, or **All resources**. Each resource can receive View or Edit, capped by role. All includes future resources. Individual permissions override the default All level, allowing an Editor to view all dashboards while editing only selected dashboards.

Editors can create dashboards and alerts using any available source, even without permission to existing resources. Creation records the creator and an explicit Edit grant in one database transaction. Creating a resource does not widen access to existing resources. The client refreshes permissions before opening the new resource.

Administrators can remove or downgrade creator grants; ownership never bypasses revoked permissions. Editors may delete only their own creations while Edit remains granted. Older resources without creator metadata remain deletable by administrators.

Edit permits changing queries, sources, layout, display options, titles, thresholds, evaluation settings, and alert destinations on an assigned resource. Viewer roles cannot modify resources. Folder administration remains administrator-only; Editors can set folder labels when saving permitted resources. Folder inheritance is not implemented.

## Shared data sources

There are no data source scopes, Query grants, or source permission controls in Users. All authenticated roles, including Viewer, can list configured sources, resolve variables, and run sensor queries against any existing source. Anonymous requests still require authentication.

Source access does not grant access to a dashboard definition, alert rule, evaluation history, or notification. Those records remain protected by their resource permissions. All source data is shared: resource permissions do not isolate the underlying sensor readings by dashboard or alert.

Only administrators can add, edit, test, or delete connections and manage credentials. API metadata omits connection secrets. Existing source validation, query parsing, timeouts, and result limits remain in effect. JSON import and diagnostics use the shared sources; resource creation, updates and repair still require the appropriate role and resource access.

## Notifications and sessions

The notification button and inbox are available to every signed-in user, including users with no alert access. Without permitted events, the inbox is empty. Notification contents automatically follow readable alert rules. There is no independent notification permission or manual subscription. Inbox items, unread counts, replay, cursors, read receipts and realtime toasts are filtered by alert access. Telegram delivery follows destinations configured on each rule.

New non-admin users have no access to existing dashboards or alerts, but can use shared sources immediately. Editors can create their own resources. Saving resource permissions revokes the target user's sessions, including active realtime streams. Creation grants refresh the creator's client permissions without ending their session.

Administrators always have full access; their role must change before permissions can be restricted. Existing last-administrator protections remain in effect.

## Storage and verification

Migration 6 adds `user_access`, `user_dashboard_permissions`, and `user_alert_permissions`, preserving existing resource access once. Migration 7 removes preliminary independent notification preferences. Migration 8 records creators. Migration 9 removes the retired data source grant table and scope column from installations that used them, preserving dashboard and alert permissions. Fresh installations never create source permission storage.

Foreign keys remove obsolete resource grants. Permission updates and session revocation are transactional. Tests cover role caps, creation, resource overrides, revocable ownership, shared source access, protected configuration and alert-derived notifications. Isolated PostgreSQL tests verify persistence, atomicity, cleanup and migrations. Browser tests exercise real authenticated requests, sensor query execution, JSON import, editor source choices, permission controls, mobile layout and scoped realtime notifications.

Live tests require `PERMISSION_TEST_DATABASE_URL` ending in `_test`, with the application configured against that database. Run notification and permission browser tests sequentially when they share a database; notification fixtures reset their event table.
