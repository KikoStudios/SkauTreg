"use client";

import { useMutation, useQuery } from "convex/react";
import { Check, RefreshCw, Sparkles, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import styles from "../../app/(dashboard)/rady/[meetingId]/MeetingRoom.module.css";

const labels: Record<string, string> = {
  extract_tasks: "Kandidátní úkoly",
};

function suggestionText(kind: string, payload: unknown) {
  if (!payload || typeof payload !== "object") return labels[kind] || "AI návrh";
  const values = Object.values(payload as Record<string, unknown>);
  const items = values.find(Array.isArray) as Array<Record<string, unknown>> | undefined;
  const first = items?.[0];
  const text = first?.title ?? first?.name ?? first?.value ?? first?.summary ?? first?.label;
  const suffix = items && items.length > 1 ? ` +${items.length - 1}` : "";
  return `${typeof text === "string" ? text : labels[kind] || "AI návrh"}${suffix}`;
}

export default function DocumentAISuggestions({ documentId }: { documentId: Id<"documents"> }) {
  const state = useQuery(api.documentAI.getState, { documentId });
  const resolve = useMutation(api.documentAI.resolveSuggestion);
  const retry = useMutation(api.documentAI.retryProcessing);
  if (!state) return null;
  const processing = state.status === "queued" || state.status === "running";
  const taskSuggestions = state.suggestions.filter((suggestion) => suggestion.kind === "extract_tasks");
  if (!processing && state.status !== "failed" && taskSuggestions.length === 0) return null;

  return <section className={styles.aiSuggestions} aria-label="AI návrhy">
    <div className={styles.aiStatus} data-processing={processing} aria-live="polite"><Sparkles size={13} /><span>{processing ? "Tiše zpracovávám program…" : state.status === "failed" ? "Automatické zpracování je dočasně nedostupné" : "Ověřit úkol"}</span>{state.status === "failed" && <button type="button" onClick={() => retry({ documentId })} aria-label="Zkusit AI znovu"><RefreshCw size={12} /> Zkusit znovu</button>}</div>
    {taskSuggestions.map((suggestion) => <article key={suggestion._id} className={styles.aiSuggestion}>
      <button type="button" className={styles.aiSuggestionText} onClick={() => { const target = window.document.getElementById(`b_${suggestion.blockId}`); target?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>
        <small>{labels[suggestion.kind] || suggestion.kind} · {Math.round(suggestion.confidence * 100)} %</small>
        <strong>{suggestionText(suggestion.kind, suggestion.payload)}</strong>
      </button>
      <div><button type="button" aria-label="Přijmout návrh" onClick={() => resolve({ suggestionId: suggestion._id, decision: "accept" })}><Check size={13} /></button><button type="button" aria-label="Odmítnout návrh" onClick={() => resolve({ suggestionId: suggestion._id, decision: "reject" })}><X size={13} /></button></div>
    </article>)}
  </section>;
}
