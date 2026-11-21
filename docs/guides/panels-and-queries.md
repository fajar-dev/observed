# Panels, queries, and visualizations

## Panel editor

The add/edit panel editor combines queries, preview, and appearance settings. Choose an InfluxDB source, use the builder to discover measurements/fields/tags, or write a query directly. Run it with the action button or `Ctrl+Enter`/`Cmd+Enter`. The query language must match the source; changing a language label does not translate server syntax.

Panels support one primary query and up to nine additional queries. Superseded previews are canceled so stale results do not overwrite newer selections. Apply the panel to the draft, then Save the dashboard to persist it.

## Flux example

```flux
from(bucket: v.defaultBucket)
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r._measurement == "structure_sensors")
  |> filter(fn: (r) => r._field == "tilt" and r.sensor == "P2")
  |> aggregateWindow(every: v.windowPeriod, fn: mean, createEmpty: false)
```

The server provides `v.defaultBucket`, `v.timeRangeStart`, `v.timeRangeStop`, and `v.windowPeriod`. The aggregation window is derived from the requested range for approximately 300 intervals, with a one-second minimum. Flux imports must precede option declarations; the client inserts its prelude after imports.

## InfluxQL example

```sql
SELECT mean("tilt") AS "tilt"
FROM "structure_sensors"
WHERE $timeFilter AND "sensor" = 'P2'
GROUP BY time($__interval), "sensor" fill(null)
```

The server substitutes `$timeFilter` and `$__interval`. Metadata queries such as `SHOW MEASUREMENTS LIMIT 100` help with discovery. InfluxQL is checked for read-only operations; use read-only upstream credentials as well.

## Choose a visualization

| Visualization | Typical use |
| --- | --- |
| Time series / Area | Sensor measurements over time |
| Bar chart | Comparing values or series |
| Metric | A reduced value, such as the latest reading |
| Gauge / Bar gauge | Values within a configured min/max range |
| Pie chart | Relevant proportions of positive values |
| Table | Inspecting returned rows and fields |
| Text | Dashboard notes; not arbitrary HTML |

Configure the title, note, unit, decimals, min/max, reducer, legend, colors, thresholds, and field appearance as appropriate. Some advanced options are available through JSON rather than dedicated editor controls. See the [data contracts](../reference/data-contracts.md).

Units are not inferred from titles. A percentage ratio of 0–1 differs from a percentage value of 0–100; select the format matching the data. Panel color thresholds do not create alert rules automatically. For many series, consider a right-side or table legend and sufficient panel height. Tables can scroll within their panels to keep columns readable.

## Query inspector

Panel menu → **Inspect data** opens **Query inspector** with underlined **Stats**, **Query**, **JSON**, and **Data** tabs. Stats shows duration, row/query counts, and truncation. Data provides a table and **Download CSV**. The Query tab shows statements submitted by the panel; it is not a full trace of every server interpolation step.

Each query returns at most 5,000 rows. If `truncated=true`, narrow the range or aggregate/filter in InfluxDB. Check timestamps, numeric fields, series labels, and null values before trying to fix incorrect data through appearance changes.
