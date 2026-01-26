"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import { Id } from "../../../../convex/_generated/dataModel";
import Link from "next/link";
import TripForm, { TripFormData } from "../../../components/TripForm";

const SpinningLogo = ({ src, alt = "Logo" }: { src?: string; alt?: string }) => (
    <div style={{
        width: "50px",
        height: "50px",
        borderRadius: "50%",
        border: "2px solid #000",
        backgroundColor: "#ccc",
        boxShadow: "2px 2px 0 0 #000",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    }}>
        {src ? (
            <img src={src} alt={alt} style={{ width: "100%", height: "100%", objectFit: "cover", animation: "spin 10s linear infinite" }} />
        ) : (
            <span style={{ fontSize: "0.6rem", fontWeight: "bold" }}>LOGO</span>
        )}
        <style jsx>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
);

import { useSearchParams, useRouter, usePathname } from "next/navigation";

export default function TripsPage() {
    const troops = useQuery(api.troops.getByUser);
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const troopIdParam = searchParams.get("troopId");

    const [selectedTroopId, setSelectedTroopId] = useState<Id<"troops"> | null>(
        troopIdParam ? (troopIdParam as Id<"troops">) : null
    );

    // Update URL when troop is selected
    const handleTroopChange = (newTroopId: string) => {
        setSelectedTroopId(newTroopId as Id<"troops">);
        const params = new URLSearchParams(searchParams);
        params.set("troopId", newTroopId);
        router.replace(`${pathname}?${params.toString()}`);
    };

    // Auto-select first troop if loading finishes and none selected
    if (troops && troops.length > 0 && !selectedTroopId) {
        setSelectedTroopId(troops[0]._id);
    }

    // Get currently selected troop details
    const selectedTroop = troops?.find(t => t._id === selectedTroopId);

    const trips = useQuery(api.trips.list as any, selectedTroopId ? { troopId: selectedTroopId } : "skip");
    const createTrip = useMutation(api.trips.create);

    const [isCreating, setIsCreating] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const handleCreate = async (data: TripFormData) => {
        if (!selectedTroopId) return;

        setIsCreating(true);
        try {
            await createTrip({
                troopId: selectedTroopId,
                ...data
            });
            setShowAddModal(false);
        } catch (error) {
            console.error(error);
            alert("Chyba při vytváření výpravy");
        } finally {
            setIsCreating(false);
        }
    };

    if (troops === undefined) return <div>Načítám...</div>;

    if (troops.length === 0) {
        return (
            <div style={{ textAlign: "center", padding: "2rem" }}>
                <p>Nejdříve si musíte vytvořit oddíl.</p>
                <Link href="/troop">Vytvořit Oddíl</Link>
            </div>
        );
    }

    // Filter trips
    const filteredTrips = trips?.filter((t: any) =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.location && t.location.toLowerCase().includes(searchTerm.toLowerCase()))
    );

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
                <h1 style={{ fontSize: "1.5rem", fontWeight: "900", margin: 0 }}>Výpravy</h1>
            </div>

            {/* Controls Row */}
            <div className="controls-row">
                <div className="troop-selector-container">
                    {/* Troop Selector Pill */}
                    {troops.length > 0 && (
                        <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
                            <select
                                value={selectedTroopId || ""}
                                onChange={(e) => handleTroopChange(e.target.value)}
                                className="troop-select"
                            >
                                {troops.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                            </select>
                            {/* Custom Arrow */}
                            <span className="custom-arrow">▼</span>
                        </div>
                    )}

                    {/* Overlapping Spinning Logo */}
                    {selectedTroop && (
                        <div className="spinning-logo-container">
                            <SpinningLogo src={selectedTroop.logo} />
                        </div>
                    )}
                </div>

                {/* Search Bar */}
                <div className="search-container">
                    <input
                        type="text"
                        placeholder="Hledat výpravy..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>

                {/* ADD Button */}
                <button
                    onClick={() => setShowAddModal(true)}
                    className="add-button"
                    onMouseDown={e => e.currentTarget.style.transform = "translate(2px, 2px)"}
                    onMouseUp={e => e.currentTarget.style.transform = "translate(0, 0)"}
                >
                    <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>+</span> ADD
                </button>
            </div>

            <style jsx>{`
                .controls-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                    flex-wrap: wrap;
                    gap: 1rem;
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
                    font-size: 1.5rem;
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
                .search-container {
                    flex: 1;
                    max-width: 500px;
                    min-width: 300px;
                    margin: 0 1rem;
                }
                .search-input {
                    width: 100%;
                    padding: 0.75rem 1.5rem;
                    border-radius: 999px;
                    border: 3px solid #000;
                    box-shadow: 4px 4px 0 0 #000;
                    font-size: 1.2rem;
                    outline: none;
                    font-weight: 500;
                }
                .add-button {
                    padding: 0.75rem 2rem;
                    border-radius: 999px;
                    background-color: white;
                    border: 3px solid #000;
                    box-shadow: 4px 4px 0 0 #000;
                    font-size: 1.2rem;
                    font-weight: 900;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    white-space: nowrap;
                    transition: transform 0.1s;
                }

                @media (max-width: 768px) {
                    .controls-row {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 1.5rem;
                    }
                    .troop-selector-container {
                        width: 100%;
                    }
                    .troop-select {
                        width: 100%;
                        font-size: 1.2rem;
                        padding-right: 40px;
                    }
                    .search-container {
                        margin: 0;
                        width: 100%;
                        max-width: none;
                    }
                    .add-button {
                        width: 100%;
                        justify-content: center;
                    }
                }
            `}</style>

            {/* Content Area */}
            <div>
                {!trips ? (
                    <div>Načítám výpravy...</div>
                ) : filteredTrips.length === 0 ? (
                    <div style={{
                        padding: "3rem",
                        textAlign: "center",
                        border: "3px dashed #ccc",
                        borderRadius: "12px",
                        fontWeight: "bold",
                        color: "#888"
                    }}>
                        Žádné výpravy nenalezeny. Klikněte na ADD pro naplánování nové.
                    </div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "2rem" }}>
                        {filteredTrips.map((trip: any) => (
                            <Link key={trip._id} href={`/trips/${trip._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <div style={{
                                    backgroundColor: 'white',
                                    border: '3px solid #000',
                                    borderRadius: '16px',
                                    padding: '1.5rem',
                                    boxShadow: "6px 6px 0 0 #000",
                                    transition: 'transform 0.1s',
                                    display: "flex",
                                    flexDirection: "column",
                                    height: "100%",
                                    justifyContent: "space-between",
                                    cursor: "pointer"
                                }}>
                                    <div>
                                        <div style={{
                                            marginBottom: "0.5rem",
                                            fontSize: "0.9rem",
                                            fontWeight: "800",
                                            textTransform: "uppercase",
                                            color: "#666"
                                        }}>
                                            {(() => {
                                                if (!trip.startDate) return "";
                                                const [y, m, d] = trip.startDate.split("-");
                                                return `${parseInt(d)}. ${parseInt(m)}. ${y}`;
                                            })()}
                                        </div>
                                        <h3 style={{
                                            fontWeight: "900",
                                            fontSize: "1.75rem",
                                            lineHeight: 1.1,
                                            marginBottom: "0.5rem"
                                        }}>{trip.name}</h3>
                                        <p style={{ fontWeight: "600", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                            <img src="/place-icon.svg" alt="Location" style={{ width: "16px", height: "16px" }} /> {trip.location}
                                        </p>
                                    </div>
                                    <div style={{
                                        marginTop: "1.5rem",
                                        paddingTop: "1rem",
                                        borderTop: "2px solid #000",
                                        fontWeight: "600",
                                        display: "flex",
                                        justifyContent: "space-between"
                                    }}>
                                        <span>{trip.formType === 'apology' ? "Pouze omluvenky" : "Registrace"}</span>
                                        <span>➜</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showAddModal && (
                <div style={{
                    position: "fixed",
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    zIndex: 2000,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }} onClick={() => setShowAddModal(false)}>
                    <div style={{
                        backgroundColor: "white",
                        padding: "2rem",
                        border: "3px solid #000",
                        borderRadius: "16px",
                        boxShadow: "8px 8px 0 0 #000",
                        width: "100%",
                        maxWidth: "600px",
                        maxHeight: "90vh",
                        overflowY: "auto"
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                            <h2 style={{ fontSize: "1.5rem", fontWeight: "900" }}>Naplánovat Výpravu</h2>
                            <button onClick={() => setShowAddModal(false)} style={{ fontSize: "1.5rem", background: "none", border: "none", cursor: "pointer" }}>×</button>
                        </div>

                        <TripForm
                            onSubmit={handleCreate}
                            isLoading={isCreating}
                            buttonText="Vytvořit Výpravu"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
