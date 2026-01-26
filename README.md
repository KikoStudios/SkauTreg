# SkauTreg

SkauTreg je moderní aplikace pro komplexní správu skautských oddílů. Cílem je usnadnit vedoucím každodenní veci od správy členů, přes plánování výprav, až po řešení docházky a registrací. Vše je navrženo jednoduše a přehledně.

## Jak to funguje (Technologie)

Aplikace je navržena jako **serverless** řešení, což znamená, že nemusíme spravovat vlastní servery. To nám umožňují nástroje jako:

*   **Next.js** - pro rychlé a interaktivní uživatelské rozhraní.
*   **Convex** - slouží jako náš backend a realtime databáze.
*   **Clerk** - zajišťuje bezpečné přihlašování a správu uživatelů.

## Feature Implementation Checklist

Zde je přehled funkcí. Ty, které jsou již hotové, jsou zaškrtnuté.

- [x] **Autentifikace** (Přihlášení/Registrace přes Clerk)
- [x] **Dashboard** (Hlavní přehled)
- [x] **Správa členů** (Seznam a detaily členů)
- [x] **Správa oddílu** (Informace o oddílu, vedení)
- [x] **Výpravy** (Vytváření a správa akcí)
- [x] **Kalendář** (Přehled akcí v čase)
- [x] **RSVP systém** (Veřejné odkazy pro přihlašování/odhlašování na akce)
- [x] **Nastavení** (Uživatelské preference)
- [ ] 
- [ ] 
- [ ] 

*(Další funkce doplňujte sem...)*


## Jak aplikaci spustit

Pro spuštění aplikace na vašem počítači postupujte následovně:

1.  **Nainstalujte potřebné balíčky:**
    ```bash
    npm install
    ```

2.  **Nastavte prostředí:**
    Ujistěte se, že máte vytvořený soubor `.env.local` a v něm nastavené klíče pro Clerk a Convex (např. `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CONVEX_DEPLOYMENT` atd.).

3.  **Spusťte vývojové prostředí:**
    Aplikace vyžaduje běh dvou procesů současně. Otevřete si dva terminály:

    *V prvním terminálu (běží frontend):*
    ```bash
    npm run dev
    ```

    *V druhém terminálu (běží backend/databáze):*
    ```bash
    npx convex dev
    ```

4.  Aplikace poběží na adrese [http://localhost:3000](http://localhost:3000).


## Kontribuce

Chcete se zapojit do vývoje? Budeme rádi!
1. Forkněte si repozitář.
2. Vytvořte si vlastní větev pro vaši úpravu.
3. Po dokončení odešlete Pull Request.
4. Pro nahlášení chyb nebo nápadů využijte sekci Issues.
