"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import DocumentAISuggestions from "../documents/DocumentAISuggestions";
import DocumentMaterialsPanel from "../documents/DocumentMaterialsPanel";
import DocumentTasksPanel from "../documents/DocumentTasksPanel";
import GameInsertPanel from "../documents/GameInsertPanel";
import SchuzkaSetupPanel from "../documents/SchuzkaSetupPanel";
import FilesPanel from "./FilesPanel";
import ParticipantsPanel from "./ParticipantsPanel";
import styles from "../../app/(dashboard)/rady/[meetingId]/MeetingRoom.module.css";

interface MeetingSidebarProps {
  meetingId: Id<"meetings">;
  activePageId: Id<"meeting_pages"> | null;
  onImageClick: (fileId: Id<"meeting_files">, url: string) => void;
}

export default function MeetingSidebar({ meetingId, activePageId, onImageClick }: MeetingSidebarProps) {
  const document = useQuery(api.documents.getByMeeting, { meetingId });

  return (
    <aside className={styles.inspector} aria-label="Kontext dokumentu">
      <div className={styles.inspectorHeader}>
        <span className={styles.eyebrow}>KONTEXT</span>
        <strong>Podklady a návaznosti</strong>
      </div>
      <SchuzkaSetupPanel meetingId={meetingId} />
      {document && <DocumentAISuggestions documentId={document._id} />}
      {document && <DocumentMaterialsPanel documentId={document._id} activePageId={activePageId} />}
      <DocumentTasksPanel meetingId={meetingId} activePageId={activePageId} />
      <GameInsertPanel meetingId={meetingId} activePageId={activePageId} />
      <FilesPanel meetingId={meetingId} onImageClick={onImageClick} />
      <ParticipantsPanel meetingId={meetingId} />
    </aside>
  );
}
