# LeadAtlas ko internet par live karna (Phase 7)

Is guide ke aakhir mein aapki website `https://aapka-domain.com` par chal rahi hogi, SSL (taala) ke saath,
roz ka backup, aur watches 24 ghante chalti rahengi.

> **Pehle local test mukammal karein.** Jo cheez aapke computer par nahi chalti, server par bhi nahi chalegi.

## 1. Kya chahiye

| Cheez | Mashwara | Andaza |
|---|---|---|
| VPS server | **Ubuntu 24.04, kam az kam 4 GB RAM, 2 CPU** (scraper Chromium chalata hai, 2 GB kaafi nahi) | Hetzner CX22 / Contabo / DigitalOcean: takreeban $5 se $24 maheena |
| Domain | Namecheap, GoDaddy, ya .pk ke liye PKNIC | $10 se $15 saal |
| Aapke computer par | WinSCP (files bhejne ke liye) aur PowerShell (ssh ke liye) | free |

## 2. Domain ko server se jorein

Domain company ki website par DNS settings mein:
- `A` record: naam `@`, value = aapke server ka IP
- `A` record: naam `www`, value = wahi IP

Is mein 5 minute se kuch ghante lag sakte hain.

## 3. Server tayyar karein

PowerShell kholein:
```
ssh root@SERVER_IP
```
Server par yeh chalayein (ek ek kar ke):
```
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw --force enable
mkdir -p /opt/leadatlas
```

## 4. Files bhejein

WinSCP se server par login karein aur yeh folders `/opt/leadatlas/` mein bhejein:
```
/opt/leadatlas/            <- leadatlas folder ka saara maal (node_modules aur .next ke ILAWA)
/opt/leadatlas/deploy/engine/   <- google-maps-scraper-main folder ka saara maal
```
Yaani scraper ke folder ko `deploy` ke andar `engine` naam se rakhna hai.

## 5. Settings (.env)

Server par:
```
cd /opt/leadatlas/deploy
cp .env.example .env
openssl rand -hex 32     # is ka jawab AUTH_SECRET mein daalein
openssl rand -hex 32     # is ka jawab CRON_SECRET mein daalein
nano .env
```
`DOMAIN`, `ACME_EMAIL`, `AUTH_SECRET`, `CRON_SECRET`, `ADMIN_EMAIL`, `APP_URL` (https://aapka-domain.com) aur SMTP wali lines zaroor bharein. Save: `Ctrl+O`, Enter, `Ctrl+X`.

> `.env` server par `nano` se hi likhein. Windows par likh kar bhejne se line endings kharab ho sakti hain.

## 6. Chalu karein

```
cd /opt/leadatlas/deploy
docker compose up -d --build
```
Pehli dafa 5 se 15 minute lagenge (sab kuch build hota hai). Phir:
```
docker compose ps          # sab "running" / "healthy" hon
docker compose logs -f app # app ke messages (Ctrl+C se bahar)
```
Browser mein `https://aapka-domain.com` kholein.

## 7. Foran yeh karein

1. **Register karein usi email se jo `ADMIN_EMAIL` mein hai.** Woh account Admin banega.
2. Admin > Settings: payment details aur support WhatsApp number.
3. Admin > Plans: qeematein check karein, Agency par "API" on.
4. Ek choti search chala kar dekhein ke engine kaam kar raha hai.

## White-label aur card payments (optional)

- **White-label:** `.env` mein `WHITELABEL_TARGET` ko apna `DOMAIN` rakhein. Agency apne domain ka CNAME isi par point karegi. Caddyfile mein iska intezam pehle se hai: certificate sirf unhi domains ka banta hai jo kisi agency ne app mein jore hon.
- **Card payments:** Lemon Squeezy account, store aur har plan ka product/variant banayein. Webhook URL `https://aapka-domain/api/webhooks/lemonsqueezy`, events `order_created` aur `subscription_payment_success`. Keys `.env` mein, variant IDs Admin > Plans mein.

## Roz ka kaam

| Kaam | Command (`/opt/leadatlas/deploy` mein) |
|---|---|
| Halat dekhna | `docker compose ps` |
| Errors dekhna | `docker compose logs --tail=100 app` ya `engine` |
| Restart | `docker compose restart` |
| Naya version lagana | nayi files bhejein, phir `docker compose up -d --build` |
| Backups | `ls backups/` (roz ek file, 14 din tak) |

**Backup wapas lagana:**
```
docker compose stop app
cp backups/leadatlas-2026-10-20.db data/prod.db
docker compose start app
```
Backups ko kabhi kabhi WinSCP se apne computer par bhi copy kar lein.

## Aam masail

| Masla | Hal |
|---|---|
| Website nahi khulti | DNS abhi update nahi hua, ya `ufw` mein 80/443 band. `docker compose logs caddy` dekhein |
| SSL error | DOMAIN ghalat, ya DNS abhi server par nahi aata. www ka record na ho to Caddyfile se `www` wala hissa hata dein |
| "Engine offline" | `docker compose logs engine`. RAM kam ho to bara server lein |
| Searches mein 0 results | Google ne server ka IP rok diya ho sakta hai. `.env` mein `ENGINE_PROXIES` (residential proxies) lagayein |
| App band ho jati hai | `docker compose logs app`. Aksar `.env` mein `AUTH_SECRET` ghalat ya khaali |

## Hifazat (security)

- Scraper (engine) internet par khula nahi, sirf app us tak pahunchti hai. Isay `ports:` de kar bahar mat kholein.
- Login aur signup par had (rate limit) lagi hai, API par 120 request/minute.
- Website checks aur web extractor andar ke (private) network ke addresses nahi khol sakte.
- `.env` aur `data/` folder kisi ko na dein. Inmein aapke customers ka data aur secrets hain.

## Kab badalna hoga

SQLite database ek server par hazaron users tak theek chalta hai. Jab aap ko kai servers chahiye hon,
ya database alag rakhna ho, tab PostgreSQL par jaana ek alag kaam hoga.

## Bechne se pehle (qanooni)

- **Privacy policy aur Terms** website par lagayein (kisi wakeel se banwayein). Aap businesses ka data jama kar rahe hain.
- Google ki terms scraping ki ijazat nahi deti. Yeh khatra aap uthate hain. Customers se bulk spam na karwayein.
