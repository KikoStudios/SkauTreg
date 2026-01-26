"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import Button from "../../../../components/Button";

const SpinningLogo = ({ src, alt = "Logo" }: { src?: string; alt?: string }) => (
    <div style={{
        width: "60px",
        height: "60px",
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
            <span style={{ fontSize: "0.7rem", fontWeight: "bold" }}>LOGO</span>
        )}
        <style jsx>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
);

export default function TroopDashboard() {
    const params = useParams();
    const router = useRouter();
    const troopId = params.troopId as Id<"troops">;

    const troop = useQuery(api.troops.getById, { id: troopId });
    const trips = useQuery(api.trips.list as any, { troopId });
    const updateTroop = useMutation(api.troops.update);

    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ name: "", number: "", type: "" });

    const handleEditClick = () => {
        router.push(`/settings/${troopId}`);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateTroop({
                id: troopId,
                name: editForm.name,
                number: editForm.number,
                type: editForm.type
            });
            setIsEditing(false);
        } catch (error) {
            console.error(error);
            alert("Chyba při ukládání nastavení.");
        }
    };

    if (troop === undefined) return <div>Načítám oddíl...</div>;
    if (troop === null) return <div>Oddíl nenalezen.</div>;

    const sections = [
        {
            title: "Členové",
            description: "Správa členů a kontaktů.",
            icon: <img src="/illustrations/clap-illustration.svg" alt="Members" style={{ height: "80px", width: "auto", display: "block" }} />,
            status: "completed",
            action: () => router.push(`/members?troopId=${troopId}`)
        },
        {
            title: "Výpravy (Přehled)",
            description: "Plánování a historie akcí.",
            icon: <img src="/illustrations/moutains-illustration.svg" alt="Trips" style={{ height: "80px", width: "auto", display: "block" }} />,
            status: "completed",
            action: () => router.push(`/trips?troopId=${troopId}`)
        },
        {
            title: "Vedení",
            description: "Správa vedoucích oddílu.",
            icon: <img src="/illustrations/satek-illustration.svg" alt="Leaders" style={{ height: "110px", width: "auto", display: "block" }} />,
            status: "completed",
            action: () => router.push(`/troop/${troopId}/leaders`)
        },
        {
            title: "Nastavení",
            description: "Úprava údajů o oddílu.",
            icon: <img src="/illustrations/settings-illustration.svg" alt="Settings" style={{ height: "80px", width: "auto", display: "block" }} />,
            status: "active",
            action: handleEditClick
        }
    ];

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
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <SpinningLogo src={troop.logo} />
                    <div>
                        {troop.number && <div style={{ fontSize: "0.9rem", fontWeight: "800", color: "#666" }}>{troop.number}. Oddíl</div>}
                        <h1 style={{ fontSize: "1.5rem", fontWeight: "900", margin: 0, lineHeight: 1 }}>{troop.name}</h1>
                    </div>
                </div>
            </div>

            {/* Dashboard Grid */}
            <div className="u-mb-4" style={{ marginBottom: "3rem" }}>
                <h3 className="u-text-lg u-font-bold u-mb-4">Rychlé Akce</h3>
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                    gap: "1.5rem"
                }}>
                    {sections.map((card, index) => (
                        <div key={index} onClick={card.action} style={{ cursor: "pointer" }}>
                            {/* Inline Card Style to match Grid context if Card component isn't styled perfectly for grid */}
                            <div style={{
                                backgroundColor: "white",
                                border: "3px solid #000",
                                borderRadius: "12px",
                                padding: "1.5rem",
                                boxShadow: "6px 6px 0 0 #000",
                                transition: "transform 0.1s, box-shadow 0.1s",
                                height: "100%",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between"
                            }}
                                onMouseDown={e => e.currentTarget.style.transform = "translate(2px, 2px)"}
                                onMouseUp={e => e.currentTarget.style.transform = "translate(0, 0)"}
                            >
                                <div>
                                    <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{card.icon}</div>
                                    <h3 style={{ fontSize: "1.25rem", fontWeight: "900", marginBottom: "0.5rem" }}>{card.title}</h3>
                                    <p style={{ fontSize: "0.9rem", color: "#666", fontWeight: "600" }}>{card.description}</p>
                                </div>
                                <div style={{ marginTop: "1rem", textAlign: "right", fontWeight: "900" }}>➜</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Trips List Section */}
            <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                    <h2 style={{ fontSize: "1.5rem", fontWeight: "900" }}>Nadcházející Výpravy</h2>
                    <Link href={`/trips?troopId=${troopId}`} style={{ textDecoration: "underline", fontWeight: "bold" }}>Zobrazit všechny</Link>
                </div>

                {!trips ? (
                    <div>Načítám výpravy...</div>
                ) : trips.length === 0 ? (
                    <div style={{ padding: "2rem", textAlign: "center", border: "3px dashed #ccc", borderRadius: "12px", fontWeight: "bold", color: "#888" }}>
                        Zatím žádné naplánované výpravy.
                    </div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "2rem" }}>
                        {trips.slice(0, 3).map((trip: any) => ( // Show only top 3
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
                                            {trip.startDate}
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

            {/* Modal Removed - Redirects to Settings Page */}
        </div>
    );
}
