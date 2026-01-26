"use client";

import * as React from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useState } from "react";

export function CommandMenu() {
    const router = useRouter();
    const [open, setOpen] = useState(false);

    // Data for quick navigation
    const troops = useQuery(api.troops.getByUser) || [];
    const trips = useQuery(api.trips.getAllUserTrips) || [];

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const runCommand = React.useCallback((command: () => unknown) => {
        setOpen(false);
        command();
    }, []);

    if (!open) return null;

    return (
        <div style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(2px)"
        }} onClick={() => setOpen(false)}>
            <div
                onClick={(e) => e.stopPropagation()}
                style={{ width: "100%", maxWidth: "640px" }}
            >
                <Command style={{
                    width: "100%",
                    backgroundColor: "white",
                    border: "3px solid #000",
                    borderRadius: "12px",
                    boxShadow: "8px 8px 0 0 #000",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column"
                }}
                    label="Command Menu"
                >
                    <div style={{ borderBottom: "3px solid #000", padding: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "1.2rem" }}>🔍</span>
                        <Command.Input
                            placeholder="Napište příkaz nebo hledejte..."
                            style={{
                                border: "none",
                                outline: "none",
                                fontSize: "1.2rem",
                                fontWeight: "600",
                                width: "100%",
                            }}
                        />
                    </div>

                    <Command.List style={{
                        maxHeight: "400px",
                        overflowY: "auto",
                        padding: "0.5rem"
                    }}>
                        <Command.Empty style={{ padding: "2rem", textAlign: "center", fontStyle: "italic" }}>
                            Žádné výsledky.
                        </Command.Empty>

                        <Group heading="Stránky">
                            <Item onSelect={() => runCommand(() => router.push("/"))}>🏠 Domů</Item>
                            <Item onSelect={() => runCommand(() => router.push("/troop"))}>🏕️ Moje Oddíly</Item>
                            <Item onSelect={() => runCommand(() => router.push("/members"))}>👥 Členové</Item>
                            <Item onSelect={() => runCommand(() => router.push("/trips"))}>🗺️ Výpravy</Item>
                            <Item onSelect={() => runCommand(() => router.push("/calendar"))}>🗓️ Kalendář</Item>
                            <Item onSelect={() => runCommand(() => router.push("/settings"))}>⚙️ Nastavení</Item>
                        </Group>

                        <Group heading="Akce">
                            <Item onSelect={() => runCommand(() => router.push("/troop?create=true"))}>➕ Vytvořit nový oddíl</Item>
                            <Item onSelect={() => runCommand(() => router.push("/trips?create=true"))}>➕ Naplánovat výpravu</Item>
                            <Item onSelect={() => runCommand(() => router.push("/members?create=true"))}>➕ Přidat člena</Item>
                        </Group>

                        {troops.length > 0 && (
                            <Group heading="Moje Oddíly">
                                {troops.map((troop: any) => (
                                    <Item key={troop._id} onSelect={() => runCommand(() => router.push(`/troop/${troop._id}`))}>
                                        🏕️ {troop.name}
                                    </Item>
                                ))}
                            </Group>
                        )}

                        {trips.length > 0 && (
                            <Group heading="Nadcházející Výpravy">
                                {trips.slice(0, 5).map((trip: any) => (
                                    <Item key={trip._id} onSelect={() => runCommand(() => router.push(`/trips/${trip._id}`))}>
                                        📍 {trip.name}
                                    </Item>
                                ))}
                            </Group>
                        )}

                        <Group heading="Systém">
                            <Item onSelect={() => runCommand(() => window.location.reload())}>🔄 Obnovit stránku</Item>
                        </Group>

                    </Command.List>
                </Command>
            </div>
        </div>
    );
}

// Subcomponents for styling
const Group = ({ heading, children }: { heading: string, children: React.ReactNode }) => (
    <Command.Group heading={heading} style={{ marginBottom: "0.5rem" }}>
        <div style={{
            fontSize: "0.8rem",
            fontWeight: "800",
            color: "#666",
            padding: "0.5rem 0.5rem 0.25rem 0.5rem",
            textTransform: "uppercase",
            letterSpacing: "1px"
        }}>
            {heading}
        </div>
        {children}
    </Command.Group>
);

const Item = ({ children, onSelect, ...props }: any) => (
    <Command.Item
        onSelect={onSelect}
        style={{
            padding: "0.75rem",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "600",
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            transition: "background 0.1s"
        }}
        className="cmd-item" // We'll add a global style for hover via CSS or localized style injection if needed, but CSS module or global css is better.
        // Quick inline hover hack not possible with standard React style without state, relying on global CSS or simple style.
        // Let's use a class and assume globals.css or similar. Or basic active style.
        {...props}
    >
        {children}
    </Command.Item>
);
