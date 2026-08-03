# SkauTreg

SkauTreg je moderní aplikace pro správu skautských oddílů. Cílem je usnadnit vedoucím každodenní agendu: správu členů, plánování výprav, docházku, registrace a týmovou komunikaci.

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

## Technologie

- **Next.js**: frontend
- **Convex**: backend a realtime databáze
- **Clerk**: autentifikace a správa uživatelů
- **Browserless**: automatizace iDOS integrace (výhledově self-host)

## Rychlý start

1. Nainstalujte závislosti:
   ```bash
   npm install
   ```
2. Připravte `.env.local` podle `.env.example`.
3. Spusťte frontend:
   ```bash
   npm run dev
   ```
4. Ve druhém terminálu spusťte Convex:
   ```bash
   npx convex dev
   ```
5. Otevřete `http://localhost:3000`.

## Dokumentace

- Rozcestník: `docs/README.md`
- Testování (CZ): `docs/testing/testing-guide.cs.md`
- Testování (EN): `docs/testing/testing-guide.en.md`
