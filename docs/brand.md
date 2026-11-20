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

Do not describe Observed as a workspace in user-facing copy, accessibility labels, metadata, errors, or notifications. Keep standard labels such as Profile, Users, and Configuration concise rather than adding sensor terminology to every control.

Threshold alerts report configured measurement conditions; they do not certify structural safety or predict failure. Preserve user-defined dashboard titles, measurements, queries, and source names.

Telegram firing and recovery messages state whether the measurement meets the configured alert condition. Recovery does not mean a structure has been assessed as safe. Connection test messages clearly identify themselves as tests and refer to structural sensor alerts. Telegram message text uses Indonesian; interface copy uses English. User-entered names and summaries retain their original language.

## Metadata and compatibility

Page titles, descriptions, Open Graph metadata, social preview metadata, and the web manifest identify Observed. This authenticated application is excluded from search indexing through robots metadata and `robots.txt`; it has no public marketing pages or assumed deployment domain.

Internal API paths, database schemas, storage keys, and `OBSERVE_*` environment variables retain their established names. They are integration contracts, independent of the visible product identity.

## Copy audit — 20 November 2026

- Reviewed Overview, dashboard library and editor, Alerts, both Configuration tabs, Users, Profile, authentication, and the error page. No retired product terminology remains in application-authored user-facing copy.
- Corrected the repeated product name in the initial setup page title; clarified the Telegram destination selector and sensor measurements in the query inspector.
- Verified add/edit dialogs for panels, alert rules, data sources, and Telegram destinations, plus JSON import and user creation. Browser checks inspect visible text, accessibility labels, placeholders, page titles, and page metadata.
- Covered password sign-in failure, Google/Microsoft sign-in links, provider failure notices, and initial setup. Existing authentication viewport tests cover desktop and mobile layout bounds.
- Tested Telegram firing, recovery, and connection-test text, HTML escaping, threshold operators, measurement precision, and WIB timestamps. Transport checks use mocks; this audit does not send messages to configured chats.
- Preserved all logo assets, styles, user-defined dashboard content, data source names, and alert summaries.
