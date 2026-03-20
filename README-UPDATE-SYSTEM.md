# 🔔 Update Notification System

A comprehensive version management and user notification system for SkauTreg with Supernotes integration.

## 🎯 What is this?

This system provides elegant update notifications to users when you deploy new versions of the app. It includes:

- **Automatic version detection** - Users see a pop-up when a new version is available
- **Beautiful changelog viewer** - Collapsible sections with markdown support
- **Supernotes integration** - Pull update logs directly from your Supernotes
- **Admin panel** - Easy version management interface
- **User tracking** - Remember what each user has seen

## 📸 Screenshots

### Update Pop-up
```
🎉 Nová verze je k dispozici!
Verze 1.2.3 je připravena. Aktualizujte pro nové funkce a vylepšení.

[Aktualizovat nyní]  [Co je nového?]  [✕]
```

### Changelog Modal
Beautiful modal with:
- Highlights section with checkmarks
- Collapsible sections
- Markdown rendering
- Color-coded version badges
- Smooth animations

### Admin Panel
- List all versions
- Create manually
- Sync from Supernotes
- Set active version

## 🚀 Quick Start

### 1. Create an update in Supernotes

Create a card named: `UPDATE: v1.0.1 - My First Update`

```markdown
## ✨ Highlights
- Added update notification system
- Beautiful changelog viewer

## 🎨 Improvements
- Better UX for updates
```

### 2. Sync to your app

1. Go to **FAE** → **Správa verzí**
2. Click **🔄 Synchronizovat ze Supernotes**
3. Click **📥 Synchronizovat** on your card

### 3. Test it!

Open the app in a private window - you'll see the pop-up! 🎉

## 📚 Documentation

- **[Quick Start Guide](UPDATE-SYSTEM-QUICKSTART.md)** - 5-minute tutorial
- **[Full Documentation](UPDATE-SYSTEM-DOCS.md)** - Complete guide (15+ pages)
- **[Implementation Summary](UPDATE-SYSTEM-SUMMARY.md)** - Technical overview

## 🏗️ Architecture

```
┌─────────────────┐
│   Supernotes    │ (Create update cards)
│   "UPDATE:"     │
└────────┬────────┘
         │
         ↓ Sync API
┌─────────────────┐
│  Convex DB      │ (app_versions table)
│  Active version │
└────────┬────────┘
         │
         ↓ Query
┌─────────────────┐
│  React UI       │ (UpdateNotification)
│  Pop-up/Modal   │
└─────────────────┘
```

## 🎨 Features

### For Users
- ✅ Non-intrusive pop-up (2s delay)
- ✅ Clear call-to-action
- ✅ Detailed changelog
- ✅ Collapsible sections
- ✅ Dismissable notifications

### For Admins
- ✅ Supernotes integration
- ✅ Manual creation form
- ✅ Version management UI
- ✅ Activation control
- ✅ Preview highlights

### Technical
- ✅ User tracking (last seen version)
- ✅ Dismiss handling
- ✅ Markdown rendering
- ✅ Semantic versioning
- ✅ Category badges (major/minor/patch/hotfix)
- ✅ Responsive design

## 📦 Files Created

### Backend
- `convex/appVersions.ts` - Version management functions
- `convex/schema.ts` - Added `app_versions` & `user_version_tracking` tables
- `src/app/api/supernotes/updates/route.ts` - Supernotes sync API

### Frontend
- `src/components/UpdateNotification.tsx` - Main notification component
- `src/components/UpdateNotification.module.css` - Styling
- `src/components/VersionAdmin.tsx` - Admin panel
- `src/components/VersionAdmin.module.css` - Admin styling

### Documentation
- `UPDATE-SYSTEM-DOCS.md` - Full documentation
- `UPDATE-SYSTEM-QUICKSTART.md` - Quick start guide
- `UPDATE-SYSTEM-SUMMARY.md` - Implementation summary
- `README-UPDATE-SYSTEM.md` - This file

## 🔧 Configuration

### Environment Variables

```env
SUPERNOTES_API_KEY=your_api_key_here
```

### Supernotes Card Format

```markdown
UPDATE: v1.2.3 - Short description

## ✨ Main Features
- Feature 1
- Feature 2

## 🎨 Improvements
- Improvement 1

## 🐛 Fixes
- Fix 1
```

Or add tags: `update`, `release`

## 🎯 Usage Examples

### Example 1: Minor Update
```markdown
UPDATE: v1.3.0 - Email improvements

## ✨ New Features
- Gmail OAuth support
- Auto-save drafts
- Rich text editor

## 🐛 Fixes
- Fixed large attachments
- Fixed duplicate recipients
```

Category: `minor`

### Example 2: Hotfix
```markdown
UPDATE: v1.2.1 - Login fix

## 🚨 Critical Fix
- Fixed login issue for new users
- Fixed security vulnerability
```

Category: `hotfix`

### Example 3: Major Release
```markdown
UPDATE: v2.0.0 - Complete redesign

## 🎉 Major Update
SkauTreg 2.0 with completely new interface!

## ✨ New Features
- New modern design with dark mode
- Interactive map
- Real-time collaboration
- Advanced calendar

## ⚠️ Breaking Changes
- Old API endpoint removed
- New data export format
```

Category: `major`

## 🧪 Testing

1. Create test version (e.g., "99.0.0-test")
2. Set as active
3. Open app in private window
4. Pop-up should appear after 2 seconds

## 🐛 Troubleshooting

### Pop-up not showing?
- Check if user already saw this version
- Verify active version is set
- Check browser console for errors

### Supernotes sync failing?
- Verify API key in `.env.local`
- Check card naming (must start with "UPDATE:")
- Check network tab for API errors

### Changelog not rendering?
- Verify markdown format
- Check for highlights array
- Inspect browser console

## 📊 API Reference

### Queries
```typescript
// Get current active version
const currentVersion = useQuery(api.appVersions.getCurrentVersion, {});

// Check for updates
const updates = useQuery(api.appVersions.checkForUpdates, {});

// Get all versions
const versions = useQuery(api.appVersions.getAllVersions, { limit: 10 });
```

### Mutations
```typescript
// Mark as seen
await markAsSeen({ version: "1.2.3" });

// Dismiss
await dismissVersion({ version: "1.2.3" });

// Create version
await createVersion({
  version: "1.2.3",
  changelogMarkdown: "...",
  category: "minor",
  highlights: ["..."],
  setAsActive: true
});
```

## 🎓 Best Practices

### Semantic Versioning
- **Major (2.0.0)** - Breaking changes
- **Minor (1.1.0)** - New features (backward compatible)
- **Patch (1.0.1)** - Bug fixes
- **Hotfix** - Critical fixes

### Writing Good Changelogs
✅ **Good:**
```markdown
## ✨ New Features
- Added PDF export
- New dark mode

## 🐛 Fixes
- Fixed freeze on large datasets
```

❌ **Bad:**
```markdown
## Changes
- Various changes
- Fixed some bugs
```

## 🔮 Future Enhancements

Possible improvements:
- [ ] Email notifications
- [ ] RSS feed
- [ ] Usage statistics
- [ ] Scheduled releases
- [ ] A/B testing
- [ ] Auto-generate from Git commits
- [ ] GitHub Releases integration
- [ ] Multi-language support

## 📞 Support

For issues:
1. Check [Troubleshooting](UPDATE-SYSTEM-DOCS.md#troubleshooting)
2. Review browser console
3. Verify Convex is running
4. Check environment variables

## 📄 License

Part of SkauTreg project

---

**Version:** 1.0.0  
**Author:** SkauTreg Team  
**Date:** February 24, 2026

🎉 **Enjoy your new update notification system!**
