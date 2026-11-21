# Configuration: Telegram

Telegram is optional. Alerts still create in-app notifications for users with alert access without separate destination configuration.

## Create a destination

1. Create a Telegram bot through BotFather and keep its token private.
2. Start a conversation with the bot, or add it to the destination group/channel and grant permission to send messages.
3. Open **Configuration → Telegram destinations → Add Telegram destination**.
4. Enter a name, a numeric chat ID (including negative group IDs) or a supported `@username`, and the bot token.
5. Save, then run the destination test action. This sends a real Telegram message.
6. Select one or more destinations in the alert editor and save the rule.

The application supports multiple destinations, with up to 20 unique destinations per rule. Adding a destination in Configuration does not automatically select it for every rule.

## Editing and delivery

Saved tokens are not displayed again. Leaving the token blank in the edit form preserves it. Destinations referenced by a rule cannot be deleted until the references are removed.

Firing and recovery messages include the alert name, source, current value, threshold/operator, event time, and optional severity/summary. Messages use escaped HTML and English labels, dates, and numeric formatting. Event time is shown in `UTC+07:00` (Asia/Jakarta). Values reflect query output; the alert name does not trigger automatic unit conversion.

Telegram failures appear as evaluation delivery errors. Later evaluations retry destinations that have not succeeded; in-app notifications do not depend on Telegram success. External delivery is not exactly-once if the process stops after Telegram receives a message but before delivery state is saved.

## Missing messages

Check the token, chat ID, whether the bot has been started, group/channel membership and send permissions, outbound server connectivity, rule enabled state, pending period, mute, and query results. Preview checks the condition without sending notifications. See the [alert lifecycle](../guides/alerts.md).
