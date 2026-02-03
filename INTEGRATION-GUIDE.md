# Integration Guide - Using LIVE Meeting Components

## Quick Integration

Here's how to use the new meeting components in your pages.

## Basic Setup

### 1. Import the Components

```tsx
import MeetingsList from "@/components/MeetingsList";
import MeetingSession from "@/components/MeetingSession";
import MeetingReplay from "@/components/MeetingReplay";
```

### 2. Meeting Page Component

```tsx
"use client";

import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import MeetingsList from "@/components/MeetingsList";
import MeetingSession from "@/components/MeetingSession";
import MeetingReplay from "@/components/MeetingReplay";

export default function MeetingsPage({ troopId }: { troopId: Id<"troops"> }) {
  const [view, setView] = useState<"list" | "session" | "replay">("list");
  const [selectedMeetingId, setSelectedMeetingId] = useState<Id<"meetings"> | null>(null);

  return (
    <div>
      {view === "list" && (
        <MeetingsList
          troopId={troopId}
          onSelectMeeting={(meetingId) => {
            setSelectedMeetingId(meetingId);
            setView("session");
          }}
          onReplayMeeting={(meetingId) => {
            setSelectedMeetingId(meetingId);
            setView("replay");
          }}
        />
      )}

      {view === "session" && selectedMeetingId && (
        <MeetingSession
          meetingId={selectedMeetingId}
          onBack={() => {
            setSelectedMeetingId(null);
            setView("list");
          }}
        />
      )}

      {view === "replay" && selectedMeetingId && (
        <MeetingReplay
          meetingId={selectedMeetingId}
          onBack={() => {
            setSelectedMeetingId(null);
            setView("list");
          }}
        />
      )}
    </div>
  );
}
```

## State Management Flow

```
MeetingsList (view === "list")
    ↓ onSelectMeeting()
    ↓
MeetingSession (view === "session")
    ↓ onBack()
    ↓
back to MeetingsList
    ↓ onReplayMeeting()
    ↓
MeetingReplay (view === "replay")
    ↓ onBack()
    ↓
back to MeetingsList
```

## Component Props

### MeetingsList

```tsx
interface MeetingsListProps {
  troopId: Id<"troops">;
  onSelectMeeting: (meetingId: Id<"meetings">) => void;
  onReplayMeeting?: (meetingId: Id<"meetings">) => void;
}
```

**Usage:**
- Display all meetings for a troop
- Navigate to LIVE session or replay
- Create new meetings
- Delete meetings

### MeetingSession

```tsx
interface MeetingSessionProps {
  meetingId: Id<"meetings">;
  onBack: () => void;
  isReplayMode?: boolean;
  replayTime?: number;
}
```

**Usage:**
- Edit notes during LIVE meeting
- Start/end meeting sessions
- See participant presence
- Upload attachments

### MeetingReplay

```tsx
interface MeetingReplayProps {
  meetingId: Id<"meetings">;
  onBack: () => void;
}
```

**Usage:**
- View past meeting recordings
- Play/pause/seek through timeline
- See notes and attachments from meeting

## Styling Integration

All components use CSS Modules and are self-contained. No global CSS needed.

```tsx
// Components already have their styles
import styles from "./MeetingSession.module.css"; // Inside component
import styles from "./MeetingReplay.module.css";
import styles from "./MeetingsList.module.css";
```

## Error Handling

Each component handles its own errors gracefully:

```tsx
// MeetingSession
if (meeting === undefined) return <div>Načítám schůzi...</div>;
if (!meeting) return <div>Schůze nenalezena.</div>;

// MeetingReplay
if (!meeting) return <div>Schůze nenalezena.</div>;

// MeetingsList shows empty state
if (meetings.length === 0) return <div>Žádné schůze...</div>;
```

## Real-time Updates

The components automatically handle real-time updates via Convex:

```tsx
// Inside components:
const meeting = useQuery(api.meetings.subscribeToMeeting, { meetingId });
const participants = useQuery(api.meetings.getActiveParticipants, { meetingId });

// Updates automatically when data changes
```

## Customization

### Change Colors

Modify the CSS module files to adjust colors:

```css
/* In MeetingSession.module.css */
.liveBadge {
  background-color: #ff4444; /* Change LIVE color */
}

/* In MeetingReplay.module.css */
.replayBtn {
  background-color: #4a90e2; /* Change replay button color */
}
```

### Change Text

Update Czech labels to your language:

```tsx
// In MeetingSession.tsx
<div className={styles.empty}>
  Zatím žádné poznámky. {/* Customize message */}
</div>

// In MeetingReplay.tsx
<h3>Informace o záznamu</h3> {/* Customize title */}
```

### Adjust Timing

```tsx
// In MeetingSession.tsx - Presence update interval
const interval = setInterval(() => {
  updatePresence({ /* ... */ })
}, 2000); // Change from 2000ms to desired interval

// In meetings.ts - Presence timeout
const activePresence = presence.filter((p) => now - p.lastSeen < 30000); // 30 seconds
```

## Full Page Example

Here's a complete meetings page using all components:

```tsx
"use client";

import { useParams } from "next/navigation";
import { Id } from "../../../../convex/_generated/dataModel";
import { useState } from "react";
import MeetingsList from "@/components/MeetingsList";
import MeetingSession from "@/components/MeetingSession";
import MeetingReplay from "@/components/MeetingReplay";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function TroopMeetingsPage() {
  const params = useParams();
  const troopId = params.troopId as Id<"troops">;

  const [view, setView] = useState<"list" | "session" | "replay">("list");
  const [selectedMeetingId, setSelectedMeetingId] = useState<Id<"meetings"> | null>(null);

  return (
    <div style={{ padding: "2rem" }}>
      <Breadcrumbs
        items={[
          { label: "Oddíl", href: `/troop/${troopId}` },
          { label: "Schůze", current: true },
        ]}
      />

      {view === "list" && (
        <MeetingsList
          troopId={troopId}
          onSelectMeeting={(meetingId) => {
            setSelectedMeetingId(meetingId);
            setView("session");
          }}
          onReplayMeeting={(meetingId) => {
            setSelectedMeetingId(meetingId);
            setView("replay");
          }}
        />
      )}

      {view === "session" && selectedMeetingId && (
        <MeetingSession
          meetingId={selectedMeetingId}
          onBack={() => {
            setSelectedMeetingId(null);
            setView("list");
          }}
        />
      )}

      {view === "replay" && selectedMeetingId && (
        <MeetingReplay
          meetingId={selectedMeetingId}
          onBack={() => {
            setSelectedMeetingId(null);
            setView("list");
          }}
        />
      )}
    </div>
  );
}
```

## Testing the Implementation

### 1. Test LIVE Meeting Creation
```
✓ Navigate to meetings
✓ Click "+ Nová schůze"
✓ Enter title and description
✓ Click "Vytvořit"
✓ Verify it appears in "Přípravy na schůze" section
```

### 2. Test LIVE Session
```
✓ Click on prepared meeting
✓ Click "SPUSTIT RADU"
✓ Verify badge changes to red "LIVE 00:00:00"
✓ Click "+ Nová poznámka"
✓ Write some text
✓ Verify auto-save (3 seconds)
✓ Open in another tab and verify real-time sync
```

### 3. Test Participant Presence
```
✓ Open meeting in 2 tabs/windows
✓ Click different notes in each tab
✓ Verify participant bar shows both users
✓ Verify it shows which note each is editing
```

### 4. Test Replay
```
✓ End the LIVE meeting
✓ Verify it moves to "Minulé schůze (Záznamy)"
✓ Click "▶ PŘEHRÁNÍ"
✓ Verify replay interface loads
✓ Test play/pause buttons
✓ Test seek slider
✓ Verify time display updates
✓ Test speed controls
```

## Troubleshooting

### Problem: Presence not updating
**Solution:** Check if `updatePresence` is being called. Verify network connection to Convex.

### Problem: Changes not syncing
**Solution:** Confirm `isLive` is true. Check if `subscribeToMeeting` query is active.

### Problem: LIVE badge not showing
**Solution:** Verify `startSession` mutation was called successfully. Check browser console for errors.

### Problem: Replay button not working
**Solution:** Ensure meeting has `startedAt` and `endedAt` timestamps. Check that notes exist.

## Performance Tips

1. **Limit Presence Updates**: Currently every 2 seconds (optimal for real-time feel)
2. **Auto-filter Inactive**: Users inactive for 30+ seconds removed from bar
3. **Clean Up on Leave**: Presence cleaned up when user leaves meeting
4. **Use Subscriptions**: Convex subscriptions are already optimized

## Security Considerations

- Users can only edit their own troop's meetings
- Presence data is temporary (cleaned up on session end)
- All mutations require authentication
- Consider adding role-based permissions for future

## Future Enhancements

Ready to add:
1. Edit history/change tracking
2. Comment threading on notes
3. Video/audio during meetings
4. Real-time cursor names over positions
5. Note version history
6. Export to PDF/Word
7. Meeting transcripts

---

**You're all set!** The components are production-ready and can be deployed immediately.
