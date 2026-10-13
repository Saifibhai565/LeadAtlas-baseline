# LeadAtlas (Phase 1)

Google Maps se businesses dhoondne, unhein leads ki shakal mein sambhalne aur un se rabta karne ka tool.
Yeh Next.js dashboard hai jo peeche **gosom/google-maps-scraper** (Go engine) se kaam karwata hai.

## Phase 1 mein kya hai

- Login / signup (pehla account khud **Admin** ban jata hai)
- Dark, professional dashboard
- Searches: ek saath kai searches, depth, emails, language, time limit
- Live status: search chal rahi hai, khatam hui, kitni leads mili
- Leads: search, filters (phone, email, website hai/nahi, rating, status), pagination
- Har lead par WhatsApp "Chat" button (click se chat khulti hai, lead "Contacted" ho jati hai)
- Lead status: New, Contacted, Interested, Won, Lost
- CSV export (Excel mein Urdu bhi theek dikhta hai)
- Duplicate leads khud hat jati hain
- Credits system (1 nayi lead = 1 credit), bechne ki buniyad

## Phase 22: Website/SEO control, payment methods (USD + crypto), Help center

- **Super Admin > Website:** platform name, colour, tagline, **logo**, **favicon** (browser tab icon), SEO page title, description, keywords, **share image** (WhatsApp/Facebook preview), aur poora home page: headline, sub-headline, button text, "How it works", features, FAQ, pricing on/off, footer
- **Super Admin > Payment methods:** bank, mobile wallet, USD aur crypto (USDT/USDC; TRC20, BEP20, ERC20, Polygon, Solana, Bitcoin) — naam, currency, account/address, hidayat, QR code. Billing par customer method chunta hai, sahi currency mein raqam dekhta hai, address copy/QR, crypto par network ki warning, aur transaction hash deta hai. Admin ko "check on blockchain" link
- **Plans:** har plan ki USD qeemat (dollar aur crypto methods ke liye)
- **Help center (sidebar):** English guides, search ke saath; Help button se bhi link

Phase 21 se update:
```
npm install
npx prisma db push
```

## Phase 21: Support team + AI assistant, SEO audit, Online store audit

- **Help button (har page par, neeche daayein):** customer sawal likhe, AI assistant jawab de (Roman Urdu/Urdu/English). Na jaanta ho, payment/refund/bug ho, ya customer "Talk to a person" dabaye to team ko notification aur email. Team ka jawab isi chat mein
- **Super Admin > Support:** saari baatcheet (waiting, answered, AI-only, closed), jawab dena, band karna
- **Super Admin > Settings > Support assistant:** AI on/off, naam, pehla message, aur "What the assistant knows" (qeematein, payment, refund, mushkilat ke hal)
- **SEO audit (lead panel):** title, description, H1, image alt, business schema, canonical, share preview, sitemap, text ki miqdar: score aur har kami ki wajah
- **Online store check (lead panel, sirf stores):** WhatsApp button, COD, payment methods, reviews, delivery info, return policy, Pixel, analytics, https, mobile, speed

Dono audits website check ke saath khud bante hain (purani leads ke liye website check dobara chalayein).

Phase 20 se update:
```
npm install
npx prisma db push
```

## Phase 20: Premium dashboard, lead goal, product finder

- **Dashboard:** animated "Live lead radar" banner (ghoomta radar, chamakte pins, ginti animation), aur "Best leads to contact next" ab mukhtalif categories se, wajah ke saath (rating, no website, signals)
- **Score theek:** pehle sab 95 aa rahe the; ab score hamwar (smooth) hai: reviews aur rating darja ba darja, signals ki had. Purani leads khud dobara score hoti hain
- **Top bar mein light/dark button** (chand/sooraj)
- **"How many new leads do you want?"** (Searches): jaise 50. Sirf nayi leads ginti hoti hain (jo pehle aa chuki woh dobara save nahi hoti). Kam milein to khud agla round: zyada gehrai aur 4 km door naye ilaqe, 5 rounds tak. Goal pura hone par notification
- **Find by product:** "hair oil" likhein, chunein "main bechta hoon" (kharidne/rakhne wali dukanein, salons, distributors) ya "mujhe chahiye" (suppliers, wholesalers), shehar aur kitni leads. AI sahi business types chun kar search chalata hai

Phase 19 se update:
```
npm install
npx prisma db push
```

## Phase 19: Quality aur Reliability (app khud apni ghaltiyan pakarti hai)

- **Super Admin > Errors:** server aur browser dono ke crash khud record hote hain: kya error, kis page par, kitni dafa, pehli aur aakhri dafa kab. "Copy" se poori tafseel copy kar ke developer/chat mein bhejein. "Fixed" karne ke baad dobara ho to khud wapas khul jata hai
- **Super Admin > System > Self-test:** ek click mein 13 checks: database, database ki sehat, tables, engine, background jobs, security key, APP_URL, SMTP, AI, internet, OpenStreetMap, disk space, open errors. Har fail par "Fix:" mein kya karna hai
- **Maintenance:** purane notifications/emails/rank checks/logs saaf karna (leads kabhi nahi), aur database optimise
- **Behtar error screens:** koi page toote to safed screen ki jagah "Something went wrong" aur "Try again", aur error khud report

Phase 18 se update:
```
npm install
npx prisma db push
```

## Phase 18: Rank tracker, Websites + hosting, Review tools

- **Google Maps rank tracker (naya page):** apni leads mein se business chunein, search likhein (jaise "dentist"), 3x3 ya 5x5 grid aur faasla. Har nuqta ek asli Maps search hai (engine chalna chahiye). Naqshe par rang: hara 1-3, peela 4-10, narangi 11-20, laal 20+. Average rank aur notification. Credits: har nuqta 1
- **Websites (naya page):** lead ke AI demo se "Publish as a website". AI se tabdeeli ("rang neela karo", "Sunday 10-4 likho"), ya khud HTML. Live/Draft, address `/s/naam`, visits ki ginti, aur business ka apna domain (CNAME, live server par). Website par scripts band (hifazat)
- **Review tools (lead panel):** review link aur QR code (customer scan kare to seedha Google review), har hafte reviews ki nigrani (naye review, rating girna, bura review par notification), customers ka private feedback, aur har review ke neeche "Write a reply (AI)"
- Super Admin > Features mein teeno ke on/off: Rank tracker, Websites and hosting, Review tools

Phase 17 se update:
```
npm install
npx prisma db push
```

## Phase 17: Super Admin, Lead Signals, naye sources, white theme

**Super Admin (har cheez ka control):**
- Naam "Admin" se "Super Admin"
- **Features tab:** har feature (Watches, Website checks, Web extractor, OpenStreetMap, Pipeline, WhatsApp inbox, Campaigns, Email outreach, Templates, Team, API, Lead signals, Demos/proposals) ko sab ke liye on/off, ya sirf chune hue plans (Free bhi) ke liye. Band feature menu se ghayab, aur page kholne par "plan mein nahi"
- **Settings:** platform ka naam, main rang, landing page ki headline aur sub-headline, sab dynamic

**White theme:** ab app default safed (light) professional theme mein khulti hai. Dark Settings mein

**Lead Signals ("Why now"), lead panel aur Leads filter/badges mein:**
Busy (Google popular times), Recently opened, Social page as website, Runs ads (Pixel/Google Ads), Mobile number, Has branches, Domain expiring, Owner name known, Rating dropped, New bad review. Saath mein: rabte ka behtar waqt, website kis ne banayi, domain kab khatam. Signals score mein bhi
- Purani leads dobara search/watch mein aayein to rating girne ya naye bure review par notification
- Pipeline par "Find more like my wins": jeete hue clients jaisi categories aur shehron ki nayi search

**Naye sources:**
- **OpenStreetMap:** Searches page par, shehar + business type, foran results (engine ki zaroorat nahi)
- **Domain expiry:** website check ke dauran (jahan registry batati ho)
- **Technology filter:** Leads mein "Any technology" (WordPress, Shopify, Wix...)

Phase 16 se update:
```
npm install
npx prisma db push
```
Purani leads ke signals ke liye ek dafa website checks chalayein, ya nayi searches.

## Phase 16: Official WhatsApp, Instagram, SMS provider, LinkedIn/Facebook pages

- **WhatsApp inbox (naya page):** Meta ki official WhatsApp Cloud API. Customer apna WhatsApp Business number jorta hai (Phone number ID, Business Account ID, token). Webhook address aur verify token app dikhati hai, woh Meta app mein lagana hai. Phir:
  - leads ke WhatsApp jawab app mein, poori team ke liye ek inbox; naya number message kare to lead khud ban jati hai
  - 24 ghante ke andar seedha jawab; us ke baad sirf approved template
  - lead panel se "Send from WhatsApp Business"
- **Automatic campaigns (opt-in waale):** Campaigns mein do naye channel: "WhatsApp Business, automatic" (approved template) aur "SMS provider, automatic". Sirf un leads ko jo "Agreed to receive messages" hon. Pause/Resume
- **Opt-in:** lead panel mein "Agreed to receive WhatsApp/SMS messages". WhatsApp Business par khud message karne wale khud opt-in
- **Instagram (official):** Settings mein apna Instagram Business account jorein. Website checks ke dauran aur lead panel se "Check": followers aur posts
- **SMS provider:** Settings mein kisi bhi PTA-registered SMS company ya Android SMS gateway app ka web address ({to}, {message} ke saath), test SMS. Sirf opt-in leads
- **Chrome extension:** ab LinkedIn company pages aur Facebook business pages se bhi ek click mein save (groups aur personal profiles nahi)

Phase 15 se update:
```
npm install
npx prisma db push
```
Chrome extension: chrome://extensions par "Reload" dabayein.

## Phase 15: Deals band karne ke tools

Lead panel ka naya hissa **"Win this deal"**:
- **AI website demo:** jis business ki website nahi ya kharab hai, us ke liye AI ek homepage design karta hai (us ka naam, kaam, asli reviews, phone/WhatsApp button). Public link copy hota hai. Business link khole to aap ko notification
- **AI proposal + Accept:** qeemat aur waqt daalein, AI ek page ki proposal likhta hai (English/Roman Urdu/Urdu). Link par business "Accept proposal" dabaye to lead khud Won aur aap ko notification. Kholne par bhi notification

Aur:
- **Nearby competitors:** 5 km ke andar usi kism ke sab se achhe businesses (aap ki apni leads mein se), rating aur reviews ke muqable ke saath, aur message ke liye tayyar line
- **Google profile check:** website, phone, auqat, description, photo, reviews ki ginti, rating, unhappy reviews: kya kami hai aur kyun zaroori
- **Where the openings are (Website checks page):** kin ilaqon mein sab se zyada businesses ki website nahi ya kamzor hai
- **Learn from my wins (Pipeline):** aap ke Won/Lost deals se seekh kar jo categories zyada bikti hain un ka score barhta hai (Won/Lost karne par bhi khud seekhta hai)
- **Google Sheets (Settings):** ek formula se Google Sheet aap ki leads ke saath sync (live server par)

Phase 14 se update:
```
npm install
npx prisma db push
```

## Phase 14: Admin ke liye sab leads, WhatsApp/SMS campaigns

- **Admin > Leads:** har customer ki har lead ek jagah. Filters: customer, category, shehar/area, status, phone/email/website hai ya nahi, source, rating, tareekh se tareekh. Page ya "Select all N matching", Export CSV (customer ke naam ke saath), Delete (DELETE likh kar tasdeeq). Har kaam Activity log mein
- **Admin > Users > View and edit:** ab naya password khud rakh sakte hain (purana dikh nahi sakta, sirf badal sakte hain), business ka naam aur "what they sell" bhi edit
- **WhatsApp & SMS campaigns (naya page):** filters se leads chunein (ya Leads page par select kar ke "WhatsApp/SMS campaign"), 5 tak message versions (A, B, C...) jo baari baari lagte hain. Phir ek ek lead: message tayyar khulta hai WhatsApp ya phone ke SMS mein, aap Send dabate hain, app agli lead dikhati hai. Har version ke replies ka hisaab. 24 ghante mein 40 se zyada par yaad-dihani
- **SMS button:** Leads table aur lead panel ke composer mein SMS (phone ki messages app khulti hai)

Phase 13 se update:
```
npm install
npx prisma db push
```

## Phase 13: Tags, System, Card payments, White-label

- **Tags:** har lead par tags (#hot, #clinic, #call-friday). Lead panel mein tag likh kar Enter. Leads par select kar ke "Tag"/"Untag". Tag filter, aur table mein tag par click se wahi leads. Export mein bhi
- **Admin > System:** engine, background jobs, SMTP, AI, mailboxes ki halat (hara/laal), kitni searches/website checks/emails line mein hain, database ka size, aur **"Download backup"** (poore database ki copy)
- **Card payments (international, optional):** Lemon Squeezy ke zariye. `.env` mein LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID, LEMONSQUEEZY_WEBHOOK_SECRET; har plan mein "Card payment variant ID". Billing par "Pay by card", payment hote hi plan khud on (approve ki zaroorat nahi). Webhook: `https://aapka-domain/api/webhooks/lemonsqueezy` (events: order_created, subscription_payment_success)
- **White-label (Agency plan):** agency Settings > Branding mein apna domain daalti hai (jaise leads.agency.com) aur DNS mein CNAME aapke domain par. Us address par app agency ke naam aur rang mein khulti hai, landing page nahi, aur signup sirf invite se. SSL khud (Caddy on-demand). `.env` mein WHITELABEL_TARGET = aapka main domain

Phase 12 se update:
```
npm install
npx prisma db push
```
Purane plans mein Admin > Plans > Agency kholein aur "Include white-label" on karein.

## Phase 12: Kamai barhane aur pro tools

- **Coupons:** Admin > Coupons mein code banayein (jaise LAUNCH20: 20% off, ya fixed raqam), kis plan par, kitni dafa, kab tak. Customer Billing par code daal kar kam qeemat dekhta hai
- **Referral program:** har user ka apna invite link (Billing page par, WhatsApp share button ke saath). Us link se aaya banda jab pehli payment kare to bulane wale ko credits (Admin > Settings: Referral reward, default 300)
- **Invoices:** har approved payment ki invoice (number, discount, total). "Print or save as PDF". Apni business details Admin > Settings mein
- **Activity log (Admin):** har admin kaam ka record: payment approve/reject, user edit/delete, "Open the app as", plans, settings, coupons
- **Phone call:** lead panel mein "Phone call": ek click se call, AI call script (Roman Urdu/Urdu/English: shuruaat, sawal, pitch, etraz ke jawab, voicemail), aur call ka nateeja save (Talked, Interested, No answer...) follow-up ke saath. Stage khud badalta hai
- **Monday digest email:** har hafte owners ko khulasa: nayi leads, contacted/interested/won, follow-ups, aur 5 best leads
- **App ki tarah install (PWA):** live (https) par phone/computer par "Install app" se home screen icon

Phase 11 se update:
```
npm install
npx prisma db push
```

## Phase 11: Reviews insights aur Email outreach

**Reviews:**
- Nayi searches har business ke Google reviews (8 tak, ya "Collect more reviews" se 20 tak), stars ki taqseem, description aur khulne ke auqat save karti hain
- Lead panel mein "Reviews": 1-5 star bars, reviews ki list, aur **"What do customers say? (AI)"**: customers kis cheez ki shikayat karte hain, kya pasand karte hain, aap kaise madad kar sakte hain, aur ek opening line
- AI brief ab reviews ki shikayatein bhi istemal karta hai
- Leads filter: "Unhappy reviews" (2 ya zyada 1-2 star reviews)

**Email outreach** (naya page "Email outreach", Pro/Agency plans; Admin > Plans mein "Include email outreach"):
- **Mailboxes:** customer apni Gmail/Outlook/Zoho/Hostinger ya koi bhi SMTP email jorta hai (password encrypted save hota hai, jorne se pehle check hota hai)
- Har mailbox ki roz ki had (20-150) aur do emails ke darmiyan waqfa, taake inbox mein jayein aur account band na ho
- **Sequences:** pehli email + 5 tak follow-ups ("3 din baad jawab na aaye to..."). Tayyar 3-email sequence. {{name}}, {{problem}} jaisi cheezein khud bharti hain
- Leads page par select kar ke **"Start sequence"**
- Lead panel ke composer se **"Send from mailbox"** (seedhi email)
- Khud rukta hai: jawab aaye ("They replied" ya reply assistant), lead Interested/Won/Lost ho, unsubscribe kare, ya email bounce ho
- Har email mein unsubscribe link (zaroori, hataya nahi ja sakta); unsubscribe/bounce wale kabhi dobara email nahi paate
- **Outbox:** waiting, sent, failed (retry), cancel; optional open tracking
- **Do not email:** list jismein unsubscribed, bounced aur haath se daale gaye addresses

Emails har minute background mein jati hain jab app chal rahi ho (server par cron se 24 ghante).

Phase 10 se update:
```
npm install
npx prisma db push
```

## Phase 10: Emails (SMTP) aur Admin users

**Emails** (`.env` mein SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, APP_URL bharein; khaali hon to emails terminal mein print hoti hain):
- Signup par welcome + email confirm link; confirm na ho to app ke upar yaad-dihani aur "Resend"
- "Forgot password" par email mein reset link (1 ghante ke liye, ek dafa)
- Team invite khud email mein
- Payment: customer ko "mil gayi", "plan on" ya "reject (wajah)"; aap ko nayi payment ka alert (ADMIN_ALERT_EMAIL)
- Plan khatam hone se 3 din pehle yaad-dihani
- Watch naye businesses dhoonde to email (Settings se band ho sakti hai)
- Admin > Settings: SMTP ki halat aur "Send a test email"

**Admin > Users** (naya):
- Sab log: owners aur team members, filters (paying, blocked, email not confirmed) ginti ke saath, page by page
- Har user par "View and edit": naam, email, role (Admin bhi bana sakte hain), credits (seedhe set), plan aur us ki aakhri tareekh, email confirmed
- Stats: leads, searches, bheje gaye messages, aakhri login, team, payments
- "Open the app as this person": customer ki jagah app dekhein (support ke liye), upar banner se wapas admin
- Reset password, block/unblock, delete

Phase 9 se update:
```
npm install
npx prisma db push
```

## Phase 9: Aakhri kaam (finishing)

- **Light/dark theme:** Settings > Appearance, ya Ctrl+K
- **Command menu (Ctrl+K):** kisi bhi page par jayein, action chalayein, ya lead ka naam likh kar dhoondein
- **Leads khud add karein:** Leads page par "Add": ek lead haath se, ya apni Excel/CSV list import (2,000 tak, credits nahi lagte)
- **Get set up checklist:** naye user ke Dashboard par 4 qadam (offer likhna, pehli search, website check, pehla message)
- **Your data:** Settings mein apna saara data download karna, aur account delete karna
- Admin ke top bar mein "Free plan" ki jagah "Admin"

Phase 8 se update: sirf files Replace karein aur `npm install`. Database mein koi tabdeeli nahi, lekin `npx prisma db push` chalane se nuqsan bhi nahi.

## Phase 8: AI features aur aakhri cheezein

- **AI brief:** lead ke panel mein, us business ke baare mein mukhtasar: kya karta hai, kya chahiye hoga, kaise baat shuru karein, kya etraz karega aur us ka jawab, rabte ka behtar tareeqa
- **Reply assistant:** "They replied?" mein prospect ka jawab paste karein. AI batata hai woh kya chahta hai (interested, price, baad mein, nahi), stage aur follow-up suggest karta hai, aur usi zaban (Roman Urdu/Urdu/English) mein jawab likhta hai
- **AI search planner:** "Plan searches with AI" mein likhein "main South Punjab ke clinics ko websites bechta hoon", AI search lines bana deta hai
- **Ask AI (Leads):** "Multan ke clinics jin ki rating achhi hai lekin website nahi" likhein, AI filters laga deta hai
- **Bulk AI messages:** 25 tak leads select karein, "Write messages", har ek ke liye alag personal message. Lead kholne par tayyar milta hai, aur CSV export mein bhi
- **Privacy policy aur Terms:** /privacy aur /terms pages, Admin > Settings se text badlein, signup par "I agree" checkbox
- **AI ki had:** har account ke roz ke AI actions par had (`AI_DAILY_LIMIT`), taake kharcha qaboo mein rahe

Phase 7 se update:
```
npm install
npx prisma db push
```

## Phase 7: Live karna

Poori guide: **DEPLOY.md** (Roman Urdu, step by step). Mukhtasar:
- `Dockerfile` app ke liye, `deploy/docker-compose.yml` mein app + engine + Caddy (free SSL) + cron + roz ka backup
- Production mein bhi SQLite (WAL mode ke saath), ek server ke liye kaafi
- Hifazat: login/signup/API rate limits, private network par website checks band (SSRF), security headers, `ADMIN_EMAIL`
- `/api/health` se halat check

## Phase 6 mein naya

- **Watches:** search ko schedule par dohrayein (roz, hafta, maheena). Naye khule businesses milne par notification
- **Notifications:** top bar mein ghanti, watches ke nataij aur masail
- **Branded website report:** lead ke panel mein "Share report", ek public link jis par us business ki website ki report aapke brand ke naam aur rang ke saath, aur aapse WhatsApp karne ka button. Branding: Settings mein
- **Public API:** /api/v1/leads, /api/v1/searches (API key ke saath)
- **Webhooks:** nayi leads, search khatam, stage change par aapke server/Zapier/Make/n8n ko POST (HMAC signature ke saath)
- **Chrome extension:** `extension` folder. Google Maps par kisi business par ek click se lead save
- API/webhooks/extension sirf un plans par jin mein "API" on hai (Admin > Plans). Purane database mein Agency plan par yeh khud on karna hoga

Chrome extension lagana: chrome://extensions > Developer mode on > Load unpacked > `extension` folder chunein.

Server par (Phase 7) har 5 minute yeh chalana hoga: `curl "https://aapka-domain/api/cron?secret=CRON_SECRET"`

Phase 5 se update:
```
npm install
npx prisma db push
```

## Phase 5 mein naya (bechne wala hissa)

- **Landing page:** `localhost:3000` par ab public website hai (logged out hon to), pricing database se aati hai
- **Plans:** Starter, Pro, Agency (naam, qeemat, credits, seats, AI sab Admin panel se badal sakte hain)
- **Payments:** customer JazzCash / Easypaisa / bank se pay kar ke Transaction ID deta hai, aap Admin panel se Approve karte hain, plan 30 din ke liye on aur credits add
- **Team:** owner invite link banata hai (WhatsApp par bhej dein), member join kar ke wahi leads istemal karta hai. Seats plan ke hisaab se
- **Lead assignment:** lead kisi team member ko assign karein, "Assigned to me" filter
- **Admin panel** (sirf aap): customers, payments approve/reject, credits add/kam, plan manually on, block/unblock, password reset, plans editor, payment instructions, support WhatsApp, signup credits
- **AI features** sirf un plans par jin mein AI on hai (admin ke liye hamesha on)
- **Password:** Settings mein password badlein; "Forgot it?" page support WhatsApp par bhejta hai, admin temporary password bana deta hai

Pehli dafa: Admin > Settings mein apni payment details aur support WhatsApp number zaroor daalein.

Phase 4 se update:
```
npm install
npx prisma db push
```

## Phase 4 mein naya

- **Pipeline (Kanban):** New, Contacted, Interested, Won, Lost. Cards ko drag kar ke stage badlein
- **Lead score (0-100):** rabta kitna aasan hai + kitni zaroorat hai + business kitna active hai. "Best leads first" sorting
- **Message templates:** WhatsApp aur email templates, {{name}}, {{city}}, {{problem}} jaisi cheezein khud bharti hain. 3 tayyar templates pehle se
- **AI message writer:** har lead ke liye alag personal message, English, Urdu ya Roman Urdu mein (ANTHROPIC_API_KEY chahiye)
- **Send:** "Open in WhatsApp" message ke saath chat kholta hai, aap khud Send dabate hain. Email app bhi khulti hai
- **Notes aur history:** har lead par notes, aur har message/stage change ka record
- **Follow-ups:** tareekh set karein, Dashboard aur Pipeline par "aaj follow up" nazar aata hai
- **Deal value:** har lead ki raqam, Pipeline mein har stage ka total
- **Settings:** aapka naam, business, aap kya bechte hain (AI isi ko istemal karta hai), signature

Phase 3 se update:
```
npm install
npx prisma db push
```

## Phase 3 mein naya

- **Website checks:** har lead ki website se emails, aur phone numbers, Facebook/Instagram/LinkedIn wagaira nikalna
- **Email check:** email ke domain par mail aa sakti hai ya nahi (MX check)
- **Website audit:** score 0-100, aur masail: website band, "Not secure", mobile-friendly nahi, slow, Google description nahi
- **Sales openings:** Website checks page par seedha list ke kin businesses ko website/SEO ki zaroorat hai
- **Built with:** website WordPress, Shopify, Wix wagaira par bani hai, Facebook Pixel / Google Analytics laga hai ya nahi
- **Web extractor (AI):** kisi bhi public directory page ka link dein, us par listed businesses leads ban jate hain
- **Lead details:** lead ke naam par click se side panel, saari maloomat ek jagah
- Search ke saath "Check websites as leads arrive" option, aur bulk "Check websites"
- robots.txt ka khayal rakha jata hai (jo websites mana karti hain unhein nahi parha jata)

Web extractor ke liye `.env` mein `ANTHROPIC_API_KEY` daalein (console.anthropic.com se). Iske bina baqi sab chalega.

Phase 2 se update:
```
npm install
npx prisma db push
```

## Phase 2 mein naya

- **Live leads:** search chalte waqt hi leads aani shuru ho jati hain, khatam hone ka intezar nahi
- **Map view:** Leads page par "Map" tab, har lead map par (rang status ke hisaab se)
- **Bulk actions:** kai leads select kar ke ek saath status badlein, export ya delete karein
- **Saved views:** filters ka set naam ke saath save karein, ek click mein wapas lagayein
- **Naye filters:** category, kam az kam reviews

Phase 1 se update karte waqt yeh dono commands zaroor chalayein:
```
npm install
npx prisma db push
```

## Zaroori cheezein (sirf aik dafa)

1. **Node.js LTS** install karein: https://nodejs.org (LTS wala button). Install ke baad VS Code band kar ke dobara kholein.
2. Check karein: terminal mein `node -v` likhein, version aana chahiye.
3. Go aur scraper project aapke paas pehle se hain.

## Setup

1. Yeh zip extract karein, jaise `D:\leadatlas`
2. VS Code mein `File > Open Folder` se `D:\leadatlas` kholein
3. Terminal (Ctrl + `) mein yeh commands ek ek kar ke chalayein:

```
copy .env.example .env
npm install
npx prisma db push
```

4. `.env` file kholein aur `AUTH_SECRET` ki value ko koi lambi random line bana dein (kam az kam 32 characters).

## Chalana (har dafa)

Do terminals chahiye. VS Code terminal mein upar `+` daba kar doosra terminal khul jata hai.

**Terminal 1 — scraping engine:**
```
cd D:\google-maps-scraper-main
go run main.go
```
`visit http://localhost:8080` aa jaye to yeh terminal khula chhor dein.

**Terminal 2 — dashboard:**
```
cd D:\leadatlas
npm run dev
```
Phir browser mein **http://localhost:3000** kholein, account banayein (pehla account admin hoga) aur Searches mein jaa kar pehli search karein.

Top bar mein hara nuqta ("Engine online") ka matlab hai dono hisse jud gaye hain.

## Aam masail

| Masla | Hal |
|---|---|
| "Engine offline" | Terminal 1 mein `go run main.go` chal raha hona chahiye |
| `npm` not recognized | Node.js install karein, VS Code dobara kholein |
| AUTH_SECRET error | `.env` mein `AUTH_SECRET` lambi (32+ characters) rakhein |
| Database error | `npx prisma db push` dobara chalayein |
| Data dekhna ho | `npx prisma studio` (database browser mein khul jata hai) |

## Folder structure

```
prisma/schema.prisma      Database tables (User, Job, Lead)
src/lib/engine.ts         Go engine se baat karne wala code
src/lib/jobs.ts           Search ka status check aur CSV import
src/app/api/...           Backend API routes
src/app/(auth)/...        Login / signup pages
src/app/(app)/...         Dashboard, Searches, Leads pages
src/components/...        UI components
```

## Agle phases

2. Leads manager: saved filters, map view, bulk actions, Excel export
3. Enrichment: website crawler, AI extractor, email verification, website audit
4. Sales: pipeline (kanban), AI message writer, templates, reminders (mukammal)
5. Business: team/workspaces, plans, payments, admin panel, landing page (mukammal)
6. Advanced: watches, notifications, API/webhooks, branded reports, Chrome extension (mukammal)
7. Deployment: Docker, VPS, domain, SSL, backups (mukammal, dekhein DEPLOY.md)

## License

Scraping engine: gosom/google-maps-scraper (MIT License, Copyright (c) 2023 Georgios Komninos).
Is ka license notice apne product ke saath rakhna zaroori hai.
