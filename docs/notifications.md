# In-app alert notifications

Every saved alert rule automatically participates in the Observed notification inbox. No destination, browser notification permission, or additional configuration is needed. Telegram destinations are optional.

## Behavior

- Enabled rules create one firing notification after their pending period. Repeated firing evaluations do not create duplicates. Recovery is recorded only after an in-app firing event.
- Errors, missing data, and pending evaluations do not imply recovery. Paused rules and rules with an active notification mute do not publish notifications. Previewing a condition does not publish anything.
- The header bell is available outside kiosk mode for every signed-in user, including users with no alert access. An inbox without permitted events shows the empty state. The inbox shows the latest 50 events, with the alert name, source, measured value, threshold, summary, and event time. The bell badge counts all unread events.
- Read receipts belong to the signed-in user. Marking everything read acknowledges only events up to the inbox cursor at the time of the request. Other users' receipts remain independent.
- Historical notifications populate the inbox silently. New firing/recovery events produce the existing application toast, without a progress indicator, and refresh the alert-rule status immediately. Toasts remain active while using kiosk mode; its global header remains hidden.
- Event snapshots preserve names and summaries after a rule is deleted. Administrators and users with All alerts access can still read that history; deleting a rule removes its individual grants, so users with Selected access lose access to those events.

## Implementation

`AlertService` determines state transitions. The PostgreSQL repository commits the evaluation, transition marker, and notification together. An advisory transaction lock orders notification inserts so concurrent evaluations cannot invalidate resume cursors.

Notification services and repository interfaces are under `server/features/notifications`. PostgreSQL migration 5 adds event snapshots and per-user read receipts without replacing existing tables. Users can read notifications only for alert rules they are allowed to view and acknowledge their own inbox; no user ID is accepted from the browser.

The client consumes authenticated server-sent events. The server checks for database changes every two seconds, so multiple application instances see the same persisted events. Session and alert access are revalidated before every update. Disconnects release timers and streams; the shared API client handles access-token renewal on reconnect. A cursor resumes missed events in batches of 100. A JSON fallback refreshes approximately every three seconds if streaming is unavailable. Reverse proxy buffering is disabled with `X-Accel-Buffering: no`.

## Verification

Unit tests cover transition deduplication, pending/mute/pause, inherited alert permissions, cursor validation, and chunked SSE decoding. Database integration tests cover atomic rollback, durable snapshots, reconnect data, deletion, and per-user receipts in an isolated PostgreSQL test database.

The live browser test uses `NOTIFICATION_TEST_DATABASE_URL` and a built application configured against that same isolated database. It exercises actual SSE firing/recovery delivery, silent initial history, read receipts, reload, mobile bounds, and sign-out cleanup. A simulated InfluxDB HTTP endpoint then supplies six tilt measurements (0.28°, 0.46°, 0.63°, 0.76°, 0.34°, 0.27°) to a real rule with a 0.5° threshold. The test verifies evaluation through the query adapter, persisted notifications, realtime toasts, immediate rule-status refresh, and the absence of duplicate episode notifications. It is skipped when that variable is absent; never point it at production data.
