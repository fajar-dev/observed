# HTTP API

The application API base path is `/api/observe`. Requests use JSON and UUID identifiers. There is no generated OpenAPI/Swagger specification; the catalog below maps every current handler. `:id` and `:provider` are path parameters, not literal URL segments.

## Authentication and request origin

Browsers use HttpOnly cookies. Scripts may send `Authorization: Bearer <accessToken>` obtained from sign-in/setup. Sign-in/refresh returns `{user, accessToken, expiresIn: 600}`; refresh tokens are sent only through cookies, not response JSON.

Mutations without Bearer need an Origin matching the request URL or a supported same-origin signal. Bearer does not bypass mismatched Origin/cross-site rejection. Public authentication mutations still use request-origin protection.

Example sign-in with a test account and a private, uncommitted payload file:

```sh
curl --request POST http://localhost:3000/api/observe/auth/sign-in \
  --header 'Origin: http://localhost:3000' \
  --header 'Content-Type: application/json' \
  --data-binary @/absolute/private/sign-in.json
```

The file contains `{"email":"engineer@example.test","password":"YOUR_PASSWORD"}`. Responses and cookie headers contain session credentials: do not copy them into logs/issues. For non-browser refresh, retain response cookies in a private cookie jar and send them to `/auth/refresh`; an access Bearer token does not replace the refresh cookie.

To run a query, privately set shell variable `OBSERVED_ACCESS_TOKEN` to an active access token:

```sh
curl --request POST http://localhost:3000/api/observe/queries \
  --header "Authorization: Bearer $OBSERVED_ACCESS_TOKEN" \
  --header 'Content-Type: application/json' \
  --data-binary @docs/examples/query.json
```

Replace the example source ID in a private copy before requesting. Every endpoint except health/public authentication requires an active session. There is no anonymous dashboard API or permanent API key.

## Contracts and responses

Main schemas: [auth](../../shared/domain/auth.ts), [sources](../../shared/domain/data-source.ts), [dashboards](../../shared/domain/dashboard.ts), [panels](../../shared/domain/panel.ts), [queries](../../shared/domain/query.ts), [alerts](../../shared/domain/alert-rule.ts), [variables](../../shared/domain/variable.ts), [permissions](../../shared/domain/permissions.ts), [notifications](../../shared/domain/notification.ts). Bodies follow their schemas without an additional wrapper unless noted.

Collections generally return arrays; get/create/update returns the record defined by the handler. Do not assume a universal `data` envelope. Notification updates use `{items, unread, cursor, events}`. `auth/session` returns `{user, canRefresh}` for browser bootstrap, whereas `auth/me` requires authentication.

| HTTP status | Typical meaning |
| --- | --- |
| 400 | Invalid JSON body |
| 401 | Invalid or expired session/token |
| 403 | Role, permission, or request origin denied |
| 404 | Resource or provider unavailable |
| 409 | Revision conflict, occupied lock, duplicate name, or referenced resource |
| 413 | Body exceeds 2 MiB |
| 422 | Invalid payload, UUID, variable, or time range |
| 429 | Authentication throttling |
| 502 | Remote connection/response failure |
| 503 | Configuration, database, or provider not ready |

Errors follow H3 format with statusCode/statusMessage and sanitized details where available. Do not depend on stack traces. Protected API responses use Cache-Control no-store. There is no universal collection pagination contract; notifications use cursors and versions/history have specific retention limits. Profile session pagination is client-side.

## Endpoint catalog

**Signed-in** means any authenticated role; **Create** means Admin/Editor; **View/Edit** means the resource level capped by role; **Delete** means Admin or a creator with current Edit access. Admin has full access. Reading source metadata needs no resource grant. Telegram destination metadata is filtered for Editor/Viewer needs and chatId is blank for non-Admins.

| Endpoint | Access | Payload / response / side effects | Source |
| --- | --- | --- | --- |
| `GET /api/health` | Public | Database/migration readiness; 200 ok or 503 unavailable | [handler](../../server/api/health.get.ts) |
| `POST /api/observe/alert-rules/:id/evaluate` | Edit alert | Real evaluation; enabled/unmuted rules may notify; no body | [handler](../../server/api/observe/alert-rules/[id]/evaluate.post.ts) |
| `DELETE /api/observe/alert-rules/:id` | Delete alert | Delete under the evaluation lock | [handler](../../server/api/observe/alert-rules/[id].delete.ts) |
| `GET /api/observe/alert-rules/:id` | View alert | One AlertRule | [handler](../../server/api/observe/alert-rules/[id].get.ts) |
| `PUT /api/observe/alert-rules/:id` | Edit alert | alertRuleSchema; update and reset active state when the condition changes | [handler](../../server/api/observe/alert-rules/[id].put.ts) |
| `GET /api/observe/alert-rules` | Signed-in, filtered list | Permitted AlertRule[] | [handler](../../server/api/observe/alert-rules/index.get.ts) |
| `POST /api/observe/alert-rules` | Create alert | alertRuleSchema; create a rule | [handler](../../server/api/observe/alert-rules/index.post.ts) |
| `POST /api/observe/alert-rules/preview` | Create alert | alertPreviewSchema; evaluation with queryResult; no notification delivery | [handler](../../server/api/observe/alert-rules/preview.post.ts) |
| `GET /api/observe/auth/config` | Public | setupRequired and enabled providers | [handler](../../server/api/observe/auth/config.get.ts) |
| `GET /api/observe/auth/me` | Signed-in | Current AuthUser including permissions and pop-up preference | [handler](../../server/api/observe/auth/me.get.ts) |
| `PUT /api/observe/auth/notification-preferences` | Signed-in, own account | {realtimeAlertToasts: boolean}; persist preference and return AuthUser without revoking sessions | [handler](../../server/api/observe/auth/notification-preferences.put.ts) |
| `GET /api/observe/auth/oauth/:provider/callback` | Enabled provider; linking requires a session | OIDC authorization-code callback | [handler](../../server/api/observe/auth/oauth/[provider]/callback.get.ts) |
| `GET /api/observe/auth/oauth/:provider` | Enabled provider; linking requires a session | Redirect to provider; ?link=1 connects an identity to the signed-in account | [handler](../../server/api/observe/auth/oauth/[provider]/index.get.ts) |
| `PUT /api/observe/auth/profile` | Signed-in | profileSchema: update own name/password | [handler](../../server/api/observe/auth/profile.put.ts) |
| `GET /api/observe/auth/providers` | Signed-in | Identity providers linked to the current account | [handler](../../server/api/observe/auth/providers.get.ts) |
| `POST /api/observe/auth/refresh` | Valid refresh cookie | Rotate refresh token and update cookies; no body | [handler](../../server/api/observe/auth/refresh.post.ts) |
| `GET /api/observe/auth/session` | Public | Browser session bootstrap: {user, canRefresh} | [handler](../../server/api/observe/auth/session.get.ts) |
| `DELETE /api/observe/auth/sessions` | Signed-in | {id: UUID}; revoke an owned session | [handler](../../server/api/observe/auth/sessions.delete.ts) |
| `GET /api/observe/auth/sessions` | Signed-in | Own active sessions | [handler](../../server/api/observe/auth/sessions.get.ts) |
| `POST /api/observe/auth/setup` | Public, before setup completion only | setupSchema: name/email/password; create the first Admin | [handler](../../server/api/observe/auth/setup.post.ts) |
| `POST /api/observe/auth/sign-in` | Public | signInSchema: email/password; issue session and cookies | [handler](../../server/api/observe/auth/sign-in.post.ts) |
| `POST /api/observe/auth/sign-out` | Public; mutation origin checked | Revoke the available session and clear cookies | [handler](../../server/api/observe/auth/sign-out.post.ts) |
| `DELETE /api/observe/dashboard-folders/:id` | Admin | Delete only when no longer referenced | [handler](../../server/api/observe/dashboard-folders/[id].delete.ts) |
| `GET /api/observe/dashboard-folders` | Signed-in, filtered list | Folders relevant to visible resources | [handler](../../server/api/observe/dashboard-folders/index.get.ts) |
| `POST /api/observe/dashboard-folders` | Admin | {name}; create a folder | [handler](../../server/api/observe/dashboard-folders/index.post.ts) |
| `POST /api/observe/dashboard-imports/check` | Create dashboard | dashboardSchema; diagnose draft variables/panels before import | [handler](../../server/api/observe/dashboard-imports/check.post.ts) |
| `POST /api/observe/dashboard-imports/preview` | Create dashboard | {document: JSON, dataSourceId: UUID or null}; convert/preview without saving | [handler](../../server/api/observe/dashboard-imports/preview.post.ts) |
| `POST /api/observe/dashboards/:id/diagnostics` | View dashboard | Diagnose saved queries/variables; no body | [handler](../../server/api/observe/dashboards/[id]/diagnostics.post.ts) |
| `POST /api/observe/dashboards/:id/restore-import` | Edit dashboard | {dataSourceId: UUID or null, restorePanelOptions?: boolean}; repair an imported dashboard | [handler](../../server/api/observe/dashboards/[id]/restore-import.post.ts) |
| `GET /api/observe/dashboards/:id/versions` | View dashboard | Previous version snapshots | [handler](../../server/api/observe/dashboards/[id]/versions.get.ts) |
| `DELETE /api/observe/dashboards/:id` | Delete dashboard | Delete dashboard and associated relations | [handler](../../server/api/observe/dashboards/[id].delete.ts) |
| `GET /api/observe/dashboards/:id` | View dashboard | One Dashboard | [handler](../../server/api/observe/dashboards/[id].get.ts) |
| `PUT /api/observe/dashboards/:id` | Edit dashboard | dashboardSchema with current revision; update and save previous version | [handler](../../server/api/observe/dashboards/[id].put.ts) |
| `GET /api/observe/dashboards` | Signed-in, filtered list | Permitted Dashboard[] | [handler](../../server/api/observe/dashboards/index.get.ts) |
| `POST /api/observe/dashboards` | Create dashboard | dashboardSchema; atomically create dashboard and creator grant | [handler](../../server/api/observe/dashboards/index.post.ts) |
| `POST /api/observe/data-sources/:id/test` | Admin | Run a connection query using the saved source | [handler](../../server/api/observe/data-sources/[id]/test.post.ts) |
| `DELETE /api/observe/data-sources/:id` | Admin | Delete only when no longer referenced | [handler](../../server/api/observe/data-sources/[id].delete.ts) |
| `PUT /api/observe/data-sources/:id` | Admin | dataSourceSchema; omitted secret preserves it, empty string removes it | [handler](../../server/api/observe/data-sources/[id].put.ts) |
| `GET /api/observe/data-sources` | Signed-in | DataSource[] metadata without secrets | [handler](../../server/api/observe/data-sources/index.get.ts) |
| `POST /api/observe/data-sources` | Admin | dataSourceSchema; save a source | [handler](../../server/api/observe/data-sources/index.post.ts) |
| `GET /api/observe/notifications` | Signed-in, follows alert access | Snapshot/update with optional ?after=cursor | [handler](../../server/api/observe/notifications/index.get.ts) |
| `POST /api/observe/notifications/read` | Signed-in, follows alert access | {id: UUID} or {through: cursor}; mark own notifications read | [handler](../../server/api/observe/notifications/read.post.ts) |
| `GET /api/observe/notifications/stream` | Signed-in, follows alert access | SSE notifications events; optional ?after=cursor | [handler](../../server/api/observe/notifications/stream.get.ts) |
| `POST /api/observe/queries` | Signed-in, all sources | querySchema; QueryResponse with at most 5,000 rows | [handler](../../server/api/observe/queries/index.post.ts) |
| `POST /api/observe/telegram-destinations/:id/test` | Admin | Send a real test message | [handler](../../server/api/observe/telegram-destinations/[id]/test.post.ts) |
| `DELETE /api/observe/telegram-destinations/:id` | Admin | Delete only when no longer referenced | [handler](../../server/api/observe/telegram-destinations/[id].delete.ts) |
| `PUT /api/observe/telegram-destinations/:id` | Admin | telegramDestinationSchema; omitted token preserves the saved token | [handler](../../server/api/observe/telegram-destinations/[id].put.ts) |
| `GET /api/observe/telegram-destinations` | Signed-in, filtered metadata | Destinations without tokens; chatId hidden from non-Admins | [handler](../../server/api/observe/telegram-destinations/index.get.ts) |
| `POST /api/observe/telegram-destinations` | Admin | telegramDestinationSchema; a token is required for new destinations | [handler](../../server/api/observe/telegram-destinations/index.post.ts) |
| `GET /api/observe/users/:id/permissions` | Admin | Read UserPermissions | [handler](../../server/api/observe/users/[id]/permissions.get.ts) |
| `PUT /api/observe/users/:id/permissions` | Admin | UserPermissions; replace grants and revoke target sessions | [handler](../../server/api/observe/users/[id]/permissions.put.ts) |
| `DELETE /api/observe/users/:id` | Admin | Delete a user; self/last-Admin protections apply | [handler](../../server/api/observe/users/[id].delete.ts) |
| `PUT /api/observe/users/:id` | Admin | userInputSchema; update a user | [handler](../../server/api/observe/users/[id].put.ts) |
| `GET /api/observe/users` | Admin | List users | [handler](../../server/api/observe/users/index.get.ts) |
| `POST /api/observe/users` | Admin | userInputSchema; create a local user with a password | [handler](../../server/api/observe/users/index.post.ts) |
| `POST /api/observe/variables/resolve` | Signed-in, all sources | variableResolutionSchema; selections/variables/values/errors | [handler](../../server/api/observe/variables/resolve.post.ts) |

## SSE and replay

`GET /api/observe/notifications/stream?after=<cursor>` sends frames named `notifications` containing NotificationUpdate. Clients retain the string cursor and supply it when reconnecting. Without a cursor, history becomes the initial snapshot rather than a reason to replay historical toasts. The server checks access on each read and emits periodic heartbeats; JSON fallback uses GET notifications.

## Adding an endpoint

Update role/resource policy, controller, client, schema, tests, and this catalog together. `bun run docs:check` compares METHOD/path signatures against handler files so endpoints cannot be silently omitted. Check linked handlers/services for exact action-specific responses instead of inferring them from route names.
