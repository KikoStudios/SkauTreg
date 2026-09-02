"use client";

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpenText, CalendarDays, CheckCircle2, Clock3, FileClock, Search, SlidersHorizontal } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { DocumentCreateKind } from "./DocumentCreateDialog";
import styles from "./DocumentsWorkspace.module.css";

type DocumentItem = {
  _id: Id<"documents">;
  kind: "document" | "schuzka" | "trip_document" | "decision";
  lifecycle: "plan" | "in_session" | "outcome" | "final" | "archived";
  title: string;
  description?: string;
  tags: string[];
  pageCount: number;
  updatedAt: number;
  setup?: null | { scheduledStartAt: number; location?: string };
};

type Scope = "active" | "final" | "archived" | "all";
type Sort = "updated" | "title" | "meeting";

const kindLabel: Record<DocumentItem["kind"], string> = {
  document: "Poznámkový blok",
  schuzka: "Schůzka",
  trip_document: "Výprava",
  decision: "Rozhodnutí",
};

const lifecycleLabel: Record<DocumentItem["lifecycle"], string> = {
  plan: "Příprava",
  in_session: "Právě probíhá",
  outcome: "K dokončení",
  final: "Uzavřeno",
  archived: "Archiv",
};

function relativeDate(value: number) {
  const diff = Date.now() - value;
  if (diff < 60_000) return "právě teď";
  if (diff < 3_600_000) return `před ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `před ${Math.floor(diff / 3_600_000)} h`;
  return new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "short", year: new Date(value).getFullYear() !== new Date().getFullYear() ? "numeric" : undefined }).format(value);
}

function meetingDate(value?: number) {
  return value ? new Intl.DateTimeFormat("cs-CZ", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(value) : null;
}

export default function DocumentLibrary({ troopId, documents, meetingsOnly, onCreate }: {
  troopId: Id<"troops">;
  documents: DocumentItem[] | undefined;
  meetingsOnly: boolean;
  onCreate: (kind: DocumentCreateKind) => void;
}) {
  const router = useRouter();
  const transitionLifecycle = useMutation(api.documents.transitionLifecycle);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("active");
  const [sort, setSort] = useState<Sort>(meetingsOnly ? "meeting" : "updated");

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("cs");
    return [...(documents ?? [])]
      .filter((document) => !meetingsOnly || document.kind === "schuzka")
      .filter((document) => scope === "all" || (scope === "active" ? !["final", "archived"].includes(document.lifecycle) : document.lifecycle === scope))
      .filter((document) => !normalized || `${document.title} ${document.description ?? ""} ${document.tags.join(" ")}`.toLocaleLowerCase("cs").includes(normalized))
      .sort((a, b) => sort === "title" ? a.title.localeCompare(b.title, "cs") : sort === "meeting" ? (a.setup?.scheduledStartAt ?? Number.MAX_SAFE_INTEGER) - (b.setup?.scheduledStartAt ?? Number.MAX_SAFE_INTEGER) : b.updatedAt - a.updatedAt);
  }, [documents, meetingsOnly, query, scope, sort]);

  const counts = useMemo(() => ({
    active: (documents ?? []).filter((document) => !["final", "archived"].includes(document.lifecycle) && (!meetingsOnly || document.kind === "schuzka")).length,
    final: (documents ?? []).filter((document) => document.lifecycle === "final" && (!meetingsOnly || document.kind === "schuzka")).length,
    archived: (documents ?? []).filter((document) => document.lifecycle === "archived" && (!meetingsOnly || document.kind === "schuzka")).length,
  }), [documents, meetingsOnly]);

  return <section className={styles.library} aria-labelledby="document-library-title">
    <div className={styles.libraryHeading}>
      <div><span>{meetingsOnly ? "RADIT SE" : "PRACOVNÍ PROSTOR"}</span><h2 id="document-library-title">{meetingsOnly ? "Schůzky a porady" : "Vše na jednom místě"}</h2><p>{meetingsOnly ? "Připravte program, veďte schůzku a uzavřete výstupy." : "Poznámky, schůzky, rozhodnutí a dokumentace Oddílu."}</p></div>
      <button className={styles.primaryCreate} type="button" onClick={() => onCreate(meetingsOnly ? "schuzka" : "document")}><span>Nový {meetingsOnly ? "termín" : "dokument"}</span><ArrowRight size={17} /></button>
    </div>

    <div className={styles.libraryControls}>
      <label className={styles.librarySearch}><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Hledat v Dokumentech…" /></label>
      <div className={styles.scopeTabs} role="group" aria-label="Stav dokumentů">
        <button type="button" data-active={scope === "active"} onClick={() => setScope("active")}>Rozpracované <span>{counts.active}</span></button>
        <button type="button" data-active={scope === "final"} onClick={() => setScope("final")}>Uzavřené <span>{counts.final}</span></button>
        <button type="button" data-active={scope === "archived"} onClick={() => setScope("archived")}>Archiv <span>{counts.archived}</span></button>
        <button type="button" data-active={scope === "all"} onClick={() => setScope("all")}>Vše</button>
      </div>
      <label className={styles.sortControl}><SlidersHorizontal size={15} /><span className={styles.srOnly}>Řazení</span><select value={sort} onChange={(event) => setSort(event.target.value as Sort)}><option value="updated">Naposledy upravené</option><option value="title">Podle názvu</option><option value="meeting">Podle termínu</option></select></label>
    </div>

    {documents === undefined ? <DocumentSkeleton /> : visible.length === 0 ? <div className={styles.libraryEmpty}>
      <BookOpenText size={24} /><strong>{query ? "Nic tomu neodpovídá" : scope === "active" ? "Čistý stůl" : "Tahle část je prázdná"}</strong><p>{query ? "Zkuste kratší název nebo jiný štítek." : "Vytvořte první pracovní prostor a začněte psát."}</p><button type="button" onClick={() => onCreate(meetingsOnly ? "schuzka" : "document")}>Vytvořit dokument</button>
    </div> : <div className={styles.documentGrid} aria-live="polite">{visible.map((document) => {
      const Icon = document.kind === "schuzka" ? CalendarDays : document.kind === "decision" ? CheckCircle2 : document.kind === "trip_document" ? FileClock : BookOpenText;
      const scheduled = meetingDate(document.setup?.scheduledStartAt);
      return <article className={styles.documentCard} key={document._id} data-lifecycle={document.lifecycle}>
        <button type="button" className={styles.cardMain} onClick={() => router.push(`/troop/${troopId}/documents/${document._id}`)}>
          <span className={styles.cardTop}><span className={styles.cardKind}><Icon size={15} /> {kindLabel[document.kind]}</span><span className={styles.cardLifecycle}>{lifecycleLabel[document.lifecycle]}</span></span>
          <strong className={styles.cardTitle}>{document.title}</strong>
          <p>{document.description || (scheduled ? `${scheduled}${document.setup?.location ? ` · ${document.setup.location}` : ""}` : "Bez doplňujícího popisu")}</p>
          <span className={styles.cardMeta}><span><Clock3 size={13} /> {relativeDate(document.updatedAt)}</span><span>{document.pageCount} {document.pageCount === 1 ? "stránka" : "stránek"}</span></span>
        </button>
        <div className={styles.cardFooter}>
          <div>{document.tags.slice(0, 3).map((tag) => <span key={tag}>#{tag}</span>)}</div>
          {document.kind === "schuzka" && !["final", "archived"].includes(document.lifecycle) && <button type="button" onClick={() => transitionLifecycle({ documentId: document._id, lifecycle: document.lifecycle === "plan" ? "in_session" : document.lifecycle === "in_session" ? "outcome" : "final" })}>{document.lifecycle === "plan" ? "Spustit" : document.lifecycle === "in_session" ? "Výstupy" : "Uzavřít"}</button>}
        </div>
      </article>;
    })}</div>}
  </section>;
}

function DocumentSkeleton() {
  return <div className={styles.documentGrid} aria-label="Načítám dokumenty">{Array.from({ length: 6 }, (_, index) => <div className={styles.documentSkeleton} key={index}><span /><strong /><i /><i /></div>)}</div>;
}
