# Quick Start - Email System

## Pro Správce Oddílu

### Step 1: Propojit Gmail (5 minut)

1. **Přihlaste se do SkautREG** jako vedoucí oddílu
2. Jděte na **Nastavení Oddílu → Gmail & Email**
3. Klikněte **"Propojit Gmail"**
4. Zadejte:
   - **E-mail:** `info@vasoddil.cz` (nebo váš oficiální oddílový e-mail)
   - **Refresh Token:** (postup níže)

### Jak Získat Refresh Token (3 minuty)

```
1. Otevřete https://developers.google.com/oauthplayground/
2. V levém sloupci:
   - Najděte "Gmail API v1"
   - Expandujte a vyberte "https://www.googleapis.com/auth/gmail.send"
3. Klikněte "Authorize APIs"
4. Přihlaste se ke Google účtu se svým e-mailem
5. Souhlaste se všemi povolením
6. Vlevo nahoře najdete "Exchange authorization code for tokens"
7. Klikněte na něj
8. V sekci "Step 3" vidíte "Refresh token"
9. Zkopírujte jej (celý řetězec s `1//...`)
10. Vložte do SkautREG a uložte
```

**Hotovo!** ✅

---

## Pro Vedoucího Výpravy

### Step 1: Vytvořit Koncept E-mailu (2 minuty)

1. Jděte na **Výprava → E-maily**
2. Klikněte **"+ Nový koncept"**
3. Zadejte:
   - **Předmět:** "Přihláška na letní tábor"
   - **Tělo:** "Ahoj <user.name>, tady máš odkaz: <user.sign.link>"
4. Klikněte **"Vytvořit koncept"**

### Step 2: Odeslat E-maily (1 minuta)

1. V seznamu konceptů vyberte váš koncept
2. Klikněte **"Odeslat"**
3. Ověřte počet příjemců
4. Klikněte **"OK"** v potvrzovacím dialogu
5. Čekejte na výsledky...

**Hotovo!** Členové dostali e-maily s osobními odbory. ✅

---

## Pro Členy Týmu

### Step 1: Přidat E-mail do Profilu (1 minuta)

1. Každý člen musí mít e-mail
2. Jděte na Výprava **→ Účastníci → Upravit člena**
3. Zadejte e-mail adresu
4. Uložte

### Step 2: Vytvořit Koncept (Volitelné)

1. Můžete vytvářet koncepty e-mailů
2. Vedoucí si je přečte a pošle
3. Nikdo jiný nemůže odesílat bez role vedoucího

**Tip:** Používejte `<user.sign.link>` - každý dostane svůj odkaz!

---

## Chytré Značky (Reference)

| Značka | Co dělá | Příklad |
|--------|--------|---------|
| `<user.sign.link>` | Unikátní odkaz na přihlášku | `https://skautreg.cz/rsvp/abc123` |
| `<user.name>` | Jméno člena | `Petr Novák` |

**Příklad kompletu e-mailu:**
```
Ahoj <user.name>,

Tímto Tě zveme na letní tábor 2026!

Přihlašujete se zde: <user.sign.link>

Těšíme se na Tebe!

Vedení oddílu
```

---

## Troubleshooting

| Problém | Řešení |
|---------|--------|
| "Nemáte oprávnění odesílat" | Jen vedoucí mohou odesílat. Požádejte vedoucího. |
| "E-mail se neposlal" | Člen nemá v profilu e-mail. Vyplňte jej. |
| "Gmail token error" | Refresh token vypršel. Odpojte a znovu propojte. |
| Značka se nenahradila | Ověřte, že jste používali `<user.sign.link>` (s tečkami). |

---

## Bezpečnost

✅ **Vaše heslo zůstává v bezpečí**
- Používáme Google OAuth 2.0
- Aplikace nikdy nezná heslo
- Refresh token lze kdykoli odvolat

✅ **Každý člen dostane vlastní odkaz**
- Nelze podvrhnout cizí přihlášku
- Automatické sledování

✅ **Jen vedoucí může odesílat**
- Kontrola obsahu
- Audit trail (kdo, kdy odesílal)

---

## Tipy & Triky

### 1. Šablony (Manuálně)
```
Uložte si oblíbené texty někam (notepad):
- Pozvánka
- Připomínka
- Co si vzít
- Poděkování

Pak jen zkopírujte do konceptu.
```

### 2. Testování
```
1. Vytvořte koncept
2. Odešlete jen sobě
3. Ověřte, že odkaz funguje
4. Pak odesláním všem
```

### 3. Více Konceptů
```
Ke každému eventos můžete mít:
- Ozvěna 1: +7 dní
- Ozvěna 2: +3 dny
- Ozvěna 3: poslední den

Všechny zůstávají v historii!
```

---

## Video Návod

[Video tutoriál bude brzy dostupný]

---

## Podpora

Máte otázku? Napište na support@skautreg.cz

Zprávy dorazí z: `info@vasoddil.cz` ✉️
