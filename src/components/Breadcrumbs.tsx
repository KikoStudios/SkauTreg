"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

// Helper to check for valid IDs
const isId = (segment: string) => segment.length > 20 && !segment.includes("-"); // Rough convex ID check

export default function Breadcrumbs() {
    const pathname = usePathname();
    const segments = pathname.split("/").filter(Boolean);

    // Fetch data for resolution (Optional but nice)
    // We can't easily fetch everything dynamically per ID without complex logic.
    // For now, we mapp known segments and treat IDs as "Detail".
    // OR we inspect the ID. If we are in /troop/[id], we can fetch that troop.
    // This component will mount on every page, so lightweight is key.

    // Let's map segment names
    const segmentMap: Record<string, string> = {
        "troop": "Oddíly",
        "members": "Členové",
        "trips": "Výpravy",
        "settings": "Nastavení",
        "calendar": "Kalendář",
        "documents": "Dokumenty",
        "meetings": "Dokumenty",
        "rady": "Dokumenty"
    };

    const searchParams = useSearchParams();
    const troopIdParam = searchParams.get("troopId");

    // Determine if we have a troop context (either from URL params or path)
    let effectiveTroopId: string | null = troopIdParam;
    if (!effectiveTroopId && segments[0] === "troop" && segments[1] && isId(segments[1])) {
        effectiveTroopId = segments[1];
    }

    // Fetch troop details if we have an ID
    const troop = useQuery(api.troops.getById, effectiveTroopId ? { id: effectiveTroopId as Id<"troops"> } : "skip");
    const troopName = troop?.name || "Detail";

    if (segments.length === 0) return null;

    // Special override structure for Members and Trips when a Troop is context
    if ((segments[0] === "members" || segments[0] === "trips") && troopIdParam) {
        const label = segmentMap[segments[0]] || segments[0];
        return (
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.9rem",
                fontWeight: "600",
                marginBottom: "1rem",
                color: "#666"
            }}>
                <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>Domů</Link>
                <span>/</span>
                <Link href="/troop" style={{ textDecoration: "none", color: "inherit" }}>Oddíly</Link>
                <span>/</span>
                <Link href={`/troop/${troopIdParam}`} style={{ textDecoration: "none", color: "inherit" }}>{troopName}</Link>
                <span>/</span>
                <span style={{ color: "black", fontWeight: "800" }}>{label}</span>
            </div>
        );
    }

    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.9rem",
            fontWeight: "600",
            marginBottom: "1rem",
            color: "#666"
        }}>
            <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>Domů</Link>

            {segments.map((segment, index) => {
                const isLast = index === segments.length - 1;
                const path = `/${segments.slice(0, index + 1).join("/")}`;

                let label = segmentMap[segment] || segment;

                // Simple ID formatting if not found
                if (isId(segment)) {
                    // If this segment is the troop ID we fetched, use the name
                    if (segment === effectiveTroopId && troop) {
                        label = troop.name;
                    } else {
                        label = "Detail";
                    }
                }

                return (
                    <div key={path} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span>/</span>
                        {isLast ? (
                            <span style={{ color: "black", fontWeight: "800" }}>{label}</span>
                        ) : (
                            <Link href={path} style={{ textDecoration: "underline", color: "inherit" }}>
                                {label}
                            </Link>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
