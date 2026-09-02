"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpenText, CalendarDays, CheckSquare2, Gamepad2, Search, Sparkles } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../ui/Button";
import { Field, FieldGrid, FieldLabel, SelectInput, TextInput } from "../ui/Form";
import { ModalBody, ModalCloseButton, ModalFooter, ModalHeader, ModalShell, ModalTitle } from "../ui/Modal";
import DocumentCreateDialog, { type DocumentCreateKind } from "./DocumentCreateDialog";
import DocumentLibrary from "./DocumentLibrary";
import styles from "./DocumentsWorkspace.module.css";

type View = "documents" | "meetings" | "tasks" | "games" | "index";
const tabs: Array<{ id: View; label: string; icon: typeof BookOpenText }> = [
  { id: "documents", label: "Dokumenty", icon: BookOpenText },
  { id: "meetings", label: "Schůzky", icon: CalendarDays },
  { id: "tasks", label: "Úkolníček", icon: CheckSquare2 },
  { id: "games", label: "Hry", icon: Gamepad2 },
  { id: "index", label: "Index", icon: Sparkles },
];

function formatDate(value?: number) {
  return value ? new Intl.DateTimeFormat("cs-CZ", { dateStyle: "medium", timeStyle: "short" }).format(value) : "Bez termínu";
}

export default function DocumentsWorkspace({ troopId }: { troopId: Id<"troops"> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedView = searchParams.get("view") as View | null;
  const view = tabs.some((tab) => tab.id === requestedView) ? requestedView! : "documents";
  const documents = useQuery(api.documents.list, { troopId });
  const ensureLegacy = useMutation(api.documents.ensureLegacyDocuments);
  const [createOpen, setCreateOpen] = useState(false);
  const [createKind, setCreateKind] = useState<DocumentCreateKind>("document");

  useEffect(() => {
    ensureLegacy({ troopId }).catch(() => {
      // Read-only troop roles can still use already migrated Dokumenty.
    });
  }, [ensureLegacy, troopId]);

  useEffect(() => {
    if (searchParams.get("create") === "true") setCreateOpen(true);
  }, [searchParams]);

  const setView = (next: View) => router.replace(`/troop/${troopId}/documents?view=${next}`, { scroll: false });
  const openCreate = (kind: DocumentCreateKind) => { setCreateKind(kind); setCreateOpen(true); };

  return (
    <div className={styles.workspace} data-slot="documents-workspace" data-view={view}>
      <div className={styles.workspaceNav}>
        <nav className={styles.tabs} aria-label="Sekce Dokumentů">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
            <button key={tab.id} type="button" className={styles.tab} data-state={view === tab.id ? "active" : "inactive"} onClick={() => setView(tab.id)}>
              <Icon size={16} /><span>{tab.label}</span>
            </button>
          );})}
        </nav>
      </div>

      {(view === "documents" || view === "meetings") && <DocumentLibrary troopId={troopId} documents={documents} meetingsOnly={view === "meetings"} onCreate={openCreate} />}

      {view === "tasks" && <TaskOverview troopId={troopId} documents={documents ?? []} />}
      {view === "games" && <GamesView troopId={troopId} />}
      {view === "index" && <IndexView troopId={troopId} />}

      <DocumentCreateDialog troopId={troopId} open={createOpen} initialKind={createKind} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function TaskOverview({ troopId, documents }: { troopId: Id<"troops">; documents: Array<{ _id: Id<"documents">; title: string; firstPageId?: Id<"meeting_pages"> }> }) {
  const [openOnly, setOpenOnly] = useState(true);
  const [priority, setPriority] = useState<"all" | "low" | "normal" | "high" | "critical">("all");
  const [status, setStatus] = useState<"all" | "todo" | "in_progress" | "blocked" | "done" | "cancelled">("all");
  const [sourceDocumentId, setSourceDocumentId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [tag, setTag] = useState("");
  const [dueWindow, setDueWindow] = useState<"all" | "overdue" | "week" | "month">("all");
  const [sortBy, setSortBy] = useState<"due" | "priority" | "created">("due");
  const [now] = useState(() => Date.now());
  const dueTo = dueWindow === "overdue" ? now : dueWindow === "week" ? now + 7 * 86_400_000 : dueWindow === "month" ? now + 31 * 86_400_000 : undefined;
  const tasks = useQuery(api.documentTasks.list, {
    troopId,
    openOnly: status === "all" ? openOnly : false,
    ...(priority === "all" ? {} : { priority }),
    ...(status === "all" ? {} : { status }),
    ...(sourceDocumentId ? { documentId: sourceDocumentId as Id<"documents"> } : {}),
    ...(assigneeId ? { assigneeId: assigneeId as Id<"users"> } : {}),
    ...(tag.trim() ? { tag: tag.trim() } : {}),
    ...(dueWindow === "all" ? {} : { dueTo, ...(dueWindow === "overdue" ? {} : { dueFrom: now }) }),
    sortBy,
  });
  const leaders = useQuery(api.troops.getLeaders, { troopId });
  const updateTask = useMutation(api.documentTasks.update);
  const createTask = useMutation(api.documentTasks.create);
  const [newTitle, setNewTitle] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [newDue, setNewDue] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newPriority, setNewPriority] = useState<"low" | "normal" | "high" | "critical">("normal");
  const selected = documents.find((document) => document._id === documentId);

  const addTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newTitle.trim() || !selected?.firstPageId) return;
    await createTask({
      documentId: selected._id,
      sourcePageId: selected.firstPageId,
      sourceBlockId: "document-root",
      taskKey: crypto.randomUUID(),
      title: newTitle.trim(),
      sourceExcerpt: "Ručně přidáno v Úkolníčku",
      priority: newPriority,
      dueAt: newDue ? new Date(newDue).getTime() : undefined,
      assigneeIds: newAssignee ? [newAssignee as Id<"users">] : [],
    });
    setNewTitle("");
  };

  return <section className={styles.panel} aria-labelledby="tasks-title">
    <div className={styles.panelHeading}><div><CheckSquare2 size={20} /><h2 id="tasks-title">Úkolníček</h2></div><label className={styles.toggle}><input type="checkbox" checked={openOnly} onChange={(event) => setOpenOnly(event.target.checked)} /> Jen otevřené</label></div>
    <div className={styles.filters}>
      <SelectInput aria-label="Stav" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">Všechny stavy</option><option value="todo">K řešení</option><option value="in_progress">Probíhá</option><option value="blocked">Blokováno</option><option value="done">Hotovo</option><option value="cancelled">Zrušeno</option></SelectInput>
      <SelectInput aria-label="Priorita" value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)}><option value="all">Všechny priority</option><option value="critical">Kritická</option><option value="high">Vysoká</option><option value="normal">Normální</option><option value="low">Nízká</option></SelectInput>
      <SelectInput aria-label="Dokument" value={sourceDocumentId} onChange={(event) => setSourceDocumentId(event.target.value)}><option value="">Všechny Dokumenty</option>{documents.map((document) => <option value={document._id} key={document._id}>{document.title}</option>)}</SelectInput>
      <SelectInput aria-label="Řešitel" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}><option value="">Všichni řešitelé</option>{leaders?.map((leader) => <option value={leader._id} key={leader._id}>{leader.name || leader.email || "Vedoucí"}</option>)}</SelectInput>
      <SelectInput aria-label="Termín" value={dueWindow} onChange={(event) => setDueWindow(event.target.value as typeof dueWindow)}><option value="all">Všechny termíny</option><option value="overdue">Po termínu</option><option value="week">Příštích 7 dní</option><option value="month">Příštích 31 dní</option></SelectInput>
      <SelectInput aria-label="Řazení" value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}><option value="due">Podle termínu</option><option value="priority">Podle priority</option><option value="created">Nejnovější</option></SelectInput>
      <TextInput aria-label="Štítek" value={tag} onChange={(event) => setTag(event.target.value)} placeholder="Štítek…" />
    </div>
    <form className={styles.quickAdd} onSubmit={addTask}>
      <SelectInput aria-label="Zdrojový dokument" value={documentId} onChange={(event) => setDocumentId(event.target.value)}><option value="">Vyberte dokument…</option>{documents.map((document) => <option key={document._id} value={document._id}>{document.title}</option>)}</SelectInput>
      <TextInput aria-label="Nový úkol" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="Přidat úkol…" />
      <TextInput aria-label="Termín úkolu" type="datetime-local" value={newDue} onChange={(event) => setNewDue(event.target.value)} />
      <SelectInput aria-label="Řešitel úkolu" value={newAssignee} onChange={(event) => setNewAssignee(event.target.value)}><option value="">Bez řešitele</option>{leaders?.map((leader) => <option value={leader._id} key={leader._id}>{leader.name || leader.email || "Vedoucí"}</option>)}</SelectInput>
      <SelectInput aria-label="Priorita úkolu" value={newPriority} onChange={(event) => setNewPriority(event.target.value as typeof newPriority)}><option value="normal">Normální</option><option value="high">Vysoká</option><option value="critical">Kritická</option><option value="low">Nízká</option></SelectInput>
      <Button type="submit" size="sm" disabled={!newTitle.trim() || !selected?.firstPageId}>Přidat</Button>
    </form>
    {tasks === undefined ? <div className={styles.loading}>Načítám úkoly…</div> : tasks.length === 0 ? <div className={styles.emptyCompact}>Nic tu nevisí. To je vzácný okamžik.</div> : <div className={styles.taskList}>{tasks.map((task) => <article key={task._id} className={styles.taskRow} data-complete={!task.isOpen}><input aria-label={`Dokončit ${task.title}`} type="checkbox" checked={!task.isOpen} onChange={(event) => updateTask({ taskId: task._id, status: event.target.checked ? "done" : "todo" })} /><button type="button" className={styles.taskSource} onClick={() => routerPush(task.sourceHref)}><strong>{task.title}</strong><small>{task.aiSummary || `${task.sourceDocumentTitle} · ${formatDate(task.dueAt)}`}</small></button><span className={styles.priority} data-priority={task.priority}>{task.priority === "critical" ? "!!" : task.priority === "high" ? "!" : ""}</span></article>)}</div>}
  </section>;
}

function routerPush(href: string) { window.location.assign(href); }

function GamesView({ troopId }: { troopId: Id<"troops"> }) {
  const [search, setSearch] = useState("");
  const games = useQuery(api.games.list, { troopId, search: search || undefined });
  const createGame = useMutation(api.games.create);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(30);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); await createGame({ troopId, name, description, instructions: description, durationMinutes: duration, physicalIntensity: "medium", environments: [], equipment: [], tags: [] }); setOpen(false); setName(""); setDescription(""); };
  return <section className={styles.panel} aria-labelledby="games-title"><div className={styles.panelHeading}><div><Gamepad2 size={20} /><h2 id="games-title">Hry</h2></div><Button size="sm" type="button" onClick={() => setOpen(true)}>Nová hra</Button></div><label className={styles.searchBox}><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Hledat hru, vybavení, prostředí…" /></label>{games === undefined ? <div className={styles.loading}>Hledám…</div> : games.length === 0 ? <div className={styles.emptyCompact}>Žádná hra neodpovídá hledání.</div> : <div className={styles.gameList}>{games.map((game) => <article className={styles.gameRow} key={game._id}><div><strong>{game.name}</strong><p>{game.description}</p></div><span>{game.durationMinutes} min</span></article>)}</div>}{open && <ModalShell role="dialog" aria-modal="true" aria-labelledby="new-game-title" onClose={() => setOpen(false)} width="min(94vw, 520px)"><form onSubmit={submit}><ModalHeader><ModalTitle id="new-game-title">Nová hra</ModalTitle><ModalCloseButton onClick={() => setOpen(false)} /></ModalHeader><ModalBody><FieldGrid><Field><FieldLabel>Název</FieldLabel><TextInput autoFocus value={name} onChange={(event) => setName(event.target.value)} /></Field><Field><FieldLabel>Popis a pravidla</FieldLabel><TextInput value={description} onChange={(event) => setDescription(event.target.value)} /></Field><Field><FieldLabel>Délka v minutách</FieldLabel><TextInput type="number" min={1} value={duration} onChange={(event) => setDuration(Number(event.target.value))} /></Field></FieldGrid></ModalBody><ModalFooter><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Zrušit</Button><Button type="submit" disabled={!name.trim()}>Uložit</Button></ModalFooter></form></ModalShell>}</section>;
}

function IndexView({ troopId }: { troopId: Id<"troops"> }) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const results = useQuery(api.documentIndex.search, submitted ? { troopId, search: submitted } : "skip");
  return <section className={styles.indexPanel} aria-labelledby="index-title"><Sparkles size={22} /><h2 id="index-title">Index</h2><p>Hledejte napříč Dokumenty a Hrami. Výsledky vždy odkazují zpět na zdroj a AI průběžně doplňuje souvislosti.</p><form className={styles.indexSearch} onSubmit={(event) => { event.preventDefault(); setSubmitted(query.trim()); }}><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Co jsme rozhodli o letním táboře?" /><Button type="submit" disabled={!query.trim()}>Hledat</Button></form>{submitted && results === undefined ? <div className={styles.loading}>Prohledávám Index…</div> : results?.length === 0 ? <div className={styles.emptyCompact}>Nic jsme nenašli.</div> : <div className={styles.resultList}>{results?.map((result) => <a href={result.href} key={`${result.type}:${result.id}`}><small>{result.type}</small><strong>{result.title}</strong><span>{result.excerpt}</span></a>)}</div>}</section>;
}
