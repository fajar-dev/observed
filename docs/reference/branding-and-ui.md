# Branding and UI system

## Identity

The product name is **Observed**. Use structural sensor monitoring language: sensor dashboards, structural trends, threshold alerts, sources, structures, buildings, and bridges. The main users are civil engineers, contractors, and structure owners. Keep the AMTI logo; copy changes do not replace it.

Identity is centralized in [product.ts](../../shared/config/product.ts). Global metadata lives in [nuxt.config.ts](../../nuxt.config.ts); pages use the SEO helper. Observed is a private console with `noindex, nofollow`, not a public landing page.

Write documentation, UI text, notifications, examples, and code comments in English. Date and number display uses an explicit English locale. Do not translate proper names, public identifiers, or user-authored resource names/queries. Do not put “workspace” or old monitoring brands into UI copy, claim automatic ingestion, or advertise unimplemented features. Internal identifiers such as `WorkspaceApi`, `WorkspacePage`, and `createWorkspace` do not require renaming for copy changes.

## Visual rules

- Preserve the logo, sidebar, header, blue palette, white background, and fluid content container.
- Prefer Nuxt UI, shared [app.config.ts](../../app/app.config.ts), and existing primitives before custom components.
- Use component sizes `xs`, `sm`, `md`, `lg`, `xl`. Use semantic spacing/dimension tokens from [tokens.css](../../app/assets/styles/tokens.css), not per-page numeric/arbitrary utilities.
- Toolbars/filters/actions usually use `sm`; form fields use `md`. Inputs/selects/textareas that require values have labels, meaningful placeholders, and validation messages.
- Horizontal tabs use the underlined link variant. Action menus use vertical ellipsis icons and right alignment.
- Regular dialogs have a title without a subtitle or header/footer separators. Use compact shared padding. Modals/slideover overlays have a light tint and subtle blur. Fullscreen editors retain their editing structure.
- Use the shared toast helper with a short title and description explaining the outcome or next step; both are required by its contract. Saving configuration must not claim a successful connection test. Do not use progress/loading toasts, `UAlert`, or parallel inline error banners for flows already using toasts.
- Keep empty states concise and provide a CTA when the role can create resources. Avoid repetitive footer counts and long explanatory paragraphs.

Typography uses Inter for body/forms, Manrope for headings/metrics, and JetBrains Mono for queries/code. Follow the weight hierarchy rather than making every label bold. Charts need room for axes/legends; wide tables scroll locally without page overflow.

## UI verification

Check desktop/mobile, long titles, many series, wide tables, empty states, restricted roles, keyboard focus, dialog closing, and kiosk. Make shared style changes in tokens/component configuration instead of per-view overrides. Semantic UI lint rules live in [semantic-ui.mjs](../../tooling/eslint/semantic-ui.mjs).
