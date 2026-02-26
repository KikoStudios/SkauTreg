# ✅ Update System - Deployment Checklist

Pre-deployment checklist pro aktivaci update notification systému.

## 📋 Pre-Deployment Checklist

### 1. Environment Setup
- [ ] Ověřit, že `SUPERNOTES_API_KEY` je v `.env.local`
- [ ] Zkontrolovat, že Convex běží (`npx convex dev`)
- [ ] Zkontrolovat, že Next.js dev server běží (`npm run dev`)

### 2. Database Migration
- [ ] Convex automaticky vytvoří nové tabulky při prvním deploy
- [ ] Zkontrolovat Convex dashboard, že tabulky `app_versions` a `user_version_tracking` existují
- [ ] (Pro production) Spustit `npx convex deploy --prod`

### 3. Component Integration
- [ ] `UpdateNotification` je v `(dashboard)/layout.tsx` ✅
- [ ] `VersionAdmin` je v `fae/page.tsx` ✅
- [ ] CSS moduly jsou správně importovány ✅

### 4. API Routes
- [ ] `/api/supernotes/updates` route existuje ✅
- [ ] Test: `curl http://localhost:3000/api/supernotes/updates` vrací data
- [ ] API klíč funguje (žádné 500 errors)

### 5. Testing

#### A. Admin Panel Test
- [ ] Otevřít `/fae`
- [ ] Kliknout na tab "Správa verzí"
- [ ] Tab se zobrazuje správně
- [ ] Všechny 3 sub-tabs fungují (Seznam/Vytvořit/Sync)

#### B. Manual Version Creation Test
- [ ] V admin panelu: Vytvořit manuálně
- [ ] Vyplnit formulář:
  - Verze: `0.0.1-test`
  - Kategorie: `minor`
  - Highlights: `Test feature`
  - Changelog: `## Test\n- Testing update system`
- [ ] Kliknout "Vytvořit verzi"
- [ ] Verze se objeví v seznamu

#### C. Pop-up Test
- [ ] Otevřít nové privátní okno
- [ ] Přihlásit se
- [ ] Po 2 sekundách se zobrazí pop-up ✅
- [ ] Pop-up má správné styly (fialový gradient)
- [ ] Tlačítka fungují

#### D. Changelog Modal Test
- [ ] V pop-upu kliknout "Co je nového?"
- [ ] Modal se otevře
- [ ] Highlights jsou zobrazeny
- [ ] Sekce jdou rozbalit/zabalit
- [ ] "Rozumím" tlačítko zavře modal

#### E. Reload Test
- [ ] V pop-upu kliknout "Aktualizovat nyní"
- [ ] Stránka se reloadne
- [ ] Po reloadu se zobrazí changelog modal
- [ ] Modal obsahuje správná data

#### F. Dismiss Test
- [ ] Zobrazit pop-up
- [ ] Kliknout "✕" (zavřít)
- [ ] Reload stránky
- [ ] Pop-up se už nezobrazuje pro tuto verzi

#### G. Supernotes Sync Test
- [ ] V Supernotes vytvořit test kartu:
  ```
  UPDATE: v0.0.2-test - Supernotes test
  
  ## Test
  - Sync from Supernotes
  ```
- [ ] V admin panelu: Synchronizovat ze Supernotes
- [ ] Kliknout "🔄 Obnovit"
- [ ] Karta se objeví v seznamu
- [ ] Kliknout "📥 Synchronizovat"
- [ ] Verze se vytvoří v DB
- [ ] Test pop-up v privátním okně

### 6. Performance Check
- [ ] Pop-up se zobrazuje do 2-3 sekund po načtení
- [ ] Modal se otevírá plynule (žádné lag)
- [ ] Collapsing sekcí je smooth
- [ ] Žádné console errors
- [ ] Žádné console warnings (kromě známých)

### 7. Responsive Check
- [ ] Desktop view (1920x1080) ✅
- [ ] Tablet view (768px) ✅
- [ ] Mobile view (375px) ✅
- [ ] Pop-up je responsive
- [ ] Modal je responsive
- [ ] Admin panel je responsive

### 8. Browser Compatibility
- [ ] Chrome ✅
- [ ] Firefox ✅
- [ ] Safari ✅
- [ ] Edge ✅

### 9. Security Check
- [ ] Supernotes API klíč není v client code
- [ ] Všechny mutace vyžadují auth
- [ ] XSS ochrana v markdown renderingu
- [ ] Žádné sensitive data v console.log

### 10. Documentation
- [ ] README-UPDATE-SYSTEM.md existuje ✅
- [ ] UPDATE-SYSTEM-DOCS.md existuje ✅
- [ ] UPDATE-SYSTEM-QUICKSTART.md existuje ✅
- [ ] UPDATE-SYSTEM-SUMMARY.md existuje ✅

---

## 🚀 Production Deployment Steps

### Krok 1: Database Deployment
```bash
npx convex deploy --prod
```

- Počkat, až se tabulky vytvoří
- Zkontrolovat Convex production dashboard

### Krok 2: Environment Variables
```bash
# V production (Vercel/Netlify)
SUPERNOTES_API_KEY=your_production_key
```

### Krok 3: Deploy Application
```bash
# Standardní deploy flow
git add .
git commit -m "feat: Add update notification system"
git push
```

### Krok 4: Post-Deploy Verification
- [ ] Otevřít production URL
- [ ] Přihlásit se
- [ ] Vytvořit test verzi v admin panelu
- [ ] Ověřit, že pop-up funguje
- [ ] Test changelog modal
- [ ] Test dismiss functionality

### Krok 5: Create First Real Version
- [ ] V Supernotes vytvořit kartu pro aktuální verzi
- [ ] Sync do production
- [ ] Set as active
- [ ] Všichni uživatelé uvidí notifikaci při příštím návštěvě

---

## 🔍 Common Issues & Fixes

### Issue 1: Pop-up se nezobrazuje
**Řešení:**
```typescript
// Zkontrolovat v DevTools:
console.log(updateCheck);
// Mělo by vrátit: { hasUpdate: true, currentVersion: "...", ... }
```

### Issue 2: Convex auth error
**Řešení:**
```bash
# Restartovat Convex
npx convex dev
```

### Issue 3: Supernotes sync fails
**Řešení:**
```bash
# Zkontrolovat API klíč
cat .env.local | grep SUPERNOTES

# Test API
curl -H "Api-Key: YOUR_KEY" https://api.supernotes.app/v1/cards/get/select
```

### Issue 4: Modal styling broken
**Řešení:**
- Zkontrolovat, že CSS module se správně importuje
- Hard reload (Ctrl+Shift+R)
- Zkontrolovat CSS conflicts v DevTools

---

## 📊 Monitoring

Po deployu sledovat:

1. **Convex Dashboard**
   - Počet záznamů v `app_versions`
   - Počet záznamů v `user_version_tracking`
   - Error rate

2. **Browser Console** (od uživatelů)
   - Žádné JS errors
   - Pop-up se zobrazuje správně

3. **Analytics** (volitelné)
   - Kolik lidí kliklo "Aktualizovat"
   - Kolik lidí kliklo "Co je nového"
   - Kolik lidí dismissed

---

## ✅ Sign-Off

Po dokončení všech testů:

- [ ] Všechny checkboxy jsou zaškrtnuté
- [ ] Production deploy proběhl úspěšně
- [ ] První verze je vytvořena a aktivní
- [ ] Alespoň 3 uživatelé viděli pop-up úspěšně
- [ ] Dokumentace je aktuální

**Deployed by:** _________________  
**Date:** _________________  
**Version deployed:** _________________  

---

## 🎉 Done!

Systém je připravený k použití! 

**Next steps:**
1. Vytvořit pravidelný update schedule (např. každý týden)
2. Připravit template pro update notes v Supernotes
3. Nastavit reminder pro vytváření changelogů
4. Sbírat feedback od uživatelů

**Happy updating! 🚀**
