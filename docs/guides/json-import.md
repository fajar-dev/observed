# JSON import and export

## Import

1. Open **Dashboards → New dashboard → Import JSON**.
2. Upload or paste dashboard JSON. Observed accepts native definitions and recognized parts of classic Grafana dashboard JSON.
3. Choose the destination source. Review panel source mapping, query language, bucket/server/sensor variables, and converter warnings.
4. Run the data checks available in the dialog. Correct source/query/variable errors before saving.
5. Create the dashboard and inspect its values, units, legends, tables, and panel layout.

Importing by Grafana ID or catalog URL is not available. Dashboard JSON does not include source credentials. A source with the same name in another installation may have a different ID.

## What to verify

The converter attempts to preserve panel position/size, rows, queries, variables, colors, units, legends, thresholds, and table options supported by the Observed schema. It does not guarantee an exact match for every Grafana dashboard. Visualization plugins, complex transformations, expressions, non-InfluxDB sources, and other schemas may need manual reconstruction. Read warnings instead of judging only the visual preview.

`No data` commonly means a mismatched time range, bucket, measurement, field/tag, variable, or query language. Do not insert fictional sensor data to hide an empty result. Use **Check panel data** and the inspector to identify the cause.

## Export and JSON editing

Dashboard menu → **Export JSON** downloads the configuration. **Dashboard settings → JSON** edits and validates the draft before Save. See [dashboard.json](../examples/dashboard.json) for a minimal native example. Replace example source IDs before use.

Import stores the original document in `importMetadata` so source/appearance repairs can reference it. Import repair requires Edit access and updates the saved dashboard/version; inspect the result afterward.

API bodies are limited to 2 MiB. `sourceDocument` is limited to 1,500,000 characters and each query to 25,000. Never put tokens or secrets in dashboard queries/JSON: exports and users with View access can read them.
