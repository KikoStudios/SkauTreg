"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useState } from "react";

interface MeetingControlsProps {
    meetingId: Id<"meetings">;
    meetingStatus: string;
    onStatusChange?: () => void;
}

export default function MeetingControls({ meetingId, meetingStatus, onStatusChange }: MeetingControlsProps) {
    const updateStatus = useMutation(api.meetings.updateStatus);
    const [showEndConfirm, setShowEndConfirm] = useState(false);

    const handleStart = async () => {
        await updateStatus({ meetingId, status: "ongoing" });
        onStatusChange?.();
    };

    const handleEnd = async () => {
        await updateStatus({ meetingId, status: "past" });
        setShowEndConfirm(false);
        onStatusChange?.();
    };

    if (meetingStatus === "past") {
        return (
            <div style={{
                padding: "0.75rem",
                background: "#e3f2fd",
                border: "2px solid #2196f3",
                borderRadius: "12px",
                textAlign: "center",
                fontWeight: "700",
                color: "#1976d2",
                fontSize: "0.875rem",
            }}>
                Meeting Ended
            </div>
        );
    }

    if (meetingStatus === "prepared") {
        return (
            <button
                onClick={handleStart}
                style={{
                    width: "100%",
                    padding: "1rem",
                    background: "#4caf50",
                    color: "white",
                    border: "3px solid #000",
                    borderRadius: "12px",
                    fontWeight: "900",
                    fontSize: "1rem",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    textTransform: "uppercase",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#45a049";
                    e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#4caf50";
                    e.currentTarget.style.transform = "translateY(0)";
                }}
            >
                Start Meeting
            </button>
        );
    }

    return (
        <>
            <button
                onClick={() => setShowEndConfirm(true)}
                style={{
                    width: "100%",
                    padding: "1rem",
                    background: "#4caf50",
                    color: "white",
                    border: "3px solid #000",
                    borderRadius: "12px",
                    fontWeight: "900",
                    fontSize: "1rem",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    textTransform: "uppercase",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#45a049";
                    e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#4caf50";
                    e.currentTarget.style.transform = "translateY(0)";
                }}
            >
                Ukončit Radu
            </button>

            {showEndConfirm && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(0, 0, 0, 0.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1000,
                    }}
                    onClick={() => setShowEndConfirm(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: "white",
                            border: "3px solid #000",
                            borderRadius: "16px",
                            padding: "2rem",
                            maxWidth: "400px",
                            width: "90%",
                        }}
                    >
                        <h3 style={{ margin: "0 0 1rem 0", fontWeight: "900", fontSize: "1.25rem" }}>
                            End Meeting?
                        </h3>
                        <p style={{ margin: "0 0 1.5rem 0", color: "#757575", fontSize: "0.875rem" }}>
                            Are you sure you want to end this meeting? You can still edit the content afterwards.
                        </p>
                        <div style={{ display: "flex", gap: "0.75rem" }}>
                            <button
                                onClick={() => setShowEndConfirm(false)}
                                style={{
                                    flex: 1,
                                    padding: "0.75rem",
                                    background: "white",
                                    border: "2px solid #000",
                                    borderRadius: "8px",
                                    fontWeight: "700",
                                    cursor: "pointer",
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEnd}
                                style={{
                                    flex: 1,
                                    padding: "0.75rem",
                                    background: "#f44336",
                                    color: "white",
                                    border: "2px solid #000",
                                    borderRadius: "8px",
                                    fontWeight: "700",
                                    cursor: "pointer",
                                }}
                            >
                                End Meeting
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
