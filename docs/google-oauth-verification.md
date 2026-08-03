# Google OAuth production checklist

SkauTreg requests only `openid`, `email`, `profile`, and
`https://www.googleapis.com/auth/gmail.send`. It sends messages selected and
confirmed by an owner or main leader. It does not read Gmail messages.

## Production Google Cloud project

1. Use a dedicated production Google Cloud project. Keep staging in a separate project.
2. Enable the Gmail API.
3. Configure the OAuth consent screen as an external application.
4. Set the application name to `SkauTreg` and use a support address monitored by the operator.
5. Add the production homepage, `/privacy`, and `/tos` URLs on the verified custom domain.
6. Verify ownership of that domain in Google Search Console with a Google Cloud project owner/editor account.
7. Add exactly the production callback URI: `https://skautreg.overload.studio/api/auth/gmail/callback`.
8. Add the four scopes listed above and provide this justification:

   > SkauTreg lets an authorized scout-unit owner connect their Gmail account and send trip invitations, reminders, and logistical information selected in the application. The application needs `gmail.send` only to send those user-confirmed messages. It does not read, list, modify, or delete mailbox content.

9. Record an unlisted demonstration video showing the homepage, privacy policy, OAuth consent screen in English, connection status, recipient review, confirmation, one test send, delivery result, and disconnect action.
10. Submit brand and sensitive-scope verification. Set `NEXT_PUBLIC_GMAIL_OAUTH_VERIFICATION_STATUS=submitted` while under review and `verified` only after Google confirms approval.

## Google Workspace domains such as skaut.cz

OAuth verification and Workspace administrator approval are separate controls.
If Google shows `access_not_configured` or says that an institution administrator
must review the app, the affected user should click **Požádat o přístup**. The
Workspace administrator must then review the SkauTreg OAuth client in:

`Admin console → Security → Access and data control → API controls → App access control`

The administrator should verify the OAuth client ID against the production
Google Cloud project and configure access only for the required organizational
units/groups. App verification removes the public unverified-app warning, but it
does not override this administrator policy.

## Release evidence

- Approved OAuth application name and client ID (client ID is not a secret)
- Verified domain and Search Console owner
- Exact production callback URI
- Scope list and submitted justification
- Verification case/status
- Workspace administrator approval result for skaut.cz
- Internal test-send timestamp and recipient controlled by the operator

Never commit the client secret, refresh tokens, authorization codes, cookies, or
screenshots containing account data.

## Environment placement

The OAuth callback runs on Vercel, while token encryption and message delivery
run in Convex. Configure the variables in both systems deliberately:

- Vercel production: `APP_ORIGIN`, `NEXT_PUBLIC_GMAIL_CLIENT_ID`,
  `GMAIL_CLIENT_SECRET`, and `OAUTH_STATE_SECRET`.
- Convex production: `APP_ORIGIN`, `NEXT_PUBLIC_GMAIL_CLIENT_ID`,
  `GMAIL_CLIENT_SECRET`, and `CREDENTIAL_ENCRYPTION_KEY`.
- Vercel staging and Convex development/staging use separate Google OAuth
  credentials and a stable staging origin. Do not use an ephemeral preview URL
  as a callback and do not point preview deployments at production Convex.

Generate encryption/state secrets with a cryptographically secure generator and
store them only in the corresponding secret manager. The encryption key must be
backed up privately before encrypting an existing refresh token; losing it makes
that token unrecoverable and requires reconnecting Gmail.
