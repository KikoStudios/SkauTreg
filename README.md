# SkauTreg

SkauTreg je aplikace pro správu skautských oddílů postavená na Next.js, Convexu a Clerku. Obsahuje správu členů a výprav, RSVP, schůzky, dopravu, finance a integrační nástroje.

## Stav funkcí

- Stabilní: autentizace, dashboard, členové, oddíly, výpravy, kalendář, RSVP a nastavení.
- Beta: finance, sdílení dopravních dokladů, kolaborativní schůzky a centrum zpětné vazby.
- Beta funkce se řídí proměnnými `NEXT_PUBLIC_FEATURE_*` s hodnotou `off`, `beta` nebo `stable`.

## Lokální spuštění

1. Nainstalujte závislosti: `npm install`.
2. Zkopírujte `.env.example` do `.env.local` a doplňte lokální hodnoty.
3. Spusťte `npx convex dev`.
4. V druhém terminálu spusťte `npm run dev`.
5. Otevřete `http://localhost:3000`.

## Kontroly před vydáním

```bash
npm run typecheck
npm run lint -- --quiet
npm test
npm run test:e2e
npm run audit:prod
npm run build
```

Produkční build vyžaduje úplné právní, bezpečnostní a feature-stage proměnné popsané v `.env.example`. Testovací Clerk klíče, placeholder právní údaje, localhost callbacky a chybějící šifrovací klíč jsou v produkci odmítnuty.

## Bezpečné nasazení

- Vercel je jediný kanonický produkční a preview hosting. Produkce, staging a preview musí používat oddělené Clerk a Convex prostředí.
- `APP_ORIGIN` určuje kanonický původ RSVP odkazů v e-mailech; klient jej nesmí přepisovat.
- Nejdříve exportujte produkční Convex data a ověřte počet tabulek a checksum.
- Schéma a migrace nasazujte nejprve do stagingu.
- Migrace `003_secure_capabilities` a `004_encrypt_credentials` nejsou automatické; spouští je operátor po záloze a ověření počtů.
- `npm run deploy:convex` je explicitní produkční příkaz. Nespouští se jako součást buildu ani CI.
- Aplikační kód lze vrátit zpět; přidaná pole schématu se při rollbacku nemažou.

## Dokumentace

- Dokumentační rozcestník: `docs/README.md`
- Vývojové prostředí: `docs/developer/setup.md`
- Nasazení: `docs/developer/deployment.md`
- Testování: `docs/testing/testing-guide.md`
- Gmail OAuth, Google verification a schválení doménou skaut.cz: `docs/google-oauth-verification.md`

Právní text na `/privacy` a `/tos` musí před produkčním vydáním schválit odpovědná osoba nebo právník.

## Licence

Projekt je licencován pod licencí MIT. Viz `LICENSE`.
