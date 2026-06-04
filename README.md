# SkauTreg

SkauTreg je moderní aplikace pro správu skautských oddílů. Cílem je usnadnit vedoucím každodenní agendu: správu členů, plánování výprav, docházku, registrace a týmovou komunikaci.

## Language Variants

- Czech: `README.cs.md`
- English: `README.en.md`

## Hlavní funkce

### Hotovo
- [x] Autentifikace (Clerk)
- [x] Dashboard
- [x] Správa členů
- [x] Správa oddílu
- [x] Výpravy
- [x] Kalendář
- [x] RSVP systém (veřejné odkazy)
- [x] Nastavení
- [x] Integrace s databází základen
- [x] Integrace s IDOS
- [x] Mailing (propojení s Google Mail)
- [x] Rada management (zápisy z rad)

### Plánováno
- [ ] Management financí
- [ ] Kontrola návratnosti výpravy vůči dotacím
- [ ] Účtenky k výpravám
- [ ] Fotky/alba po výpravě
- [ ] Evidence plateb účastníků
- [ ] Git kontrola změn od roverů (schválení vedoucím)

### Backend roadmap
- [ ] Clerk self-host alternativa (SuperTokens nebo ConvexAuth)
- [ ] Browserless self-host

## Technologie

SkauTreg je navržen jako serverless aplikace.

- **Next.js**: frontend
- **Convex**: backend a realtime databáze
- **Clerk**: autentifikace a správa uživatelů
- **Browserless**: automatizace iDOS integrace (výhledově self-host)

## Rychlý start

1. Nainstalujte závislosti:
   ```bash
   npm install
   ```
2. Připravte prostředí:
   - vytvořte `.env.local`
   - doplňte proměnné podle `.env.example`
3. Spusťte frontend:
   ```bash
   npm run dev
   ```
4. V druhém terminálu spusťte Convex:
   ```bash
   npx convex dev
   ```
5. Otevřete `http://localhost:3000`.

## Dokumentace

- Dokumentační rozcestník: `docs/README.md`
- Testování (CZ): `docs/testing/testing-guide.cs.md`
- Testování (EN): `docs/testing/testing-guide.en.md`
- Deployment: `docs/developer/deployment.md`
- Uživatelská nápověda: `docs/user/getting-started.md`
- Developer setup: `docs/developer/setup.md`
- Testování: `docs/testing/testing-guide.md`

## Kontribuce

1. Forkněte repozitář.
2. Vytvořte feature branch.
3. Proveďte změny a otestujte je.
4. Otevřete Pull Request.
5. Chyby a nápady hlaste přes Issues.
