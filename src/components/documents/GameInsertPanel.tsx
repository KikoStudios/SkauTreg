"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { Gamepad2, Plus, Search } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import styles from "../../app/(dashboard)/rady/[meetingId]/MeetingRoom.module.css";

export default function GameInsertPanel({ meetingId, activePageId }: { meetingId: Id<"meetings">; activePageId: Id<"meeting_pages"> | null }) {
  const document = useQuery(api.documents.getByMeeting, { meetingId });
  const [search, setSearch] = useState("");
  const games = useQuery(api.games.list, document?.kind === "schuzka" ? { troopId: document.troopId, search: search || undefined } : "skip");
  if (!document || document.kind !== "schuzka") return null;

  return <details className={styles.gameInsert}>
    <summary><Gamepad2 size={15} /> HRY</summary>
    <label><Search size={13} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Najít a vložit…" /></label>
    <div>{games?.slice(0, 8).map((game) => <button key={game._id} type="button" disabled={!activePageId} onClick={() => window.document.dispatchEvent(new CustomEvent("documents:insert-game", { detail: {
      pageId: activePageId,
      game: { id: game._id, name: game.name, description: game.description, instructions: game.instructions, durationMinutes: game.durationMinutes, equipment: game.equipment },
    } }))}><span><strong>{game.name}</strong><small>{game.durationMinutes} min{game.equipment.length ? ` · ${game.equipment.join(", ")}` : ""}</small></span><Plus size={13} /></button>)}</div>
    {games?.length === 0 && <small className={styles.gameEmpty}>Žádná hra nenalezena.</small>}
  </details>;
}
