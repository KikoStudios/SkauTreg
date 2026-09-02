"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { CheckSquare2, Plus } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import styles from "../../app/(dashboard)/rady/[meetingId]/MeetingRoom.module.css";

export default function DocumentTasksPanel({ meetingId, activePageId }: { meetingId: Id<"meetings">; activePageId: Id<"meeting_pages"> | null }) {
  const document = useQuery(api.documents.getByMeeting, { meetingId });
  const tasks = useQuery(api.documentTasks.list, document ? { troopId: document.troopId, documentId: document._id, openOnly: true } : "skip");
  const createTask = useMutation(api.documentTasks.create);
  const updateTask = useMutation(api.documentTasks.update);
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);

  if (!document) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !activePageId) return;
    setAdding(true);
    try {
      await createTask({
        documentId: document._id,
        sourcePageId: activePageId,
        sourceBlockId: "document-root",
        taskKey: crypto.randomUUID(),
        title: title.trim(),
        sourceExcerpt: "Přidáno v Úkolníčku dokumentu",
      });
      setTitle("");
    } finally {
      setAdding(false);
    }
  };

  return <section className={styles.section} aria-labelledby="document-tasks-title">
    <h3 id="document-tasks-title" className={styles.sectionTitle}><CheckSquare2 size={15} /> ÚKOLNÍČEK</h3>
    <div className={styles.sectionContent}>
      {tasks?.map((task) => <label key={task._id} className={styles.taskItem}>
        <input type="checkbox" checked={!task.isOpen} onChange={(event) => updateTask({ taskId: task._id, status: event.target.checked ? "done" : "todo" })} />
        <span><strong>{task.title}</strong><small>{task.aiSummary || task.sourceDocumentTitle}</small></span>
      </label>)}
      {tasks && tasks.length === 0 && <p className={styles.taskEmpty}>Žádné otevřené úkoly.</p>}
      <form onSubmit={submit} className={styles.taskForm}>
        <input aria-label="Nový úkol" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Přidat úkol…" />
        <button type="submit" disabled={adding || !activePageId || !title.trim()} aria-label="Přidat úkol"><Plus size={14} /></button>
      </form>
    </div>
  </section>;
}
