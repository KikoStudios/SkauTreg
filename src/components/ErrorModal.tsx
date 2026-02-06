"use client";

import { useFeedback } from "@/context/FeedbackContext";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import styles from "./ErrorModal.module.css";

export default function ErrorModal() {
    const { errorConfig, closeError } = useFeedback();
    const reportError = useAction(api.feedback.createErrorReport);
    const [isReporting, setIsReporting] = useState(false);
    const [reportNotes, setReportNotes] = useState("");

    if (!errorConfig) return null;

    const handleReport = async () => {
        setIsReporting(true);
        try {
            await reportError({
                errorMessage: errorConfig.message,
                errorStack: errorConfig.details,
                url: typeof window !== "undefined" ? window.location.href : undefined,
                userNotes: reportNotes,
            });
            closeError();
            // Show success toast
            const event = new CustomEvent("showSuccess", {
                detail: {
                    title: "✅ Přijato",
                    message: "Díky! Poslali jsme tvůj report našemu týmu.",
                    duration: 3000,
                }
            });
            window.dispatchEvent(event);
        } catch (err) {
            console.error("Failed to report error:", err);
        } finally {
            setIsReporting(false);
        }
    };

    const getIconSrc = () => {
        switch (errorConfig.icon) {
            case "warning":
                return "/icons/nastaveni-icon.svg";
            case "info":
                return "/icons/home-icon.svg";
            default:
                return "/icons/nastaveni-icon-dark.svg";
        }
    };

    return (
        <div className={styles.overlay} onClick={closeError}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.titleRow}>
                        <span className={styles.icon}>
                            <img src={getIconSrc()} alt="icon" style={{ width: "24px", height: "24px" }} />
                        </span>
                        <h2 className={styles.title}>
                            {errorConfig.title || "Chyba"}
                        </h2>
                    </div>
                    <button className={styles.closeBtn} onClick={closeError}>
                        ✕
                    </button>
                </div>

                <div className={styles.content}>
                    <p className={styles.message}>{errorConfig.message}</p>

                    {errorConfig.details && (
                        <details className={styles.details}>
                            <summary>Technické detaily</summary>
                            <pre className={styles.stack}>{errorConfig.details}</pre>
                        </details>
                    )}

                    {errorConfig.canReport && (
                        <div className={styles.reportSection}>
                            <label className={styles.label}>
                                Poznámka (volitelně):
                            </label>
                            <textarea
                                value={reportNotes}
                                onChange={(e) => setReportNotes(e.target.value)}
                                placeholder="Popište co se stalo (např. co jste dělali když se chyba objevila)..."
                                className={styles.textarea}
                                rows={3}
                            />
                        </div>
                    )}
                </div>

                <div className={styles.footer}>
                    <div className={styles.buttonGroup}>
                        {errorConfig.buttons?.map((btn, idx) => (
                            <button
                                key={idx}
                                className={`${styles.button} ${styles[btn.variant || "secondary"]}`}
                                onClick={() => {
                                    btn.onClick();
                                    closeError();
                                }}
                            >
                                {btn.label}
                            </button>
                        ))}

                        {errorConfig.canReport && (
                            <button
                                className={`${styles.button} ${styles.danger}`}
                                onClick={handleReport}
                                disabled={isReporting}
                            >
                                {isReporting ? "Odesílám..." : "🐛 Poslat na kontrolu"}
                            </button>
                        )}

                        <button
                            className={`${styles.button} ${styles.secondary}`}
                            onClick={closeError}
                        >
                            Zavřít
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
