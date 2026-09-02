"use client";

import { FormEvent, useState } from "react";
import { useQuery } from "convex/react";
import { Check, FileText, Link2, Plus, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import styles from "../../app/(dashboard)/rady/[meetingId]/MeetingRoom.module.css";

interface NotesPanelProps {
  meetingId: Id<"meetings">;
  tripId?: Id<"trips">;
  activePageId: Id<"meeting_pages"> | null;
  onPageSelect: (pageId: Id<"meeting_pages">) => void;
  onAddPage: (title: string) => Promise<void>;
  onConnectTrip?: () => void;
}

export default function NotesPanel({ meetingId, tripId, activePageId, onPageSelect, onAddPage, onConnectTrip }: NotesPanelProps) {
  const pages = useQuery(api.pages.getByMeeting, { meetingId });
  const meeting = useQuery(api.meetings.get, { meetingId });
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onAddPage(title.trim());
      setTitle("");
      setCreating(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <nav className={styles.outline} aria-label="Stránky dokumentu">
      <div className={styles.outlineHeader}>
        <div>
          <span className={styles.eyebrow}>DOKUMENT</span>
          <strong>{meeting?.title ?? "Načítám…"}</strong>
        </div>
        <button type="button" className={styles.iconButton} onClick={() => setCreating(true)} aria-label="Přidat stránku">
          <Plus size={17} />
        </button>
      </div>

      <div className={styles.pageList} aria-busy={pages === undefined}>
        {pages === undefined && Array.from({ length: 3 }).map((_, index) => <div className={styles.pageSkeleton} key={index} />)}
        {pages?.map((page, index) => (
          <button
            key={page._id}
            type="button"
            className={`${styles.pageItem} ${activePageId === page._id ? styles.active : ""}`}
            onClick={() => onPageSelect(page._id)}
          >
            <FileText size={15} />
            <span>{page.title || `Stránka ${index + 1}`}</span>
            {activePageId === page._id && <Check size={13} aria-hidden="true" />}
          </button>
        ))}
      </div>

      {creating && (
        <form className={styles.newPageForm} onSubmit={submit}>
          <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Název stránky" aria-label="Název nové stránky" />
          <button type="submit" disabled={!title.trim() || submitting} aria-label="Vytvořit stránku"><Check size={14} /></button>
          <button type="button" onClick={() => { setCreating(false); setTitle(""); }} aria-label="Zrušit"><X size={14} /></button>
        </form>
      )}

      <div className={styles.outlineFooter}>
        {tripId ? (
          <span className={styles.tripStatus}><Link2 size={13} /> Propojeno s výpravou</span>
        ) : onConnectTrip ? (
          <button type="button" className={styles.connectButton} onClick={onConnectTrip}><Link2 size={14} /> Připojit k výpravě</button>
        ) : null}
      </div>
    </nav>
  );
}
