# 🚀 Quick Reference - Email Improvements

## Two Problems Solved ✅

### 1. Sent Folder Issue ✅
**Problem**: Emails sent via SMTP didn't appear in email client's Sent folder  
**Solution**: Added automatic IMAP saving after each email is sent

### 2. Manual Testing ✅
**Problem**: Had to use terminal commands to test email connections  
**Solution**: Added "🔍 Otestovat připojení" button in UI

---

## How to Test Right Now

### Option 1: Test via UI (Recommended)

```bash
# Start dev server
npm run dev
```

Then:
1. Go to **Settings** → **E-mailové připojení**
2. Click **"Připojit E-mail"**
3. Select **"Seznam.cz"** or **"Centrum.cz"**
4. Enter email: `your@seznam.cz`
5. Enter app password: `YOUR_APP_PASSWORD`
6. Click **"🔍 Otestovat připojení"** ← NEW!
7. See results:
   - ✅ SMTP: Připojeno
   - ✅ IMAP: Připojeno
8. Click **"Připojit"** to save

### Option 2: Test via Script (With Sent Folder)

```bash
node scripts/verify-email-providers.mjs \
  --provider=seznam \
  --email=your@seznam.cz \
  --password=YOUR_APP_PASSWORD \
  --send-to=your-personal-email@example.com
```

Expected output:
```
✓ SMTP connection successful
✓ IMAP connection successful
✓ Saving to Sent folder...
✓ Email saved to Sent folder
✓ Test email sent successfully!
```

Then check:
1. Recipient inbox → Should have test email ✅
2. Your Seznam Sent folder → Should have test email ✅

---

## What Changed

### In Code

| Change | File | What It Does |
|--------|------|--------------|
| `saveToImapSent()` | convex/mailer.ts | Saves sent emails to IMAP Sent folder |
| `testEmailConnection()` | convex/mailer.ts | Tests SMTP/IMAP from UI |
| Test button | EmailSettings.tsx | UI button for testing |
| Updated sendSmtpMessage | convex/mailer.ts | Auto-saves to Sent folder |

### In UI

**New "Test Connection" Button**:
- Yellow background (#fef08a)
- Icon: 🔍
- Text: "Otestovat připojení"
- Shows before "Připojit" button
- Tests both SMTP and IMAP
- Shows results in dialog

---

## Expected Behavior

### When Sending Emails

**Before**:
1. Email sent via SMTP ✅
2. Recipient receives email ✅
3. ⚠️ Not in your Sent folder ❌

**After**:
1. Email sent via SMTP ✅
2. Email saved to IMAP Sent folder ✅
3. Recipient receives email ✅
4. ✅ In your Sent folder ✅

### When Testing Connection

**Before**:
1. Enter credentials
2. Click "Připojit"
3. Hope it works 🤞
4. Find out later if it failed

**After**:
1. Enter credentials
2. Click "🔍 Otestovat připojení"
3. See instant results:
   - ✅ SMTP: Working
   - ✅ IMAP: Working
4. Confidently click "Připojit"

---

## Configuration

### Sent Folder Names Supported

The system automatically finds these folder names:

- `Sent` (English)
- `Odeslaná pošta` (Seznam.cz Czech)
- `Odoslané` (Centrum.cz Czech)
- `INBOX.Sent` (Some IMAP servers)
- Any folder with "sent" or "odeslan" in name

### Providers Supported

| Provider | SMTP | IMAP | Test UI | Sent Folder |
|----------|------|------|---------|-------------|
| Seznam.cz | ✅ | ✅ | ✅ | ✅ |
| Centrum.cz | ✅ | ✅ | ✅ | ✅ |
| Gmail | ✅ | N/A | ❌ | Auto |
| Outlook | ⚠️ | ⚠️ | ❌ | ⚠️ |

---

## Troubleshooting

### Sent Folder Empty
**Q**: Email sent but not in Sent folder

**A**: Check:
1. IMAP connection works (test with button)
2. Folder name is recognized
3. Check console for IMAP warnings

### Test Button Shows Error
**Q**: "❌ SMTP: Chyba" or "❌ IMAP: Chyba"

**A**: Check:
1. Using APP PASSWORD (not regular password)
2. Email address is correct
3. SMTP/IMAP enabled in account settings
4. Internet connection working

### Email Sent But Test Failed
**Q**: Production email sent, but test says failed

**A**: This shouldn't happen. If it does:
1. Check Convex logs
2. Verify credentials match
3. Test with script first

---

## Files to Review

📁 **Backend**:
- [convex/mailer.ts](convex/mailer.ts#L214-L362) - IMAP saving + test function

📁 **Frontend**:
- [src/components/EmailSettings.tsx](src/components/EmailSettings.tsx#L65-L240) - Test button UI

📁 **Scripts**:
- [scripts/verify-email-providers.mjs](scripts/verify-email-providers.mjs) - CLI testing

📁 **Docs**:
- [EMAIL-IMPROVEMENTS-SUMMARY.md](EMAIL-IMPROVEMENTS-SUMMARY.md) - Full details

---

## Commands

```bash
# Test via CLI (with Sent folder save)
node scripts/verify-email-providers.mjs \
  --provider=seznam \
  --email=your@email.cz \
  --password=APP_PASSWORD \
  --send-to=test@example.com

# Test via UI
npm run dev
# Then: Settings → E-mailové připojení → Test button

# Check for errors
npm run build
# or
convex dev
```

---

## Quick Checklist

Before deploying:
- [ ] Test Seznam connection with UI button
- [ ] Test Centrum connection with UI button
- [ ] Send test email via CLI script
- [ ] Verify email in recipient inbox
- [ ] Verify email in Sent folder
- [ ] Check no TypeScript errors: `npm run build`
- [ ] Check Convex deploys: `convex deploy`

---

**Status**: ✅ Ready to Test  
**Next**: Test with real accounts  
**Docs**: [EMAIL-IMPROVEMENTS-SUMMARY.md](EMAIL-IMPROVEMENTS-SUMMARY.md)

---

**Pro tip**: Test with the UI button first - it's faster and gives instant feedback! 🚀
