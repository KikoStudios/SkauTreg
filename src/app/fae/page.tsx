"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState } from "react";
import { useFeedback } from "@/context/FeedbackContext";
import styles from "./page.module.css";

type Tab = "errors" | "features" | "submit";
type Status = "all" | "open" | "planned" | "completed" | "rejected";

export default function FeedbackPage() {
    const [activeTab, setActiveTab] = useState<Tab>("features");
    const [selectedStatus, setSelectedStatus] = useState<Status>("open");

    // Queries
    const errorReports = useQuery(api.feedback.getErrorReports, {});
    const featureRequests = useQuery(api.feedback.getFeatureRequests, {
        status: selectedStatus === "all" ? undefined : selectedStatus,
    });

    // Mutations
    const createFeature = useMutation(api.feedback.createFeatureRequest);
    const voteFeature = useMutation(api.feedback.voteOnFeature);

    // Form state
    const [featureTitle, setFeatureTitle] = useState("");
    const [featureDesc, setFeatureDesc] = useState("");
    const [isSubmittingFeature, setIsSubmittingFeature] = useState(false);

    const { showSuccess, showError } = useFeedback();

    const handleSubmitFeature = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!featureTitle.trim() || !featureDesc.trim()) {
            showError({
                message: "Vyplňte prosím název a popis",
                icon: "warning",
            });
            return;
        }

        setIsSubmittingFeature(true);
        try {
            await createFeature({
                title: featureTitle,
                description: featureDesc,
                category: "feature",
            });
            setFeatureTitle("");
            setFeatureDesc("");
            setActiveTab("features");
            showSuccess({
                title: "✅ Děkujeme!",
                message: "Tvůj návrh byl přijat. Ostatní mohou hlasovat.",
                duration: 3000,
            });
        } catch (err: any) {
            showError({
                message: err.message || "Nepodařilo se odeslat návrh",
                icon: "error",
                canReport: true,
            });
        } finally {
            setIsSubmittingFeature(false);
        }
    };

    const handleVote = async (requestId: string, vote: number) => {
        try {
            await voteFeature({ requestId, vote });
        } catch (err: any) {
            showError({
                message: "Hlasování se nepodařilo",
                icon: "error",
            });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "open":
                return "#3b82f6";
            case "planned":
                return "#f59e0b";
            case "completed":
                return "#10b981";
            case "rejected":
                return "#ef4444";
            default:
                return "#6b7280";
        }
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            open: "🔓 Otevřeno",
            planned: "📋 Plánováno",
            completed: "✅ Hotovo",
            rejected: "❌ Zamítnuto",
        };
        return labels[status] || status;
    };

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <h1 className={styles.title}>💡 Nápady & Chyby</h1>
                <p className={styles.subtitle}>
                    Máš nápad na funkci, která by se ti hodila? Napiš nám. Také můžeš hlasovat o nápadech ostatních.
                </p>
            </div>

            {/* Tabs */}
            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === "features" ? styles.active : ""}`}
                    onClick={() => setActiveTab("features")}
                >
                    💡 Nápady na funkce
                </button>
                <button
                    className={`${styles.tab} ${activeTab === "errors" ? styles.active : ""}`}
                    onClick={() => setActiveTab("errors")}
                >
                    🐛 Hlášené chyby
                </button>
                <button
                    className={`${styles.tab} ${activeTab === "submit" ? styles.active : ""}`}
                    onClick={() => setActiveTab("submit")}
                >
                    ✍️ Nový návrh
                </button>
            </div>

            {/* Content */}
            <div className={styles.content}>
                {/* Features Tab */}
                {activeTab === "features" && (
                    <div>
                        <div className={styles.filterBar}>
                            <label>Filtrovat dle stavu:</label>
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value as Status)}
                                className={styles.select}
                            >
                                <option value="all">Všechny</option>
                                <option value="open">Otevřené</option>
                                <option value="planned">Plánované</option>
                                <option value="completed">Hotové</option>
                                <option value="rejected">Zamítnuté</option>
                            </select>
                        </div>

                        {featureRequests && featureRequests.length > 0 ? (
                            <div className={styles.featuresList}>
                                {featureRequests.map((feature: any) => (
                                    <div key={feature._id} className={styles.featureCard}>
                                        <div className={styles.featureHeader}>
                                            <div className={styles.featureInfo}>
                                                <h3 className={styles.featureTitle}>
                                                    {feature.title}
                                                </h3>
                                                <div className={styles.featureMeta}>
                                                    <span
                                                        className={styles.status}
                                                        style={{
                                                            backgroundColor: getStatusColor(feature.status),
                                                        }}
                                                    >
                                                        {getStatusLabel(feature.status)}
                                                    </span>
                                                    <span className={styles.author}>
                                                        od {feature.author?.name || "Anonym"}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className={styles.voteButton}>
                                                <button
                                                    className={`${styles.upvote} ${
                                                        feature.userVote === 1 ? styles.voted : ""
                                                    }`}
                                                    onClick={() =>
                                                        handleVote(
                                                            feature._id,
                                                            feature.userVote === 1 ? 0 : 1
                                                        )
                                                    }
                                                >
                                                    👍
                                                </button>
                                                <span className={styles.voteCount}>
                                                    {feature.votes}
                                                </span>
                                            </div>
                                        </div>

                                        <p className={styles.featureDesc}>
                                            {feature.description}
                                        </p>

                                        <div className={styles.featureFooter}>
                                            <small>
                                                {new Date(feature.createdAt).toLocaleDateString(
                                                    "cs-CZ"
                                                )}
                                            </small>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.empty}>
                                <p>Žádné nápady s tímto stavem.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Errors Tab */}
                {activeTab === "errors" && (
                    <div>
                        {errorReports && errorReports.length > 0 ? (
                            <div className={styles.errorsList}>
                                {errorReports.map((report: any) => (
                                    <div key={report._id} className={styles.errorCard}>
                                        <div className={styles.errorHeader}>
                                            <h3 className={styles.errorTitle}>
                                                {report.errorMessage.substring(0, 100)}...
                                            </h3>
                                            <span
                                                className={styles.errorStatus}
                                                style={{
                                                    backgroundColor:
                                                        report.status === "new"
                                                            ? "#ef4444"
                                                            : report.status === "investigating"
                                                            ? "#f59e0b"
                                                            : "#10b981",
                                                }}
                                            >
                                                {report.status === "new"
                                                    ? "🆕 Nová"
                                                    : report.status === "investigating"
                                                    ? "🔍 Vyšetřujeme"
                                                    : "✅ Vyřešeno"}
                                            </span>
                                        </div>

                                        <div className={styles.errorBody}>
                                            <p className={styles.errorMsg}>
                                                <strong>Zpráva:</strong> {report.errorMessage}
                                            </p>
                                            {report.userNotes && (
                                                <p className={styles.errorNotes}>
                                                    <strong>Poznámka uživatele:</strong>{" "}
                                                    {report.userNotes}
                                                </p>
                                            )}
                                            {report.url && (
                                                <p className={styles.errorUrl}>
                                                    <strong>Stránka:</strong>{" "}
                                                    <code>{report.url}</code>
                                                </p>
                                            )}
                                        </div>

                                        <div className={styles.errorFooter}>
                                            <small>
                                                {new Date(report.reportedAt).toLocaleDateString(
                                                    "cs-CZ"
                                                )}{" "}
                                                {report.author?.email && (
                                                    <span> • od {report.author.email}</span>
                                                )}
                                            </small>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.empty}>
                                <p>Žádné hlášené chyby. Skvěle! 🎉</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Submit Tab */}
                {activeTab === "submit" && (
                    <div className={styles.submitForm}>
                        <form onSubmit={handleSubmitFeature}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>
                                    Název nápadu *
                                </label>
                                <input
                                    type="text"
                                    value={featureTitle}
                                    onChange={(e) => setFeatureTitle(e.target.value)}
                                    placeholder="Např. Tmavý režim, Export do PDF, Notifikace přes email..."
                                    className={styles.input}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>
                                    Popis *
                                </label>
                                <textarea
                                    value={featureDesc}
                                    onChange={(e) => setFeatureDesc(e.target.value)}
                                    placeholder="Popište podrobněji jak by měla funkce fungovat, proč by byla užitečná..."
                                    rows={6}
                                    className={styles.textarea}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmittingFeature}
                                className={styles.submitBtn}
                            >
                                {isSubmittingFeature ? "Odesílám..." : "✅ Odeslat návrh"}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
