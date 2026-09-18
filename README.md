# ProMarketer — MSME CRM foundation

The active application is Next.js with **Neon PostgreSQL**, server API routes and Better Auth. Leads, activities, campaigns, scheduled posts, business settings and authentication records share the PostgreSQL database. The browser never receives a database connection string.

## Start locally

Use Node.js 22 or newer. From this directory:

1. Run `npm ci`.
2. Create a fresh Neon database/branch. In Neon **Connect**, copy its pooled PostgreSQL URL into `DATABASE_URL`. Preserve the SSL parameters. Optionally put the direct connection URL in `DIRECT_DATABASE_URL` for migrations; both URLs must use the same database and owner role.
3. Copy `.env.example` to `.env.local`. Generate a secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and put it in `BETTER_AUTH_SECRET`. Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to the exact application origin, initially `http://localhost:3000`.
4. Run `npm run db:migrate`. The connection role must own the schema and be allowed to create/grant the restricted `promarketer_app` role.
5. Run `npm run dev`, open `http://localhost:3000/login`, create an account, then create your business. This creates its profile and initial lead pipeline.
6. Add optional provider keys from Settings.

No migration runs automatically when the app starts. The migration runner loads `.env.local`, uses a transaction and advisory lock, and records migration checksums. Re-running skips unchanged migrations; editing an already-applied migration fails. Add another numbered SQL file for subsequent schema changes.

Neon connection guidance: [connection pooling](https://neon.com/docs/connect/connection-pooling). The app uses explicit transactions and transaction-local identity/role settings; it does not rely on session settings surviving between pooled transactions.

## Architecture and permissions

`Browser → Next.js API → verified Better Auth session → organization membership → PostgreSQL`

- Better Auth stores users, password hashes and revocable sessions in Neon. Authentication uses server cookies. Protected layouts and API handlers verify the session, independently of middleware.
- Each CRM query runs as the restricted `promarketer_app` role inside a transaction. The server sets the verified user ID for that transaction; RLS and composite foreign keys isolate businesses. Identity and role reset when the transaction ends.
- The privileged server connection handles authentication, scoped membership lookup, provider credentials, logo bytes and trusted Calendar bindings. Its URL must remain server-only.
- Owner/manager: settings, provider keys, spaces, all lead operations and team post deletion.
- Member: view records, create/edit leads, log activities, create campaigns/posts and connect their own calendar.
- Viewer: read business records; update their own non-privileged profile fields.
- One business per account. Team invitations and organization switching are future work.

To join an existing business, the person signs up but does not create a new business. A trusted administrator verifies the account and adds membership using Neon's SQL editor:

```sql
INSERT INTO public.organization_members (organization_id, user_id, role)
VALUES ('BUSINESS_UUID', 'VERIFIED_PROFILE_UUID', 'member');
```

The user ID is available in `public.profiles`; the business ID is in `public.organizations`. Never accept a role or business assignment from an unverified request. Historical references prevent casually moving users between businesses.

## Authentication and deployment

- Configure `RESEND_API_KEY` and `EMAIL_FROM` to require email verification on sign-up and enable Better Auth's password-reset email delivery. Without them, sign-up immediately creates a session; there is no email delivery. A password-reset form is not yet implemented.
- Authentication endpoints have database-backed rate limits. Your production proxy must overwrite a trusted client-IP header; otherwise clients may share the fallback rate-limit bucket. Validate this with your hosting setup.
- Set the two application URLs to the same HTTPS origin in production, and keep `BETTER_AUTH_SECRET` stable across instances.
- Host the app in a Node.js environment with PostgreSQL network access. Auth and CRM routes are dynamic; this is not a static-export application.
- Keep database backups and validate against a staging branch before release.

Auth integration reference: [Better Auth with Next.js](https://better-auth.com/docs/integrations/next).

## Optional integrations

**Google Calendar:** set the three Google OAuth variables in `.env.example` and register the exact redirect URI. OAuth state is cookie-bound and user-bound. Only a post's creator can sync it to their calendar. Owners/managers can delete a teammate's linked event through the scoped server route. Disconnect clears tokens while retaining account email and event bindings; reconnect the same Google account before editing/deleting linked events. This feature creates calendar events, not social media posts.

**Google Sheets:** set service-account variables and `GOOGLE_SHEETS_ORGANIZATION_ID`. Only that business's owner/managers can use the shared spreadsheet. Campaign storage supports Neon, Sheets, or both. Combined saves are not an atomic cross-service transaction.

**AI providers:** owners/managers save keys in Settings. API responses return configured flags, not stored keys. Credentials are stored in protected database tables; application-level encryption and automated key rotation remain future work.

**Logos:** PNG, JPEG and WebP uploads up to 512 KB are stored in Neon and served through an authenticated route. No storage bucket is required.

**Updates:** leads and the dashboard refresh every 30 seconds while visible, on window focus, and after relevant edits. There is no WebSocket/Realtime subscription.

## Existing Supabase data

This is a fresh Neon schema, **not an automatic data/account migration**. Supabase SDK dependencies and active runtime calls have been removed. Old SQL is retained under `archive/supabase/` for reference; do not apply it to Neon.

Existing Supabase users, passwords, files and records have not been copied. Before switching an existing deployment, take an export/backup, map verified users and business ownership, import related records in dependency order, transfer logos, reconcile counts, and verify access in staging. Users will need a planned account enrollment/password-reset process and to reconnect Google. Keep the old deployment available until those checks pass.

## Validation

- `npm test`: embedded PostgreSQL tests of the exact Neon schema, real Better Auth handler, tenant isolation, permissions, lead history, transaction identity cleanup, SQL binding and upload limits.
- `npm run lint`: ESLint checks.
- `npm run build`: production build.
- `npm run smoke:auth`: after building, starts a temporary server with dummy configuration. Checks 21 protected HTTP endpoints, fail-closed handling of unverifiable cookies while the database is offline, page redirects, origin rejection and a middleware-bypass header. Forged-cookie rejection with a healthy database is covered by the auth unit test.
- `npm start`: run the built application.

Embedded tests do not validate Neon networking, its deployed roles/pooler, email delivery or Google service calls. Exercise signup → onboarding → lead creation/editing → notes → settings → scheduler in a real staging database before launch.

## Product status

Working foundation: sign-in, business onboarding, lead pipeline and edits, activity history, scoped settings, campaign persistence and calendar scheduling. The original product assessment is in `PROJECT_ASSESSMENT.md`; current implementation evidence is in `IMPLEMENTATION_STATUS.md`.

Next CRM work: Contacts/Companies/Deals separation, tasks and reminders, team invitations, configurable pipelines, CSV import/export and persistent Goals. Email generation/delivery, WhatsApp sending, notifications, attachments and several older toolbar controls still need implementation. `legacy_version/` remains archived Python/Vite code and is not the active backend.
