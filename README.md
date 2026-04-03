# SkauTreg

## What is SkauTreg?

**SkauTreg** is a modern, all-in-one web application for managing Czech Scout troops (_skautské oddíly_). It is designed to make everyday troop administration easier for Scout leaders by providing tools for:

- **Member management** — maintain complete member profiles, contact information, and guardian details
- **Trip & activity planning** — create and manage expeditions with transport coordination via IDOS integration
- **Calendar & attendance** — view all upcoming events and track participation
- **RSVP system** — public registration links for members to sign up or opt out of events
- **Email communication** — send emails directly from the app using Gmail OAuth or SMTP (Seznam, Centrum, O2)
- **Meeting notes (Rada)** — collaborative real-time note-taking for troop council meetings
- **Scout base database** — integrated lookup for Czech Scout base locations
- **Troop administration** — manage troop info, leadership hierarchy, and settings

The app is primarily in Czech and is built for the Czech Scout organization (_Junák – svaz skautů a skautek České republiky_).

---

SkauTreg je moderní aplikace pro komplexní správu skautských oddílů. Cílem je usnadnit vedoucím každodenní veci od správy členů, přes plánování výprav, až po řešení docházky a registrací. Vše je navrženo jednoduše a přehledně.

## Jak to funguje (Technologie)

Aplikace je navržena jako **serverless** řešení, což znamená, že nemusíme spravovat vlastní servery. To nám umožňují nástroje jako:

*   **Next.js** - pro rychlé a interaktivní uživatelské rozhraní.
*   **Convex** - slouží jako náš backend a realtime databáze.
*   **Clerk** - zajišťuje bezpečné přihlašování a správu uživatelů.
*   **Browserless** - atomatizace iDOS integrace **v budoucnu self hostable**

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
- [x] **Integrace s Databazi zakladen** na vyber zakladen
- [x] **Integrace s IDOS** na jednoduchy vyber jizdenek
- [ ] **Managment Financi** v jednoduche tabulce pro organizaci
- [ ] **Kontrola jestli se vyprava vyplati** vypocitat jestli se vuci dotacim vyprava vyplatí
- [ ] **Uctenky k vypravam**
- [ ] **Fotky** odkaz a videni alba na odkazech na prihlaseni po vyprave
- [ ] **Managment** kdo zaplatil vypravu a kdo ne s uležením toho komu zaplatil
- [x] **Mailing** posilani mailu z skautregu s pripojenim k google mailu
- [x] **Rada managment** zapisy z rad
- [ ] **Git kontrola** kdyz rover edituje casti veci musi bit accpnuty vedoucimy

## Backend 
- [ ] **Clerk self host alternativa** Idealne SuperTokens nebo ConvexAuth
- [ ] **Browserless selfhost** browserless se da self hostnout 
## Jak aplikaci spustit

Pro spuštění aplikace na vašem počítači postupujte následovně:

1.  **Nainstalujte potřebné balíčky:**
    ```bash
    npm install
    ```

2.  **Nastavte prostředí:**
    Ujistěte se, že máte vytvořený soubor `.env.local` se všemi požadovanými environment proměnnými. Viz `.env.example` pro seznam potřebných klíčů.

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
