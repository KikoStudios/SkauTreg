# 🔗 Integrations Quick Start Guide

## What Are Integrations?

Integrations let you automatically send messages to Discord, Email, WhatsApp, or any other service when specific events happen in SkauTreg.

### Example
When a member cancels a trip too late → **Automatically notify your Discord channel** or **send an email alert**

---

## Getting Started (5 Minutes)

### Step 1: Go to Integration Settings

1. Click **Settings** in the left sidebar
2. Find your troop card
3. Click on it to enter settings
4. Look for the **🔗 Integrace** tab
5. Click it

### Step 2: Create Your First Connection

A "Connection" is how SkauTreg reaches out to a service (like Discord or Email).

#### For Discord:

1. Click **Connections** tab
2. Click **➕ New Integration**
3. Choose **Discord Webhook**
4. Give it a name (e.g., "Team Announcements")
5. [Get your Discord webhook URL](#how-to-get-discord-webhook)
6. Paste it in the "Discord Webhook URL" field
7. Click **Test** to make sure it works ✅
8. Click **Create**

#### For Email:

1. Select **Email (SMTP/Services)**
2. Choose your email provider (Google, Outlook, etc.)
3. Enter sender email address
4. Click **Create**

### Step 3: Create Your First Automation

An "Automation" is a rule that says: *"When X happens, send a message to Y service"*

1. Click **Automations** tab
2. Click **➕ New Automation**
3. Choose what triggers it:
   - **Member Unregistered Late** - When someone cancels after the deadline
   - **New Trip Created** - When a new trip is announced
   - **Payment Received** - When someone pays
   - **Trip Assigned Base** - When a scout base is assigned

4. Select where to send the message (your Discord connection, etc.)

5. Write a message using **variables** (they auto-complete):
   ```
   ⚠️ {member_name} canceled {trip_title}!
   Leader {leader_name} has been notified.
   ```

6. Click **Create** — Done! 🎉

---

## Available Variables

Variables depend on the trigger type. When you select a trigger, available variables appear as buttons:

### Member Unregistered Late
- `{member_name}` - Who canceled
- `{trip_title}` - Which trip
- `{trip_date}` - When it was
- `{leader_name}` - Who to notify

### New Trip Created
- `{trip_title}`
- `{trip_date}`
- `{trip_location}`
- `{creator_name}` - Who created it

### Payment Received
- `{member_name}`
- `{amount}`
- `{payment_method}`
- `{trip_title}`

### Trip Assigned Base
- `{trip_title}`
- `{base_name}`
- `{location}`

---

## How to Get Discord Webhook

1. Open your Discord server
2. Go to **Server Settings** → **Integrations** → **Webhooks**
3. Click **New Webhook**
4. Give it a name (e.g., "SkauTreg")
5. Choose which channel it posts to
6. Click **Copy Webhook URL**
7. Paste into SkauTreg

> **Security**: This URL lets SkauTreg post to Discord. Don't share it!

---

## Managing Automations

### Turn On/Off
- Click the **ON/OFF** badge next to an automation
- OFF automations won't trigger

### Edit
- Click the automation in the list
- Change the message template or settings
- Click **Update**

### Delete
- Click the automation
- Click **🗑️ Delete**
- Confirm deletion

### Check If It Worked
Each automation keeps a log:
1. Click the automation
2. Look for "Execution History" (in next version)
3. See if messages were sent successfully

---

## Testing

Before automations go live, always **test** your integrations:

1. Go to **Connections** tab
2. Click on an integration
3. Click **🧪 Test**
4. Check that you got a test message ✅

If the test fails:
- **Discord**: Webhook URL might be expired or wrong
- **Email**: SMTP credentials might be wrong
- **WhatsApp**: Phone number might not be registered

---

## Common Setups

### Setup #1: Notify Discord on Late Cancellations

1. Create Discord connection with your server webhook
2. Create automation:
   - Trigger: "Member Unregistered Late"
   - Message: `🚨 {member_name} just canceled {trip_title}! Notify {leader_name}`
   - Send to Discord

### Setup #2: Email Reminder on New Trip

1. Create Email connection with your SMTP server
2. Create automation:
   - Trigger: "New Trip Created"
   - Message: `New trip {trip_title} on {trip_date} at {trip_location}`
   - Send to Email

### Setup #3: Multiple Channels

Create separate integrations for:
- General announcements (Discord #announcements)
- Errors & alerts (Discord #alerts)
- Finance (Discord #finance)

Then route automations to appropriate channels!

---

## Tips & Tricks

✨ **Pro Tips:**

- Test integrations before going live
- Use emoji in messages for better readability 📌
- Create multiple integrations to send to different Discord channels
- Turn off automations while testing
- Check message logs if automations seem broken

⚠️ **Important:**

- Keep webhook URLs secret (they control channel access)
- Disable automations if they cause spam
- Remember: Automations only work for **enabled** integrations

---

## Troubleshooting

### Automation didn't trigger

1. Is the automation **enabled** (green button)?
2. Is the integration **active**?
3. Check that you're using correct **trigger** event
4. Reload the page to refresh

### Discord says "Webhook is invalid"

1. Check the webhook URL is correct
2. The webhook might have expired → Create a new one
3. The channel might have been deleted → Point to another channel

### I'm getting too many messages

1. You might be triggering multiple automations
2. Check all your automation settings
3. Disable automations you don't need

### Test button gave an error

1. Check internet connection
2. Discord/Email service might be down
3. Webhook URL might be wrong
4. Try refreshing and testing again

---

## Security Reminders

🔐 **Keep These Secret:**
- Discord webhook URLs
- Email passwords
- WhatsApp API keys
- Any API credentials

❌ **Never:**
- Share webhook URLs in Discord chat
- Paste credentials in screenshots
- Leave passwords in browser console
- Give integrations access to unneeded channels

✅ **Do This:**
- Test integrations before publishing
- Regularly review active automations
- Delete old unused integrations
- Use separate webhooks for different purposes

---

## Need Help?

If something isn't working:

1. **Test the integration** to verify it's connected
2. **Check automation is enabled** (green ON button)
3. **Reload the page** to refresh
4. **Check the integration logs** (coming soon)
5. **Contact admin** if still stuck

---

**Version**: 1.0  
**Last Updated**: February 2026
