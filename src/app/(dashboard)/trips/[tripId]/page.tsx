"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import TripForm, { TripFormData } from "../../../../components/TripForm";
import Button from "../../../../components/Button";

type TabType = 'info' | 'zakladna' | 'doprava' | 'ucastnici' | 'dokumentace';

export default function TripDashboardPage() {
    const params = useParams();
    const router = useRouter();
    const tripId = params.tripId as Id<"trips">;

    const dashboard = useQuery(api.trips.getDashboard, tripId ? { tripId } : "skip");
    const updateTrip = useMutation(api.trips.update);
    const deleteTrip = useMutation(api.trips.remove);
    const unassignBase = useMutation(api.trips.unassignBase);

    const [activeTab, setActiveTab] = useState<TabType>('info');
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [viewResponse, setViewResponse] = useState<any | null>(null);
    const [showCreateDoc, setShowCreateDoc] = useState(false);
    const [newDocTitle, setNewDocTitle] = useState("");

    const tripDocs = useQuery(api.meetings.listByTrip, { tripId });
    const createDoc = useMutation(api.meetings.create);

    const copyLink = async (accessKey: string) => {
        const url = `${window.location.origin}/rsvp/${accessKey}`;
        try {
            await navigator.clipboard.writeText(url);
            setCopiedKey(accessKey);
            setTimeout(() => setCopiedKey(null), 2000);
        } catch (err) {
            console.warn("Standard copy failed", err);
            // Fallback
            const textArea = document.createElement("textarea");
            textArea.value = url;
            textArea.style.position = "fixed";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                setCopiedKey(accessKey);
                setTimeout(() => setCopiedKey(null), 2000);
            } catch (e) {
                prompt("Zkopírujte odkaz:", url);
            }
            document.body.removeChild(textArea);
        }
    };

    const handleUpdate = async (data: TripFormData) => {
        setIsSaving(true);
        try {
            await updateTrip({
                id: tripId,
                name: data.name,
                description: data.description,
                location: data.location,
                startDate: data.startDate,
                endDate: data.endDate,
                formType: data.formType,
                customFields: data.customFields
            });
            setIsEditing(false);
            // Optional: Reload logic not needed as Convex is reactive
        } catch (error) {
            console.error(error);
            alert("Chyba při ukládání změn.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (confirm("Opravdu chcete smazat celou výpravu a všechny odpovědi? Tato akce je nevratná.")) {
            try {
                await deleteTrip({ id: tripId });
                router.push("/trips");
            } catch (error) {
                console.error(error);
                alert("Chyba při mazání.");
            }
        }
    }

    const handleOpenTripDocs = async () => {
        if (!trip.troopId) return;
        
        // Check if documentation already exists
        const docMeeting = tripDocs?.find(m => m.category === "documentation");
        
        if (docMeeting) {
            router.push(`/rady/${docMeeting._id}`);
        } else {
            try {
                const meetingId = await createDoc({
                    troopId: trip.troopId,
                    tripId: tripId,
                    title: `Dokumentace: ${trip.name}`,
                    description: `Sjednocená dokumentace a podklady k výpravě`,
                    category: "documentation"
                });
                router.push(`/rady/${meetingId}`);
            } catch (error) {
                console.error(error);
                alert("Chyba při vytváření dokumentu.");
            }
        }
    };

    const getParsedResponses = (responses: any) => {
        if (!responses) return {};
        let parsed = responses;

        // Try to parse if it's a string. Handle generic double-serialization safely.
        // We loop a few times in case it was stringified multiple times.
        let attempts = 0;
        while (typeof parsed === 'string' && attempts < 3) {
            try {
                const temp = JSON.parse(parsed);
                parsed = temp;
            } catch (e) {
                // Not a JSON string, stop parsing
                break;
            }
            attempts++;
        }

        // Ensure we ended up with an object (and not null)
        if (typeof parsed !== 'object' || parsed === null) {
            return {};
        }

        return parsed;
    };

    if (dashboard === undefined) {
        return <div>Načítám přehled...</div>;
    }

    if (dashboard === null) {
        return <div>Výprava nenalezena.</div>;
    }

    const { trip, participants, base } = dashboard;

    if (isEditing) {
        return (
            <div style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 3000,
                padding: "2rem"
            }} onClick={() => setIsEditing(false)}>
                <div style={{
                    backgroundColor: "white",
                    border: "2px solid var(--border-color)",
                    borderRadius: "8px",
                    boxShadow: "6px 6px 0 0 #000",
                    padding: "2rem",
                    maxWidth: "600px",
                    width: "100%",
                    maxHeight: "90vh",
                    overflowY: "auto"
                }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                        <h2 style={{ fontSize: "1.5rem", fontWeight: "900", margin: 0 }}>Upravit Výpravu</h2>
                        <button
                            onClick={() => setIsEditing(false)}
                            style={{
                                background: "none",
                                border: "none",
                                fontSize: "1.5rem",
                                cursor: "pointer",
                                fontWeight: "bold"
                            }}
                        >
                            ×
                        </button>
                    </div>
                    <TripForm
                        initialData={{
                            name: trip.name,
                            description: trip.description,
                            location: trip.location,
                            startDate: trip.startDate,
                            endDate: trip.endDate || "",
                            formType: trip.formType || "registration",
                            customFields: trip.customFields || []
                        }}
                        onSubmit={handleUpdate}
                        isLoading={isSaving}
                        buttonText="Uložit Změny"
                    />
                </div>
            </div>
        );
    }

    return (
        <div style={{ width: "100%", position: "relative" }}>
            {/* Top Title Bar */}
            <div style={{
                backgroundColor: "white",
                borderBottom: "3px solid #000",
                padding: "1rem 2rem",
                margin: "-2rem -2rem 1rem -2rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.5rem"
            }}>
                <h1 style={{ fontSize: "1.5rem", fontWeight: "900", margin: 0 }}>Rady a Výpravy</h1>
            </div>

            {/* Controls Row & Info */}
            <div style={{ marginBottom: "2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" }}>
                    <h2 style={{ fontSize: "clamp(1.5rem, 5vw, 2.5rem)", fontWeight: "900", margin: 0, lineHeight: 1.2, wordBreak: "break-word", flex: "1 1 auto" }}>{trip.name}</h2>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button
                        onClick={() => setIsEditing(true)}
                        style={{
                            padding: "0.5rem 1rem",
                            backgroundColor: "#86efac",
                            border: "2px solid #000",
                            borderRadius: "6px",
                            fontWeight: "bold",
                            cursor: "pointer",
                            boxShadow: "4px 4px 0 0 #000",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem"
                        }}
                        onMouseDown={e => e.currentTarget.style.transform = "translate(2px, 2px)"}
                        onMouseUp={e => e.currentTarget.style.transform = "translate(0, 0)"}
                    >
                        <img src="/edit-icon.svg" alt="Edit" style={{ width: "20px", height: "20px" }} /> Upravit
                    </button>
                    <button
                        onClick={handleDelete}
                        style={{
                            padding: "0.5rem 1rem",
                            backgroundColor: "#fca5a5",
                            border: "2px solid #000",
                            borderRadius: "6px",
                            fontWeight: "bold",
                            cursor: "pointer",
                            boxShadow: "4px 4px 0 0 #000",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem"
                        }}
                        onMouseDown={e => e.currentTarget.style.transform = "translate(2px, 2px)"}
                        onMouseUp={e => e.currentTarget.style.transform = "translate(0, 0)"}
                    >
                        <img src="/delete-icon.svg" alt="Delete" style={{ width: "20px", height: "20px" }} /> Smazat
                    </button>
                    </div>
                </div>
            </div>

            {/* Info Card - inside tabs now */}

            {/* Tab Navigation */}
            <div style={{
                borderBottom: "3px solid #000",
                marginBottom: "2rem",
                marginLeft: "-2rem",
                marginRight: "-2rem",
                overflow: "hidden"
            }}>
                <div style={{
                    display: "flex",
                    gap: "0.5rem",
                    paddingLeft: "2rem",
                    paddingRight: "2rem",
                    overflowX: "auto",
                    WebkitOverflowScrolling: "touch",
                    scrollbarWidth: "none",
                    msOverflowStyle: "none"
                }} className="trip-tabs-container">
                    <button
                        onClick={() => setActiveTab('info')}
                        style={{
                            padding: "1rem 1.5rem",
                            backgroundColor: activeTab === 'info' ? "white" : "#f0f0f0",
                            border: activeTab === 'info' ? "3px solid #000" : "2px solid #999",
                            borderBottom: activeTab === 'info' ? "none" : "2px solid #999",
                            borderRadius: "12px 12px 0 0",
                            fontWeight: "900",
                            fontSize: "1rem",
                            cursor: "pointer",
                            textTransform: "uppercase",
                            transition: "all 0.2s",
                            marginBottom: "-3px",
                            whiteSpace: "nowrap",
                            flexShrink: 0
                        }}
                    >
                        Info
                    </button>
                    <button
                        onClick={() => setActiveTab('zakladna')}
                        style={{
                            padding: "1rem 1.5rem",
                            backgroundColor: activeTab === 'zakladna' ? "white" : "#f0f0f0",
                            border: activeTab === 'zakladna' ? "3px solid #000" : "2px solid #999",
                            borderBottom: activeTab === 'zakladna' ? "none" : "2px solid #999",
                            borderRadius: "12px 12px 0 0",
                            fontWeight: "900",
                            fontSize: "1rem",
                            cursor: "pointer",
                            textTransform: "uppercase",
                            transition: "all 0.2s",
                            marginBottom: "-3px",
                            whiteSpace: "nowrap",
                            flexShrink: 0
                        }}
                    >
                        Základna
                    </button>
                    <button
                        onClick={() => setActiveTab('doprava')}
                        style={{
                            padding: "1rem 1.5rem",
                            backgroundColor: activeTab === 'doprava' ? "white" : "#f0f0f0",
                            border: activeTab === 'doprava' ? "3px solid #000" : "2px solid #999",
                            borderBottom: activeTab === 'doprava' ? "none" : "2px solid #999",
                            borderRadius: "12px 12px 0 0",
                            fontWeight: "900",
                            fontSize: "1rem",
                            cursor: "pointer",
                            textTransform: "uppercase",
                            transition: "all 0.2s",
                            marginBottom: "-3px",
                            whiteSpace: "nowrap",
                            flexShrink: 0
                        }}
                    >
                        Doprava
                    </button>
                    <button
                        onClick={() => setActiveTab('ucastnici')}
                        style={{
                            padding: "1rem 1.5rem",
                            backgroundColor: activeTab === 'ucastnici' ? "white" : "#f0f0f0",
                            border: activeTab === 'ucastnici' ? "3px solid #000" : "2px solid #999",
                            borderBottom: activeTab === 'ucastnici' ? "none" : "2px solid #999",
                            borderRadius: "12px 12px 0 0",
                            fontWeight: "900",
                            fontSize: "1rem",
                            cursor: "pointer",
                            textTransform: "uppercase",
                            transition: "all 0.2s",
                            marginBottom: "-3px",
                            whiteSpace: "nowrap",
                            flexShrink: 0
                        }}
                    >
                        ÚČASTNÍCI
                    </button>
                    <button
                        onClick={() => setActiveTab('dokumentace')}
                        style={{
                            padding: "1rem 1.5rem",
                            backgroundColor: activeTab === 'dokumentace' ? "white" : "#f0f0f0",
                            border: activeTab === 'dokumentace' ? "3px solid #000" : "2px solid #999",
                            borderBottom: activeTab === 'dokumentace' ? "none" : "2px solid #999",
                            borderRadius: "12px 12px 0 0",
                            fontWeight: "900",
                            fontSize: "1rem",
                            cursor: "pointer",
                            textTransform: "uppercase",
                            transition: "all 0.2s",
                            marginBottom: "-3px",
                            whiteSpace: "nowrap",
                            flexShrink: 0
                        }}
                    >
                        Dokumentace
                    </button>
                </div>
                <style jsx>{`
                    .trip-tabs-container::-webkit-scrollbar {
                        display: none;
                    }
                `}</style>
            </div>

            {/* Tab Content - INFO */}
            {activeTab === 'info' && (
                <>
                    {/* Info Card - Two Column Layout */}
                    <div style={{
                        backgroundColor: "#FFF9E6",
                        border: "3px solid #000",
                        borderRadius: "12px",
                        padding: "2rem",
                        boxShadow: "6px 6px 0 0 #000",
                        marginBottom: "2rem"
                    }}>
                        <h2 style={{ fontSize: "1.8rem", fontWeight: "900", marginBottom: "1.5rem", textTransform: "uppercase" }}>
                            Informace o výpravě
                        </h2>
                        
                        {/* Two Column Grid */}
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                            gap: "1.5rem",
                            marginBottom: "1.5rem"
                        }}>
                            {/* Location Card */}
                            <div style={{
                                backgroundColor: "white",
                                border: "2px solid #000",
                                borderRadius: "8px",
                                padding: "1.2rem",
                                boxShadow: "3px 3px 0 0 #000"
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                                    <img src="/place-icon.svg" alt="Location" style={{ width: "28px", height: "28px" }} />
                                    <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#666", textTransform: "uppercase" }}>Místo</div>
                                </div>
                                <div style={{ fontSize: "1.2rem", fontWeight: "800", paddingLeft: "2.5rem" }}>{trip.location}</div>
                            </div>

                            {/* Date Card */}
                            <div style={{
                                backgroundColor: "white",
                                border: "2px solid #000",
                                borderRadius: "8px",
                                padding: "1.2rem",
                                boxShadow: "3px 3px 0 0 #000"
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                                    <img src="/clock-time-icon.svg" alt="Time" style={{ width: "28px", height: "28px" }} />
                                    <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#666", textTransform: "uppercase" }}>Termín</div>
                                </div>
                                <div style={{ fontSize: "1.2rem", fontWeight: "800", paddingLeft: "2.5rem" }}>
                                    {(() => {
                                        const fmt = (dStr: string) => {
                                            if (!dStr) return "";
                                            const [y, m, d] = dStr.split("-");
                                            return `${parseInt(d)}. ${parseInt(m)}. ${y}`;
                                        };
                                        return `${fmt(trip.startDate)}${trip.endDate ? ` - ${fmt(trip.endDate)}` : ""}`;
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        {trip.description && (
                            <div style={{
                                backgroundColor: "white",
                                border: "2px solid #000",
                                borderRadius: "8px",
                                padding: "1.2rem",
                                boxShadow: "3px 3px 0 0 #000"
                            }}>
                                <div style={{ fontSize: "0.9rem", fontWeight: "900", textTransform: "uppercase", marginBottom: "0.75rem" }}>
                                    Popis
                                </div>
                                <p style={{ lineHeight: "1.6", margin: 0, fontSize: "1rem" }}>{trip.description}</p>
                            </div>
                        )}
                    </div>

                    {/* Participants */}
                    <div>
                        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem", fontWeight: "900" }}>Účastníci ({participants.length})</h2>

                        <div style={{
                            overflowX: "auto",
                            border: "3px solid #000",
                            borderRadius: "12px",
                            boxShadow: "6px 6px 0 0 #000",
                            backgroundColor: "white",
                            WebkitOverflowScrolling: "touch"
                        }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
                                <thead style={{ backgroundColor: "#86efac", borderBottom: "3px solid #000" }}>
                                    <tr>
                                        <th style={thStyle}>Skaut</th>
                                        <th style={thStyle}>Stav</th>
                                        <th style={thStyle}>Odkaz na Přihlášku</th>
                                        {trip.customFields && trip.customFields.length > 0 && (
                                            <th style={thStyle}>Odpovědi</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {participants.map((p, index) => (
                                        <tr key={p._id} style={{ borderBottom: index === participants.length - 1 ? "none" : "2px solid #000" }}>
                                            <td style={{ ...tdStyle, borderRight: "3px solid #000" }}>
                                                <div style={{ fontWeight: "800", fontSize: "1rem" }}>{p.member?.name}</div>
                                                <div style={{ fontSize: "0.85rem", color: "#666", fontWeight: "600" }}>Rodič: {p.member?.parentPhone}</div>
                                            </td>
                                            <td style={{ ...tdStyle, borderRight: "3px solid #000" }}>
                                                <span style={{
                                                    padding: "0.25rem 0.75rem",
                                                    borderRadius: "99px",
                                                    fontSize: "0.85rem",
                                                    border: "2px solid #000",
                                                    backgroundColor: p.status === "attending" ? "#86efac" : p.status === "not_attending" ? "#fca5a5" : "#fff",
                                                    color: "black",
                                                    fontWeight: "700",
                                                    boxShadow: "2px 2px 0 0 #000"
                                                }}>
                                                    {p.status === "pending" ? "Bez reakce" : p.status === "attending" ? "Jede" : "Nejede"}
                                                </span>
                                            </td>
                                            <td style={{ ...tdStyle, borderRight: "3px solid #000" }}>
                                                <button
                                                    onClick={() => copyLink(p.accessKey)}
                                                    style={{
                                                        fontSize: "0.85rem",
                                                        padding: "0.25rem 0.5rem",
                                                        border: "2px solid #000",
                                                        borderRadius: "4px",
                                                        cursor: "pointer",
                                                        backgroundColor: "white",
                                                        fontWeight: "600",
                                                        boxShadow: "2px 2px 0 0 #000",
                                                        transition: "transform 0.1s",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "0.5rem"
                                                    }}
                                                    onMouseDown={e => e.currentTarget.style.transform = "translate(1px, 1px)"}
                                                    onMouseUp={e => e.currentTarget.style.transform = "translate(0, 0)"}
                                                >
                                                    {copiedKey === p.accessKey ? "✅ Zkopírováno!" : (
                                                        <>
                                                            <img src="/Link-icon.svg" alt="link" style={{ width: "16px", height: "16px" }} />
                                                            Zkopírovat
                                                        </>
                                                    )}
                                                </button>
                                            </td>
                                            {trip.customFields && trip.customFields.length > 0 && (
                                                <td style={{ ...tdStyle, borderRight: "3px solid #000" }}>
                                                    {(() => {
                                                        const parsed = getParsedResponses(p.responses);
                                                        const hasData = Object.keys(parsed).length > 0;

                                                        return hasData ? (
                                                            <button
                                                                onClick={() => setViewResponse({ name: p.member?.name, responses: parsed })}
                                                                style={{
                                                                    padding: "0.25rem 0.75rem",
                                                                    border: "2px solid #000",
                                                                    borderRadius: "6px",
                                                                    backgroundColor: "#e5e7eb",
                                                                    fontWeight: "600",
                                                                    cursor: "pointer",
                                                                    fontSize: "0.85rem",
                                                                    boxShadow: "2px 2px 0 0 #000"
                                                                }}
                                                            >
                                                                Zobrazit
                                                            </button>
                                                        ) : (
                                                            <span style={{ color: "#9ca3af", fontStyle: "italic" }}>-</span>
                                                        );
                                                    })()}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Tab Content - ZAKLADNA */}
            {activeTab === 'zakladna' && (
                <>
                    {base ? (
                        <div style={{
                            backgroundColor: "#E3F2FD",
                            border: "3px solid #000",
                            borderRadius: "12px",
                            padding: "2rem",
                            boxShadow: "6px 6px 0 0 #000",
                            marginBottom: "2rem"
                        }}>
                            {/* Header with Unassign Button */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
                                <h2 style={{ fontSize: "2rem", fontWeight: "900", margin: 0, textTransform: "uppercase" }}>
                                    {base.name}
                                </h2>
                                <button
                                    onClick={async () => {
                                        if (confirm("Odebrat přiřazenou základnu?")) {
                                            await unassignBase({ tripId });
                                        }
                                    }}
                                    style={{
                                        padding: "0.75rem 1.25rem",
                                        backgroundColor: "#fca5a5",
                                        border: "3px solid #000",
                                        borderRadius: "8px",
                                        fontWeight: "900",
                                        cursor: "pointer",
                                        boxShadow: "4px 4px 0 0 #000",
                                        fontSize: "0.95rem",
                                        textTransform: "uppercase"
                                    }}
                                >
                                    Odebrat
                                </button>
                            </div>

                            {/* Two Column Layout */}
                            <div style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))",
                                gap: "1.5rem",
                                marginBottom: "1.5rem"
                            }}>
                                {/* Left Column - Photos */}
                                <div>
                                    {base.media?.photos && base.media.photos.length > 0 && (
                                        <div>
                                            <div style={{
                                                width: "100%",
                                                height: "350px",
                                                borderRadius: "8px",
                                                border: "3px solid #000",
                                                overflow: "hidden",
                                                boxShadow: "4px 4px 0 0 #000",
                                                marginBottom: "0.75rem",
                                                backgroundColor: "white"
                                            }}>
                                                <img 
                                                    src={base.media.photos[0].url} 
                                                    alt={base.name}
                                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                                />
                                            </div>
                                            {base.media.photos.length > 1 && (
                                                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                                    {base.media.photos.slice(1, 6).map((photo, idx) => (
                                                        <div key={idx} style={{
                                                            width: "70px",
                                                            height: "70px",
                                                            borderRadius: "6px",
                                                            border: "3px solid #000",
                                                            overflow: "hidden",
                                                            cursor: "pointer",
                                                            boxShadow: "2px 2px 0 0 #000"
                                                        }}>
                                                            <img src={photo.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Right Column - Basic Info */}
                                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                    {base.location?.city && (
                                        <div style={{
                                            backgroundColor: "white",
                                            border: "3px solid #000",
                                            borderRadius: "8px",
                                            padding: "1rem",
                                            boxShadow: "3px 3px 0 0 #000"
                                        }}>
                                            <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#666", marginBottom: "0.5rem", textTransform: "uppercase" }}>
                                                <img src="/place-icon.svg" alt="" style={{ width: "18px", height: "18px", verticalAlign: "middle", marginRight: "0.5rem" }} />
                                                Město
                                            </div>
                                            <div style={{ fontSize: "1.2rem", fontWeight: "900" }}>{base.location.city}</div>
                                        </div>
                                    )}
                                    {base.capacity && (
                                        <div style={{
                                            backgroundColor: "white",
                                            border: "3px solid #000",
                                            borderRadius: "8px",
                                            padding: "1rem",
                                            boxShadow: "3px 3px 0 0 #000"
                                        }}>
                                            <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#666", marginBottom: "0.5rem", textTransform: "uppercase" }}>Kapacita</div>
                                            <div style={{ fontSize: "1.2rem", fontWeight: "900" }}>{base.capacity} osob</div>
                                        </div>
                                    )}
                                    {base.pricing?.priceType && (
                                        <div style={{
                                            backgroundColor: "white",
                                            border: "3px solid #000",
                                            borderRadius: "8px",
                                            padding: "1rem",
                                            boxShadow: "3px 3px 0 0 #000"
                                        }}>
                                            <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#666", marginBottom: "0.5rem", textTransform: "uppercase" }}>Cena</div>
                                            <div style={{ fontSize: "1.2rem", fontWeight: "900" }}>
                                                {base.pricing.priceType}
                                                {base.pricing?.minimalPrice && ` • ${base.pricing.minimalPrice} Kč`}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Two Column Layout - Details */}
                            <div style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 350px), 1fr))",
                                gap: "1.5rem",
                                marginBottom: "1.5rem"
                            }}>
                                {/* Conditions */}
                                {base.conditions?.specialNotes && (
                                    <div style={{
                                        backgroundColor: "white",
                                        border: "3px solid #000",
                                        borderRadius: "8px",
                                        padding: "1.2rem",
                                        boxShadow: "3px 3px 0 0 #000"
                                    }}>
                                        <div style={{ fontSize: "0.95rem", fontWeight: "900", textTransform: "uppercase", marginBottom: "0.75rem" }}>
                                            Podmínky
                                        </div>
                                        <div style={{ fontSize: "0.95rem", lineHeight: "1.6", color: "#333" }}>
                                            {base.conditions.specialNotes.replace(/<[^>]*>/g, '')}
                                        </div>
                                    </div>
                                )}

                                {/* Contact Info */}
                                {base.contacts && base.contacts.length > 0 && (
                                    <div style={{
                                        backgroundColor: "white",
                                        border: "3px solid #000",
                                        borderRadius: "8px",
                                        padding: "1.2rem",
                                        boxShadow: "3px 3px 0 0 #000"
                                    }}>
                                        <div style={{ fontSize: "0.95rem", fontWeight: "900", textTransform: "uppercase", marginBottom: "0.75rem" }}>
                                            Kontakt
                                        </div>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                            {base.contacts[0].name && (
                                                <div style={{ fontWeight: "800", fontSize: "1.05rem" }}>
                                                    {base.contacts[0].name}
                                                    {base.contacts[0].role && <span style={{ color: "#666", fontWeight: "600" }}> ({base.contacts[0].role})</span>}
                                                </div>
                                            )}
                                            {base.contacts[0].email && (
                                                <a href={`mailto:${base.contacts[0].email}`} style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "0.5rem",
                                                    textDecoration: "none",
                                                    color: "#0066cc",
                                                    fontWeight: "700",
                                                    fontSize: "0.95rem"
                                                }}>
                                                    <img src="/mail-icon.svg" alt="Email" style={{ width: "18px", height: "18px" }} />
                                                    {base.contacts[0].email}
                                                </a>
                                            )}
                                            {base.contacts[0].phone && (
                                                <a href={`tel:${base.contacts[0].phone}`} style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "0.5rem",
                                                    textDecoration: "none",
                                                    color: "#0066cc",
                                                    fontWeight: "700",
                                                    fontSize: "0.95rem"
                                                }}>
                                                    <img src="/phone-icon.svg" alt="Phone" style={{ width: "18px", height: "18px" }} />
                                                    {base.contacts[0].phone}
                                                </a>
                                            )}
                                            {base.contacts[0].website && (
                                                <a href={base.contacts[0].website} target="_blank" rel="noopener noreferrer" style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "0.5rem",
                                                    textDecoration: "none",
                                                    color: "#0066cc",
                                                    fontWeight: "700",
                                                    fontSize: "0.95rem"
                                                }}>
                                                    <img src="/diagonal-arrow-icon.svg" alt="Website" style={{ width: "18px", height: "18px" }} />
                                                    Web
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Equipment - Full Width */}
                            {base.amenities?.equipment && base.amenities.equipment.length > 0 && (
                                <div style={{
                                    backgroundColor: "white",
                                    border: "3px solid #000",
                                    borderRadius: "8px",
                                    padding: "1.2rem",
                                    marginBottom: "1.5rem",
                                    boxShadow: "3px 3px 0 0 #000"
                                }}>
                                    <div style={{ fontSize: "0.95rem", fontWeight: "900", textTransform: "uppercase", marginBottom: "0.75rem" }}>
                                        Vybavení
                                    </div>
                                    <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                                        {base.amenities.equipment.map((item, idx) => (
                                            <span key={idx} style={{
                                                backgroundColor: "#dbeafe",
                                                border: "2px solid #000",
                                                borderRadius: "6px",
                                                padding: "0.5rem 1rem",
                                                fontSize: "0.9rem",
                                                fontWeight: "700",
                                                boxShadow: "2px 2px 0 0 #000"
                                            }}>
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Action Links */}
                            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                                {base.coordinates && (
                                    <>
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${base.coordinates.lat},${base.coordinates.lng}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                padding: "0.75rem 1.5rem",
                                                backgroundColor: "#86efac",
                                                border: "3px solid #000",
                                                borderRadius: "8px",
                                                fontWeight: "900",
                                                textDecoration: "none",
                                                color: "#000",
                                                boxShadow: "4px 4px 0 0 #000",
                                                fontSize: "1rem",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "0.5rem",
                                                cursor: "pointer",
                                                textTransform: "uppercase"
                                            }}
                                        >
                                            <img src="/place-icon.svg" alt="" style={{ width: "20px", height: "20px" }} />
                                            Zobrazit na mapě
                                        </a>
                                        <a
                                            href={`https://zakladny.skaut.cz/${base.slug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                padding: "0.75rem 1.5rem",
                                                backgroundColor: "white",
                                                border: "3px solid #000",
                                                borderRadius: "8px",
                                                fontWeight: "900",
                                                textDecoration: "none",
                                                color: "#000",
                                                boxShadow: "4px 4px 0 0 #000",
                                                fontSize: "1rem",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "0.5rem",
                                                cursor: "pointer",
                                                textTransform: "uppercase"
                                            }}
                                        >
                                            <img src="/info-icon.svg" alt="" style={{ width: "20px", height: "20px" }} />
                                            Celý detail
                                        </a>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            backgroundColor: "#fff3cd",
                            border: "3px solid #000",
                            borderRadius: "12px",
                            padding: "2rem",
                            boxShadow: "6px 6px 0 0 #000",
                            textAlign: "center",
                            marginBottom: "2rem"
                        }}>
                            <h3 style={{ fontSize: "1.3rem", fontWeight: "900", marginBottom: "0.5rem" }}>Žádná základna přiřazena</h3>
                            <p style={{ color: "#666", marginBottom: 0 }}>Přiřaďte základnu v aplikaci Hledač základen nebo v sekci s údaji o výpravě.</p>
                        </div>
                    )}
                </>
            )}

            {/* Tab Content - DOPRAVA */}
            {activeTab === 'doprava' && (
                <div>
                    <div style={{
                        backgroundColor: "#E8F5E9",
                        border: "3px solid #000",
                        borderRadius: "12px",
                        padding: "2rem",
                        boxShadow: "6px 6px 0 0 #000",
                        marginBottom: "2rem"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                            <h2 style={{ fontSize: "2rem", fontWeight: "900", margin: 0, textTransform: "uppercase" }}>Doprava</h2>
                            <button
                                onClick={() => {
                                    const origin = prompt("Odkud?", "Praha");
                                    if (!origin) return;
                                    const destination = trip.location || prompt("Kam?", "");
                                    if (!destination) return;
                                    const dateStr = trip.startDate || new Date().toISOString().split('T')[0];
                                    const timeStr = prompt("Čas odjezdu (HH:MM)?", "09:00");
                                    if (!timeStr) return;
                                    
                                    // Open IDOS in new tab
                                    const url = `https://idos.idnes.cz/vlaky/spojeni/?f=${encodeURIComponent(origin)}&t=${encodeURIComponent(destination)}&date=${dateStr}&time=${timeStr}`;
                                    window.open(url, '_blank');
                                }}
                                style={{
                                    padding: "0.75rem 1.5rem",
                                    backgroundColor: "#86efac",
                                    border: "3px solid #000",
                                    borderRadius: "8px",
                                    fontWeight: "900",
                                    cursor: "pointer",
                                    boxShadow: "4px 4px 0 0 #000",
                                    fontSize: "1rem",
                                    textTransform: "uppercase",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem"
                                }}
                            >
                                <img src="/plus-icon-dark.svg" alt="" style={{ width: "20px", height: "20px" }} />
                                Přidat trasu
                            </button>
                        </div>

                        {/* Route Cards */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                            {/* Example: Travel to destination */}
                            <div style={{
                                backgroundColor: "white",
                                border: "3px solid #000",
                                borderRadius: "12px",
                                padding: "1.5rem",
                                boxShadow: "4px 4px 0 0 #000"
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                                    <div>
                                        <h3 style={{ fontSize: "1.3rem", fontWeight: "900", marginBottom: "0.5rem" }}>Cesta tam</h3>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "#666", fontSize: "0.95rem", fontWeight: "600" }}>
                                            <img src="/place-icon.svg" alt="" style={{ width: "18px", height: "18px" }} />
                                            <span>→ {trip.location}</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                                    <div style={{
                                        backgroundColor: "#f0f9ff",
                                        border: "2px solid #000",
                                        borderRadius: "8px",
                                        padding: "1rem",
                                        boxShadow: "2px 2px 0 0 #000"
                                    }}>
                                        <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#666", marginBottom: "0.5rem", textTransform: "uppercase" }}>Datum</div>
                                        <div style={{ fontSize: "1.1rem", fontWeight: "800" }}>
                                            {(() => {
                                                const fmt = (dStr: string) => {
                                                    if (!dStr) return "";
                                                    const [y, m, d] = dStr.split("-");
                                                    return `${parseInt(d)}. ${parseInt(m)}. ${y}`;
                                                };
                                                return fmt(trip.startDate);
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                                    <a
                                        href={`https://idos.idnes.cz/vlaky/spojeni/?t=${encodeURIComponent(trip.location)}&date=${trip.startDate}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            padding: "0.6rem 1.2rem",
                                            backgroundColor: "#fef3c7",
                                            border: "3px solid #000",
                                            borderRadius: "6px",
                                            fontWeight: "800",
                                            textDecoration: "none",
                                            color: "#000",
                                            boxShadow: "3px 3px 0 0 #000",
                                            fontSize: "0.9rem",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "0.5rem"
                                        }}
                                    >
                                        <img src="/metro-map-icon.png" alt="" style={{ width: "18px", height: "18px" }} />
                                        Vlak/Bus (IDOS)
                                    </a>
                                    <a
                                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(trip.location)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            padding: "0.6rem 1.2rem",
                                            backgroundColor: "white",
                                            border: "3px solid #000",
                                            borderRadius: "6px",
                                            fontWeight: "800",
                                            textDecoration: "none",
                                            color: "#000",
                                            boxShadow: "3px 3px 0 0 #000",
                                            fontSize: "0.9rem",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "0.5rem"
                                        }}
                                    >
                                        <img src="/google-maps-logo.png" alt="" style={{ width: "18px", height: "18px" }} />
                                        Auto (Google Maps)
                                    </a>
                                    <a
                                        href={`https://mapy.cz/zakladni?q=${encodeURIComponent(trip.location)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            padding: "0.6rem 1.2rem",
                                            backgroundColor: "white",
                                            border: "3px solid #000",
                                            borderRadius: "6px",
                                            fontWeight: "800",
                                            textDecoration: "none",
                                            color: "#000",
                                            boxShadow: "3px 3px 0 0 #000",
                                            fontSize: "0.9rem",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "0.5rem"
                                        }}
                                    >
                                        <img src="/mapy-cz-logo.png" alt="" style={{ width: "18px", height: "18px" }} />
                                        Mapy.cz
                                    </a>
                                </div>
                            </div>

                            {/* Return journey */}
                            {trip.endDate && (
                                <div style={{
                                    backgroundColor: "white",
                                    border: "3px solid #000",
                                    borderRadius: "12px",
                                    padding: "1.5rem",
                                    boxShadow: "4px 4px 0 0 #000"
                                }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                                        <div>
                                            <h3 style={{ fontSize: "1.3rem", fontWeight: "900", marginBottom: "0.5rem" }}>Cesta zpět</h3>
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "#666", fontSize: "0.95rem", fontWeight: "600" }}>
                                                <img src="/place-icon.svg" alt="" style={{ width: "18px", height: "18px" }} />
                                                <span>{trip.location} →</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                                        <div style={{
                                            backgroundColor: "#f0f9ff",
                                            border: "2px solid #000",
                                            borderRadius: "8px",
                                            padding: "1rem",
                                            boxShadow: "2px 2px 0 0 #000"
                                        }}>
                                            <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#666", marginBottom: "0.5rem", textTransform: "uppercase" }}>Datum</div>
                                            <div style={{ fontSize: "1.1rem", fontWeight: "800" }}>
                                                {(() => {
                                                    const fmt = (dStr: string) => {
                                                        if (!dStr) return "";
                                                        const [y, m, d] = dStr.split("-");
                                                        return `${parseInt(d)}. ${parseInt(m)}. ${y}`;
                                                    };
                                                    return fmt(trip.endDate || "");
                                                })()}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                                        <a
                                            href={`https://idos.idnes.cz/vlaky/spojeni/?f=${encodeURIComponent(trip.location)}&date=${trip.endDate}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                padding: "0.6rem 1.2rem",
                                                backgroundColor: "#fef3c7",
                                                border: "3px solid #000",
                                                borderRadius: "6px",
                                                fontWeight: "800",
                                                textDecoration: "none",
                                                color: "#000",
                                                boxShadow: "3px 3px 0 0 #000",
                                                fontSize: "0.9rem",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "0.5rem"
                                            }}
                                        >
                                            <img src="/metro-map-icon.png" alt="" style={{ width: "18px", height: "18px" }} />
                                            Vlak/Bus (IDOS)
                                        </a>
                                        <a
                                            href={`https://www.google.com/maps/dir/${encodeURIComponent(trip.location)}/`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                padding: "0.6rem 1.2rem",
                                                backgroundColor: "white",
                                                border: "3px solid #000",
                                                borderRadius: "6px",
                                                fontWeight: "800",
                                                textDecoration: "none",
                                                color: "#000",
                                                boxShadow: "3px 3px 0 0 #000",
                                                fontSize: "0.9rem",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "0.5rem"
                                            }}
                                        >
                                            <img src="/google-maps-logo.png" alt="" style={{ width: "18px", height: "18px" }} />
                                            Auto (Google Maps)
                                        </a>
                                        <a
                                            href={`https://mapy.cz/zakladni?q=${encodeURIComponent(trip.location)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                padding: "0.6rem 1.2rem",
                                                backgroundColor: "white",
                                                border: "3px solid #000",
                                                borderRadius: "6px",
                                                fontWeight: "800",
                                                textDecoration: "none",
                                                color: "#000",
                                                boxShadow: "3px 3px 0 0 #000",
                                                fontSize: "0.9rem",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "0.5rem"
                                            }}
                                        >
                                            <img src="/mapy-cz-logo.png" alt="" style={{ width: "18px", height: "18px" }} />
                                            Mapy.cz
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Info box */}
                        <div style={{
                            marginTop: "1.5rem",
                            padding: "1rem",
                            backgroundColor: "#fff9e6",
                            border: "2px solid #000",
                            borderRadius: "8px",
                            boxShadow: "2px 2px 0 0 #000"
                        }}>
                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                                <img src="/info-icon.svg" alt="" style={{ width: "20px", height: "20px", marginTop: "2px" }} />
                                <div style={{ fontSize: "0.9rem", lineHeight: "1.5" }}>
                                    <strong>Tip:</strong> Kliknutím na "Přidat trasu" můžete vyhledat vlastní spoje na IDOS. Odkazy níže otevírají oblíbené navigace s předvyplněnou destinací.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab Content - ÚČASTNÍCI */}
            {activeTab === 'ucastnici' && (
                <div>
                    <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem", fontWeight: "900" }}>Účastníci ({participants.length})</h2>

                    <div style={{
                        overflowX: "auto",
                        border: "3px solid #000",
                        borderRadius: "12px",
                        boxShadow: "6px 6px 0 0 #000",
                        backgroundColor: "white",
                        WebkitOverflowScrolling: "touch"
                    }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
                            <thead style={{ backgroundColor: "#86efac", borderBottom: "3px solid #000" }}>
                                <tr>
                                    <th style={thStyle}>Skaut</th>
                                    <th style={thStyle}>Stav</th>
                                    <th style={thStyle}>Odkaz na Přihlášku</th>
                                    {trip.customFields && trip.customFields.length > 0 && (
                                        <th style={thStyle}>Odpovědi</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {participants.map((p, index) => (
                                    <tr key={p._id} style={{ borderBottom: index === participants.length - 1 ? "none" : "2px solid #000" }}>
                                        <td style={{ ...tdStyle, borderRight: "3px solid #000" }}>
                                            <div style={{ fontWeight: "800", fontSize: "1rem" }}>{p.member?.name}</div>
                                            <div style={{ fontSize: "0.85rem", color: "#666", fontWeight: "600" }}>Rodič: {p.member?.parentPhone}</div>
                                        </td>
                                        <td style={{ ...tdStyle, borderRight: "3px solid #000" }}>
                                            <span style={{
                                                padding: "0.25rem 0.75rem",
                                                borderRadius: "99px",
                                                fontSize: "0.85rem",
                                                border: "2px solid #000",
                                                backgroundColor: p.status === "attending" ? "#86efac" : p.status === "not_attending" ? "#fca5a5" : "#fff",
                                                color: "black",
                                                fontWeight: "700",
                                                boxShadow: "2px 2px 0 0 #000"
                                            }}>
                                                {p.status === "pending" ? "Bez reakce" : p.status === "attending" ? "Jede" : "Nejede"}
                                            </span>
                                        </td>
                                        <td style={{ ...tdStyle, borderRight: "3px solid #000" }}>
                                            <button
                                                onClick={() => copyLink(p.accessKey)}
                                                style={{
                                                    fontSize: "0.85rem",
                                                    padding: "0.25rem 0.5rem",
                                                    border: "2px solid #000",
                                                    borderRadius: "4px",
                                                    cursor: "pointer",
                                                    backgroundColor: "white",
                                                    fontWeight: "600",
                                                    boxShadow: "2px 2px 0 0 #000",
                                                    transition: "transform 0.1s",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "0.5rem"
                                                }}
                                                onMouseDown={e => e.currentTarget.style.transform = "translate(1px, 1px)"}
                                                onMouseUp={e => e.currentTarget.style.transform = "translate(0, 0)"}
                                            >
                                                {copiedKey === p.accessKey ? "✅ Zkopírováno!" : (
                                                    <>
                                                        <img src="/Link-icon.svg" alt="link" style={{ width: "16px", height: "16px" }} />
                                                        Zkopírovat
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                        {trip.customFields && trip.customFields.length > 0 && (
                                            <td style={{ ...tdStyle, borderRight: "3px solid #000" }}>
                                                {(() => {
                                                    const parsed = getParsedResponses(p.responses);
                                                    const hasData = Object.keys(parsed).length > 0;

                                                    return hasData ? (
                                                        <button
                                                            onClick={() => setViewResponse({ name: p.member?.name, responses: parsed })}
                                                            style={{
                                                                padding: "0.25rem 0.75rem",
                                                                border: "2px solid #000",
                                                                borderRadius: "6px",
                                                                backgroundColor: "#e5e7eb",
                                                                fontWeight: "600",
                                                                cursor: "pointer",
                                                                fontSize: "0.85rem",
                                                                boxShadow: "2px 2px 0 0 #000"
                                                            }}
                                                        >
                                                            Zobrazit
                                                        </button>
                                                    ) : (
                                                        <span style={{ color: "#9ca3af", fontStyle: "italic" }}>-</span>
                                                    );
                                                })()}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tab Content - dokumentace */}
            {activeTab === 'dokumentace' && (
                <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                    {/* Documentation Banner */}
                    <div style={{
                        backgroundColor: "#FFF9E6",
                        border: "3px solid #000",
                        borderRadius: "16px",
                        padding: "2.5rem",
                        boxShadow: "8px 8px 0 0 #000",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "2rem",
                        flexWrap: "wrap"
                    }}>
                        <div style={{ flex: "1 1 300px" }}>
                            <h2 style={{ fontSize: "2rem", fontWeight: "900", margin: "0 0 1rem 0", textTransform: "uppercase" }}>
                                Dokumentace výpravy
                            </h2>
                            <p style={{ margin: 0, fontSize: "1.1rem", color: "#666", lineHeight: 1.5 }}>
                                Sjednocené místo pro veškeré přípravy, dokumenty a podklady k této výpravě.
                            </p>
                        </div>
                        
                        <button
                            onClick={handleOpenTripDocs}
                            style={{
                                padding: "1.25rem 2.5rem",
                                backgroundColor: "#fcd34d",
                                border: "4px solid #000",
                                borderRadius: "12px",
                                fontWeight: "900",
                                cursor: "pointer",
                                boxShadow: "6px 6px 0 0 #000",
                                fontSize: "1.25rem",
                                transition: "all 0.1s"
                            }}
                            onMouseDown={e => e.currentTarget.style.transform = "translate(2px, 2px)"}
                            onMouseUp={e => e.currentTarget.style.transform = "translate(0, 0)"}
                        >
                            {tripDocs?.find(m => m.category === "documentation") ? "OTEVŘÍT DOKUMENTACI" : "VYTVOŘIT DOKUMENTACI"}
                        </button>
                    </div>

                    {/* Integrated Councils Section */}
                    <div style={{
                        backgroundColor: "white",
                        border: "3px solid #000",
                        borderRadius: "16px",
                        padding: "2rem",
                        boxShadow: "6px 6px 0 0 #000"
                    }}>
                        <h3 style={{ fontSize: "1.4rem", fontWeight: "900", margin: "0 0 1.5rem 0", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <span style={{ fontSize: "1.8rem" }}>📓</span> Připojené zápisy z rad
                        </h3>
                        
                        {tripDocs === undefined ? (
                            <div>Načítám...</div>
                        ) : (() => {
                            const councils = tripDocs.filter(m => m.category === "notebook");
                            return councils.length === 0 ? (
                                <div style={{ padding: "2rem", textAlign: "center", border: "2px dashed #ccc", borderRadius: "12px", color: "#999", fontStyle: "italic" }}>
                                    K této výpravě zatím není připojena žádná rada.
                                </div>
                            ) : (
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
                                    {councils.map(council => (
                                        <div
                                            key={council._id}
                                            onClick={() => router.push(`/rady/${council._id}`)}
                                            style={{
                                                backgroundColor: "#f9fafb",
                                                border: "3px solid #000",
                                                borderRadius: "12px",
                                                padding: "1.5rem",
                                                boxShadow: "4px 4px 0 0 #000",
                                                cursor: "pointer",
                                                transition: "all 0.1s"
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.transform = "translate(-2px, -2px)";
                                                e.currentTarget.style.boxShadow = "6px 6px 0 0 #000";
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.transform = "translate(0, 0)";
                                                e.currentTarget.style.boxShadow = "4px 4px 0 0 #000";
                                            }}
                                        >
                                            <h4 style={{ margin: "0 0 0.5rem 0", fontWeight: "900", fontSize: "1.1rem" }}>{council.title}</h4>
                                            <p style={{ margin: 0, fontSize: "0.85rem", color: "#666" }}>{council.description || "Administrativní zápisník"}</p>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                        
                        <div style={{ marginTop: "1.5rem", padding: "1rem", backgroundColor: "#f0fdf4", border: "2px solid #bbf7d0", borderRadius: "8px", fontSize: "0.9rem", color: "#166534" }}>
                            <strong>O integraci:</strong> Rady jsou administrativní zápisníky připojené k výpravě pro kontext. Dokumentace výpravy je sjednocený pracovní dokument.
                        </div>
                    </div>
                </div>
            )}

            {/* Responses Modal */}
            {viewResponse && (
                <div style={{
                    position: "fixed",
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    zIndex: 2000,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }} onClick={() => setViewResponse(null)}>
                    <div style={{
                        backgroundColor: "white",
                        padding: "2rem",
                        border: "3px solid #000",
                        borderRadius: "16px",
                        boxShadow: "8px 8px 0 0 #000",
                        width: "100%",
                        maxWidth: "500px",
                        maxHeight: "80vh",
                        overflowY: "auto"
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                            <h2 style={{ fontSize: "1.5rem", fontWeight: "900", margin: 0 }}>
                                Odpovědi: {viewResponse.name}
                            </h2>
                            <button onClick={() => setViewResponse(null)} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer" }}>×</button>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            {trip.customFields && Array.isArray(trip.customFields) ? (
                                trip.customFields.map((field: any, i: number) => {
                                    const val = viewResponse.responses[field.label];
                                    return (
                                        <div key={i} style={{ borderBottom: "1px solid #eee", paddingBottom: "0.5rem" }}>
                                            <div style={{ fontWeight: "800", fontSize: "0.9rem", color: "#666", marginBottom: "0.25rem" }}>
                                                {field.label}
                                            </div>
                                            <div style={{ fontSize: "1.1rem", fontWeight: "600" }}>
                                                {val !== undefined && val !== null && val !== "" ? String(val) : "-"}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div style={{ color: "#666", fontStyle: "italic" }}>Žádné otázky nebyly definovány.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const thStyle = { padding: "1rem", fontWeight: "900", fontSize: "1rem", textAlign: "left" as const, borderRight: "3px solid #000" };
const tdStyle = { padding: "1rem" };
