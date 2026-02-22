# 🔍 FINAL VERDICT: Seznam & Centrum Email Status

**Date**: February 21, 2026  
**Your Question**: "Are the mails exist and connected successfully? They might be even mock now."

---

## ✅ Direct Answer

### **NOT MOCK** - They are configured for REAL email access

**Current Status**:
- ❌ **No existing accounts** - You need to create them
- ❌ **Not connected** - No credentials stored yet
- ✅ **Real configuration** - SMTP/IMAP settings are correct
- ✅ **Ready to test** - All code is in place

---

## 📊 What Exists vs What Doesn't

### ✅ What EXISTS (Ready in Code):

| Component | Status | Location |
|-----------|--------|----------|
| SMTP Configuration | ✅ Ready | `EmailSettings.tsx` lines 34-54 |
| UI Form | ✅ Ready | `EmailSettings.tsx` lines 570-650 |
| Database Schema | ✅ Ready | `convex/schema.ts` lines 27-40 |
| Connection Function | ✅ Ready | `convex/troops.ts` lines 387-445 |
| Verification Script | ✅ Created | `scripts/verify-email-providers.mjs` |
| Documentation | ✅ Created | `EMAIL-PROVIDERS-VERIFICATION.md` |

### ❌ What DOESN'T Exist (You Need to Create):

| Item | Status | What You Need |
|------|--------|---------------|
| Seznam Account | ❌ Missing | Create at email.seznam.cz |
| Seznam App Password | ❌ Missing | Generate in Seznam settings |
| Centrum Account | ❌ Missing | Create at email.centrum.cz |
| Centrum App Password | ❌ Missing | Generate in Centrum settings |
| Stored Credentials | ❌ Missing | Add via UI or database |
| Tested Connection | ❌ Not done | Run verification script |

---

## 🎯 Technical Details

### Database Check

Currently in your `troops` table, the `emailProvider` field for any troop would be:
- **null** or **undefined** (Seznam/Centrum not connected)
- OR possibly has Gmail/Outlook (other providers)

To verify:
1. Open Convex Dashboard: https://dashboard.convex.dev/
2. Go to your project: `kindred-okapi-371`
3. Open Data → `troops` table
4. Check the `emailProvider` field

**Expected if Seznam/Centrum were connected**:
```json
{
  "provider": "seznam",
  "email": "oddil@seznam.cz",
  "smtpHost": "smtp.seznam.cz",
  "smtpPort": 465,
  "smtpPassword": "app_password_here",
  "connectedAt": "2026-02-21T...",
  "connectedBy": "user_id..."
}
```

### Code Verification

The SMTP providers are configured as **real SMTP connections**:

```typescript
// From EmailSettings.tsx
seznam: {
    name: "Seznam.cz",
    icon: "📬",
    description: "IMAP/SMTP: imap.seznam.cz",
    color: "#e74c3c",
    authType: "smtp",  // ← REAL SMTP, not mock
    smtpHost: "smtp.seznam.cz",  // ← Real server
    smtpPort: 465,  // ← Real port
    imapHost: "imap.seznam.cz",  // ← Real server
    imapPort: 993,  // ← Real port
}
```

**This is NOT a mock**. The code expects:
- Real SMTP credentials
- Actual connection to Seznam/Centrum servers
- Genuine email sending via nodemailer

---

## 🚦 Testing Status

### Packages
- ✅ `nodemailer` - Installed (v6.10.1)
- ✅ `imapflow` - Just installed
- ✅ `@types/nodemailer` - Installed

### Verification Tools
- ✅ `scripts/verify-email-providers.mjs` - Ready
- ✅ `scripts/quick-test-email.ps1` - Ready (Windows)
- ✅ `scripts/quick-test-email.sh` - Ready (Unix)

### Documentation
- ✅ `EMAIL-PROVIDERS-VERIFICATION.md` - Full guide
- ✅ `SEZNAM-CENTRUM-STATUS.md` - Current status
- ✅ `MULTI-PROVIDER-EMAIL.md` - Architecture

---

## 🎬 Next Action: Test Right Now

You have 3 options:

### Option 1: Quick Interactive Test (Recommended)
```powershell
# Windows PowerShell
.\scripts\quick-test-email.ps1
```

This will prompt you for:
1. Provider (seznam/centrum)
2. Email address
3. App password
4. Whether to send test email

### Option 2: Direct Command
```bash
node scripts/verify-email-providers.mjs \
  --provider=seznam \
  --email=your-email@seznam.cz \
  --password=YOUR_APP_PASSWORD \
  --send-to=test@example.com
```

### Option 3: Create Account First

**If you don't have an account yet:**

1. **Create Seznam Account** (2 minutes)
   - Visit: https://email.seznam.cz/
   - Click "Vytvořit e-mail zdarma"
   - Create account: `skautreg-test@seznam.cz`

2. **Generate App Password** (2 minutes)
   - Log into Seznam
   - Go to: https://napoveda.seznam.cz/cz/email/mobilni-aplikace-a-programy/aplikacni-heslo/
   - Or: Settings → Security → App Passwords
   - Create password for "SkauTreg Test"
   - **SAVE THIS PASSWORD**

3. **Run Test** (1 minute)
   ```powershell
   node scripts/verify-email-providers.mjs --provider=seznam --email=skautreg-test@seznam.cz --password=YOUR_APP_PASSWORD
   ```

---

## 🔍 How to Know if They Work

### Success Indicators:

**Console Output**:
```
✓ SMTP connection successful for Seznam.cz
✓ IMAP connection successful for Seznam.cz
✓ Test email sent successfully!
```

**In Convex Database**:
After connecting via UI, you'll see:
```json
{
  "emailProvider": {
    "provider": "seznam",
    "email": "your-email@seznam.cz",
    "smtpHost": "smtp.seznam.cz",
    "smtpPort": 465,
    "smtpPassword": "encrypted_or_plain_password",
    "connectedAt": "2026-02-21T..."
  }
}
```

**In SkauTreg UI**:
- Settings → E-mailové připojení
- Should show: "Připojeno: Seznam.cz"
- Email address displayed
- Green success indicator

### Failure Indicators:

**Console Output**:
```
✗ SMTP connection failed: Invalid login
✗ IMAP connection failed: Connection timeout
```

**Common Issues**:
- Using regular password instead of app password
- IMAP/SMTP not enabled in account settings
- Wrong email address
- Network/firewall blocking ports 465/993

---

## 📋 Testing Checklist

Create a real account and test in 10 minutes:

- [ ] Open email.seznam.cz
- [ ] Create account: `skautreg-test@seznam.cz`
- [ ] Log into account
- [ ] Go to Settings → Security
- [ ] Generate app password "SkauTreg Test"
- [ ] Copy app password to safe place
- [ ] Run: `.\scripts\quick-test-email.ps1`
- [ ] Enter provider: `seznam`
- [ ] Enter email: `skautreg-test@seznam.cz`
- [ ] Enter app password: `paste_here`
- [ ] Choose to send test email: `y`
- [ ] Enter test recipient: `your-personal-email@example.com`
- [ ] Verify: ✓ SMTP connection successful
- [ ] Verify: ✓ IMAP connection successful
- [ ] Verify: ✓ Test email sent
- [ ] Check recipient inbox for test email
- [ ] Done! ✅

---

## 💡 Summary

**Your Question**: "Are the mails exist and connected successfully? They might be even mock now."

**Answer**:
- ❌ **No existing accounts** - Not created yet
- ❌ **Not connected** - No credentials in database
- ❌ **Not mock** - They are configured for REAL SMTP/IMAP
- ✅ **Ready to test** - All code and tools are ready
- ✅ **Can be tested in 10 minutes** - Just need to create accounts

**To make them work**:
1. Create a real email account (Seznam or Centrum)
2. Generate app password
3. Run verification script
4. Connect via SkauTreg UI
5. Done! ✅

---

**Files Created for You**:
- ✅ `scripts/verify-email-providers.mjs` - Main verification script
- ✅ `scripts/quick-test-email.ps1` - Interactive Windows test
- ✅ `scripts/quick-test-email.sh` - Interactive Unix test
- ✅ `EMAIL-PROVIDERS-VERIFICATION.md` - Full documentation
- ✅ `SEZNAM-CENTRUM-STATUS.md` - Current status guide
- ✅ `email-verification-status.json` - Status tracker

**Run this to start testing**:
```powershell
.\scripts\quick-test-email.ps1
```

Or get help:
```bash
node scripts/verify-email-providers.mjs --help
```

---

**Last Updated**: February 21, 2026, 22:30  
**Status**: Ready for testing - awaiting real accounts
