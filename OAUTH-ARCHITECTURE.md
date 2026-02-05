# OAuth 2.0 Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SKAUTREG FRONTEND                         │
│  src/components/GmailSettings.tsx                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Settings Page - Gmail propojení Section                   │ │
│  │                                                             │ │
│  │  ┌──────────────────────┐                                  │ │
│  │  │  "Propojit s Gmailu" │ ← Click here                    │ │
│  │  │   (OAuth Button)     │                                  │ │
│  │  └──────────────────────┘                                  │ │
│  │                │                                            │ │
│  │                └─→ handleLoginClick()                      │ │
│  │                    ↓                                        │ │
│  │                   Redirect to Google                       │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTPS
                       ↓
┌──────────────────────────────────────────────────────────────────┐
│            GOOGLE OAUTH 2.0 ENDPOINT                             │
│         accounts.google.com/o/oauth2/auth                       │
│                                                                   │
│  Params:                                                         │
│  - client_id=806370560203-...                                   │
│  - redirect_uri=localhost:3000/api/auth/gmail/callback         │
│  - response_type=code                                           │
│  - scope=gmail.send                                             │
│  - access_type=offline                                          │
│  - prompt=consent                                               │
│                                                                   │
│  User: 1. Login with Google                                     │
│        2. See permission screen                                 │
│        3. Click "Allow"                                         │
│                                                                   │
│  Google redirects back with code:                               │
│  → /api/auth/gmail/callback?code=4/...&state=...               │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTPS
                       ↓
┌──────────────────────────────────────────────────────────────────┐
│         SKAUTREG BACKEND - OAuth Callback                        │
│  src/app/api/auth/gmail/callback/route.ts                       │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Step 1: Receive authorization code                       │ │
│  │  GET /api/auth/gmail/callback?code=4/...&state=...        │ │
│  │                                                             │ │
│  │  Step 2: Validate code and state (security)               │ │
│  │  ✓ Code exists                                             │ │
│  │  ✓ No OAuth errors                                         │ │
│  │                                                             │ │
│  │  Step 3: Exchange code for tokens (SERVER-SIDE)           │ │
│  │  POST /oauth2.googleapis.com/token                         │ │
│  │  ├─ client_id=...                                          │ │
│  │  ├─ client_secret=GOCSPX-... (SECRET!)                    │ │
│  │  ├─ code=4/...                                             │ │
│  │  ├─ grant_type=authorization_code                          │ │
│  │  └─ redirect_uri=...                                       │ │
│  │                                                             │ │
│  │  Response: {                                               │ │
│  │    "access_token": "ya29...",                              │ │
│  │    "refresh_token": "1//...",  ← Store this!              │ │
│  │    "expires_in": 3599,                                     │ │
│  │    "scope": "https://www.googleapis.com/auth/gmail.send",  │ │
│  │    "token_type": "Bearer"                                  │ │
│  │  }                                                          │ │
│  │                                                             │ │
│  │  Step 4: Fetch user email (using access token)            │ │
│  │  GET /oauth2/v2/userinfo                                   │ │
│  │  Header: Authorization: Bearer ya29...                     │ │
│  │                                                             │ │
│  │  Response: {                                               │ │
│  │    "id": "12345...",                                       │ │
│  │    "email": "user@gmail.com",    ← Display this!          │ │
│  │    "verified_email": true,                                 │ │
│  │    "name": "User Name",                                    │ │
│  │    "picture": "https://..."                                │ │
│  │  }                                                          │ │
│  │                                                             │ │
│  │  Step 5: Discard access token (no longer needed)           │ │
│  │                                                             │ │
│  │  Step 6: Redirect back to frontend with params             │ │
│  │  Location: /settings?gmail_connected=true                  │ │
│  │                        &email=user@gmail.com               │ │
│  │                        &refresh_token=1//...               │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTPS
                       ↓
┌──────────────────────────────────────────────────────────────────┐
│                   SKAUTREG FRONTEND (AGAIN)                      │
│         User redirected back to Settings page                    │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Step 1: useSearchParams() detects params in URL          │ │
│  │  - gmail_connected=true                                    │ │
│  │  - email=user@gmail.com                                    │ │
│  │  - refresh_token=1//...                                    │ │
│  │                                                             │ │
│  │  Step 2: Call handleOAuthCallback()                        │ │
│  │  - setError(null)                                          │ │
│  │  - Call connectGmail mutation                              │ │
│  │                                                             │ │
│  │  Step 3: Clean URL (remove params)                         │ │
│  │  window.history.replaceState()                             │ │
│  │                                                             │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │              ✓ SUCCESS DISPLAY                       │  │ │
│  │  │  ┌────────────────────────────────────────────────┐  │  │ │
│  │  │  │ ✓ Propojeno                                    │  │  │ │
│  │  │  │ E-mail: user@gmail.com                         │  │  │ │
│  │  │  │ Propojeno: 20.1.2025 10:30:00                  │  │  │ │
│  │  │  │                                                 │  │  │ │
│  │  │  │ [Odpojit]  ← Click to disconnect              │  │  │ │
│  │  │  └────────────────────────────────────────────────┘  │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓
┌──────────────────────────────────────────────────────────────────┐
│                    CONVEX DATABASE MUTATION                      │
│         convex/troops.ts - connectGmail(...)                     │
│                                                                   │
│  Store in troops table:                                          │
│  {                                                               │
│    _id: "...",                                                   │
│    name: "Oddíl",                                                │
│    gmailOAuth: {                                                 │
│      email: "user@gmail.com",                                    │
│      refreshToken: "1//...", ← For sending emails              │
│      connectedAt: "2025-01-20T10:30:00Z"                         │
│    }                                                             │
│  }                                                               │
│                                                                   │
│  Ready for use by:                                              │
│  - mailer.sendFromDraft() ← Uses refreshToken to send emails   │
│  - EmailDraftsTab ← Can now send drafted emails                 │
└──────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│  AUTHORIZATION GRANT FLOW (OAuth 2.0 - RFC 6749)                  │
└────────────────────────────────────────────────────────────────────┘

  Resource Owner              Client                    Auth Server
      (User)              (SkautREG)                   (Google)
        │                     │                           │
        │ 1. Clicks Button    │                           │
        ├────────────────────→│                           │
        │                     │ 2. Redirect to Auth       │
        │                     │    w/ client_id, scope    │
        │                     ├──────────────────────────→│
        │                     │                           │
        │ 3. Logs In & Authorizes                         │
        │←──────────────────────────────────────────────→│
        │                     │                           │
        │                     │ 4. Redirect with Code     │
        │                     │←──────────────────────────┤
        │                     │                           │
        │                     │ 5. Exchange Code           │
        │                     │    (with client_secret)   │
        │                     ├──────────────────────────→│
        │                     │                           │
        │                     │ 6. Return Access Token    │
        │                     │    & Refresh Token        │
        │                     │←──────────────────────────┤
        │                     │                           │
        │                     │ 7. Store in Database      │
        │                     ├──────┐                    │
        │                     │      │ (Convex)           │
        │                     │←─────┘                    │
        │                     │                           │
        │ 8. Confirm Success  │                           │
        │←────────────────────┤                           │
        │                     │                           │
        │ 9. Ready to Send    │                           │
        │    Emails           │                           │
```

## Component Interaction Diagram

```
                    GmailSettings.tsx
                    ═════════════════
                           │
                           ├─ OAuth Button
                           │  └─ handleLoginClick()
                           │     └─ Redirect to Google
                           │
                           ├─ useSearchParams Hook
                           │  └─ Detects callback params
                           │     └─ handleOAuthCallback()
                           │
                           ├─ connectGmail Mutation
                           │  └─ Stores token in Convex
                           │
                           └─ Display State
                              ├─ Connected ✓
                              ├─ Error Message
                              └─ Loading State
                                   │
                                   ↓
                          EmailDraftsTab.tsx
                          ════════════════
                                   │
                                   ├─ sendFromDraft()
                                   │  └─ Uses refresh_token
                                   │     └─ Sends with Gmail
                                   │
                                   └─ Shows "Odesláno"
```

## Security Token Flow

```
SENSITIVE DATA HANDLING:

                               TOKEN PATH
                               ══════════

CLIENT (Browser)          TRANSIT                SERVER
────────────────          ──────                 ──────
  │                         │                      │
  │                         │                      │
  │ (1) Client               │                      │
  │     VISIBLE!          │                      │
  │ - client_id (public)  │                      │
  │ - redirect_uri        │                      │
  │ - scope               │                      │
  │ - state               │                      │
  └────────────────────────→ (2) Over HTTPS      │
                             │                      │
                             │ ENCRYPTED!          │
                             │ Safe in transit      │
                             │                      │
                             └─────────────────────→ (3) Server Only
                                                      - client_secret
                                                      - code
                                                      - Exchanges code
                                                        for tokens
                                                      │
                                                      ├─ access_token
                                                      │  └─ Use once,
                                                      │     then discard
                                                      │
                                                      ├─ refresh_token
                                                      │  └─ STORE
                                                      │     SECURE!
                                                      │
                                                      └─ email
                                                         └─ Return
                                                            to client
  ←──────────────────────────────────────────────────────┤
  │                     Over HTTPS                      │
  │                     (4) Encrypted                   │
  │                                                     │
  (5) CLIENT (Browser)
      - DOES NOT SEE secrets
      - DOES NOT SEE client_secret
      - DOES NOT SEE access_token
      - ONLY GETS email + success flag
      - Calls mutation with email
      
      Convex Mutation
      └─ Receives refresh_token
         from secure channel
         └─ Stores in database
            (only server accesses)
```

## Error Handling Flow

```
                     OAuth Error Scenarios
                     ═══════════════════

  ┌─────────────────────────────────────┐
  │  1. User Denies Permission          │
  │     Google redirects with error     │
  │     ↓                               │
  │  Error message shown in red box     │
  │  "Uživatel zamítl přístup"          │
  └─────────────────────────────────────┘

  ┌─────────────────────────────────────┐
  │  2. Invalid Client Secret           │
  │     Token exchange fails            │
  │     ↓                               │
  │  Error logged server-side           │
  │  "Výměna tokenu selhala"            │
  │  User can try again                 │
  └─────────────────────────────────────┘

  ┌─────────────────────────────────────┐
  │  3. Userinfo Fetch Fails            │
  │     No refresh token in response    │
  │     ↓                               │
  │  Error message                      │
  │  "Nepodařilo se získat refresh..."  │
  │  Advise user to try with new        │
  │  account or clear permissions       │
  └─────────────────────────────────────┘

  ┌─────────────────────────────────────┐
  │  4. Missing Configuration           │
  │     .env.local incomplete           │
  │     ↓                               │
  │  Frontend error                     │
  │  "Chybí Gmail credentials"          │
  │  Check environment variables        │
  └─────────────────────────────────────┘
```

## Environment Variables

```
┌──────────────────────────────────────────────────┐
│         .env.local Configuration                │
├──────────────────────────────────────────────────┤
│                                                   │
│ NEXT_PUBLIC_GMAIL_CLIENT_ID=                    │
│   806370560203-kqprmv01ct12d8qujuu0tqqqguo...  │
│   └─ PUBLIC: Visible in browser                 │
│      Used in OAuth URL                          │
│                                                   │
│ NEXT_PUBLIC_GMAIL_REDIRECT_URI=                 │
│   http://localhost:3000/api/auth/gmail/callback │
│   └─ PUBLIC: Visible in browser                 │
│      Must match Google Cloud Console            │
│                                                   │
│ GMAIL_CLIENT_SECRET=<YOUR_SECRET>               │
│   └─ SECRET: Server-side only!                  │
│      Never in browser                           │
│      Used for token exchange                    │
│                                                   │
│ GMAIL_REDIRECT_URI=                             │
│   http://localhost:3000/api/auth/gmail/callback │
│   └─ Server-side copy of redirect URI           │
│      Must match client-side version             │
│                                                   │
└──────────────────────────────────────────────────┘
```

---

This diagram shows the complete OAuth 2.0 flow from user clicking the button through secure token storage in the Convex database.
