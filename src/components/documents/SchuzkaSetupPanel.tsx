"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { CalendarClock, MapPin } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import styles from "../../app/(dashboard)/rady/[meetingId]/MeetingRoom.module.css";

function localDateTime(value: number) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function SchuzkaSetupPanel({ meetingId }: { meetingId: Id<"meetings"> }) {
  const document = useQuery(api.documents.getByMeeting, { meetingId });
  const leaders = useQuery(api.troops.getLeaders, document ? { troopId: document.troopId } : "skip");
  const updateSetup = useMutation(api.documents.updateSchuzkaSetup);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!document || document.kind !== "schuzka" || !document.setup) return null;
  const setup = document.setup;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const scheduledStartAt = new Date(String(form.get("start"))).getTime();
    const scheduledEndAt = new Date(String(form.get("end"))).getTime();
    if (!Number.isFinite(scheduledStartAt) || !Number.isFinite(scheduledEndAt) || scheduledEndAt <= scheduledStartAt) {
      setMessage("Konec musí být po začátku.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await updateSetup({
        documentId: document._id,
        scheduledStartAt,
        scheduledEndAt,
        timezone: setup.timezone,
        location: String(form.get("location") || "").trim() || undefined,
        participantLeaderIds: form.getAll("leaders") as Id<"users">[],
        facilitatorId: setup.facilitatorId,
      });
      setMessage("Uloženo");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nastavení se nepodařilo uložit.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <details className={styles.setupPanel}>
      <summary><CalendarClock size={15} /> SCHŮZKA <span>{new Intl.DateTimeFormat("cs-CZ", { dateStyle: "short", timeStyle: "short" }).format(setup.scheduledStartAt)}</span></summary>
      <form key={setup.updatedAt} onSubmit={submit} className={styles.setupForm}>
        <label>Začátek<input name="start" type="datetime-local" defaultValue={localDateTime(setup.scheduledStartAt)} /></label>
        <label>Konec<input name="end" type="datetime-local" defaultValue={localDateTime(setup.scheduledEndAt)} /></label>
        <label className={styles.setupWide}>Místo<span className={styles.iconInput}><MapPin size={13} /><input name="location" defaultValue={setup.location || ""} placeholder="Klubovna" /></span></label>
        {leaders && leaders.length > 0 && (
          <fieldset className={styles.setupWide}>
            <legend>Vedoucí</legend>
            <div className={styles.leaderChips}>{leaders.map((leader) => (
              <label key={leader._id}><input name="leaders" type="checkbox" value={leader._id} defaultChecked={setup.participantLeaderIds.includes(leader._id)} /><span>{leader.name || leader.email || "Vedoucí"}</span></label>
            ))}</div>
          </fieldset>
        )}
        <div className={styles.setupActions}>{message && <small role="status">{message}</small>}<button type="submit" disabled={saving}>{saving ? "Ukládám…" : "Uložit"}</button></div>
      </form>
    </details>
  );
}
