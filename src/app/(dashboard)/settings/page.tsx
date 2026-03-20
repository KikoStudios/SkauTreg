"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";

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

export default function SettingsPage() {
    const troops = useQuery(api.troops.getByUser);

    if (troops === undefined) return <div>Načítám nastavení...</div>;

    return (
        <div className="dashboardContentX" style={{ width: "100%", position: "relative", overflowX: "hidden", paddingBottom: "2rem" }}>
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
                <h1 style={{ fontSize: "1.5rem", fontWeight: "900", margin: 0 }}>Nastavení</h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <img src="/icons/settings-icon.svg" alt="settings" style={{ width: '32px', height: '32px' }} />
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0 }}>Vyberte oddíl k úpravě</h2>
            </div>

            {troops.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem" }}>
                    <p>Zatím nemáte žádné oddíly.</p>
                    <Link href="/troop" style={{ color: "blue", textDecoration: "underline" }}>Vytvořit Oddíl</Link>
                </div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "2rem" }}>
                    {troops.map((troop) => (
                        <Link href={`/settings/${troop._id}`} key={troop._id} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div style={{
                                backgroundColor: 'white',
                                border: '3px solid #000',
                                borderRadius: '12px',
                                padding: '1.5rem',
                                boxShadow: "6px 6px 0 0 #000",
                                transition: "transform 0.1s",
                                display: "flex",
                                alignItems: "center",
                                gap: "1.5rem",
                                cursor: "pointer"
                            }}
                                onMouseDown={e => e.currentTarget.style.transform = "translate(2px, 2px)"}
                                onMouseUp={e => e.currentTarget.style.transform = "translate(0, 0)"}
                            >
                                <SpinningLogo src={troop.logo} />
                                <div>
                                    <h3 style={{ fontSize: "1.25rem", fontWeight: "900", margin: 0 }}>{troop.name}</h3>
                                    {troop.number && <p style={{ margin: 0, fontWeight: "600", color: "#666" }}>{troop.number}. Oddíl</p>}
                                </div>
                                <div style={{ marginLeft: "auto" }}>
                                    <img src="/icons/settings-icon.svg" alt="settings" style={{ width: "32px", height: "32px" }} />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
