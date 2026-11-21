# Dashboard variables

Variables let one dashboard serve multiple sensors, locations, buckets, or sources. Add them in **Dashboard settings → Variables**, then Save. Names must start with a letter, contain only letters/digits/underscores, be no longer than 60 characters, and avoid reserved JavaScript object names. Names must be unique within a dashboard.

| Type | Values |
| --- | --- |
| `custom` | Static choices |
| `constant` | A fixed interpolation value |
| `query` | Choices loaded from a source query |
| `datasource` | One selected InfluxDB source ID |
| `textbox` | User-entered text |
| `interval` | Durations such as `10s` and `1m` |

Set a short label, type, values/query, default, and Multi-value or Include All when appropriate. Source variables are single-select. The JSON contract supports `hidden`; not every contract property has a dedicated UI control.

## Examples

Create `sensor` with values `P1`, `P2`, and `P3`. Use it in Flux:

```flux
|> filter(fn: (r) => r.sensor == "$sensor")
```

Supported Flux equality selectors become `contains` membership expressions for multiple values. For regex selection:

```flux
|> filter(fn: (r) => r.sensor =~ /^${sensor:regex}$/)
```

String/regex interpolation escapes values for their context. `${name:json}` produces JSON; `${name:pipe}` joins values with `|`; `${name:raw}` removes quoting only for one validated numeric/duration/boolean value. Do not use raw interpolation to inject arbitrary query fragments.

## Resolution

Query variables may depend on other variables. The resolver handles dependencies first and reports cycles or unresolved values. Query results become unique string choices, up to 500 values; common columns such as `_value`, `value`, `name`, and `host` are preferred over time columns. Inspect resolver output when choices are unexpected.

Include All expands actual choices rather than inserting a raw SQL wildcard. Selections use `var-<name>` URL parameters alongside time state. Panels using a source variable store its name in `dataSourceVariable`; the selected value must be a valid source ID.

Supported time macros include `$__interval`, `$__interval_ms`, `$__from`, `$__to`, `$__range`, `$__range_s`, `$__range_ms`, `${__from:date:iso}`, and `${__to:date:iso}`. Unknown macros do not imply full Grafana support. Alert rules do not automatically resolve dashboard variables; use self-contained alert queries or explicit values through the query contract.
