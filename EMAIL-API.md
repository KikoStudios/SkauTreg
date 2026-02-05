# Email System - API Reference

## Overview

This document outlines all the API endpoints (Convex functions) for the email system.

---

## Email Drafts (`emailDrafts.ts`)

### `emailDrafts.create`
**Type:** Mutation  
**Authentication:** Required  

Creates a new email draft for a trip.

**Arguments:**
```typescript
{
  tripId: Id<"trips">,    // Trip ID
  subject: string,        // Email subject
  body: string           // Email body (may contain smart tags)
}
```

**Returns:** `Id<"email_drafts">` - ID of created draft

**Errors:**
- "Unauthenticated" - User not logged in
- "User not found in DB" - User not found
- "Trip not found" - Trip not found

**Example:**
```typescript
const draftId = await createDraft({
  tripId: "trip_123",
  subject: "Přihláška",
  body: "Ahoj <user.name>, <user.sign.link>"
});
```

---

### `emailDrafts.update`
**Type:** Mutation  
**Authentication:** Required  

Updates an existing draft. Only drafts (not sent emails) can be edited.

**Arguments:**
```typescript
{
  id: Id<"email_drafts">,
  subject?: string,       // Optional: new subject
  body?: string          // Optional: new body
}
```

**Returns:** `void`

**Errors:**
- "Unauthenticated"
- "Draft not found"
- "Cannot edit sent email"

---

### `emailDrafts.remove`
**Type:** Mutation  
**Authentication:** Required  

Deletes a draft. Only drafts (not sent emails) can be deleted.

**Arguments:**
```typescript
{
  id: Id<"email_drafts">
}
```

**Returns:** `void`

**Errors:**
- "Draft not found"
- "Cannot delete sent email"

---

### `emailDrafts.listByTrip`
**Type:** Query  
**Authentication:** Optional (but filtered)

Lists all email drafts for a trip, enriched with creator info.

**Arguments:**
```typescript
{
  tripId: Id<"trips">
}
```

**Returns:**
```typescript
Array<{
  _id: Id<"email_drafts">,
  tripId: Id<"trips">,
  subject: string,
  body: string,
  createdBy: Id<"users">,
  createdAt: string,
  updatedAt: string,
  status: "draft" | "sent",
  sentAt?: string,
  sentBy?: Id<"users">,
  recipientCount?: number,
  creator?: {
    _id: Id<"users">,
    name?: string,
    email?: string
  },
  sender?: {
    _id: Id<"users">,
    name?: string,
    email?: string
  }
}>
```

---

### `emailDrafts.getById`
**Type:** Query  
**Authentication:** Optional

Gets a single draft by ID with enriched info.

**Arguments:**
```typescript
{
  id: Id<"email_drafts">
}
```

**Returns:**
```typescript
{
  _id: Id<"email_drafts">,
  tripId: Id<"trips">,
  subject: string,
  body: string,
  createdBy: Id<"users">,
  createdAt: string,
  updatedAt: string,
  status: "draft" | "sent",
  sentAt?: string,
  sentBy?: Id<"users">,
  recipientCount?: number,
  creator?: {
    _id: Id<"users">,
    name?: string,
    email?: string
  },
  sender?: {
    _id: Id<"users">,
    name?: string,
    email?: string
  }
} | null
```

---

### `emailDrafts.markAsSent`
**Type:** Mutation  
**Authentication:** Required  

Marks a draft as sent (called automatically after sending).

**Arguments:**
```typescript
{
  id: Id<"email_drafts">,
  recipientCount: number  // Number of emails sent
}
```

**Returns:** `void`

**Errors:**
- "Unauthenticated"
- "User not found"

---

### `emailDrafts.getRecipients`
**Type:** Query  
**Authentication:** Optional

Gets preview data about recipients (members with emails) for a trip.

**Arguments:**
```typescript
{
  tripId: Id<"trips">
}
```

**Returns:**
```typescript
{
  total: number,                    // Total members
  withEmail: number,               // Members with email
  withoutEmail: number,            // Members without email
  recipients: Array<{
    memberId?: Id<"members">,
    name?: string,
    email?: string,
    accessKey?: string,
    hasEmail: boolean
  }>
}
```

---

## Troops (`troops.ts`)

### `troops.connectGmail`
**Type:** Mutation  
**Authentication:** Required  
**Authorization:** Owner or main_leader

Connects a Gmail account to the troop for email sending.

**Arguments:**
```typescript
{
  troopId: Id<"troops">,
  email: string,          // OAuth email address (e.g., info@oddil.cz)
  refreshToken: string   // OAuth refresh token
}
```

**Returns:** `void`

**Errors:**
- "Unauthenticated"
- "User not found"
- "Troop not found"
- "Nemáte oprávnění nastavovat Gmail." (not owner/main_leader)

**Security Note:** Store refreshToken securely. Never expose on frontend.

---

### `troops.disconnectGmail`
**Type:** Mutation  
**Authentication:** Required  
**Authorization:** Owner or main_leader

Disconnects Gmail account (reverts to global GMAIL_SENDER).

**Arguments:**
```typescript
{
  troopId: Id<"troops">
}
```

**Returns:** `void`

**Errors:**
- "Unauthenticated"
- "User not found"
- "Nemáte oprávnění nastavovat Gmail."

---

## Mailer (`mailer.ts`)

### `mailer.sendFromDraft`
**Type:** Action  
**Authentication:** Required  
**Authorization:** Owner or main_leader

Sends an email draft to all trip members with smart tag personalization.

**Arguments:**
```typescript
{
  draftId: Id<"email_drafts">,
  baseUrl: string  // e.g., "https://skautreg.cz"
}
```

**Returns:**
```typescript
{
  sentCount: number,                // Emails sent successfully
  skippedCount: number,            // Members without email
  failed: Array<{
    email: string,
    error: string
  }>,
  total: number                     // Total members
}
```

**Smart Tag Replacement:**
- `<user.sign.link>` → Unique RSVP link for member
- `<user.name>` → Member's name
- `@userlink` → Legacy format (still supported)

**Errors:**
- "Unauthenticated"
- "User not found"
- "Draft not found"
- "This email has already been sent"
- "Trip not found"
- "Troop not found"
- "Pouze vedoucí může odesílat e-maily." (not leader/owner)
- "Gmail token error" (refresh token expired)

**Side Effects:**
- Marks draft as sent
- Updates draft.sentAt and draft.sentBy
- Updates draft.recipientCount

---

### `mailer.sendTripEmail`
**Type:** Action  
**Authentication:** Required  
**Authorization:** Owner or main_leader

Legacy function for direct email sending (without draft).

**Arguments:**
```typescript
{
  tripId: Id<"trips">,
  subject: string,
  body: string,
  baseUrl: string
}
```

**Returns:**
```typescript
{
  sentCount: number,
  skippedCount: number,
  failed: Array<{ email: string; error: string }>,
  total: number
}
```

**Note:** Use `sendFromDraft` for new implementations.

---

## Data Schema

### email_drafts Table

```typescript
{
  _id: Id<"email_drafts">,
  tripId: Id<"trips">,
  subject: string,
  body: string,
  createdBy: Id<"users">,
  createdAt: string,         // ISO timestamp
  updatedAt: string,         // ISO timestamp
  status: "draft" | "sent",
  sentAt?: string,           // ISO timestamp
  sentBy?: Id<"users">,
  recipientCount?: number,
  _creationTime: number      // Convex internal
}
```

### Index
- `by_trip`: `["tripId"]` - Query all drafts for a trip

---

### troops Table (Extended)

```typescript
{
  // ... existing fields ...
  gmailOAuth?: {
    email: string,
    refreshToken: string,
    connectedAt: string,      // ISO timestamp
    connectedBy: Id<"users">
  }
}
```

---

## Error Handling

All functions follow standard error handling:

```typescript
try {
  await sendFromDraft({ draftId, baseUrl });
} catch (error) {
  // error.message contains human-readable message
  // error.message is typically in Czech
}
```

Common error messages:
- "Unauthenticated" - Not logged in
- "Nemáte oprávnění" - Permission denied
- "... not found" - Resource not found
- "Gmail token error: ..." - OAuth issue
- "Missing env: GMAIL_CLIENT_ID" - Server config issue

---

## Rate Limiting

No explicit rate limiting implemented. Gmail API has limits:
- ~100 emails per second per user
- 10,000 emails per day

For large campaigns (>1000 emails), consider:
1. Batch sending with delays
2. Implement retry logic
3. Monitor Gmail API quota

---

## Testing

### Unit Test Example
```typescript
import { test, expect } from "vitest";
import { api } from "convex/_generated/api";

test("Create email draft", async () => {
  const draftId = await db.mutation(api.emailDrafts.create, {
    tripId: "trip_123",
    subject: "Test",
    body: "Body"
  });
  
  expect(draftId).toBeDefined();
});

test("Smart tag replacement", async () => {
  const result = await action(api.mailer.sendFromDraft, {
    draftId: "draft_123",
    baseUrl: "https://localhost:3000"
  });
  
  expect(result.sentCount).toBeGreaterThan(0);
  expect(result.failed).toHaveLength(0);
});
```

---

## Performance Notes

- `listByTrip` enumerates all participants - O(n)
- `getRecipients` filters for emails - O(n)
- `sendFromDraft` makes HTTP requests to Gmail - O(n) blocking

For large trips (>500 members):
- Consider implementing background jobs
- Implement retry logic
- Add progress tracking

---

## Security Considerations

### OAuth Token Storage
```typescript
// ✅ SAFE
const refreshToken = troop.gmailOAuth.refreshToken;  // In DB only
const accessToken = await getGmailAccessToken(refreshToken); // Short-lived

// ❌ UNSAFE
// Never send refreshToken to client
// Never log refreshToken
// Never expose in error messages
```

### AccessKey Uniqueness
```typescript
// Each member gets unique accessKey for RSVP
// These are generated as random strings
// Prevents email spoofing/takeover
```

---

## Migration from Old System

If migrating from `sendTripEmail` (old system):

```typescript
// Old way
await sendTripEmail({
  tripId,
  subject: "Test",
  body: "Body with @userlink",
  baseUrl
});

// New way
const draftId = await createDraft({
  tripId,
  subject: "Test",
  body: "Body with <user.sign.link>"
});

await sendFromDraft({
  draftId,
  baseUrl
});
```

Both formats are supported for backwards compatibility.

---

## Changelog

### v1.0 (Current)
- Initial implementation
- Gmail OAuth 2.0 support
- Smart tags: `<user.sign.link>`, `<user.name>`
- Role-based permissions
- Draft management
