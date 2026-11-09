# Audu Bako Attendance

## Staff password recovery

Staff email recovery uses Supabase Auth. Apply `supabase/migrations/20261109202000_add_staff_email_auth.sql`, enable email signup and email confirmations in Supabase Auth, and allow the deployed app URL with `?view=staff&flow=recovery` in the Auth redirect URL list. Configure SMTP for reliable delivery. New staff register with an email; existing staff can add and verify an email after signing in with their current password. Password reset links return to the staff portal.

## Face ID / WebAuthn setup

The admin portal uses the `webauthn` Supabase Edge Function to verify registration and sign-in assertions. Before using Face ID:

1. Apply `supabase/migrations/20261109183000_create_webauthn_tables.sql` using `supabase db push` or the Supabase SQL editor.
2. Set `WEBAUTHN_RP_ID` to the app hostname without a scheme or port (for example, `attendance.example.org`).
3. Set `WEBAUTHN_ORIGINS` to the exact browser origin(s), comma-separated (for example, `https://attendance.example.org`). For local development, set the RP ID to `localhost` and include the exact Vite origin, such as `http://localhost:5173`.
4. Deploy the Edge Function with `supabase functions deploy webauthn`. Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

Configure the WebAuthn secrets, for example:

```sh
supabase secrets set WEBAUTHN_RP_ID=attendance.example.org WEBAUTHN_ORIGINS=https://attendance.example.org
```

Face ID setup asks the admin to re-enter their password. Credentials and short-lived single-use challenges are stored server-side. The existing app session is still stored in browser storage; this change verifies the WebAuthn assertion server-side but does not replace the app's broader session model.

---

This project uses Vue 3 and Vite. Learn more in the [Vue documentation](https://vuejs.org/guide/scaling-up/tooling.html) and [Vite documentation](https://vite.dev/guide/).
