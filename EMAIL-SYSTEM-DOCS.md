# Email Communication System - Implementace

## Přehled Funkcí

Implementovali jsme komplexní systém komunikace přes e-mail pro SkautREG s následujícími funkcemi:

### 1. 🔐 Nastavení Oddílu - Gmail OAuth 2.0
**Funkce:** Bezpečné propojení oficiálního e-mailu oddílu

- **Kde:** Nastavení Oddílu → Gmail & Email
- **Autentizace:** Google OAuth 2.0 (aplikace nikdy nezná heslo)
- **Co se ukládá:**
  - E-mailová adresa oddílu (např. `info@vasoddil.cz`)
  - Refresh token pro Gmail API
  - Čas připojení a uživatel, který jej provedl
- **Oprávnění:** Pouze vlastník nebo hlavní vedoucí
- **Funkce:**
  - Propojit nový Gmail účet
  - Zobrazit připojený e-mail
  - Odpojit (vrátit se na globální GMAIL_SENDER)

#### Jak se propojit:
1. Přejděte na [Google OAuth Playground](https://developers.google.com/oauthplayground/)
2. V sekci "Input your own scopes" zadejte: `https://www.googleapis.com/auth/gmail.send`
3. Klikněte na "Authorize APIs" a přihlaste se
4. Skopírujte Refresh Token z kroku 2
5. Vložte token do nastavení Gmail oddílu

---

### 2. 📝 Příprava E-mailů - Draftování
**Funkce:** Decentralizovaná příprava konceptů

- **Kde:** Výprava → Záložka "E-maily"
- **Kdo může vytvářet:** Libovolný člen týmu (s přístupem k oddílu)
- **Co se vytváří:**
  - Nový koncept e-mailu s předmětem a tělem
  - Automatický seznam příjemců ze záložky "Členové"
  - Náhled počtu příjemců s e-mailem
  - Historii všech konceptů (včetně odeslaných)

#### Stavy konceptu:
- **Draft:** Připraven k editaci, lze upravit nebo smazat
- **Sent:** Odesláno, nelze upravit (jen pro historii)

#### Informace o příjemcích:
- Počet členů s e-mailem
- Počet členů bez e-mailu (budou přeskočeni)
- Dynamicky se počítá ze seznamu členů výpravy

---

### 3. 🏷️ Chytré Značky a Personalizace
**Funkce:** Dynamické generování přihlašovacích odkazů

#### Podporované značky:

```html
<!-- Unikátní odkaz na přihlášku příjemce -->
<user.sign.link>

<!-- Jméno člena -->
<user.name>

<!-- Starý formát (stále podporován) -->
@userlink
```

#### Jak fungují:
1. Při psaní e-mailu vložíte significanci (např. `<user.sign.link>`)
2. Při odesílání systém:
   - Přejde všechny příjemce
   - Pro každého rozpozná jehoAccessKey
   - Nahradí značku jeho unikátním odkazem na přihlášku
   - Nahradí `<user.name>` jeho jménem
3. Každý příjemce dostane e-mail s osobním odkazem

#### Příklad:
```
Ahoj <user.name>,

tady máš odkaz na přihlášku:
<user.sign.link>

Těšíme se na Tebe!
```

**Výsledek pro "Petr Novák":**
```
Ahoj Petr Novák,

tady máš odkaz na přihlášku:
https://skautreg.cz/rsvp/abc123xyz789

Těšíme se na Tebe!
```

---

### 4. ✅ Kontrola a Odesílání - Role Vedoucího
**Funkce:** Schvalovací proces s role-based permisemi

#### Oprávnění:
- **Vedoucí/Vlastník** - Přístup k tlačítku "Odeslat"
- **Ostatní** - Mohou vytvářet koncepty, ale ne odesílat

#### Proces:
1. Kdokoliv z týmu vytvoří koncept e-mailu
2. Vedoucí si ho může přečíst a editovat
3. Vedoucí klikne na "Odeslat"
4. Systém:
   - Ověří oprávnění (musí být vedoucí)
   - Zobrazí počet příjemců
   - Pošle e-maily přes Gmail API
   - Vrátí výsledky (počet odeslaných, chyby)
   - Označí e-mail jako "Sent"

#### Výsledky odesílání:
- ✅ Počet úspěšně odeslaných
- ⏭️ Přeskočeno (bez e-mailu)
- ❌ Chyby s detaily (které e-maily selhaly a proč)

---

## Schéma Databáze

### Tabulka: `troops`
```typescript
{
  // ... stávající pole ...
  gmailOAuth?: {
    email: string,           // info@vasoddil.cz
    refreshToken: string,    // OAuth refresh token
    connectedAt: string,     // ISO timestamp
    connectedBy: Id<"users"> // Uživatel, který propojil
  }
}
```

### Tabulka: `email_drafts` (nová)
```typescript
{
  _id: Id<"email_drafts">,
  tripId: Id<"trips">,        // Výprava, ke které patří
  subject: string,            // Předmět e-mailu
  body: string,               // HTML obsah s možnými značkami
  createdBy: Id<"users">,     // Kdo vytvořil
  createdAt: string,          // ISO timestamp
  updatedAt: string,          // ISO timestamp poslední úpravy
  status: "draft" | "sent",   // Stav
  sentAt?: string,            // Kdy bylo odesláno
  sentBy?: Id<"users">,       // Kdo odesílal
  recipientCount?: number,    // Počet odeslaných
}
```

---

## Backend API

### EmailDrafts Functions (`convex/emailDrafts.ts`)

#### `create(tripId, subject, body)` - Mutation
Vytvoří nový koncept e-mailu.

#### `update(id, subject?, body?)` - Mutation
Upraví existující koncept (jen pokud je draft).

#### `remove(id)` - Mutation
Smaže koncept (jen pokud je draft).

#### `listByTrip(tripId)` - Query
Vrátí všechny koncepty pro danou výpravu s info o tvůrcích.

#### `getById(id)` - Query
Vrátí detail jednoho konceptu.

#### `markAsSent(id, recipientCount)` - Mutation
Označí koncept jako odeslaný (volá se automaticky).

#### `getRecipients(tripId)` - Query
Vrátí seznam příjemců (členů s e-mailem) pro náhled.

### Troops Functions (rozšíření `convex/troops.ts`)

#### `connectGmail(troopId, email, refreshToken)` - Mutation
Propojí Gmail účet s oddílem.

#### `disconnectGmail(troopId)` - Mutation
Odpojí Gmail účet (vrátí se na globální).

### Mailer Functions (rozšíření `convex/mailer.ts`)

#### `sendFromDraft(draftId, baseUrl)` - Action
Odešle koncept jako e-maily všem příjemcům s personalizací:
- Přepíše `<user.sign.link>` unikátními odkazy
- Přepíše `<user.name>` jmény
- Ověří oprávnění (musí být vedoucí)
- Vrátí výsledky odesílání

#### `sendTripEmail(tripId, subject, body, baseUrl)` - Action (legacy)
Starší funkce pro přímé odesílání - stále funguje pro kompatibilitu.

---

## Frontend Komponenty

### `EmailDraftsTab` (`src/components/EmailDraftsTab.tsx`)
Komplexní komponenta pro správu e-mailů:
- Vytvoření nového konceptu
- Editace existujícího konceptu
- Náhled příjemců
- Odesílání s potvrzením
- Historie odeslaných e-mailů
- Chytré značky info box

**Props:**
```typescript
{
  tripId: Id<"trips">,
  isLeader: boolean  // Určuje viditelnost tlačítka "Odeslat"
}
```

### `GmailSettings` (`src/components/GmailSettings.tsx`)
Komponenta pro nastavení Gmail OAuth:
- Zobrazení připojeného e-mailu
- Propojení nového účtu
- Odpojení
- Pokyny pro OAuth
- Bezpečnostní info

**Props:**
```typescript
{
  troopId: Id<"troops">,
  isAuthorized: boolean  // Lze propojit jen vedoucí/vlastník
}
```

---

## Integrace do UI

### Trip Dashboard (`src/app/(dashboard)/trips/[tripId]/page.tsx`)
- Přidána nová záložka **"E-maily"**
- Zobrazuje `EmailDraftsTab` komponentu
- Ověřuje role pro `isLeader` prop

### Troop Settings (`src/app/(dashboard)/settings/[troopId]/page.tsx`)
- Přidána nová záložka **"Gmail & Email"**
- Zobrazuje `GmailSettings` komponentu

---

## Bezpečnost

### OAuth 2.0
- ✅ Refresh token se ukládá v DB a nikdy se nevystavuje na frontend
- ✅ Aplikace nikdy nezná heslo
- ✅ Scope je omezen na `gmail.send` (jen odesílání)
- ✅ Refresh token lze kdykoli zrušit v Google Účtu

### Role-Based Access
- ✅ Jen vedoucí/vlastník mohou odesílat e-maily
- ✅ Kdokoliv může vytvářet koncepty (k revizi vedoucím)
- ✅ Odesílání je zaznamenáno (kdo, kdy)

### Data Protection
- ✅ AccessKey zůstává vždy jedinečný (pro přihlášky)
- ✅ E-mail neobsahuje heslo nebo citlivé údaje
- ✅ Staré koncepty se neodstraňují (audit trail)

---

## Praktické Příklady

### Příklad 1: Běžný Workflow
```
1. Vedoucí jde do Nastavení → Gmail & Email
2. Propojí info@oddil.cz přes OAuth
3. Jde na výpravu
4. Klikne na "E-maily"
5. Člen "Petr" vytvoří koncept:
   "Ahoj <user.name>,\n\nOdkaz: <user.sign.link>\n\nMám se!"
6. Vedoucí si jej přečte
7. Klikne "Odeslat"
8. Systém pošle 25 e-mailů s personálními odkazy
9. Výsledek: 25 odesláno, 2 přeskočeno (bez e-mailu)
```

### Příklad 2: Vícenásobné Koncepty
```
- Koncept 1: "Pozvánka" (2.1.2026)
- Koncept 2: "Připomínka - Přihláška" (5.1.2026)
- Koncept 3: "Co si vzít" (10.1.2026)

Všechny jsou v historii, všechny byly odesílány.
```

### Příklad 3: Role-Based
```
Člen "Honza" vytvoří: "Pojď se přihlásit!"
Vedoucí "Pavel" si to přečte, edituje na: "Srdečně Vás zveme..."
Pavel klikne "Odeslat" → E-maily jdou s jeho schválením
```

---

## Testování

### Unit Tests
```typescript
// Test personalizace
expect(body.replace(/<user\.sign\.link>/g, userLink))
  .toContain(userLink);

// Test role-based
expect(() => sendFromDraft({ draftId, baseUrl }))
  .toThrow("Pouze vedoucí");
```

### E2E Scenario
1. Vytvořit výpravu se členy
2. Propojit Gmail
3. Vytvořit koncept e-mailu
4. Odesílat a ověřit:
   - Každý dostal e-mail
   - Odkaz je osobní (jiný pro každého)
   - Vedoucí to je schválil

---

## Troubleshooting

### Chyba: "Gmail token error"
→ Refresh token vypršel. Odpojte a znovu propojte účet.

### Chyba: "Nemáte oprávnění"
→ Nejste vedoucí. Požádejte vedoucího, aby odesílal.

### E-mail se neposlal jednomu členu
→ Pravděpodobně nemá e-mail v systému. Zkontrolujte záložku Členové.

### Značka `<user.sign.link>` se nenahradila
→ V databázi mohl chybět `accessKey`. E-mail se přeskočil.

---

## Budoucí Vylepšení

- [ ] Šablony e-mailů (save template)
- [ ] Plánované odesílání (scheduler)
- [ ] A/B testing (testy efektivnosti)
- [ ] Nový formát: `<group.leaders.emails>` (vedoucí z oddílu)
- [ ] Webový editor e-mailů (místo textarea)
- [ ] Sledování otevření (tracking pixels)
- [ ] Automatické e-maily (např. potvrzení přihlášky)

---

## Kontakt & Support

Jestliže máte otázky nebo problémy:
1. Zkontrolujte Bezpečnost sekci
2. Vyzkoušejte Troubleshooting
3. Kontaktujte správce SkautREG
