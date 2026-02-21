# Supernotes Integration - FAE Menu

## Overview
The FAE (Feedback & Errors) menu now includes a **Notes** tab that displays your development notes from Supernotes in a card-based format.

## Features
- 📝 View all your Supernotes cards directly in SkauTreg
- 🏷️ Filter by category (REF, FEAT, FIX)
- 🎨 Color-coded cards based on type
- 📱 Responsive design for mobile and desktop
- 🔄 Real-time syncing with Supernotes API

## Setup

### 1. API Key Configuration
Your Supernotes API key has been added to `.env.local`:
```
SUPERNOTES_API_KEY=W2vFctHzhkU9WU__T8YrjsqXRcczSCPXGTvQ5ZPzZuE
```

### 2. Card Naming Convention
For automatic categorization, prefix your Supernotes cards with:
- `REF:` - Refactoring tasks (blue)
- `FEAT:` - New features (green)
- `FIX:` - Bug fixes (yellow)

Examples from your notes:
- ✅ "REF: Needs Refresh"
- ✅ "FEAT: Add function request managment"
- ✅ "FIX: Clippovani a Side marginy"

## File Structure

```
src/
├── lib/
│   └── supernotes.ts              # Supernotes API client
├── app/
│   ├── api/
│   │   └── supernotes/
│   │       └── route.ts           # API route (secures API key)
│   └── fae/
│       ├── page.tsx               # FAE page with Notes tab
│       └── page.module.css        # Styles including notes cards
└── .env.local                     # API key configuration
```

## Usage

1. Navigate to the FAE menu (💡 Nápady & Chyby)
2. Click on the **📝 Moje poznámky** tab
3. Your Supernotes cards will load automatically
4. Use the category filter to view specific types

## API Documentation
For more information about Supernotes API:
https://help.supernotes.app/en/articles/5257176-api-access#h_b00b107a04

## Card Display
Each card shows:
- Category badge (REF/FEAT/FIX)
- Card title
- Creation date
- Full content (rendered HTML)
- Tags (if any)

## Security
- API key is stored server-side in environment variables
- All Supernotes API calls go through Next.js API routes
- No API key exposure to the client

## Current Notes
Based on your Supernotes, you should see these cards:
- REF: Fix and go trought mailing services support
- FEAT: Add function request managment
- REF: Needs Refresh (Account management popup, HOME page fixes)
- FIX: Clippovani a Side marginy (Shadow and clipping issues)
- FEAT: Vedouci na vyprave

Happy organizing! 🎉
