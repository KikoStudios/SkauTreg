"use client";

import { Id } from "../../../convex/_generated/dataModel";
import NotesPanel from "./NotesPanel";
import FilesPanel from "./FilesPanel";
import ParticipantsPanel from "./ParticipantsPanel";
import styles from "../../app/(dashboard)/rady/[meetingId]/MeetingRoom.module.css";

interface MeetingSidebarProps {
    meetingId: Id<"meetings">;
    tripId?: Id<"trips">;
    activePageId: Id<"meeting_pages"> | null;
    onPageSelect: (pageId: Id<"meeting_pages">) => void;
    onAddPage: (targetMeetingId: Id<"meetings">) => void;
    onImageClick: (fileId: Id<"meeting_files">, url: string) => void;
    tripDocs?: any[];
    onConnectTrip?: () => void;
}

export default function MeetingSidebar({
    meetingId,
    tripId,
    activePageId,
    onPageSelect,
    onAddPage,
    onImageClick,
    tripDocs,
    onConnectTrip,
}: MeetingSidebarProps) {
    return (
        <div className={styles.sidebar}>
            <NotesPanel
                meetingId={meetingId}
                tripId={tripId}
                activePageId={activePageId}
                onPageSelect={onPageSelect}
                onAddPage={onAddPage}
                tripDocs={tripDocs}
                onConnectTrip={onConnectTrip}
            />
            <FilesPanel
                meetingId={meetingId}
                onImageClick={onImageClick}
            />
            <ParticipantsPanel
                meetingId={meetingId}
            />
        </div>
    );
}
