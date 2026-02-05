"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "./Button";

interface GmailSettingsProps {
    troopId: Id<"troops">;
    isAuthorized: boolean;
}

export default function GmailSettings({ troopId, isAuthorized }: GmailSettingsProps) {
    const troop = useQuery(api.troops.getById, { id: troopId });
    const members = useQuery(api.members.list, { troopId });
    const sentHistory = useQuery(api.emailDrafts.listSentByTroop, { troopId });
    const connectGmail = useMutation(api.troops.connectGmail);
    const disconnectGmail = useMutation(api.troops.disconnectGmail);
    const searchParams = useSearchParams();
    const router = useRouter();

    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [paramsProcessed, setParamsProcessed] = useState(false);
    const [showComposer, setShowComposer] = useState(false);
    const [composerSubject, setComposerSubject] = useState("");
    const [composerBody, setComposerBody] = useState("");

    // Read params once at mount before they get cleared
    useEffect(() => {
        if (paramsProcessed) return; // Only run once

        let gmailConnected: string | null = null;
        let email: string | null = null;
        let refreshToken: string | null = null;
        let gmailError: string | null = null;

        // Try useSearchParams hook first
        gmailConnected = searchParams?.get('gmail_connected');
        email = searchParams?.get('email');
        refreshToken = searchParams?.get('refresh_token');
        gmailError = searchParams?.get('gmail_error');

        // Fallback: read from window.location.search
        if (!gmailConnected && !email && !gmailError && typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            gmailConnected = urlParams.get('gmail_connected');
            email = urlParams.get('email');
            refreshToken = urlParams.get('refresh_token');
            gmailError = urlParams.get('gmail_error');
            console.log('Fallback params from window.location:', { gmailConnected, email, gmailError });
        }

        console.log('OAuth callback detected:', { gmailConnected, email, gmailError });

        if (gmailError) {
            setError(decodeURIComponent(gmailError));
            window.history.replaceState({}, document.title, window.location.pathname);
            setParamsProcessed(true);
            return;
        }

        if (gmailConnected === 'true' && email && refreshToken) {
            console.log('Calling handleOAuthCallback with:', { email, refreshToken });
            handleOAuthCallback(email, refreshToken);
        }

        setParamsProcessed(true);
    }, []); // Empty dependency array - run once on mount


    const handleOAuthCallback = async (email: string, refreshToken: string) => {
        setIsConnecting(true);
        setError(null);
        try {
            console.log('Saving Gmail connection:', { email });
            const result = await connectGmail({ troopId, email, refreshToken });
            console.log('connectGmail result:', result);
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error: any) {
            console.error('connectGmail error:', error);
            setError(`Chyba při uložení: ${error.message}`);
        } finally {
            setIsConnecting(false);
        }
    };

    const handleLoginClick = () => {
        router.push(`/settings/${troopId}/gmail-connect`);
    };

    const debugClientId = process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID || "(missing)";
    const debugRedirectUri = typeof window !== "undefined"
        ? `${window.location.origin}/api/auth/gmail/callback`
        : "(dynamic)";

    const handleDisconnect = async () => {
        if (!confirm("Opravdu odpojit Gmail účet? E-maily bude třeba odesílat znovu přes globální nastavení.")) {
            return;
        }

        try {
            await disconnectGmail({ troopId });
        } catch (error: any) {
            alert(`Chyba při odpojení: ${error.message}`);
        }
    };

    if (!troop) {
        return <div>Načítání...</div>;
    }

    const gmailOAuth = (troop as any).gmailOAuth;
    const isConnected = !!gmailOAuth;
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
            alert("Seznam BCC zkopírován.");
        } catch (e) {
            alert("Nepodařilo se zkopírovat seznam BCC.");
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {error && (
                <div style={{ backgroundColor: "#fef2f2", border: "2px solid #fecaca", borderRadius: "12px", padding: "1rem", color: "#991b1b", fontWeight: "700" }}>
                    <div style={{ fontSize: "0.95rem" }}>Chyba</div>
                    <div style={{ fontSize: "0.9rem", fontWeight: "600" }}>{error}</div>
                </div>
            )}

            <div style={{
                background: "linear-gradient(120deg, #eef2ff 0%, #ecfeff 100%)",
                border: "3px solid #000",
                borderRadius: "14px",
                padding: "1.5rem",
                boxShadow: "6px 6px 0 0 #000"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                    <div style={{ fontSize: "1.25rem", fontWeight: "900" }}>Gmail propojení</div>
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
                    Propojte oficiální e-mailovou adresu oddílu (např. info@vasoddil.cz) přes Google OAuth 2.0. Tento e-mail bude použit jako odesílatel pro všechny zprávy k výpravám.
                </p>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                    <div style={{
                        padding: "0.5rem 0.75rem",
                        border: "2px solid #000",
                        borderRadius: "8px",
                        backgroundColor: "white",
                        fontWeight: "800",
                        fontSize: "0.85rem"
                    }}>
                        OAuth 2.0 • Bez hesla
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
                            E-mail: <strong>{gmailOAuth.email}</strong>
                        </div>
                        <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "#047857" }}>
                            Propojeno: {new Date(gmailOAuth.connectedAt).toLocaleString("cs-CZ")}
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
                        <div style={{
                            border: "3px solid #000",
                            borderRadius: "12px",
                            padding: "1rem 1.25rem",
                            backgroundColor: "white",
                            boxShadow: "4px 4px 0 0 #000"
                        }}>
                            <button
                                onClick={handleLoginClick}
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
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                </svg>
                                {isConnecting ? "Propojuji..." : "Propojit s Gmailu"}
                            </button>
                            <p className="text-xs text-gray-500 mt-2">
                                Budete přesměrováni na Google pro přihlášení.
                            </p>
                            {process.env.NODE_ENV !== "production" && (
                                <div className="mt-2 text-xs text-gray-500">
                                    <div>client_id: {debugClientId}</div>
                                    <div>redirect_uri: {debugRedirectUri}</div>
                                </div>
                            )}
                        </div>
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
                <div style={{ fontWeight: "900", color: "#1e3a8a", marginBottom: "0.5rem" }}>Jak funguje OAuth?</div>
                <ol style={{ margin: 0, paddingLeft: "1.25rem", color: "#1e40af", fontWeight: "600", display: "grid", gap: "0.25rem" }}>
                    <li>Klikněte na "Propojit s Gmailu"</li>
                    <li>Přihlaste se ke svému Google účtu</li>
                    <li>Udělte oprávnění pro odesílání e-mailů</li>
                    <li>Budete vráceni zpět sem</li>
                    <li>Hotovo! Váš oddílový e-mail je připojen</li>
                </ol>
                <div style={{ marginTop: "0.75rem", color: "#1e3a8a", fontWeight: "700" }}>
                    Bezpečnost: aplikace nikdy nezná vaše heslo. Používáme OAuth 2.0.
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
