# Security and trust boundaries

## Authentication

Passwords use scrypt hashes. HS256 access JWTs last 10 minutes and bind to sessions; each authenticated request checks current database account/session state. The signing key is derived from the application key with usage separation. Random refresh tokens are stored as SHA-256 hashes, rotate on refresh, and revoke their session on replay. Sessions have an absolute 30-day lifetime.

Cookies use HttpOnly, SameSite Lax, and Secure for HTTPS request URLs. Refresh cookies are restricted to the authentication path. Browsers do not store tokens in localStorage. Sign-out, revocation, and account disabling revoke database sessions rather than merely clearing UI state. Authentication throttles are persisted in PostgreSQL.

First-administrator bootstrap is one-time and uses a durable database marker. OIDC verifies PKCE/state/nonce/issuer/audience and provider identity; accounts are never silently linked by matching email.

## Authorization

Middleware checks routes/roles, PermissionService checks resources, collection/notification reads are filtered, and Editor deletion requires ownership. Frontend route guards are not the access boundary.

All signed-in users may query all sources. This does not isolate raw sensor data between tenants. Administrators control source URLs and credentials. Private network connectivity is intentional; no source network sandbox is provided. Limit administrator access and egress according to installation needs.

The per-user alert pop-up preference changes client presentation only. It does not grant access, change rule permissions, stop event persistence/streaming, or suppress Telegram delivery. Only the authenticated principal can change their own preference.

## Secrets and transport

InfluxDB credentials and Telegram tokens use AES-256-GCM. APIs never return saved plaintext. Secure database backups and preserve the corresponding key separately. Automatic encryption-key rotation with re-encryption is not implemented.

Mutation requests validate Origin/Sec-Fetch-Site; Bearer requests are still rejected when supplying a mismatched Origin. JSON body limit is 2 MiB, remote response limit is 8 MiB, remote timeout is 12 seconds, and query result limit is 5,000 rows. Remote redirects are rejected.

Parameterized SQL and Zod validation constrain inputs. InfluxQL has an additional read-only check, but read-only InfluxDB tokens remain the actual privilege boundary. Do not assume the application filter covers every Flux capability.

## Operations

Preserve the correct request host/scheme, provide HTTPS through the deployment infrastructure, use least-privilege database/provider/bot credentials, and keep private backups. Never print secrets or export dashboards containing tokens inside queries. A non-root/read-only Docker runtime does not replace resource authorization or host security.

Security changes need direct-request tests for roles, revoked grants, expired sessions, and stream reconnects. See the [access matrix](guides/users-and-permissions.md) and [testing guide](development/testing.md).
