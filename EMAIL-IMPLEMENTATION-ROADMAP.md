# Multi-Provider Email - Implementation Roadmap

## ✅ What's Complete (Theoretical Implementation)

### Database & Schema
- [x] Updated `convex/schema.ts` with `emailProvider` field
- [x] Support for OAuth (Gmail)
- [x] Support for SMTP (Seznam, Centrum, O2)
- [x] Google Groups member mapping
- [x] Backward compatibility with legacy `gmailOAuth`

### Backend Functions
- [x] `connectEmailProvider()` mutation
- [x] `disconnectEmailProvider()` mutation
- [x] Updated `connectGmail()` to use new format
- [x] Updated `disconnectGmail()` to clear both formats

### Frontend UI
- [x] New `EmailSettings.tsx` component (700 lines)
- [x] Provider selection modal with icons
- [x] SMTP configuration form
- [x] Google Groups import flow
- [x] Member email mapping interface
- [x] Connection status display
- [x] Disconnect confirmation

### Documentation
- [x] Multi-provider implementation guide
- [x] Visual UI guide with diagrams
- [x] This roadmap document

---

## ⚠️ What's NOT Implemented (TODO for Production)

### 1. SMTP Email Sending (Critical)

**File:** `convex/mailer.ts`

**Current State:** Only supports Gmail OAuth  
**Needed:** Add SMTP transport for Seznam/Centrum/O2

```typescript
// Pseudo-code for SMTP sending
async function sendSmtpEmail(params: {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}) {
  // Use nodemailer or similar
  const transporter = createTransport({
    host: params.smtpHost,
    port: params.smtpPort,
    secure: true, // Use TLS
    auth: {
      user: params.smtpUser,
      pass: params.smtpPassword,
    },
  });

  await transporter.sendMail({
    from: params.from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}
```

**Steps:**
1. Install `nodemailer` package
2. Update `sendFromDraft()` to check provider type
3. Route to SMTP or OAuth based on `emailProvider.provider`
4. Handle SMTP errors (auth failed, network, rate limits)
5. Test with each provider (Seznam, Centrum, O2)

**Estimated Time:** 4-6 hours

---

### 2. Google Groups API Integration (High Priority)

**File:** New API route or Convex action

**Current State:** Uses mock data  
**Needed:** Real Google Groups API integration

**Steps:**
1. Set up Google Cloud Project
2. Enable Google Groups API
3. Get OAuth credentials for Groups scope
4. Create API route: `/api/google-groups/fetch`
5. Implement member fetching:
   ```typescript
   async function fetchGroupMembers(groupEmail: string, accessToken: string) {
     const response = await fetch(
       `https://www.googleapis.com/admin/directory/v1/groups/${groupEmail}/members`,
       {
         headers: { Authorization: `Bearer ${accessToken}` },
       }
     );
     const data = await response.json();
     return data.members.map(m => ({
       email: m.email,
       name: m.name,
     }));
   }
   ```
6. Update `EmailSettings.tsx` to call real API
7. Handle pagination for large groups (>100 members)

**Estimated Time:** 6-8 hours

---

### 3. Password Encryption (Security Critical)

**File:** `convex/troops.ts` + new encryption utility

**Current State:** SMTP passwords stored as plain text  
**Needed:** Encrypt passwords before storage

**Steps:**
1. Choose encryption library (e.g., `crypto-js`, `bcrypt`)
2. Generate encryption key (store in env var)
3. Create encryption utilities:
   ```typescript
   function encryptPassword(password: string): string {
     const key = process.env.ENCRYPTION_KEY;
     return encrypt(password, key);
   }

   function decryptPassword(encrypted: string): string {
     const key = process.env.ENCRYPTION_KEY;
     return decrypt(encrypted, key);
   }
   ```
4. Update `connectEmailProvider()` to encrypt before save
5. Update `mailer.ts` to decrypt before use
6. NEVER return decrypted password in queries

**Estimated Time:** 3-4 hours

---

### 4. Provider Connection Testing (Essential)

**Each Provider Needs:**
- [ ] Connection test button
- [ ] Send test email functionality
- [ ] Error message mapping
- [ ] Retry logic
- [ ] Rate limit handling

**Create:** `testEmailConnection()` mutation
```typescript
export const testEmailConnection = mutation({
  args: { troopId: v.id("troops") },
  handler: async (ctx, args) => {
    const troop = await ctx.db.get(args.troopId);
    const provider = troop.emailProvider;

    // Try to send test email
    try {
      if (provider.provider === "gmail") {
        // Test Gmail OAuth
      } else {
        // Test SMTP connection
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
});
```

**UI:**
```tsx
<button onClick={handleTestConnection}>
  Otestovat připojení
</button>
```

**Estimated Time:** 3-4 hours

---

### 5. Migration Script for Existing Users

**File:** New migration script

**Current State:** Existing users have `gmailOAuth`  
**Needed:** Migrate to new `emailProvider` format

```typescript
// convex/migrations/migrateEmailProviders.ts
export default async function migrateEmailProviders(ctx: any) {
  const troops = await ctx.db
    .query("troops")
    .filter((q: any) => 
      q.and(
        q.neq(q.field("gmailOAuth"), undefined),
        q.eq(q.field("emailProvider"), undefined)
      )
    )
    .collect();

  for (const troop of troops) {
    await ctx.db.patch(troop._id, {
      emailProvider: {
        provider: "gmail",
        email: troop.gmailOAuth.email,
        refreshToken: troop.gmailOAuth.refreshToken,
        connectedAt: troop.gmailOAuth.connectedAt,
        connectedBy: troop.gmailOAuth.connectedBy,
      },
    });
  }

  console.log(`Migrated ${troops.length} troops`);
}
```

**Run:**
```bash
npx convex run migrations/migrateEmailProviders.ts
```

**Estimated Time:** 1-2 hours

---

### 6. Email Provider Documentation for Users

**Create:** User-facing guide

**Topics:**
- How to get Seznam app password
- How to get Centrum app password
- How to get O2 app password
- Gmail OAuth explained
- Google Groups setup instructions
- Troubleshooting common issues

**Estimated Time:** 2-3 hours

---

### 7. Error Handling & User Feedback

**Improve:**
- Connection failure messages
- Invalid credentials detection
- Network timeout handling
- Rate limit warnings
- Provider-specific error codes

**Add to `EmailSettings.tsx`:**
```tsx
const ERROR_MESSAGES = {
  "535": "Neplatné přihlašovací údaje. Zkontrolujte heslo aplikace.",
  "550": "E-mailová adresa neexistuje.",
  "ETIMEDOUT": "Časový limit připojení. Zkuste znovu.",
  // ... more error codes
};
```

**Estimated Time:** 2-3 hours

---

## 📊 Priority Ranking

| Priority | Task | Impact | Effort | Status |
|----------|------|--------|--------|--------|
| 🔴 Critical | SMTP Email Sending | High | Medium | Not Started |
| 🔴 Critical | Password Encryption | High | Low | Not Started |
| 🟡 High | Google Groups API | Medium | High | Not Started |
| 🟡 High | Connection Testing | High | Low | Not Started |
| 🟢 Medium | Migration Script | Low | Low | Not Started |
| 🟢 Medium | User Documentation | Medium | Low | Not Started |
| 🟢 Low | Error Handling | Low | Low | Not Started |

---

## 🚀 Recommended Implementation Order

### Phase 1: Core Functionality (Week 1)
1. ✅ SMTP Email Sending
2. ✅ Password Encryption
3. ✅ Connection Testing

**Outcome:** Users can connect and send emails via Seznam/Centrum/O2

### Phase 2: Enhanced Features (Week 2)
4. ✅ Google Groups API Integration
5. ✅ Migration Script
6. ✅ Error Handling Improvements

**Outcome:** Full Google Groups support + migrated users

### Phase 3: Polish (Week 3)
7. ✅ User Documentation
8. ✅ Additional testing and bug fixes
9. ✅ Performance optimization

**Outcome:** Production-ready multi-provider email system

---

## 🧪 Testing Checklist

### Before Production:
- [ ] Gmail OAuth flow works end-to-end
- [ ] Seznam SMTP sends emails successfully
- [ ] Centrum SMTP sends emails successfully
- [ ] O2 SMTP sends emails successfully
- [ ] Google Groups fetches real members
- [ ] Member email mapping saves correctly
- [ ] Multiple emails per member works
- [ ] Disconnect removes all data
- [ ] Migration script tested on staging
- [ ] Encrypted passwords decrypt correctly
- [ ] Error messages are user-friendly
- [ ] Mobile UI is responsive
- [ ] Keyboard navigation works
- [ ] Load testing with 100+ members

---

## 💡 Additional Ideas (Future Enhancements)

### Email Templates
- Pre-defined templates for common emails
- Drag-and-drop email builder
- Template variables for personalization

### Email Analytics
- Track open rates
- Click tracking for links
- Bounce detection
- Unsubscribe management

### Bulk Operations
- Schedule emails for future sending
- Recurring emails (weekly reminders)
- A/B testing different subjects

### Advanced Google Groups
- Sync members automatically
- Two-way sync (update groups from app)
- Multiple group support

---

## 📞 Support & Maintenance

### Monitoring
- Log all email sends
- Track failure rates per provider
- Alert on high failure rates
- Weekly email health reports

### User Support
- Common issues FAQ
- In-app help tooltips
- Support ticket system
- Video tutorials

---

**Total Estimated Implementation Time:** 20-30 hours  
**Recommended Team Size:** 1-2 developers  
**Timeline:** 2-3 weeks for full production deployment

---

**Current Status:** ✅ UI Complete, Schema Ready, Backend Mutations Created  
**Next Step:** Implement SMTP email sending in `mailer.ts`  
**Blocker:** None - ready to proceed with implementation
