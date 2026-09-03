"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Check, CheckSquare2, Plus } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import styles from "../../app/(dashboard)/rady/[meetingId]/MeetingRoom.module.css";

export default function DocumentTasksPanel({ meetingId, activePageId }: { meetingId: Id<"meetings">; activePageId: Id<"meeting_pages"> | null }) {
  const document = useQuery(api.documents.getByMeeting, { meetingId });
  const tasks = useQuery(api.documentTasks.list, document ? { troopId: document.troopId, documentId: document._id, openOnly: false } : "skip");
  const createTask = useMutation(api.documentTasks.create);
  const updateTask = useMutation(api.documentTasks.update);
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [pendingState, setPendingState] = useState<Record<string, boolean>>({});
  const [taskError, setTaskError] = useState("");

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

  const toggleTask = async (taskId: Id<"document_tasks">, complete: boolean) => {
    setTaskError("");
    setPendingState((current) => ({ ...current, [taskId]: complete }));
    try {
      await updateTask({ taskId, status: complete ? "done" : "todo" });
    } catch (error) {
      console.error("Failed to update document task:", error);
      setTaskError("Úkol se nepodařilo uložit. Zkuste to znovu.");
    } finally {
      setPendingState((current) => {
        const next = { ...current };
        delete next[taskId];
        return next;
      });
    }
  };

  const sortedTasks = [...(tasks ?? [])].sort((a, b) => {
    if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });

  return <section className={styles.section} aria-labelledby="document-tasks-title">
    <h3 id="document-tasks-title" className={styles.sectionTitle}><CheckSquare2 size={15} /> ÚKOLNÍČEK</h3>
    <div className={styles.sectionContent}>
      {sortedTasks.map((task) => {
        const saving = Object.prototype.hasOwnProperty.call(pendingState, task._id);
        const complete = saving ? pendingState[task._id] : !task.isOpen;
        return <label key={task._id} className={styles.taskItem} data-state={complete ? "completed" : "open"} data-saving={saving}>
          <input className={styles.taskCheckboxInput} type="checkbox" checked={complete} disabled={saving} onChange={(event) => void toggleTask(task._id, event.target.checked)} />
          <span className={styles.taskCheckbox} aria-hidden="true"><Check size={11} strokeWidth={3} /></span>
          <span className={styles.taskCopy}><strong>{task.title}</strong><small>{task.aiSummary || task.sourceDocumentTitle}</small></span>
        </label>;
      })}
      {tasks && tasks.length === 0 && <p className={styles.taskEmpty}>Zatím žádné úkoly.</p>}
      <p className={styles.taskError} aria-live="polite">{taskError}</p>
      <form onSubmit={submit} className={styles.taskForm}>
        <input aria-label="Nový úkol" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Přidat úkol…" />
        <button type="submit" disabled={adding || !activePageId || !title.trim()} aria-label="Přidat úkol"><Plus size={14} /></button>
      </form>
    </div>
  </section>;
}
