# Getting started

## First administrator

1. Start Observed using [local installation](../installation/local.md) or [Docker](../installation/docker.md).
2. Open `/sign-in` and create the first administrator. Setup is available only before the installation has been initialized.
3. Add an InfluxDB source through **Configuration → Data sources** and test the connection.
4. Create a dashboard through **Dashboards → New dashboard → Create new**.
5. Add a panel, choose its source, build or write a query, run the preview, and configure its visualization and units.
6. Apply the panel and **Save** the dashboard. Layout changes are not persistent until the dashboard is saved.
7. Create a rule in **Alerts** using a verified numeric query, preview the condition, choose a threshold/schedule, and save.
8. Optionally add Telegram destinations in Configuration and select them on the rule.
9. Add accounts through **Users**, select roles, and assign dashboard/alert access through **Permissions**.

## Existing users

Sign in with a password or an enabled provider. Open an assigned dashboard, adjust its variables/time range, and inspect query results when necessary. Editors can create their own dashboards and alerts; Viewers read assigned resources.

The header bell remains available even with no alert access. The inbox contains only notifications from permitted alerts. The account menu opens **Profile** and **Sign out**. Header Search opens available pages and dashboards.

## Example sensor workflow

For a bridge pier tilt sensor, build a time-series panel using the `tilt` field and a `sensor` filter. Choose units matching the physical sensor output. Create an alert with an explicit numeric field, an appropriate reducer, and an engineer-approved threshold. Test the preview and empty-data behavior before enabling delivery.

`structure_sensors`, `tilt`, and `P2` are example schema names; replace them with your InfluxDB schema. The application does not create demo sensor data automatically.
