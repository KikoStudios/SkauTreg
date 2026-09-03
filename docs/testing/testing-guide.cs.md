# Testovací Návod (CZ)

## 1) První fix pro chybu `next is not recognized`

Spusť v rootu projektu:

```bash
npm install
```

Pak znovu:

```bash
npm run dev
```

Pokud běží i backend, ve druhém terminálu:

```bash
npx convex dev
```

## 2) Smoke test

- Přihlášení/odhlášení funguje.
- Dashboard se načte.
- CRUD členů funguje.
- CRUD výprav funguje.
- RSVP odkazy fungují.

## 3) Email + SMTP test

- Propojení Gmail SMTP v nastavení projde s platným heslem aplikace.
- Neplatné přihlašovací údaje se neuloží.
- Draft e-mailu lze vytvořit/upravit/smazat.
- Vedoucí může odeslat, ne-vedoucí ne.
- `<user.name>` a `<user.sign.link>` se správně nahradí.

## 4) LIVE meeting test

- Session jde spustit/ukončit.
- Dva uživatelé vidí realtime změny.
- Presence seznam se aktualizuje.
- Replay funguje.

## 5) Rychlá diagnostika

- Pokud znovu vidíš `next is not recognized`, dependencies nejsou nainstalované nebo se instalace přerušila.
- Ověř `node_modules` po `npm install`.
