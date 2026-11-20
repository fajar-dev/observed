# Observed

Observed is a structural health monitoring application. It turns IoT sensor measurements from buildings, bridges, and other structures into custom dashboards, measurement trends, and configured threshold alerts. Its audience is civil engineers, contractors, and asset owners.

## Identity

- Product name: **Observed**.
- Category: **Structural Health Monitoring**.
- Tagline: **Understand your structures.**
- Existing AMTI logos, favicon, and application icons remain unchanged. The application palette, navigation shell, and typography remain unchanged.
- Public identity and default metadata are defined in `shared/config/product.ts`. Page metadata uses `usePageSeo`; Telegram notification headers use the same product name.

## Language

Use clear monitoring terms: sensor measurements, structures, dashboards, trends, thresholds, alert rules, data sources, and Telegram destinations. Examples should refer to measurements such as strain, tilt, displacement, and vibration. Keep query language names and connection fields precise for configuration.

Threshold alerts report configured measurement conditions; they do not certify structural safety or predict failure. Preserve user-defined dashboard titles, measurements, queries, and source names.

## Metadata and compatibility

Page titles, descriptions, Open Graph metadata, social preview metadata, and the web manifest identify Observed. This authenticated application is excluded from search indexing through robots metadata and `robots.txt`; it has no public marketing pages or assumed deployment domain.

Internal API paths, database schemas, storage keys, and `OBSERVE_*` environment variables retain their established names. They are integration contracts, independent of the visible product identity.
