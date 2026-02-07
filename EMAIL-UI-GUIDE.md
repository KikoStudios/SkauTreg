# Multi-Provider Email Connection - Visual Guide

## 🎨 UI Flow Diagrams

### Main Settings Page

```
┌─────────────────────────────────────────────────────────────┐
│  Settings → E-mailové připojení                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │  📧 E-mailové připojení         [Připojeno ✓]     │     │
│  │                                                     │     │
│  │  Propojte e-mailového poskytovatele pro           │     │
│  │  odesílání zpráv členům. Podporujeme Gmail,       │     │
│  │  Seznam, Centrum, O2 a Google Groups.             │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
│  [If NOT connected:]                                          │
│  ┌────────────────────────────────────────────────────┐     │
│  │                                                     │     │
│  │        ┌──────────────────────────┐               │     │
│  │        │  Připojit E-mail         │               │     │
│  │        └──────────────────────────┘               │     │
│  │                                                     │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
│  [If connected:]                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │  ✓ Připojeno                                       │     │
│  │  Poskytovatel: Gmail                               │     │
│  │  E-mail: info@oddil.cz                             │     │
│  │  Připojeno: 7. 2. 2026 14:30            [Odpojit]  │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

### Provider Selection Modal

When user clicks "Připojit E-mail":

```
┌─────────────────────────────────────────────────────────────┐
│  Vyberte poskytovatele                              ✕       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │  📧  Gmail                                         │     │
│  │      Použít Gmail přes OAuth 2.0 (bez hesla)      │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │  �  Outlook / Microsoft 365                       │     │
│  │      Použít Outlook přes OAuth 2.0 (bez hesla)    │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │  �📬  Seznam.cz                                     │     │
│  │      IMAP/SMTP: imap.seznam.cz                    │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │  📮  Centrum.cz                                    │     │
│  │      IMAP/SMTP: imap.centrum.cz                   │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │  �  Google Groups                                 │     │
│  │      Import členů z Google Groups                 │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

### SMTP Configuration (Seznam/Centrum)

When user selects Seznam.cz:

```
┌─────────────────────────────────────────────────────────────┐
│  Připojit Seznam.cz                                 ✕       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  E-mailová adresa                                            │
│  ┌────────────────────────────────────────────────────┐     │
│  │  vase-jmeno@seznam.cz                             │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
│  Heslo aplikace                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │  ••••••••                                          │     │
│  └────────────────────────────────────────────────────┘     │
│  Použijte heslo aplikace, ne běžné heslo k účtu.            │
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │  ℹ️ Nastavení:                                     │     │
│  │  SMTP: smtp.seznam.cz:465                          │     │
│  │  IMAP: imap.seznam.cz:993                          │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
│              ┌────────────────────┐                          │
│              │     Připojit       │                          │
│              └────────────────────┘                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

### Google Groups Import Flow

When user selects Google Groups:

**Step 1: Enter Group Email**
```
┌─────────────────────────────────────────────────────────────┐
│  Import z Google Groups                             ✕       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Email Google Groups                                         │
│  ┌─────────────────────────────────────┬────────────┐       │
│  │  skupina@googlegroups.com           │  Načíst    │       │
│  └─────────────────────────────────────┴────────────┘       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Step 2: Map Members**
```
┌─────────────────────────────────────────────────────────────┐
│  Import z Google Groups                             ✕       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Přiřaďte e-maily členům                                     │
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │  💡 Tip                                            │     │
│  │  Můžete přiřadit více e-mailů k jednomu členovi   │     │
│  │  (např. rodič + dítě).                             │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Jan Novák "Jenda"                                 │     │
│  │  Rodič: Marie Nováková                             │     │
│  │                                                     │     │
│  │  ┌──────────────────────────────────────────┐     │     │
│  │  │  Jan Novák (parent1@example.com)        │     │     │
│  │  │  Marie Svobodová (parent2@example.com)  │     │     │
│  │  └──────────────────────────────────────────┘     │     │
│  │  Podržte Ctrl/Cmd pro výběr více e-mailů          │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Petra Svobodová "Petr"                            │     │
│  │  Rodič: Petr Svoboda                               │     │
│  │                                                     │     │
│  │  ┌──────────────────────────────────────────┐     │     │
│  │  │  (none selected)                          │     │     │
│  │  └──────────────────────────────────────────┘     │     │
│  │  Podržte Ctrl/Cmd pro výběr více e-mailů          │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
│              ┌────────────────────┐                          │
│              │  Uložit mapování   │                          │
│              └────────────────────┘                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 User Journey Examples

### Example 1: Connecting Gmail

1. User goes to **Settings**
2. Clicks **E-mailové připojení** tab
3. Sees "Nepřipojeno" badge
4. Clicks **"Připojit E-mail"**
5. Modal opens with 5 provider options
6. Clicks **Gmail** card (📧)
7. Redirects to Google OAuth login
8. Logs in with Google account
9. Grants "Send email" permission
10. Redirects back to settings
11. Sees **"✓ Připojeno"** with email address
12. ✅ Done!

### Example 2: Connecting Seznam

1. User goes to **Settings**
2. Clicks **E-mailové připojení** tab  
3. Clicks **"Připojit E-mail"**
4. Modal opens
5. Clicks **Seznam.cz** card (📬)
6. New modal opens with form
7. Enters: `oddil@seznam.cz`
8. Enters: app password from Seznam settings
9. Sees SMTP/IMAP info displayed
10. Clicks **"Připojit"**
11. Success! Shows connected status
12. ✅ Done!

### Example 3: Google Groups Import

1. User goes to **Settings**
2. Clicks **E-mailové připojení** tab
3. Clicks **"Připojit E-mail"**
4. Modal opens
5. Clicks **Google Groups** card (👥)
6. Import modal opens
7. Enters: `vlcata@googlegroups.com`
8. Clicks **"Načíst"**
9. System fetches 20 group members
10. For each troop member, user selects matching emails:
    - Jan Novák → selects `jan.novak@gmail.com`
    - Petra Svobodová → selects `petra.svoboda@gmail.com` + `dcera@gmail.com`
11. Clicks **"Uložit mapování"**
12. ✅ Done! Emails mapped for bulk sending

---

## 📱 Responsive Design

All modals are:
- **Mobile-friendly** - Scrollable on small screens
- **Touch-optimized** - Large tap targets
- **Readable** - Clear typography
- **Accessible** - Keyboard navigation support

## 🎨 Color Coding

- **Gmail** - Blue (#4285f4)
- **Outlook** - Microsoft Blue (#0078d4)
- **Seznam** - Red (#e74c3c)
- **Centrum** - Orange (#f39c12)
- **Google Groups** - Green (#16a34a)

## ✨ Interactions

- **Hover effects** - Cards lift on hover
- **Loading states** - Buttons show "Načítám..." / "Připojuji..."
- **Error handling** - Clear error messages with retry options
- **Confirmations** - Disconnect requires confirmation
- **Feedback** - Success/error toasts after actions

---

**Design Philosophy**: Simple, clear, and user-friendly with Czech localization.
