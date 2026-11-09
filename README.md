# Audu Bako Attendance

## Face ID / WebAuthn setup

WebAuthn registration and sign-in are verified by the `webauthn` Supabase Edge Function. Before enabling the Face ID buttons:

1. Apply the database migration with `supabase db push` (or run `supabase/migrations/20261109183000_create_webauthn_tables.sql` in the Supabase SQL editor).
2. Set `WEBAUTHN_RP_ID` to the app's relying-party hostname, without a scheme or port (for example, `attendance.example.org`).
3. Set `WEBAUTHN_ORIGINS` to a comma-separated list of exact browser origins (for example, `https://attendance.example.org`). For local development, include the exact Vite origin, such as `http://localhost:5173`, and use `localhost` as the RP ID.
4. Deploy the function with `supabase functions deploy webauthn`. Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to deployed functions.

Set the WebAuthn values as Edge Function secrets, for example:

```sh
supabase secrets set WEBAUTHN_RP_ID=attendance.example.org WEBAUTHN_ORIGINS=https://attendance.example.org
```

Registration requires the admin to re-enter their password. Credentials and short-lived, single-use challenges are stored in tables inaccessible to the browser. The existing app still keeps its application session in browser storage; this WebAuthn change verifies the authenticator assertion server-side but does not replace the app's broader session/authentication model.

---

This project uses Vue 3 and Vite. Learn more in the [Vue documentation](https://vuejs.org/guide/scaling-up/tooling.html) and [Vite documentation](https://vite.dev/guide/).

This template should help get you started developing with Vue 3 in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about IDE Support for Vue in the [Vue Docs Scaling up Guide](https://vuejs.org/guide/scaling-up/tooling.html#ide-support).
"# AuduBakoProject" 
