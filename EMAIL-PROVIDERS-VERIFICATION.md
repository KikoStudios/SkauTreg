# Email Providers Verification Guide

## Overview
This guide helps you verify and test Seznam.cz and Centrum.cz email integrations for SkauTreg.

## Current Status

### Seznam.cz
- ✅ **Configuration**: Ready in code
- ⚠️ **Test Account**: Not configured
- 📝 **Status**: Needs real account credentials for testing

**SMTP Settings:**
- Host: `smtp.seznam.cz`
- Port: `465`
- Security: SSL/TLS

**IMAP Settings:**
- Host: `imap.seznam.cz`
- Port: `993`
- Security: SSL/TLS

### Centrum.cz
- ✅ **Configuration**: Ready in code
- ⚠️ **Test Account**: Not configured
- 📝 **Status**: Needs real account credentials for testing

**SMTP Settings:**
- Host: `smtp.centrum.cz`
- Port: `465`
- Security: SSL/TLS

**IMAP Settings:**
- Host: `imap.centrum.cz`
- Port: `993`
- Security: SSL/TLS

## Prerequisites

### Required Packages
The verification script needs additional npm packages:

```bash
npm install nodemailer imapflow
```

Or with pnpm:
```bash
pnpm add nodemailer imapflow
```

## How to Test

### Step 1: Create Test Accounts (if you don't have them)

#### Seznam.cz
1. Go to https://email.seznam.cz/
2. Click "Vytvořit e-mail zdarma"
3. Create a new account (e.g., `skautreg-test@seznam.cz`)
4. **Important**: Generate an app password:
   - Visit: https://napoveda.seznam.cz/cz/email/mobilni-aplikace-a-programy/aplikacni-heslo/
   - Or go to Settings → Security → App Passwords
   - Create a new app password for "SkauTreg Test"
   - **Save this password** - you'll need it for testing

#### Centrum.cz
1. Go to https://email.centrum.cz/
2. Create a new account (e.g., `skautreg-test@centrum.cz`)
3. Generate an app password in account settings
4. **Save the app password**

### Step 2: Run the Verification Script

Test Seznam:
```bash
node scripts/verify-email-providers.mjs --provider=seznam --email=your-email@seznam.cz --password=YOUR_APP_PASSWORD
```

Test Centrum:
```bash
node scripts/verify-email-providers.mjs --provider=centrum --email=your-email@centrum.cz --password=YOUR_APP_PASSWORD
```

Send a test email:
```bash
node scripts/verify-email-providers.mjs --provider=seznam --email=your-email@seznam.cz --password=YOUR_APP_PASSWORD --send-to=recipient@example.com
```

### Step 3: Verify the Results

The script will test:
1. ✅ **SMTP Connection** - Can connect to send emails
2. ✅ **IMAP Connection** - Can connect to read emails
3. ✅ **Send Test Email** - Actually sends an email (if --send-to provided)

Expected output:
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
```

## Common Issues & Solutions

### Issue: "Invalid credentials"
**Cause**: Using regular password instead of app password

**Solution**:
1. Generate an app password (see Step 1 above)
2. Use the app password, not your regular account password

### Issue: "Connection timeout"
**Cause**: Firewall or network blocking SMTP/IMAP ports

**Solution**:
1. Check your firewall settings
2. Ensure ports 465 and 993 are not blocked
3. Try from a different network

### Issue: "Auth failed"
**Cause**: IMAP/SMTP not enabled on account

**Solution**:
1. Log into your email account
2. Go to Settings → Security
3. Enable "Access via IMAP/SMTP"
4. Enable "Allow less secure apps" (if required)

## Using in SkauTreg

### Option 1: UI Connection (Recommended)
1. Start your SkauTreg app
2. Navigate to **Settings** → **E-mailové připojení**
3. Click **"Připojit E-mail"**
4. Select **Seznam.cz** or **Centrum.cz**
5. Enter your email and app password
6. Click **"Připojit"**

### Option 2: Direct Database Entry (Advanced)
If you need to add credentials directly to a troop:

```typescript
// In Convex dashboard or using convex dev
await ctx.db.patch(troopId, {
  emailProvider: {
    provider: "seznam", // or "centrum"
    email: "your-email@seznam.cz",
    smtpHost: "smtp.seznam.cz",
    smtpPort: 465,
    smtpPassword: "YOUR_APP_PASSWORD",
    connectedAt: new Date().toISOString(),
    connectedBy: userId,
  }
});
```

## Test Credentials Template

Create a file `.env.email-test.local` (DO NOT commit!) with test credentials:

```env
# Seznam Test Account
SEZNAM_TEST_EMAIL=skautreg-test@seznam.cz
SEZNAM_TEST_PASSWORD=your_app_password_here

# Centrum Test Account
CENTRUM_TEST_EMAIL=skautreg-test@centrum.cz
CENTRUM_TEST_PASSWORD=your_app_password_here
```

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit real credentials** to git
2. **Use app passwords** instead of your main password
3. **Store credentials securely** in environment variables
4. **Rotate passwords** regularly
5. **Use separate test accounts** for development

## Next Steps

### After Successful Verification:

1. ✅ Update documentation with tested configurations
2. ✅ Add credentials to your env files (local only)
3. ✅ Test email sending from SkauTreg UI
4. ✅ Test member email functionality
5. ✅ Monitor for any delivery issues

### For Production:

1. Create dedicated email accounts for production
2. Use strong app passwords
3. Set up email monitoring/logging
4. Configure rate limiting
5. Add bounce handling

## Mock vs Real Accounts

Currently, the system has:
- ✅ **Code Configuration**: SMTP/IMAP settings for Seznam & Centrum
- ⚠️ **Test Accounts**: No pre-configured test accounts
- ❌ **Mock Data**: Not using mock/fake emails

**Recommendation**: Create real test accounts using the free email services above.

## Documentation Links

### Seznam.cz
- Email service: https://email.seznam.cz/
- App passwords: https://napoveda.seznam.cz/cz/email/mobilni-aplikace-a-programy/aplikacni-heslo/
- SMTP/IMAP settings: https://napoveda.seznam.cz/cz/email/mobilni-aplikace-a-programy/nastaveni-smtp-a-imap/

### Centrum.cz
- Email service: https://email.centrum.cz/
- Help center: https://napoveda.centrum.cz/

## Troubleshooting

### Enable Debug Logging
Edit `scripts/verify-email-providers.mjs` and uncomment the logger:

```javascript
logger: {
    debug: console.log,
    info: console.log,
    warn: console.warn,
    error: console.error,
}
```

### Test Manually with Telnet
```bash
# Test SMTP connection
telnet smtp.seznam.cz 465

# Test IMAP connection  
telnet imap.seznam.cz 993
```

### Check Email Client Settings
Most email clients (Thunderbird, Outlook) can test these settings automatically.

## Contact & Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify your credentials are correct
3. Try with a different email account
4. Check provider status pages

---

**Last Updated**: February 21, 2026
**Status**: Ready for testing with real accounts
**Next Review**: After first successful test
