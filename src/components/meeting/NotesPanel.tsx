"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import styles from "../../app/(dashboard)/rady/[meetingId]/MeetingRoom.module.css";
import Link from "next/link";

interface NotesPanelProps {
    meetingId: Id<"meetings">;
    tripId?: Id<"trips">;
    activePageId: Id<"meeting_pages"> | null;
    onPageSelect: (pageId: Id<"meeting_pages">) => void;
    onAddPage: (targetMeetingId: Id<"meetings">) => void;
    tripDocs?: any[];
    onConnectTrip?: () => void;
}

export default function NotesPanel({ 
    meetingId, 
    tripId,
    activePageId, 
    onPageSelect, 
    onAddPage,
    tripDocs,
    onConnectTrip
}: NotesPanelProps) {
    const pages = useQuery(api.pages.getByMeeting, { meetingId });
    const tripPages = useQuery(api.pages.getPagesByTrip, tripId ? { tripId } : "skip");
    
    // Get the meeting object to check category
    const currentMeeting = useQuery(api.meetings.get, { meetingId });
    const isNotebook = currentMeeting?.category === "notebook";

    if (!pages) return <div style={{ padding: "1rem", color: "#999" }}>Načítám...</div>;

    // 1. Organize all Trip Meetings into two distinct tracks
    const allMeetings = tripDocs ? [...tripDocs] : [];
    if (currentMeeting && !allMeetings.find(m => String(m._id) === String(meetingId))) {
        allMeetings.push(currentMeeting);
    }

    const councilMeetings = allMeetings.filter(m => m.category === "notebook").sort((a, b) => a.title.localeCompare(b.title));
    const docMeetings = allMeetings.filter(m => m.category === "documentation").sort((a, b) => a.title.localeCompare(b.title));

    // Handle standalone view (no tripId logic falls into allMeetings naturally now)
    const activeMeetings = { councilMeetings, docMeetings };

    // 2. Map pages to their respective meetings for easy rendering
    const pagesByMeeting = new Map<string, any[]>();
    if (tripPages) {
        tripPages.forEach(p => {
            if (!pagesByMeeting.has(p.meetingId)) pagesByMeeting.set(p.meetingId, []);
            pagesByMeeting.get(p.meetingId)?.push(p);
        });
    } else if (pages && meetingId) {
        pagesByMeeting.set(meetingId, pages);
    }

    const renderTrack = (title: string, meetingsToRender: any[], icon: string) => {
        if (!meetingsToRender || meetingsToRender.length === 0) return null;
        return (
            <div style={{ marginBottom: "2.5rem" }}>
                <h3 className={styles.sectionTitle} style={{ borderBottom: "3px solid #000", paddingBottom: "0.5rem", marginBottom: "1rem", color: "#000", fontWeight: "900", letterSpacing: "0.05em" }}>
                    {title}
                </h3>
                <div className={styles.sectionContent}>
                    {meetingsToRender.map(m => {
                        if (!m) return null;
                        const mId = m._id;
                        const mPages = pagesByMeeting.get(String(mId)) || [];
                        const isCurrentMeeting = String(mId) === String(meetingId);

                        return (
                            <div key={mId} style={{ marginBottom: isCurrentMeeting ? "1.5rem" : "1.25rem" }}>
                                {/* Document Header */}
                                <div style={{ 
                                    fontSize: "0.7rem", 
                                    fontWeight: "900", 
                                    color: isCurrentMeeting ? "#000" : "#666", 
                                    marginBottom: "0.4rem", 
                                    textTransform: "uppercase", 
                                    display: "flex", 
                                    alignItems: "center", 
                                    justifyContent: "space-between",
                                    gap: "0.3rem",
                                    opacity: isCurrentMeeting ? 1 : 0.8
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                                        {icon} {m.title}
                                    </div>
                                    {!isCurrentMeeting && (
                                        <Link 
                                            href={`/rady/${mId}`}
                                            title="Otevřít tuto místnost"
                                            style={{ 
                                                textDecoration: "none", 
                                                fontSize: "0.75rem", 
                                                filter: "grayscale(1)",
                                                opacity: 0.5
                                            }}
                                        >
                                            ↗
                                        </Link>
                                    )}
                                </div>

                                {/* Pages (Toggleable or always visible based on preference, here always visible for seamlessness) */}
                                {mPages.map((page: any) => (
                                    <button
                                        key={page._id}
                                        onClick={() => onPageSelect(page._id)}
                                        className={`${styles.pageItem} ${activePageId === page._id ? styles.active : ''}`}
                                        style={!isCurrentMeeting ? { borderLeft: "3px solid #fcd34d", background: "#fffbeb50" } : {}}
                                    >
                                        <span className={styles.pageIcon}>📄</span>
                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: activePageId === page._id ? "900" : "500" }}>
                                            {page.title}
                                        </span>
                                    </button>
                                ))}

                                <button
                                    onClick={() => onAddPage(m._id)}
                                    className={styles.addPageButton}
                                    style={{ border: "2px dashed #ccc", background: "transparent", color: "#666", fontSize: "0.7rem", padding: "0.3rem 0.5rem", marginTop: "0.25rem", opacity: 0.7 }}
                                >
                                    <span>+</span>
                                    <span style={{ fontSize: "0.65rem" }}>Přidat stránku</span>
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className={styles.section}>
            {/* PILLAR 1: ZÁPISY Z RAD - ONLY SHOWN IN RADA CONTEXT OR IF STANDALONE NOTEBOOK */}
            {isNotebook && renderTrack("ZÁPISY Z RAD", activeMeetings.councilMeetings, "📄")}

            {/* PILLAR 2: DOKUMENTACE VÝPRAVY - ALWAYS SHOWN IF CONNECTED */}
            {renderTrack("DOKUMENTACE VÝPRAVY", activeMeetings.docMeetings, "📔")}

            {/* INTEGRATION HUB: COMPACT FOOTER */}
            {tripId && (
                <div style={{ borderTop: "3px solid #000", paddingTop: "1.5rem", marginTop: "1rem" }}>
                    <div style={{ display: "flex", gap: "1rem" }}>
                        <div style={{ flex: 1 }}>
                            <h4 style={{ fontSize: "0.65rem", fontWeight: "900", marginBottom: "0.5rem", color: "#666" }}>
                                & ADDITIONS
                            </h4>
                            <div style={{ background: "#f9fafb", border: "1px solid #ddd", borderRadius: "6px", padding: "0.5rem", fontSize: "0.65rem" }}>
                                {isNotebook ? (
                                    <>
                                        <div style={{ color: "#059669", fontWeight: "700", marginBottom: "0.4rem" }}>✔ Adoptováno Radou</div>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                                            {activeMeetings.councilMeetings.filter(m => m?._id !== meetingId).map(m => (
                                                <Link 
                                                    key={m?._id} 
                                                    href={`/rady/${m?._id}`}
                                                    style={{ color: "#000", textDecoration: "none", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.2rem" }}
                                                >
                                                    📓 {m?.title}
                                                </Link>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <span style={{ color: "#999", fontStyle: "italic" }}>Dokumentace výpravy</span>
                                )}
                            </div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <h4 style={{ fontSize: "0.65rem", fontWeight: "900", marginBottom: "0.5rem", color: "#666" }}>
                                @ MENTIONS
                            </h4>
                            <div style={{ padding: "0.5rem", fontSize: "0.65rem", color: "#666", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px" }}>
                                Žádné zmínky
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {!tripId && onConnectTrip && (
                <div style={{ marginTop: "2rem", borderTop: "3px solid #000", paddingTop: "1rem" }}>
                    <button 
                        onClick={onConnectTrip}
                        className={styles.addPageButton}
                        style={{ background: "#fef3c7", color: "#92400e", borderColor: "#92400e" }}
                    >
                        <span>🔗</span> Připojit k výpravě
                    </button>
                </div>
            )}
        </div>
    );
}
