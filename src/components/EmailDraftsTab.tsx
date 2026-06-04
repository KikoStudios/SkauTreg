"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useFeedback } from "../context/FeedbackContext";

interface EmailDraftsTabProps {
    tripId: Id<"trips">;
    isLeader: boolean;
}

export default function EmailDraftsTab({ tripId, isLeader }: EmailDraftsTabProps) {
    const { showError, showSuccess } = useFeedback();
    const drafts = useQuery(api.emailDrafts.listByTrip, { tripId });
    const recipients = useQuery(api.emailDrafts.getRecipients, { tripId });
    const createDraft = useMutation(api.emailDrafts.create);
    const updateDraft = useMutation(api.emailDrafts.update);
    const removeDraft = useMutation(api.emailDrafts.remove);
    const sendFromDraft = useAction(api.mailer.sendFromDraft);

    const [showNewDraft, setShowNewDraft] = useState(false);
    const [editingDraft, setEditingDraft] = useState<any | null>(null);
    const [sendingDraftId, setSendingDraftId] = useState<Id<"email_drafts"> | null>(null);
    const [sendingSelectedMembers, setSendingSelectedMembers] = useState<Set<Id<"members">>>(new Set());
    
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [sendResult, setSendResult] = useState<any | null>(null);

    const allMembers = Array.isArray(recipients?.recipients) ? recipients.recipients : [];
    const memberIds = allMembers
        .map((m) => m.memberId)
        .filter((id): id is Id<"members"> => Boolean(id));
    const selectableMembers = allMembers.filter(
        (member): member is typeof member & { memberId: Id<"members"> } => Boolean(member.memberId)
    );

    const highlightTags = (text: string) => {
        const parts = text.split(/(<[^>]+>)/g);
        return parts.map((part, idx) => {
            if (part.startsWith("<") && part.endsWith(">")) {
                return (
                    <span key={idx} style={{ 
                        backgroundColor: "#fbbf24", 
                        fontWeight: "900", 
                        padding: "2px 6px",
                        borderRadius: "4px",
                        border: "1px solid #f59e0b",
                        display: "inline-block",
                        fontSize: "0.95em"
                    }}>
                        {part}
                    </span>
                );
            }
            return <span key={idx}>{part}</span>;
        });
    };

    const handleCreateDraft = async () => {
        if (!subject.trim() || !body.trim()) {
            showError({
                title: "⚠️ Chyby ve formuláři",
                message: "Předmět i tělo e-mailu jsou povinné.",
                icon: "warning",
            });
            return;
        }

        setIsSaving(true);
        try {
            await createDraft({ tripId, subject, body });
            setSubject("");
            setBody("");
            setShowNewDraft(false);
            showSuccess({
                title: "✅ Koncept vytvořen",
                message: "Nový koncept e-mailu byl uložen.",
                duration: 2500,
            });
        } catch (error: any) {
            showError({
                title: "❌ Chyba",
                message: "Nepodařilo se vytvořit koncept.",
                icon: "error",
                details: error?.message,
                canReport: true,
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateDraft = async () => {
        if (!editingDraft) return;
        if (!subject.trim() || !body.trim()) {
            showError({
                title: "⚠️ Chyby ve formuláři",
                message: "Předmět i tělo e-mailu jsou povinné.",
                icon: "warning",
            });
            return;
        }

        setIsSaving(true);
        try {
            await updateDraft({
                id: editingDraft._id,
                subject,
                body,
            });
            setEditingDraft(null);
            setSubject("");
            setBody("");
            showSuccess({
                title: "✅ Koncept aktualizován",
                message: "Koncept e-mailu byl uložen.",
                duration: 2500,
            });
        } catch (error: any) {
            showError({
                title: "❌ Chyba",
                message: "Nepodařilo se aktualizovat koncept.",
                icon: "error",
                details: error?.message,
                canReport: true,
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteDraft = async (draftId: Id<"email_drafts">) => {
        showError({
            title: "⚠️ Potvrzení",
            message: "Opravdu smazat tento koncept?",
            icon: "warning",
            buttons: [
                {
                    label: "Smazat",
                    onClick: async () => {
                        try {
                            await removeDraft({ id: draftId });
                            showSuccess({
                                title: "✅ Smazáno",
                                message: "Koncept byl smazán.",
                                duration: 2500,
                            });
                        } catch (error: any) {
                            showError({
                                title: "❌ Chyba",
                                message: "Nepodařilo se smazat koncept.",
                                icon: "error",
                                details: error?.message,
                                canReport: true,
                            });
                        }
                    },
                    variant: "danger",
                },
                {
                    label: "Zrušit",
                    onClick: () => {},
                    variant: "secondary",
                },
            ],
        });
    };

    const handleOpenSendPopup = (draft: any) => {
        setSendingDraftId(draft._id);
        setSendingSelectedMembers(new Set(memberIds));
    };

    const handleCloseSendPopup = () => {
        setSendingDraftId(null);
        setSendingSelectedMembers(new Set());
        setSendResult(null);
    };

    const toggleMember = (memberId: Id<"members">) => {
        const newSet = new Set(sendingSelectedMembers);
        if (newSet.has(memberId)) {
            newSet.delete(memberId);
        } else {
            newSet.add(memberId);
        }
        setSendingSelectedMembers(newSet);
    };

    const handleSendDraft = async () => {
        if (!sendingDraftId) return;
        if (sendingSelectedMembers.size === 0) {
            showError({
                title: "⚠️ Chyby ve formuláři",
                message: "Vyberte alespoň jednoho příjemce.",
                icon: "warning",
            });
            return;
        }

        setIsSending(true);
        setSendResult(null);
        try {
            const result = await sendFromDraft({
                draftId: sendingDraftId,
                baseUrl: window.location.origin,
                memberIds: Array.from(sendingSelectedMembers),
            });
            setSendResult(result);
            
            // Show summary
            const successCount = result.sentCount;
            const failedCount = result.failed?.length || 0;
            const skippedCount = result.skippedCount;
            
            if (failedCount > 0) {
                showError({
                    title: "📧 Částečné selhání",
                    message: `Odesláno: ${successCount} ✅ | Selhalo: ${failedCount} ❌ | Přeskočeno: ${skippedCount} ⊘`,
                    icon: "error",
                    details: failedCount > 0 ? `Nepodařilo se odeslat: ${result.failed.map((f: any) => f.email).join(", ")}` : undefined,
                    canReport: failedCount > 0,
                });
            } else {
                showSuccess({
                    title: "✅ Odesláno",
                    message: `E-maily úspěšně odeslány (${successCount} členů).`,
                    duration: 4000,
                });
            }
        } catch (error: any) {
            showError({
                title: "❌ Chyba",
                message: error?.message || "Nepodařilo se odeslat e-mail.",
                icon: "error",
                details: error?.message,
                canReport: true,
            });
        } finally {
            setIsSending(false);
        }
    };

    const sendingDraft = drafts?.find(d => d._id === sendingDraftId);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {/* New Draft Button */}
            {!editingDraft && !showNewDraft && (
                <button
                    onClick={() => setShowNewDraft(true)}
                    style={{
                        padding: "1rem 1.5rem",
                        backgroundColor: "#86efac",
                        border: "3px solid #000",
                        borderRadius: "10px",
                        fontWeight: "900",
                        cursor: "pointer",
                        fontSize: "1rem",
                        textTransform: "uppercase",
                        boxShadow: "4px 4px 0 0 #000",
                        alignSelf: "flex-start"
                    }}
                >
                    + Nový koncept
                </button>
            )}

            {/* Create/Edit Draft Form */}
            {(showNewDraft || editingDraft) && (
                <div style={{
                    backgroundColor: "#f0fdf4",
                    border: "3px solid #000",
                    borderRadius: "14px",
                    padding: "1.75rem",
                    boxShadow: "6px 6px 0 0 #000"
                }}>
                    <h3 style={{ fontSize: "1.2rem", fontWeight: "900", marginBottom: "1.5rem", textTransform: "uppercase" }}>
                        {editingDraft ? "Upravit koncept" : "Nový koncept"}
                    </h3>

                    <div style={{ display: "grid", gap: "1rem", marginBottom: "1rem" }}>
                        <div>
                            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.5rem" }}>Předmět</label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Pozvánka na výpravu..."
                                style={{
                                    width: "100%",
                                    padding: "0.85rem",
                                    border: "3px solid #000",
                                    borderRadius: "10px",
                                    fontWeight: "700",
                                    backgroundColor: "#fff",
                                    boxShadow: "3px 3px 0 0 #000"
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.5rem" }}>Text e-mailu</label>
                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder="Ahoj &lt;user.name&gt;!\n\nPozvánku najdeš zde: &lt;user.sign.link&gt;\n\nDěkujeme!"
                                style={{
                                    width: "100%",
                                    minHeight: "200px",
                                    padding: "0.85rem",
                                    border: "3px solid #000",
                                    borderRadius: "10px",
                                    fontWeight: "600",
                                    fontFamily: "inherit",
                                    fontSize: "0.95rem",
                                    resize: "vertical",
                                    backgroundColor: "#fff",
                                    boxShadow: "3px 3px 0 0 #000",
                                    lineHeight: "1.6"
                                }}
                            />
                        </div>

                        {/* Smart Tags Info */}
                        <div style={{
                            padding: "0.75rem 1rem",
                            backgroundColor: "#dbeafe",
                            border: "2px solid #0284c7",
                            borderRadius: "8px",
                            fontSize: "0.9rem",
                            fontWeight: "600",
                            color: "#0c4a6e"
                        }}>
                            <strong>Dostupné tokeny:</strong> &lt;user.name&gt; = jméno člena, &lt;user.sign.link&gt; = odkaz na přihlášku
                        </div>
                    </div>

                    {/* Preview */}
                    {(subject || body) && (
                        <div style={{
                            padding: "1rem",
                            backgroundColor: "#fff",
                            border: "2px solid #000",
                            borderRadius: "8px",
                            marginBottom: "1rem",
                            boxShadow: "2px 2px 0 0 #000"
                        }}>
                            <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#666", marginBottom: "0.5rem" }}>NÁHLED:</div>
                            <div style={{ fontSize: "0.95rem", fontWeight: "700", marginBottom: "0.75rem" }}>
                                Předmět: {highlightTags(subject)}
                            </div>
                            <div style={{ fontSize: "0.9rem", lineHeight: "1.5", color: "#333", whiteSpace: "pre-wrap" }}>
                                {highlightTags(body)}
                            </div>
                        </div>
                    )}

                    {/* Buttons */}
                    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                        <button
                            onClick={editingDraft ? handleUpdateDraft : handleCreateDraft}
                            disabled={isSaving}
                            style={{
                                padding: "0.75rem 1.5rem",
                                backgroundColor: "#86efac",
                                border: "3px solid #000",
                                borderRadius: "8px",
                                fontWeight: "900",
                                cursor: isSaving ? "not-allowed" : "pointer",
                                boxShadow: "4px 4px 0 0 #000"
                            }}
                        >
                            {isSaving ? "Ukládám..." : (editingDraft ? "Uložit změny" : "Vytvořit koncept")}
                        </button>
                        <button
                            onClick={() => {
                                setEditingDraft(null);
                                setShowNewDraft(false);
                                setSubject("");
                                setBody("");
                            }}
                            style={{
                                padding: "0.75rem 1.5rem",
                                backgroundColor: "#fca5a5",
                                border: "3px solid #000",
                                borderRadius: "8px",
                                fontWeight: "900",
                                cursor: "pointer",
                                boxShadow: "4px 4px 0 0 #000"
                            }}
                        >
                            Zrušit
                        </button>
                    </div>
                </div>
            )}

            {/* Drafts List */}
            {drafts && drafts.length > 0 ? (
                <div style={{ display: "grid", gap: "1rem" }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "900", margin: "1rem 0 0 0", textTransform: "uppercase" }}>
                        Koncepty ({drafts.length})
                    </h3>
                    {drafts.map((draft) => (
                        <div
                            key={draft._id}
                            style={{
                                backgroundColor: draft.status === "sent" ? "#f3f4f6" : "#fef3c7",
                                border: "3px solid #000",
                                borderRadius: "12px",
                                padding: "1.5rem",
                                boxShadow: "4px 4px 0 0 #000"
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                                <div style={{ flex: "1 1 auto", minWidth: "250px" }}>
                                    <div style={{ fontSize: "1.1rem", fontWeight: "900" }}>{draft.subject}</div>
                                    <div style={{ fontSize: "0.85rem", color: "#666", fontWeight: "600", marginTop: "0.25rem" }}>
                                        Status: {draft.status === "sent" ? `✅ Odesláno (${draft.recipientCount || 0})` : "📝 Koncept"}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                    {
                                        <>
                                            <button
                                                onClick={() => {
                                                    setEditingDraft(draft);
                                                    setSubject(draft.subject);
                                                    setBody(draft.body);
                                                }}
                                                style={{
                                                    padding: "0.6rem 1rem",
                                                    backgroundColor: "#dbeafe",
                                                    border: "2px solid #000",
                                                    borderRadius: "8px",
                                                    fontWeight: "800",
                                                    cursor: "pointer",
                                                    fontSize: "0.85rem",
                                                    boxShadow: "2px 2px 0 0 #000"
                                                }}
                                            >
                                                ✏️ Upravit
                                            </button>
                                            <button
                                                onClick={() => handleOpenSendPopup(draft)}
                                                style={{
                                                    padding: "0.6rem 1rem",
                                                    backgroundColor: "#86efac",
                                                    border: "2px solid #000",
                                                    borderRadius: "8px",
                                                    fontWeight: "800",
                                                    cursor: "pointer",
                                                    fontSize: "0.85rem",
                                                    boxShadow: "2px 2px 0 0 #000"
                                                }}
                                            >
                                                📤 {draft.status === "sent" ? "Odeslat znovu" : "Odeslat"}
                                            </button>
                                        </>
                                    }
                                    <button
                                        onClick={() => handleDeleteDraft(draft._id)}
                                        style={{
                                            padding: "0.6rem 1rem",
                                            backgroundColor: "#fca5a5",
                                            border: "2px solid #000",
                                            borderRadius: "8px",
                                            fontWeight: "800",
                                            cursor: "pointer",
                                            fontSize: "0.85rem",
                                            boxShadow: "2px 2px 0 0 #000"
                                        }}
                                    >
                                        🗑️ Smazat
                                    </button>
                                </div>
                            </div>

                            {/* Draft Preview */}
                            <div style={{
                                padding: "0.75rem",
                                backgroundColor: "#fef9e7",
                                border: "2px solid #f59e0b",
                                borderRadius: "8px",
                                fontSize: "0.9rem",
                                color: "#333",
                                lineHeight: "1.5",
                                whiteSpace: "pre-wrap",
                                fontWeight: "500"
                            }}>
                                {highlightTags(draft.body)}
                            </div>
                        </div>
                    ))}
                </div>
            ) : !showNewDraft && !editingDraft ? (
                <div style={{
                    padding: "2rem",
                    textAlign: "center",
                    border: "2px dashed #ccc",
                    borderRadius: "12px",
                    color: "#999",
                    fontStyle: "italic"
                }}>
                    Žádné koncepty. Vytvořte si svůj první e-mail!
                </div>
            ) : null}

            {/* Send Modal - 2 Column Popup */}
            {sendingDraftId && sendingDraft && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0, 0, 0, 0.6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 4000,
                    padding: "1rem"
                }} onClick={handleCloseSendPopup}>
                    <div
                        style={{
                            backgroundColor: "#fff",
                            border: "4px solid #000",
                            borderRadius: "16px",
                            boxShadow: "8px 8px 0 0 #000",
                            width: "100%",
                            maxWidth: "1000px",
                            maxHeight: "85vh",
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            overflow: "hidden"
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Left Column - Email Preview */}
                        <div style={{
                            padding: "2rem",
                            borderRight: "3px solid #000",
                            overflowY: "auto",
                            backgroundColor: "#f9fafb"
                        }}>
                            <h3 style={{ fontSize: "1.1rem", fontWeight: "900", marginTop: 0 }}>Email náhled</h3>
                            <div style={{
                                padding: "1rem",
                                backgroundColor: "#fff",
                                border: "2px solid #000",
                                borderRadius: "8px",
                                boxShadow: "2px 2px 0 0 #000"
                            }}>
                                <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#666", marginBottom: "0.5rem" }}>PŘEDMĚT:</div>
                                <div style={{ fontSize: "0.95rem", fontWeight: "800", marginBottom: "1.5rem" }}>
                                    {highlightTags(sendingDraft.subject)}
                                </div>

                                <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#666", marginBottom: "0.5rem" }}>TEXT:</div>
                                <div style={{
                                    fontSize: "0.95rem",
                                    lineHeight: "1.7",
                                    color: "#2d3748",
                                    whiteSpace: "pre-wrap",
                                    padding: "1rem",
                                    backgroundColor: "#fef9e7",
                                    borderRadius: "8px",
                                    border: "1px solid #f59e0b",
                                    fontWeight: "500"
                                }}>
                                    {highlightTags(sendingDraft.body)}
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Member Selection */}
                        <div style={{
                            padding: "2rem",
                            overflowY: "auto",
                            display: "flex",
                            flexDirection: "column"
                        }}>
                            <h3 style={{ fontSize: "1.1rem", fontWeight: "900", marginTop: 0 }}>Příjemci</h3>
                            
                            <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                <button
                                    onClick={() => setSendingSelectedMembers(new Set(memberIds))}
                                    style={{
                                        padding: "0.5rem 0.75rem",
                                        backgroundColor: "#dbeafe",
                                        border: "2px solid #000",
                                        borderRadius: "6px",
                                        fontWeight: "700",
                                        fontSize: "0.8rem",
                                        cursor: "pointer",
                                        boxShadow: "2px 2px 0 0 #000"
                                    }}
                                >
                                    Vybrat všechny
                                </button>
                                <button
                                    onClick={() => setSendingSelectedMembers(new Set())}
                                    style={{
                                        padding: "0.5rem 0.75rem",
                                        backgroundColor: "#fecaca",
                                        border: "2px solid #000",
                                        borderRadius: "6px",
                                        fontWeight: "700",
                                        fontSize: "0.8rem",
                                        cursor: "pointer",
                                        boxShadow: "2px 2px 0 0 #000"
                                    }}
                                >
                                    Zrušit všechny
                                </button>
                            </div>

                            <div style={{ flex: "1 1 auto", overflowY: "auto", marginBottom: "1rem" }}>
                                {selectableMembers.length > 0 ? selectableMembers.map((member) => (
                                    <div
                                        key={member.memberId}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.75rem",
                                            padding: "0.75rem",
                                            marginBottom: "0.5rem",
                                            backgroundColor: sendingSelectedMembers.has(member.memberId) ? "#dcfce7" : "#f3f4f6",
                                            border: "2px solid " + (sendingSelectedMembers.has(member.memberId) ? "#22c55e" : "#ccc"),
                                            borderRadius: "8px",
                                            cursor: "pointer",
                                            transition: "all 0.1s"
                                        }}
                                        onClick={() => toggleMember(member.memberId)}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={sendingSelectedMembers.has(member.memberId)}
                                            onChange={() => toggleMember(member.memberId)}
                                            style={{
                                                width: "18px",
                                                height: "18px",
                                                cursor: "pointer"
                                            }}
                                        />
                                        <div>
                                            <div style={{ fontWeight: "700", fontSize: "0.95rem" }}>{member.name}</div>
                                            <div style={{ fontSize: "0.8rem", color: "#666", fontWeight: "600" }}>
                                                {Array.isArray((member as any).emails) ? (member as any).emails.join(", ") : member.email}
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div style={{
                                        padding: "1rem",
                                        textAlign: "center",
                                        color: "#999",
                                        fontSize: "0.85rem",
                                        fontWeight: "600"
                                    }}>
                                        Žádní účastníci s emailem
                                    </div>
                                )}
                            </div>

                            <div style={{
                                padding: "0.75rem",
                                backgroundColor: "#fef3c7",
                                border: "2px solid #f59e0b",
                                borderRadius: "8px",
                                fontSize: "0.85rem",
                                fontWeight: "600",
                                marginBottom: "1rem",
                                textAlign: "center"
                            }}>
                                Vybrání: {sendingSelectedMembers.size} / {selectableMembers.length}
                            </div>

                            {sendResult && (
                                <div style={{
                                    padding: "0.75rem",
                                    backgroundColor: "#dcfce7",
                                    border: "2px solid #22c55e",
                                    borderRadius: "8px",
                                    fontSize: "0.85rem",
                                    fontWeight: "600",
                                    marginBottom: "1rem",
                                    color: "#166534"
                                }}>
                                    ✅ Odesláno: {sendResult.sentCount} • Bez emailu: {sendResult.skippedCount}
                                </div>
                            )}

                            <div style={{ display: "flex", gap: "0.75rem" }}>
                                <button
                                    onClick={handleSendDraft}
                                    disabled={isSending || sendingSelectedMembers.size === 0}
                                    style={{
                                        flex: 1,
                                        padding: "0.85rem",
                                        backgroundColor: sendingSelectedMembers.size === 0 ? "#e5e7eb" : "#86efac",
                                        border: "3px solid #000",
                                        borderRadius: "8px",
                                        fontWeight: "900",
                                        cursor: sendingSelectedMembers.size === 0 ? "not-allowed" : "pointer",
                                        boxShadow: "3px 3px 0 0 #000"
                                    }}
                                >
                                    {isSending ? "Odesílám..." : "📤 Odeslat"}
                                </button>
                                <button
                                    onClick={handleCloseSendPopup}
                                    style={{
                                        padding: "0.85rem 1.25rem",
                                        backgroundColor: "#fca5a5",
                                        border: "3px solid #000",
                                        borderRadius: "8px",
                                        fontWeight: "900",
                                        cursor: "pointer",
                                        boxShadow: "3px 3px 0 0 #000"
                                    }}
                                >
                                    Zavřít
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
