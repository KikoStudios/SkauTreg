"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "./Button";
import { useFeedback } from "../context/FeedbackContext";
import { GmailIcon, SeznamIcon, CentrumIcon } from "./EmailProviderIcons";

interface EmailSettingsProps {
    troopId: Id<"troops">;
    isAuthorized: boolean;
}

type EmailProvider = "gmail" | "seznam" | "centrum";

const PROVIDER_CONFIGS = {
    gmail: {
        name: "Gmail",
        icon: GmailIcon,
        description: "Používat Gmail přes OAuth 2.0 (bez hesla)",
        color: "#4285f4",
        authType: "oauth",
    },
    seznam: {
        name: "Seznam.cz",
        icon: SeznamIcon,
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
        icon: CentrumIcon,
        description: "IMAP/SMTP: imap.centrum.cz",
        color: "#f39c12",
        authType: "smtp",
        smtpHost: "smtp.centrum.cz",
        smtpPort: 465,
        imapHost: "imap.centrum.cz",
        imapPort: 993,
    },
} as const;

export default function EmailSettings({ troopId, isAuthorized }: EmailSettingsProps) {
    const { showError, showSuccess } = useFeedback();
    const searchParams = useSearchParams();
    const troop = useQuery(api.troops.getById, { id: troopId });
    const members = useQuery(api.members.list, { troopId });
    const connectEmailProvider = useMutation(api.troops.connectEmailProvider);
    const disconnectEmailProvider = useMutation(api.troops.disconnectEmailProvider);
    const testEmailConnection = useAction(api.mailer.testEmailConnection);
    const router = useRouter();

    const [showProviderSelector, setShowProviderSelector] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<EmailProvider | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

    // SMTP form state
    const [smtpEmail, setSmtpEmail] = useState("");
    const [smtpPassword, setSmtpPassword] = useState("");



    // Check if returning from OAuth providers
    useEffect(() => {
        const gmailConnected = searchParams?.get("gmail_connected");
        const email = searchParams?.get("email");
        const gmailError = searchParams?.get("gmail_error");

        let shouldCleanUrl = false;

        if (gmailError) {
            showError({
                title: "Gmail OAuth error",
                message: decodeURIComponent(gmailError),
            });
            shouldCleanUrl = true;
        }


        if (gmailConnected === "true") {
            showSuccess({
                title: "Úspěch",
                message: email
                    ? `Gmail účet ${email} byl připojen.`
                    : "Gmail účet byl připojen.",
                duration: 4000,
            });
            shouldCleanUrl = true;
        }

        if (shouldCleanUrl) {
            router.replace(`/settings/${troopId}`);
        }
    }, [searchParams, troopId, connectEmailProvider, router, showError]);

    if (!troop) {
        return <div>Načítání...</div>
    }

    const emailProvider = (troop as any).emailProvider;
    const gmailOAuth = (troop as any).gmailOAuth; // Legacy
    const isConnected = !!emailProvider || !!gmailOAuth;
    const currentProvider = emailProvider?.provider || (gmailOAuth ? "gmail" : null);

    const startProviderFlow = (provider: EmailProvider) => {
        if (provider === "gmail") {
            setSelectedProvider(null);
            handleGmailConnect();
            return;
        }

        setSelectedProvider(provider);
    };

    const handleProviderSelect = (provider: EmailProvider) => {
        setShowProviderSelector(false);
        startProviderFlow(provider);
    };

    const handleGmailConnect = (returnAction?: string) => {
        setIsConnecting(true);
        const url = returnAction 
            ? `/settings/${troopId}/gmail-connect?returnAction=${returnAction}`
            : `/settings/${troopId}/gmail-connect`;
        router.push(url);
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
            showSuccess({
                title: "✅ Úspěch",
                message: `${config.name} byl úspěšně připojen.`,
            });
            // Close modal silently after connection
            setSelectedProvider(null);
            setSmtpEmail("");
            setSmtpPassword("");
        } catch (error: any) {
            showError({
                title: "❌ Chyba",
                message: "Nepodařilo se připojit e-mailový účet.",
                details: error?.message,
                canReport: true,
            });
        } finally {
            setIsConnecting(false);
        }
    };

    const handleTestConnection = async () => {
        if (!selectedProvider || !smtpEmail || !smtpPassword) {
            return;
        }

        setIsTesting(true);
        try {
            const results = await testEmailConnection({
                troopId,
                provider: selectedProvider,
                email: smtpEmail,
                password: smtpPassword,
            });

            let message = '';
            let allGood = true;

            if (results.smtp.success) {
                message += '✓ SMTP: Připojeno\n';
            } else {
                message += '✗ SMTP: Chyba\n';
                allGood = false;
            }

            if (results.imap.success) {
                message += '✓ IMAP: Připojeno\n';
            } else {
                message += '✗ IMAP: Chyba\n';
                allGood = false;
            }

            if (allGood) {
                showSuccess({
                    title: "✓ Test úspěšný",
                    message: "E-mailové připojení funguje správně!\n\n" + message,
                });
            } else {
                showError({
                    title: "⚠️ Test selhal",
                    message: message + "\n\nZkontrolujte své přihlašovací údaje.",
                    details: results.smtp.error || results.imap.error,
                });
            }
        } catch (error: any) {
            showError({
                title: "✗ Chyba při testování",
                message: "Nepodařilo se otestovat připojení.",
                details: error?.message,
            });
        } finally {
            setIsTesting(false);
        }
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
                    Propojte e-mailového poskytovatele pro odesílání zpráv členům. Podporujeme Gmail, Seznam a Centrum.
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
                            {Object.entries(PROVIDER_CONFIGS)
                                .map(([key, config]) => {
                                    const iconNode = typeof config.icon === "function" ? config.icon() : config.icon;
                                    return (
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
                                                <div style={{ fontSize: "2.5rem", width: "2.5rem", height: "2.5rem" }}>
                                                    {iconNode}
                                                </div>
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
                                    );
                                })}
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
                                onClick={handleTestConnection}
                                disabled={isTesting || !smtpEmail || !smtpPassword}
                                style={{
                                    padding: "0.85rem",
                                    backgroundColor: isTesting || !smtpEmail || !smtpPassword ? "#e5e7eb" : "#fef08a",
                                    border: "3px solid #000",
                                    borderRadius: "10px",
                                    fontWeight: "900",
                                    cursor: isTesting || !smtpEmail || !smtpPassword ? "not-allowed" : "pointer",
                                    boxShadow: "3px 3px 0 0 #000"
                                }}
                            >
                                {isTesting ? "Testuji..." : "Otestovat připojení"}
                            </button>

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
