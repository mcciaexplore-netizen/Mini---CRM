# ProMarketer assessment: path to a general MSME CRM

> Historical assessment from before implementation. The backend now targets Neon PostgreSQL; see IMPLEMENTATION_STATUS.md and README.md for current architecture, tests and setup.

**Scope and confidence.** This is a source-code review of the current Next.js app, its Supabase schema, and the older FastAPI/Vite version under `legacy_version`. There is no local `node_modules`, deployment configuration, test suite, or populated Supabase instance in this copy, so production behaviour and database migrations were not verified. Treat this as a product and engineering assessment, not a live-system audit.

## 1. What the project is today

ProMarketer is primarily a **marketing assistant with a basic lead pipeline**, rather than a complete CRM. The active app uses Next.js 14 and React 18 for the interface, Supabase Auth/Postgres for records, server routes for AI and integrations, and Google Calendar/Sheets integrations. The older Python/SQLite implementation is separate legacy code; it is not the backend used by the Next.js app. The README still contains the default Next.js text, so setup and deployment requirements are undocumented.

The intended flow is: a team member creates a lead in a space, moves it through six fixed sales stages, schedules follow-up or marketing content, and uses AI to draft campaigns, WhatsApp copy and other content. The dashboard reads campaigns, leads and scheduled posts. The schema has tables for profiles, business settings, spaces, leads, activities, campaigns, scheduled posts, goals and notifications (`supabase_schema.sql`). Lead board and list views use live Supabase reads; the board subscribes to lead changes (`src/app/leads/context.js`). Campaigns can be generated and saved to Supabase and optionally Sheets (`src/app/campaigns/page.js`, `src/app/api/campaigns/save/route.js`). The scheduler stores posts and can create Google Calendar events; it does **not** publish posts to social platforms.

**Current maturity:** useful UI and proof of concept, but **not ready to sell as a generalized multi-business CRM**. Its strongest assets are the polished lead views, a reasonable starting schema, and reusable AI drafting flows. The main gaps are tenant isolation, reliable core CRM workflows, and clear separation between working features and placeholders.

## 2. Key findings, in business terms

| Priority | Finding and evidence | Business impact |
|---|---|---|
| Critical | The schema has one company-wide `business_profile` and no organization ID on leads, campaigns or users. RLS grants every authenticated user full access to nearly every table (`supabase_schema.sql`, lines 37–48 and 216–290). The extra admin-only lead-delete policy does not override the permissive all-user delete policy. | Different MSME customers could see or alter one another's data if placed in one Supabase project. Roles shown in the UI are not enforced. |
| Critical | `/api/spaces` and `/api/profile` use the Supabase service-role key without checking a session or role (`src/app/api/spaces/route.js`; `src/app/api/profile/route.js`). `/api/generate` also reads company AI keys with that key (`src/app/api/generate/route.js`, around line 486). | Anonymous callers may read or change shared business data, create spaces, or consume AI credits. Fix before any public deployment. |
| High | The lead list expects `lead.value` and `lead.nextFollowUp`, while the database and create flow use `deal_value` and `next_followup` (`src/app/leads/views/ListView.jsx`, lines 190–194; `src/lib/db.js`). | A real lead can make the list crash when `value.toLocaleString()` runs. Follow-up dates also appear blank. |
| High | Database helpers generally discard Supabase errors and return only `data` (`src/lib/db.js`). The lead context reports success after operations that can return `null` (`src/app/leads/context.js`). | Users can be told a save/delete succeeded when it did not; data quality will suffer. |
| High | Lead detail fields have no save handlers, and notes/activity/files are sample UI (`src/app/leads/components/LeadDetailPanel.jsx`). Goals are local sample values despite a `goals` table (`src/app/leads/views/GoalsView.jsx`). The email builder returns fixed text after a timer (`src/app/email/page.js`). | The interface promises CRM capabilities that do not persist, making day-to-day use unreliable. |
| Medium | The schema uses `COUNT(*) + 1` for unique lead codes and defines `google_event_id` twice (`supabase_schema.sql`). App code references AI columns absent from this schema; no migrations are included. Google OAuth sends `state` but the callback does not validate it (`src/app/api/auth/google/*`). | Fresh setup or concurrent lead creation may fail; integration setup is hard to reproduce safely. |
| Medium | There are no automated tests, the README is boilerplate, and the app has no visible login flow or route guard. Search, list CSV export and notification controls are visual only (`src/components/layout/Navbar.jsx`; `src/app/leads/views/ListView.jsx`). | Regressions are hard to catch and new customers cannot be onboarded confidently. |

## 3. What a general MSME CRM should become

Keep the product simple: **one customer record and one clear next action for every sales opportunity**. Add an `organizations` table and membership/role table first. Every business-owned record must carry `organization_id`; enforce it in database RLS and server routes. Roles should be owner, manager and member, with explicit permissions. Store AI and Google tokens per organization or authorized user, encrypted or in a managed secret store. Remove public diagnostic routes in production.

Then make the core journey complete: **capture lead → qualify → assign owner → log contact → schedule task → close deal → retain customer**. Introduce separate Contacts and Companies so multiple people can belong to one customer; keep Deals/Pipelines distinct from contacts. Add persistent tasks, reminders, notes, attachments and activity history. Make lead stages configurable per pipeline, include lost reasons, expected close dates, product/service and deal amount. Ensure every edit saves, validates and gives honest error feedback. Add deduplication by phone/email and CSV import/export, which are high value for MSMEs moving from spreadsheets.

For India-oriented MSMEs, useful optional modules are WhatsApp click-to-chat and approved-template messaging, email integration, quotations/invoices or links to existing accounting tools, GST fields where relevant, local currency and time-zone support, consent tracking, and simple owner dashboards. These should be **modular**, since a service agency, retailer and distributor have different workflows. AI should assist with drafting and summarizing records only after the record workflow works; label generated content as draft and require user review before sending.

## 4. Suggested delivery order

1. **Stabilize and secure the foundation:** add authentication screens/guards; remove service-role access from unprotected routes; introduce organizations, membership and scoped RLS; migrate existing single-company data; fix schema drift, lead-code generation and list-field mismatch. This is the gate for any multi-customer pilot.
2. **Ship a dependable CRM core:** Contacts, Companies, Deals, Tasks and Activities with real create/edit/delete flows; dedupe, ownership, follow-up queues, audit history and CSV migration. Add integration tests for permissions and core journeys, plus a reproducible setup guide.
3. **Add MSME productivity features:** customizable pipelines, dashboards with conversion and overdue follow-ups, templates, reminders, email/WhatsApp integration and optional quotation/accounting connectors. Measure whether users complete follow-ups and recover leads, not just whether they generate AI content.

**Practical first release:** target one business type and 5–10 pilot MSMEs. Success means owners can import customers, assign work, see today's follow-ups, update a deal from phone or desktop, and trust that another business cannot access their records. Expand to a generalized product after those workflows are dependable.
