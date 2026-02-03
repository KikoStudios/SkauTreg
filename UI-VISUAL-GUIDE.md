# LIVE Meeting UI - Visual Guide

## Meeting List View

```
┌─────────────────────────────────────────────────────┐
│  Schůze (Rady)                    [+ Nová schůze] │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ● LIVE                                              │
│ ┌─────────────────────────────────────────────┐   │
│ │ ● Podzimní táboření          [PŘIPOJIT] [🗑] │   │
│ │ Příprava táborové skupiny                   │   │
│ │ 31. ledna 2026, 14:32                       │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ Minulé schůze (Záznamy)                            │
│ ┌─────────────────────────────────────────────┐   │
│ │ 📅 Letní sraz 2025          [▶ PŘEHRÁNÍ] [🗑] │   │
│ │ Sraz všech členů                            │   │
│ │ 21. června 2025, 18:00                      │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ Přípravy na schůze                                 │
│ ┌─────────────────────────────────────────────┐   │
│ │ 📝 Zimní plánování            [✏️ UPRAVIT] [🗑] │   │
│ │ Plánování zimních akcí                      │   │
│ │ 28. ledna 2026, 20:15                       │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Legend
- `●` = LIVE (Red pulsing indicator)
- `📅` = Past Recording (Calendar icon)
- `📝` = Draft Meeting (Pencil icon)

---

## LIVE Meeting View (During Session)

```
┌──────────────────────────────────────────────────────────────────┐
│ ← Zpět              Podzimní táboření      [🔴 LIVE 00:15:23]    │
│                     Příprava táborové sk.  [UKONČIT RADU]        │
├──────────────────────────────────────────────────────────────────┤
│ 👤 Jan (Harmonogram)   👤 Marie (Úkoly)                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Poznámky                               [+ Nová poznámka]        │
│                                                                  │
│ ┌──────────────────────────────────┐  ┌─────────────────────┐  │
│ │ Harmonogram          [Editování]   │ │ Přílohy             │  │
│ │ # Agenda schůze                    │ │ 🖼 IMG_2024.jpg     │  │
│ │ - Údaje novách členů..             │ │   1.2 MB            │  │
│ │ Upraveno: 31. ledna                │ │ 📄 protokol.pdf     │  │
│ │                                    │ │   500 KB            │  │
│ └──────────────────────────────────┘ │                     │  │
│                                       └─────────────────────┘  │
│ ┌──────────────────────────────────┐                            │
│ │ Úkoly                [Připraveno]  │                            │
│ │ 1. Objednat stravu                 │                            │
│ │ 2. Koupit nový stan                │                            │
│ │ Upraveno: 31. ledna                │                            │
│ └──────────────────────────────────┘                            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Key Elements
- **Red LIVE badge**: Shows session is active with live timer
- **Participant bar**: Shows who's editing and what document
- **Editing indicator**: Shows when note is being edited in real-time
- **Auto-save**: Content saves after 3 seconds of no typing
- **Attachments**: Show files uploaded during meeting

---

## Replay View (After Session Ends)

```
┌─────────────────────────────────────────────────────┐
│ ← Zpět              Podzimní táboření              │
│                     21. června 2025, 18:00          │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Informace o záznamu    │  Náhled schůzového       │
│                        │  záznamu                  │
│ Začátek:               │  ┌──────────────────────┐ │
│ 21. června 2025        │  │      ▶ Přehrávat     │ │
│ 18:00                  │  └──────────────────────┘ │
│                        │                          │
│ Konec:                 │  Timeline:                │
│ 21. czerwca 2025       │  ├─────●────────────────┤│
│ 19:15                  │  00:12:34 / 01:15:00    │
│                        │                          │
│ Délka:                 │  Ovládání:               │
│ 01:15:00               │  [⏮] [⏪ 5s] [▶] [5s ⏩] │
│                        │  [⏭]                     │
│ Poznámek:              │                          │
│ 3                      │  Stav:                   │
│                        │  ▶ PŘEHRÁVÁNÍ            │
│ Příloh:                │  Čas: 00:12:34           │
│ 2                      │                          │
│                        │  [EXIT]                  │
│ Poznámky               │                          │
│ ├─ Harmonogram        │                          │
│ ├─ Úkoly              │                          │
│ └─ Nové členy         │                          │
│                        │                          │
│ Přílohy                │                          │
│ ├─ IMG_2024.jpg       │                          │
│ └─ protokol.pdf       │                          │
│                        │                          │
└─────────────────────────────────────────────────────┘
```

### Key Elements
- **Left sidebar**: Meeting metadata and content list
- **Player area**: Shows what's being played/recorded
- **Timeline slider**: Seek to any point in meeting
- **Playback controls**: Play, pause, skip, jump to start/end
- **Time display**: Current time / Total duration
- **Status indicator**: Shows if playing or paused
- **EXIT button**: Returns to meeting list

---

## Participant Bar Details

### During LIVE Session
```
● LIVE 00:15:23
└─ 👤 Jan (Harmonogram)
└─ 👤 Marie (Úkoly)
└─ 👤 Czech Scout (Připraveno)
```

### Meaning
- 🟢 Green dot = User is active/online
- Name = User's name from account
- (Note name) = Which document they're editing
- Auto-removes after 30 seconds of inactivity

---

## Status Colors & Badges

### LIVE Meeting
```
┌─────────────────┐
│ 🔴 LIVE 00:15:23│
└─────────────────┘
Color: #ff4444 (Red)
Animation: Pulsing
Icon: Animated dot
```

### Replay/Past Meeting
```
┌──────────────────┐
│ ▶ PŘEHRÁNÍ      │
└──────────────────┘
Color: #4a90e2 (Blue)
Animation: None
Icon: Play triangle
```

### Draft Meeting
```
┌──────────────────┐
│ 📝 UPRAVIT      │
└──────────────────┘
Color: #ffd700 (Yellow)
Animation: None
Icon: Pencil
```

---

## Responsive Layouts

### Desktop (1200px+)
```
┌─────────────────────────────┐
│ Header                      │
├─────────────────────────────┤
│       Participant Bar       │
├──────────────────┬──────────┤
│                  │          │
│  Notes Grid      │ Files &  │
│  (2 columns)     │ Attach   │
│                  │          │
├──────────────────┴──────────┤
│ Footer (Replay controls)    │
└─────────────────────────────┘
```

### Tablet (768px - 1200px)
```
┌──────────────────────┐
│ Header               │
├──────────────────────┤
│ Participant Bar      │
├──────────────────────┤
│ Notes & Files        │
│ (1 column, stacked)  │
├──────────────────────┤
│ Footer               │
└──────────────────────┘
```

### Mobile (< 768px)
```
┌──────────────┐
│ Header       │
├──────────────┤
│ Participant  │
│ Bar          │
├──────────────┤
│ Notes        │
│ (Full width) │
├──────────────┤
│ Files        │
├──────────────┤
│ Footer       │
└──────────────┘
```

---

## Animation Details

### LIVE Badge Pulse
```
┌──────────────────────┐
│ 🔴 LIVE 00:15:23     │  100% opacity
└──────────────────────┘
         ↓
┌──────────────────────┐
│ 🔴 LIVE 00:15:23     │  50% opacity
└──────────────────────┘
         ↓
┌──────────────────────┐
│ 🔴 LIVE 00:15:23     │  100% opacity
└──────────────────────┘
         Duration: 1.5 seconds
         Repeats: Infinite
```

### Participant Dot Pulse
```
🟢 (Full)  → 🟡 (Half)  → 🟢 (Full)
Animation duration: 1.5 seconds
```

### Hover Effects on Cards
```
Before:
┌──────────────────┐
│ Note Title       │
│ Preview text...  │
└──────────────────┘
Box-shadow: 3px 3px

After (hover):
┌──────────────────┐
│ Note Title       │
│ Preview text...  │
└──────────────────┘
Box-shadow: 5px 5px
Transform: translate(-2px, -2px)
```

---

## Dialog/Modal States

### Create New Meeting
```
┌────────────────────────────┐
│ Název schůze               │
│ ┌──────────────────────┐   │
│ │_____________________│   │
│                        │   │
│ Popis (nepovinný)      │   │
│ ┌──────────────────────┐   │
│ │_____________________│   │
│ │_____________________│   │
│ │_____________________│   │
│                        │   │
│ [Zrušit]  [Vytvořit]   │   │
└────────────────────────────┘
```

---

## Empty States

### No Meetings Yet
```
┌─────────────────────────────┐
│ 🎯 Žádné schůze             │
│                             │
│ Vytvořte novou!             │
│                             │
│ [+ Nová schůze]            │
└─────────────────────────────┘
```

### No Notes in Meeting
```
┌─────────────────────────────┐
│ Zatím žádné poznámky        │
│ Vytvořte první!             │
│                             │
│ [+ Nová poznámka]          │
└─────────────────────────────┘
```

### No Recording Available
```
┌─────────────────────────────┐
│ Tato schůze nemá záznam    │
│                             │
│ Spusťte schůzi, aby se      │
│ vytvořil záznam.            │
│                             │
│ [← Zpět]                    │
└─────────────────────────────┘
```

---

## Typography Hierarchy

### Headings
- H1: Meeting title (2rem, 900 weight, uppercase)
- H2: Section headers (1.5rem, 900 weight, uppercase)
- H3: Note titles (1.1rem, 700 weight)

### Body
- Regular: 0.95-1rem, 400 weight
- Bold: 600-700 weight for emphasis
- Small: 0.85rem, color: #999

### Monospace
- Timeline/Duration: Font-family: monospace
- Time display: Bold, 1rem

---

## Color Palette

```
Primary Colors:
- LIVE: #ff4444 (Red)
- Active: #06d6a0 (Green)
- Replay: #4a90e2 (Blue)
- Draft: #ffd700 (Yellow)

Neutral Colors:
- Border: #000 (Black)
- Background: #fafafa (Light gray)
- Card: #fff (White)
- Text: #333 (Dark gray)
- Secondary: #666 (Gray)
- Muted: #999 (Light gray)

Shadows:
- Standard: 3px 3px 0 0 #000
- Hover: 5px 5px 0 0 #000
- Subtle: 2px 2px 0 0 #000
```

---

## Breakpoints

```
Mobile:     < 768px
Tablet:     768px - 1200px
Desktop:    > 1200px

Default: Desktop-first design
Responsive: Adapts to all sizes
Touch-friendly: Buttons 44px+ minimum
```

This visual guide shows the exact layout and design of all LIVE meeting features!
