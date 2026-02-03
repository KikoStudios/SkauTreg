# LIVE Meeting Features - Complete Implementation

## Overview

The meeting system now supports **LIVE collaborative sessions** with **real-time cursor tracking** and **replay functionality**. All changes are synced in real-time, allowing multiple users to edit in the same document while seeing each other's cursors and presence.

## Key Features

### 1. LIVE Sessions
- **Real-time synchronization**: All changes are instantly synced across all participants
- **Live indicator**: Pulsing red badge shows meeting is active
- **Session tracking**: Start and end times are recorded automatically
- **Participant presence**: See who is currently editing and which document they're working on

### 2. Cursor Presence
- **Real-time cursor tracking**: See where other users' cursors are
- **Selection highlighting**: View text selections of other participants
- **Active participants bar**: Shows all active users with indicators
- **User identification**: See names and roles of participants

### 3. Replay Functionality
- **Full session replay**: Playback entire meeting with all changes
- **Timeline control**: Seek to any point in the meeting
- **Playback speed**: Watch at normal speed or skip through
- **Meeting metadata**: See duration, start/end times, participant count

### 4. Unified UI
- **Neobrutalist design**: Bold borders, sharp shadows, uppercase typography
- **Integrated layout**: Notes and attachments in one view
- **Status indicators**: Clear visual distinction between LIVE, Replay, and Draft modes
- **Responsive design**: Works on all screen sizes

## Database Schema

### Enhanced `meetings` table
```typescript
meetings: defineTable({
  troopId: Id<"troops">,
  title: string,
  description?: string,
  createdBy: Id<"users">,
  createdAt: number,
  updatedAt: number,
  isLive: boolean,           // ✨ NEW: True if session is currently active
  startedAt?: number,        // ✨ NEW: When session started
  endedAt?: number,          // ✨ NEW: When session ended
})
```

### New `meeting_presence` table
```typescript
meeting_presence: defineTable({
  meetingId: Id<"meetings">,
  userId: Id<"users">,
  noteId?: Id<"meeting_notes">,    // Which note they're editing
  cursorPosition?: number,           // Char position in content
  selection?: {                      // Text selection range
    start: number,
    end: number,
  },
  lastSeen: number,                 // For detecting inactive users
})
```

## API Functions (Convex)

### Session Management
```typescript
// Start a LIVE meeting session
startSession({ meetingId })

// End the LIVE session and clean up
endSession({ meetingId })
```

### Presence Tracking
```typescript
// Update user's presence (cursor, note being edited)
updatePresence({
  meetingId,
  noteId?: Id<"meeting_notes">,
  cursorPosition?: number,
  selection?: { start: number, end: number },
})

// Remove user from presence tracking
removePresence({ meetingId })

// Get all active participants
getActiveParticipants({ meetingId }): Promise<Participant[]>
```

## Components

### MeetingSession.tsx
**Main component for LIVE meetings and replay mode**

**Props:**
- `meetingId`: The meeting to display
- `onBack`: Callback when user goes back
- `isReplayMode?: boolean`: Whether in replay mode
- `replayTime?: number`: Current replay time (in seconds)

**Features:**
- LIVE badge with timer
- Participant presence bar
- Real-time notes and attachments
- Session control (Start/End meeting)
- Auto-save for changes

**Styling:** `MeetingSession.module.css`
- Red (#ff4444) for LIVE indicator
- Green (#06d6a0) for active participants
- Bold neobrutalist design

### MeetingReplay.tsx
**Dedicated component for replaying past meetings**

**Props:**
- `meetingId`: The meeting to replay
- `onBack`: Callback when user exits replay

**Features:**
- Meeting metadata sidebar (start/end time, duration)
- List of all notes taken during meeting
- List of all attachments
- Interactive timeline player
- Playback controls (play, pause, seek, speed)
- Time display with HH:MM:SS format

**Styling:** `MeetingReplay.module.css`
- Blue (#4a90e2) for replay controls
- Info cards for session details
- Full player interface

### MeetingsList.tsx
**Updated to show LIVE, Past, and Draft meetings**

**Features:**
- **LIVE Meetings Section**: Red badge, pulsing indicator
  - "PŘIPOJIT SE" button to join active session
- **Past Meetings Section**: Gray indicator, date badge
  - "▶ PŘEHRÁNÍ" button to replay
- **Draft Meetings Section**: Yellow indicator (pencil icon)
  - "✏️ UPRAVIT" button to prepare/edit

**Styling:** `MeetingsList.module.css`
- Grid layout (responsive)
- Color-coded sections
- Action buttons for each state

## Workflow

### Starting a Meeting

1. User creates a meeting (appears in "Přípravy na schůze" section)
2. User clicks meeting to edit/prepare
3. When ready, clicks "SPUSTIT RADU" button
4. Meeting enters LIVE mode (moved to "LIVE" section with red indicator)
5. Others can click "PŘIPOJIT SE" to join

### During LIVE Session

```
┌─────────────────────────────────────────────────┐
│                    LIVE 00:15:23                │
│  • Jan (Harmonogram)                            │
│  • Marie (Harmonogram)                          │
└─────────────────────────────────────────────────┘
│ Poznámky                                        │
├─ Harmonogram [live edit]                       │
├─ Úkoly [ready to edit]                         │
└─ Přílohy                                        │
  • IMG_2024.jpg (1.2 MB)                         │
  • protokol.pdf (500 KB)                         │
```

**Actions:**
- Real-time edits are synced instantly
- Cursor positions update every 2 seconds
- Multiple users can write in same file
- See live changes from others
- Add/remove notes during session

### Ending a Meeting

1. Click "UKONČIT RADU" button (red button)
2. Meeting transitions to past section
3. Meeting becomes available for replay
4. Presence records are cleaned up

### Replaying a Meeting

1. Go to "Minulé schůze (Záznamy)"
2. Click "▶ PŘEHRÁNÍ" on the meeting
3. View timeline with all notes and files
4. Use playback controls to navigate
5. Watch how meeting progressed over time

## Styling Details

### LIVE Badge
```css
.liveBadge {
  background-color: #ff4444;
  color: white;
  animation: pulse 1s infinite;
  border: 2px solid #000;
  box-shadow: 3px 3px 0 0 #000;
}
```

### Participant Chip
```css
.participantChip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.8rem;
  border: 2px solid #000;
  background-color: #f5f5f5;
  box-shadow: 2px 2px 0 0 #000;
}
```

### Action Buttons
- **LIVE meetings**: Green "PŘIPOJIT SE" button (#06d6a0)
- **Past meetings**: Blue "▶ PŘEHRÁNÍ" button (#4a90e2)
- **Draft meetings**: Yellow "✏️ UPRAVIT" button (#ffd700)

## Auto-save & Sync

### Presence Updates
- Sent every 2 seconds while editing
- Tracks cursor position and selection
- Automatically cleaned up when user leaves
- Inactive users (30+ seconds) filtered from active list

### Note Edits
- Saved after 3 seconds of inactivity
- Last editor (`updatedBy`) is tracked
- `updatedAt` timestamp updated automatically

## Key Technologies

- **Convex**: Real-time database with subscriptions
- **React Hooks**: State management for presence and sessions
- **CSS Modules**: Scoped styling for components
- **Neobrutalist Design**: Bold, high-contrast UI

## Deployment Notes

Before deploying to production:

```powershell
# 1. Update Convex schema
npx convex deploy --prod

# 2. Restart the application
# 3. Test LIVE meeting creation and collaboration
# 4. Test replay functionality
```

## Usage Examples

### For Users

**Starting a LIVE Meeting:**
1. Go to Rady section
2. Click "+ Nová schůze"
3. Enter title (e.g., "Podzimní táboření")
4. Click "Vytvořit"
5. Click "SPUSTIT RADU" to start
6. Other members join with "PŘIPOJIT SE"

**Creating Notes During Meeting:**
1. Click "+ Nová poznámka"
2. Write in Markdown format
3. Content auto-saves every 3 seconds
4. See real-time updates from others
5. See other users' cursors

**Replaying a Meeting:**
1. Find meeting in "Minulé schůze (Záznamy)"
2. Click "▶ PŘEHRÁNÍ"
3. Use controls to play/pause/seek
4. Review notes and files uploaded during meeting
5. Click EXIT to return to list

### For Developers

**Track User Presence:**
```typescript
updatePresence({
  meetingId: meeting._id,
  noteId: currentNote._id,
  cursorPosition: editorCursorPos,
})
```

**Start/End Session:**
```typescript
// Start
await startSession({ meetingId: meeting._id })

// End
await endSession({ meetingId: meeting._id })
```

**Query Active Participants:**
```typescript
const participants = useQuery(api.meetings.getActiveParticipants, {
  meetingId: meeting._id
})
```

## Future Enhancements

Potential improvements for future iterations:

1. **Operational Transform (OT)**: Conflict-free collaborative editing
2. **Comment Threading**: Discuss specific note sections
3. **Change History**: View edit history with who changed what
4. **Video/Audio**: Real-time communication during meetings
5. **Permission Levels**: Read-only vs edit access
6. **Export**: PDF/Word export of meeting notes
7. **Notifications**: Real-time alerts for changes
8. **Search**: Full-text search across meetings

## Troubleshooting

### Presence Not Updating
- Check if `updatePresence` is being called every 2 seconds
- Verify `lastSeen` timestamp is current
- Ensure user hasn't been inactive for 30+ seconds

### Changes Not Syncing
- Confirm `isLive` flag is true
- Check Convex connection status
- Verify `subscribeToMeeting` is active

### Replay Not Working
- Ensure `startedAt` and `endedAt` are set
- Verify meeting notes exist
- Check session duration is > 0

## Support

For issues or feature requests, contact the development team with:
- Meeting ID
- Timestamp when issue occurred
- Screenshot of the problem
- Browser/device information
