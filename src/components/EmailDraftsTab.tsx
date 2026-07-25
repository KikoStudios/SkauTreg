"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { CheckCircle2, ChevronRight, Clock3, MessageSquareText, Pencil, Plus, Send, Trash2, UserRound, X } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useFeedback } from "../context/FeedbackContext";
import styles from "./EmailDraftsTab.module.css";

type EmailView = "drafts" | "sent" | "responses";

interface EmailDraftsTabProps {
    tripId: Id<"trips">;
    isLeader: boolean;
    view?: EmailView;
}

const parseResponses = (value: unknown): Record<string, unknown> => {
    let parsed = value;
    for (let attempt = 0; attempt < 3 && typeof parsed === "string"; attempt += 1) {
        try { parsed = JSON.parse(parsed); } catch { return {}; }
    }
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
};

const previewText = (value: string) => value
    .replaceAll("<user.name>", "Jana Nováková")
    .replaceAll("<user.sign.link>", "odkaz na přihlášku");

export default function EmailDraftsTab({ tripId, isLeader, view = "drafts" }: EmailDraftsTabProps) {
    const { showError, showSuccess } = useFeedback();
    const drafts = useQuery(api.emailDrafts.listByTrip, { tripId });
    const recipients = useQuery(api.emailDrafts.getRecipients, { tripId });
    const createDraft = useMutation(api.emailDrafts.create);
    const updateDraft = useMutation(api.emailDrafts.update);
    const removeDraft = useMutation(api.emailDrafts.remove);
    const sendFromDraft = useAction(api.mailer.sendFromDraft);

    const [composerOpen, setComposerOpen] = useState(false);
    const [editingDraft, setEditingDraft] = useState<any | null>(null);
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [sendingDraftId, setSendingDraftId] = useState<Id<"email_drafts"> | null>(null);
    const [selectedMembers, setSelectedMembers] = useState<Set<Id<"members">>>(new Set());
    const [isSending, setIsSending] = useState(false);

    const allRecipients = Array.isArray(recipients?.recipients) ? recipients.recipients : [];
    const selectableRecipients = allRecipients.filter((recipient): recipient is typeof recipient & { memberId: Id<"members"> } => Boolean(recipient.memberId));
    const draftItems = (drafts || []).filter(item => item.status !== "sent");
    const sentItems = (drafts || []).filter(item => item.status === "sent").sort((a, b) => (b.sentAt || "").localeCompare(a.sentAt || ""));
    const sendingDraft = drafts?.find(item => item._id === sendingDraftId);

    const closeComposer = () => {
        setComposerOpen(false);
        setEditingDraft(null);
        setSubject("");
        setBody("");
    };

    const openEditor = (draft?: any) => {
        setEditingDraft(draft || null);
        setSubject(draft?.subject || "");
        setBody(draft?.body || "");
        setComposerOpen(true);
    };

    const insertPersonalization = (token: "<user.name>" | "<user.sign.link>") => {
        setBody(current => `${current}${current && !current.endsWith("\n") ? " " : ""}${token}`);
    };

    const saveDraft = async () => {
        if (!subject.trim() || !body.trim()) {
            showError({ title: "Doplňte zprávu", message: "Předmět i text e-mailu jsou povinné.", icon: "warning" });
            return;
        }
        setIsSaving(true);
        try {
            if (editingDraft) await updateDraft({ id: editingDraft._id, subject: subject.trim(), body: body.trim() });
            else await createDraft({ tripId, subject: subject.trim(), body: body.trim() });
            closeComposer();
            showSuccess({ title: "Koncept uložen", message: "Zpráva je připravená k pozdějšímu odeslání.", duration: 2200 });
        } catch (error: any) {
            showError({ title: "Koncept se nepodařilo uložit", message: error?.message || "Zkuste to prosím znovu.", icon: "error", canReport: true });
        } finally { setIsSaving(false); }
    };

    const deleteDraft = (draftId: Id<"email_drafts">) => showError({
        title: "Smazat koncept?",
        message: "Tuto zprávu už nebude možné obnovit.",
        icon: "warning",
        buttons: [
            { label: "Smazat", variant: "danger", onClick: async () => { await removeDraft({ id: draftId }); } },
            { label: "Ponechat", variant: "secondary", onClick: () => {} },
        ],
    });

    const openSend = (draft: any) => {
        setSendingDraftId(draft._id);
        setSelectedMembers(new Set(selectableRecipients.map(recipient => recipient.memberId)));
    };

    const sendDraft = async () => {
        if (!sendingDraftId || selectedMembers.size === 0) return;
        setIsSending(true);
        try {
            const result = await sendFromDraft({ draftId: sendingDraftId, baseUrl: window.location.origin, memberIds: Array.from(selectedMembers) });
            setSendingDraftId(null);
            showSuccess({ title: "Zpráva odeslána", message: `Úspěšně doručeno ${result.sentCount} příjemcům.`, duration: 3000 });
        } catch (error: any) {
            showError({ title: "Odeslání se nepodařilo", message: error?.message || "Zkontrolujte připojení e-mailu.", icon: "error", canReport: true });
        } finally { setIsSending(false); }
    };

    return (
        <div className={styles.workspace}>
            {view === "drafts" && (
                <>
                    <div className={styles.compactToolbar}>
                        <div><strong>Rozepsané zprávy</strong><span>{draftItems.length} konceptů · {recipients?.withEmail || 0} dostupných příjemců</span></div>
                        <img className={styles.mailArtwork} src="/illustrations/ill-trip-email.png" alt="" aria-hidden="true" />
                        {!composerOpen && <button className={styles.primaryButton} onClick={() => openEditor()}><Plus size={16} /> Nová zpráva</button>}
                    </div>

                    {composerOpen && (
                        <section className={styles.composer}>
                            <div className={styles.composerEditor}>
                                <div className={styles.sectionTitle}><div><span>{editingDraft ? "Upravit koncept" : "Nová zpráva"}</span><strong>Zpráva pro účastníky a rodiče</strong></div><button aria-label="Zavřít editor" onClick={closeComposer}><X size={18} /></button></div>
                                <label><span>Předmět</span><input value={subject} onChange={event => setSubject(event.target.value)} placeholder="Např. Informace před odjezdem" /></label>
                                <label><span>Text zprávy</span><textarea value={body} onChange={event => setBody(event.target.value)} placeholder="Napište stručně vše, co mají rodiny vědět…" /></label>
                                <div className={styles.personalization}>
                                    <span>Vložit automaticky:</span>
                                    <button onClick={() => insertPersonalization("<user.name>")}><UserRound size={14} /> Jméno příjemce</button>
                                    <button onClick={() => insertPersonalization("<user.sign.link>")}><ChevronRight size={14} /> Odkaz na přihlášku</button>
                                </div>
                                <div className={styles.composerActions}><button className={styles.secondaryButton} onClick={closeComposer}>Zrušit</button><button className={styles.primaryButton} disabled={isSaving} onClick={saveDraft}>{isSaving ? "Ukládám…" : "Uložit koncept"}</button></div>
                            </div>
                            <aside className={styles.preview}><span>Náhled pro příjemce</span><strong>{previewText(subject) || "Předmět zprávy"}</strong><div>{previewText(body) || "Zde se zobrazí náhled zprávy. Automatické údaje uvidíte tak, jak je obdrží rodič nebo účastník."}</div></aside>
                        </section>
                    )}

                    <div className={styles.messageList}>
                        {draftItems.length === 0 && !composerOpen ? <Empty illustration="/illustrations/ill-no-email-drafts.png" title="Žádné rozepsané zprávy" text="Připravte první informační e-mail pro rodiče a účastníky." /> : draftItems.map(draft => <MessageRow key={draft._id} draft={draft} onEdit={() => openEditor(draft)} onSend={() => openSend(draft)} onDelete={() => deleteDraft(draft._id)} />)}
                    </div>
                </>
            )}

            {view === "sent" && (
                <div className={styles.messageList}>
                    <div className={styles.compactToolbar}><div><strong>Odeslané zprávy</strong><span>Historie komunikace k této výpravě</span></div><span className={styles.counter}>{sentItems.length}</span></div>
                    {sentItems.length === 0 ? <Empty illustration="/illustrations/ill-no-email-drafts.png" title="Zatím nic neodešlo" text="Po odeslání konceptu zde najdete čas, odesílatele a počet příjemců." /> : sentItems.map(draft => <article className={styles.sentRow} key={draft._id}><span className={styles.sentIcon}><CheckCircle2 size={17} /></span><div><strong>{draft.subject}</strong><small>{draft.sender?.name || "Vedoucí"} · {draft.sentAt ? new Date(draft.sentAt).toLocaleString("cs-CZ") : "Odesláno"}</small></div><span>{draft.recipientCount || 0} příjemců</span><button onClick={() => openSend(draft)}>Odeslat znovu</button></article>)}
                </div>
            )}

            {view === "responses" && (
                <section className={styles.responses}>
                    <div className={styles.compactToolbar}><div><strong>Odezva rodin</strong><span>Reakce na přihlášku a kontakty, kterým zprávy chodí</span></div><span className={styles.counter}>{allRecipients.length}</span></div>
                    {allRecipients.length === 0 ? <Empty illustration="/illustrations/ill-no-responses.png" title="Zatím bez odpovědí" text="Jakmile rodiny odpoví na přihlášku, jejich reakce a kontakty se zobrazí zde." /> : <div className={styles.responseGrid}>{allRecipients.map(recipient => {
                        const answers = parseResponses(recipient.responses);
                        const answerEntries = Object.entries(answers);
                        return <article key={String(recipient.memberId)}><div className={styles.responseHead}><span className={styles.avatar}>{recipient.name?.slice(0, 1) || "?"}</span><div><strong>{recipient.name}</strong><small>{recipient.participationStatus === "attending" ? "Účast potvrzena" : recipient.participationStatus === "not_attending" ? "Omluven/a" : "Čeká na reakci"}</small></div></div><div className={styles.contactChips}>{(recipient.contacts || []).map((contact: any) => <span key={contact.email}><b>{contact.role === "guardian" ? "Rodič" : "Člen"}</b>{contact.name} · {contact.email}</span>)}</div>{answerEntries.length > 0 && <div className={styles.replyPreview}><MessageSquareText size={15} /><span><strong>Odpovědi v přihlášce</strong>{answerEntries.slice(0, 2).map(([question, answer]) => <small key={question}>{question}: {String(answer)}</small>)}</span></div>}</article>;
                    })}</div>}
                </section>
            )}

            {sendingDraft && (
                <div className={styles.modalBackdrop} onClick={() => setSendingDraftId(null)}>
                    <section className={styles.sendDialog} onClick={event => event.stopPropagation()}>
                        <header><div><span>Odeslat zprávu</span><h3>{sendingDraft.subject}</h3></div><button onClick={() => setSendingDraftId(null)}><X size={19} /></button></header>
                        <div className={styles.sendBody}>
                            <div className={styles.sendPreview}><span>Náhled</span><strong>{previewText(sendingDraft.subject)}</strong><p>{previewText(sendingDraft.body)}</p></div>
                            <div className={styles.recipientPicker}><div><strong>Příjemci</strong><button onClick={() => setSelectedMembers(new Set(selectedMembers.size === selectableRecipients.length ? [] : selectableRecipients.map(item => item.memberId)))}>{selectedMembers.size === selectableRecipients.length ? "Zrušit výběr" : "Vybrat všechny"}</button></div>{selectableRecipients.map(recipient => <label key={String(recipient.memberId)}><input type="checkbox" checked={selectedMembers.has(recipient.memberId)} onChange={() => setSelectedMembers(current => { const next = new Set(current); if (next.has(recipient.memberId)) next.delete(recipient.memberId); else next.add(recipient.memberId); return next; })} /><span><strong>{recipient.name}</strong><small>{recipient.contacts?.length || recipient.emails?.length || 1} e-mailových adres</small></span></label>)}</div>
                        </div>
                        <footer><span>{selectedMembers.size} členů vybráno</span><button className={styles.primaryButton} disabled={!isLeader || isSending || selectedMembers.size === 0} onClick={sendDraft}><Send size={16} /> {isSending ? "Odesílám…" : "Odeslat"}</button></footer>
                    </section>
                </div>
            )}
        </div>
    );
}

function MessageRow({ draft, onEdit, onSend, onDelete }: { draft: any; onEdit: () => void; onSend: () => void; onDelete: () => void }) {
    return <article className={styles.messageRow}><div><span className={styles.draftIcon}><Clock3 size={16} /></span><div><strong>{draft.subject}</strong><small>Upraveno {draft.updatedAt ? new Date(draft.updatedAt).toLocaleString("cs-CZ") : "nedávno"}</small></div></div><p>{previewText(draft.body)}</p><div className={styles.rowActions}><button onClick={onEdit}><Pencil size={15} /> Upravit</button><button className={styles.sendButton} onClick={onSend}><Send size={15} /> Odeslat</button><button aria-label="Smazat koncept" onClick={onDelete}><Trash2 size={15} /></button></div></article>;
}

function Empty({ illustration, title, text }: { illustration: string; title: string; text: string }) {
    return <div className={styles.empty}><img src={illustration} alt="" aria-hidden="true" /><div><strong>{title}</strong><span>{text}</span></div></div>;
}
