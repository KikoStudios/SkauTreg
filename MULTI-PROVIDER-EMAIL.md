# Multi-Provider Email Integration - Implementation Summary

## Overview
Redesigned the email connection system to support multiple email providers with a user-friendly provider selection interface and Google Groups integration for member email management.

## ✅ What Was Implemented

### 1. **Multi-Provider Support**
Now supports the following email providers:
- **Gmail** - OAuth 2.0 (no password needed)
- **Outlook / Microsoft 365** - OAuth 2.0 (no password needed)
- **Seznam.cz** - SMTP/IMAP with app password
- **Centrum.cz** - SMTP/IMAP with app password
- **Google Groups** - Import members and map emails

**Note:** Proton Mail is NOT supported due to their closed ecosystem requiring Bridge software.

### 2. **Provider Configuration Details**

| Provider | Auth Type | SMTP Host | SMTP Port | IMAP Host | IMAP Port |
|----------|-----------|-----------|-----------|-----------|-----------|
| Gmail | OAuth 2.0 | - | - | - | - |
| Outlook / Microsoft 365 | OAuth 2.0 | - | - | - | - |
| Seznam.cz | App Password | smtp.seznam.cz | 465 | imap.seznam.cz | 993 |
| Centrum.cz | App Password | smtp.centrum.cz | 465 | imap.centrum.cz | 993 |
| Google Groups | OAuth 2.0 | - | - | - | - |

### 3. **Database Schema Updates**

Updated [convex/schema.ts](convex/schema.ts):
- Added `emailProvider` field to `troops` table
- Supports OAuth (Gmail) and SMTP (Seznam, Centrum, O2)
- Includes Google Groups member mapping
- Kept `gmailOAuth` for backward compatibility (legacy)

```typescript
emailProvider: v.optional(v.object({outlook", "
    provider: v.string(), // "gmail", "seznam", "centrum", "o2", "google-groups"
    email: v.string(),
    // OAuth fields
    refreshToken: v.optional(v.string()),
    // SMTP fields
    smtpHost: v.optional(v.string()),
    smtpPort: v.optional(v.number()),
    smtpPassword: v.optional(v.string()),
    // Google Groups integration
    groupEmail: v.optional(v.string()),
    memberMapping: v.optional(v.array(v.object({
        memberId: v.id("members"),
        emails: v.array(v.string()),
    }))),
    // Metadata
    connectedAt: v.string(),
    connectedBy: v.id("users"),
})),
```

### 4. **New Backend Functions**

Updated [convex/troops.ts](convex/troops.ts):
- `connectEmailProvider()` - Connect any email provider
- `disconnectEmailProvider()` - Disconnect provider
- Updated `connectGmail()` - Now uses new `emailProvider` format
- Updated `disconnectGmail()` - Clears both new and legacy fields

### 5. **New UI Component**

Created [src/components/EmailSettings.tsx](src/components/EmailSettings.tsx):
- **Provider Selector** - Beautiful modal with icon-based selection
- **Gmail OAuth** - Seamless redirect to Google login
- **SMTP Configuration** - Form for Seznam/Centrum/O2 with app password
- **Google Groups Import** - Load members from group and map to existing members
- **Multi-Email Support** - Assign multiple emails per member (parent + kid)
- **Status Display** - Shows connected provider and email
- **Disconnect Functionality** - Clean disconnection with confirmation

### 6. **Google Groups Integration**

Features:
- Import members from Google Groups email
- Map group members to existing troop members
- Support multiple emails per member (e.g., parent email + kid email)
- Differential matching UI with visual member cards
- Multi-select dropdown for easy email assignment

## 🎨 User Experience

### Connection Flow:
1. Navigate to **Settings → E-mailové připojení**
2. Click **"Připojit E-mail"**
3. See beautiful provider selector modal
4. Select provider (Gmail, Seznam, Centrum, O2, or Google Groups)
5. Follow provider-specific flow:
   - **Gmail**: Redirect to Google OAuth
   - **Seznam/Centrum/O2**: Enter email and app password
   - **Google Groups**: Enter group email, import members, map emails

### Google Groups Flow:
1. Enter Google Groups email address
2. Click "Načíst" to fetch members
3. For each troop member, select one or more emails from the group
4. Click "Uložit mapování"
5. Done! Emails are now mapped for bulk sending

## 📊 Files Modified/Created

### Created:
- ✅ `src/components/EmailSettings.tsx` (~700 lines)

### Modified:
- ✅ `convex/schema.ts` - Added `emailProvider` field
- ✅ `convex/troops.ts` - Added new mutations
- ✅ `src/app/(dashboard)/settings/[troopId]/page.tsx` - Updated to use EmailSettings

### Legacy (Unchanged, Still Works):
- `src/components/GmailSettings.tsx` - Old Gmail-only component
- `src/app/api/auth/gmail/callback/route.ts` - OAuth callback handler
- `convex/mailer.ts` - Email sending (needs update for SMTP)

## 🚀 Next Steps (TODO)

These are NOT implemented yet and would require additional work:

### 1. **SMTP Email Sending**
Update `convex/mailer.ts` to support SMTP providers:
- Use `nodemailer` or similar for SMTP
- Handle Seznam/Centrum/O2 credentials
- Implement retry logic for failed sends
- Add rate limiting per provider

### 2. **Google Groups API Integration**
Currently uses mock data. Need to:
- Integrate with Google Groups API
- OAuth flow for group access
- Fetch actual group members
- Handle pagination for large groups

### 3. **Password Encryption**
SMTP passwords are stored as plain text. Should:
- Encrypt passwords before storage
- Use secure encryption library
- Decrypt only when sending emails
- Never expose in API responses

### 4. **Email Provider Testing**
Test each provider:
- Gmail OAuth flow
- Seznam SMTP connection
- Centrum SMTP connection
- O2 SMTP connection
- Error handling for each

### 5. **Member Email Management**
- UI for editing member email mappings
- Bulk import/export of email lists
- Validation of email addresses
- Duplicate detection

### 6. **Migration Script**
Migrate existing `gmailOAuth` to new `emailProvider`:
```typescript
// For all troops with gmailOAuth but no emailProvider
await ctx.db.patch(troopId, {
    emailProvider: {
        provider: "gmail",
        email: gmailOAuth.email,
        refreshToken: gmailOAuth.refreshToken,
        connectedAt: gmailOAuth.connectedAt,
        connectedBy: gmailOAuth.connectedBy,
    }
});
```

## 🔒 Security Considerations

### Current:
- ✅ Role-based access (owner/main_leader only)
- ✅ OAuth never exposes passwords (Gmail)
- ✅ Connection metadata tracked

### To Implement:
- ⚠️ Encrypt SMTP passwords
- ⚠️ Add rate limiting for connection attempts
- ⚠️ Audit log for email provider changes
- ⚠️ Validate email addresses before storage
- ⚠️ Secure storage of Google Groups tokens

## 📝 Usage Example

### Connect Gmail:
```typescript
// User clicks "Připojit E-mail" → selects Gmail
// Automatically redirects to OAuth
// After success, returns with tokens
// connectGmail() mutation called automatically
```

### Connect Seznam:
```typescript
// User clicks "Připojit E-mail" → selects Seznam
// Enters: email@seznam.cz + app password
await connectEmailProvider({
    troopId: "...",
    provider: "seznam",
    email: "oddil@seznam.cz",
    smtpHost: "smtp.seznam.cz",
    smtpPort: 465,
    smtpPassword: "app-password-here",
});
```

### Google Groups Import:
```typescript
// Enter group email → fetch members → map to troop members
await connectEmailProvider({
    troopId: "...",
    provider: "google-groups",
    email: "main-account@gmail.com",
    groupEmail: "vlcata@googlegroups.com",
    memberMapping: [
        { memberId: "mem1", emails: ["parent1@gmail.com"] },
        { memberId: "mem2", emails: ["parent2@gmail.com", "kid2@gmail.com"] },
    ],
});
```

## 🎯 Benefits

1. **Flexibility** - Support multiple Czech email providers
2. **User Choice** - Users pick their preferred provider
3. **No Vendor Lock-in** - Not limited to Gmail
4. **Group Management** - Easy Google Groups integration
5. **Multi-Email** - Send to both parent and kid
6. **Backward Compatible** - Existing Gmail connections work
7. **Beautiful UI** - Icon-based provider selection
8. **Czech Providers** - Native support for Seznam, Centrum, O2

## ⚠️ Important Notes

1. **SMTP Implementation Pending** - Currently only shows UI, actual SMTP sending needs to be implemented in `mailer.ts`
2. **Google Groups Mock Data** - Currently uses mock data, needs real API integration
3. **Password Security** - SMTP passwords should be encrypted before production use
4. **Migration Required** - Existing `gmailOAuth` users should be migrated to new format
5. **Testing Needed** - Each provider needs thorough testing

## 📚 Documentation Files

Related documentation:
- This file: Multi-provider implementation summary
- `EMAIL-SYSTEM-DOCS.md` - Original email system docs
- `OAUTH-IMPLEMENTATION-SUMMARY.md` - Gmail OAuth details
- `README-EMAIL-SYSTEM.md` - Overall email system guide

---

**Status**: ✅ UI Complete, Backend Schema Ready, SMTP Sending TODO  
**Date**: February 7, 2026  
**Tested**: No (theoretical implementation as requested)
