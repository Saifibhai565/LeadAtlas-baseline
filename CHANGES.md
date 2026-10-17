# Change log

Every person or AI that edits this project adds an entry here, newest first.
Before asking any AI for new work, give it PROJECT_GUIDE.md and this file.

Format:
## YYYY-MM-DD, who (Claude / Gemini / name)
- Files changed: path/one.ts, path/two.tsx
- Database (prisma/schema.prisma) changed: yes/no (if yes, run `npx prisma db push`)
- What and why: one or two lines

## 2026-10-15, Claude (wallet + marketplace)
- Added: src/lib/wallet.ts, src/lib/marketplace-data.ts, src/app/api/wallet/* , src/app/api/data-market/*, src/app/api/admin/deposits/*, src/components/wallet-view.tsx, buy-leads-view.tsx, src/app/(app)/wallet + buy-leads
- Edited: prisma/schema.prisma (Deposit, WalletTxn, LeadPurchase), src/lib/settings.ts (lead_price, min_deposit), src/components/admin-view.tsx (Deposits tab + settings), app-shell.tsx, middleware.ts, i18n.ts
- Database changed: yes, run npx prisma db push

## 2026-10-15, Claude (data bank)
- Added: src/lib/bank.ts, src/app/api/admin/bank/route.ts + [id]
- Edited: prisma/schema.prisma (ScrapeTask), src/lib/jobs.ts (export toLead), src/lib/scheduler.ts (processScrapeTasks), src/components/admin-view.tsx (Data bank tab)
- Database changed: yes, run npx prisma db push

## 2026-10-15, Claude (autopilot)
- Added: src/lib/autopilot.ts, src/app/api/autopilot/route.ts + suggestions, src/components/autopilot-view.tsx, src/app/(app)/autopilot/page.tsx
- Edited: prisma/schema.prisma (User autopilot* + wallet*, Lead suggested/foundBy), src/lib/scheduler.ts, app/api/leads/query.ts (hide suggested), app-shell.tsx, middleware.ts, i18n.ts
- Database changed: yes, run npx prisma db push

## 2026-10-15, Claude (marketplace)
- Added: src/app/api/marketplace/route.ts + [id], src/app/api/admin/marketplace/route.ts + [id], src/components/marketplace-view.tsx, src/app/(app)/marketplace/page.tsx
- Edited: prisma/schema.prisma (MarketTemplate), templates-view.tsx (submit), admin-view.tsx (Marketplace tab), app-shell.tsx, middleware.ts, i18n.ts
- Database changed: yes, run npx prisma db push

## 2026-10-15, Claude (wizard + star)
- Added: src/app/api/account/onboard/route.ts, src/app/api/leads/[id]/pin/route.ts, src/components/welcome-wizard.tsx
- Edited: prisma/schema.prisma (User.onboardedAt, Lead.pinned), src/components/app-shell.tsx (mount), leads-view.tsx (star + filter), app/api/leads/query.ts + route.ts (pinned filter + order)
- Database changed: yes, run npx prisma db push

## 2026-10-15, Claude (automations)
- Added: src/lib/automation.ts, src/app/api/automations/route.ts + [id], src/components/automations-view.tsx, src/app/(app)/automations/page.tsx
- Edited: prisma/schema.prisma (Automation), src/app/api/leads/route.ts + bulk (run on status change), app-shell.tsx, middleware.ts, i18n.ts
- Database changed: yes, run npx prisma db push

## 2026-10-15, Claude (meeting + report)
- Added: src/lib/booking.ts, src/app/api/meeting/route.ts + slots, src/app/book/[slug]/page.tsx, src/components/booking-form.tsx, src/components/meeting-view.tsx, src/app/(app)/meeting/page.tsx, src/app/api/analytics/report-settings/route.ts
- Edited: prisma/schema.prisma (User meeting fields + weeklyReport, Booking model), src/lib/emails.ts (weeklyReport), src/lib/scheduler.ts (Monday report), src/components/analytics-view.tsx (toggle), app-shell.tsx, middleware.ts, i18n.ts
- Database changed: yes, run npx prisma db push

## 2026-10-15, Claude (shortcuts + urdu)
- Added: src/components/shortcuts.tsx; more keys in src/lib/i18n.ts
- Edited: src/components/app-shell.tsx (mount Shortcuts), pipeline-board.tsx (translated columns), several page.tsx (tkey)
- Database changed: no

## 2026-10-15, Claude (urdu screens)
- Added: src/components/title-text.tsx; more keys in src/lib/i18n.ts
- Edited: src/components/leads-view.tsx (filters/headers), page-title.tsx (tkey), leads/searches/settings/bulk-*/analytics page.tsx (tkey)
- Database changed: no

## 2026-10-15, Claude (urdu / i18n)
- Added: src/lib/i18n.ts, src/components/i18n-provider.tsx
- Edited: src/app/layout.tsx (lang cookie, dir, provider), src/components/app-shell.tsx (nav labels), settings-view.tsx (language panel), hero-banner.tsx, app/globals.css (RTL font)
- Database changed: no
- Note: to translate more screens, add keys to src/lib/i18n.ts and use useT().t("key","English fallback")

## 2026-10-15, Claude (bulk sms)
- Added: src/lib/bulk-sms.ts, src/app/api/bulk-sms/route.ts + [id], src/components/bulk-sms-view.tsx, src/app/(app)/bulk-sms/page.tsx
- Edited: prisma/schema.prisma (SmsMessage.batchId, SmsBatch), src/lib/scheduler.ts, src/middleware.ts, src/components/app-shell.tsx
- Database changed: yes, run npx prisma db push

## 2026-10-15, Claude (finishing)
- Added: src/lib/disposable.ts, src/lib/timezone.ts
- Edited: prisma/schema.prisma (Mailbox.sendFromHour/sendToHour/sendTz), src/lib/lead-details.ts (disposable), src/lib/bulk-sender.ts + outreach.ts (send window), src/app/api/bulk-email/* (window fields), src/components/bulk-email-view.tsx (hours UI), src/app/api/extract/route.ts (directory crawl), src/components/extract-view.tsx (pages), src/lib/lead-intel.ts + admin-view + lead-intel.tsx + api/admin/integrations (Numverify phone type)
- Database changed: yes, run npx prisma db push

## 2026-10-15, Claude (ai agents)
- Added: src/lib/competitors.ts, src/app/api/leads/[id]/dossier/route.ts, src/app/api/competitors/route.ts + [id], src/components/dossier-panel.tsx, src/components/competitors-view.tsx, src/app/(app)/competitors/page.tsx
- Edited: prisma/schema.prisma (Lead.dossier/dossierAt, CompetitorWatch), src/lib/scheduler.ts, src/middleware.ts, src/components/app-shell.tsx, lead-drawer.tsx, lead-details.tsx (optional lat/lng)
- Database changed: yes, run npx prisma db push

## 2026-10-15, Claude (security)
- Added: src/lib/totp.ts, src/lib/access.ts, src/app/api/account/2fa/route.ts, src/app/api/account/security/route.ts, src/app/api/leads/[id]/privacy/route.ts, src/components/two-factor.tsx
- Edited: prisma/schema.prisma (User: teamRole, totpSecret, totpEnabled, totpBackup, ipAllow), src/lib/auth.ts (teamRole), src/app/api/auth/login/route.ts (2FA + IP), team route + [id] (roles), accept-invite, leads/bulk + export (permissions), lead-details.tsx (privacy), settings-view.tsx, team-view.tsx, auth-form.tsx
- Database changed: yes, run npx prisma db push

## 2026-10-15, Claude (analytics)
- Added: src/lib/analytics.ts, src/app/api/analytics/route.ts, src/app/api/analytics/report/route.ts, src/components/analytics-view.tsx, src/app/(app)/analytics/page.tsx
- Edited: src/components/app-shell.tsx, src/middleware.ts
- Database changed: no

## 2026-10-15, Claude (deliverability)
- Added: src/lib/deliverability.ts, src/lib/warmup.ts, src/app/api/deliverability/route.ts, src/app/api/outreach/warmup/route.ts, src/components/deliverability-view.tsx, src/app/(app)/deliverability/page.tsx
- Edited: prisma/schema.prisma (Mailbox warmup/reputation/dns fields, WarmupEmail, DeliverabilityCheck), src/lib/scheduler.ts (warmup tick), src/lib/bulk-sender.ts (bounce guardian + reputation), src/middleware.ts, src/components/app-shell.tsx, bulk-email-view.tsx (spam checker)
- Database changed: yes, run npx prisma db push

## 2026-10-15, Claude (pool + stats)
- Added: src/lib/pool.ts, src/app/api/admin/pool/route.ts, src/app/api/stats/route.ts, src/components/stats-panel.tsx
- Edited: prisma/schema.prisma (PlaceCache), src/lib/settings.ts (pool_enabled, pool_days), src/lib/searches.ts (pool first), src/lib/jobs.ts (save to pool, 3s partial imports), src/app/(app)/dashboard/page.tsx, src/components/admin-view.tsx (Data pool tab)
- Database changed: yes, run npx prisma db push

## 2026-10-15, Claude
- Added: src/lib/lead-intel.ts, src/lib/hubspot.ts, src/lib/lead-details.ts, src/components/lead-intel.tsx, src/components/lead-details.tsx, src/components/social-links.tsx, src/app/api/leads/[id]/intel, src/app/api/leads/merge, src/app/api/leads/hubspot, src/app/api/integrations/hubspot, src/app/api/admin/integrations, plus bulk email files (src/lib/bulk-sender.ts, src/lib/platform-sender.ts, src/app/api/bulk-email/*, src/app/api/admin/sending-server, src/components/bulk-email-view.tsx, src/app/(app)/bulk-email)
- Edited: prisma/schema.prisma (Lead.details, intel, quality, intelAt, mergedInto; User.hubspotTokenEnc; Mailbox.platform, replyTo; EmailMessage.batchId; EmailBatch), src/lib/jobs.ts, src/lib/enrich.ts, src/lib/scheduler.ts, src/lib/outreach.ts, src/components/leads-view.tsx, lead-drawer.tsx, settings-view.tsx, admin-view.tsx, app-shell.tsx
- Database changed: yes, run npx prisma db push
- What: deep check, owner email finder, contact quality, duplicates merge, HubSpot, data integrations, all Google details, social link buttons, bulk email

## 2026-10-13, Claude
- Baseline: phases 1 to 22 plus the website redesign. See PROJECT_GUIDE.md for the full map.
