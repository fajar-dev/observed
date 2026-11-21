# Sign-in, profile, and identity providers

## Passwords and setup

Administrator setup is available once before the database is initialized. There is no public local registration, default account, or email forgot-password flow. Administrators manage accounts and reset passwords through Users. Signing out does not reopen setup.

Sign in with email/password. Browser credentials use HttpOnly cookies rather than localStorage. Access JWTs last 10 minutes; opaque refresh tokens rotate within an absolute 30-day session. Reusing a consumed refresh token revokes its session. Sign out revokes the current session and clears cookies.

## Profile

Account menu → **Profile** provides name changes, local password changes using the current password, linked sign-in methods, and browser sessions. Email is read-only in the personal profile. Changing a password revokes sessions and requires sign-in again.

Account fields use two columns on wider screens and one on mobile. Active sessions occupies a separate full-width section, places the current session first, and shows 10 sessions per page. Revoke works for other sessions or the current one; revoking the current session signs out immediately.

## Notification preference

**Profile → Notifications → Alert pop-ups** is enabled by default for new and existing accounts. Changes save immediately per account without Save changes. Disabling it suppresses only firing/recovery pop-ups; the inbox, unread count, alert refresh, ordinary action toasts, and Telegram delivery continue. The preference survives sign-in. Other browsers/sessions read the saved preference when account data refreshes or the page reloads.

## Google and Microsoft

Administrators create confidential web OAuth applications with each provider, configure the environment, and restart Observed. Register callbacks matching the browser's application URL. Callbacks follow incoming requests without a domain environment setting:

```text
<APPLICATION_URL>/api/observe/auth/oauth/google/callback
<APPLICATION_URL>/api/observe/auth/oauth/microsoft/callback
```

Google requires a client ID/secret and a verified email claim. Microsoft requires a client ID/secret, a specific tenant UUID, and a valid `email` claim; other tenants are rejected. `common` and `organizations` are not supported tenant values. Buttons appear only when `OBSERVE_<PROVIDER>_ENABLED=true`; enabling an incompletely configured provider causes a configuration error.

By default, new identities cannot create accounts automatically. Existing users sign in locally, open **Profile → Sign-in methods**, and connect the provider. Identities bind by provider and subject, never silently by matching email. An email conflict requires explicit linking.

`OBSERVE_OAUTH_ALLOW_SIGNUP=true` lets new identities create Viewer accounts after administrator setup. Administrators still assign resource access. Disabling a provider prevents its use for sign-in; keep another administrator sign-in method available before disabling it. The current UI does not provide provider unlinking.

OIDC uses authorization code, PKCE S256, state, nonce, and ID-token verification. Provider tokens are not sensor credentials and are not stored as Observed refresh sessions. OAuth configuration does not replace first-administrator setup.
