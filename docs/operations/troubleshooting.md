# Troubleshooting

| Symptom | Checks and action |
| --- | --- |
| `Set a 32-byte base64 OBSERVE_SECRET_KEY` | Use `openssl rand -base64 32`, not an ordinary 32-character string. Confirm the runtime loads its environment. Preserve the existing key when credentials already exist. |
| Health 503 / database operation failed | Check database URL, network, role/password, schema privileges, connection capacity, and PostgreSQL logs. Health triggers readiness/migrations. |
| Unexpected setup screen/state | Confirm the intended database is configured. Setup completion is durable; restart/logout is not a reset. |
| HTTP 403 from a script | Cookie mutations need a matching Origin or same-origin signal; non-browser clients may use Bearer. Resource permissions still apply. |
| Sign-in required after access changes | Permission/password/role changes may revoke sessions intentionally. |
| Missing Google/Microsoft button | The enabled flag must be exactly `true`; restart and verify provider credentials/callbacks. |
| OAuth rejected despite matching email | No automatic email linking exists. Connect the provider from Profile while locally signed in. Check tenant and email claims. |
| Credentials fail after restore | Use the encryption key matching the backup. Replacing the key is not a credential migration. |
| InfluxDB timeout | Test from the runtime/container network, not only the browser/host. Check URL, firewall, token, server, time range, and aggregation. Transport timeout is 12 seconds. |
| Container cannot reach host InfluxDB | Use `host.docker.internal`, not container localhost; check listener binding and the host firewall. |
| Dashboard `No data` | Check time/timestamps, bucket, measurement, fields/tags, source mapping, variables, and query language. Use Check panel data and the inspector. |
| Imported dashboard differs | Read warnings. Some Grafana plugins/transformations are unsupported; adjust queries and appearance manually. |
| Clipped chart/legend/table | Increase panel height/width, shorten labels, reposition legends, reduce series, and check local scrolling. Reproduce bugs with sanitized fixtures. |
| Truncated data | More than 5,000 rows: filter/aggregate or narrow the range. Alert evaluation treats truncation as an error. |
| Dashboard save conflict 409 | A newer revision exists. Preserve a separate draft if needed, reload, and merge changes. |
| Source/destination cannot be deleted | Remove dashboard/alert references first. |
| Alert not firing | Check enabled state, numeric field, threshold units, reducer, pending period, interval, query, and server time. |
| Alert evaluation stops | Check the running server, database readiness, due state, and in-progress evaluation/locks. Scheduling is always active. |
| No recovery | Recovery requires a previously notified firing episode followed by normal. no_data/error/pending is not recovery. Mute suppresses delivery. |
| Empty inbox | No transition yet or no View access to the rule; the bell still appears for signed-in users. |
| No alert toast but inbox updates | Check Profile → Notifications → Alert pop-ups. Disabling it suppresses alert pop-ups only. |
| Old toasts replay | Check cursor/reconnect/session state; initial history should be silent. Keep bigint sequences as strings. |
| Telegram failure | A destination test sends a real message. Check token/chat ID, bot conversation/permissions, egress, enabled/mute, and deliveryError. |
| Automatic refresh pauses during editing | Panel timers pause during editing or when the tab is hidden; Off also disables refresh. Alert scheduling is separate. |

## Investigation order

Start with health/session, then permissions, source connectivity, raw query output, inspector results, and visualization mapping. For alerts, distinguish evaluation success from Telegram delivery. Record reproduction steps and sanitized logs; never attach `.env`, cookies, tokens, or production database dumps to an issue.

See [testing](../development/testing.md) and [backup/recovery](backup-and-recovery.md).
