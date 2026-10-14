# LeadAtlas: Project Guide for developers and AI assistants

Read this whole file before changing anything. For every single file and what it contains, see `FILE_MAP.md`. It explains what the app does, how it is built, where every feature lives, and the rules that keep edits from different people or AIs (Claude, Gemini, others) from breaking each other.

---

## 1. What the product is

LeadAtlas is a lead-generation SaaS for agencies and freelancers. Customers search Google Maps for local businesses, the app checks each business's website and online presence, scores it, and helps the customer contact it (WhatsApp, SMS, email, calls), track deals, and serve won clients (websites, reviews, rank tracking). The owner of the platform runs it as a paid service from the **Super Admin** panel (plans, payments, users, features, website, support).

All user-facing text is in **English**. AI features can write messages in English, Urdu or Roman Urdu.

## 2. Tech stack (pinned versions, do not upgrade casually)

| Part | Technology |
|---|---|
| App | Next.js 15.1.6 (App Router), React 19, TypeScript 5.7 (strict) |
| Styling | Tailwind CSS 3.4 with CSS variables (see section 8) |
| Database | SQLite through Prisma 6.2.1 (`prisma/schema.prisma`) |
| Auth | Own implementation: bcryptjs passwords + signed JWT cookie (jose) |
| Scraping engine | Separate Go program: gosom/google-maps-scraper in web mode (`go run main.go`, port 8080) |
| Email | nodemailer (platform SMTP and customers' own mailboxes) |
| AI | Anthropic Messages API over fetch (`src/lib/ai.ts`), model from `ANTHROPIC_MODEL` |
| Maps in UI | Leaflet (loaded only in the browser) |
| Other libs | papaparse (CSV), lucide-react (icons), sonner (toasts), qrcode |
| Deployment | Docker + docker compose + Caddy (see `DEPLOY.md`, `Dockerfile`, `deploy/`) |

## 3. Running it

```
# Terminal 1 (scraper folder)
go run main.go
# Terminal 2 (this folder)
copy .env.example .env      # first time only, then fill it in
npm install
npx prisma db push          # after any change to prisma/schema.prisma
npm run dev                 # http://localhost:3000
npm run typecheck           # check TypeScript without building
npm run build               # full production build check
```

Environment variables are all documented in `.env.example` (local) and `deploy/.env.example` (server). Important ones: `DATABASE_URL`, `AUTH_SECRET` (32+ chars), `ENGINE_URL`, `APP_URL`, `ADMIN_EMAIL`, `CRON_SECRET`, `ANTHROPIC_API_KEY`, `SMTP_*`, `LEMONSQUEEZY_*`, `WHITELABEL_TARGET`.

## 4. How the pieces fit

```
Browser ──> Next.js app (pages + /api routes) ──> SQLite (Prisma)
                     │
                     ├──> Go scraping engine (HTTP, /api/v1/jobs)  : Google Maps searches
                     ├──> Public websites (website checks, web extractor, RDAP, OpenStreetMap)
                     ├──> Anthropic API (AI features)
                     ├──> SMTP servers (platform email, customer mailboxes)
                     └──> Meta Graph API (WhatsApp Business, Instagram), SMS provider, Lemon Squeezy
```

**Background work** has no separate worker process. `src/lib/scheduler.ts` exports `tick()`, which is called (at most once a minute) by often-polled API routes and by `/api/cron` on the server. Each tick: runs due Watches, plan-expiry reminders, Monday digests, email sequences and outbox, automatic campaigns, SMS queue, rank checks, and keeps running searches importing. Website checks run in an in-process worker started by `kickEnrichment()` in `src/lib/enrich.ts`.

**Search flow:** `createSearch()` (`src/lib/searches.ts`) starts an engine job and saves a `Job`. `syncActiveJobs()` (`src/lib/jobs.ts`) polls the engine, downloads the CSV while it runs, saves only leads the workspace doesn't have (`placeKey` is unique per workspace), charges 1 credit per new lead, refreshes known leads and detects changes, recomputes signals, and starts follow-up rounds when a lead goal isn't reached.

## 5. Accounts, workspaces and permissions (very important)

`currentUser()` in `src/lib/auth.ts` returns the signed-in person **and their workspace**:

- `user.id` is the person. Use it for "who did this" (activity logs, personal settings).
- `user.wsId` is the workspace owner's id. **All data (leads, jobs, templates, campaigns, mailboxes, sites...) is stored with `userId = wsId`.** Team members share the owner's data and credits.
- `user.isOwner`, `user.isAdmin` (platform Super Admin), `user.canUseAI`, `canUseAPI`, `canUseOutreach`, `canWhiteLabel`, `planName`, `credits`, `impersonating`.
- API routes start with `const user = await apiUser(); if (!user) return unauthorized();` and admin routes with `apiAdmin()` / `forbidden()` (`src/lib/http.ts`).
- Feature visibility per plan: `src/lib/feature-list.ts` (list) + `src/lib/features.ts` (`allowedFeatures`) + `useFeatures()` in the browser. The app layout blocks pages whose feature is off.

## 6. Folder map

```
prisma/schema.prisma        All database models (section 7)
src/middleware.ts           Login redirects for app pages; sets x-pathname; remembers ?ref=
src/instrumentation.ts      Saves server errors (Super Admin > Errors)
src/app/                    Pages and API routes (App Router)
  page.tsx                  Public website (home page), driven by Super Admin > Website settings
  layout.tsx                Root layout: theme, brand, SEO metadata, error reporter
  (auth)/                   login, register, forgot, reset
  (app)/                    Signed-in app: dashboard, searches, watches, leads, enrich, extract, rank,
                            pipeline, inbox, campaigns, outreach, templates, sites, team, billing,
                            developers, settings, help, admin. (app)/layout.tsx = shell + feature gate
  api/                      JSON endpoints, grouped by area (see section 9)
  d/ p/ r/ review/ u/ s/    Public pages: website demo, proposal, report, review link, unsubscribe, hosted site
  invite/ verify/ invoice/  Team invite, email confirmation, printable invoice
  brand/[asset]             Serves uploaded logo, favicon, share image
  privacy/ terms/           Text from Super Admin settings
src/components/             React components (client components start with "use client")
  ui/                       Button, Input/Select/Textarea/Toggle/Label/Hint, Panel/Badge
  landing/                  Public website parts (live-scan hero, FAQ)
src/lib/                    Server and shared logic (section 10)
extension/                  Chrome extension (Manifest V3)
deploy/                     docker-compose, Caddyfile, server .env example
public/                     Icons, robots.txt, service worker
```

## 7. Database models (prisma/schema.prisma)

| Model | Purpose |
|---|---|
| User | People. Owners have `ownerId = null`; team members point to their owner. Holds plan, credits, branding, settings, integrations |
| Job | A Google Maps search (engine job id, status, counts, goal/groupId/attempt for lead goals) |
| Lead | A business. Contact info, website checks, audits (seo, ecom), reviews, signals, score, pipeline status, tags, AI outputs, opt-in. Unique per workspace by `placeKey` |
| SavedView, Template, Activity | Saved filters, message templates, lead history (notes, messages, status changes) |
| Plan, Payment, PaymentMethod, Coupon | Billing: plans with feature flags and USD price, payments, admin payment methods (bank/wallet/crypto), coupons |
| Invite, EmailToken | Team invites, email verification and password reset tokens |
| AppSetting | Key/value platform settings (defaults in `src/lib/settings.ts`), feature config, images as data URLs |
| Watch, Notification | Repeating searches, in-app notifications |
| ApiKey, Webhook | Public API and outgoing webhooks |
| Mailbox, EmailMessage, Sequence, SequenceEnrollment, Suppression | Email outreach |
| Campaign, CampaignItem | WhatsApp/SMS campaigns (manual and automatic opted-in) |
| WaAccount, WaMessage, SmsMessage | WhatsApp Cloud API inbox, SMS provider queue |
| RankCheck, Site, Feedback | Rank tracker, hosted client websites, private review feedback |
| AuditLog, ErrorLog | Admin actions, caught errors |
| SupportTicket, SupportMessage | Help chat with the AI assistant and the support team |

JSON data is stored as **strings** (SQLite has no JSON type): parse with try/catch. Comma lists (tags, signals, tech, auditIssues) are strings too; tags are stored as `,a,b,` so filters can match exactly.

## 8. Design system

- Colours are CSS variables in `src/app/globals.css` (`--night`, `--surface`, `--raised`, `--line`, `--ink`, `--muted`, `--pin`, `--pin-ink`, `--ok`, `--info`, `--danger`), with a light theme (default) and dark theme (`data-theme`). Tailwind names: `bg-night`, `bg-surface`, `bg-raised`, `border-line`, `text-ink`, `text-muted`, `bg-pin`, `text-pin-ink`, `text-ok`, `text-info`, `text-danger`. **Use these, never hard-coded colours, inside the app.** (The public website `app/page.tsx` and public pages use their own fixed palette on purpose.)
- Radius: `rounded-panel` (cards), `rounded-control` (inputs, buttons). Font: Instrument Sans (app), Unbounded (website headings).
- Copy: sentence case, plain verbs, no ALL CAPS labels, errors say what happened and how to fix it.

## 9. API map (src/app/api)

| Area | Routes |
|---|---|
| Auth | auth/login, register, logout, forgot, reset, password, accept-invite, resend-verify, stop-impersonating |
| Searches | jobs, jobs/[id], engine/status, sources/osm, sources/product, watches, watches/[id] |
| Leads | leads (list, status), leads/[id] (+activity, call, competitors, instagram, report, review-tools, sms), leads/bulk, export, import, facets, map, learn, lookalike, signals, views |
| Enrichment | enrich, extract |
| AI | ai/brief, bulk, call, demo, filter, message, plan, proposal, reply, review-reply, reviews |
| Outreach | outreach/* (mailboxes, sequences, enroll, enrollments, outbox, send, suppressions), campaigns/*, whatsapp/*, integrations/instagram, integrations/sms |
| Client work | sites/*, rank/*, qr, public/* (proposal accept, feedback), t/o/[id] (email open pixel) |
| Account | settings, branding, team/*, billing/*, referrals, feed/*, account, account/export, me/features, notifications, support, templates/* |
| Developer | developer/keys/*, developer/webhooks/*, v1/* (public API), webhooks/lemonsqueezy, webhooks/whatsapp/[accountId] |
| Platform | admin/* (overview, payments, support, users, leads, plans, payment-methods, features, coupons, settings, upload, audit, errors, diagnostics, health, maintenance, backup, test-email), cron, health, client-error, domains/check |

## 10. Key files in src/lib

| File | What it does |
|---|---|
| auth.ts, token.ts, http.ts | Sessions, `currentUser`, impersonation, API helpers |
| db.ts | Prisma client (SQLite WAL) |
| settings.ts | Platform settings with defaults; `getSettings`, `getLightSettings`, `ensurePlans` |
| features.ts, feature-list.ts | Feature flags per plan |
| engine.ts, searches.ts, jobs.ts | Engine API client, starting searches, importing results, goals, change detection |
| enrich.ts, web.ts | Website checks (emails, socials, tech, audit, SEO, store, owner, domain expiry); safe fetching (robots.txt, no private IPs) |
| score.ts, signals.ts, signals-server.ts, learn.ts | Lead score, signals, recompute, learning from won/lost |
| ai.ts, ai-route.ts | Anthropic calls, budgets, JSON parsing, plan gating |
| outreach.ts, mail.ts, emails.ts, tokens.ts | Customer email sending, platform email + templates |
| whatsapp.ts, sms.ts, campaign-send.ts, instagram.ts | Official channels |
| rank.ts, osm.ts, gbp.ts, issues.ts, template.ts, tags.ts, sanitize.ts | Rank tracker, OpenStreetMap, profile check, issue labels, message templates, tags, HTML cleaning |
| billing.ts, coupons.ts, method-input.ts, plan-input.ts | Payment approval, card checkout, coupons, payment methods, plan validation |
| scheduler.ts, notify.ts, webhooks.ts, audit.ts, errors.ts, ratelimit.ts, crypto.ts | Background tick, notifications, webhooks, logs, rate limits, encryption |
| brand.ts | Platform and white-label branding per domain |

## 11. Rules for editing (follow these exactly)

1. **One change at a time.** Send the AI the full current file you want changed, plus this guide. Ask for the complete new file back, then replace the file. Never paste partial snippets into the middle of files by guesswork.
2. **Log every change in `CHANGES.md`** (files, whether the database changed, why). Give `CHANGES.md` to any AI before new work, so Claude knows what Gemini changed and the other way round.
3. **After editing `prisma/schema.prisma`, run `npx prisma db push`.** Only add fields (optional `?` or with `@default`). Never rename or delete existing fields or models; other files depend on them.
4. **Don't rename or remove exported functions, types, routes or settings keys.** Add new ones instead.
5. **Next.js 15 specifics:** in route handlers and pages, `params` and `searchParams` are Promises (`const { id } = await params`); `cookies()` and `headers()` are async.
6. **`route.ts` files may only export HTTP handlers** (`GET`, `POST`, `PATCH`, `DELETE`, `OPTIONS`) and config (`dynamic`, `maxDuration`). Put helper functions in `src/lib`.
7. **Server-only code** (files importing `db`, `node:*` modules, secrets) must not be imported by client components (`"use client"`), by `middleware.ts`, or at the top level of `instrumentation.ts`. Files marked `import "server-only"` enforce this. `middleware.ts` may only import `src/lib/token.ts`.
8. **Data access always scopes by workspace:** `where: { userId: user.wsId, ... }`. Never return another workspace's rows. Admin routes use `apiAdmin()`.
9. **Validate input on the server** (types, lengths, enums) and return `fail("Plain message", status)`.
10. **Credits:** charge only for new leads (and rank grid points); never for duplicates, imports or website checks.
11. **Messaging rules are product rules:** first contact is sent by a person (WhatsApp/SMS open prefilled); automatic WhatsApp/SMS only to `optIn` leads; email has daily limits and unsubscribe links. Don't add bulk automation to scraped contacts, or scraping of logged-in social sites.
12. **Styling:** use the design tokens (section 8) and existing `ui/` components.
13. **Check before handing back:** `npm run typecheck` and `npm run build` must pass.

## 12. Feature checklist (where to look)

| Feature | Main files |
|---|---|
| Public website | app/page.tsx, components/landing/*, Super Admin > Website (components/admin-view.tsx `WebsiteSettings`) |
| Dashboard | app/(app)/dashboard/page.tsx, components/hero-banner.tsx |
| Searches, lead goal, product finder, OpenStreetMap | components/searches-view.tsx, lib/searches.ts, lib/jobs.ts, api/sources/* |
| Leads table, filters, map, bulk, import | components/leads-view.tsx, leads-map.tsx, import-leads.tsx, api/leads/* |
| Lead panel | components/lead-drawer.tsx (+ message-composer, ai-panels, reviews-panel, review-tools, sales-tools, signals-panel, call-panel, audit-panels, lead-activity) |
| Website checks, SEO, store audit | lib/enrich.ts, components/enrich-view.tsx |
| Campaigns | components/campaigns-view.tsx, campaign-runner.tsx, api/campaigns/*, lib/campaign-send.ts |
| Email outreach | components/outreach-view.tsx, lib/outreach.ts, api/outreach/* |
| WhatsApp inbox | components/inbox-view.tsx, lib/whatsapp.ts, api/whatsapp/*, api/webhooks/whatsapp |
| Rank tracker, websites | components/rank-view.tsx, rank-map.tsx, sites-view.tsx, lib/rank.ts, app/s/[slug] |
| Billing | components/billing-view.tsx, api/billing/*, lib/billing.ts, method-input.ts |
| Super Admin | components/admin-view.tsx (all tabs), api/admin/* |
| Support and help | components/support-widget.tsx, help-center.tsx, lib/help.ts, api/support, api/admin/support |
| Errors and self-test | src/instrumentation.ts, lib/errors.ts, components/error-reporter.tsx, api/admin/errors, api/admin/diagnostics |

## 13. Known limits

- SQLite suits one server. Moving to PostgreSQL needs case-insensitive search changes (`mode: "insensitive"`) across queries.
- Background jobs run inside the app process; on a server, the cron container keeps them going.
- Rank positions are the order Google Maps lists results from each grid point.
- The scraper depends on Google Maps' page layout; when Google changes it, update the Go engine.
