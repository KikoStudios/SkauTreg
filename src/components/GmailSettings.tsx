"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import Button from "./Button";
import { useFeedback } from "../context/FeedbackContext";

interface GmailSettingsProps {
    troopId: Id<"troops">;
    isAuthorized: boolean;
}

export default function GmailSettings({ troopId, isAuthorized }: GmailSettingsProps) {
    const { showError, showSuccess } = useFeedback();
    const troop = useQuery(api.troops.getById, { id: troopId });
    const members = useQuery(api.members.list, { troopId });
    const sentHistory = useQuery(api.emailDrafts.listSentByTroop, { troopId });
    const disconnectGmail = useMutation(api.troops.disconnectEmailProvider);
    const connectGmailSmtp = useAction(api.mailer.connectGmailSmtp);

    const [isConnecting, setIsConnecting] = useState(false);
    const [gmailEmail, setGmailEmail] = useState("");
    const [appPassword, setAppPassword] = useState("");
    const [showComposer, setShowComposer] = useState(false);
    const [composerSubject, setComposerSubject] = useState("");
    const [composerBody, setComposerBody] = useState("");

    const handleConnect = async () => {
        setIsConnecting(true);
        try {
            const result = await connectGmailSmtp({ troopId, email: gmailEmail, appPassword });
            setAppPassword("");
            showSuccess({
                title: "Gmail SMTP připojeno",
                message: `Účet ${result.email} je připravený k odesílání.`,
                duration: 4000,
            });
        } catch (error: any) {
            showError({
                title: "Gmail SMTP se nepodařilo připojit",
                message: error?.message || "Zkontrolujte e-mail a heslo aplikace Google.",
                icon: "error",
                canReport: true,
            });
        } finally {
            setIsConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        showError({
            title: "⚠️ Potvrzení",
            message: "Opravdu odpojit Gmail účet? Automatické odesílání nebude dostupné, dokud jej znovu nepřipojíte.",
            icon: "warning",
            buttons: [
                {
                    label: "Ano, odpojit",
                    onClick: async () => {
                        try {
                            await disconnectGmail({ troopId });
                            showSuccess({
                                title: "✅ Odpojeno",
                                message: "Gmail účet byl úspěšně odpojen.",
                                duration: 3000,
                            });
                        } catch (error: any) {
                            showError({
                                title: "❌ Chyba",
                                message: "Nepodařilo se odpojit Gmail účet.",
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

    if (!troop) {
        return <div>Načítání...</div>;
    }

    const emailProvider = (troop as any).emailProvider;
    const gmailConnection = ["gmail", "gmail-smtp"].includes(emailProvider?.provider)
        ? emailProvider
        : (troop as any).gmailOAuth;
    const isConnected = !!gmailConnection;
    const memberEmails = Array.from(
        new Set(
            (members || [])
                .map((member: any) => (member.email || "").trim())
                .filter((email: string) => email.length > 0)
        )
    );
    const mailtoLink = memberEmails.length > 0
        ? `mailto:?bcc=${encodeURIComponent(memberEmails.join(","))}&subject=${encodeURIComponent(composerSubject)}&body=${encodeURIComponent(composerBody)}`
        : "";

    const handleOpenMailClient = () => {
        if (mailtoLink) {
            window.location.href = mailtoLink;
        }
    };

    const handleOpenComposer = () => {
        if (memberEmails.length === 0) return;
        setShowComposer(true);
    };

    const handleCopyBcc = async () => {
        try {
            await navigator.clipboard.writeText(memberEmails.join(", "));
            showSuccess({
                title: "✅ Zkopírováno",
                message: `BCC seznam (${memberEmails.length} členů) byl zkopírován.`,
                duration: 2500,
            });
        } catch (e) {
            showError({
                title: "❌ Chyba",
                message: "Nepodařilo se zkopírovat seznam BCC.",
                icon: "error",
            });
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{
                background: "linear-gradient(120deg, #eef2ff 0%, #ecfeff 100%)",
                border: "3px solid #000",
                borderRadius: "14px",
                padding: "1.5rem",
                boxShadow: "6px 6px 0 0 #000"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                    <div style={{ fontSize: "1.25rem", fontWeight: "900" }}>Gmail SMTP</div>
                    <span style={{
                        padding: "0.25rem 0.6rem",
                        borderRadius: "999px",
                        border: "2px solid #000",
                        backgroundColor: isConnected ? "#86efac" : "#fde68a",
                        fontWeight: "900",
                        fontSize: "0.8rem"
                    }}>
                        {isConnected ? "Propojeno" : "Nepřipojeno"}
                    </span>
                </div>
                <p style={{ fontSize: "0.95rem", fontWeight: "600", color: "#374151", marginBottom: "0.75rem" }}>
                    Propojte oddílový Google účet pomocí samostatného hesla aplikace. SkauTreg pak odesílá zprávy přes zabezpečený server smtp.gmail.com.
                </p>
                {gmailConnection?.requiresReconnect && <p role="alert" style={{ padding: ".75rem", background: "#fef3c7", border: "2px solid #92400e", borderRadius: 8, fontWeight: 800 }}>Google přihlašovací údaje už nefungují. Účet odpojte a připojte znovu s novým heslem aplikace.</p>}
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                    <div style={{
                        padding: "0.5rem 0.75rem",
                        border: "2px solid #000",
                        borderRadius: "8px",
                        backgroundColor: "white",
                        fontWeight: "800",
                        fontSize: "0.85rem"
                    }}>
                        SMTP přes TLS
                    </div>
                    <div style={{
                        padding: "0.5rem 0.75rem",
                        border: "2px solid #000",
                        borderRadius: "8px",
                        backgroundColor: "white",
                        fontWeight: "800",
                        fontSize: "0.85rem"
                    }}>
                        Odesílatel pro výpravy
                    </div>
                </div>
            </div>

            {isConnected ? (
                <div style={{
                    backgroundColor: "#ecfdf5",
                    border: "3px solid #000",
                    borderRadius: "12px",
                    padding: "1rem 1.25rem",
                    boxShadow: "4px 4px 0 0 #000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "1rem",
                    flexWrap: "wrap"
                }}>
                    <div>
                        <div style={{ fontWeight: "900", color: "#065f46" }}>✓ Propojeno</div>
                        <div style={{ fontSize: "0.95rem", fontWeight: "700", color: "#065f46" }}>
                            E-mail: <strong>{gmailConnection.email}</strong>
                        </div>
                        <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "#047857" }}>
                            {emailProvider?.provider === "gmail-smtp" ? "Heslo aplikace" : "Starší OAuth připojení"} · připojeno {new Date(gmailConnection.connectedAt).toLocaleString("cs-CZ")}
                        </div>
                    </div>
                    {isAuthorized && (
                        <Button onClick={handleDisconnect} variant="outline">
                            Odpojit
                        </Button>
                    )}
                </div>
            ) : (
                <>
                    {!isAuthorized ? (
                        <div style={{ backgroundColor: "#f3f4f6", border: "2px solid #e5e7eb", borderRadius: "12px", padding: "1rem", fontWeight: "600", color: "#4b5563" }}>
                            Pouze vlastník nebo hlavní vedoucí může propojit Gmail účet.
                        </div>
                    ) : (
                        <form onSubmit={(event) => { event.preventDefault(); void handleConnect(); }} style={{
                            border: "3px solid #000",
                            borderRadius: "12px",
                            padding: "1rem 1.25rem",
                            backgroundColor: "white",
                            boxShadow: "4px 4px 0 0 #000",
                            display: "grid",
                            gap: ".85rem",
                        }}>
                            <label style={{ display: "grid", gap: ".35rem", fontWeight: 800 }}>
                                Gmail adresa
                                <input
                                    type="email"
                                    value={gmailEmail}
                                    onChange={(event) => setGmailEmail(event.target.value)}
                                    placeholder="oddil@gmail.com"
                                    autoComplete="username"
                                    required
                                    style={{ padding: ".75rem", border: "3px solid #000", borderRadius: 10, fontWeight: 650 }}
                                />
                            </label>
                            <label style={{ display: "grid", gap: ".35rem", fontWeight: 800 }}>
                                Heslo aplikace Google
                                <input
                                    type="password"
                                    value={appPassword}
                                    onChange={(event) => setAppPassword(event.target.value)}
                                    placeholder="xxxx xxxx xxxx xxxx"
                                    autoComplete="new-password"
                                    required
                                    minLength={16}
                                    style={{ padding: ".75rem", border: "3px solid #000", borderRadius: 10, fontWeight: 650, letterSpacing: ".08em" }}
                                />
                            </label>
                            <button
                                type="submit"
                                disabled={isConnecting}
                                style={{
                                    padding: "0.75rem 1.5rem",
                                    backgroundColor: "#4285f4",
                                    color: "white",
                                    border: "3px solid #000",
                                    borderRadius: "10px",
                                    fontWeight: "600",
                                    cursor: isConnecting ? "not-allowed" : "pointer",
                                    opacity: isConnecting ? 0.7 : 1,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    boxShadow: "3px 3px 0 0 #000"
                                }}
                            >
                                {isConnecting ? "Ověřuji připojení…" : "Připojit Gmail SMTP"}
                            </button>
                            <p className="text-xs text-gray-500 mt-2">
                                Ukládá se pouze šifrované heslo aplikace, nikoli vaše běžné heslo Google.
                            </p>
                        </form>
                    )}
                </>
            )}

            <div style={{
                border: "3px solid #000",
                borderRadius: "12px",
                padding: "1.25rem",
                backgroundColor: "#eff6ff",
                boxShadow: "4px 4px 0 0 #000"
            }}>
                <div style={{ fontWeight: "900", color: "#1e3a8a", marginBottom: "0.5rem" }}>Jak vytvořit heslo aplikace?</div>
                <ol style={{ margin: 0, paddingLeft: "1.25rem", color: "#1e40af", fontWeight: "600", display: "grid", gap: "0.25rem" }}>
                    <li>Zapněte u Google účtu dvoufázové ověření.</li>
                    <li>Otevřete <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>Hesla aplikací Google</a>.</li>
                    <li>Vytvořte heslo s názvem „SkauTreg“.</li>
                    <li>Zkopírujte zobrazených 16 znaků do pole výše a účet připojte.</li>
                </ol>
                <div style={{ marginTop: "0.75rem", color: "#1e3a8a", fontWeight: "700" }}>
                    Heslo aplikace lze kdykoli samostatně zrušit v nastavení Google účtu.
                </div>
                <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid #93c5fd", color: "#1e3a8a", fontWeight: "650" }}>
                    U pracovních nebo školních účtů, včetně spravovaných domén, může správce tvorbu hesel aplikací zakázat.
                </div>
            </div>

            <div style={{
                border: "3px solid #000",
                borderRadius: "12px",
                padding: "1.25rem",
                backgroundColor: "#fff",
                boxShadow: "4px 4px 0 0 #000",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem"
            }}>
                <div style={{ fontWeight: "900", fontSize: "1rem" }}>Rychlý kontakt na členy</div>
                <div style={{ fontWeight: "600", color: "#4b5563" }}>
                    Otevře váš e-mailový klient s adresami pouze z členského seznamu.
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                    <div style={{ fontWeight: "800" }}>
                        Nalezené e-maily: {memberEmails.length}
                    </div>
                    <button
                        type="button"
                        onClick={handleOpenComposer}
                        disabled={memberEmails.length === 0}
                        style={{
                            padding: "0.75rem 1.25rem",
                            backgroundColor: memberEmails.length === 0 ? "#e5e7eb" : "#86efac",
                            border: "3px solid #000",
                            borderRadius: "10px",
                            fontWeight: "900",
                            cursor: memberEmails.length === 0 ? "not-allowed" : "pointer",
                            boxShadow: "3px 3px 0 0 #000"
                        }}
                    >
                        Otevřít e‑mailový klient
                    </button>
                </div>
                {memberEmails.length === 0 && (
                    <div style={{ fontSize: "0.85rem", color: "#9ca3af", fontWeight: "600" }}>
                        Tip: Přidejte e‑maily u členů a tlačítko se aktivuje.
                    </div>
                )}
            </div>

            <div style={{
                border: "3px solid #000",
                borderRadius: "12px",
                padding: "1.25rem",
                backgroundColor: "white",
                boxShadow: "4px 4px 0 0 #000",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem"
            }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                    <div>
                        <div style={{ fontWeight: "900", fontSize: "1rem" }}>Mail klient – historie</div>
                        <div style={{ fontWeight: "600", color: "#6b7280", fontSize: "0.9rem" }}>
                            Zobrazuje odeslané e‑maily z výprav. Příjemci jsou pouze členové s e‑mailem.
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <div style={{ padding: "0.3rem 0.65rem", borderRadius: "999px", border: "2px solid #000", backgroundColor: "#f3f4f6", fontWeight: "900", fontSize: "0.8rem" }}>
                            Odeslané: {sentHistory ? sentHistory.length : 0}
                        </div>
                        <div style={{ padding: "0.3rem 0.65rem", borderRadius: "999px", border: "2px solid #000", backgroundColor: "#fef3c7", fontWeight: "900", fontSize: "0.8rem" }}>
                            Členové s e‑mailem: {memberEmails.length}
                        </div>
                    </div>
                </div>

                <div style={{ display: "grid", gap: "0.75rem", marginTop: "0.5rem" }}>
                    {!sentHistory || sentHistory.length === 0 ? (
                        <div style={{ fontWeight: "700", color: "#6b7280" }}>Zatím žádný odeslaný e‑mail.</div>
                    ) : (
                        sentHistory.slice(0, 8).map((item: any) => (
                            <div key={item._id} style={{ border: "2px solid #000", borderRadius: "10px", padding: "0.75rem", backgroundColor: "#f9fafb" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                                    <div>
                                        <div style={{ fontWeight: "900" }}>{item.subject}</div>
                                        <div style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: "700" }}>
                                            Výprava: {item.trip?.name || "Neznámá"}
                                        </div>
                                        <div style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: "700" }}>
                                            Odeslal: {item.sender?.name || "Neznámý"} {item.sender?.email ? `• ${item.sender.email}` : ""}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: "0.85rem", fontWeight: "800", color: "#047857" }}>
                                        {item.sentAt ? new Date(item.sentAt).toLocaleString("cs-CZ") : ""}
                                    </div>
                                </div>
                                <div style={{ marginTop: "0.5rem", fontWeight: "700" }}>
                                    Příjemců: {item.recipientCount || 0}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {showComposer && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 3000,
                    padding: "1.5rem"
                }}>
                    <div style={{
                        width: "100%",
                        maxWidth: "720px",
                        backgroundColor: "white",
                        border: "3px solid #000",
                        borderRadius: "16px",
                        boxShadow: "8px 8px 0 0 #000",
                        padding: "1.5rem"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1rem" }}>
                            <div style={{ fontWeight: "900", fontSize: "1.2rem" }}>Nový e‑mail</div>
                            <button
                                type="button"
                                onClick={() => setShowComposer(false)}
                                style={{
                                    border: "3px solid #000",
                                    borderRadius: "10px",
                                    backgroundColor: "#e5e7eb",
                                    padding: "0.35rem 0.75rem",
                                    fontWeight: "900",
                                    cursor: "pointer",
                                    boxShadow: "3px 3px 0 0 #000"
                                }}
                            >
                                Zavřít
                            </button>
                        </div>

                        <div style={{ display: "grid", gap: "0.75rem" }}>
                            <div style={{
                                padding: "0.75rem",
                                border: "2px solid #000",
                                borderRadius: "10px",
                                backgroundColor: "#f9fafb",
                                fontWeight: "700"
                            }}>
                                BCC příjemci: {memberEmails.length}
                            </div>

                            <div>
                                <label style={{ display: "block", fontWeight: "800", marginBottom: "0.35rem" }}>Předmět</label>
                                <input
                                    type="text"
                                    value={composerSubject}
                                    onChange={(e) => setComposerSubject(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "0.75rem",
                                        border: "3px solid #000",
                                        borderRadius: "10px",
                                        boxShadow: "3px 3px 0 0 #000",
                                        fontWeight: "600",
                                        outline: "none"
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontWeight: "800", marginBottom: "0.35rem" }}>Tělo e‑mailu</label>
                                <textarea
                                    value={composerBody}
                                    onChange={(e) => setComposerBody(e.target.value)}
                                    rows={8}
                                    style={{
                                        width: "100%",
                                        padding: "0.75rem",
                                        border: "3px solid #000",
                                        borderRadius: "10px",
                                        boxShadow: "3px 3px 0 0 #000",
                                        fontWeight: "600",
                                        outline: "none",
                                        resize: "vertical"
                                    }}
                                />
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                                <button
                                    type="button"
                                    onClick={handleCopyBcc}
                                    style={{
                                        padding: "0.65rem 1rem",
                                        backgroundColor: "#e5e7eb",
                                        border: "3px solid #000",
                                        borderRadius: "10px",
                                        fontWeight: "900",
                                        cursor: "pointer",
                                        boxShadow: "3px 3px 0 0 #000"
                                    }}
                                >
                                    Kopírovat BCC
                                </button>
                                <button
                                    type="button"
                                    onClick={handleOpenMailClient}
                                    style={{
                                        padding: "0.75rem 1.25rem",
                                        backgroundColor: "#86efac",
                                        border: "3px solid #000",
                                        borderRadius: "10px",
                                        fontWeight: "900",
                                        cursor: "pointer",
                                        boxShadow: "3px 3px 0 0 #000"
                                    }}
                                >
                                    Otevřít v klientu
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
