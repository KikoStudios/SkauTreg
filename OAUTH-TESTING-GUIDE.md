# 🧪 OAuth Implementation - Testing & Verification Guide

## Pre-Flight Checklist

Before testing, verify these are in place:

- [x] **GmailSettings.tsx** updated with OAuth button
- [x] **OAuth callback handler** at `/api/auth/gmail/callback`
- [x] **Environment variables** in `.env.local`
- [x] **Google OAuth credentials** configured
- [x] **Convex functions** ready (connectGmail, disconnectGmail)

## Testing Locally

### Step 1: Start the Development Server

```bash
npm run dev
```

This starts:
- Next.js dev server on `http://localhost:3000`
- Convex dev backend

### Step 2: Navigate to Settings

1. Open browser: `http://localhost:3000`
2. Login with test account
3. Go to **Settings** for any troop
4. Find **"Gmail propojení"** section

### Step 3: Test OAuth Flow

#### Scenario A: First Time Connection

**Action**: Click "Propojit s Gmailu" button

**Expected Flow**:
1. ✅ Browser redirects to Google login (`accounts.google.com/o/oauth2/auth?...`)
2. ✅ Google login page appears
3. ✅ User selects/logs in with Google account
4. ✅ Google shows permission screen: "Chce mít přístup k odesílání e-mailů"
5. ✅ User clicks "Povolám"
6. ✅ Browser redirects back to `localhost:3000/settings?gmail_connected=true&email=...`
7. ✅ Settings page shows: "✓ Propojeno" with email address
8. ✅ URL becomes clean (history.replaceState removes params)

**If Fails**:
- Red error box appears with message
- Check `.env.local` has correct credentials
- Check browser console for errors

#### Scenario B: Already Connected

**Precondition**: You've already connected Gmail

**Expected Display**:
- Green box with "✓ Propojeno"
- Email address shown
- "Odpojit" button visible
- No login button

**Action**: Click "Odpojit" button

**Expected**:
1. Confirmation dialog: "Opravdu odpojit Gmail účet?"
2. After confirming: Green box disappears
3. Login button reappears

#### Scenario C: Permission Not Granted

**Precondition**: User denies permission on Google consent screen

**Expected**:
- Redirects back to settings with error
- Red error box shows: "Uživatel zamítl přístup" or similar
- Login button still visible
- Can try again

#### Scenario D: Insufficient Permissions

**Precondition**: User grants only partial permissions

**Expected**:
- Error: "Nepodařilo se získat refresh token. Zkuste znovu..."
- This happens when `prompt=consent` missing
- (Already in code, so shouldn't happen)

### Step 4: Verify Token Storage

After successful OAuth:

1. **Check Convex Dashboard**:
   - Go to [Convex dashboard](https://dashboard.convex.dev)
   - Find your project
   - Go to **Data** tab
   - Find **troops** table
   - Find your troop
   - Check **gmailOAuth** field has:
     ```json
     {
       "email": "your-email@gmail.com",
       "refreshToken": "1//...",
       "connectedAt": "2024-01-20T10:30:00Z"
     }
     ```

2. **Page Refresh Test**:
   - Refresh settings page
   - Gmail section should still show "✓ Propojeno"
   - Email should persist
   - This proves token was stored in Convex

### Step 5: Test Sending Email with Connected Gmail

1. Go to **Trips** section
2. Create or open a trip
3. Go to **E-maily** tab
4. Create a draft email
5. Try to send it

**Expected**:
- Email sends successfully
- Uses the Gmail account you connected
- Recipient receives email from that address
- Check Gmail sent folder (should appear there)

### Step 6: Test User Restrictions

**Test**: Who can connect Gmail?

1. **As Troop Owner**: Should see login button ✅
2. **As Regular Member**: Should see "Pouze vlastník..." message ✅
3. **As Leader** (depends on role): Check your role system

## Debugging Guide

### Issue: "Chybí Gmail credentials"

**Root Cause**: Environment variables not loaded

**Fix**:
1. Check `.env.local` has these lines:
   ```
   NEXT_PUBLIC_GMAIL_CLIENT_ID=YOUR_GOOGLE_OAUTH_CLIENT_ID
   ```
2. Stop dev server: `Ctrl+C`
3. Restart: `npm run dev`
4. Clear browser cache
5. Try again

### Issue: "Výměna tokenu selhala"

**Root Cause**: Invalid client secret or redirect URI

**Fix**:
1. Verify `.env.local` has Gmail OAuth credentials configured
2. Credentials must exactly match Google Cloud Console settings
3. Check redirect URI matches exactly: `<APP_ORIGIN>/api/auth/gmail/callback`
4. Look at server logs: `npm run dev` output should show error details

### Issue: "Nepodařilo se získat refresh token"

**Root Cause**: Google didn't return refresh token (cached consent)

**Fix**:
1. This happens when user already authorized before
2. Clear Google account permissions:
   - Go to [myaccount.google.com/permissions](https://myaccount.google.com/permissions)
   - Find "SkautREG" or your app name
   - Remove access
   - Try again
3. Or use different Google account

### Issue: "Nelze načíst informace o uživateli"

**Root Cause**: Google userinfo API call failed

**Fix**:
1. Check access token is valid (shouldn't happen, but...)
2. Verify Gmail scope in button: `https://www.googleapis.com/auth/gmail.send`
3. Check Google account has public profile

### Issue: Token Expires During Testing

**Note**: Refresh tokens don't expire, so this shouldn't happen

**If it does**:
1. Need to re-authenticate
2. Click "Odpojit" then "Propojit s Gmailu" again
3. Should work with same Google account

## Production Testing Checklist

Before deploying:

### 1. Update Environment Variables

```bash
# Ensure Google redirect URI is set to:
<APP_ORIGIN>/api/auth/gmail/callback
```

### 2. Verify Google Cloud Console

- [Google Cloud Console](https://console.cloud.google.com)
- **APIs & Services** → **Credentials**
- Select OAuth 2.0 Client ID
- Check **Authorized JavaScript origins** include your domain and localhost (if needed)
- Check **Authorized redirect URIs** include `<APP_ORIGIN>/api/auth/gmail/callback`

### 3. Test on Staging

If you have staging server:
1. Deploy to staging
2. Test full OAuth flow
3. Test email sending
4. Monitor for errors

### 4. Test on Production

1. Deploy to production
2. Test OAuth with real account
3. Send test email
4. Verify it arrives correctly

## Monitoring & Logs

### Check Server Logs

During `npm run dev`:
- Should see request logs
- OAuth callback should log info
- Errors logged with details

Example successful logs:
```
[GET] /api/auth/gmail/callback?code=4/... (200)
[Token Exchange] Success
[User Info] Fetched email: user@gmail.com
[Redirect] Returning to settings with success params
```

### Check Browser Console

During OAuth:
1. Open DevTools: `F12`
2. Go to **Console** tab
3. Should see no errors
4. Window.location.href changes on login click
5. Page reloads after redirect

## Final Verification

Once working:

- [ ] ✅ Click button → redirects to Google
- [ ] ✅ Login → permission screen appears
- [ ] ✅ Grant permission → redirects back
- [ ] ✅ Settings page → shows connected email
- [ ] ✅ Refresh page → email persists
- [ ] ✅ Create email draft → can send
- [ ] ✅ Email arrives → check inbox
- [ ] ✅ Email from address → is connected Gmail
- [ ] ✅ Click "Odpojit" → removes connection
- [ ] ✅ Try again → can reconnect

## Success Criteria ✅

**OAuth flow working correctly when:**

1. **Login**: Redirects to Google, comes back with token
2. **Storage**: Email + token stored in Convex
3. **Persistence**: Survives page refresh
4. **Sending**: Can send emails with connected account
5. **Disconnection**: Can disconnect and reconnect
6. **Errors**: Clear error messages on failure
7. **Security**: No tokens in browser console
8. **UX**: Smooth, intuitive user experience

---

**Status**: Ready for testing! 🚀

Run `npm run dev` and start testing now!
