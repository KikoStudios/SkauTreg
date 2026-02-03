"use client";

import { useState, useEffect } from "react";

interface MeetingTimerProps {
    startTime: string;
}

export default function MeetingTimer({ startTime }: MeetingTimerProps) {
    const [elapsed, setElapsed] = useState("");

    useEffect(() => {
        const updateTimer = () => {
            const start = new Date(startTime).getTime();
            const now = Date.now();
            const diff = now - start;

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setElapsed(
                `${hours.toString().padStart(2, "0")}:${minutes
                    .toString()
                    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
            );
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [startTime]);

    return (
        <div style={{
            fontFamily: "monospace",
            fontSize: "0.875rem",
            fontWeight: "700",
            padding: "0.375rem 0.75rem",
            background: "white",
            border: "2px solid #000",
            borderRadius: "8px",
        }}>
            {elapsed}
        </div>
    );
}
