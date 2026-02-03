"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { useSidebar } from "../../../../context/SidebarContext";
import MeetingSidebar from "../../../../components/meeting/MeetingSidebar";
import CollaborativeEditor from "../../../../components/editor/CollaborativeEditor";
import ImageAnnotator from "../../../../components/annotation/ImageAnnotator";
import styles from "./MeetingRoom.module.css";
import editorStyles from "../../../../components/editor/Editor.module.css";
import "tippy.js/dist/tippy.css";

export default function MeetingRoomPage({ params }: { params: Promise<{ meetingId: string }> }) {
    const router = useRouter();
    const { meetingId: meetingIdParam } = use(params);
    const meetingId = meetingIdParam as Id<"meetings">;
    const { isSidebarCollapsed } = useSidebar();

    const meeting = useQuery(api.meetings.get, { meetingId });
    const tripId = meeting?.tripId;
    const tripDocs = useQuery(api.meetings.listByTrip, tripId ? { tripId } : "skip");
    
    const pages = useQuery(api.pages.getByMeeting, { meetingId });
    const allTripPages = useQuery(api.pages.getPagesByTrip, tripId ? { tripId } : "skip");
    const joinMeeting = useMutation(api.meetings.join);
    const updateMeeting = useMutation(api.meetings.update);
    const createPage = useMutation(api.pages.create);
    const updatePageTitle = useMutation(api.pages.updateTitle);
    const heartbeat = useMutation(api.presence.heartbeat);
    const leaveMeeting = useMutation(api.presence.leave);

    const [activePageId, setActivePageId] = useState<Id<"meeting_pages"> | null>(null);
    const [pageTitle, setPageTitle] = useState("");
    const [showAnnotator, setShowAnnotator] = useState(false);
    const [showTripSelect, setShowTripSelect] = useState(false);
    const [selectedImage, setSelectedImage] = useState<{ fileId: Id<"meeting_files">; url: string } | null>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);

    const trips = useQuery(api.trips.list, meeting?.troopId ? { troopId: meeting.troopId } : "skip");

    const handleConnectTrip = async (selectedTripId: Id<"trips">) => {
        if (!meetingId) return;
        await updateMeeting({ meetingId, tripId: selectedTripId });
        setShowTripSelect(false);
    };

    // Auto-select first page
    useEffect(() => {
        if (pages && pages.length > 0 && !activePageId) {
            setActivePageId(pages[0]._id);
            setPageTitle(pages[0].title);
        }
    }, [pages, activePageId]);

    // Join meeting and setup heartbeat
    useEffect(() => {
        if (meetingId) {
            joinMeeting({ meetingId });

            const interval = setInterval(() => {
                heartbeat({ meetingId });
            }, 15000);

            return () => {
                clearInterval(interval);
                leaveMeeting({ meetingId });
            };
        }
    }, [meetingId]);

    // Update page title when switching pages
    useEffect(() => {
        // Search in current meeting pages first, then in all trip pages
        const activePage = pages?.find(p => p._id === activePageId) || 
                          allTripPages?.find(p => p._id === activePageId);
        if (activePage) {
            setPageTitle(activePage.title);
        }
    }, [activePageId, pages, allTripPages]);

    const handlePageSelect = (pageId: Id<"meeting_pages">) => {
        setActivePageId(pageId);
    };

    const handleAddPage = async (targetMeetingId: Id<"meetings">) => {
        const title = prompt("Enter page title:");
        if (title && targetMeetingId) {
            const newPageId = await createPage({ meetingId: targetMeetingId, title });
            setActivePageId(newPageId);
        }
    };

    const handleTitleBlur = async () => {
        if (activePageId && pageTitle) {
            await updatePageTitle({ pageId: activePageId, title: pageTitle });
        }
    };

    const handleImageClick = (fileId: Id<"meeting_files">, url: string) => {
        setSelectedImage({ fileId, url });
        setShowAnnotator(true);
    };

    if (!meeting) {
        return (
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100vh",
                flexDirection: "column",
                gap: "1rem"
            }}>
                <div style={{
                    fontSize: "3rem",
                    animation: "spin 1s linear infinite"
                }}>⚙️</div>
                <div style={{ fontSize: "1.25rem", fontWeight: "700" }}>Loading notebook...</div>
            </div>
        );
    }

    if (!pages || pages.length === 0) {
        return (
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100vh",
                flexDirection: "column",
                gap: "1rem"
            }}>
                <div style={{
                    fontSize: "3rem",
                    animation: "spin 1s linear infinite"
                }}>📄</div>
                <div style={{ fontSize: "1.25rem", fontWeight: "700" }}>Loading pages...</div>
            </div>
        );
    }

    return (
        <>
            <div
                className={styles.container}
                style={{
                    marginLeft: isSidebarCollapsed ? '0' : '0',
                    // The dashboard layout already handles the sidebar spacing
                    // This container is INSIDE the main content area
                }}
            >
                {/* Main Editor Area */}
                <div className={styles.mainArea}>
                    <div className={editorStyles.editorContainer}>
                        {/* Editable Title */}
                        <input
                            ref={titleInputRef}
                            type="text"
                            className={editorStyles.titleInput}
                            value={pageTitle}
                            onChange={(e) => setPageTitle(e.target.value)}
                            onBlur={handleTitleBlur}
                            placeholder="Untitled"
                        />

                        {/* Collaborative Editor */}
                        {activePageId && meeting && (
                            <CollaborativeEditor
                                key={activePageId}
                                pageId={activePageId}
                                troopId={meeting.troopId}
                                editable={true}
                            />
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <MeetingSidebar
                    meetingId={meetingId}
                    tripId={tripId}
                    activePageId={activePageId}
                    onPageSelect={handlePageSelect}
                    onAddPage={handleAddPage}
                    onImageClick={handleImageClick}
                    tripDocs={tripDocs}
                    onConnectTrip={() => setShowTripSelect(true)}
                />
            </div>

            {/* Trip Selection Modal */}
            {showTripSelect && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.5)", zIndex: 3000,
                    display: "flex", alignItems: "center", justifyContent: "center"
                }} onClick={() => setShowTripSelect(false)}>
                    <div style={{
                        backgroundColor: "white", padding: "2rem", border: "3px solid #000",
                        borderRadius: "16px", boxShadow: "8px 8px 0 0 #000", width: "95%", maxWidth: "450px"
                    }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: "1.5rem", fontWeight: "900", marginBottom: "1rem" }}>Připojit k výpravě</h2>
                        <p style={{ color: "#666", marginBottom: "1.5rem" }}>Tento notebook bude sdružen s vybranou výpravou a uvidíte jej v jejím přehledu.</p>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "300px", overflowY: "auto", paddingRight: "0.5rem" }}>
                            {trips?.map(trip => (
                                <button
                                    key={trip._id}
                                    onClick={() => handleConnectTrip(trip._id)}
                                    style={{
                                        padding: "1rem",
                                        textAlign: "left",
                                        backgroundColor: "#f9fafb",
                                        border: "2px solid #000",
                                        borderRadius: "8px",
                                        cursor: "pointer",
                                        fontWeight: "700",
                                        transition: "all 0.1s"
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#f3f4f6"; e.currentTarget.style.transform = "translate(-2px, -2px)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#f9fafb"; e.currentTarget.style.transform = "translate(0, 0)"; }}
                                >
                                    {trip.name}
                                    <div style={{ fontSize: "0.8rem", color: "#666", fontWeight: "500" }}>{trip.startDate}</div>
                                </button>
                            ))}
                            {trips?.length === 0 && (
                                <div style={{ textAlign: "center", padding: "1rem", color: "#999", fontStyle: "italic" }}>
                                    Žádné výpravy k dispozici.
                                </div>
                            )}
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "2rem" }}>
                            <button 
                                onClick={() => setShowTripSelect(false)}
                                style={{ padding: "0.75rem 1.5rem", fontWeight: "800", cursor: "pointer", background: "none", border: "none" }}
                            >
                                Zrušit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Annotator Popup */}
            {showAnnotator && selectedImage && (
                <ImageAnnotator
                    fileId={selectedImage.fileId}
                    imageUrl={selectedImage.url}
                    onClose={() => setShowAnnotator(false)}
                />
            )}
        </>
    );
}
