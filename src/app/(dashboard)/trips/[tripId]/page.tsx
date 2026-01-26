"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import TripForm, { TripFormData } from "../../../../components/TripForm";
import Button from "../../../../components/Button";

export default function TripDashboardPage() {
    const params = useParams();
    const router = useRouter();
    const tripId = params.tripId as Id<"trips">;

    const dashboard = useQuery(api.trips.getDashboard, tripId ? { tripId } : "skip");
    const updateTrip = useMutation(api.trips.update);
    const deleteTrip = useMutation(api.trips.remove);

    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [viewResponse, setViewResponse] = useState<any | null>(null);

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

    const { trip, participants } = dashboard;

    if (isEditing) {
        return (
            <div style={{ maxWidth: "800px", margin: "2rem auto", backgroundColor: "white", padding: "2rem", borderRadius: "16px", border: "3px solid #000", boxShadow: "8px 8px 0 0 #000" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2rem" }}>
                    <h2 className="u-text-lg u-font-bold" style={{ fontSize: "1.5rem" }}>Upravit Výpravu</h2>
                    <Button onClick={() => setIsEditing(false)} variant="outline">Zrušit</Button>
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
        );
    }

    return (
        <div style={{ width: "100%", position: "relative" }}>
            {/* Top Title Bar */}
            <div style={{
                backgroundColor: "white",
                borderBottom: "3px solid #000",
                padding: "1rem 2rem",
                margin: "0 -2rem 2rem -2rem", // Break out to full width
                width: "calc(100% + 4rem)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
            }}>
                <h1 style={{ fontSize: "1.5rem", fontWeight: "900", margin: 0 }}>{trip.name}</h1>
            </div>

            {/* Controls Row & Info */}
            <div style={{ marginBottom: "2rem" }}>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginBottom: "2rem" }}>
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

                {/* Info Card */}
                <div style={{
                    backgroundColor: "white",
                    border: "3px solid #000",
                    borderRadius: "12px",
                    padding: "1.5rem",
                    boxShadow: "6px 6px 0 0 #000",
                    marginBottom: "2rem"
                }}>
                    <div style={{ display: "flex", gap: "2rem", marginBottom: "1rem", fontWeight: "700", fontSize: "1.1rem" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <img src="/place-icon.svg" alt="Location" style={{ width: "24px", height: "24px" }} /> {trip.location}
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <img src="/clock-time-icon.svg" alt="Time" style={{ width: "24px", height: "24px" }} />
                            {(() => {
                                const fmt = (dStr: string) => {
                                    if (!dStr) return "";
                                    const [y, m, d] = dStr.split("-");
                                    return `${parseInt(d)}. ${parseInt(m)}. ${y}`;
                                };
                                return `${fmt(trip.startDate)}${trip.endDate ? ` - ${fmt(trip.endDate)}` : ""}`;
                            })()}
                        </span>
                    </div>
                    <p style={{ lineHeight: "1.6" }}>{trip.description}</p>
                </div>
            </div>

            <div>
                <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem", fontWeight: "900" }}>Účastníci ({participants.length})</h2>

                <div style={{
                    overflowX: "auto",
                    border: "3px solid #000",
                    borderRadius: "12px",
                    boxShadow: "6px 6px 0 0 #000",
                    backgroundColor: "white"
                }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px" }}>
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
                                    // Only show if there is a value or if we want to show empty fields as "-"
                                    // Let's show all fields defined in the trip form
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
