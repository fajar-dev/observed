# Users, roles, and permissions

Roles limit action types. Permissions determine which dashboards and alerts can be accessed. Both are enforced on the server; hiding UI buttons is not authorization.

## Access matrix

| Action | Admin | Editor | Viewer |
| --- | --- | --- | --- |
| Create dashboards/alerts | Yes | Yes, even without existing resource grants | No |
| Read existing resources | All | Assigned View/Edit grants | Assigned View grants |
| Edit/evaluate existing alerts | All | Edit grant required | No |
| Delete dashboards/alerts | All | Own resources only, with current Edit access | No |
| Read sources and run queries | Yes | Yes, all sources | Yes, all sources |
| Configure/test sources and Telegram | Yes | No | No |
| Manage users/permissions | Yes | No | No |
| Directly manage folders | Yes | No | No |
| Read notifications | All alerts | Follows alert access | Follows alert access |
| Manage own profile/sessions | Yes | Yes | Yes |

Editors receive revocable Edit grants when they create resources. Resource creation and the creator grant are saved in the same transaction. Creators have no permanent bypass after grant revocation. Only Admins can delete older resources without `createdBy`.

## Add a user

Open **Users → Add user** and provide name, email, role, enabled state, and a password for a new local account. Passwords require 12–128 characters. Omitting a password during edit preserves it; creating a local user through Users still requires one.

New non-Admin accounts have no access to existing dashboards/alerts until assigned; they can still query all sources. New OAuth identities start as Viewers when provider signup is enabled.

## Assign permissions

Open a user menu → **Permissions** and configure Dashboards and Alerts separately:

- **No access**: no existing resources are available.
- **Selected resources**: choose resource IDs and View/Edit levels individually.
- **All resources**: a base level for every resource, including future resources; per-resource grants can override that level.

Viewer remains capped at View even if a payload requests Edit. Admin always has full access. There is no source permission, notification ACL, folder inheritance, team, or multi-organization model.

Saving permissions revokes the target user's sessions so access is updated on the next sign-in. Password changes, certain role/email changes, or disabling a user also revoke sessions according to authentication policy. Users cannot disable/delete/demote themselves through administration. The last active Admin is protected.

## Data isolation boundary

Restricting a dashboard does not hide raw InfluxDB data from signed-in users, because all sources are intentionally queryable by every account. Do not use this model for tenants requiring sensor-data isolation. Separate deployments/databases/sources or design dedicated data authorization when that requirement arises.
