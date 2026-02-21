"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { useFeedback } from "@/context/FeedbackContext";
import styles from "./page.module.css";
import { SupernotesCard } from "@/lib/supernotes";

type Tab = "errors" | "features" | "submit" | "notes";
type Status = "all" | "open" | "planned" | "completed" | "rejected";

export default function FeedbackPage() {
    const [activeTab, setActiveTab] = useState<Tab>("features");
    const [selectedStatus, setSelectedStatus] = useState<Status>("open");

    // Supernotes state
    const [supernotesCards, setSupernotesCards] = useState<SupernotesCard[]>([]);
    const [isLoadingNotes, setIsLoadingNotes] = useState(false);
    const [notesError, setNotesError] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>("all");

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

    // Fetch Supernotes cards when Notes tab is active
    useEffect(() => {
        if (activeTab === "notes") {
            fetchSupernotesCards();
        }
    }, [activeTab]);

    const fetchSupernotesCards = async () => {
        setIsLoadingNotes(true);
        setNotesError(null);
        try {
            // Fetch all cards (excluding junk/tasks/thoughts)
            const response = await fetch('/api/supernotes');
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch notes`);
            }
            const data = await response.json();
            setSupernotesCards(data.cards || []);
        } catch (error: any) {
            setNotesError(error.message || 'Failed to load notes');
            console.error('Error fetching Supernotes:', error);
        } finally {
            setIsLoadingNotes(false);
        }
    };

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

    const handleVote = async (requestId: Id<"feature_requests">, vote: number) => {
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
                    className={`${styles.tab} ${activeTab === "notes" ? styles.active : ""}`}
                    onClick={() => setActiveTab("notes")}
                >
                    📝 Moje poznámky
                </button>
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
                {/* Notes Tab */}
                {activeTab === "notes" && (
                    <div>
                        <div className={styles.notesHeader}>
                            <h2>📝 Moje Supernotes poznámky</h2>
                            <div className={styles.filterBar}>
                                <label>Kategorie:</label>
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className={styles.select}
                                >
                                    <option value="all">Všechny</option>
                                    <option value="REF">REF: Refaktoring</option>
                                    <option value="FEAT">FEAT: Nové funkce</option>
                                    <option value="FIX">FIX: Opravy</option>
                                </select>
                            </div>
                        </div>

                        {isLoadingNotes ? (
                            <div className={styles.loading}>
                                <p>Načítám poznámky ze Supernotes...</p>
                            </div>
                        ) : notesError ? (
                            <div className={styles.error}>
                                <p>❌ Chyba: {notesError}</p>
                                <button 
                                    onClick={fetchSupernotesCards}
                                    className={styles.retryBtn}
                                >
                                    🔄 Zkusit znovu
                                </button>
                            </div>
                        ) : supernotesCards.length > 0 ? (
                            <div className={styles.notesGrid}>
                                {supernotesCards.map((card) => {
                                    // Parse card name to extract category and status
                                    // Format: CATEGORY:STATUS:Title or CATEGORY:Title
                                    const nameParts = card.name.split(':');
                                    let category = 'OTHER';
                                    let status = '';
                                    let displayName = card.name;

                                    if (nameParts.length >= 2) {
                                        category = nameParts[0].trim().toUpperCase();
                                        
                                        // Check if second part is a status
                                        const secondPart = nameParts[1].trim().toUpperCase();
                                        const statusKeywords = ['PROBIHA', 'DONE', 'TODO', 'IN_PROGRESS', 'PENDING', 'BLOCKED'];
                                        
                                        if (statusKeywords.includes(secondPart)) {
                                            status = secondPart;
                                            displayName = nameParts.slice(2).join(':').trim();
                                        } else {
                                            displayName = nameParts.slice(1).join(':').trim();
                                        }
                                    }

                                    const categoryColors: Record<string, string> = {
                                        REF: '#3b82f6',
                                        FEAT: '#10b981',
                                        FIX: '#f59e0b',
                                        OTHER: '#6b7280',
                                    };

                                    const statusColors: Record<string, string> = {
                                        PROBIHA: '#ec4899',
                                        DONE: '#10b981',
                                        TODO: '#6b7280',
                                        IN_PROGRESS: '#f59e0b',
                                        PENDING: '#f59e0b',
                                        BLOCKED: '#ef4444',
                                    };

                                    return (
                                        <div 
                                            key={card.id} 
                                            className={styles.noteCard}
                                            style={{ borderLeftColor: categoryColors[category] || categoryColors['OTHER'] }}
                                        >
                                            <div className={styles.noteHeader}>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1 }}>
                                                    <span 
                                                        className={styles.noteCategory}
                                                        style={{ backgroundColor: categoryColors[category] || categoryColors['OTHER'] }}
                                                    >
                                                        {category}
                                                    </span>
                                                    {status && (
                                                        <span 
                                                            className={styles.noteStatus}
                                                            style={{ backgroundColor: statusColors[status] || '#8b5cf6' }}
                                                        >
                                                            {status}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className={styles.noteDate}>
                                                    {new Date(card.created_when).toLocaleDateString("cs-CZ")}
                                                </span>
                                            </div>
                                            <h3 className={styles.noteTitle}>{displayName}</h3>
                                            <div 
                                                className={styles.noteContent}
                                                dangerouslySetInnerHTML={{ __html: card.html || card.markup }}
                                            />
                                            {card.tags && card.tags.length > 0 && (
                                                <div className={styles.noteTags}>
                                                    {card.tags.map((tag, idx) => (
                                                        <span key={idx} className={styles.noteTag}>
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className={styles.empty}>
                                <p>Žádné poznámky v Supernotes.</p>
                                <a 
                                    href="https://help.supernotes.app/en/articles/5257176-api-access#h_b00b107a04"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.helpLink}
                                >
                                    📚 Návod na API
                                </a>
                            </div>
                        )}
                    </div>
                )}

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
