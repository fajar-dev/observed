# Configuration: InfluxDB

Only Administrators can add, edit, test, or delete connections. Every signed-in user can read source metadata and run queries. There are no per-source permissions.

## Add a connection

1. Open **Configuration → Data sources → Add data source**.
2. Enter a name identifying the sensor source or structure location.
3. Enter the InfluxDB base URL, such as `http://192.168.10.20:8086`. Do not append `/api/v2/query`, URL credentials, parameters, or fragments.
4. Select the correct query language and supply the matching bucket/database and credentials.
5. Save, then use **Test connection** in the source list.

| Field | Flux | InfluxQL |
| --- | --- | --- |
| URL | Server providing `/api/v2/query` | Server providing `/query` |
| Organization | Required | May be empty |
| Bucket/database | Default bucket | Default database |
| Username | Not needed for Flux tokens | Set for Basic authentication |
| Credential | Token with bucket read access | Token, or password when a username is provided |

Observed cannot enable Flux on servers that do not provide it. If the InfluxDB deployment requires DBRP mapping for InfluxQL, configure that mapping on the InfluxDB server.

## Edit and delete

The API never returns saved credentials. In the edit form, leaving the credential blank preserves it; use the remove-credential control to clear it. Do not copy placeholder text as a new credential. Secrets are encrypted in PostgreSQL.

A source referenced by a dashboard or alert cannot be deleted until those references are removed or reassigned. Review source-variable selections before deleting a source as well.

## Connecting from Docker

`localhost` inside a container is not the host computer. For host InfluxDB use `http://host.docker.internal:8086`. For LAN sources, use an address reachable from the container. Ensure InfluxDB accepts connections on the intended interface.

## Query limits

Remote transport has a 12-second timeout and an 8 MiB response limit. Query results are limited to 5,000 rows and report `truncated`. Filter measurements, fields, and sensors; shorten time ranges and aggregate on the server. Alert evaluation rejects truncated results instead of deciding from partial data.

Use InfluxDB credentials with minimum read privileges. The InfluxQL read-only check is an additional defense; upstream credentials remain the main privilege boundary, including for Flux. See [panel queries](../guides/panels-and-queries.md) for examples.
