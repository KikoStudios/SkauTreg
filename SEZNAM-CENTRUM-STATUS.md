# 📧 Seznam & Centrum Email Integration - Current Status

**Date**: February 21, 2026  
**Status**: ⚠️ READY FOR TESTING - Needs Real Accounts

---

## 🎯 Quick Summary

### What We Have
✅ **Code Configuration**: Both Seznam and Centrum are fully configured  
✅ **UI Integration**: Email settings component ready  
✅ **Verification Script**: Ready to test connections  
✅ **Required Packages**: nodemailer installed, imapflow installed  

### What We Need
⚠️ **Test Accounts**: Need to create real email accounts  
⚠️ **App Passwords**: Need to generate for both providers  
⚠️ **Verification**: Need to test SMTP/IMAP connections  

---

## 📋 Provider Configurations

### Seznam.cz
```yaml
Status: Configured ✅ | Not Tested ⚠️
SMTP Host: smtp.seznam.cz
SMTP Port: 465 (SSL)
IMAP Host: imap.seznam.cz
IMAP Port: 993 (SSL)
Authentication: App Password Required
```

### Centrum.cz
```yaml
Status: Configured ✅ | Not Tested ⚠️
SMTP Host: smtp.centrum.cz
SMTP Port: 465 (SSL)
IMAP Host: imap.centrum.cz
IMAP Port: 993 (SSL)
Authentication: App Password Required
```

---

## 🚀 How to Test Right Now

### Step 1: Create Test Accounts (5 minutes)

**Option A: Use your existing accounts** (if you have them)
- If you already have @seznam.cz or @centrum.cz emails, you can use those

**Option B: Create new test accounts**
1. **Seznam**: https://email.seznam.cz/
   - Click "Vytvořit e-mail zdarma"
   - Suggested name: `skautreg-test@seznam.cz`
   
2. **Centrum**: https://email.centrum.cz/
   - Create free account
   - Suggested name: `skautreg-test@centrum.cz`

### Step 2: Generate App Passwords (3 minutes)

**For Seznam**:
1. Log into your Seznam account
2. Visit: https://napoveda.seznam.cz/cz/email/mobilni-aplikace-a-programy/aplikacni-heslo/
3. Or: Settings → Security → App Passwords
4. Create password named "SkauTreg Test"
5. **SAVE THIS PASSWORD** - you can't see it again!

**For Centrum**:
1. Log into your Centrum account
2. Go to Settings → Security
3. Generate app password
4. **SAVE THIS PASSWORD**

### Step 3: Test the Connection (2 minutes)

Run the verification script:

```bash
# Test Seznam
node scripts/verify-email-providers.mjs \
  --provider=seznam \
  --email=your-email@seznam.cz \
  --password=YOUR_APP_PASSWORD

# Test Centrum
node scripts/verify-email-providers.mjs \
  --provider=centrum \
  --email=your-email@centrum.cz \
  --password=YOUR_APP_PASSWORD
```

**With Test Email**:
```bash
node scripts/verify-email-providers.mjs \
  --provider=seznam \
  --email=your-email@seznam.cz \
  --password=YOUR_APP_PASSWORD \
  --send-to=your-personal-email@example.com
```

---

## ✅ Expected Results

### Successful Test Output:
```
━━━ Verifying Seznam.cz ━━━

ℹ Email: your-email@seznam.cz
ℹ Password: ****************
ℹ Testing SMTP for Seznam.cz...
✓ SMTP connection successful for Seznam.cz
ℹ Testing IMAP for Seznam.cz...
✓ IMAP connection successful for Seznam.cz
ℹ Found 5 mailboxes

━━━ Verification Summary ━━━

Provider: Seznam.cz
Email: your-email@seznam.cz
SMTP: ✓ Working
IMAP: ✓ Working
Test Email: ✓ Sent
```

---

## 🎨 Using in SkauTreg UI

After successful verification, you can connect via UI:

1. Start your dev server: `npm run dev`
2. Navigate to: **Settings** → **E-mailové připojení**
3. Click: **"Připojit E-mail"**
4. Select: **Seznam.cz** or **Centrum.cz**
5. Enter:
   - Email: `your-email@seznam.cz`
   - Password: `YOUR_APP_PASSWORD`
6. Click: **"Připojit"**

---

## 🔍 Are They Mock or Real?

**Current State**: The integrations are **NOT mock** - they expect real SMTP/IMAP credentials.

### What's Configured:
- ✅ Real SMTP settings (smtp.seznam.cz, smtp.centrum.cz)
- ✅ Real IMAP settings (imap.seznam.cz, imap.centrum.cz)
- ✅ Actual email sending code (using nodemailer)

### What's NOT Mock:
- ❌ No fake/dummy accounts
- ❌ No simulated email sending
- ❌ No test stubs

### What You Need:
- ✅ Real email accounts from Seznam or Centrum
- ✅ Real app passwords generated from those accounts
- ✅ Actual SMTP/IMAP access enabled

---

## 📊 Files Created for Testing

| File | Purpose | Status |
|------|---------|--------|
| `scripts/verify-email-providers.mjs` | Test SMTP/IMAP connections | ✅ Ready |
| `EMAIL-PROVIDERS-VERIFICATION.md` | Detailed testing guide | ✅ Created |
| `email-verification-status.json` | Track testing status | ✅ Template |

---

## 🐛 Common Issues

### "Invalid login or password"
→ You're using regular password instead of app password  
→ Generate app password in account settings

### "Connection timeout"
→ Firewall blocking ports 465 or 993  
→ Try from different network

### "IMAP not enabled"
→ Enable IMAP/SMTP in account settings  
→ Check security settings

---

## 📝 Next Actions

### To Verify Integrations:

1. **Choose one provider** (Seznam or Centrum)
2. **Create account** or use existing
3. **Generate app password**
4. **Run verification script**
5. **Check results**

### Checklist:
- [ ] Created Seznam test account
- [ ] Generated Seznam app password
- [ ] Tested Seznam SMTP connection
- [ ] Tested Seznam IMAP connection
- [ ] Sent test email from Seznam
- [ ] Created Centrum test account
- [ ] Generated Centrum app password
- [ ] Tested Centrum SMTP connection
- [ ] Tested Centrum IMAP connection
- [ ] Sent test email from Centrum
- [ ] Connected in SkauTreg UI
- [ ] Tested sending to members

---

## 💡 Pro Tips

1. **Use separate test accounts** - Don't use your personal email
2. **Keep app passwords safe** - Store in password manager
3. **Test both providers** - Ensure redundancy
4. **Check spam folders** - Test emails might land there
5. **Use descriptive names** - e.g., "skautreg-test@seznam.cz"

---

## 🔗 Useful Links

- **Seznam Email**: https://email.seznam.cz/
- **Seznam App Passwords**: https://napoveda.seznam.cz/cz/email/mobilni-aplikace-a-programy/aplikacni-heslo/
- **Centrum Email**: https://email.centrum.cz/
- **Convex Dashboard**: https://dashboard.convex.dev/
- **Your Deployment**: kindred-okapi-371.convex.cloud

---

## 📞 Need Help?

Check these resources:
1. `EMAIL-PROVIDERS-VERIFICATION.md` - Full testing guide
2. `scripts/verify-email-providers.mjs --help` - Script usage
3. `MULTI-PROVIDER-EMAIL.md` - Architecture overview

---

**Ready to test? Start with:**

```bash
# Show help
node scripts/verify-email-providers.mjs --help

# Create an account at email.seznam.cz or email.centrum.cz
# Generate app password
# Then run verification!
```
