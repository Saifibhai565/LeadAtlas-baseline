# File map

Every file in the project and what it contains. Generated from the code, so it stays accurate.

Total files: 350

## Project root

| File | What it contains |
|---|---|
| `.dockerignore` | Files left out of the Docker image. |
| `.env.example` | Every environment variable with a comment. Copy to .env and fill in. |
| `.gitignore` | Files never uploaded to Git (.env, database, node_modules, build output). |
| `CHANGES.md` | Log of every change: who, which files, database changed or not. |
| `DEPLOY.md` | Step-by-step server setup with Docker, domain, SSL, backups (Roman Urdu). |
| `Dockerfile` | Builds the production app image (build stage + small run stage, runs prisma db push then the server). |
| `FILE_MAP.md` | This file: every file and what it contains. |
| `PROJECT_GUIDE.md` | Architecture, rules and feature map for developers and AI assistants. Read first. |
| `README.md` | What each phase added, and how to install, run and update (Roman Urdu). |
| `next.config.mjs` | Next.js settings: standalone build for Docker, security headers. |
| `package.json` | Dependencies (pinned versions) and npm scripts: dev, build, start, typecheck, db:push, db:studio. |
| `postcss.config.mjs` | PostCSS plugins for Tailwind. |
| `tailwind.config.ts` | Tailwind colours mapped to the CSS variables (night, surface, raised, line, ink, muted, pin, ok, info, danger) and radii. |
| `tsconfig.json` | TypeScript settings (strict) and the @/* import alias for src/*. |

## Database

| File | What it contains |
|---|---|
| `prisma/schema.prisma` | Database models (User, Lead, Job, Plan, Payment, Campaign, Site, ... 34 models). Run `npx prisma db push` after changes. |

## Deployment

| File | What it contains |
|---|---|
| `deploy/.env.example` | Server environment variables. |
| `deploy/Caddyfile` | HTTPS for the main domain, www redirect, on-demand SSL for agency and client domains. |
| `deploy/docker-compose.yml` | Production stack: app, Go engine, Caddy (HTTPS), cron, daily backup. |

## Chrome extension

| File | What it contains |
|---|---|
| `extension/icon128.png` | Image (app icon). |
| `extension/icon16.png` | Image (app icon). |
| `extension/icon48.png` | Image (app icon). |
| `extension/manifest.json` | Chrome extension definition (Manifest V3). |
| `extension/popup.css` | Extension popup styles. |
| `extension/popup.html` | Extension popup layout: connect screen and save-lead form. |
| `extension/popup.js` | Reads the business from Google Maps, LinkedIn/Facebook company pages or any site and saves it via /api/v1/leads. |

## Public files

| File | What it contains |
|---|---|
| `public/apple-touch-icon.png` | Image (app icon). |
| `public/icon-192.png` | Image (app icon). |
| `public/icon-512.png` | Image (app icon). |
| `public/icon-maskable-512.png` | Image (app icon). |
| `public/robots.txt` | Search engine rules (keeps /api and private reports out). |
| `public/sw.js` | Minimal service worker so the app can be installed (PWA). |

## App core (src)

| File | What it contains |
|---|---|
| `src/instrumentation.ts` | Saves every unhandled server error to Super Admin > Errors. |
| `src/middleware.ts` | Runs before pages: sends signed-out people to login, remembers ?ref= referral codes, passes the page path to the layout. |

## Pages and layouts (src/app)

| File | What it contains |
|---|---|
| `src/app/global-error.tsx` | Last-resort error screen; reports the crash. |
| `src/app/globals.css` | Colour variables for light and dark themes, base styles, and all animations (dashboard radar, website live scan). |
| `src/app/layout.tsx` | Root layout: fonts, theme, brand colour, SEO metadata, favicon, toasts, error reporter. |
| `src/app/manifest.ts` | Installable-app manifest (name and icons from settings). |
| `src/app/not-found.tsx` | 404 page. |
| `src/app/page.tsx` | Public website (home page): header, live-scan hero, lead anatomy, how it works, features, pricing, FAQ, closing call to action. Text comes from Super Admin > Website. |
| `src/app/(app)/error.tsx` | Friendly error screen inside the app; reports the crash. |
| `src/app/(app)/layout.tsx` | Signed-in shell: sidebar and top bar, and blocks pages that are off for the person's plan. |
| `src/app/(app)/admin/page.tsx` | Page /admin (Super Admin). Uses AdminView. |
| `src/app/(app)/billing/page.tsx` | Page /billing (Billing). Uses BillingView. |
| `src/app/(app)/bulk-email/page.tsx` | Page /bulk-email (Bulk email). Uses BulkEmailView. |
| `src/app/(app)/campaigns/page.tsx` | Page /campaigns (Campaigns). Uses CampaignsView. |
| `src/app/(app)/campaigns/[id]/page.tsx` | Page /campaigns/[id] (Campaign). Uses CampaignRunner. |
| `src/app/(app)/dashboard/page.tsx` | Page /dashboard (Dashboard). Mix categories so the list isn't six of the same kind |
| `src/app/(app)/developers/page.tsx` | Page /developers (API and extension). Uses DevelopersView. |
| `src/app/(app)/enrich/page.tsx` | Page /enrich (Website checks). Uses EnrichView. |
| `src/app/(app)/extract/page.tsx` | Page /extract (Web extractor). Uses ExtractView. |
| `src/app/(app)/help/page.tsx` | Page /help (Help center). Uses HelpCenter. |
| `src/app/(app)/inbox/page.tsx` | Page /inbox (WhatsApp inbox). Uses InboxView. |
| `src/app/(app)/leads/page.tsx` | Page /leads (Leads). Uses LeadsView. |
| `src/app/(app)/outreach/page.tsx` | Page /outreach (Email outreach). Uses OutreachView. |
| `src/app/(app)/pipeline/page.tsx` | Page /pipeline (Pipeline). |
| `src/app/(app)/rank/page.tsx` | Page /rank (Rank tracker). Uses RankView. |
| `src/app/(app)/searches/page.tsx` | Page /searches (Searches). Uses SearchesView. |
| `src/app/(app)/settings/page.tsx` | Page /settings (Settings). Uses SettingsView. |
| `src/app/(app)/sites/page.tsx` | Page /sites (Websites). Uses SitesView. |
| `src/app/(app)/team/page.tsx` | Page /team (Team). Uses TeamView. |
| `src/app/(app)/templates/page.tsx` | Page /templates (Templates). Uses TemplatesView. |
| `src/app/(app)/watches/page.tsx` | Page /watches (Watches). Uses WatchesView. |
| `src/app/(auth)/layout.tsx` | Two-column layout for sign-in pages with the contour map. |
| `src/app/(auth)/forgot/page.tsx` | Page /forgot (Forgot password). |
| `src/app/(auth)/login/page.tsx` | Page /login (Sign in). |
| `src/app/(auth)/register/page.tsx` | Page /register (Create account). |
| `src/app/(auth)/reset/page.tsx` | Page /reset (Choose a new password). |
| `src/app/brand/[asset]/route.ts` | GET /brand/[asset]. Serves the logo, favicon and share image the Super Admin uploaded (stored as data URLs). |
| `src/app/d/[token]/page.tsx` | Page /d/[token] (Website demo). |
| `src/app/invite/[token]/page.tsx` | Page /invite/[token] (Join your team). |
| `src/app/invoice/[id]/page.tsx` | Page /invoice/[id] (Invoice). |
| `src/app/p/[token]/page.tsx` | Page /p/[token] (Proposal). |
| `src/app/privacy/page.tsx` | Page /privacy (Privacy policy). |
| `src/app/r/[token]/page.tsx` | Page /r/[token] (No website). |
| `src/app/review/[token]/page.tsx` | Page /review/[token] (Leave a review). Google's direct "write a review" link needs the Place ID (they start with ChIJ) |
| `src/app/s/[slug]/route.ts` | GET /s/[slug]. Serves a published website. Scripts are blocked by the security policy. |
| `src/app/terms/page.tsx` | Page /terms (Terms of service). |
| `src/app/u/[token]/page.tsx` | Page /u/[token] (Unsubscribe). |
| `src/app/verify/page.tsx` | Page /verify (Confirm email). |

## API routes (src/app/api)

| File | What it contains |
|---|---|
| `src/app/api/account/route.ts` | DELETE /api/account. DELETE { password } — deletes the account for good. |
| `src/app/api/account/export/route.ts` | GET /api/account/export. Downloads everything stored for this account as JSON. Owners get the whole workspace. |
| `src/app/api/admin/audit/route.ts` | GET /api/admin/audit. |
| `src/app/api/admin/backup/route.ts` | GET /api/admin/backup. Downloads a consistent copy of the whole database (admin only). |
| `src/app/api/admin/coupons/route.ts` | GET POST /api/admin/coupons. POST { code, percent?, amount?, planId?, maxUses?, expiresAt? } |
| `src/app/api/admin/coupons/[id]/route.ts` | DELETE PATCH /api/admin/coupons/[id]. |
| `src/app/api/admin/diagnostics/route.ts` | GET /api/admin/diagnostics. One-click self-test of every part of the system, with what to do when something fails. |
| `src/app/api/admin/errors/route.ts` | DELETE GET POST /api/admin/errors. POST { id?, all?: true } — mark fixed (it reopens if it happens again). DELETE clears fixed ones. |
| `src/app/api/admin/features/route.ts` | GET PATCH /api/admin/features. PATCH { config: { [key]: { on, plans[] } } } |
| `src/app/api/admin/health/route.ts` | GET /api/admin/health. |
| `src/app/api/admin/integrations/route.ts` | GET PATCH /api/admin/integrations. PATCH { psi?, safebrowsing?, similarweb?, apollo?, zerobounce? } — empty string removes a key; missing leaves it. |
| `src/app/api/admin/leads/route.ts` | GET /api/admin/leads. Every lead from every customer, with filters and paging. |
| `src/app/api/admin/leads/bulk/route.ts` | POST /api/admin/leads/bulk. POST { action: "delete", ids?: string[], all?: true, query?: string } |
| `src/app/api/admin/leads/export/route.ts` | GET /api/admin/leads/export. CSV of every lead matching the filters (or the ids given), across all customers. |
| `src/app/api/admin/maintenance/route.ts` | GET POST /api/admin/maintenance. POST { action: "cleanup" / "optimize" } |
| `src/app/api/admin/overview/route.ts` | GET /api/admin/overview. |
| `src/app/api/admin/payment-methods/route.ts` | GET POST /api/admin/payment-methods. |
| `src/app/api/admin/payment-methods/[id]/route.ts` | DELETE PATCH /api/admin/payment-methods/[id]. |
| `src/app/api/admin/payments/route.ts` | GET /api/admin/payments. |
| `src/app/api/admin/payments/[id]/route.ts` | POST /api/admin/payments/[id]. POST { action: "approve" / "reject", note? } |
| `src/app/api/admin/plans/route.ts` | GET POST /api/admin/plans. |
| `src/app/api/admin/plans/[id]/route.ts` | PATCH /api/admin/plans/[id]. |
| `src/app/api/admin/pool/route.ts` | DELETE GET PATCH /api/admin/pool. The shared data pool: size, freshness, top cities and categories, reuse. |
| `src/app/api/admin/sending-server/route.ts` | GET PATCH /api/admin/sending-server. PATCH { enabled, host, port, user, pass?, domains, defaultFrom, dailyLimit, gapSeconds } — checks the login before saving. |
| `src/app/api/admin/settings/route.ts` | GET PATCH /api/admin/settings. |
| `src/app/api/admin/support/route.ts` | GET POST /api/admin/support. POST { ticketId, body } replies as the team; POST { ticketId, close: true } closes. |
| `src/app/api/admin/test-email/route.ts` | GET POST /api/admin/test-email. |
| `src/app/api/admin/upload/route.ts` | POST /api/admin/upload. POST { kind: "logo" / "favicon" / "og", dataUrl } — an empty dataUrl removes it. |
| `src/app/api/admin/users/route.ts` | GET /api/admin/users. GET ?q=&filter=all/owners/members/paying/free/blocked/unverified/admins&page=1 |
| `src/app/api/admin/users/[id]/route.ts` | DELETE GET PATCH /api/admin/users/[id]. Everything about one user, for the admin's user page. |
| `src/app/api/admin/users/[id]/impersonate/route.ts` | POST /api/admin/users/[id]/impersonate. Admin support tool: see the app exactly as this person does. |
| `src/app/api/ai/brief/route.ts` | POST /api/ai/brief. POST { leadId } — writes and saves an AI brief for the lead. |
| `src/app/api/ai/bulk/route.ts` | POST /api/ai/bulk. POST { ids, channel, language, tone } — writes a personal first message for up to 25 leads. |
| `src/app/api/ai/call/route.ts` | POST /api/ai/call. POST { leadId, language } — a short phone call script for this lead. |
| `src/app/api/ai/demo/route.ts` | POST /api/ai/demo. POST { leadId } — makes (or remakes) a demo homepage and returns its public link. |
| `src/app/api/ai/filter/route.ts` | POST /api/ai/filter. POST { question } — turns a plain-language question into lead filters. |
| `src/app/api/ai/message/route.ts` | GET POST /api/ai/message. |
| `src/app/api/ai/plan/route.ts` | POST /api/ai/plan. POST { description } — suggests search lines. |
| `src/app/api/ai/proposal/route.ts` | POST /api/ai/proposal. POST { leadId, price?, timeline?, language? } — writes a proposal and returns its public link. |
| `src/app/api/ai/reply/route.ts` | POST /api/ai/reply. POST { leadId, reply } — records their reply and suggests what to do next. |
| `src/app/api/ai/review-reply/route.ts` | POST /api/ai/review-reply. POST { leadId, index, language } — a reply the business owner can post under a Google review. |
| `src/app/api/ai/reviews/route.ts` | POST /api/ai/reviews. POST { leadId } — turns the lead's saved reviews into insights. |
| `src/app/api/auth/accept-invite/route.ts` | POST /api/auth/accept-invite. |
| `src/app/api/auth/forgot/route.ts` | POST /api/auth/forgot. POST { email } — always answers the same way, so nobody can test which emails have accounts. |
| `src/app/api/auth/login/route.ts` | POST /api/auth/login. |
| `src/app/api/auth/logout/route.ts` | POST /api/auth/logout. |
| `src/app/api/auth/password/route.ts` | PATCH /api/auth/password. |
| `src/app/api/auth/register/route.ts` | POST /api/auth/register. The admin is ADMIN_EMAIL if set; otherwise the very first account (you, the owner). |
| `src/app/api/auth/resend-verify/route.ts` | POST /api/auth/resend-verify. |
| `src/app/api/auth/reset/route.ts` | POST /api/auth/reset. Opening the link proves they own the email |
| `src/app/api/auth/stop-impersonating/route.ts` | POST /api/auth/stop-impersonating. |
| `src/app/api/billing/route.ts` | GET POST /api/billing. Owner reports a payment: POST { planId, method, reference, payerName?, payerPhone? } |
| `src/app/api/billing/checkout/route.ts` | POST /api/billing/checkout. POST { planId } — returns a card payment page URL. |
| `src/app/api/billing/coupon/route.ts` | POST /api/billing/coupon. POST { planId, code } — previews what a coupon takes off. |
| `src/app/api/branding/route.ts` | GET PATCH /api/branding. |
| `src/app/api/bulk-email/route.ts` | GET POST /api/bulk-email. Mailboxes, sending server info and bulk sends with live counts. |
| `src/app/api/bulk-email/[id]/route.ts` | PATCH /api/bulk-email/[id]. PATCH { action: "pause" / "resume" / "cancel" } |
| `src/app/api/bulk-email/mailbox/route.ts` | POST /api/bulk-email/mailbox. POST { fromName, fromEmail?, replyTo } — a mailbox that sends through the platform's shared server. |
| `src/app/api/bulk-email/mailbox/[id]/route.ts` | PATCH /api/bulk-email/mailbox/[id]. PATCH { dailyLimit?, gapSeconds?, fromName?, replyTo?, active? } — any number the server allows. |
| `src/app/api/campaigns/route.ts` | GET POST /api/campaigns. POST { name, channel: "WHATSAPP" / "SMS", templates: string[], query } |
| `src/app/api/campaigns/[id]/route.ts` | DELETE GET PATCH /api/campaigns/[id]. PATCH { status: "ACTIVE" / "PAUSED" } — pause or resume an automatic campaign. |
| `src/app/api/campaigns/[id]/items/[itemId]/route.ts` | PATCH /api/campaigns/[id]/items/[itemId]. PATCH { action: "sent" / "skip", message? } — the person opened WhatsApp/SMS and sent it, or skipped this lead. |
| `src/app/api/client-error/route.ts` | POST /api/client-error. The browser reports crashes here (from error screens and the global error listener). |
| `src/app/api/cron/route.ts` | GET /api/cron. For servers: call every 5 minutes so watches run even when nobody has the app open. |
| `src/app/api/developer/keys/route.ts` | GET POST /api/developer/keys. Creates a key. The full key is returned once and never stored. |
| `src/app/api/developer/keys/[id]/route.ts` | DELETE /api/developer/keys/[id]. |
| `src/app/api/developer/webhooks/route.ts` | GET POST /api/developer/webhooks. |
| `src/app/api/developer/webhooks/[id]/route.ts` | DELETE /api/developer/webhooks/[id]. |
| `src/app/api/developer/webhooks/[id]/test/route.ts` | POST /api/developer/webhooks/[id]/test. |
| `src/app/api/domains/check/route.ts` | GET /api/domains/check. Caddy asks this before getting an SSL certificate for a new domain (on-demand TLS). |
| `src/app/api/engine/status/route.ts` | GET /api/engine/status. |
| `src/app/api/enrich/route.ts` | GET POST /api/enrich. POST { ids?: string[] }  — without ids, queues every unchecked lead that has a website. |
| `src/app/api/extract/route.ts` | GET POST /api/extract. |
| `src/app/api/feed/route.ts` | GET POST /api/feed. GET: the workspace's private Sheets feed link. POST: make a new link (the old one stops working). |
| `src/app/api/feed/[token]/route.ts` | GET /api/feed/[token]. Private CSV feed. In Google Sheets: =IMPORTDATA("this link") keeps a sheet in sync with your leads. |
| `src/app/api/health/route.ts` | GET /api/health. |
| `src/app/api/integrations/hubspot/route.ts` | DELETE GET POST /api/integrations/hubspot. POST { token } checks the token with HubSpot and saves it. DELETE disconnects. |
| `src/app/api/integrations/instagram/route.ts` | DELETE GET POST /api/integrations/instagram. POST { igUserId, token } — your own Instagram Business account id and a token with instagram_basic access. |
| `src/app/api/integrations/sms/route.ts` | GET PATCH POST /api/integrations/sms. PATCH { smsUrl, smsMethod, smsBody } ; POST { to } sends a test message. |
| `src/app/api/jobs/route.ts` | GET POST /api/jobs. |
| `src/app/api/jobs/[id]/route.ts` | DELETE /api/jobs/[id]. Removes a search from your list. Leads it found stay in your leads. |
| `src/app/api/leads/query.ts` | Exports: LEAD_STATUSES, leadWhere. |
| `src/app/api/leads/route.ts` | GET PATCH /api/leads. Update a lead's status: PATCH { id, status } |
| `src/app/api/leads/[id]/route.ts` | GET PATCH /api/leads/[id]. PATCH { followUpAt?: ISO string / null, dealValue?: number / null } |
| `src/app/api/leads/[id]/activity/route.ts` | POST /api/leads/[id]/activity. POST { type: "NOTE" / "MESSAGE", body, channel? } — a MESSAGE also marks a new lead as contacted. |
| `src/app/api/leads/[id]/call/route.ts` | POST /api/leads/[id]/call. POST { outcome, note?, followUpDays? } — records a phone call and what happens next. |
| `src/app/api/leads/[id]/competitors/route.ts` | GET /api/leads/[id]/competitors. The strongest businesses of the same kind nearby, from this workspace's own leads. |
| `src/app/api/leads/[id]/instagram/route.ts` | POST /api/leads/[id]/instagram. |
| `src/app/api/leads/[id]/intel/route.ts` | POST /api/leads/[id]/intel. POST { action: "check" / "owner-email" / "paid" } — deep check, owner email finder, paid sources. |
| `src/app/api/leads/[id]/report/route.ts` | DELETE POST /api/leads/[id]/report. Creates (or returns) a public link to this lead's website report. |
| `src/app/api/leads/[id]/review-tools/route.ts` | GET POST /api/leads/[id]/review-tools. POST { action: "link" / "monitor-on" / "monitor-off" } |
| `src/app/api/leads/[id]/sms/route.ts` | POST /api/leads/[id]/sms. POST { body } — queues an SMS through the provider. Only for leads who agreed to receive messages. |
| `src/app/api/leads/bulk/route.ts` | POST /api/leads/bulk. POST { ids: string[], action: "status" / "check" / "tag" / "delete", status? } |
| `src/app/api/leads/export/route.ts` | GET /api/leads/export. BOM so Excel opens Urdu/special characters correctly |
| `src/app/api/leads/facets/route.ts` | GET /api/leads/facets. Categories with counts, for the category filter. |
| `src/app/api/leads/hubspot/route.ts` | POST /api/leads/hubspot. POST { ids } — sends up to 200 leads to HubSpot as companies (and contacts). |
| `src/app/api/leads/import/route.ts` | POST /api/leads/import. POST { rows: [{ name, phone?, email?, website?, address?, category? }], check? } |
| `src/app/api/leads/learn/route.ts` | POST /api/leads/learn. POST — learns from won and lost deals and re-scores open leads. |
| `src/app/api/leads/lookalike/route.ts` | POST /api/leads/lookalike. POST — finds more businesses like the ones you've won: same kinds, same cities. |
| `src/app/api/leads/map/route.ts` | GET /api/leads/map. |
| `src/app/api/leads/merge/route.ts` | POST /api/leads/merge. POST — merges the same business saved more than once (same phone or website). |
| `src/app/api/leads/signals/route.ts` | POST /api/leads/signals. POST — recalculates lead signals and scores for the whole account. |
| `src/app/api/me/features/route.ts` | GET /api/me/features. |
| `src/app/api/notifications/route.ts` | GET POST /api/notifications. Marks everything as read. |
| `src/app/api/outreach/enroll/route.ts` | POST /api/outreach/enroll. POST { leadIds, sequenceId, mailboxId } — starts the sequence for leads that have an email. |
| `src/app/api/outreach/enrollments/[id]/route.ts` | PATCH /api/outreach/enrollments/[id]. PATCH { action: "stop" / "replied" } — ends a lead's sequence and cancels its queued emails. |
| `src/app/api/outreach/mailboxes/route.ts` | GET POST /api/outreach/mailboxes. Connects a mailbox. Checks that it can actually sign in before saving. |
| `src/app/api/outreach/mailboxes/[id]/route.ts` | DELETE PATCH /api/outreach/mailboxes/[id]. PATCH { active?, dailyLimit?, gapSeconds?, trackOpens?, label?, fromName?, password? } |
| `src/app/api/outreach/mailboxes/[id]/test/route.ts` | POST /api/outreach/mailboxes/[id]/test. Sends a test email from this mailbox to the person clicking. |
| `src/app/api/outreach/outbox/route.ts` | GET POST /api/outreach/outbox. GET ?status=QUEUED/SENT/FAILED/ALL |
| `src/app/api/outreach/send/route.ts` | POST /api/outreach/send. POST { leadId, mailboxId, to?, subject, body } — queues a single email (sent within a couple of minutes). |
| `src/app/api/outreach/sequences/route.ts` | GET POST /api/outreach/sequences. |
| `src/app/api/outreach/sequences/[id]/route.ts` | DELETE GET PATCH /api/outreach/sequences/[id]. PATCH { name?, steps?, active? } |
| `src/app/api/outreach/suppressions/route.ts` | DELETE GET POST /api/outreach/suppressions. POST { email } adds; DELETE { email } removes (only manual ones can be removed). |
| `src/app/api/pipeline/route.ts` | GET /api/pipeline. |
| `src/app/api/public/feedback/[token]/route.ts` | POST /api/public/feedback/[token]. A customer of the business sends a private message from the review page. |
| `src/app/api/public/proposals/[token]/accept/route.ts` | POST /api/public/proposals/[token]/accept. The business accepts the proposal from the public link. |
| `src/app/api/qr/route.ts` | GET /api/qr. GET ?text=… — QR code as SVG, for printing review links. |
| `src/app/api/rank/route.ts` | GET POST /api/rank. POST { leadId, keyword, size: 3/5, spacingKm } — 1 credit per grid point. |
| `src/app/api/rank/[id]/route.ts` | DELETE GET /api/rank/[id]. |
| `src/app/api/referrals/route.ts` | GET /api/referrals. |
| `src/app/api/settings/route.ts` | GET PATCH /api/settings. |
| `src/app/api/sites/route.ts` | GET POST /api/sites. POST { leadId } — turns the lead's AI demo into a website you can publish. |
| `src/app/api/sites/[id]/route.ts` | DELETE GET PATCH /api/sites/[id]. PATCH { name?, slug?, html?, published?, customDomain? } |
| `src/app/api/sites/[id]/ai/route.ts` | POST /api/sites/[id]/ai. POST { instruction } — asks AI to change the website, e.g. "make it blue" or "add Sunday hours 10-4". |
| `src/app/api/sources/osm/route.ts` | GET POST /api/sources/osm. POST { city, category, check? } — saves businesses from OpenStreetMap. 1 credit per new lead. |
| `src/app/api/sources/product/route.ts` | POST /api/sources/product. POST { product, intent: "sell" / "buy", cities: string, goal? } |
| `src/app/api/stats/route.ts` | GET /api/stats. Every count for the dashboard statistics panel. ?scope=all (Super Admin) counts every customer. |
| `src/app/api/support/route.ts` | GET POST /api/support. POST { message } — the person writes; the AI assistant answers, or the team is told. POST { human: true } asks for a person. |
| `src/app/api/t/o/[id]/route.ts` | GET /api/t/o/[id]. 1x1 transparent GIF |
| `src/app/api/team/route.ts` | GET POST /api/team. Owner invites someone: POST { email } -> returns a link to share. |
| `src/app/api/team/[id]/route.ts` | DELETE /api/team/[id]. Owner removes a member. Their history stays; they can no longer sign in. |
| `src/app/api/team/invites/[id]/route.ts` | DELETE /api/team/invites/[id]. |
| `src/app/api/templates/route.ts` | GET POST /api/templates. First visit: give everyone a few ready-made templates to start from. |
| `src/app/api/templates/[id]/route.ts` | DELETE PATCH /api/templates/[id]. |
| `src/app/api/v1/leads/route.ts` | GET OPTIONS POST /api/v1/leads. GET /api/v1/leads?page=1&limit=100&q=&status=&category=&phone=1&website=0&minScore=60&since=ISO |
| `src/app/api/v1/me/route.ts` | GET OPTIONS /api/v1/me. |
| `src/app/api/v1/searches/route.ts` | GET OPTIONS POST /api/v1/searches. POST { keywords: string[], name?, depth?, lang?, check? } |
| `src/app/api/v1/searches/[id]/route.ts` | GET OPTIONS /api/v1/searches/[id]. |
| `src/app/api/views/route.ts` | GET POST /api/views. |
| `src/app/api/views/[id]/route.ts` | DELETE /api/views/[id]. |
| `src/app/api/watches/route.ts` | GET POST /api/watches. |
| `src/app/api/watches/[id]/route.ts` | DELETE PATCH /api/watches/[id]. PATCH { active?: boolean, runNow?: true } |
| `src/app/api/webhooks/lemonsqueezy/route.ts` | POST /api/webhooks/lemonsqueezy. Lemon Squeezy calls this after a card payment. Set the webhook URL to |
| `src/app/api/webhooks/whatsapp/[accountId]/route.ts` | GET POST /api/webhooks/whatsapp/[accountId]. Meta checks the webhook once with a GET when you save it in the app dashboard. |
| `src/app/api/whatsapp/route.ts` | DELETE GET POST /api/whatsapp. POST { phoneNumberId, wabaId, accessToken, appSecret? } — checks the number with Meta, then saves it. |
| `src/app/api/whatsapp/conversations/route.ts` | GET /api/whatsapp/conversations. Latest message per contact, newest first. |
| `src/app/api/whatsapp/conversations/[contact]/route.ts` | GET /api/whatsapp/conversations/[contact]. Opening a conversation marks its incoming messages as read in the inbox |
| `src/app/api/whatsapp/send/route.ts` | POST /api/whatsapp/send. POST { contact / leadId, text } — free-form reply (only within 24h of their last message) |
| `src/app/api/whatsapp/templates/route.ts` | GET /api/whatsapp/templates. Approved message templates from Meta. |

## Components (src/components)

| File | What it contains |
|---|---|
| `src/components/accept-proposal.tsx` | Browser component.  Exports: AcceptProposal. |
| `src/components/admin-view.tsx` | Browser component. ---------- Overview ---------- Exports: AdminView. |
| `src/components/ai-panels.tsx` | Browser component. Whether AI features are available to this person (cached per page load). Exports: useAiAvailable, AiBrief, ReplyAssistant. |
| `src/components/app-shell.tsx` | Browser component.  Exports: AppShell. |
| `src/components/audit-panels.tsx` | Browser component.  Exports: AuditList. |
| `src/components/auth-form.tsx` | Browser component.  Exports: AuthForm. |
| `src/components/billing-view.tsx` | Browser component. eslint-disable-next-line react-hooks/exhaustive-deps Exports: BillingView. |
| `src/components/brand.tsx` | Browser component. The uploaded logo when there is one, otherwise the pin mark and the name. Exports: BrandProvider, useBrand, BrandMark. |
| `src/components/bulk-email-view.tsx` | Bulk email page. |
| `src/components/call-panel.tsx` | Browser component.  Exports: CallPanel. |
| `src/components/campaign-runner.tsx` | Browser component.  Exports: CampaignRunner. |
| `src/components/campaigns-view.tsx` | Browser component.  Exports: CampaignsView. |
| `src/components/command-palette.tsx` | Browser component. Search leads by name as you type Exports: CommandPalette. |
| `src/components/contour-map.tsx` | Decorative topographic map: hand-tuned contour rings around a few "hills", Exports: ContourMap. |
| `src/components/developers-view.tsx` | Browser component.  Exports: DevelopersView. |
| `src/components/enrich-view.tsx` | Browser component.  Exports: EnrichView. |
| `src/components/enroll-controls.tsx` | Browser component. Bulk bar control: start a sequence for the selected leads. Exports: EnrollControls. |
| `src/components/error-reporter.tsx` | Browser component. Sends browser crashes to the server so the Super Admin can see them. Exports: reportError, ErrorReporter. |
| `src/components/extract-view.tsx` | Browser component.  Exports: ExtractView. |
| `src/components/forgot-form.tsx` | Browser component.  Exports: ForgotForm. |
| `src/components/help-center.tsx` | Browser component.  Exports: HelpCenter. |
| `src/components/hero-banner.tsx` | Browser component. Animated dashboard banner: a radar sweeping a city grid, pins lighting up as leads are found. Exports: HeroBanner. |
| `src/components/import-leads.tsx` | Browser component. Column names people commonly use, in English and Roman Urdu Exports: ImportLeads. |
| `src/components/inbox-view.tsx` | Browser component.  Exports: InboxView. |
| `src/components/invite-form.tsx` | Browser component.  Exports: InviteForm. |
| `src/components/lead-activity.tsx` | Browser component.  Exports: LeadActivity. |
| `src/components/lead-details.tsx` | All details section. |
| `src/components/lead-drawer.tsx` | Browser component.  Exports: LeadDrawer. |
| `src/components/lead-intel.tsx` | Deep check section. |
| `src/components/leads-map.tsx` | Browser component. Create the map once Exports: LeadsMap. |
| `src/components/leads-view.tsx` | Browser component. Leads for the table Exports: LeadsView. |
| `src/components/message-composer.tsx` | Browser component. Shared across drawers in one page view so we don't refetch every time Exports: MessageComposer. |
| `src/components/outreach-view.tsx` | Browser component. ---------- Mailboxes ---------- Exports: OutreachView. |
| `src/components/page-title.tsx` | Exports: PageTitle. |
| `src/components/pipeline-board.tsx` | Browser component. Optimistic move Exports: PipelineBoard. |
| `src/components/print-button.tsx` | Browser component.  Exports: PrintButton. |
| `src/components/private-feedback.tsx` | Browser component.  Exports: PrivateFeedback. |
| `src/components/pwa.tsx` | Browser component.  Exports: RegisterServiceWorker. |
| `src/components/rank-map.tsx` | Browser component.  Exports: RankMap. |
| `src/components/rank-view.tsx` | Browser component.  Exports: RankView. |
| `src/components/reset-form.tsx` | Browser component.  Exports: ResetForm. |
| `src/components/review-tools.tsx` | Browser component. For businesses you work for: review link and QR, weekly review monitoring, private feedback. Exports: ReviewTools. |
| `src/components/reviews-panel.tsx` | Browser component.  Exports: ReviewsPanel. |
| `src/components/sales-tools.tsx` | Browser component. AI website demo + AI proposal for one lead. Exports: SalesTools, Competitors, GbpCheck. |
| `src/components/searches-view.tsx` | Browser component.  Exports: SearchesView. |
| `src/components/settings-view.tsx` | Browser component.  Exports: SettingsView. |
| `src/components/signals-panel.tsx` | Browser component.  Exports: SignalsPanel. |
| `src/components/sites-view.tsx` | Browser component.  Exports: SitesView. |
| `src/components/social-links.tsx` | Social profile buttons. |
| `src/components/stats-panel.tsx` | Dashboard statistics with 9 tabs and counts for every kind of data. |
| `src/components/status-badge.tsx` | Exports: JobStatusBadge. |
| `src/components/support-widget.tsx` | Browser component. Floating "Help" button with the AI assistant and the support team. Exports: SupportWidget. |
| `src/components/team-view.tsx` | Browser component.  Exports: TeamView. |
| `src/components/templates-view.tsx` | Browser component.  Exports: TemplatesView. |
| `src/components/use-features.tsx` | Browser component. Feature keys the Super Admin allows for this person (cached per page load). Exports: useFeatures. |
| `src/components/watches-view.tsx` | Browser component.  Exports: WatchesView. |
| `src/components/landing/faq.tsx` | Browser component.  Exports: Faq. |
| `src/components/landing/live-scan.tsx` | Browser component. Hero: a city map being scanned, pins appearing, and a live feed of businesses found. Sample data only. Exports: LiveScan. |
| `src/components/ui/button.tsx` | Exports: Button. |
| `src/components/ui/field.tsx` | Exports: Input, Textarea, Select, Label, Hint, Toggle. |
| `src/components/ui/panel.tsx` | Exports: Panel, PanelHeader, Badge. |

## Logic and helpers (src/lib)

| File | What it contains |
|---|---|
| `src/lib/admin-leads.ts` | Server only. Filters for the admin's view of every customer's leads. Exports: adminLeadWhere. |
| `src/lib/ai-route.ts` | Server only. Returns an error response when AI can't be used by this person, otherwise null. Exports: aiBlocked, aiFail. |
| `src/lib/ai.ts` | Server only. Daily AI budget per workspace, so one account can't run up a huge bill. Exports: AI_ENABLED, extractBusinesses, writeMessage, AiError, aiBudget, callClaude, parseJson, describeLead. |
| `src/lib/apikey.ts` | Server only. Authenticates a public API request. Returns the workspace id, or an error response. Exports: hashKey, newKey, apiJson, apiError, preflight, apiAuth. |
| `src/lib/audit.ts` | Server only. Records an admin action. Never throws. Exports: audit. |
| `src/lib/auth.ts` | Server only. Admin support tool: keeps the admin's own session aside and signs in as someone else. Exports: startSession, endSession, IMPERSONATOR_COOKIE, startImpersonation, stopImpersonation, currentUser, requireUser, requireAdmin. |
| `src/lib/billing.ts` | Server only. Switches on a PENDING payment: plan for 30 days (added to any time left on the same plan), credits, Exports: approvePayment, CARD_ENABLED, createCardCheckout. |
| `src/lib/brand.ts` | Server only. The owner whose white-label domain this is, if their plan still allows it. Exports: ownerForDomain, currentBrand, hexToRgbVar, platformBrand. |
| `src/lib/bulk-sender.ts` | Bulk email sender. |
| `src/lib/campaign-send.ts` | Server only. Sends the next few messages of automatic campaigns (opted-in leads only, official channels). Exports: processApiCampaigns. |
| `src/lib/coupons.ts` | Server only. Works out what a coupon takes off a plan. Counts approved and waiting payments against the use limit. Exports: checkCoupon. |
| `src/lib/crypto.ts` | Server only. Encrypts a short secret (like a mailbox password) for storage. Changing AUTH_SECRET makes old values unreadable. Exports: encrypt, decrypt, sign, unsign. |
| `src/lib/db.ts` | SQLite tuning: WAL lets reads continue while background workers write, Exports: db. |
| `src/lib/emails.ts` | Server only. Email templates. Simple, readable on phones, and with a plain-text version for every email. Exports: emails. |
| `src/lib/engine.ts` | Server only. Client for the Go scraping engine (gosom/google-maps-scraper web mode). Exports: ENGINE_OFFLINE_MESSAGE, EngineError, enginePing, engineCreateJob, engineJobStatus, engineDownloadCsv. |
| `src/lib/enrich.ts` | Server only. Domain expiry from the public RDAP registry (not every country's domains support it). Exports: emailDomainStatus, kickEnrichment. |
| `src/lib/errors.ts` | Small string hash (FNV-1a), so this file needs no Node-only modules. Exports: recordError. |
| `src/lib/feature-list.ts` | Everything the Super Admin can show or hide, per plan. Leads, dashboard, billing and settings are always on. Exports: FEATURES, featureForPath. |
| `src/lib/features.ts` | Server only. Feature keys this person can see. The Super Admin always sees everything. Exports: getFeatureConfig, allowedFeatures. |
| `src/lib/gbp.ts` | A quick check of a business's Google Maps profile, from what the search saved. Exports: gbpAudit. |
| `src/lib/help.ts` | In-app help articles (English). Each step is one short sentence. Exports: HELP. |
| `src/lib/http.ts` | For admin API routes: returns the admin, or null (send `forbidden()`). Exports: fail, apiUser, unauthorized, apiAdmin, forbidden. |
| `src/lib/hubspot.ts` | Sends leads to HubSpot. |
| `src/lib/instagram.ts` | Server only. Public numbers of another business account, via the official Business Discovery API. Exports: igUsername, igLookup, refreshInstagram. |
| `src/lib/issues.ts` | Plain-language names for website problems. These are sales openings for agencies. Exports: ISSUE_INFO, ISSUE_KEYS, issueList, scoreTone. |
| `src/lib/jobs.ts` | Server only. Keeps up to 20 reviews with text, newest first as Google gives them, trimmed for storage. Exports: syncActiveJobs. |
| `src/lib/lead-details.ts` | Extra Google Maps details and the fake-email filter. |
| `src/lib/lead-intel.ts` | Deep check: domain age, SSL, contact form/booking/chat/careers, PageSpeed, Safe Browsing, reviews trend, contact quality, owner email finder, paid sources, duplicate merge. |
| `src/lib/leads.ts` | Server only. Scores leads saved before scoring existed. Runs in small batches. Exports: rescoreLead, rescoreMissing, logActivity, STATUS_LABEL. |
| `src/lib/learn.ts` | Server only. Learns which categories this workspace wins most often and turns it into a small score boost (-10 to +15). Exports: learnBoosts, getBoosts, rescoreWorkspace, scheduleLearning. |
| `src/lib/mail.ts` | Server only. Sends an email. Never throws: returns false when it couldn't send. Exports: SMTP_READY, appUrl, sendMail, sendMailLater, adminAlertEmail. |
| `src/lib/method-input.ts` | Plans are priced in their own currency; dollar and stablecoin methods use the plan's USD price. Exports: CRYPTO_NETWORKS, methodInput, amountFor, explorerUrl. |
| `src/lib/notify.ts` | Server only.  Exports: notify. |
| `src/lib/osm.ts` | Server only. Business types we can look up on OpenStreetMap, mapped to its tags. Exports: OSM_CATEGORIES, osmSearch. |
| `src/lib/outreach-route.ts` | Server only.  Exports: outreachBlocked. |
| `src/lib/outreach.ts` | Server only. Plain, personal-looking email: no images or design, which is what lands in the inbox for cold email. Exports: parseSteps, unsubscribeUrl, isSuppressed, queueEmail, processSequences, processOutbox, forgetTransport. |
| `src/lib/plan-input.ts` | Exports: planInput. |
| `src/lib/platform-sender.ts` | Shared sending server settings. |
| `src/lib/pool.ts` | Shared data pool: saves found businesses (public data), serves unseen matches to new searches instantly. |
| `src/lib/rank.ts` | Server only. Grid of points around a center, spacing in km. Exports: gridPoints, startRankCheck, processRankChecks. |
| `src/lib/ratelimit.ts` | Server only. Small in-memory rate limiter (one server process). Returns true when the request is allowed. Exports: allow, clientIp. |
| `src/lib/sanitize.ts` | Removes scripts, event handlers and external loads from AI-made HTML. It is also shown in a sandboxed frame. Exports: sanitizeHtml. |
| `src/lib/scheduler.ts` | Server only. Runs due watches and keeps unattended searches moving. Exports: tick. |
| `src/lib/score.ts` | Lead score, 0-100. Higher = easier to reach and more likely to need help. Exports: scoreLead, scoreLabel. |
| `src/lib/searches.ts` | Server only. Validates and starts a Google Maps search for a workspace. Used by the app, watches and the public API. Exports: LANGS, SearchError, createSearch. |
| `src/lib/sequence-input.ts` | Exports: parseSequenceInput. |
| `src/lib/settings.ts` | Server only. Platform settings the admin can change from the admin panel. Exports: SETTING_DEFAULTS, getSetting, getSettings, setSetting, DEFAULT_PLANS, ensurePlans, getLightSettings. |
| `src/lib/signals-server.ts` | Server only. Recomputes signals, branches, best time and score for a workspace's leads. Safe to call often. Exports: recomputeSignals, recomputeLeadSignals, refreshOncePerStart. |
| `src/lib/signals.ts` | Lead signals: short reasons why now is a good moment to contact a business. Pure functions (server and browser). Exports: SIGNAL_INFO, isSocialOnly, busyLevel, bestContactTime, computeSignals, signalPoints. |
| `src/lib/sms.ts` | Server only. Sends one SMS through the workspace's provider (any HTTP API, including Android gateway apps). Exports: sendSms, processSms. |
| `src/lib/tags.ts` | Tags are stored as ",hot,clinic," so a filter can match a whole tag exactly. Exports: parseTags, cleanTag, storeTags. |
| `src/lib/template-input.ts` | Exports: parseTemplate. |
| `src/lib/template.ts` | "Street, Area, Lahore, Pakistan" -> "Lahore" Exports: VARIABLES, renderTemplate, STARTER_TEMPLATES. |
| `src/lib/theme.ts` | Switches between dark and light, remembered in a cookie so pages load in the right theme. Exports: toggleTheme. |
| `src/lib/token.ts` | Edge-safe helpers (used by middleware). No database or Node-only imports here. Exports: SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession. |
| `src/lib/tokens.ts` | Server only. Creates a one-time token for VERIFY or RESET. Only its hash is stored. Exports: createEmailToken, consumeEmailToken, peekEmailToken. |
| `src/lib/utils.ts` | Turns "0300 1234567" or "+92 300 1234567" into "923001234567" for wa.me links. Exports: cn, APP_NAME, whatsappNumber, formatNumber, timeAgo, websiteHost. |
| `src/lib/web.ts` | Server only. Polite page fetcher: identifies itself, respects robots.txt, times out, Exports: USER_AGENT, normalizeUrl, isPrivateIp, assertPublicHost, allowedByRobots, fetchPage, htmlToText. |
| `src/lib/webhooks.ts` | Server only. Sends an event to every active webhook of the workspace that listens for it. Never throws. Exports: WEBHOOK_EVENTS, emit, deliver, publicLead. |
| `src/lib/whatsapp.ts` | Server only. WhatsApp only allows free-form messages within 24 hours of the contact's last message. Exports: waPhoneInfo, waTemplates, waSendText, waSendTemplate, windowOpen. |
