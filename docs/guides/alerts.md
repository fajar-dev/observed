# Sensor alerts

## Create a rule

Admins and Editors can create rules. Existing rules require Edit access for changes or manual evaluation.

1. Open **Alerts → New alert rule**.
2. Enter a short name, optional summary, severity, source, query, and time range.
3. Run the preview and verify the correct numeric field.
4. Select the field, reducer (`last`, `mean`, `min`, `max`), operator (`gt`, `gte`, `lt`, `lte`), and threshold.
5. Set the evaluation interval to 30–86,400 seconds and the pending period to 0–86,400 seconds.
6. Select optional Telegram destinations; an empty list still permits automatic in-app notifications.
7. Save the rule as enabled when ready for server evaluation.

Preview does not save a production evaluation or send notifications. **Evaluate now** performs a real evaluation and can notify when the rule is enabled and unmuted. Manual evaluation of a paused rule can test its query without delivery.

## Example condition

For a query returning tilt in degrees, select `_value`, reducer `last`, operator `gt`, and an engineer-approved threshold. If the data is a ratio, the threshold must use that ratio too; a title containing “80%” does not convert threshold `80` to `0.8`.

Leave the field empty only when automatic selection is appropriate: numeric `_value` is preferred, otherwise available numeric fields are considered. For multiple columns/series, select an explicit field and filter the sensor so the reducer does not mix unrelated measurements. `last` uses the latest timestamp, including fractional precision; without valid timestamps, result order affects the last value.

## States and delivery

| State | Meaning |
| --- | --- |
| `normal` | Numeric samples exist and do not meet the condition |
| `pending` | The condition is met but its pending period has not elapsed |
| `firing` | The condition is met and the pending period is complete |
| `no_data` | No evaluable numeric samples |
| `error` | Query failure or truncated results |
| Paused (UI) | The rule is disabled and skipped by the scheduler |

Pending requires the condition to remain met across subsequent evaluations. Normal/no_data/error resets pending. The evaluation interval defines observation resolution, not continuous measurement between evaluations.

The first firing transition in an episode creates a firing event. A later normal evaluation after a notified episode creates recovery. An initial normal evaluation does not create recovery. Pending, no_data, and error are not recovery. Each rule retains its latest 50 evaluations.

## Pause, mute, and changes

Pause stops scheduled evaluation. Temporary mute keeps evaluating but suppresses new events/delivery. Use the rule menu and check the state and mute expiration.

Changing query, source, range, field, reducer, operator, threshold, or pending period resets the active evaluation/pending state for the new condition. Changing enabled state also resets pending. Evaluation history is not an unlimited audit log.

The scheduler checks due rules every 10 seconds and evaluates batches of up to four concurrently. PostgreSQL locks prevent simultaneous evaluation of one rule by multiple instances. Scheduling always runs while the application server is alive; no browser dashboard needs to be open. Enable/pause applies per rule, not through a global environment switch.

To verify delivery, use a test source: preview normal values, change a controlled sample past the threshold, wait through pending, check firing in the inbox/Telegram, restore the sample, and check recovery. Do not alter production sensor measurements just to simulate an alert.
