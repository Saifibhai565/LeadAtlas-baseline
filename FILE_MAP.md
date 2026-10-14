# File map

Every file in the project and what it contains. Generated from the code, so it stays accurate.

Total files: 325

## Project root

| File | What it contains |
|---|---|
| `.dockerignore` | Files left out of the Docker image. |
| `.env.example` | Every environment variable with a comment. Copy to .env and fill in. |
| `.gitignore` | Files never uploaded to Git (.env, database, node_modules, build output). |
| `CHANGES.md` | Log of every change: who, which files, database changed or not. |
| `DEPLOY.md` | Step-by-step server setup with Docker, domain, SSL, backups (Roman Urdu). |
| `Dockerfile` | Builds the production app image (build stage + small run stage, runs prisma db push then the server). |
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
| `src/app/api/leads/[id]/report/route.ts` | DELETE POST /api/leads/[id]/report. Creates (or returns) a public link to this lead's website report. |
| `src/app/api/leads/[id]/review-tools/route.ts` | GET POST /api/leads/[id]/review-tools. POST { action: "link" / "monitor-on" / "monitor-off" } |
| `src/app/api/leads/[id]/sms/route.ts` | POST /api/leads/[id]/sms. POST { body } — queues an SMS through the provider. Only for leads who agreed to receive messages. |
| `src/app/api/leads/bulk/route.ts` | POST /api/leads/bulk. POST { ids: string[], action: "status" / "check" / "tag" / "delete", status? } |
| `src/app/api/leads/export/route.ts` | GET /api/leads/export. BOM so Excel opens Urdu/special characters correctly |
| `src/app/api/leads/facets/route.ts` | GET /api/leads/facets. Categories with counts, for the category filter. |
| `src/app/api/leads/import/route.ts` | POST /api/leads/import. POST { rows: [{ name, phone?, email?, website?, address?, category? }], check? } |
| `src/app/api/leads/learn/route.ts` | POST /api/leads/learn. POST — learns from won and lost deals and re-scores open leads. |
| `src/app/api/leads/lookalike/route.ts` | POST /api/leads/lookalike. POST — finds more businesses like the ones you've won: same kinds, same cities. |
| `src/app/api/leads/map/route.ts` | GET /api/leads/map. |
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
| `src/components/admin-view.tsx` | All Super Admin tabs: overview, payments, support, users, leads, plans, payment methods, features, coupons, website, activity log, errors, system, settings. |
| `src/components/ai-panels.tsx` | Browser component. Whether AI features are available to this person (cached per page load). Exports: useAiAvailable, AiBrief, ReplyAssistant. |
| `src/components/app-shell.tsx` | Sidebar, top bar (engine dot, theme, notifications, plan, credits), banners, command menu, help button. |
| `src/components/audit-panels.tsx` | Browser component.  Exports: AuditList. |
| `src/components/auth-form.tsx` | Browser component.  Exports: AuthForm. |
| `src/components/billing-view.tsx` | Billing page: plans, payment methods, coupon, payment form, history and invoices, referral link. |
| `src/components/brand.tsx` | Browser component. The uploaded logo when there is one, otherwise the pin mark and the name. Exports: BrandProvider, useBrand, BrandMark. |
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
| `src/components/hero-banner.tsx` | Dashboard animated radar banner. |
| `src/components/import-leads.tsx` | Browser component. Column names people commonly use, in English and Roman Urdu Exports: ImportLeads. |
| `src/components/inbox-view.tsx` | Browser component.  Exports: InboxView. |
| `src/components/invite-form.tsx` | Browser component.  Exports: InviteForm. |
| `src/components/lead-activity.tsx` | Browser component.  Exports: LeadActivity. |
| `src/components/lead-drawer.tsx` | Lead panel: next step, why now, win this deal, message, phone call, replies, contact, online, competitors, profile check, reviews, review tools, SEO, store, website check, history. |
| `src/components/leads-map.tsx` | Browser component. Create the map once Exports: LeadsMap. |
| `src/components/leads-view.tsx` | Leads page: search, filters, signals, tags, saved views, Ask AI, table, map, bulk actions, import, export. |
| `src/components/message-composer.tsx` | Write a message: WhatsApp/SMS/Email, templates, AI writer, send from mailbox or WhatsApp Business. |
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
| `src/components/searches-view.tsx` | Searches page: new search form (goal, AI planner), find by product, OpenStreetMap, searches list. |
| `src/components/settings-view.tsx` | Browser component.  Exports: SettingsView. |
| `src/components/signals-panel.tsx` | Browser component.  Exports: SignalsPanel. |
| `src/components/sites-view.tsx` | Browser component.  Exports: SitesView. |
| `src/components/status-badge.tsx` | Exports: JobStatusBadge. |
| `src/components/support-widget.tsx` | Help button and chat (AI assistant and support team). |
| `src/components/team-view.tsx` | Browser component.  Exports: TeamView. |
| `src/components/templates-view.tsx` | Browser component.  Exports: TemplatesView. |
| `src/components/use-features.tsx` | Browser component. Feature keys the Super Admin allows for this person (cached per page load). Exports: useFeatures. |
| `src/components/watches-view.tsx` | Browser component.  Exports: WatchesView. |
| `src/components/landing/faq.tsx` | Website questions accordion. |
| `src/components/landing/live-scan.tsx` | Website hero: animated map scan with pins and live feed. |
| `src/components/ui/button.tsx` | Exports: Button. |
| `src/components/ui/field.tsx` | Exports: Input, Textarea, Select, Label, Hint, Toggle. |
| `src/components/ui/panel.tsx` | Exports: Panel, PanelHeader, Badge. |

## Logic and helpers (src/lib)

| File | What it contains |
|---|---|
| `src/lib/admin-leads.ts` | Filters for Super Admin > Leads (all customers' leads). |
| `src/lib/ai-route.ts` | Blocks AI routes when there's no key or the plan has no AI; turns AI errors into replies. |
| `src/lib/ai.ts` | AI: Anthropic calls, extraction, message writer, daily AI budget, JSON parsing, lead description for prompts. |
| `src/lib/apikey.ts` | Public API keys: create, hash, check (Bearer la_...), CORS and rate limit. |
| `src/lib/audit.ts` | Writes admin actions to the activity log. |
| `src/lib/auth.ts` | Sessions and the signed-in person: currentUser (id, wsId, plan, permissions), requireUser/requireAdmin, impersonation. |
| `src/lib/billing.ts` | Approves a payment (plan for 30 days, credits, invoice number, coupon, referral reward); Lemon Squeezy card checkout. |
| `src/lib/brand.ts` | Brand for the current domain: platform name/colour or an agency's white-label brand. |
| `src/lib/campaign-send.ts` | Sends automatic WhatsApp-template and SMS-provider campaigns to opted-in leads. |
| `src/lib/coupons.ts` | Checks a coupon code and works out the discount. |
| `src/lib/crypto.ts` | Encrypts mailbox/API passwords; signs links (unsubscribe). |
| `src/lib/db.ts` | The Prisma database client (SQLite in WAL mode). |
| `src/lib/emails.ts` | All platform email templates (welcome, reset, invite, payments, plan expiring, watch results, weekly digest, test). |
| `src/lib/engine.ts` | Talks to the Go scraping engine: create job, status, download CSV, ping. |
| `src/lib/enrich.ts` | Website checks worker: emails, phones, social links, tech, website audit, SEO audit, store audit, owner name, builder, domain expiry, email domain check. |
| `src/lib/errors.ts` | Records an error once per kind and counts repeats. |
| `src/lib/feature-list.ts` | The list of features the Super Admin can turn on/off per plan, and their pages. |
| `src/lib/features.ts` | Works out which features a person may see. |
| `src/lib/gbp.ts` | Google Business Profile check (website, phone, hours, description, photo, reviews, rating). |
| `src/lib/help.ts` | Help center articles (English). |
| `src/lib/http.ts` | API helpers: fail(), unauthorized(), forbidden(), apiUser(), apiAdmin(). |
| `src/lib/instagram.ts` | Instagram Business Discovery lookups (followers, posts). |
| `src/lib/issues.ts` | Plain-language names for website problems. |
| `src/lib/jobs.ts` | Imports search results: parses the engine CSV, saves new leads, charges credits, refreshes known leads and spots changes, lead goals and follow-up rounds. |
| `src/lib/leads.ts` | Re-scoring helpers, activity log helper, status labels. |
| `src/lib/learn.ts` | Learns which categories you win most and adjusts scores. |
| `src/lib/mail.ts` | Platform email sender (SMTP), APP_URL helper. |
| `src/lib/method-input.ts` | Payment method validation, price per currency (USD/USDT), blockchain explorer links. |
| `src/lib/notify.ts` | Creates in-app notifications. |
| `src/lib/osm.ts` | OpenStreetMap (Overpass) business search. |
| `src/lib/outreach-route.ts` | Server only.  Exports: outreachBlocked. |
| `src/lib/outreach.ts` | Email outreach: queue, send from customer mailboxes, sequences, bounces, unsubscribes. |
| `src/lib/plan-input.ts` | Plan form validation. |
| `src/lib/rank.ts` | Rank tracker: grid points, engine jobs per point, reading positions. |
| `src/lib/ratelimit.ts` | Simple in-memory rate limits. |
| `src/lib/sanitize.ts` | Cleans AI-made HTML (no scripts or outside files). |
| `src/lib/scheduler.ts` | Background tick: watches, reminders, digests, email outbox and sequences, campaigns, SMS, rank checks, running searches. |
| `src/lib/score.ts` | Lead score 0-100. |
| `src/lib/searches.ts` | Starts a Google Maps search (validation, credits, engine job, lead goal). |
| `src/lib/sequence-input.ts` | Email sequence form validation. |
| `src/lib/settings.ts` | Platform settings with defaults (stored in AppSetting), default plans. |
| `src/lib/signals-server.ts` | Recomputes signals, branches and scores for leads. |
| `src/lib/signals.ts` | Lead signal rules (busy, recently opened, runs ads...) and best contact time. |
| `src/lib/sms.ts` | Sends SMS through the workspace's provider; SMS queue. |
| `src/lib/tags.ts` | Tag storage helpers. |
| `src/lib/template-input.ts` | Template form validation. |
| `src/lib/template.ts` | Fills message templates ({{name}}, {{city}}...) and the starter templates. |
| `src/lib/theme.ts` | Switches light/dark theme. |
| `src/lib/token.ts` | Signs and checks the login cookie (used by middleware). |
| `src/lib/tokens.ts` | One-time email tokens (confirm email, reset password). |
| `src/lib/utils.ts` | Small helpers: cn, APP_NAME, WhatsApp number format, number/date formatting. |
| `src/lib/web.ts` | Safe page fetching: robots.txt, no private networks, size and time limits; HTML to text. |
| `src/lib/webhooks.ts` | Sends signed webhooks; public lead format. |
| `src/lib/whatsapp.ts` | WhatsApp Cloud API: phone info, templates, send text/template, 24-hour window. |
