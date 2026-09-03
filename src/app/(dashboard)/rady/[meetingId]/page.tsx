"use client";

import { use, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Menu, PanelRight, Plus } from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import CollaborativeEditor from "../../../../components/editor/CollaborativeEditor";
import ImageAnnotator from "../../../../components/annotation/ImageAnnotator";
import MeetingSidebar from "../../../../components/meeting/MeetingSidebar";
import NotesPanel from "../../../../components/meeting/NotesPanel";
import { Button } from "../../../../components/ui/Button";
import { ModalBody, ModalCloseButton, ModalFooter, ModalHeader, ModalShell, ModalTitle } from "../../../../components/ui/Modal";
import editorStyles from "../../../../components/editor/Editor.module.css";
import styles from "./MeetingRoom.module.css";
import "tippy.js/dist/tippy.css";

const lifecycleLabel = { plan: "Plan", in_session: "Probíhá", outcome: "Výstup", final: "Uzavřeno", archived: "Archiv" } as const;

export default function MeetingRoomPage({ params }: { params: Promise<{ meetingId: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { meetingId: meetingIdParam } = use(params);
  const isValidId = /^[a-z0-9_]+$/i.test(meetingIdParam);
  const meetingId = isValidId ? meetingIdParam as Id<"meetings"> : null;

  const meeting = useQuery(api.meetings.get, meetingId ? { meetingId } : "skip");
  const document = useQuery(api.documents.getByMeeting, meetingId ? { meetingId } : "skip");
  const pages = useQuery(api.pages.getByMeeting, meetingId ? { meetingId } : "skip");
  const trips = useQuery(api.trips.list, meeting?.troopId ? { troopId: meeting.troopId } : "skip");
  const createPage = useMutation(api.pages.create);
  const heartbeat = useMutation(api.presence.heartbeat);
  const joinMeeting = useMutation(api.meetings.join);
  const leaveMeeting = useMutation(api.presence.leave);
  const transitionLifecycle = useMutation(api.documents.transitionLifecycle);
  const updateMeeting = useMutation(api.meetings.update);
  const updatePageTitle = useMutation(api.pages.updateTitle);

  const [activePageId, setActivePageId] = useState<Id<"meeting_pages"> | null>(null);
  const [titleDraft, setTitleDraft] = useState<{ pageId: Id<"meeting_pages">; value: string } | null>(null);
  const [mobileOutlineOpen, setMobileOutlineOpen] = useState(false);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const [showTripSelect, setShowTripSelect] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ fileId: Id<"meeting_files">; url: string } | null>(null);

  const requestedPageId = searchParams.get("page") as Id<"meeting_pages"> | null;
  const requestedPage = requestedPageId && pages?.some((page) => page._id === requestedPageId) ? requestedPageId : null;
  const effectivePageId = activePageId ?? requestedPage ?? pages?.[0]?._id ?? null;
  const activePage = pages?.find((page) => page._id === effectivePageId);
  const pageTitle = titleDraft?.pageId === effectivePageId ? titleDraft.value : activePage?.title ?? "";

  useEffect(() => {
    if (!meetingId) return;
    void joinMeeting({ meetingId });
    const interval = window.setInterval(() => void heartbeat({ meetingId }), 15_000);
    return () => { window.clearInterval(interval); void leaveMeeting({ meetingId }); };
  }, [heartbeat, joinMeeting, leaveMeeting, meetingId]);

  useEffect(() => {
    if (!isValidId) router.replace("/home");
  }, [isValidId, router]);

  useEffect(() => {
    if (!effectivePageId || !window.location.hash) return;
    const targetId = decodeURIComponent(window.location.hash.slice(1));
    const scrollToAnchor = () => {
      const target = window.document.getElementById(targetId);
      if (!target) return false;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add(styles.sourceFlash);
      window.setTimeout(() => target.classList.remove(styles.sourceFlash), 1_800);
      return true;
    };
    if (scrollToAnchor()) return;
    const observer = new MutationObserver(() => { if (scrollToAnchor()) observer.disconnect(); });
    observer.observe(window.document.body, { childList: true, subtree: true });
    const timeout = window.setTimeout(() => observer.disconnect(), 5_000);
    return () => { observer.disconnect(); window.clearTimeout(timeout); };
  }, [effectivePageId]);

  const selectPage = (pageId: Id<"meeting_pages">) => {
    setActivePageId(pageId);
    setTitleDraft(null);
    setMobileOutlineOpen(false);
  };

  const addPage = async (title: string) => {
    if (!meetingId) return;
    const pageId = await createPage({ meetingId, title });
    setActivePageId(pageId);
  };

  const saveTitle = async () => {
    if (!effectivePageId || !pageTitle.trim()) return;
    await updatePageTitle({ pageId: effectivePageId, title: pageTitle.trim() });
    setTitleDraft(null);
  };

  const advanceLifecycle = async () => {
    if (!document || document.lifecycle === "final" || document.lifecycle === "archived") return;
    const lifecycle = document.lifecycle === "plan" ? "in_session" : document.lifecycle === "in_session" ? "outcome" : "final";
    await transitionLifecycle({ documentId: document._id, lifecycle });
  };

  if (!isValidId || !meetingId || meeting === undefined || pages === undefined) {
    return <div className={styles.loadingScreen}><span className={styles.loadingLine} /><p>Otevírám dokument…</p></div>;
  }

  if (meeting === null) {
    return <div className={styles.loadingScreen}><p>Dokument nebyl nalezen.</p><Button onClick={() => router.push("/home")}>Zpět domů</Button></div>;
  }

  const libraryHref = `/troop/${meeting.troopId}/documents`;

  return (
    <>
      <main className={styles.workspace}>
        <header className={styles.topbar}>
          <button type="button" className={styles.backButton} onClick={() => router.push(libraryHref)} aria-label="Zpět do Dokumentů"><ArrowLeft size={18} /></button>
          <button type="button" className={styles.mobilePanelButton} onClick={() => setMobileOutlineOpen(true)} aria-label="Otevřít stránky"><Menu size={18} /></button>
          <div className={styles.breadcrumb}><span>Dokumenty</span><strong>{meeting.title}</strong></div>
          <div className={styles.topbarActions}>
            <span className={styles.saveState}><Check size={13} /> Uloženo</span>
            {document && <span className={styles.lifecycle} data-state={document.lifecycle}>{lifecycleLabel[document.lifecycle]}</span>}
            {document && document.lifecycle !== "final" && document.lifecycle !== "archived" && (
              <Button size="sm" onClick={advanceLifecycle}>{document.lifecycle === "plan" ? "Spustit Schůzku" : document.lifecycle === "in_session" ? "Vytvořit výstup" : "Uzavřít"}</Button>
            )}
            <button type="button" className={styles.mobilePanelButton} onClick={() => setMobileInspectorOpen(true)} aria-label="Otevřít kontext"><PanelRight size={18} /></button>
          </div>
        </header>

        <div className={styles.workspaceGrid}>
          <div className={`${styles.outlinePane} ${mobileOutlineOpen ? styles.mobileOpen : ""}`}>
            <button type="button" className={styles.mobileScrim} onClick={() => setMobileOutlineOpen(false)} aria-label="Zavřít stránky" />
            <NotesPanel meetingId={meetingId} tripId={meeting.tripId} activePageId={effectivePageId} onPageSelect={selectPage} onAddPage={addPage} onConnectTrip={() => setShowTripSelect(true)} />
          </div>

          <section className={styles.canvas} aria-label="Editor dokumentu">
            {pages.length === 0 ? (
              <div className={styles.noPages}><FilePlaceholder /><h1>První stránka</h1><p>Vytvořte čistou stránku a začněte psát.</p><Button onClick={() => addPage("Nová stránka")}><Plus size={16} /> Vytvořit stránku</Button></div>
            ) : (
              <article id="b_document-root" className={styles.paper}>
                <input
                  className={editorStyles.titleInput}
                  value={pageTitle}
                  onChange={(event) => effectivePageId && setTitleDraft({ pageId: effectivePageId, value: event.target.value })}
                  onBlur={saveTitle}
                  onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } }}
                  placeholder="Název stránky"
                  aria-label="Název stránky"
                />
                {effectivePageId && <CollaborativeEditor key={effectivePageId} pageId={effectivePageId} documentId={document?._id} troopId={meeting.troopId} />}
              </article>
            )}
          </section>

          <div className={`${styles.inspectorPane} ${mobileInspectorOpen ? styles.mobileOpen : ""}`}>
            <button type="button" className={styles.mobileScrim} onClick={() => setMobileInspectorOpen(false)} aria-label="Zavřít kontext" />
            <MeetingSidebar meetingId={meetingId} activePageId={effectivePageId} onImageClick={(fileId, url) => setSelectedImage({ fileId, url })} />
          </div>
        </div>
      </main>

      {showTripSelect && (
        <ModalShell role="dialog" aria-modal="true" aria-labelledby="trip-select-title" onClose={() => setShowTripSelect(false)} width="min(94vw, 520px)">
          <ModalHeader><ModalTitle id="trip-select-title">Připojit k výpravě</ModalTitle><ModalCloseButton onClick={() => setShowTripSelect(false)} /></ModalHeader>
          <ModalBody>
            <p className={styles.modalIntro}>Dokument se zobrazí také v kontextu vybrané výpravy.</p>
            <div className={styles.tripList}>
              {trips?.map((trip) => <button type="button" key={trip._id} onClick={async () => { await updateMeeting({ meetingId, tripId: trip._id }); setShowTripSelect(false); }}><strong>{trip.name}</strong><span>{trip.startDate}</span></button>)}
              {trips?.length === 0 && <p className={styles.emptyText}>Nejdřív vytvořte výpravu.</p>}
            </div>
          </ModalBody>
          <ModalFooter><Button variant="ghost" onClick={() => setShowTripSelect(false)}>Zrušit</Button></ModalFooter>
        </ModalShell>
      )}

      {selectedImage && <ImageAnnotator fileId={selectedImage.fileId} imageUrl={selectedImage.url} onClose={() => setSelectedImage(null)} />}
    </>
  );
}

function FilePlaceholder() {
  return <span className={styles.filePlaceholder} aria-hidden="true"><span /></span>;
}
