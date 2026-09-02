# Ticketing System — AI Continuation Context

## Purpose

This document contains the complete project context, current architecture, lessons learned, development preferences, and roadmap for the Ticketing System.

Use this as context for any AI coding agent that needs to continue development from the current state.

**Last updated:** 2026-09-02, after: attachments/media upload shipped end-to-end (submit form + live chat, image/video previews, R2 storage) in the days since the last update; a click-to-copy ticket ID (TicketCard's ticket list badge, and now also the confirmation-screen badge in TicketForm); a client-side "My Tickets" email filter in TicketList; and syncing uploaded attachments onto the ticket's Notion page as file blocks. Update this section's date whenever this file is revised.

---

# 1. Project Overview

**Project:** Ticketing System

**Description:** A full-stack customer support ticketing system built with React, TypeScript, Tailwind CSS, Cloudflare Workers, and Cloudflare D1, with two-way sync to a Notion database used as the team's internal ticket board.

**Current stage:** The core product is built and functional locally: ticket submission, persistence, a customer-facing ticket chat, an admin dashboard with token-based auth, a two-way Notion sync (App creates/updates Notion pages; Notion status/priority changes and comments sync back into the app), and SendGrid transactional emails (ticket received + ticket resolved). The project has **never been deployed to Cloudflare** — everything so far has run against local D1 and a local `wrangler dev` instance (tested live via a temporary `cloudflared` tunnel for Notion webhook delivery).

Remaining major items:

1. First production deployment (`wrangler deploy` + push secrets + re-point the Notion webhook subscription at the permanent URL).
2. **SendGrid domain authentication** — emails currently send successfully but show an "unverified sender" warning in Outlook/Gmail because only Single Sender Verification is set up, not full Domain Authentication (DKIM/SPF DNS records). See Section 12.
3. Real-time/notification support so an admin reply surfaces to the customer without them needing the tab open and polling (not yet built — approach not yet chosen; options discussed: browser Notifications API, in-page toast, or true Web Push).
4. Broader authentication (current admin auth is a single shared Bearer token + a hardcoded username allowlist, not per-user accounts). This also caps the new "My Tickets" filter (Section 10) — it's a `localStorage` convenience, not real identity.
5. Backfilling existing attachments to Notion — the new attachment sync (Section 11, Direction 4) only fires for uploads going forward; tickets that already had attachments before this shipped won't retroactively get them pushed to Notion.

---

# 2. Developer Preferences

The developer already knows React sufficiently.

## Important

- Do **not** teach basic React unless explicitly requested.
- Learn by building the actual application.
- Keep explanations practical and related to the current task.
- Give exact files and code changes.
- Give exact Windows commands when commands are needed (this project is developed on Windows; PowerShell and Git Bash are both in play — check which one is active before assuming syntax).
- Work incrementally, one logical change at a time.
- Test it. Verify it against the real running app/API, not just a type-check, before calling it done.
- Commit meaningful milestones to Git (only when explicitly asked to commit).
- Then continue.

## Do Not

- Do not recreate the project or restart the architecture.
- Do not replace Cloudflare Workers/D1 without a strong reason.
- Do not dump huge amounts of unrelated code.
- Do not assume something works without verification — this project has real Notion credentials/workspace (Section 11) and a real SendGrid account (Section 12) wired up; test against them directly rather than guessing.
- Do not jump several roadmap steps ahead when the developer is working on the current step.
- Do not add scope beyond what was asked (e.g. don't build a notification system, extra abstractions, or "nice to have" refactors unless requested).

---

# 3. Technology Stack

## Frontend
- React 19, TypeScript, Vite 8, Tailwind CSS v4 (`@tailwindcss/vite`)

## Backend
- Cloudflare Workers, TypeScript — **plain Workers, no framework** (no Hono). Routing is manual `pathname`/regex matching in `worker/index.ts`.

## Database
- Cloudflare D1 (SQLite-compatible)

## External integrations
- Notion API (raw `fetch`, **not** the `@notionhq/client` SDK — kept consistent with the rest of the codebase's style) for two-way ticket sync. See Section 11.
- SendGrid (raw `fetch` to the v3 REST API, **not** the `@sendgrid/mail` npm package — that package needs Node's `https` module, which doesn't exist in the Workers runtime, so raw `fetch` isn't just a style choice here, it's required) for transactional email. See Section 12.

## Deployment
- Cloudflare Workers + Wrangler 4. Uses `@cloudflare/vite-plugin`, so `npm run dev` runs Vite with an embedded Workers runtime; `npm run build` produces both the client assets and the Worker bundle under `dist/`.

## Version Control
- Git

---

# 4. Project Location

```text
F:\Ticketing Cloudflare system\ticketing-system
```

---

# 5. Actual Current Project Structure

```text
ticketing-system/
├── src/
│   ├── App.tsx                  — top-level view routing (submit/list/admin/chat), ticket count + unread badge
│   ├── App.css / index.css
│   ├── main.tsx
│   ├── hooks/
│   │   └── useTickets.ts        — fetches /api/tickets; fetches on mount for the whole customer view (NOT gated by active tab — see Section 13 bugfix)
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── TicketForm.tsx       — ticket submission form, derives priority from request type + impact; attachment picker; on success stores the submitter's email in localStorage (`submitter_email`) for the "My Tickets" filter, and shows a click-to-copy ticket ID badge on the confirmation screen
│   │   ├── TicketList.tsx       — customer's ticket list; status pills, search, pagination, and a "My Tickets" toggle (defaults ON) that filters to tickets matching the locally-saved `submitter_email`
│   │   ├── TicketCard.tsx       — one ticket row; click-to-copy ticket ID badge, reopen button
│   │   ├── TicketChat.tsx       — per-ticket chat UI (shared by customer view AND admin's chat view); attachment upload + inline image/video preview
│   │   └── AdminTable.tsx       — admin dashboard: login, ticket table, status/assignee editing
│   ├── constants/ticket.ts      — STATUS_THEME, STATUS_PILL_CONFIG, SLA_MAP, INITIAL_FORM
│   ├── constants/attachments.ts — ALLOWED_ATTACHMENT_TYPES, MAX_ATTACHMENT_SIZE, MAX_ATTACHMENTS_PER_TICKET, formatAttachmentSize()
│   ├── types/ticket.ts          — TicketRecord, FormState
│   └── utils/date.ts
│
├── worker/
│   ├── index.ts                 — entry point; manual route matching; fetch(request, env, ctx)
│   ├── types.ts                 — Env interface, request body types
│   ├── config/
│   │   ├── auth.ts               — AUTHORIZED_USERS allowlist, admin token check
│   │   └── notionMappings.ts     — Notion status/priority option-name <-> app value mapping
│   ├── routes/
│   │   ├── tickets.ts            — GET/POST /api/tickets (creates Notion page + sends confirmation email), GET /api/tickets/:ref, reopen
│   │   ├── admin.ts              — POST /api/admin/login, PATCH /api/tickets/:ref (protected; pushes to Notion + sends resolved email on transition to Resolved)
│   │   ├── messages.ts           — GET/POST /api/tickets/:ref/messages
│   │   ├── attachments.ts        — POST/GET /api/tickets/:ref/attachments (upload to R2 + insert a chat message; also pushes the file to the ticket's Notion page if it has one — see Section 11 Direction 4), GET /api/attachments/:id (streams from R2)
│   │   └── webhooks.ts           — POST /api/webhooks/notion (Notion -> App; also sends resolved email on Notion-driven transition to Resolved)
│   └── services/
│       ├── notion.ts             — all Notion HTTP calls: create page, update page, fetch page/comment/user, webhook signature verification, append attachment file block
│       └── sendgrid.ts           — sendTicketConfirmationEmail(), sendTicketResolvedEmail(), shared sendEmail() core
│
├── migrations/
│   ├── 0001_create_tickets.sql
│   ├── 0002_expanded_create_ticket.sql
│   ├── 0002_create_messages.sql
│   ├── 0003_add_admin_fields.sql
│   ├── 0003_add_lead_phone.sql
│   ├── 0004_add_notion_sync_fields.sql
│   ├── 0005_add_ticket_attachments.sql   — ticket_attachments table (metadata; files themselves live in R2)
│   └── 0006_link_attachments_to_messages.sql — ticket_messages.attachment_id, so an upload can render inline in chat
│
├── .dev.vars                     — local secrets (NOTION_API_KEY, NOTION_DATABASE_ID, NOTION_WEBHOOK_SECRET, SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, SENDGRID_FROM_NAME); gitignored. No .dev.vars.example (removed as redundant) -- .dev.vars itself is the reference for what vars exist.
├── package.json
├── vite.config.ts
├── wrangler.jsonc
├── worker-configuration.d.ts
└── tsconfig*.json
```

There is **no Hono, no KV, no Durable Objects, and no cron trigger** anywhere in this project. R2 (`ticket_attachments` binding) was added for attachment storage — see Section 11 Direction 4 and the migrations list above (0005/0006). Real-time-ish behavior (chat messages, ticket list unread badges) is done by **polling** (`TicketChat.tsx` polls `/api/tickets/:ref/messages` every 3 seconds), not WebSockets. If a future task asks for true real-time push, that would be new infrastructure, not something already half-built.

---

# 6. Wrangler Configuration

```jsonc
{
  "name": "ticketing-system",
  "main": "worker/index.ts",
  "compatibility_date": "2026-08-20",
  "assets": { "not_found_handling": "single-page-application" },
  "observability": { "enabled": true },
  "upload_source_maps": true,
  "d1_databases": [
    {
      "binding": "ticketing_db",
      "database_name": "ticketing-db",
      "database_id": "388cf420-533a-46cd-959f-a8a4b41413f2"
    }
  ],
  "r2_buckets": [
    {
      "binding": "ticket_attachments",
      "bucket_name": "ticket-attachments"
    }
  ]
}
```

Also sets `assets.run_worker_first: ["/api/*"]` so `/api/*` always hits the Worker instead of ever being served as a static asset.

No `vars` block — `NOTION_API_KEY`, `NOTION_DATABASE_ID`, `NOTION_WEBHOOK_SECRET`, `ADMIN_SECRET_TOKEN`, `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, and `SENDGRID_FROM_NAME` are all treated as **secrets**, not plain vars, in every environment. Locally they come from `.dev.vars`; in production they must be pushed individually with `wrangler secret put <NAME>` — **deploying does NOT read `.dev.vars`**.

**This Worker has never been deployed.** Running `wrangler deployments list` returns "This Worker does not exist on your account" as of the last check. First deploy will be `npm run build && wrangler deploy`, immediately followed by pushing all seven secrets above.

---

# 7. Local D1 vs Remote D1

Same as before — use `--local` for all day-to-day development, `--remote` only when intentionally touching the real Cloudflare D1. Local D1 storage lives under `.wrangler\state\v3\d1` — never edit it directly, always go through `wrangler d1 execute` / `migrations apply`.

```cmd
npx wrangler d1 migrations apply ticketing-db --local
npx wrangler d1 execute ticketing-db --local --command="SELECT * FROM tickets ORDER BY id DESC;"
```

---

# 8. Current Database Schema

## `tickets`

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | |
| ticket_ref | TEXT | e.g. `TK-1234`; the human-facing ID used in URLs and Notion |
| name, email, subject, request_type | TEXT | required at submission |
| priority | TEXT | `Urgent` \| `High` \| `Medium` \| `Low`, default `Medium` |
| status | TEXT | default `OPEN` on create; admin/Notion transitions use the six-value set in `STATUS_OPTIONS` (`Not Started`, `Initial Response`, `In Progress`, `Waiting on Client`, `Completed by Dev`, `Resolved`) — see Section 11 for how `OPEN` and `Not Started` relate |
| description, main_description, expected_behavior, impact | TEXT | |
| callback_phone, lead_phone | TEXT | |
| platform_area, workspace_kind, workspace_name, workspace_use, needed_by, campaign_name, campaign_goal, go_live_date, timeframe | TEXT | form-specific fields, all nullable |
| assignee | TEXT | default `Unassigned` |
| **notion_page_id** | TEXT | added in migration 0004; links this row to its Notion page. Indexed. |
| created_at, updated_at | TEXT | |

## `ticket_messages`

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | |
| ticket_ref | TEXT | |
| sender_name | TEXT | |
| sender_role | TEXT | `'user' \| 'agent' \| 'system'` — **`agent` can only be set server-side by a verified admin token**, never trusted from the client (see Section 13) |
| message | TEXT | |
| **notion_comment_id** | TEXT, UNIQUE where not null | added in migration 0004; dedupes retried Notion `comment.created` webhook deliveries |
| **attachment_id** | INTEGER, references `ticket_attachments(id)` | added in migration 0006; set when the message is really a file upload, so the chat UI can render an inline preview/download instead of plain text |
| created_at | TEXT | |

## `ticket_attachments`

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | |
| ticket_ref | TEXT | |
| r2_key | TEXT | key of the actual file in the `ticket_attachments` R2 bucket, formatted `{ticketRef}/{uuid}-{sanitizedFileName}` |
| file_name, content_type, size_bytes | | original filename/type/size as uploaded |
| created_at | TEXT | |

Added in migration 0005. The file bytes themselves live in R2, not D1 — this table is metadata only. Served back out via `GET /api/attachments/:id`, which streams straight from R2 (public, no auth).

Never modify an already-applied migration. Add a new `migrations/000N_description.sql` for schema changes.

---

# 9. API Surface (current, not planned)

```text
POST   /api/admin/login              — { username } -> { token } if in AUTHORIZED_USERS allowlist
GET    /api/tickets                  — all tickets, with agent-message aggregates for the unread badge
POST   /api/tickets                  — create ticket; also creates the Notion page (stores notion_page_id) and sends the SendGrid "ticket received" confirmation email
GET    /api/tickets/:ref             — single ticket (matches ticket_ref OR numeric id)
PATCH  /api/tickets/:ref             — admin-only (Bearer token); updates status/assignee/priority in D1, pushes status/priority to the linked Notion page, and sends the SendGrid "ticket resolved" email if status transitions to Resolved
POST   /api/tickets/:ref/reopen      — public; sets status back to 'In Progress'
GET    /api/tickets/:ref/messages    — chat history
POST   /api/tickets/:ref/messages    — send a chat message; sender_role is derived from admin auth, not the request body
GET    /api/tickets/:ref/attachments — list attachment metadata for a ticket
POST   /api/tickets/:ref/attachments — upload a file (multipart/form-data: `file`, `senderName`); stores it in R2, inserts a `ticket_attachments` row + a matching `ticket_messages` row so it shows in chat, and (fire-and-forget) appends it as a file block on the ticket's Notion page if `notion_page_id` is set
GET    /api/attachments/:id          — streams the file from R2 (public, no auth — this is what Notion's file block fetches, so it must stay reachable)
POST   /api/webhooks/notion          — Notion -> App webhook receiver (see Section 11)
```

Admin auth is a single shared secret: `Authorization: Bearer <ADMIN_SECRET_TOKEN>` (falls back to the hardcoded `super_secret_admin_token_123` in `worker/config/auth.ts` if the env var isn't set — **only acceptable for local dev, must be set as a real secret before production**). Login just checks the username against a hardcoded list (`AUTHORIZED_USERS` in the same file) and hands back that shared token — there is no per-user password or session, so don't describe this as "real" authentication if asked to reason about security posture.

---

# 10. Admin Dashboard, Ticket Details & Chat — already built

`AdminTable.tsx` (login screen + ticket table with status/assignee inline editing, search, status-filter tabs with counts) and `TicketChat.tsx` (shared chat UI, opened both from the customer's ticket link `/ticket/:ref` and from the admin table's "open chat" action) are both implemented, not planned. `App.tsx` does simple pathname-based view routing (`/admin`, `/ticket/:ref`, or the default submit/list view) with `window.history.pushState`, no router library.

Known characteristics worth knowing before changing this area:
- Chat polls every 3 seconds (`setInterval` in `TicketChat.tsx`) — no WebSockets/SSE.
- `TicketChat` determines agent-vs-user purely from `localStorage.getItem('admin_token')` in the current browser — see Section 13 for why the role can't be spoofed even though this client-side check exists.
- The unread-message badge and "My Tickets" count in `App.tsx` are both derived from the same `tickets` array populated by `useTickets` — see Section 13 for a bug that used to make both show `0` incorrectly.

**"My Tickets" filter (client-side, no auth):** `GET /api/tickets` has no per-user scoping server-side — it always returns every ticket. Since there's no login system, `TicketList.tsx` fakes a "mine" scope entirely in the browser: `TicketForm.tsx` writes `localStorage.setItem('submitter_email', ...)` (lowercased/trimmed) right after a successful submission, and `TicketList.tsx` reads that key and filters `tickets` down to matching `email` when the "My Tickets" toggle (defaults ON) is active. This is per-browser convenience, not real identity/security — clearing site data or switching browsers loses the "mine" association, and it's trivially not a security boundary (anyone can still hit `GET /api/tickets` directly and see everything). If real per-user auth is ever added (Section 1, item 4), this should be replaced with a server-side filter.

**Click-to-copy ticket ID:** both `TicketCard.tsx` (the ticket list badge) and `TicketForm.tsx` (the post-submit confirmation badge) turn the ticket ref into a `<button>` that calls `navigator.clipboard.writeText()` and shows a transient "Copied" state (~1.5s) via local component state. No shared component — implemented twice with the same pattern since they're visually distinct.

---

# 11. Notion Integration (two-way sync) — major feature, read this before touching it

## Direction 1: App -> Notion (ticket creation)

`worker/services/notion.ts` → `syncTicketToNotion()`. Raw `fetch` (not the SDK) to `POST https://api.notion.com/v1/pages`, called from `handleCreateTicket` in `worker/routes/tickets.ts` right after the D1 insert. The returned page id is stored back into `tickets.notion_page_id` — **this link is what makes the reverse direction possible; if it's ever missing/null for a ticket, none of the sync below applies to it.**

Property mapping on create: `Name` (title) = subject, `Priority` (select) = `ticket.priority` verbatim, `Status` (status) = hardcoded `"Not started"`, `Category` (select) = request_type, `Text` (rich_text) = `[TICKET_REF]`, `Submitted By` (email).

## Direction 2: App -> Notion (admin edits)

`worker/services/notion.ts` → `updateNotionPage()`, called from `handleAdminUpdateTicket` in `worker/routes/admin.ts` after the D1 write. PATCHes the Notion page's `Status`/`Priority` properties to match whatever was just set in D1.

**Important Notion API quirk:** Notion's `status`-type property (unlike `select`) does **not** auto-create missing options via the API — if you push a status string that isn't already a configured option in the live Notion database, the PATCH fails (logged, not surfaced to the UI), and D1/Notion can drift until an unrelated Notion-side edit reconciles it. All six app status values were confirmed to already exist as options in the live "Chau Ticketing Dasboard" integration's database as of this writing. If a new status value is ever added to `STATUS_OPTIONS` in `AdminTable.tsx`, a matching option must be added in Notion too.

## Direction 3: Notion -> App (webhooks)

`worker/routes/webhooks.ts` → `handleNotionWebhook()`, mounted at `POST /api/webhooks/notion` in `worker/index.ts`. This is **webhook-driven, not polling** — near-instant in practice (a few seconds), though Notion aggregates/batches `page.properties_updated` events over a short window if several property edits happen back-to-back.

Handles two event types:
- `page.properties_updated` → re-fetches the full page via `GET /v1/pages/{id}`, maps Notion's `Status`/`Priority` option names back to app values via `worker/config/notionMappings.ts`, and only writes to D1 (+ inserts a `system` timeline message) if the mapped value actually differs from the current D1 value. **This diff-before-write behavior is also the loop-prevention mechanism for Direction 2** — when App->Notion push (Direction 2) causes Notion to echo the same value back via this webhook, the values already match, so nothing happens. No explicit "last synced by us" flag was needed; this was verified live.
- `comment.created` → looks up the ticket by `notion_page_id`, fetches the comment via `GET /v1/comments?block_id={page_id}`, resolves the commenter's name via `GET /v1/users/{id}`, and inserts a `ticket_messages` row with `sender_role='agent'` and `notion_comment_id` set (unique index prevents duplicate inserts if Notion retries delivery).

Unhandled event types (`page.created`, `page.content_updated`, etc.) are logged and ignored — this is expected, not a bug.

## Direction 4: App -> Notion (attachment sync)

`worker/services/notion.ts` → `appendAttachmentToNotion(pageId, { url, name }, env)`, called from `handleUploadAttachment` in `worker/routes/attachments.ts` right after the attachment is saved to R2/D1 and its chat message inserted. `PATCH`es `https://api.notion.com/v1/blocks/{pageId}/children`, appending a `file` block with `type: "external"` pointing at `{origin}/api/attachments/{attachmentId}` — the same public URL the app itself uses to serve the file, so Notion just fetches it directly rather than the file being re-uploaded to Notion's own storage.

- Only runs if the ticket already has a `notion_page_id` (i.e. its Notion page was created successfully — see Direction 1). If Notion sync failed or was skipped at ticket-creation time, attachments for that ticket are just never pushed; this is not separately retried.
- Fire-and-forget via `ctx.waitUntil(...)` — same philosophy as the SendGrid emails (Section 12): a failed push is logged, never blocks the upload response the browser is waiting on. `handleUploadAttachment`'s signature grew a `ctx: ExecutionContext` parameter for this; `worker/index.ts` was updated to pass it through.
- **No backfill.** This only fires on new uploads going forward. Attachments already in R2/D1 from before this shipped will not retroactively appear on their tickets' Notion pages.
- Depends on `/api/attachments/:id` staying a public, unauthenticated endpoint — that's what Notion's servers fetch to render the file block. If auth is ever added to that route, this integration breaks silently (Notion will just show a broken file block, nothing calls out the failure to the app).

**Security:** every webhook request (except the one-time verification handshake) must carry a valid `X-Notion-Signature: sha256=<hex>` header — HMAC-SHA256 of the raw request body, keyed by `NOTION_WEBHOOK_SECRET`, verified with a constant-time comparison in `verifyNotionSignature()`. The raw body is read once and reused for both signature verification and JSON parsing — don't refactor this to parse-then-reserialize, that breaks the signature check.

## Setting up (or re-pointing) the webhook subscription

This must be redone any time the webhook URL changes (first deploy, custom domain change, etc.):

1. Deploy/get the new public URL.
2. `wrangler secret put NOTION_API_KEY` / `NOTION_DATABASE_ID` (deploy doesn't read `.dev.vars`).
3. In Notion: **notion.so/my-integrations → "Chau Ticketing Dasboard" (workspace: "Channel Automation") → Webhooks tab** → create/edit the subscription URL to `https://<domain>/api/webhooks/notion`.
4. Watch for the one-time verification POST — locally via the `wrangler dev` log, in production via `wrangler tail`. It logs a line: `Notion webhook verification token: secret_...`.
5. Paste that token into Notion's verify field to confirm the subscription.
6. `wrangler secret put NOTION_WEBHOOK_SECRET` with that exact token.
7. Confirm event types `page.properties_updated` and `comment.created` are checked.
8. **Confirm the integration's Capabilities tab has "Read comments" enabled** — this is a separate toggle from "Read content" and was the cause of a real bug during testing: comments synced with zero errors and zero log output because Notion silently never emitted the `comment.created` event at all until this was turned on. If comment sync mysteriously does nothing, check this first.

## Local testing pattern used

Local dev can't receive real Notion webhooks (Notion requires a public HTTPS URL). The pattern that worked: run `wrangler dev --port 8787`, then a Cloudflare quick tunnel (`cloudflared tunnel --url http://localhost:8787`, installed via `winget install --id Cloudflare.cloudflared` since it wasn't present), register the resulting `https://<random>.trycloudflare.com/api/webhooks/notion` URL in Notion, and do the verification handshake against that. The quick-tunnel URL is random and temporary — fine for one testing session, not for anything persistent.

**Known local-dev gotcha:** starting `wrangler dev --port 8787` more than once without fully killing the previous instance leaves multiple `workerd.exe` processes all bound to (or attempting to bind) the same port on Windows, which manifests as requests silently hanging forever rather than a clean "port in use" error. If local requests start hanging with no server-side log line at all, check `Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'workerd' }` for duplicates and kill the stray trees (`taskkill /PID <id> /F /T`) rather than assuming the webhook code is broken. `wrangler dev` also occasionally throws an unrelated internal `ProxyController` crash with an empty error message after a long session — this is a dev-tooling quirk, not application code; just restart it.

---

# 12. SendGrid Email Integration

Two transactional emails, both fire-and-forget (a failed send is logged but never blocks the ticket API response, same philosophy as the Notion sync):

1. **Ticket received** — `sendTicketConfirmationEmail()` in `worker/services/sendgrid.ts`, called from `handleCreateTicket` in `worker/routes/tickets.ts` right after the ticket is inserted (alongside the Notion page creation).
2. **Ticket resolved** — `sendTicketResolvedEmail()`, same file. Called from **two** places, one per direction a ticket can become Resolved:
   - `handleAdminUpdateTicket` in `worker/routes/admin.ts` (admin marks it Resolved).
   - `handlePagePropertiesUpdated` in `worker/routes/webhooks.ts` (Notion-driven status change to Resolved).

Both call sites guard against re-sending on every save: `admin.ts` `SELECT`s the ticket's status *before* the `UPDATE` and only sends if `previousStatus !== "Resolved" && status === "Resolved"`; `webhooks.ts` reuses its existing `statusChanged` diff-before-write check. This was verified live — resolving a ticket, then re-PATCHing the same "Resolved" status, correctly sent the email exactly once.

Both emails share a `sendEmail()` core helper and a `wrapEmailHtml()` template wrapper in `sendgrid.ts` to avoid duplicating the SendGrid request-building logic. All user-controlled fields (name, subject, ticket ref) are HTML-escaped before going into the email body — ticket ref in particular can be client-supplied (`body.ticketRef` in `handleCreateTicket`), so it's also `encodeURIComponent`-ed when building the ticket URL link, not just escaped in the visible text.

**Ticket URL construction:** built as `` `${new URL(request.url).origin}/ticket/${encodeURIComponent(ticketRef)}` ``. In `tickets.ts` and `admin.ts` the origin comes from the actual incoming request. In `webhooks.ts` (where the "request" is Notion calling our webhook, not a user) the origin is still correct because it's derived from the same public URL Notion is hitting, which is the same domain the app itself is served from — so no separate `APP_BASE_URL` config var was needed; this was a deliberate choice over adding one more env var to keep in sync.

**Environment:** `SENDGRID_API_KEY` (required, no default), `SENDGRID_FROM_EMAIL` (defaults to `support@channelautomation.com` in code), `SENDGRID_FROM_NAME` (defaults to `Channel Automation Support` in code). All three currently live in `.dev.vars` locally with a real API key.

**Known issue — sender not fully authenticated.** SendGrid sends succeed (confirmed live for both email types, both landed in the inbox), but Outlook shows "We can't verify that this email came from the sender" on the received emails. This means SendGrid only has **Single Sender Verification** for `support@channelautomation.com` (proves ownership of that one mailbox) rather than full **Domain Authentication** (DKIM/SPF CNAME records added to `channelautomation.com`'s DNS, letting SendGrid cryptographically sign outgoing mail). This is **not a code issue** — nothing in the Worker needs to change. Fix is entirely in SendGrid's dashboard: **Settings → Sender Authentication → Authenticate Your Domain**, add the ~3 generated CNAME records to `channelautomation.com`'s DNS, then verify. Whoever manages that domain's DNS (Cloudflare DNS, registrar, etc.) needs to do this — not yet done as of this writing.

---

# 13. Bugs Found and Fixed This Session (context for future changes)

1. **Chat role could be spoofed.** `TicketChat.tsx` used to have a client-side "Dev Role Toggle" letting anyone viewing a ticket link flip themselves to display as "Agent", and the backend (`worker/routes/messages.ts`) trusted whatever `senderRole` the client sent in the POST body — exploitable directly via API too, not just the UI. Fixed: the toggle is removed; the frontend now derives agent-vs-user purely from whether `admin_token` exists in `localStorage`, and — the actual security fix — the backend now **always** derives `sender_role` from `verifyAdminToken(request, env)` server-side and ignores whatever the client claims.
2. **"My Tickets" count and the unread-notification badge showed 0 on first load/refresh.** `useTickets.ts` only fetched `/api/tickets` when `activeTab === 'list'`, but the app defaults to the `'submit'` tab. Fixed by fetching once whenever the non-admin view is active, regardless of which tab is selected.
3. **"(synced from Notion)" wording removed from timeline messages** per feedback — Notion-driven status/priority changes now read identically to admin-driven ones (`"Status changed to X"`), no source annotation.

**Note:** items 1-3 above predate 2026-08-29. Since then (through 2026-09-02): attachments/media upload shipped in full (not a bugfix, a new feature — see Section 11 Direction 4 and the attachment rows in Sections 5/8/9), plus the click-to-copy ticket ID and "My Tickets" filter described in Section 10.

---

# 14. Design System (current, not the original placeholder palette)

The original palette in early planning (`#2D3748`, `#63B3ED`, `#90CDF4`, `#F6AD55`) was superseded by a dark, slate/blue support-console aesthetic across `AdminTable.tsx` and `TicketChat.tsx` (see the "color Theme Updated and Unified" commit). Representative tokens actually in use:

```text
Backgrounds:  #080b10 (page), #0c1017 (panels), #111827 / #161f2e (cards, inputs)
Borders:      #1f2937, #2d3a4e
Text:         #e5e7eb (primary), #9ca3af / #6b7280 (muted)
Accent blue:  #2563eb / #60a5fa   — primary actions, "user" role
Accent amber: #f59e0b / #fbbf24  — "agent" role, priority badges
Status colors: see STATUS_THEME / STATUS_PILL_CONFIG in src/constants/ticket.ts and src/components/AdminTable.tsx (six distinct colors, one per status)
```

Match this palette for any new UI rather than the old planning-doc colors.

---

# 15. Development Commands

```cmd
npm run dev          — Vite dev server w/ embedded Workers runtime (the normal way to develop)
npm run build         — tsc -b && vite build (also produces the deployable dist/ticketing_system worker bundle)
npm run lint
npm run deploy        — npm run build && wrangler deploy
npm run cf-typegen    — regenerate worker-configuration.d.ts after changing wrangler.jsonc bindings
```

Standalone `wrangler dev --port <n>` also works and is what was used for isolated webhook testing (see Section 11) — but prefer `npm run dev` for normal frontend+backend iteration since it hot-reloads properly; the standalone path requires an explicit `npm run build` before changes are picked up.

---

# 16. Git Workflow

Only commit when explicitly asked. When asked:

```cmd
git status
git add <changed files>
git commit -m "Clear, specific description"
git status
```

Don't rely on any specific commit hash or historical commit list in this doc — check `git log` for real, current history instead of trusting stale notes here.

---

# 17. Current Status Checklist

```text
[✓] React app, TypeScript, Vite, Tailwind, Cloudflare Worker — all set up
[✓] D1 created, migrated (0001-0004), bound
[✓] Ticket submission form (TicketForm.tsx)
[✓] POST /api/tickets persists to D1
[✓] GET /api/tickets, GET /api/tickets/:ref
[✓] PATCH /api/tickets/:ref (admin, protected)
[✓] POST /api/tickets/:ref/reopen
[✓] Ticket messages table + GET/POST /api/tickets/:ref/messages
[✓] Admin dashboard (AdminTable.tsx) with login, table, filters, inline status/assignee edit
[✓] Customer + admin chat UI (TicketChat.tsx), polling-based
[✓] Chat role security fix (server-side enforced agent role)
[✓] Ticket count / unread badge fix
[✓] Notion sync: App -> Notion on ticket create
[✓] Notion sync: App -> Notion on admin status/priority edit
[✓] Notion sync: Notion -> App via webhooks (status, priority, comments)
[✓] Notion webhook signature verification
[✓] Local webhook testing via cloudflared tunnel — verified live end-to-end
[✓] SendGrid "ticket received" confirmation email — verified live, lands in inbox
[✓] SendGrid "ticket resolved" email — verified live from both admin-panel and Notion-driven resolve paths, fires exactly once per transition
[✓] Attachments — upload from both the submit form and live chat, R2 storage, inline image/video previews in chat, download links elsewhere
[✓] Click-to-copy ticket ID (TicketCard list badge + TicketForm confirmation badge)
[✓] "My Tickets" filter in TicketList (client-side, localStorage-based — see Section 10 for the "not real auth" caveat)
[✓] Notion sync: uploaded attachments appended as file blocks on the ticket's Notion page (Section 11 Direction 4; forward-only, no backfill)
[ ] Search / filtering polish beyond what's in TicketList today (status pills, text search, pagination already exist)

[ ] First production deployment
[ ] Production secrets pushed (NOTION_API_KEY, NOTION_DATABASE_ID, NOTION_WEBHOOK_SECRET, ADMIN_SECRET_TOKEN, SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, SENDGRID_FROM_NAME)
[ ] Production Notion webhook subscription pointed at the permanent URL
[ ] SendGrid domain authentication (DKIM/SPF DNS records) — emails currently work but show as unverified sender (see Section 12)
[ ] Notification when admin replies (approach not yet chosen — see Section 1)
[ ] Real per-user authentication (current: one shared admin token; also what the "My Tickets" filter is standing in for)
[ ] Backfill attachments uploaded before Notion sync (Direction 4) shipped
[ ] DELETE /api/tickets/:id (never built; unclear if actually needed for this product)
```
