# ⚡ OAuth Quick Reference

## One-Minute Overview

Your SkautREG now has **proper OAuth 2.0 Gmail authentication** with:
- ✅ Google login button (no manual tokens)
- ✅ Automatic token exchange (server-side, secure)
- ✅ Email persistence (stored in Convex)
- ✅ Error handling (Czech messages)
- ✅ User-friendly interface

## The OAuth Flow

```
Click "Propojit s Gmailu"
    → Google login
    → Permission screen  
    → Google redirects back with code
    → Server exchanges code for refresh token
    → Browser shows "✓ Propojeno" with email
    → Ready to send emails! ✨
```

## Files Changed

| File | Change |
|------|--------|
| `src/components/GmailSettings.tsx` | OAuth button + callback handler |
| `src/app/api/auth/gmail/callback/route.ts` | OAuth code → token exchange |
| `.env.local` | Gmail credentials added |

## Environment Variables

```env
NEXT_PUBLIC_GMAIL_CLIENT_ID=YOUR_GOOGLE_OAUTH_CLIENT_ID
NEXT_PUBLIC_GMAIL_REDIRECT_URI=http://localhost:3000/api/auth/gmail/callback
GMAIL_CLIENT_SECRET=YOUR_GOOGLE_OAUTH_CLIENT_SECRET
GMAIL_REDIRECT_URI=http://localhost:3000/api/auth/gmail/callback
```

## Quick Test

```bash
npm run dev                          # Start server
# Go to Settings → Gmail propojení
# Click "Propojit s Gmailu"
# Login → Approve → Back in settings ✅
```

## What Happens

1. **Click button** → Redirects to Google
2. **User logs in** → Google auth screen
3. **User approves** → Permission to send emails
4. **Google redirects** → Back to your settings page
5. **Token stored** → In Convex database
6. **Email ready** → Can now send from Gmail

## Where OAuth Happens

| Step | Component |
|------|-----------|
| Click button | `GmailSettings.tsx` → `handleLoginClick()` |
| Google consent | `accounts.google.com/o/oauth2/auth` |
| Redirect back | `/api/auth/gmail/callback/route.ts` |
| Token exchange | `oauth2.googleapis.com/token` (server-side) |
| Get email | `googleapis.com/oauth2/v2/userinfo` |
| Store token | Convex `connectGmail` mutation |

## Security

- 🔒 Client secret server-side only
- 🔒 Refresh token obtained with `offline` access
- 🔒 Access token discarded after use
- 🔒 Only owner/leader can authenticate
- 🔒 Tokens stored securely in Convex

## Status

✅ **Ready to Test**

Start the app, click the button, and authorize with Google!

## For Production

Change in `.env.local`:
```env
NEXT_PUBLIC_GMAIL_REDIRECT_URI=https://skautreg.overload.studio/api/auth/gmail/callback
GMAIL_REDIRECT_URI=https://skautreg.overload.studio/api/auth/gmail/callback
```

Update Google Cloud Console to match.

## Need Help?

- 📖 [OAUTH-SETUP-COMPLETE.md](OAUTH-SETUP-COMPLETE.md) - Full setup guide
- 🧪 [OAUTH-TESTING-GUIDE.md](OAUTH-TESTING-GUIDE.md) - Testing steps
- 📚 [EMAIL-SYSTEM-DOCS.md](EMAIL-SYSTEM-DOCS.md) - Complete email system

---

**Start testing now!** 🚀
