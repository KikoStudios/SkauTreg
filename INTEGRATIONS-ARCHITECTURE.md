# 🏗️ Integrations Architecture Deep Dive

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER INTERFACE LAYER                          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Integration  │  │ Connections  │  │  Workflow    │          │
│  │    Hub       │  │   Manager    │  │   Builder    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         └─────────────────┼─────────────────┘                   │
│                           │                                      │
└─────────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────────┐
│                     CONVEX API LAYER                             │
│                                                                  │
│  ┌────────────────────┐         ┌────────────────────┐         │
│  │  integrations.ts   │         │integration_actions │         │
│  │                    │         │      .ts           │         │
│  │ - create()         │         │                    │         │
│  │ - update()         │         │ - create()         │         │
│  │ - delete()         │         │ - update()         │         │
│  │ - test()           │         │ - toggleEnabled()  │         │
│  │ - getByTroop()     │         │ - logExecution()   │         │
│  └────────┬───────────┘         └────────┬───────────┘         │
│           │                              │                     │
└─────────────────────────────────────────────────────────────────┘
            │                              │
┌───────────┴──────────────────────────────┴──────────────────────┐
│                   DATABASE LAYER (Convex)                        │
│                                                                  │
│  ┌──────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│  │ integrations │  │integration_    │  │ integration_    │   │
│  │             │  │   actions      │  │    logs         │   │
│  │ - name      │  │               │  │                 │   │
│  │ - type      │  │ - trigger     │  │ - status        │   │
│  │ - config    │  │ - message     │  │ - execution     │   │
│  │ - auth      │  │ - enabled     │  │ - error logs    │   │
│  │ - test      │  │ - log history │  │ - timestamps    │   │
│  └─────────────┘  └─────────────────┘  └─────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
            │                              │                  │
┌───────────┴──────────────────────────────┼──────────────────┴──┐
│                EVENT TRIGGERS (Future)                          │
│                                                                 │
│  Internal Event Bus (from Convex mutations)                   │
│  ├─ member_unregistered_late                                 │
│  ├─ new_trip_created                                         │
│  ├─ payment_received                                         │
│  └─ trip_assigned_base                                       │
│                                                               │
└───────────────────────────────────────────────────────────────┘
            │
┌───────────┴────────────────────────────────────────────────────┐
│              EXTERNAL SERVICE LAYER                             │
│                                                                │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────┐ │
│  │ Discord API    │  │  SMTP/Email    │  │  WhatsApp API   │ │
│  │ (Webhooks)     │  │  Providers     │  │  (Business)     │ │
│  │                │  │                │  │                 │ │
│  │ POST /webhook  │  │ sendmail()     │  │ POST /messages  │ │
│  └────────────────┘  └────────────────┘  └─────────────────┘ │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Creating an Integration

```
User Interface
    ↓
[ConnectionsManager.tsx]
    ├─ Displays form for service type
    ├─ Validates inputs
    ├─ Encrypts sensitive data (future)
    ↓
useMutation(api.integrations.create)
    ↓
[convex/integrations.ts - create()]
    ├─ Verify authentication
    ├─ Check authorization (is leader?)
    ├─ Validate configuration
    ├─ Insert into DB
    ↓
Database: integrations table
    ├─ id: uniquely generated
    ├─ troopId: linked to troop
    ├─ all config fields
    ↓
UI Update
    ├─ New integration appears in list
    ├─ Form cleared for next entry
```

---

## Data Flow: Testing an Integration

```
User clicks "Test" button
    ↓
[ConnectionsManager.tsx - handleTest()]
    ├─ Get integrationId from state
    ├─ Call testIntegration mutation
    ↓
[convex/integrations.ts - testIntegration()]
    ├─ Fetch integration config
    ├─ Determine service type
    ├─ Send test payload
    │  ├─ Discord: POST to webhook URL
    │  ├─ Email: SMTP handshake
    │  ├─ Custom: HTTP request
    ├─ Catch errors if any
    ├─ Update testStatus & testError
    ↓
Database: integrations.testStatus = "success"/"failed"
    ↓
UI Feedback
    ├─ Success toast: "Integration working!"
    ├─ Error toast: Shows error message
```

---

## Data Flow: Creating an Automation

```
User creates automation
    ↓
[WorkflowBuilder.tsx]
    ├─ Select trigger event
    ├─ Select target integration
    ├─ Write message template
    ├─ Validate inputs
    ↓
useMutation(api.integration_actions.create)
    ↓
[convex/integration_actions.ts - create()]
    ├─ Verify user authorization
    ├─ Verify integration belongs to troop
    ├─ Parse conditions (if any)
    ├─ Insert into DB
    ├─ Set isEnabled = true
    ├─ Set triggerCount = 0
    ↓
Database: integration_actions table
    ├─ Linked to correct integration
    ├─ Linked to correct trigger
    ├─ Template stored for later rendering
    ↓
UI Confirmation
    ├─ Toast: "Automation created!"
    ├─ Add to actions list
    ├─ Show in left sidebar
```

---

## Data Flow: Action Execution (Planned Phase 2)

```
Internal App Event Triggered
    │
    ├─ member_unregistered_late event fired
    │  └─ Event data: {member_id, trip_id, leader_id}
    │
    ↓
[convex/actions.ts - executeAction()]
    ├─ Get all actions for this trigger
    │  api.integration_actions.getByTrigger(trigger)
    │
    ├─ FOR EACH action:
    │  ├─ Check if enabled? isEnabled = true
    │  ├─ Evaluate conditions
    │  │  ├─ Compare {event.field} against {condition.value}
    │  │  ├─ Return false if conditions don't match
    │  │
    │  ├─ Fetch integration config
    │  ├─ Render message template
    │  │  ├─ Replace {member_name} with actual name
    │  │  ├─ Replace {trip_title} with actual title
    │  │  ├─ Replace all dynamic variables
    │  │
    │  ├─ Send message to integration
    │  │  ├─ Discord: Call webhook
    │  │  ├─ Email: Send via SMTP
    │  │  ├─ WhatsApp: Call API
    │  │
    │  ├─ Handle response
    │  │  ├─ Success: Log with status="success"
    │  │  ├─ Failure: Retry logic (if enabled)
    │  │
    │  └─ Log execution result
    │     └─ api.integration_actions.logExecution()
    │
    ↓
Database: integration_logs
    ├─ Record what happened
    ├─ Store error if failed
    ├─ Track execution time
    └─ Increment action.triggerCount
```

---

## Component Interaction Map

```
TroopSettingsPage [troopId]
│
└─ IntegrationsTab [troopId]
   │
   ├─ View State: activeView (hub/connections/actions)
   │
   ├─ IF activeView === "hub"
   │  └─ IntegrationHub [troopId]
   │     ├─ Query: integrations (via useQuery)
   │     ├─ Query: actions (via useQuery)
   │     ├─ Display: Status cards
   │     ├─ Display: Service buttons
   │     └─ Handlers: onNavigate()
   │
   ├─ IF activeView === "connections"
   │  └─ ConnectionsManager [troopId]
   │     ├─ Query: integrations (useQuery)
   │     ├─ Mutation: create, update, delete, test
   │     ├─ State: selectedIntegration
   │     ├─ State: formState (name, type, config)
   │     ├─ Component: Integration list (left)
   │     ├─ Component: Config form (right)
   │     └─ Handlers: save, delete, test
   │
   └─ IF activeView === "actions"
      └─ WorkflowBuilder [troopId]
         ├─ Query: integrations (for dropdown)
         ├─ Query: integration_actions
         ├─ Mutation: create, update, delete, toggle, log
         ├─ State: selectedAction
         ├─ State: formState (trigger, template, etc)
         ├─ Component: Actions list (left)
         ├─ Component: Builder form (right)
         ├─ Dynamic: Template variables (based on trigger)
         └─ Handlers: save, delete, toggle
```

---

## State Machine: Integration Lifecycle

```
CREATED
  │
  ├─ User fills form
  ├─ [validate inputs]
  │
  ↓
NEW (saved but untested)
  │
  ├─ Appears in list
  ├─ Can be edited or deleted
  ├─ Cannot be used in actions (optional)
  │
  ├─ User clicks "Test"
  ↓
TESTING
  │
  ├─ Test message sent
  ├─ Awaiting response
  │
  ├─ Success:     ↓
  │           SUCCESS
  │           │
  │           ├─ testStatus = "success"
  │           ├─ Ready for actions
  │           ├─ Show ✅ badge
  │
  ├─ Failure:     ↓
  │           FAILED
  │           │
  │           ├─ testStatus = "failed"
  │           ├─ testError populated
  │           ├─ Show ❌ badge
  │           ├─ User edits & retests
  │
  ├─ Can toggle isActive
  ↓
ACTIVE or INACTIVE
  │
  ├─ Active: Used by automations
  ├─ Inactive: Automations disabled
  │
  ├─ User deletes
  ↓
DELETED
  │
  ├─ Removed from DB
  ├─ All associated actions disabled
  ├─ Integration logs kept for audit
```

---

## Concurrency & Race Conditions

### Safe Operations (Already Handled)

✅ Multiple users editing same integration
- Each gets their own form state
- Last write wins (acceptable for integrations)

✅ Creating actions while creating integration
- Validation prevents orphaned actions
- Both mutations must complete before next step

✅ Deleting integration with active automations
- Cascade delete removes actions
- Logs preserved for audit trail

### Potential Issues (Marked for Future)

⚠️ Simultaneous test & update
- Current: Test uses current config version
- Future: Version management needed

⚠️ High event volume on single action
- Current: Sequential execution
- Future: Queue management, rate limiting

⚠️ Failed message retry
- Current: No retry (logged when it fails)
- Future: Exponential backoff, max retries

---

## Performance Considerations

### Database Indexes

```typescript
integrations
  ├─ index "by_troop" on troopId (fast filtering)
  └─ index "by_service" on (troopId, serviceType)

integration_actions
  ├─ index "by_troop" on troopId
  ├─ index "by_trigger" on (troopId, trigger)
  └─ index "by_integration" on integrationId

integration_logs
  ├─ index "by_action" on actionId
  └─ index "by_troop_date" on (troopId, executedAt)
```

### Query Optimization

**Hub View**:
- Single query for integrations
- Single query for actions
- Count via array filtering (acceptable for small datasets)

**Connections View**:
- Integrations loaded once on mount
- No N+1 queries

**Workflow Builder**:
- Integrations loaded for dropdown
- Actions loaded once
- Execution logs loaded separately (on demand)

---

## Error Handling Strategy

### Input Validation

1. **Frontend**: Basic validation (required fields, format)
2. **Backend**: Complete validation in mutations
3. **Database**: Constraints enforced by schema

### Error Recovery

| Error | Cause | Recovery |
|-------|-------|----------|
| Invalid webhook | Expired/wrong URL | Re-test, update URL |
| Auth failed | Bad credentials | Re-authenticate |
| Network timeout | Service down | Retry (exponential backoff) |
| Invalid template | Syntax error | Editor shows preview |
| Orphaned action | Deleted integration | Disable action |

### User Feedback

- ✅ Success: Toast with confirmation
- ❌ Error: Toast with error message
- ⏳ Loading: Button disabled, text changes
- ℹ️ Info: Inline help text under fields

---

## Security Layers

### Authentication & Authorization

```
User clicks button
  ↓
Check: ctx.auth.getUserIdentity()
  ├─ No identity → Throw: "Not authenticated"
  
Get: current user from tokens
  ├─ No user → Throw: "User not found"
  
Check: Troop membership
  ├─ Not in troop_leaders AND not owner
  └─ → Throw: "Not authorized"
  
✅ Authorization passed → Execute mutation
```

### Data Encryption (Future)

```
configPayload: string (currently plain JSON)
├─ Could be encrypted with:
│  ├─ AES-256 symmetric key
│  ├─ Per-integration salt/IV
│  ├─ Key derivation from troopId + userId
│
└─ Decrypted only when:
   ├─ Testing integration
   ├─ Executing action
   └─ Never displayed plaintext
```

### Webhook Security (Future)

```
Discord webhook requests:
├─ Include: Convex JWT token
├─ Webhook signature (HMAC-SHA256)
└─ Rate limiting per webhook

External webhook security:
├─ Request signature (HMAC)
├─ Timestamp validation
├─ Replay attack prevention
```

---

## Monitoring & Observability

### Metrics to Track

```
integrations table
├─ Count by serviceType
├─ Usage frequency
└─ Error rate by service

integration_actions table
├─ Enabled vs disabled count
├─ Trigger distribution
└─ Action count per user

integration_logs table
├─ Execution success rate (%)
├─ Average execution time (ms)
├─ Most common errors
└─ Performance by service
```

### Debug/Admin Tools (Future)

```
Admin dashboard
├─ Recent executions table
├─ Error logs with stack traces
├─ Performance metrics
├─ Webhook health checker
└─ Manual trigger testing
```

---

## Scalability Path

### Current Limits

- ✅ Handles ~1000 integrations per troop
- ✅ Handles ~10k automations per troop
- ⚠️ Testing webhooks sequentially
- ⚠️ No rate limiting yet

### Scaling Strategy (Future)

1. **Batch Operations**
   - Bulk create/delete integrations
   - Bulk update action templates

2. **Caching**
   - Cache integrations per troop
   - Invalidate on update

3. **Queuing**
   - Queue action executions
   - Process via background jobs

4. **Sharding**
   - Split logs by troopId
   - Archive old logs

---

**Version**: 1.0 (Architecture)  
**Complexity**: Medium  
**Maintenance**: Low (once Phase 1 complete)
