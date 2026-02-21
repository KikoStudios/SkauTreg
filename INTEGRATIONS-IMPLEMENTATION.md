# 🚀 Integrations System Implementation Guide

## Overview

The Integrations System is a modular, event-driven architecture that enables SkauTreg to automatically communicate with third-party services and automate workflows based on internal application events.

### Architecture Principles

The system is built on **three core layers**:

1. **Integration Layer** ("The Where") - Manages authentication and endpoints
2. **Action Engine** ("The What & When") - Event-driven automation rules
3. **UI System** - Intuitive interface for configuration and management

---

## 📁 Project Structure

### Backend (Convex)

```
convex/
├── schema.ts                    # Database schema with new tables
├── integrations.ts              # Integration management functions
├── integration_actions.ts       # Action/workflow management functions
└── migrations/
    └── 002_remove_integration_fields.ts
```

### Frontend (React/Next.js)

```
src/components/
├── IntegrationsTab.tsx          # Main tab wrapper with navigation
├── IntegrationHub.tsx           # Home view with quick access and status
├── ConnectionsManager.tsx       # Integrations list and configuration
└── WorkflowBuilder.tsx          # Actions/automations builder

src/app/(dashboard)/settings/[troopId]/
└── page.tsx                     # Updated with integrations tab
```

---

## 🗄️ Database Schema

### integrations Table

Stores configured third-party service connections.

```typescript
{
  troopId: Id<"troops">,           // Which troop this belongs to
  name: string,                     // User-defined label
  serviceType: string,              // "discord" | "email" | "whatsapp" | "custom_api"
  isActive: boolean,                // Enable/disable integration
  
  // Encrypted configuration
  configPayload: string,            // JSON (encrypted in production)
  
  // Service-specific fields
  webhookUrl?: string,              // Discord/Custom API webhook
  webhookName?: string,             // Webhook reference name
  emailProvider?: string,           // SMTP, Mailgun, SendGrid
  emailAddress?: string,            // Sender email
  phoneNumber?: string,             // WhatsApp account number
  
  // Metadata
  createdBy: Id<"users">,
  createdAt: string,
  updatedAt: string,
  testStatus?: "pending" | "success" | "failed",
  testError?: string
}
```

### integration_actions Table

Stores automation rules that trigger on events.

```typescript
{
  troopId: Id<"troops">,           // Which troop
  name: string,                     // Automation name
  isEnabled: boolean,               // Active/inactive
  
  // Trigger configuration
  trigger: string,                  // Event type (see list below)
  triggerConfig: {
    conditions: Array<{             // Optional filters
      field: string,
      operator: string,
      value: string
    }>
  },
  
  // Target & Message
  integrationId: Id<"integrations">, // Where to send
  messageTemplate: string,          // Message with {variables}
  messageFormat?: string,           // Format type
  
  // Execution options
  includeAttachments?: boolean,
  retryOnFailure?: boolean,
  maxRetries?: number,
  
  // Metadata
  createdBy: Id<"users">,
  createdAt: string,
  updatedAt: string,
  lastTriggeredAt?: string,
  triggerCount: number
}
```

### integration_logs Table

Audit trail of all action executions.

```typescript
{
  troopId: Id<"troops">,
  actionId: Id<"integration_actions">,
  integrationId: Id<"integrations">,
  
  triggerEvent: string,
  triggerData?: string,             // JSON payload
  status: "success" | "failed" | "pending" | "skipped",
  sentMessage?: string,
  responseStatus?: number,
  error?: string,
  
  executedAt: string,
  executionTime?: number
}
```

---

## 📋 Available Triggers

These events automatically fire the registered actions:

| Trigger ID | Name | Variables | Description |
|-----------|------|-----------|-------------|
| `member_unregistered_late` | Member Unregistered Late | `{member_name}`, `{trip_title}`, `{trip_date}`, `{leader_name}` | Late cancellation after deadline |
| `new_trip_created` | New Trip Created | `{trip_title}`, `{trip_date}`, `{trip_location}`, `{creator_name}` | New trip is created |
| `payment_received` | Payment Received | `{member_name}`, `{amount}`, `{payment_method}`, `{trip_title}` | Payment confirmation |
| `trip_assigned_base` | Trip Assigned Base | `{trip_title}`, `{base_name}`, `{location}` | Base assigned to trip |

**Future Extensibility**: New triggers can be added by simply adding them to the `TRIGGERS` array in `WorkflowBuilder.tsx`, and the system automatically makes them available throughout the app.

---

## 🔌 Supported Services

### Discord (Webhooks)

**Setup**: Create a webhook in Discord server settings
- Requires: Webhook URL
- Test: Sends test message to verify connectivity
- Implementation: Uses Discord API

### Email (SMTP/Services)

**Setup**: Configure SMTP server or use third-party service
- Providers: SMTP, Mailgun, SendGrid
- Requires: Email provider credentials
- Future: Integration with existing email system

### WhatsApp (Business API)

**Setup**: Configure WhatsApp Business Account
- Requires: Business phone number
- Future: Implement WhatsApp API client

### Custom API/Webhooks

**Setup**: Any HTTP endpoint
- Requires: Valid webhook URL
- Format: Sends JSON payload
- Flexible for custom integrations

---

## 🛠️ Backend API Reference

### Integrations Functions

```typescript
// Get all integrations for a troop
api.integrations.getByTroop({ troopId })

// Get specific integration
api.integrations.getById({ integrationId })

// Create new integration
api.integrations.create({
  troopId,
  name,
  serviceType,
  configPayload,
  webhookUrl?,
  webhookName?,
  emailProvider?,
  emailAddress?,
  phoneNumber?
})

// Update integration
api.integrations.update({ integrationId, ...updates })

// Delete integration (cascades to actions)
api.integrations.deleteIntegration({ integrationId })

// Test integration
api.integrations.testIntegration({ integrationId, testMessage? })
```

### Integration Actions Functions

```typescript
// Get all actions for a troop
api.integration_actions.getByTroop({ troopId })

// Get actions by trigger type
api.integration_actions.getByTrigger({ troopId, trigger })

// Get specific action
api.integration_actions.getById({ actionId })

// Create new action
api.integration_actions.create({
  troopId,
  name,
  trigger,
  integrationId,
  messageTemplate,
  triggerConfig,
  messageFormat?,
  includeAttachments?,
  retryOnFailure?,
  maxRetries?
})

// Update action
api.integration_actions.update({ actionId, ...updates })

// Toggle action enabled/disabled
api.integration_actions.toggleEnabled({ actionId })

// Delete action
api.integration_actions.deleteAction({ actionId })

// Log execution
api.integration_actions.logExecution({
  troopId,
  actionId,
  integrationId,
  triggerEvent,
  triggerData?,
  status,
  sentMessage?,
  responseStatus?,
  error?,
  executionTime?
})

// Get execution logs
api.integration_actions.getExecutionLogs({ actionId, limit? })
```

---

## 🎨 UI Components

### IntegrationsTab (Main Wrapper)

**Location**: `src/components/IntegrationsTab.tsx`

Container component that manages three views:
- Renders navigation tabs
- Handles view state management
- Passes `troopId` to sub-components

**Props**:
```typescript
interface IntegrationsTabProps {
  troopId: Id<"troops">;
}
```

### IntegrationHub (Home View)

**Location**: `src/components/IntegrationHub.tsx`

**Features**:
- 🏠 Dashboard with status overview
- Quick action grid for each service type
- Summary cards showing active integrations & actions
- Navigation buttons to other views

**Props**:
```typescript
interface IntegrationHubProps {
  troopId: Id<"troops">;
  onNavigate: (view: "hub" | "connections" | "actions") => void;
  onSelectIntegration?: (integrationId: Id<"integrations">) => void;
}
```

### ConnectionsManager (Integrations View)

**Location**: `src/components/ConnectionsManager.tsx`

**Features**:
- Left sidebar: List of configured integrations
- Right panel: Configuration form based on service type
- Create new integration button
- Test integration functionality
- Delete integration option
- Service-specific fields rendering

**Form Fields by Service**:
- **Discord**: Webhook URL, Webhook Name
- **Email**: Provider (SMTP/Mailgun/SendGrid), Sender Email
- **WhatsApp**: Phone Number
- **Custom API**: Webhook URL

**Props**:
```typescript
interface ConnectionsManagerProps {
  troopId: Id<"troops">;
}
```

### WorkflowBuilder (Automations View)

**Location**: `src/components/WorkflowBuilder.tsx`

**Features**:
- Left sidebar: List of automation rules
- Right panel: Automation builder form
- Trigger selection dropdown
- Integration target selection
- Message template editor with variable suggestions
- Create/Edit/Delete actions
- Toggle automation on/off

**Dynamic Variables**:
- Automatically displays available variables based on selected trigger
- In-form variable insertion with one-click buttons

**Props**:
```typescript
interface WorkflowBuilderProps {
  troopId: Id<"troops">;
}
```

---

## 📱 Integration Points

### Settings Page Integration

The IntegrationsTab is embedded in `src/app/(dashboard)/settings/[troopId]/page.tsx`:

```typescript
{/* INTEGRATIONS TAB */}
{activeTab === "integrations" && (
    <div style={panelStyle}>
        <IntegrationsTab troopId={troopId} />
    </div>
)}
```

Added button to settings tabs:
```typescript
<button onClick={() => setActiveTab("integrations")}>
    🔗 Integrace
</button>
```

### Sidebar Navigation (Future)

Icons prepared:
- `public/icons/webhooks-black.svg` - For sidebar
- `public/icons/webhooks-white.svg` - For command palette

---

## 🧪 Testing Integrations

Each integration has a built-in test function:

1. **Discord**: Sends a test message to the webhook
2. **Email**: Validates SMTP credentials (future)
3. **WhatsApp**: Validates account access (future)
4. **Custom API**: Makes test HTTP request

Test results are stored in the `testStatus` and `testError` fields.

---

## 🔐 Security Considerations

### Data Storage

- **Encrypted Fields**: `configPayload` should be encrypted in production
- **Password Fields**: Use type="password" in UI
- **Backend Validation**: All mutation handlers verify user authorization

### Authorization

- Only troop leaders can create/modify integrations
- Ownership checked against `troop_leaders` or `ownerId`
- Cannot create actions for integrations from other troops

### API Keys & Tokens

- Never logged or displayed in plain text
- Transmitted only via HTTPS
- Stored encrypted in database
- Webhook URLs treated as secrets

---

## 🚀 Future Enhancements

### Phase 2: Action Execution

```typescript
// In convex/actions.ts (planned)
export const executeAction = action({
  args: { actionId: v.id("integration_actions"), event: v.any() },
  handler: async (ctx, args) => {
    const action = await ctx.db.get(args.actionId);
    const integration = await ctx.db.get(action.integrationId);
    
    // Evaluate conditions
    const shouldExecute = evaluateConditions(
      action.triggerConfig.conditions,
      args.event
    );
    
    if (!shouldExecute) {
      await logExecution(..., { status: "skipped" });
      return;
    }
    
    // Render message with variables
    const message = renderTemplate(
      action.messageTemplate,
      args.event
    );
    
    // Send to integration
    await sendToIntegration(integration, message);
    
    // Log execution
    await logExecution(..., { status: "success" });
  }
});
```

### Phase 3: Advanced Features

- [ ] Conditional logic builder (AND/OR gates)
- [ ] Attachment/file forwarding
- [ ] Retry mechanism with exponential backoff
- [ ] Rate limiting per integration
- [ ] Message templating with Handlebars
- [ ] Webhook signatures (hmac verification)
- [ ] Integration health monitoring dashboard
- [ ] Batch operation support
- [ ] Google Drive integration
- [ ] Microsoft Teams/Slack support

### Phase 4: Admin Tools

- [ ] Bulk action creation
- [ ] Action templates library
- [ ] Integration analytics
- [ ] Activity logs export
- [ ] Integration version history

---

## 🐛 Troubleshooting

### Integration Test Fails

1. **Discord**: Check webhook URL is valid and not expired
2. **Email**: Verify SMTP credentials and server port
3. **WhatsApp**: Validate phone number format and API key
4. **Custom API**: Check endpoint is reachable and accepting POST

### Actions Not Triggering

1. Verify action is `isEnabled: true`
2. Check integration is `isActive: true`
3. Ensure trigger event matches exactly
4. Review `integration_logs` for error messages
5. Check conditions match the event data

### Template Variables Not Working

1. Ensure variable name matches exactly (case-sensitive)
2. Variable must be available for the selected trigger
3. Check syntax: `{variable_name}` (with curly braces)

---

## 📖 Usage Examples

### Example 1: Discord Notification on Late Cancellation

**Setup**:
1. Go to Settings → 🔗 Integrace → Connections tab
2. Click "New Integration"
3. Select "Discord Webhook"
4. Name: "Team Notifications"
5. Paste Discord webhook URL
6. Click "Test" to verify

**Create Action**:
1. Go to Automations tab
2. Click "New Automation"
3. Trigger: "Member Unregistered Late"
4. Integration: "Team Notifications"
5. Message: "⚠️ {member_name} canceled {trip_title} too late! Contacted {leader_name}."
6. Click "Create"

### Example 2: Email on Trip Assignment

**Setup**:
1. Create integration with Email service
2. Configure SMTP details

**Create Action**:
1. Trigger: "Trip Assigned Base"
2. Message: "Trip {trip_title} has been assigned to {base_name} at {location}"
3. Save and enable

---

## 📚 File Checklist

### Created Files
- ✅ `convex/integrations.ts`
- ✅ `convex/integration_actions.ts`
- ✅ `src/components/IntegrationsTab.tsx`
- ✅ `src/components/IntegrationHub.tsx`
- ✅ `src/components/ConnectionsManager.tsx`
- ✅ `src/components/WorkflowBuilder.tsx`

### Modified Files
- ✅ `convex/schema.ts` - Added 3 new tables
- ✅ `src/app/(dashboard)/settings/[troopId]/page.tsx` - Added integrations tab

### Icons
- ✅ `public/icons/webhooks-black.svg`
- ✅ `public/icons/webhooks-white.svg`
- ✅ `public/icons/mail-black.svg`
- ✅ `public/icons/discord-black.svg`
- ✅ `public/icons/whatsapp-black.svg`

---

## 🎯 Next Steps

1. **Deploy Changes**: Push to staging/production
2. **Test Workflows**: Create sample integrations and actions
3. **Monitor**: Review `integration_logs` for successful executions
4. **Gather Feedback**: Iterate on UX based on user testing
5. **Implement Phase 2**: Add automatic action execution

---

**Version**: 1.0.0  
**Last Updated**: February 18, 2026  
**Maintainer**: SkauTreg Development Team
