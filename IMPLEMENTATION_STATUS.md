# Implementation status — Neon backend
Date: 18 September 2026

## Result

The active Next.js backend has been migrated locally to Neon-compatible PostgreSQL. Supabase runtime dependencies, browser queries, authentication and subscriptions have been replaced. No live Neon database, existing customer data or external integration account was changed: this workspace has no configured database credentials.

This completes the local backend migration of the implemented CRM foundation. It does not complete the entire general CRM roadmap.

## Implemented

- Better Auth email/password sign-up, sign-in, database sessions and sign-out; profile creation on signup. Optional verification/reset email delivery via Resend.
- Authenticated server layouts plus independently authorized API handlers. Middleware provides early redirects only.
- Parameterized PostgreSQL CRUD for profiles, spaces, leads, activities, notifications, campaigns and scheduled posts.
- Business-scoped RLS with owner/manager/member/viewer roles; composite foreign keys reject cross-business relationships. User identity and restricted SQL role are transaction-local.
- Protected provider keys, account records and private logos. Stored keys are omitted from browser responses. Database credentials stay server-only.
- Lead edits, assignees, follow-up dates and notes persist. Stage changes create activity history. Sequence-based lead numbers remain unique after deletion.
- Google OAuth and Calendar routes now persist through PostgreSQL. Saved event IDs are protected from client writes. Disconnect clears tokens but retains account identity and links.
- Small logo uploads use authenticated PostgreSQL storage, with signature checks and a streamed 512 KB file limit.
- Dashboard and lead refreshes replace Supabase subscriptions with visible-tab polling and focus refresh.
- Transactional, versioned migration runner with checksums, Neon environment template and setup instructions. Historical Supabase SQL is archived.

## Validation

| Check | Result |
|---|---|
| `npm test` | 20 tests pass, including embedded PostgreSQL migration/RLS checks and actual Better Auth handler tests. |
| Auth controls | Sign-up/profile creation, hashed password storage, invalid password rejection, valid session lookup, forged cookie rejection and session revocation pass. |
| CRM controls | Onboarding, lead edits/history, sequence numbering, tenant boundaries, role restrictions, private-table access and transaction identity cleanup pass. |
| `npm run lint`; `npm run build` | Pass. One Settings image-optimization warning and non-blocking cache/Browserslist notices remain. |
| `npm run smoke:auth` | Pass: 21 protected endpoints reject anonymous access; middleware-bypass and cross-origin checks pass; pages redirect to login. With a dummy offline database, API session verification returns 503 and the protected layout fails closed. |
| Live Neon / Google / email / full browser journeys | Not run: database and integration credentials are absent. |

The PostgreSQL harness runs the checked-in Neon SQL; it does not simulate Neon's network layer or connection pooler. Simultaneous multi-connection production load has not been tested. Existing Supabase accounts/data require a separate, verified transfer before any production switch.

## Next setup

Populate `.env.local` with Neon `DATABASE_URL`, a random `BETTER_AUTH_SECRET`, and matching application URLs. Run `npm run db:migrate`, then `npm run dev`. Use a fresh staging database first. The README includes deployment, membership and data-transfer instructions.

## Remaining product work

Contacts/Companies/Deals separation; tasks and reminders; team invitations; configurable stages; CSV import/export; persistent Goals; message delivery; attachments; notification workflows; mobile usability; credential encryption/rotation; integration retries and backups. Some existing screens still contain prototype controls.
