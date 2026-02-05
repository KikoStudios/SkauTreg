"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isWithinInterval, parseISO } from "date-fns";
import { cs } from "date-fns/locale";
import Link from "next/link";
import styles from "./Calendar.module.css";

export default function CalendarPage() {
    const trips = useQuery(api.trips.getAllUserTrips);
    const [currentDate, setCurrentDate] = useState(new Date());

    const startDate = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const endDate = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const today = () => setCurrentDate(new Date());

    if (trips === undefined) {
        return <div>Načítám kalendář...</div>;
    }

    return (
        <div style={{ width: "100%", position: "relative", overflowX: "visible" }}>
            {/* Top Title Bar */}
            <div style={{
                backgroundColor: "white",
                borderBottom: "3px solid #000",
                padding: "1rem",
                margin: "0 -2rem 2rem -2rem", // Break out to full width
                width: "calc(100% + 4rem)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.5rem"
            }}>
                <h1 style={{ fontSize: "1.5rem", fontWeight: "900", margin: 0 }}>Kalendář</h1>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                    <button onClick={prevMonth} style={navButtonStyle}>←</button>
                    <span style={{ fontSize: "1rem", fontWeight: "800", minWidth: "120px", textAlign: "center" }}>
                        {format(currentDate, "MMMM yyyy", { locale: cs })}
                    </span>
                    <button onClick={nextMonth} style={navButtonStyle}>→</button>
                    <button onClick={today} style={{ ...navButtonStyle, fontSize: "0.8rem", width: "auto", padding: "0 0.75rem", whiteSpace: "nowrap" }}>Dnes</button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div style={{
                border: "3px solid #000",
                borderRadius: "12px",
                overflow: "hidden",
                backgroundColor: "white",
                boxShadow: "8px 8px 0 0 #000"
            }}>
                {/* Header Days */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    backgroundColor: "#f4f4f5",
                    borderBottom: "3px solid #000"
                }}>
                    {["Po", "Út", "St", "Čt", "Pá", "So", "Ne"].map(day => (
                        <div key={day} style={{
                            padding: "0.75rem 0.5rem",
                            textAlign: "center",
                            fontWeight: "800",
                            borderRight: "1px solid #ccc",
                            fontSize: "0.875rem"
                        }}>
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                    {calendarDays.map((day, dayIdx) => {
                        const dayTrips = trips.filter(trip => {
                            const start = parseISO(trip.startDate); // Assuming YYYY-MM-DD
                            // Simple check: is start date same as this day?
                            // Better check for multi-day: is day within start and end?

                            // Let's assume startDate is required and endDate is optional
                            const s = parseISO(trip.startDate);
                            const e = trip.endDate ? parseISO(trip.endDate) : s;

                            return isWithinInterval(day, { start: s, end: e });
                        });

                        return (
                            <div key={day.toString()} style={{
                                minHeight: "80px",
                                padding: "0.25rem",
                                borderRight: (dayIdx + 1) % 7 === 0 ? "none" : "1px solid #eee",
                                borderBottom: "1px solid #eee",
                                backgroundColor: isSameMonth(day, currentDate) ? "white" : "#fafafa",
                                opacity: isSameMonth(day, currentDate) ? 1 : 0.5,
                                position: "relative",
                                overflow: "hidden"
                            }}>
                                <div style={{
                                    textAlign: "right",
                                    fontWeight: "bold",
                                    marginBottom: "0.5rem",
                                    color: isSameDay(day, new Date()) ? "#2563eb" : "inherit"
                                }}>
                                    {format(day, "d")}
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                                    {dayTrips.map(trip => (
                                        <Link key={trip._id} href={`/trips/${trip._id}`} style={{ textDecoration: "none" }}>
                                            <div style={{
                                                fontSize: "0.75rem",
                                                padding: "0.25rem 0.5rem",
                                                borderRadius: "4px",
                                                backgroundColor: trip.troopColor || "#e2e8f0",
                                                border: "1px solid #000",
                                                color: "black",
                                                fontWeight: "600",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                boxShadow: "1px 1px 0 0 #000",
                                                transition: "transform 0.1s",
                                                cursor: "pointer"
                                            }}>
                                                {trip.name}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

const navButtonStyle = {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    border: "2px solid #000",
    backgroundColor: "white",
    fontWeight: "900",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "2px 2px 0 0 #000",
    fontSize: "1rem",
    flexShrink: 0
};
