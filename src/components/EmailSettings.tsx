"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import Button from "./Button";
import { useFeedback } from "../context/FeedbackContext";

interface EmailSettingsProps {
    troopId: Id<"troops">;
    isAuthorized: boolean;
}

type EmailProvider = "gmail" | "outlook" | "seznam" | "centrum" | "google-groups";

const PROVIDER_CONFIGS = {
    gmail: {
        name: "Gmail",
        icon: "📧",
        description: "Použít Gmail přes OAuth 2.0 (bez hesla)",
        color: "#4285f4",
        authType: "oauth",
    },
    outlook: {
        name: "Outlook / Microsoft 365",
        icon: "📨",
        description: "Použít Outlook přes OAuth 2.0 (bez hesla)",
        color: "#0078d4",
        authType: "oauth",
    },
    seznam: {
        name: "Seznam.cz",
        icon: "📬",
        description: "IMAP/SMTP: imap.seznam.cz",
        color: "#e74c3c",
        authType: "smtp",
        smtpHost: "smtp.seznam.cz",
        smtpPort: 465,
        imapHost: "imap.seznam.cz",
        imapPort: 993,
    },
    centrum: {
        name: "Centrum.cz",
        icon: "📮",
        description: "IMAP/SMTP: imap.centrum.cz",
        color: "#f39c12",
        authType: "smtp",
        smtpHost: "smtp.centrum.cz",
        smtpPort: 465,
        imapHost: "imap.centrum.cz",
        imapPort: 993,
    },
    "google-groups": {
        name: "Google Groups",
        icon: "👥",
        description: "Import členů z Google Groups",
        color: "#16a34a",
        authType: "oauth",
    },
} as const;

export default function EmailSettings({ troopId, isAuthorized }: EmailSettingsProps) {
    const { showError, showSuccess } = useFeedback();
    const troop = useQuery(api.troops.getById, { id: troopId });
    const members = useQuery(api.members.list, { troopId });
    const connectEmailProvider = useMutation(api.troops.connectEmailProvider);
    const disconnectEmailProvider = useMutation(api.troops.disconnectEmailProvider);
    const fetchGoogleGroupsMembers = useMutation(api.mailer.fetchGoogleGroupsMembers);
    const router = useRouter();

    const [showProviderSelector, setShowProviderSelector] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<EmailProvider | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);

    // SMTP form state
    const [smtpEmail, setSmtpEmail] = useState("");
    const [smtpPassword, setSmtpPassword] = useState("");

    // Google Groups state
    const [showGroupsImport, setShowGroupsImport] = useState(false);
    const [groupEmail, setGroupEmail] = useState("");
    const [groupMembers, setGroupMembers] = useState<Array<{ email: string; name?: string }>>([]);
    const [memberMapping, setMemberMapping] = useState<Record<string, string[]>>({});

    if (!troop) {
        return <div>Načítání...</div>;
    }

    const emailProvider = (troop as any).emailProvider;
    const gmailOAuth = (troop as any).gmailOAuth; // Legacy
    const isConnected = !!emailProvider || !!gmailOAuth;
    const currentProvider = emailProvider?.provider || (gmailOAuth ? "gmail" : null);

    const handleProviderSelect = (provider: EmailProvider) => {
        setSelectedProvider(provider);
        setShowProviderSelector(false);

        if (provider === "gmail") {
            handleGmailConnect();
        } else if (provider === "outlook") {
            handleOutlookConnect();
        } else if (provider === "google-groups") {
            // For Google Groups, we need Gmail OAuth first
            // Redirect to Gmail OAuth which will come back and allow group access
            handleGmailConnect();
        }
    };

    const handleGmailConnect = () => {
        setIsConnecting(true);
        router.push(`/settings/${troopId}/gmail-connect`);
    };

    const handleOutlookConnect = () => {
        setIsConnecting(true);
        // TODO: Create Outlook OAuth redirect similar to Gmail
        router.push(`/settings/${troopId}/outlook-connect`);
    };

    const handleSmtpConnect = async () => {
        if (!selectedProvider || !smtpEmail || !smtpPassword) {
            return;
        }

        const config = PROVIDER_CONFIGS[selectedProvider];
        if (!config || config.authType !== "smtp") return;

        setIsConnecting(true);
        try {
            await connectEmailProvider({
                troopId,
                provider: selectedProvider,
                email: smtpEmail,
                smtpHost: config.smtpHost,
                smtpPort: config.smtpPort,
                smtpPassword: smtpPassword,
            });
            // Close modal silently after connection
            setSelectedProvider(null);
            setSmtpEmail("");
            setSmtpPassword("");
        } catch (error: any) {
            console.error(error);
        } finally {
            setIsConnecting(false);
        }
    };

    const handleGoogleGroupsImport = async () => {
        if (!groupEmail) {
            return;
        }

        setIsConnecting(true);
        try {
            // Append @googlegroups.com to the group name
            const fullGroupEmail = `${groupEmail}@googlegroups.com`;
            
            // Get Gmail access token first
            const emailProvider = (troop as any).emailProvider;
            const gmailOAuth = (troop as any).gmailOAuth;
            const refreshToken = emailProvider?.refreshToken || gmailOAuth?.refreshToken;
            
            if (!refreshToken) {
                console.error("No Gmail refresh token available");
                setIsConnecting(false);
                return;
            }
            
            // Fetch real Google Groups members from the group email
            const groupMembers = await fetchGoogleGroupsMembers({
                groupEmail: fullGroupEmail,
                accessToken: refreshToken, // Will be exchanged for access token by the action
            });
            
            setGroupMembers(groupMembers);
            // Initialize member mapping with empty arrays
            const mapping: Record<string, string[]> = {};
            groupMembers.forEach((m: any, idx: number) => {
                mapping[idx.toString()] = [];
            });
            setMemberMapping(mapping);
        } catch (error: any) {
            console.error(error);
        } finally {
            setIsConnecting(false);
        }
    };

    const handleMemberEmailMapping = (memberId: string, emails: string[]) => {
        setMemberMapping(prev => ({ ...prev, [memberId]: emails }));
    };

    const handleDisconnect = async () => {
        showError({
            title: "⚠️ Potvrzení",
            message: "Opravdu odpojit e-mailový účet?",
            icon: "warning",
            buttons: [
                {
                    label: "Ano, odpojit",
                    onClick: async () => {
                        try {
                            await disconnectEmailProvider({ troopId });
                            // Disconnected silently, UI will update automatically
                        } catch (error: any) {
                            showError({
                                title: "❌ Chyba",
                                message: "Nepodařilo se odpojit účet.",
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

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Header */}
            <div style={{
                background: "linear-gradient(120deg, #eef2ff 0%, #ecfeff 100%)",
                border: "3px solid #000",
                borderRadius: "14px",
                padding: "1.5rem",
                boxShadow: "6px 6px 0 0 #000"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                    <div style={{ fontSize: "1.25rem", fontWeight: "900" }}>E-mailové připojení</div>
                    <span style={{
                        padding: "0.25rem 0.6rem",
                        borderRadius: "999px",
                        border: "2px solid #000",
                        backgroundColor: isConnected ? "#86efac" : "#fde68a",
                        fontWeight: "900",
                        fontSize: "0.8rem"
                    }}>
                        {isConnected ? "Připojeno" : "Nepřipojeno"}
                    </span>
                </div>
                <p style={{ fontSize: "0.95rem", fontWeight: "600", color: "#374151", marginBottom: "0.75rem" }}>
                    Propojte e-mailového poskytovatele pro odesílání zpráv členům. Podporujeme Gmail, Outlook, Seznam, Centrum a Google Groups.
                </p>
            </div>

            {/* Current Connection Status */}
            {isConnected && (
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
                        <div style={{ fontWeight: "900", color: "#065f46", marginBottom: "0.25rem" }}>✓ Připojeno</div>
                        <div style={{ fontSize: "0.95rem", fontWeight: "700", color: "#065f46" }}>
                            Poskytovatel: <strong>{currentProvider ? PROVIDER_CONFIGS[currentProvider as EmailProvider]?.name : "Gmail (legacy)"}</strong>
                        </div>
                        <div style={{ fontSize: "0.9rem", fontWeight: "700", color: "#047857" }}>
                            E-mail: <strong>{emailProvider?.email || gmailOAuth?.email}</strong>
                        </div>
                        <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "#047857" }}>
                            Připojeno: {new Date(emailProvider?.connectedAt || gmailOAuth?.connectedAt).toLocaleString("cs-CZ")}
                        </div>
                    </div>
                    {isAuthorized && (
                        <Button onClick={handleDisconnect} variant="outline">
                            Odpojit
                        </Button>
                    )}
                </div>
            )}

            {/* Google Groups Import Button (only show when Gmail is connected) */}
            {isConnected && (currentProvider === "gmail" || gmailOAuth) && isAuthorized && (
                <div style={{
                    backgroundColor: "#eff6ff",
                    border: "3px solid #000",
                    borderRadius: "12px",
                    padding: "1rem 1.25rem",
                    boxShadow: "4px 4px 0 0 #000"
                }}>
                    <div style={{ fontWeight: "900", fontSize: "1rem", marginBottom: "0.5rem" }}>
                        📧 Import z Google Groups
                    </div>
                    <p style={{ fontSize: "0.9rem", fontWeight: "600", color: "#374151", marginBottom: "1rem" }}>
                        Importujte e-maily z Google Groups seznamu pro rozesílání.
                    </p>
                    <button
                        onClick={() => setShowGroupsImport(true)}
                        style={{
                            padding: "0.75rem 1.5rem",
                            backgroundColor: "#3b82f6",
                            color: "white",
                            border: "3px solid #000",
                            borderRadius: "10px",
                            fontWeight: "900",
                            cursor: "pointer",
                            boxShadow: "3px 3px 0 0 #000"
                        }}
                    >
                        Importovat Google Groups
                    </button>
                </div>
            )}

            {/* Connect Button */}
            {!isConnected && isAuthorized && (
                <div style={{
                    border: "3px solid #000",
                    borderRadius: "12px",
                    padding: "1.25rem",
                    backgroundColor: "white",
                    boxShadow: "4px 4px 0 0 #000"
                }}>
                    <button
                        onClick={() => setShowProviderSelector(true)}
                        style={{
                            padding: "0.85rem 1.75rem",
                            backgroundColor: "#86efac",
                            color: "#000",
                            border: "3px solid #000",
                            borderRadius: "10px",
                            fontWeight: "900",
                            fontSize: "1rem",
                            cursor: "pointer",
                            boxShadow: "3px 3px 0 0 #000",
                            width: "100%"
                        }}
                    >
                        Připojit E-mail
                    </button>
                </div>
            )}

            {/* Provider Selector Modal */}
            {showProviderSelector && (
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
                        maxWidth: "600px",
                        backgroundColor: "white",
                        border: "3px solid #000",
                        borderRadius: "16px",
                        boxShadow: "8px 8px 0 0 #000",
                        padding: "1.5rem"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1.5rem" }}>
                            <div style={{ fontWeight: "900", fontSize: "1.3rem" }}>Vyberte poskytovatele</div>
                            <button
                                onClick={() => setShowProviderSelector(false)}
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
                                ✕
                            </button>
                        </div>

                        <div style={{ display: "grid", gap: "1rem" }}>
                            {Object.entries(PROVIDER_CONFIGS).map(([key, config]) => (
                                <button
                                    key={key}
                                    onClick={() => handleProviderSelect(key as EmailProvider)}
                                    style={{
                                        padding: "1.25rem",
                                        border: "3px solid #000",
                                        borderRadius: "12px",
                                        backgroundColor: "white",
                                        cursor: "pointer",
                                        textAlign: "left",
                                        boxShadow: "3px 3px 0 0 #000",
                                        transition: "transform 0.1s",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = "translate(-2px, -2px)";
                                        e.currentTarget.style.boxShadow = "5px 5px 0 0 #000";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = "translate(0, 0)";
                                        e.currentTarget.style.boxShadow = "3px 3px 0 0 #000";
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                        <div style={{ fontSize: "2.5rem" }}>{config.icon}</div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: "900", fontSize: "1.1rem", marginBottom: "0.25rem" }}>
                                                {config.name}
                                            </div>
                                            <div style={{ fontSize: "0.9rem", fontWeight: "600", color: "#6b7280" }}>
                                                {config.description}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* SMTP Configuration Modal */}
            {selectedProvider && PROVIDER_CONFIGS[selectedProvider]?.authType === "smtp" && (
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
                    zIndex: 3001,
                    padding: "1.5rem"
                }}>
                    <div style={{
                        width: "100%",
                        maxWidth: "500px",
                        backgroundColor: "white",
                        border: "3px solid #000",
                        borderRadius: "16px",
                        boxShadow: "8px 8px 0 0 #000",
                        padding: "1.5rem",
                        position: "relative",
                        zIndex: 3002
                    }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1.5rem" }}>
                            <div style={{ fontWeight: "900", fontSize: "1.2rem" }}>
                                Připojit {PROVIDER_CONFIGS[selectedProvider].name}
                            </div>
                            <button
                                onClick={() => setSelectedProvider(null)}
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
                                ✕
                            </button>
                        </div>

                        <div style={{ display: "grid", gap: "1rem" }}>
                            <div>
                                <label style={{ display: "block", fontWeight: "800", marginBottom: "0.5rem" }}>
                                    E-mailová adresa
                                </label>
                                <input
                                    type="text"
                                    value={smtpEmail}
                                    onChange={(e) => setSmtpEmail(e.target.value)}
                                    placeholder={`vase-jmeno@${selectedProvider}.cz`}
                                    autoComplete="off"
                                    data-form-type="other"
                                    data-lpignore="true"
                                    data-1p-ignore="true"
                                    style={{
                                        width: "100%",
                                        padding: "0.75rem",
                                        border: "3px solid #000",
                                        borderRadius: "8px",
                                        fontSize: "0.95rem",
                                        outline: "none",
                                        boxShadow: "3px 3px 0 0 #000",
                                        fontWeight: "600"
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontWeight: "800", marginBottom: "0.5rem" }}>
                                    Heslo aplikace
                                </label>
                                <input
                                    type="password"
                                    value={smtpPassword}
                                    onChange={(e) => setSmtpPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="off"
                                    data-form-type="other"
                                    data-lpignore="true"
                                    data-1p-ignore="true"
                                    style={{
                                        width: "100%",
                                        padding: "0.75rem",
                                        border: "3px solid #000",
                                        borderRadius: "8px",
                                        fontSize: "0.95rem",
                                        outline: "none",
                                        boxShadow: "3px 3px 0 0 #000",
                                        fontWeight: "600"
                                    }}
                                />
                                <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "#6b7280", marginTop: "0.5rem" }}>
                                    Použijte heslo aplikace, ne běžné heslo k účtu.
                                </div>
                            </div>

                            <div style={{
                                backgroundColor: "#eff6ff",
                                border: "2px solid #000",
                                borderRadius: "8px",
                                padding: "1rem",
                                fontSize: "0.85rem",
                                fontWeight: "600"
                            }}>
                                <div style={{ fontWeight: "900", marginBottom: "0.5rem" }}>ℹ️ Nastavení:</div>
                                <div>SMTP: {PROVIDER_CONFIGS[selectedProvider].smtpHost}:{PROVIDER_CONFIGS[selectedProvider].smtpPort}</div>
                                <div>IMAP: {PROVIDER_CONFIGS[selectedProvider].imapHost}:{PROVIDER_CONFIGS[selectedProvider].imapPort}</div>
                            </div>

                            <button
                                onClick={handleSmtpConnect}
                                disabled={isConnecting || !smtpEmail || !smtpPassword}
                                style={{
                                    padding: "0.85rem",
                                    backgroundColor: isConnecting || !smtpEmail || !smtpPassword ? "#e5e7eb" : "#86efac",
                                    border: "3px solid #000",
                                    borderRadius: "10px",
                                    fontWeight: "900",
                                    cursor: isConnecting || !smtpEmail || !smtpPassword ? "not-allowed" : "pointer",
                                    boxShadow: "3px 3px 0 0 #000"
                                }}
                            >
                                {isConnecting ? "Připojuji..." : "Připojit"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Google Groups Import Modal */}
            {showGroupsImport && (
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
                    zIndex: 3001,
                    padding: "1.5rem",
                    overflowY: "auto"
                }}>
                    <div style={{
                        width: "100%",
                        maxWidth: "700px",
                        backgroundColor: "white",
                        border: "3px solid #000",
                        borderRadius: "16px",
                        boxShadow: "8px 8px 0 0 #000",
                        padding: "1.5rem",
                        maxHeight: "90vh",
                        overflowY: "auto",
                        position: "relative",
                        zIndex: 3002
                    }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1.5rem" }}>
                            <div style={{ fontWeight: "900", fontSize: "1.2rem" }}>Import z Google Groups</div>
                            <button
                                onClick={() => {
                                    setShowGroupsImport(false);
                                    setGroupEmail("");
                                    setGroupMembers([]);
                                }}
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
                                ✕
                            </button>
                        </div>

                        <div style={{ display: "grid", gap: "1.5rem" }}>
                            {/* Step 1: Enter Group Email */}
                            <div>
                                <label style={{ display: "block", fontWeight: "800", marginBottom: "0.5rem" }}>
                                    Název Google Groups
                                </label>
                                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                    <input
                                        type="text"
                                        value={groupEmail}
                                        onChange={(e) => setGroupEmail(e.target.value)}
                                        placeholder="nazev-skupiny"
                                        autoComplete="off"
                                        style={{
                                            flex: 1,
                                            padding: "0.75rem",
                                            border: "3px solid #000",
                                            borderRadius: "8px",
                                            fontSize: "0.95rem",
                                            outline: "none",
                                            boxShadow: "3px 3px 0 0 #000",
                                            fontWeight: "600"
                                        }}
                                    />
                                    <span style={{ fontWeight: "800", fontSize: "0.95rem" }}>@googlegroups.com</span>
                                    <button
                                        onClick={handleGoogleGroupsImport}
                                        disabled={isConnecting || !groupEmail}
                                        style={{
                                            padding: "0.75rem 1.25rem",
                                            backgroundColor: isConnecting || !groupEmail ? "#e5e7eb" : "#3b82f6",
                                            color: "white",
                                            border: "3px solid #000",
                                            borderRadius: "8px",
                                            fontWeight: "900",
                                            cursor: isConnecting || !groupEmail ? "not-allowed" : "pointer",
                                            boxShadow: "3px 3px 0 0 #000"
                                        }}
                                    >
                                        {isConnecting ? "Načítám..." : "Načíst"}
                                    </button>
                                </div>
                            </div>

                            {/* Step 2: Member Mapping */}
                            {groupMembers.length > 0 && members && (
                                <div>
                                    <div style={{ fontWeight: "900", fontSize: "1.05rem", marginBottom: "1rem" }}>
                                        Přiřaďte e-maily členům
                                    </div>
                                    <div style={{
                                        border: "3px solid #000",
                                        borderRadius: "10px",
                                        padding: "1rem",
                                        backgroundColor: "#fef3c7",
                                        marginBottom: "1rem"
                                    }}>
                                        <div style={{ fontWeight: "800", marginBottom: "0.5rem" }}>💡 Tip</div>
                                        <div style={{ fontSize: "0.9rem", fontWeight: "600" }}>
                                            Můžete přiřadit více e-mailů k jednomu členovi (např. rodič + dítě).
                                        </div>
                                    </div>

                                    <div style={{ display: "grid", gap: "1rem", maxHeight: "400px", overflowY: "auto", padding: "0.5rem" }}>
                                        {members.map((member: any) => (
                                            <div key={member._id} style={{
                                                border: "2px solid #000",
                                                borderRadius: "10px",
                                                padding: "1rem",
                                                backgroundColor: "white"
                                            }}>
                                                <div style={{ fontWeight: "900", marginBottom: "0.5rem" }}>
                                                    {member.name} {member.nickname && `"${member.nickname}"`}
                                                </div>
                                                <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "#6b7280", marginBottom: "0.75rem" }}>
                                                    Rodič: {member.parentName}
                                                </div>
                                                <select
                                                    multiple
                                                    value={memberMapping[member._id] || []}
                                                    onChange={(e) => {
                                                        const selected = Array.from(e.target.selectedOptions).map(o => o.value);
                                                        handleMemberEmailMapping(member._id, selected);
                                                    }}
                                                    style={{
                                                        width: "100%",
                                                        padding: "0.5rem",
                                                        border: "2px solid #000",
                                                        borderRadius: "6px",
                                                        fontSize: "0.9rem",
                                                        fontWeight: "600",
                                                        minHeight: "80px"
                                                    }}
                                                >
                                                    {groupMembers.map((gm, idx) => (
                                                        <option key={idx} value={gm.email}>
                                                            {gm.name || gm.email}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div style={{ fontSize: "0.8rem", fontWeight: "600", color: "#6b7280", marginTop: "0.5rem" }}>
                                                    Podržte Ctrl/Cmd pro výběr více e-mailů
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={async () => {
                                            try {
                                                const fullGroupEmail = `${groupEmail}@googlegroups.com`;
                                                
                                                // Convert memberMapping to the format expected by the mutation
                                                const mappingArray = Object.entries(memberMapping).map(([memberId, emails]) => ({
                                                    memberId: memberId as Id<"members">,
                                                    emails,
                                                }));
                                                
                                                await connectEmailProvider({
                                                    troopId,
                                                    provider: "google-groups",
                                                    email: fullGroupEmail,
                                                    groupEmail: fullGroupEmail,
                                                    memberMapping: mappingArray.length > 0 ? mappingArray : undefined,
                                                });
                                                setShowGroupsImport(false);
                                            } catch (error: any) {
                                                console.error(error);
                                            }
                                        }}
                                        style={{
                                            padding: "0.85rem",
                                            backgroundColor: "#86efac",
                                            border: "3px solid #000",
                                            borderRadius: "10px",
                                            fontWeight: "900",
                                            cursor: "pointer",
                                            boxShadow: "3px 3px 0 0 #000",
                                            width: "100%",
                                            marginTop: "1rem"
                                        }}
                                    >
                                        Uložit mapování
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Info Section */}
            {!isAuthorized && (
                <div style={{
                    backgroundColor: "#f3f4f6",
                    border: "2px solid #e5e7eb",
                    borderRadius: "12px",
                    padding: "1rem",
                    fontWeight: "600",
                    color: "#4b5563"
                }}>
                    Pouze vlastník nebo hlavní vedoucí může spravovat e-mailové připojení.
                </div>
            )}
        </div>
    );
}
