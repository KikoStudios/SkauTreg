"use client";

import * as React from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useState } from "react";
import Image from "next/image";

export function CommandMenu() {
    const router = useRouter();
    const [open, setOpen] = useState(false);

    // Data for comprehensive search
    const troops = useQuery(api.troops.getByUser) || [];
    const trips = useQuery(api.trips.getAllUserTrips) || [];
    const members = useQuery(api.members.getAllUserMembers) || [];
    const bases = useQuery(api.bases.getAllBases) || [];

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
                        <span style={{ fontSize: "1.2rem", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.35-4.35" />
                            </svg>
                        </span>
                        <Command.Input
                            placeholder="Hledejte výpravy, členy, oddíly, základny a další..."
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
                            <Item icon="/icons/home-icon-dark.svg" onSelect={() => runCommand(() => router.push("/"))}>Domů</Item>
                            <Item icon="/icons/oddil-icon-dark.svg" onSelect={() => runCommand(() => router.push("/troop"))}>Moje Oddíly</Item>
                            <Item icon="/icons/clenove-icon-dark.svg" onSelect={() => runCommand(() => router.push("/members"))}>Členové</Item>
                            <Item icon="/icons/vypravy-icon-dark.svg" onSelect={() => runCommand(() => router.push("/trips"))}>Výpravy</Item>
                            <Item icon="/icons/rady-icon.svg" onSelect={() => runCommand(() => router.push("/rady"))}>Rady</Item>
                            <Item icon="/icons/wall-dark.svg" onSelect={() => runCommand(() => router.push("/tools"))}>Vyhledávač základen</Item>
                            <Item icon="/icons/kalendar-icon-dark.svg" onSelect={() => runCommand(() => router.push("/calendar"))}>Kalendář</Item>
                            <Item icon="/icons/nastaveni-icon-dark.svg" onSelect={() => runCommand(() => router.push("/settings"))}>Nastavení</Item>
                        </Group>

                        <Group heading="Akce">
                            <Item
                                icon={<PlusIcon />}
                                onSelect={() => runCommand(() => router.push("/troop?create=true"))}
                            >
                                Vytvořit nový oddíl
                            </Item>
                            <Item
                                icon={<PlusIcon />}
                                onSelect={() => runCommand(() => router.push("/trips?create=true"))}
                            >
                                Naplánovat výpravu
                            </Item>
                            <Item
                                icon={<PlusIcon />}
                                onSelect={() => runCommand(() => router.push("/members?create=true"))}
                            >
                                Přidat člena
                            </Item>
                        </Group>

                        {troops.length > 0 && (
                            <Group heading="Moje Oddíly">
                                {troops.map((troop: any) => (
                                    <Item
                                        key={troop._id}
                                        icon="/icons/oddil-icon-dark.svg"
                                        onSelect={() => runCommand(() => router.push(`/troop/${troop._id}`))}
                                    >
                                        {troop.name}
                                    </Item>
                                ))}
                            </Group>
                        )}

                        {trips.length > 0 && (
                            <Group heading="Výpravy">
                                {trips.map((trip: any) => (
                                    <TripItem
                                        key={trip._id}
                                        trip={trip}
                                        onSelect={() => runCommand(() => router.push(`/trips/${trip._id}`))}
                                    />
                                ))}
                            </Group>
                        )}

                        {bases.length > 0 && (
                            <Group heading="Základny">
                                {bases.map((base: any) => (
                                    <BaseItem
                                        key={base._id}
                                        base={base}
                                        onSelect={() => runCommand(() => router.push(`/tools?baseId=${base._id}`))}
                                    />
                                ))}
                            </Group>
                        )}

                        {members.length > 0 && (
                            <Group heading="Členové">
                                {members.map((member: any) => (
                                    <MemberItem
                                        key={member._id}
                                        member={member}
                                        onSelect={() => runCommand(() => router.push(`/members?memberId=${member._id}`))}
                                    />
                                ))}
                            </Group>
                        )}

                        <Group heading="Systém">
                            <Item
                                icon={<RefreshIcon />}
                                onSelect={() => runCommand(() => window.location.reload())}
                            >
                                Obnovit stránku
                            </Item>
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

const Item = ({ children, onSelect, icon, ...props }: any) => (
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
        {...props}
    >
        {typeof icon === "string" ? (
            <Image src={icon} alt="" width={20} height={20} style={{ flexShrink: 0 }} />
        ) : (
            <span style={{ width: "20px", height: "20px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {icon}
            </span>
        )}
        <span>{children}</span>
    </Command.Item>
);

// Trip Item with detailed info box
const TripItem = ({ trip, onSelect }: any) => {
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("cs-CZ", { day: "numeric", month: "short" });
    };

    return (
        <Command.Item
            onSelect={onSelect}
            value={`${trip.name} ${trip.location} ${trip.description || ""}`}
            style={{
                padding: "0.75rem",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "600",
                display: "flex",
                gap: "0.75rem",
                alignItems: "flex-start",
                transition: "background 0.1s"
            }}
        >
            <Image src="/icons/vypravy-icon-dark.svg" alt="" width={20} height={20} style={{ flexShrink: 0, marginTop: "2px" }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: "700", fontSize: "1rem" }}>{trip.name}</span>
                    {trip.troopName && (
                        <span style={{
                            fontSize: "0.75rem",
                            padding: "0.125rem 0.5rem",
                            borderRadius: "4px",
                            backgroundColor: trip.troopColor || "#e5e5e5",
                            color: "#000",
                            fontWeight: "600"
                        }}>
                            {trip.troopName}
                        </span>
                    )}
                </div>
                <div style={{ display: "flex", gap: "1rem", fontSize: "0.85rem", color: "#666" }}>
                    <span>
                        <MapPinIcon /> {trip.location}
                    </span>
                    <span>
                        <CalendarIcon /> {formatDate(trip.startDate)}
                        {trip.endDate && ` - ${formatDate(trip.endDate)}`}
                    </span>
                </div>
                {trip.description && (
                    <p style={{
                        fontSize: "0.8rem",
                        color: "#888",
                        margin: "0.25rem 0 0 0",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: "100%"
                    }}>
                        {trip.description}
                    </p>
                )}
            </div>
        </Command.Item>
    );
};

// Member Item with info
const MemberItem = ({ member, onSelect }: any) => {
    const getAge = (birthDate?: string) => {
        if (!birthDate) return null;
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    const age = getAge(member.birthDate);

    return (
        <Command.Item
            onSelect={onSelect}
            value={`${member.name} ${member.nickname || ""} ${member.parentName || ""} ${member.email || ""}`}
            style={{
                padding: "0.75rem",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "600",
                display: "flex",
                gap: "0.75rem",
                alignItems: "flex-start",
                transition: "background 0.1s"
            }}
        >
            <Image src="/icons/clenove-icon-dark.svg" alt="" width={20} height={20} style={{ flexShrink: 0, marginTop: "2px" }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: "700", fontSize: "1rem" }}>
                        {member.name}
                        {member.nickname && ` "${member.nickname}"`}
                    </span>
                    {age !== null && (
                        <span style={{
                            fontSize: "0.75rem",
                            padding: "0.125rem 0.5rem",
                            borderRadius: "4px",
                            backgroundColor: "#e5e5e5",
                            color: "#000",
                            fontWeight: "600"
                        }}>
                            {age} let
                        </span>
                    )}
                </div>
                <div style={{ fontSize: "0.85rem", color: "#666" }}>
                    {member.troopName && <span>{member.troopName}</span>}
                    {member.parentName && <span> • Rodič: {member.parentName}</span>}
                </div>
            </div>
        </Command.Item>
    );
};

// Base Item with info
const BaseItem = ({ base, onSelect }: any) => {
    return (
        <Command.Item
            onSelect={onSelect}
            value={`${base.name} ${base.location?.city || ""} ${base.location?.address || ""}`}
            style={{
                padding: "0.75rem",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "600",
                display: "flex",
                gap: "0.75rem",
                alignItems: "flex-start",
                transition: "background 0.1s"
            }}
        >
            <span style={{ width: "20px", height: "20px", flexShrink: 0, marginTop: "2px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                </svg>
            </span>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: "700", fontSize: "1rem" }}>{base.name}</span>
                    {base.typeKey && (
                        <span style={{
                            fontSize: "0.75rem",
                            padding: "0.125rem 0.5rem",
                            borderRadius: "4px",
                            backgroundColor: "#e5e5e5",
                            color: "#000",
                            fontWeight: "600",
                            textTransform: "capitalize"
                        }}>
                            {base.typeKey}
                        </span>
                    )}
                </div>
                <div style={{ display: "flex", gap: "1rem", fontSize: "0.85rem", color: "#666" }}>
                    {base.location?.city && <span><MapPinIcon /> {base.location.city}</span>}
                    {base.capacity && <span>📍 {base.capacity} míst</span>}
                </div>
            </div>
        </Command.Item>
    );
};

// Icon components (inline SVG replacements)
const PlusIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 5v14M5 12h14" />
    </svg>
);

const RefreshIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
    </svg>
);

const MapPinIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: "inline", verticalAlign: "middle", marginRight: "0.25rem" }}>
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);

const CalendarIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: "inline", verticalAlign: "middle", marginRight: "0.25rem" }}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);
