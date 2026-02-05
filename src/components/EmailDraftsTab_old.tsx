"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface EmailDraftsTabProps {
    tripId: Id<"trips">;
    isLeader: boolean;
}

export default function EmailDraftsTab({ tripId, isLeader }: EmailDraftsTabProps) {
    const drafts = useQuery(api.emailDrafts.listByTrip, { tripId });
    const recipients = useQuery(api.emailDrafts.getRecipients, { tripId });
    const createDraft = useMutation(api.emailDrafts.create);
    const updateDraft = useMutation(api.emailDrafts.update);
    const removeDraft = useMutation(api.emailDrafts.remove);
    const sendFromDraft = useAction(api.mailer.sendFromDraft);

    const [showNewDraft, setShowNewDraft] = useState(false);
    const [editingDraft, setEditingDraft] = useState<any | null>(null);
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [sendResult, setSendResult] = useState<any | null>(null);

    const highlightTags = (text: string) => {
        const parts = text.split(/(<[^>]+>)/g);
        return parts.map((part, idx) => {
            if (part.startsWith("<") && part.endsWith(">")) {
                return (
                    <span key={idx} style={tagHighlightStyle}>
                        {part}
                    </span>
                );
            }
            return <span key={idx}>{part}</span>;
        });
    };

    const handleCreateDraft = async () => {
        if (!subject.trim() || !body.trim()) {
            alert("Předmět i tělo e-mailu jsou povinné.");
            return;
        }

        setIsSaving(true);
        try {
            await createDraft({ tripId, subject, body });
            setSubject("");
            setBody("");
            setShowNewDraft(false);
        } catch (error: any) {
            alert(`Chyba: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateDraft = async () => {
        if (!editingDraft) return;
        if (!subject.trim() || !body.trim()) {
            alert("Předmět i tělo e-mailu jsou povinné.");
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
        } catch (error: any) {
            alert(`Chyba: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteDraft = async (draftId: Id<"email_drafts">) => {
        if (!confirm("Opravdu smazat tento koncept?")) return;

        try {
            await removeDraft({ id: draftId });
        } catch (error: any) {
            alert(`Chyba: ${error.message}`);
        }
    };

    const handleSendDraft = async (draftId: Id<"email_drafts">) => {
        if (!isLeader) {
            alert("Pouze vedoucí může odesílat e-maily.");
            return;
        }

        if (!confirm(`Opravdu odeslat e-mail ${recipients?.withEmail || 0} příjemcům?`)) return;

        setIsSending(true);
        setSendResult(null);
        try {
            const result = await sendFromDraft({
                draftId,
                baseUrl: window.location.origin,
            });
            setSendResult(result);
        } catch (error: any) {
            alert(`Chyba při odesílání: ${error.message}`);
        } finally {
            setIsSending(false);
        }
    };

    const startEdit = (draft: any) => {
        setEditingDraft(draft);
        setSubject(draft.subject);
        setBody(draft.body);
        setShowNewDraft(false);
    };

    const cancelEdit = () => {
        setEditingDraft(null);
        setSubject("");
        setBody("");
        setShowNewDraft(false);
    };

    if (!drafts || !recipients) {
        return <div style={{ padding: "1.5rem" }}>Načítání...</div>;
    }

    const sentDrafts = drafts.filter((d: any) => d.status === "sent");
    const memberRecipients = recipients.recipients || [];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", padding: "1.5rem" }}>
            {/* Header */}
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                flexWrap: "wrap",
                background: "linear-gradient(140deg, #fef3c7 0%, #e0f2fe 100%)",
                border: "3px solid #000",
                borderRadius: "14px",
                padding: "1.25rem 1.5rem",
                boxShadow: "6px 6px 0 0 #000"
            }}>
                <div>
                    <h2 style={{ fontSize: "1.6rem", fontWeight: "900", margin: 0 }}>E-maily</h2>
                    <p style={{ fontSize: "0.95rem", fontWeight: "700", color: "#374151", marginTop: "0.35rem" }}>
                        Připravte a odešlete e-maily členům. Příjemci: {recipients.withEmail} s e‑mailem, {recipients.withoutEmail} bez e‑mailu.
                    </p>
                </div>
                {!showNewDraft && !editingDraft && (
                    <button
                        onClick={() => setShowNewDraft(true)}
                        style={primaryButtonStyle}
                    >
                        + Nový koncept
                    </button>
                )}
            </div>

            {/* Info Box */}
            <div style={infoBoxStyle}>
                <div style={{ fontWeight: "900", color: "#1e3a8a", marginBottom: "0.35rem" }}>💡 Chytré značky</div>
                <div style={{ fontSize: "0.9rem", fontWeight: "600", color: "#1e40af", marginBottom: "0.5rem" }}>
                    Použijte tyto značky pro personalizaci:
                </div>
                <div style={{ display: "grid", gap: "0.35rem" }}>
                    <div style={{ fontSize: "0.9rem", color: "#1e40af", fontWeight: "700" }}>
                        <span style={pillStyle}>&lt;user.sign.link&gt;</span> Unikátní odkaz na přihlášení
                    </div>
                    <div style={{ fontSize: "0.9rem", color: "#1e40af", fontWeight: "700" }}>
                        <span style={pillStyle}>&lt;user.name&gt;</span> Jméno člena
                    </div>
                </div>
            </div>

            {/* Mail Client - History */}
            <div style={panelStyle}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                    <div>
                        <div style={{ fontWeight: "900", fontSize: "1.1rem" }}>Mail klient (Historie)</div>
                        <div style={{ fontWeight: "700", color: "#6b7280", fontSize: "0.9rem" }}>
                            Zobrazuje odeslané e‑maily a odesílatele. Příjemci jsou pouze členové.
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <div style={pillLightStyle}>Odeslané: {sentDrafts.length}</div>
                        <div style={pillLightStyle}>Členové s e‑mailem: {memberRecipients.length}</div>
                    </div>
                </div>

                <div style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
                    {sentDrafts.length === 0 ? (
                        <div style={{ fontWeight: "700", color: "#6b7280" }}>
                            Zatím nebyl odeslán žádný e‑mail.
                        </div>
                    ) : (
                        sentDrafts.map((draft: any) => (
                            <div key={draft._id} style={historyRowStyle}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                                    <div>
                                        <div style={{ fontWeight: "900" }}>{draft.subject}</div>
                                        <div style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: "700" }}>
                                            Odeslal: {draft.sender?.name || "Neznámý"} • {draft.sender?.email || ""}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: "0.85rem", fontWeight: "800", color: "#047857" }}>
                                        {draft.sentAt ? new Date(draft.sentAt).toLocaleString("cs-CZ") : ""}
                                    </div>
                                </div>
                                <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", fontWeight: "700" }}>
                                    Příjemců: {draft.recipientCount || 0}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {memberRecipients.length > 0 && (
                    <div style={{ marginTop: "1rem" }}>
                        <div style={{ fontWeight: "800", marginBottom: "0.5rem" }}>Příjemci (členové s e‑mailem)</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                            {memberRecipients.slice(0, 12).map((r: any) => (
                                <span key={r.memberId} style={pillMemberStyle}>
                                    {r.name}
                                </span>
                            ))}
                            {memberRecipients.length > 12 && (
                                <span style={pillMemberStyle}>+{memberRecipients.length - 12} dalších</span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Send Result */}
            {sendResult && (
                <div style={{
                    padding: "1rem",
                    borderRadius: "12px",
                    border: "3px solid #000",
                    backgroundColor: sendResult.sentCount > 0 ? "#ecfdf5" : "#fef2f2",
                    boxShadow: "4px 4px 0 0 #000"
                }}>
                    <div style={{ fontWeight: "900", marginBottom: "0.35rem" }}>Výsledek odeslání</div>
                    <div style={{ fontWeight: "700" }}>Odesláno: {sendResult.sentCount}/{sendResult.total}</div>
                    <div style={{ fontWeight: "700" }}>Přeskočeno (bez e-mailu): {sendResult.skippedCount}</div>
                    {sendResult.failed.length > 0 && (
                        <div style={{ marginTop: "0.5rem" }}>
                            <div style={{ fontWeight: "900", color: "#991b1b" }}>Chyby:</div>
                            <div style={{ fontSize: "0.9rem", color: "#b91c1c", fontWeight: "700" }}>
                                {sendResult.failed.map((f: any, i: number) => (
                                    <div key={i}>{f.email}: {f.error}</div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* New/Edit Draft Form */}
            {(showNewDraft || editingDraft) && (
                <div style={{
                    border: "3px solid #000",
                    borderRadius: "12px",
                    padding: "1.25rem",
                    backgroundColor: "#f9fafb",
                    boxShadow: "4px 4px 0 0 #000"
                }}>
                    <div style={{ fontWeight: "900", marginBottom: "0.75rem" }}>
                        {editingDraft ? "Upravit koncept" : "Nový koncept"}
                    </div>
                    <div style={{ display: "grid", gap: "1rem" }}>
                        <div>
                            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.35rem" }}>Předmět</label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                style={inputStyle}
                                placeholder="např. Přihláška na letní tábor"
                            />
                            {subject && (
                                <div style={previewBoxStyle}>
                                    {highlightTags(subject)}
                                </div>
                            )}
                        </div>
                        <div>
                            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.35rem" }}>Tělo e-mailu</label>
                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                style={{ ...inputStyle, fontFamily: "monospace", fontSize: "0.9rem", minHeight: "220px" }}
                                rows={12}
                                placeholder={`Ahoj <user.name>,\n\nposíláme Ti odkaz na přihlášku:\n<user.sign.link>\n\nTěšíme se na Tebe!`}
                            />
                            {body && (
                                <div style={previewBoxStyle}>
                                    {highlightTags(body)}
                                </div>
                            )}
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                            <button
                                onClick={editingDraft ? handleUpdateDraft : handleCreateDraft}
                                disabled={isSaving}
                                style={primaryButtonStyle}
                            >
                                {isSaving ? "Ukládání..." : editingDraft ? "Uložit změny" : "Vytvořit koncept"}
                            </button>
                            <button onClick={cancelEdit} style={secondaryButtonStyle}>
                                Zrušit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Drafts List */}
            <div style={{ display: "grid", gap: "1rem" }}>
                {drafts.length === 0 && !showNewDraft && !editingDraft && (
                    <div style={{
                        textAlign: "center",
                        padding: "2rem",
                        border: "3px dashed #9ca3af",
                        borderRadius: "12px",
                        color: "#6b7280",
                        fontWeight: "700"
                    }}>
                        <div>Zatím žádné koncepty e-mailů.</div>
                        <div style={{ fontSize: "0.9rem", marginTop: "0.35rem" }}>Klikněte na "Nový koncept" pro vytvoření.</div>
                    </div>
                )}

                {drafts.map((draft) => (
                    <div
                        key={draft._id}
                        style={{
                            border: "3px solid #000",
                            borderRadius: "12px",
                            padding: "1rem",
                            backgroundColor: draft.status === "sent" ? "#ecfdf5" : "white",
                            boxShadow: "4px 4px 0 0 #000"
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: "900", fontSize: "1.1rem" }}>{draft.subject}</div>
                                <div style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: "700", marginTop: "0.25rem" }}>
                                    Vytvořil: {draft.creator?.name || "Neznámý"} •{" "}
                                    {new Date(draft.createdAt).toLocaleDateString("cs-CZ")}
                                </div>
                                {draft.status === "sent" && (
                                    <div style={{ fontSize: "0.85rem", color: "#047857", fontWeight: "800", marginTop: "0.25rem" }}>
                                        ✓ Odesláno {draft.recipientCount} příjemcům •{" "}
                                        {new Date(draft.sentAt!).toLocaleString("cs-CZ")} •{" "}
                                        {draft.sender?.name || "Neznámý"}
                                    </div>
                                )}
                            </div>
                            {draft.status !== "sent" && (
                                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                    <button
                                        onClick={() => startEdit(draft)}
                                        style={secondaryButtonStyle}
                                    >
                                        Upravit
                                    </button>
                                    {isLeader && (
                                        <button
                                            onClick={() => handleSendDraft(draft._id)}
                                            disabled={isSending}
                                            style={primaryButtonStyle}
                                        >
                                            {isSending ? "Odesílání..." : "Odeslat"}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDeleteDraft(draft._id)}
                                        style={secondaryButtonStyle}
                                    >
                                        Smazat
                                    </button>
                                </div>
                            )}
                        </div>
                        <div style={{
                            backgroundColor: "#f3f4f6",
                            border: "2px solid #000",
                            borderRadius: "10px",
                            padding: "0.75rem",
                            fontSize: "0.9rem",
                            fontFamily: "monospace",
                            whiteSpace: "pre-wrap"
                        }}>
                            {draft.body}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

const primaryButtonStyle = {
    padding: "0.75rem 1.25rem",
    backgroundColor: "#86efac",
    border: "3px solid #000",
    borderRadius: "10px",
    fontWeight: "900",
    cursor: "pointer",
    boxShadow: "3px 3px 0 0 #000"
};

const secondaryButtonStyle = {
    padding: "0.6rem 1rem",
    backgroundColor: "#e5e7eb",
    border: "3px solid #000",
    borderRadius: "10px",
    fontWeight: "800",
    cursor: "pointer",
    boxShadow: "3px 3px 0 0 #000"
};

const inputStyle = {
    width: "100%",
    padding: "0.75rem",
    border: "3px solid #000",
    borderRadius: "10px",
    boxShadow: "3px 3px 0 0 #000",
    fontWeight: "600",
    outline: "none",
    backgroundColor: "white"
};

const infoBoxStyle = {
    border: "3px solid #000",
    borderRadius: "12px",
    padding: "1rem",
    backgroundColor: "#eff6ff",
    boxShadow: "4px 4px 0 0 #000"
};

const pillStyle = {
    display: "inline-block",
    padding: "0.2rem 0.5rem",
    borderRadius: "999px",
    border: "2px solid #000",
    backgroundColor: "#dbeafe",
    fontWeight: "900",
    marginRight: "0.5rem"
};

const panelStyle = {
    border: "3px solid #000",
    borderRadius: "12px",
    padding: "1.25rem",
    backgroundColor: "#fff",
    boxShadow: "4px 4px 0 0 #000"
};

const pillLightStyle = {
    padding: "0.3rem 0.65rem",
    borderRadius: "999px",
    border: "2px solid #000",
    backgroundColor: "#f3f4f6",
    fontWeight: "900",
    fontSize: "0.8rem"
};

const pillMemberStyle = {
    padding: "0.25rem 0.6rem",
    borderRadius: "999px",
    border: "2px solid #000",
    backgroundColor: "#fef3c7",
    fontWeight: "900",
    fontSize: "0.8rem"
};

const historyRowStyle = {
    border: "2px solid #000",
    borderRadius: "10px",
    padding: "0.75rem",
    backgroundColor: "#f9fafb"
};

const tagHighlightStyle = {
    backgroundColor: "#fde68a",
    border: "2px solid #000",
    borderRadius: "6px",
    padding: "0.05rem 0.35rem",
    margin: "0 0.15rem",
    fontWeight: "900"
};

const previewBoxStyle = {
    marginTop: "0.5rem",
    padding: "0.6rem",
    border: "2px dashed #9ca3af",
    borderRadius: "10px",
    backgroundColor: "#fff",
    fontSize: "0.9rem",
    fontWeight: "600",
    whiteSpace: "pre-wrap" as const
};
