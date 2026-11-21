# In-app notifications

The header bell is available to every signed-in user, including accounts without access to any alert. No internal channel setup or separate notification permission is required. Notifications automatically follow the alert rules the user can view.

## Reading the inbox

Open the bell to see recent firing/recovery events, unread status, alert/source names, value/threshold, and time. Opening an item marks it read; mark-all-read applies through the current cursor. Read status belongs to each user, not the entire installation.

The inbox shows up to 50 permitted recent items. The unread count includes all unread permitted events and may exceed the displayed list length. An empty inbox can mean no events yet or no rule access.

## Realtime updates

The application opens an authenticated SSE connection and shows toasts for new events. Initial history is not replayed as toasts. **Profile → Notifications → Alert pop-ups** is enabled by default and can be disabled per account. Disabling it dismisses visible alert toasts and keeps the inbox/unread count updating without pop-ups. Re-enabling it shows future events only, not events received while disabled.

If streaming fails, the client falls back to JSON polling. Sign-out closes the subscription and clears the previous account's state and alert toasts.

Events are persisted in PostgreSQL, allowing multiple application instances to deliver the same events to the correct users. SSE uses a sequence cursor represented as a string; never convert it to JavaScript Number because bigint precision may be lost.

Permissions are checked for lists, replay, and mark-read operations. After alert access is revoked, its notifications are unavailable to that account. Administrators can retain historical snapshots after rule deletion; Selected access is lost when the resource grant disappears.

Kiosk hides the global header, including the bell, without making the session anonymous. See [Telegram configuration](../configuration/telegram.md) for external delivery; Telegram failure does not imply inbox failure.
