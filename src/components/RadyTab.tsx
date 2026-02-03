"use client";

import React, { useState, Fragment } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Id } from "../../convex/_generated/dataModel";

const SpinningLogo = ({ src, alt = "Logo" }: { src?: string; alt?: string }) => (
    <div style={{
        width: "50px", height: "50px", borderRadius: "50%", border: "2px solid #000",
        backgroundColor: "#ccc", boxShadow: "2px 2px 0 0 #000", position: "relative",
        overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
    }}>
        {src ? (
            <img src={src} alt={alt} style={{ width: "100%", height: "100%", objectFit: "cover", animation: "spin 10s linear infinite" }} />
        ) : (
            <span style={{ fontSize: "0.6rem", fontWeight: "bold" }}>LOGO</span>
        )}
        <style jsx>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
);

interface CreateModalProps {
    onClose: () => void;
    onCreate: (title: string, description: string) => void;
    tripName?: string;
}

function CreateModal({ onClose, onCreate, tripName }: CreateModalProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    const handleSubmit = () => {
        if (title.trim()) {
            onCreate(title, description);
            onClose();
        }
    };

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0, 0, 0, 0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "white",
                    border: "3px solid #000",
                    borderRadius: "16px",
                    padding: "2rem",
                    maxWidth: "500px",
                    width: "90%",
                    boxShadow: "8px 8px 0 0 #000",
                }}
            >
                <h2 style={{ margin: "0 0 1.5rem 0", fontWeight: "900", fontSize: "1.5rem" }}>
                    Nový Notebook {tripName ? `pro: ${tripName}` : ""}
                </h2>

                <div style={{ marginBottom: "1.5rem" }}>
                    <label style={{ display: "block", fontWeight: "700", marginBottom: "0.5rem" }}>
                        Název
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Zadejte název notebooku"
                        autoFocus
                        style={{
                            width: "100%",
                            padding: "0.75rem",
                            border: "3px solid #000",
                            borderRadius: "8px",
                            fontSize: "1rem",
                            fontWeight: "600",
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleSubmit();
                            if (e.key === "Escape") onClose();
                        }}
                    />
                </div>

                <div style={{ marginBottom: "2rem" }}>
                    <label style={{ display: "block", fontWeight: "700", marginBottom: "0.5rem" }}>
                        Popis (nepovinný)
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Přidejte popis"
                        rows={3}
                        style={{
                            width: "100%",
                            padding: "0.75rem",
                            border: "3px solid #000",
                            borderRadius: "8px",
                            fontSize: "1rem",
                            fontFamily: "inherit",
                            resize: "vertical",
                        }}
                    />
                </div>

                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: "0.75rem 1.5rem",
                            background: "white",
                            border: "3px solid #000",
                            borderRadius: "8px",
                            fontWeight: "900",
                            cursor: "pointer",
                            fontSize: "1rem",
                            boxShadow: "4px 4px 0 0 #000",
                            transition: "all 0.1s",
                        }}
                        onMouseDown={(e) => {
                            e.currentTarget.style.transform = "translate(2px, 2px)";
                            e.currentTarget.style.boxShadow = "2px 2px 0 0 #000";
                        }}
                        onMouseUp={(e) => {
                            e.currentTarget.style.transform = "translate(0, 0)";
                            e.currentTarget.style.boxShadow = "4px 4px 0 0 #000";
                        }}
                    >
                        Zrušit
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!title.trim()}
                        style={{
                            padding: "0.75rem 1.5rem",
                            background: title.trim() ? "#fcd34d" : "#e5e5e5",
                            border: "3px solid #000",
                            borderRadius: "8px",
                            fontWeight: "900",
                            cursor: title.trim() ? "pointer" : "not-allowed",
                            fontSize: "1rem",
                            boxShadow: "4px 4px 0 0 #000",
                            transition: "all 0.1s",
                        }}
                        onMouseDown={(e) => {
                            if (title.trim()) {
                                e.currentTarget.style.transform = "translate(2px, 2px)";
                                e.currentTarget.style.boxShadow = "2px 2px 0 0 #000";
                            }
                        }}
                        onMouseUp={(e) => {
                            if (title.trim()) {
                                e.currentTarget.style.transform = "translate(0, 0)";
                                e.currentTarget.style.boxShadow = "4px 4px 0 0 #000";
                            }
                        }}
                    >
                        Vytvořit
                    </button>
                </div>
            </div>
        </div>
    );
}

interface DeleteModalProps {
    onClose: () => void;
    onConfirm: () => void;
    notebookTitle: string;
}

function DeleteModal({ onClose, onConfirm, notebookTitle }: DeleteModalProps) {
    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0, 0, 0, 0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "white",
                    border: "3px solid #000",
                    borderRadius: "16px",
                    padding: "2rem",
                    maxWidth: "450px",
                    width: "90%",
                    boxShadow: "8px 8px 0 0 #000",
                }}
            >
                <h2 style={{ margin: "0 0 1rem 0", fontWeight: "900", fontSize: "1.5rem" }}>
                    Smazat notebook?
                </h2>
                <p style={{ margin: "0 0 2rem 0", color: "#666", lineHeight: 1.6 }}>
                    Opravdu chcete smazat notebook <strong>"{notebookTitle}"</strong>? Tato akce je nevratná a smaže všechny stránky a soubory v tomto notebooku.
                </p>
                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: "0.75rem 1.5rem",
                            background: "white",
                            border: "3px solid #000",
                            borderRadius: "8px",
                            fontWeight: "900",
                            cursor: "pointer",
                            fontSize: "1rem",
                            boxShadow: "4px 4px 0 0 #000",
                            transition: "all 0.1s",
                        }}
                    >
                        Zrušit
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            padding: "0.75rem 1.5rem",
                            background: "#ef4444",
                            color: "white",
                            border: "3px solid #000",
                            borderRadius: "8px",
                            fontWeight: "900",
                            cursor: "pointer",
                            fontSize: "1rem",
                            boxShadow: "4px 4px 0 0 #000",
                            transition: "all 0.1s",
                        }}
                    >
                        Smazat
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function RadyTab() {
    const troops = useQuery(api.troops.getByUser);
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const troopIdParam = searchParams.get("troopId");

    const [selectedTroopId, setSelectedTroopId] = useState<Id<"troops"> | null>(
        troopIdParam ? (troopIdParam as Id<"troops">) : null
    );
    const [activeTab, setActiveTab] = useState<"all" | "trips" | "personal">("all");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForTripId, setCreateForTripId] = useState<Id<"trips"> | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ id: Id<"meetings">; title: string } | null>(null);

    const handleTroopChange = (newTroopId: string) => {
        const id = newTroopId as Id<"troops">;
        setSelectedTroopId(id);
        const params = new URLSearchParams(searchParams);
        params.set("troopId", newTroopId);
        router.replace(`${pathname}?${params.toString()}`);
    };

    if (troops && troops.length > 0 && !selectedTroopId) {
        setSelectedTroopId(troops[0]._id);
    }

    const selectedTroop = troops?.find(t => t._id === selectedTroopId);

    const meetings = useQuery(api.meetings.list, selectedTroopId ? { troopId: selectedTroopId } : "skip");
    const trips = useQuery(api.trips.list, selectedTroopId ? { troopId: selectedTroopId } : "skip");
    const createMeeting = useMutation(api.meetings.create);
    const deleteMeeting = useMutation(api.meetings.deleteMeeting);

    // Grouping logic
    const meetingsByTrip = new Map<string | "standalone", any[]>();
    meetings?.forEach(m => {
        const key = m.tripId || "standalone";
        if (!meetingsByTrip.has(key)) meetingsByTrip.set(key, []);
        meetingsByTrip.get(key)?.push(m);
    });

    const handleCreate = async (title: string, description: string, tripId?: Id<"trips">, category: string = "notebook") => {
        if (!selectedTroopId) return;
        const id = await createMeeting({ troopId: selectedTroopId, title, description, tripId, category });
        router.push(`/rady/${id}`);
    };

    const handleOpenTripDocs = async (tripId: Id<"trips">, tripName: string) => {
        if (!selectedTroopId) return;
        
        // Check if documentation already exists
        const existing = meetings?.find(m => m.tripId === tripId && m.category === "documentation");
        if (existing) {
            router.push(`/rady/${existing._id}`);
        } else {
            // Create the specialized documentation meeting
            const id = await createMeeting({ 
                troopId: selectedTroopId, 
                title: `Dokumentace: ${tripName}`, 
                description: `Sjednocená dokumentace a podklady k výpravě`, 
                tripId, 
                category: "documentation" 
            });
            router.push(`/rady/${id}`);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        await deleteMeeting({ meetingId: deleteTarget.id });
        setDeleteTarget(null);
    };

    if (troops === undefined) return <div>Načítám...</div>;
    if (troops.length === 0) return <div>Nejdříve si musíte vytvořit oddíl.</div>;

    const renderMeetingCard = (meeting: any) => (
        <div
            key={meeting._id}
            style={{
                border: "3px solid #000",
                borderRadius: "16px",
                padding: "1.5rem",
                backgroundColor: "white",
                boxShadow: "6px 6px 0 0 #000",
                transition: "all 0.1s",
                cursor: "pointer",
                position: "relative",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translate(-2px, -2px)";
                e.currentTarget.style.boxShadow = "8px 8px 0 0 #000";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translate(0, 0)";
                e.currentTarget.style.boxShadow = "6px 6px 0 0 #000";
            }}
        >
            <div onClick={() => router.push(`/rady/${meeting._id}`)}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "900", marginBottom: "0.5rem", lineHeight: 1.3 }}>
                    {meeting.title}
                </h3>
                {meeting.description && (
                    <p style={{ color: "#666", fontSize: "0.9rem", margin: 0, lineHeight: 1.5 }}>
                        {meeting.description}
                    </p>
                )}
            </div>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget({ id: meeting._id, title: meeting.title });
                }}
                style={{
                    position: "absolute",
                    top: "1rem",
                    right: "1rem",
                    padding: "0.5rem",
                    background: "white",
                    border: "2px solid #000",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "1.2rem",
                    lineHeight: 1,
                    transition: "all 0.1s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#fee"}
                onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                title="Smazat radu"
            >
                🗑️
            </button>
        </div>
    );

    return (
        <div style={{ width: "100%", position: "relative", overflowX: "hidden" }}>
            {/* Top Title Bar removed as it's typically handled by the page wrapper or breadcrumbs */}

            {/* Controls Row */}
            <div className="controls-row">
                <div className="troop-selector-container">
                    {troops.length > 0 && (
                        <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
                            <select
                                value={selectedTroopId || ""}
                                onChange={(e) => handleTroopChange(e.target.value)}
                                className="troop-select"
                            >
                                {troops.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                            </select>
                            <span className="custom-arrow">▼</span>
                        </div>
                    )}
                    {selectedTroop && (
                        <div className="spinning-logo-container">
                            <SpinningLogo src={selectedTroop.logo} />
                        </div>
                    )}
                </div>

                {/* Tabs Navigation - Repositioned between selector and button */}
                <div className="tabs-container">
                    <button 
                        className={`tab-button ${activeTab === "all" ? "active" : ""}`}
                        onClick={() => setActiveTab("all")}
                    >
                        VŠE
                    </button>
                    <button 
                        className={`tab-button ${activeTab === "trips" ? "active" : ""}`}
                        onClick={() => setActiveTab("trips")}
                    >
                        VÝPRAVY
                    </button>
                    <button 
                        className={`tab-button ${activeTab === "personal" ? "active" : ""}`}
                        onClick={() => setActiveTab("personal")}
                    >
                        RADY
                    </button>
                </div>

                {/* Add Button */}
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="add-button"
                    onMouseDown={e => e.currentTarget.style.transform = "translate(2px, 2px)"}
                    onMouseUp={e => e.currentTarget.style.transform = "translate(0, 0)"}
                >
                    <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>+</span> NOVÁ RADA
                </button>
            </div>

            <style jsx>{`
                .controls-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                    flex-wrap: wrap;
                    gap: 2rem;
                    border-bottom: 3px solid #000;
                    padding-bottom: 1rem;
                }
                .troop-selector-container {
                    display: flex;
                    align-items: center;
                    position: relative;
                }
                .troop-select {
                    padding: 0.75rem 3rem 0.75rem 1.5rem;
                    border-radius: 999px;
                    border: 3px solid #000;
                    box-shadow: 4px 4px 0 0 #000;
                    font-weight: 900;
                    font-size: 1.2rem;
                    appearance: none;
                    background-color: white;
                    cursor: pointer;
                    line-height: 1;
                    padding-right: 60px;
                    max-width: 100%;
                }
                .custom-arrow {
                    position: absolute;
                    right: 15px;
                    top: 55%;
                    transform: translateY(-50%);
                    pointer-events: none;
                    font-weight: bold;
                }
                .spinning-logo-container {
                    margin-left: -25px;
                    z-index: 2;
                }
                .add-button {
                    padding: 0.6rem 1.5rem;
                    border-radius: 12px;
                    background-color: white;
                    border: 3px solid #000;
                    box-shadow: 4px 4px 0 0 #000;
                    font-size: 1rem;
                    font-weight: 900;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    white-space: nowrap;
                    transition: all 0.1s;
                }
                .add-button:hover {
                    box-shadow: 6px 6px 0 0 #000;
                    transform: translate(-2px, -2px);
                    background-color: #fcd34d;
                }
                .tabs-container {
                    display: flex;
                    gap: 0.5rem;
                    flex: 1;
                    justify-content: center;
                }
                .tab-button {
                    padding: 0.5rem 1rem;
                    font-weight: 900;
                    font-size: 1rem;
                    cursor: pointer;
                    background: none;
                    border: 3px solid transparent;
                    border-radius: 10px;
                    transition: all 0.1s;
                    color: #666;
                }
                .tab-button.active {
                    color: #000;
                    background: #fcd34d66;
                    border-color: #000;
                }
                .tab-button:hover {
                    color: #000;
                    background: #f3f4f6;
                }
                .trip-folder {
                    grid-column: 1 / -1;
                    margin-top: 1rem;
                    margin-bottom: 1rem;
                }
                .trip-folder-header {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 1rem;
                    padding: 0.5rem 1rem;
                    background: #f3f4f6;
                    border: 3px solid #000;
                    border-radius: 12px;
                    box-shadow: 4px 4px 0 0 #000;
                    width: fit-content;
                }
                .folder-icon {
                    font-size: 1.5rem;
                }
                .trip-name {
                    font-weight: 900;
                    font-size: 1.1rem;
                }
                .folder-add-button {
                    padding: 0.25rem 0.6rem;
                    border: 2px solid #000;
                    border-radius: 6px;
                    background: #fcd34d;
                    cursor: pointer;
                    font-weight: 900;
                    font-size: 0.8rem;
                    transition: all 0.1s;
                    margin-left: auto;
                }
                .folder-add-button:hover {
                    box-shadow: 2px 2px 0 0 #000;
                    transform: translate(-1px, -1px);
                    background: #fde68a;
                }
                .folder-add-button:active {
                    transform: translate(1px, 1px);
                    box-shadow: 0 0 0 0 #000;
                }
            `}</style>

            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "1.5rem",
            }}>
                {/* 1. Trip Folders */}
                {(activeTab === "all" || activeTab === "trips") && Array.from(meetingsByTrip.entries())
                    .filter(([tripId]) => tripId !== "standalone")
                    .map(([tripId, meetings]) => {
                        const trip = trips?.find(t => t._id === tripId);
                        // VÝPRAVY tab ONLY shows actual trip documentation (The "Specialized Docs" Pillar)
                        const docMeeting = meetings.find(m => m.category === "documentation");
                        
                        const accentColor = selectedTroop?.accentColor || "#000";
                        return (
                            <Fragment key={tripId}>
                                <div className="trip-folder" style={{ 
                                    border: `3px solid ${accentColor}`,
                                    borderRadius: "16px",
                                    marginBottom: "1.5rem",
                                    overflow: "hidden",
                                    boxShadow: `6px 6px 0 0 ${accentColor}33`
                                }}>
                                    <div className="trip-folder-header" style={{
                                        background: `${accentColor}15`,
                                        padding: "1.5rem",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        gap: "1rem"
                                    }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                            <span style={{ fontSize: "2rem" }}>📂</span>
                                            <div>
                                                <div style={{ fontSize: "0.75rem", fontWeight: "900", color: accentColor, textTransform: "uppercase", letterSpacing: "0.1em" }}>Výprava</div>
                                                <div style={{ fontSize: "1.25rem", fontWeight: "900", color: "#000" }}>{trip?.name || "Neznámá výprava"}</div>
                                            </div>
                                        </div>
                                        
                                        <button 
                                            className="folder-add-button"
                                            onClick={() => handleOpenTripDocs(tripId as Id<"trips">, trip?.name || "")}
                                            style={{
                                                background: accentColor,
                                                color: "white",
                                                padding: "0.75rem 1.5rem",
                                                borderRadius: "12px",
                                                border: "3px solid #000",
                                                fontWeight: "900",
                                                cursor: "pointer",
                                                boxShadow: "4px 4px 0 0 #000",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "0.5rem"
                                            }}
                                        >
                                            {docMeeting ? "OTEVŘÍT DOKUMENTACI" : "+ VYTVOŘIT DOKUMENTACI"}
                                        </button>
                                    </div>
                                </div>
                            </Fragment>
                        );
                    })}

                {/* 2. RADY (Council Track) - All notebooks, linked or not */}
                {(activeTab === "personal") && (
                    <div style={{ gridColumn: "1 / -1" }}>
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                            gap: "1.5rem",
                        }}>
                            {meetings?.filter(m => m.category === "notebook").map(renderMeetingCard)}
                        </div>
                    </div>
                )}

                {/* 3. Rady for "VŠE" tab - Show all councils below the folders */}
                {(activeTab === "all") && (meetings?.filter(m => m.category === "notebook").length ?? 0) > 0 && (
                    <div style={{ gridColumn: "1 / -1", marginTop: "2rem" }}>
                        <h2 style={{ fontSize: "1.5rem", fontWeight: "900", marginBottom: "1rem" }}>Ostatní rady</h2>
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                            gap: "1.5rem",
                        }}>
                            {meetings?.filter(m => m.category === "notebook").map(renderMeetingCard)}
                        </div>
                    </div>
                )}

                {meetings?.length === 0 && (
                    <div style={{
                        gridColumn: "1 / -1",
                        textAlign: "center",
                        padding: "5rem 3rem",
                        color: "#999",
                        fontStyle: "italic",
                        background: "#f9fafb",
                        border: "3px dashed #e5e7eb",
                        borderRadius: "24px"
                    }}>
                        Žádné aktivní dokumenty. Začněte vytvořením první rady!
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <CreateModal
                    onClose={() => {
                        setShowCreateModal(false);
                        setCreateForTripId(null);
                    }}
                    onCreate={(title, desc) => handleCreate(title, desc, createForTripId || undefined, createForTripId ? "documentation" : "notebook")}
                    tripName={trips?.find(t => t._id === createForTripId)?.name}
                />
            )}

            {/* Delete Modal */}
            {deleteTarget && (
                <DeleteModal
                    onClose={() => setDeleteTarget(null)}
                    onConfirm={handleDelete}
                    notebookTitle={deleteTarget.title}
                />
            )}
        </div>
    );
}
