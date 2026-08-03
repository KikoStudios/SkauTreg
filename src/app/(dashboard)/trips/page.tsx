"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useEffect, useRef, useState } from "react";
import { Id } from "../../../../convex/_generated/dataModel";
import Link from "next/link";
import TripForm, { TripFormData } from "../../../components/TripForm";
import { useFeedback } from "@/context/FeedbackContext";
import { CalendarPlus, Plus, X } from "lucide-react";
import styles from "./TripsPage.module.css";

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
    const { showError, showSuccess } = useFeedback();
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

    useEffect(() => {
        if (troopIdParam) {
            setSelectedTroopId(troopIdParam as Id<"troops">);
        } else if (troops && troops.length > 0) {
            setSelectedTroopId((current) => current || troops[0]._id);
        }
    }, [troopIdParam, troops]);

    // Get currently selected troop details
    const selectedTroop = troops?.find(t => t._id === selectedTroopId);

    const trips = useQuery(api.trips.list, selectedTroopId ? { troopId: selectedTroopId } : "skip");
    const createTrip = useMutation(api.trips.create);

    const [isCreating, setIsCreating] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const createCloseRef = useRef<HTMLButtonElement>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState<"upcoming" | "old">("upcoming");

    useEffect(() => {
        const requestedTab = searchParams.get("tab");
        if (requestedTab === "upcoming" || requestedTab === "old") {
            setActiveTab(requestedTab);
        }
        if (searchParams.get("create") === "true") {
            setShowAddModal(true);
        }
    }, [searchParams]);

    useEffect(() => {
        if (!showAddModal) return;
        const previous = document.activeElement as HTMLElement | null;
        createCloseRef.current?.focus();
        const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && !isCreating && setShowAddModal(false);
        document.addEventListener("keydown", onKeyDown);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = "";
            previous?.focus();
        };
    }, [showAddModal, isCreating]);

    const handleCreate = async (data: TripFormData) => {
        if (!selectedTroopId) return;

        setIsCreating(true);
        try {
            await createTrip({
                troopId: selectedTroopId,
                ...data
            });
            setShowAddModal(false);
            showSuccess({
                title: "Uloženo",
                message: "Výprava byla vytvořena.",
                duration: 2500,
            });
        } catch (error) {
            showError({
                title: "Výpravu se nepodařilo vytvořit",
                message: error instanceof Error ? error.message : "Zkontrolujte údaje a zkuste to znovu.",
                icon: "error",
            });
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
    const filteredTrips = trips?.filter((t) =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.location && t.location.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Helper function to check if trip is upcoming or old
    const isUpcomingTrip = (trip: NonNullable<typeof trips>[number]) => {
        if (!trip.startDate) return true;
        const [y, m, d] = trip.startDate.split("-").map(Number);
        const tripStart = new Date(y, m - 1, d);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return tripStart >= today;
    };

    // Filter by tab
    const tabFilteredTrips = filteredTrips?.filter((t) => {
        const isUpcoming = isUpcomingTrip(t);
        return activeTab === "upcoming" ? isUpcoming : !isUpcoming;
    }) || [];

    return (
        <div style={{ width: "100%", position: "relative", overflowX: "hidden", paddingBottom: "2rem" }}>
            {/* Top Title Bar */}
            <div className="headingContainer">
                <h1 style={{ fontSize: "1.5rem", fontWeight: "900", margin: 0 }}>Výpravy</h1>
            </div>

            <div className="dashboardContent">
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

                {/* Tabs */}
                <div className="tabs-switcher">
                    <button
                        onClick={() => setActiveTab("upcoming")}
                        className={`tab-button ${activeTab === "upcoming" ? "active" : ""}`}
                    >
                        Nadcházející
                    </button>
                    <button
                        onClick={() => setActiveTab("old")}
                        className={`tab-button ${activeTab === "old" ? "active" : ""}`}
                    >
                        Archiv
                    </button>
                </div>

                {/* ADD Button */}
                <button
                    onClick={() => setShowAddModal(true)}
                    className="add-button"
                    onMouseDown={e => e.currentTarget.style.transform = "translate(2px, 2px)"}
                    onMouseUp={e => e.currentTarget.style.transform = "translate(0, 0)"}
                >
                    <Plus size={22} strokeWidth={3} /> Přidat výpravu
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
                    border-radius: 10px;
                    border: 2px solid #000;
                    box-shadow: 2px 2px 0 0 #000;
                    font-weight: 800;
                    font-size: 1rem;
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
                .tabs-switcher {
                    display: flex;
                    gap: 1rem;
                    align-items: center;
                    padding: 0;
                    background: transparent;
                    border: 0;
                    border-bottom: 1px solid #ccc;
                    border-radius: 0;
                }
                .tab-button {
                    padding: 0.6rem 1.25rem;
                    border-radius: 0;
                    border: 0;
                    border-bottom: 3px solid transparent;
                    background-color: transparent;
                    font-weight: 800;
                    font-size: 0.95rem;
                    cursor: pointer;
                    transition: transform 0.1s, box-shadow 0.1s, background-color 0.1s;
                    box-shadow: none;
                }
                .tab-button.active {
                    color: #166534;
                    background-color: transparent;
                    border-bottom-color: #16803c;
                    box-shadow: none;
                }
                .search-input {
                    width: 100%;
                    padding: 0.75rem 1.5rem;
                    border-radius: 10px;
                    border: 2px solid #000;
                    box-shadow: 2px 2px 0 0 #000;
                    font-size: .95rem;
                    outline: none;
                    font-weight: 500;
                }
                .add-button {
                    padding: 0.75rem 2rem;
                    border-radius: 10px;
                    background-color: var(--color-primary);
                    border: 2px solid #000;
                    box-shadow: 2px 2px 0 0 #000;
                    font-size: .9rem;
                    font-weight: 850;
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
                    .tabs-switcher {
                        width: 100%;
                        justify-content: center;
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
                ) : tabFilteredTrips.length === 0 ? (
                    <div style={{
                        padding: "3rem",
                        textAlign: "center",
                        border: "3px dashed #ccc",
                        borderRadius: "12px",
                        fontWeight: "bold",
                        color: "#888"
                    }}>
                        Žádné výpravy nenalezeny. Klikněte na Přidat výpravu pro naplánování nové.
                    </div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "2rem", padding: "0.5rem" }}>
                        {tabFilteredTrips.map((trip) => (
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
                                            color: "#666",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center"
                                        }}>
                                            <span>
                                                {(() => {
                                                    if (!trip.startDate) return "";
                                                    const [y, m, d] = trip.startDate.split("-");
                                                    return `${parseInt(d)}. ${parseInt(m)}. ${y}`;
                                                })()}
                                            </span>
                                            <span style={{
                                                padding: "0.3rem 0.75rem",
                                                borderRadius: "6px",
                                                fontSize: "0.75rem",
                                                fontWeight: "700",
                                                backgroundColor: isUpcomingTrip(trip) ? "#dbeafe" : "#fecaca",
                                                color: isUpcomingTrip(trip) ? "#075985" : "#991b1b",
                                                border: "1px solid " + (isUpcomingTrip(trip) ? "#0284c7" : "#dc2626")
                                            }}>
                                                {isUpcomingTrip(trip) ? "BUDE" : "Proběhlo"}
                                            </span>
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
                                        {trip.baseName && (
                                            <div style={{
                                                marginTop: "0.75rem",
                                                padding: "0.5rem 0.75rem",
                                                backgroundColor: "#E3F2FD",
                                                border: "2px solid #000",
                                                borderRadius: "8px",
                                                fontSize: "0.85rem",
                                                fontWeight: "700",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "0.5rem"
                                            }}>
                                                <img src="/houe-icon.svg" alt="Base" style={{ width: "16px", height: "16px" }} />
                                                {trip.baseName}
                                            </div>
                                        )}
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

            </div>

            {/* Create Modal */}
            {showAddModal && (
                <div className={styles.createOverlay} onMouseDown={(event) => event.target === event.currentTarget && setShowAddModal(false)}>
                    <section className={styles.createDialog} role="dialog" aria-modal="true" aria-labelledby="create-trip-title">
                        <header className={styles.createHeader}>
                            <div className={styles.createHeading}>
                                <span className={styles.createIcon}><CalendarPlus size={21} /></span>
                                <div><span>Nová výprava</span><h2 id="create-trip-title">Naplánovat výpravu</h2></div>
                            </div>
                            <button ref={createCloseRef} type="button" className={styles.closeButton} onClick={() => setShowAddModal(false)} aria-label="Zavřít"><X size={20} /></button>
                        </header>

                        <div className={styles.createBody}>
                            <p className={styles.createIntro}>Nejdřív vyplňte základní údaje. Způsob přihlašování a vlastní otázky nastavíte ve druhé části.</p>
                            <TripForm
                                onSubmit={handleCreate}
                                isLoading={isCreating}
                                buttonText="Vytvořit výpravu"
                            />
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}
