# Rady (Meeting Notes) Feature

## Overview
The "Rady" feature provides collaborative meeting notes functionality for scout troops. Leaders can create meetings, add multiple markdown documents, and upload photos/attachments from chalkboards or other materials.

## Features

### 1. Meeting Management
- Create multiple meetings for different dates/topics
- Each meeting has:
  - Title and description
  - Creation and update timestamps
  - Associated notes and attachments

### 2. Collaborative Note Documents
- **Markdown Support**: Notes are written in Markdown format
- **Live Updates**: Changes are synced in real-time via Convex subscriptions
- **Auto-save**: Content automatically saves after 3 seconds of inactivity
- **Preview Mode**: Toggle between edit and preview modes
- **Custom Styling**: Markdown rendered with app-specific styling (bold text, headings)

### 3. File Attachments
- Upload photos (chalkboard pictures, diagrams, etc.)
- Support for documents (PDF, Word, Excel, TXT)
- Thumbnail previews for images
- File size tracking and display

## Database Schema

### `meetings` table
- `troopId`: Reference to the troop
- `title`: Meeting title
- `description`: Optional meeting description
- `createdBy`: User who created the meeting
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

### `meeting_notes` table
- `meetingId`: Reference to the meeting
- `title`: Note title
- `content`: Markdown content
- `createdBy`: User who created the note
- `updatedBy`: User who last updated the note
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

### `meeting_attachments` table
- `meetingId`: Reference to the meeting
- `fileName`: Original file name
- `fileUrl`: URL to the uploaded file
- `fileSize`: Size in bytes
- `mimeType`: File MIME type
- `uploadedBy`: User who uploaded the file
- `uploadedAt`: Upload timestamp
- `description`: Optional description

## API Functions (`convex/meetings.ts`)

### Queries
- `listByTroop`: Get all meetings for a troop
- `getById`: Get a specific meeting with its notes and attachments
- `subscribeToMeeting`: Real-time subscription to meeting updates

### Mutations
- `create`: Create a new meeting
- `update`: Update meeting title/description
- `delete_`: Delete a meeting and all its notes/attachments
- `createNote`: Create a note within a meeting
- `updateNote`: Update a note's title or content
- `deleteNote`: Delete a note
- `createAttachment`: Add an attachment to a meeting
- `deleteAttachment`: Remove an attachment

## Components

### `MeetingsList`
- Displays all meetings for a troop
- Create new meetings
- Delete meetings
- Navigate to meeting details

### `MeetingView`
- Shows meeting overview
- Lists all notes as cards
- Displays attachments section
- Navigation to create/edit notes

### `MarkdownNoteEditor`
- Full-featured markdown editor
- Split view with live preview
- Auto-save functionality
- Unsaved changes indicator

### `MarkdownDisplay`
- Custom markdown renderer
- App-styled headings and bold text
- Support for:
  - Headings (H1-H3)
  - Bold and italic text
  - Code blocks and inline code
  - Unordered and ordered lists
  - Blockquotes
  - Links

### `MeetingAttachments`
- File upload interface
- Thumbnail previews for images
- File size and date display
- Delete attachments

## Usage

### Access Rady
1. Navigate to your troop dashboard
2. Click on the "Rady (Schůze)" card
3. This opens the meetings list

### Create a Meeting
1. Click "+ Nová schůze"
2. Enter meeting title and optional description
3. Click "Vytvořit"

### Add Notes
1. Open a meeting
2. Click "+ Nová poznámka"
3. Enter a title and write your notes in Markdown
4. Content auto-saves as you type
5. Toggle "Náhled" to see formatted preview

### Upload Files
1. Open a meeting
2. Scroll to "Přílohy" section
3. Click "📤 Nahrát soubory"
4. Select files from your device
5. Files are uploaded and displayed

### Markdown Formatting Examples

```markdown
# Main Heading
## Subheading
### Small Heading

**Bold text** - Important points
*Italic text* - Emphasis

- Bullet point 1
- Bullet point 2

1. First item
2. Second item

> Quote or important note

`inline code` for technical terms

\`\`\`
Code block
for longer code
\`\`\`

[Link text](https://example.com)
```

## Real-time Collaboration

The feature uses Convex's real-time subscriptions to provide live updates:
- When one user edits a note, others see the changes
- Auto-save ensures changes are persisted
- The `subscribeToMeeting` query keeps the UI in sync

## Next Steps / Future Improvements

1. **Rich File Storage**: Integrate with Convex File Storage or cloud storage (S3, Azure Blob)
2. **Collaborative Editing**: Add operational transformation for true simultaneous editing
3. **User Presence**: Show who else is viewing/editing a note
4. **Version History**: Track note revisions
5. **Search**: Full-text search across all meeting notes
6. **Export**: Export meetings as PDF or Word documents
7. **Templates**: Pre-defined note templates for common meeting types
8. **Permissions**: Fine-grained permissions for who can edit vs view

## Technical Notes

### File Storage
Currently uses data URLs for file storage (not recommended for production). For production use:
- Implement Convex File Storage
- Or integrate with cloud storage (AWS S3, Azure Blob, Cloudflare R2)
- Update `createAttachment` mutation to handle proper file uploads

### Markdown Parser
Custom lightweight markdown parser in `MarkdownDisplay.tsx`. For more features, consider:
- `react-markdown` for comprehensive markdown support
- `remark` plugins for extended syntax
- Syntax highlighting for code blocks (e.g., `prism-react-renderer`)

### Auto-save
3-second debounce delay configurable in `MarkdownNoteEditor.tsx`. Can be adjusted based on user feedback.

## Styling
All components use CSS modules matching the app's neobrutalist design:
- Bold borders (2-3px solid black)
- Box shadows for depth
- High contrast colors
- Strong typography (font-weight: 900)
