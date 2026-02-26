# Systém aktualizací a oznámení

Komplexní systém pro správu verzí aplikace s automatickými oznámeními, changelog zobrazením a integrací se Supernotes.

## 📋 Přehled

Tento systém poskytuje:

1. **Automatické oznámení o nových verzích** - Uživatelé vidí pop-up, když je dostupná nová verze
2. **Changelog viewer** - Pěkně formátovaný zobrazovatel změn s možností sbalování sekcí
3. **Integrace se Supernotes** - Automatické stahování update logů z vašich Supernotes poznámek
4. **Admin panel** - Snadná správa verzí přes webové rozhraní
5. **Sledování uživatelů** - Systém pamatuje, kterou verzi už uživatel viděl

## 🚀 Jak to funguje

### Životní cyklus aktualizace

```
1. Vytvoříte update log v Supernotes (nebo manuálně)
   ↓
2. Synchronizujete verzi přes admin panel
   ↓
3. Nastavíte verzi jako aktivní
   ↓
4. Uživatelé automaticky vidí pop-up s aktualizací
   ↓
5. Po kliknutí na "Aktualizovat" se stránka reloadne
   ↓
6. Po reloadu se zobrazí changelog s detaily změn
```

## 📁 Struktura systému

### Convex Schema (Database)

**`app_versions`** - Tabulka verzí
- `version` - Číslo verze (např. "1.2.3")
- `releaseDate` - Datum vydání
- `isActive` - Aktivní verze (ta, kterou vidí uživatelé)
- `changelogMarkdown` - Markdown obsah changelogu
- `changelogHtml` - HTML verze (volitelné)
- `category` - "major" | "minor" | "patch" | "hotfix"
- `highlights` - Array hlavních novinek
- `supernotesCardId` - ID karty v Supernotes (pokud synchronizováno)

**`user_version_tracking`** - Sledování uživatelů
- `userId` - ID uživatele
- `lastSeenVersion` - Poslední viděná verze
- `lastSeenAt` - Kdy viděl
- `dismissedVersions` - Verze, které uživatel zavřel

### Backend Files

#### Convex Functions
**`convex/appVersions.ts`**
- `getCurrentVersion` - Získat aktivní verzi
- `getAllVersions` - Seznam všech verzí
- `getUserVersionTracking` - Zjistit, co uživatel viděl
- `checkForUpdates` - Zkontrolovat, jestli má uživatel novou verzi k dispozici
- `markVersionAsSeen` - Označit verzi jako viděnou
- `dismissVersion` - Zavřít notifikaci (nechtěj vidět)
- `createVersion` - Vytvořit novou verzi
- `setActiveVersion` - Nastavit aktivní verzi

#### API Routes
**`src/app/api/supernotes/updates/route.ts`**
- `GET` - Získat všechny update karty ze Supernotes
- `POST` - Získat detaily konkrétní karty

### Frontend Components

#### `src/components/UpdateNotification.tsx`
Hlavní komponenta pro oznámení o aktualizaci

**Funkce:**
- Kontroluje nové verze po načtení
- Zobrazuje pop-up s nabídkou reload
- Otevírá changelog modal
- Podporuje dismissing notifikací

**Props:** Žádné (používá Convex queries přímo)

#### `src/components/VersionAdmin.tsx`
Admin panel pro správu verzí

**Funkce:**
- Zobrazení všech verzí
- Manuální vytvoření verze
- Synchronizace ze Supernotes
- Nastavení aktivní verze

**Tabs:**
1. **Všechny verze** - Přehled verzí
2. **Vytvořit manuálně** - Formulář pro ruční vytvoření
3. **Synchronizovat ze Supernotes** - Načtení z poznámek

## 🎨 Stylování

### UpdateNotification.module.css
- **Gradient pop-up** - Krásný fialový gradient
- **Modal** - Overlay s blur efektem
- **Collapsible sections** - Skládací sekce changelogu
- **Responsive** - Funguje na mobilu i desktopu

### VersionAdmin.module.css
- **Card layout** - Přehledné karty pro verze
- **Color-coded badges** - Barevné značky pro kategorie
- **Form styling** - Elegantní formuláře

## 🔧 Použití

### Pro administrátory

#### 1. Vytvoření verze v Supernotes

Vytvořte poznámku v Supernotes s názvem:
```
UPDATE: v1.2.3 - Nové funkce
```

Nebo přidejte tag `update` nebo `release`

**Doporučený formát:**

```markdown
# v1.2.3 - Nové funkce

## ✨ Hlavní novinky
- Nová funkce pro správu členů
- Vylepšené filtry na výpravách
- Automatické zálohy

## 🎨 Vylepšení UI
- Lepší barvy v dark mode
- Rychlejší načítání seznamů

## 🐛 Opravy
- Opraveno mazání členů
- Opraveno zobrazení na mobilu
```

#### 2. Synchronizace přes admin panel

1. Otevřete **FAE** → **Správa verzí**
2. Klikněte na tab **Synchronizovat ze Supernotes**
3. Klikněte **🔄 Obnovit** pro načtení karet
4. Vyberte kartu a klikněte **📥 Synchronizovat**

#### 3. Nebo vytvoření manuálně

1. Otevřete **FAE** → **Správa verzí**
2. Klikněte na tab **Vytvořit manuálně**
3. Vyplňte:
   - Číslo verze (např. "1.2.3")
   - Kategorie (major/minor/patch/hotfix)
   - Hlavní novinky (bullet points)
   - Changelog (markdown formát)
4. Klikněte **Vytvořit verzi**

### Pro uživatele

#### Když vidí notifikaci

**Pop-up s aktualizací:**
```
🎉 Nová verze je k dispozici!
Verze 1.2.3 je připravena. Aktualizujte pro nové funkce a vylepšení.

[Aktualizovat nyní]  [Co je nového?]  [✕]
```

**Tlačítka:**
- **Aktualizovat nyní** - Reloadne stránku a zobrazí changelog
- **Co je nového?** - Otevře changelog bez reloadu
- **✕** - Zavře notifikaci (uloží se jako dismissed)

#### Changelog modal

Po reloadu nebo kliknutí na "Co je nového?":

```
╔════════════════════════════════════════════════╗
║  Co je nového v 1.2.3                          ║
║  23. února 2026                      [minor]   ║
╠════════════════════════════════════════════════╣
║                                                ║
║  ✨ Hlavní novinky                             ║
║  ✓ Nová funkce pro správu členů                ║
║  ✓ Vylepšené filtry na výpravách               ║
║  ✓ Automatické zálohy                          ║
║                                                ║
║  ▼ Vylepšení UI                                ║
║  - Lepší barvy v dark mode                     ║
║  - Rychlejší načítání seznamů                  ║
║                                                ║
║  ▼ Opravy                                      ║
║  - Opraveno mazání členů                       ║
║  - Opraveno zobrazení na mobilu                ║
║                                                ║
╠════════════════════════════════════════════════╣
║                              [Rozumím]          ║
╚════════════════════════════════════════════════╝
```

## 🔐 Bezpečnost

- **API klíč** - Supernotes API klíč je na serveru (`.env.local`)
- **Autentizace** - Všechny Convex mutace vyžadují přihlášení
- **Admin pouze** - Vytváření verzí je pro přihlášené uživatele

## 🎯 Best Practices

### Semantic versioning

Používejte správné číslování verzí:

- **Major (1.0.0 → 2.0.0)** - Breaking changes, velké změny
- **Minor (1.0.0 → 1.1.0)** - Nové funkce, zpětně kompatibilní
- **Patch (1.0.0 → 1.0.1)** - Bugfixy, malé opravy
- **Hotfix** - Kritické opravy, okamžité

### Psaní changelogů

**Dobré:**
```markdown
## ✨ Nové funkce
- Přidána podpora pro export členů do Excel
- Nový filtr pro rychlé vyhledávání

## 🐛 Opravy
- Opraveno zamrzání při velkém množství dat
- Opraven chybný výpočet věku člena
```

**Špatné:**
```markdown
## Změny
- Různé změny v kódu
- Opraveno několik bugů
- Vylepšení výkonu
```

### Kdy vytvořit novou verzi?

- ✅ Po mergi větší feature branch
- ✅ Po opravě kritického bugu
- ✅ Před deploymentem do produkce
- ❌ Po každém commitu
- ❌ Při drobných úpravách v CSS

## 📊 Příklady použití

### Příklad 1: Rutinní update

```markdown
UPDATE: v1.3.0 - Vylepšení e-mailů

## ✨ Nové funkce
- Podpora pro Gmail OAuth
- Automatické ukládání drafts
- Rich text editor pro e-maily

## 🎨 Vylepšení
- Rychlejší načítání seznamu členů
- Lepší mobilní zobrazení e-mailů

## 🐛 Opravy
- Opraveno odesílání e-mailů s velkými přílohami
- Opraven duplicitní příjemci
```

**Kategorie:** minor

### Příklad 2: Hotfix

```markdown
UPDATE: v1.2.1 - Kritická oprava přihlašování

## 🚨 Kritická oprava
- Opraven bug, který bránil přihlášení nových uživatelů
- Opravena bezpečnostní chyba v OAuth flow

## 🐛 Další opravy
- Opraven memory leak v editoru
```

**Kategorie:** hotfix

### Příklad 3: Major release

```markdown
UPDATE: v2.0.0 - Celková modernizace UI

## 🎉 Velká aktualizace
SkauTreg 2.0 přináší kompletně přepracované rozhraní!

## ✨ Hlavní novinky
- Nový moderní design s dark mode
- Kompletně nový dashboard
- Interaktivní mapa základen
- Real-time spolupráce v dokumentech
- Pokročilý kalendář s notifikacemi

## ⚠️ Breaking changes
- Starý API endpoint byl odstraněn
- Změna struktury exportovaných dat
- Nový formát pro import členů

## 🎨 Vylepšení
- Až 10x rychlejší načítání
- Lepší mobilní zkušenost
- Nové ikony a barvy
```

**Kategorie:** major

## 🧪 Testování

### Testování notifikací

1. Vytvořte testovací verzi (např. "99.0.0-test")
2. Nastavte ji jako aktivní
3. Otevřete aplikaci v privátním režimu
4. Po 2 vteřinách by se měl zobrazit pop-up

### Testování changelog

1. Klikněte "Co je nového?" v pop-upu
2. Zkontrolujte:
   - ✅ Zobrazují se highlights
   - ✅ Sekce jdou skládat/rozkládat
   - ✅ Markdown je správně formátován
   - ✅ Ikony a barvy jsou správné

### Testování Supernotes sync

1. Vytvořte test kartu "UPDATE: v99.0.0-test"
2. Přidejte nějaký obsah
3. V admin panelu klikněte "Synchronizovat"
4. Zkontrolujte, že se verze správně stáhla

## 🐛 Troubleshooting

### Notifikace se nezobrazuje

**Možné příčiny:**
1. Uživatel už verzi viděl → Změňte číslo verze
2. Není nastavena aktivní verze → Zkontrolujte admin panel
3. Convex není připojený → Zkontrolujte konzoli

### Supernotes sync nefunguje

**Možné příčiny:**
1. Chybí API klíč → Zkontrolujte `.env.local`
2. Špatný formát karty → Přidejte "UPDATE:" nebo tag "update"
3. API error → Zkontrolujte network tab

### Changelog se nezobrazuje správně

**Možné příčiny:**
1. Špatný Markdown → Zkontrolujte formát
2. Chybí highlights → Přidejte alespoň jeden
3. CSS konflikt → Zkontrolujte browser console

## 📚 API Reference

### Convex Queries

```typescript
// Zjistit aktuální verzi
const currentVersion = useQuery(api.appVersions.getCurrentVersion, {});

// Zkontrolovat aktualizace
const updateCheck = useQuery(api.appVersions.checkForUpdates, {});
// Returns: { hasUpdate: boolean, currentVersion: string, changelogData: {...} }

// Získat všechny verze
const versions = useQuery(api.appVersions.getAllVersions, { limit: 10 });
```

### Convex Mutations

```typescript
// Označit jako viděnou
await markAsSeen({ version: "1.2.3" });

// Dismiss notifikaci
await dismissVersion({ version: "1.2.3" });

// Vytvořit verzi
await createVersion({
  version: "1.2.3",
  changelogMarkdown: "...",
  category: "minor",
  highlights: ["..."],
  setAsActive: true
});
```

### REST API

```bash
# Získat update karty ze Supernotes
GET /api/supernotes/updates

# Response
{
  "success": true,
  "versions": [
    {
      "cardId": "abc123",
      "version": "1.2.3",
      "name": "UPDATE: v1.2.3 - New features",
      "markup": "...",
      "html": "...",
      "highlights": ["..."],
      "category": "minor"
    }
  ]
}
```

```bash
# Získat konkrétní kartu
POST /api/supernotes/updates
Content-Type: application/json

{
  "cardId": "abc123"
}

# Response
{
  "success": true,
  "version": {
    "cardId": "abc123",
    "version": "1.2.3",
    "changelogMarkdown": "...",
    "changelogHtml": "...",
    "highlights": ["..."],
    "category": "minor"
  }
}
```

## 🎓 Další vylepšení

### Možné budoucí funkce

- [ ] Email notifikace o nových verzích
- [ ] RSS feed s changelogy
- [ ] Statistiky - kolik uživatelů vidělo každou verzi
- [ ] Plánované vydání verzí (scheduled releases)
- [ ] A/B testing verzí 
- [ ] Automatické generování changelogu z Git commitů
- [ ] Integrace s GitHub Releases
- [ ] Multi-jazyčné changelogy
- [ ] Video tutoriály pro nové funkce
- [ ] In-app tour pro velké změny

## 📞 Podpora

Pro otázky a problémy:
- Otevřete issue v repozitáři
- Napište na FAE (Nápady & Chyby)
- Kontaktujte admina

---

**Verze dokumentace:** 1.0.0  
**Poslední update:** 24. února 2026  
**Autor:** SkauTreg Team
