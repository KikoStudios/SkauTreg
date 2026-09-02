"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isWithinInterval, parseISO, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { cs } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import Breadcrumbs from "../../../components/Breadcrumbs";
import styles from "./page.module.css";

export default function CalendarPage() {
  const trips = useQuery(api.trips.getAllUserTrips);
  const troops = useQuery(api.troops.getByUser);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTroopId, setSelectedTroopId] = useState<Id<"troops"> | null>(null);
  const troopId = selectedTroopId ?? troops?.[0]?._id ?? null;
  const rangeStart = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
  const rangeEnd = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
  const documentItems = useQuery(api.documentCalendar.listRange, troopId ? {
    troopId,
    from: rangeStart.getTime(),
    to: rangeEnd.getTime() + 1,
  } : "skip");
  const calendarDays = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

  if (trips === undefined || troops === undefined) return <div className={styles.loading}>Načítám kalendář…</div>;

  return (
    <div className={styles.page}>
      <Breadcrumbs />
      <header className={styles.header}>
        <div><p>OPERATIVNÍ PŘEHLED</p><h1>Kalendář</h1></div>
        <div className={styles.controls}>
          {troops.length > 1 && <select aria-label="Oddíl" value={troopId ?? ""} onChange={(event) => setSelectedTroopId(event.target.value as Id<"troops">)}>{troops.map((troop) => <option value={troop._id} key={troop._id}>{troop.name}</option>)}</select>}
          <button type="button" onClick={() => setCurrentDate(subMonths(currentDate, 1))} aria-label="Předchozí měsíc"><ChevronLeft size={17} /></button>
          <strong>{format(currentDate, "LLLL yyyy", { locale: cs })}</strong>
          <button type="button" onClick={() => setCurrentDate(addMonths(currentDate, 1))} aria-label="Další měsíc"><ChevronRight size={17} /></button>
          <button type="button" className={styles.today} onClick={() => setCurrentDate(new Date())}>Dnes</button>
        </div>
      </header>

      <section className={styles.calendar} aria-label={format(currentDate, "LLLL yyyy", { locale: cs })}>
        <div className={styles.weekdays}>{["Po", "Út", "St", "Čt", "Pá", "So", "Ne"].map((day) => <span key={day}>{day}</span>)}</div>
        <div className={styles.grid}>{calendarDays.map((day) => {
          const dayTrips = trips.filter((trip) => {
            const start = parseISO(trip.startDate);
            return isWithinInterval(day, { start, end: trip.endDate ? parseISO(trip.endDate) : start });
          });
          const dayDocuments = (documentItems ?? []).filter((item) => isSameDay(item.startsAt, day));
          return <article key={day.toISOString()} className={styles.day} data-outside={!isSameMonth(day, currentDate)} data-today={isSameDay(day, new Date())}>
            <time dateTime={format(day, "yyyy-MM-dd")}>{format(day, "d")}</time>
            <div className={styles.events}>
              {dayDocuments.map((item) => <Link key={item.id} href={item.href} className={styles.event} data-type={item.type}><span>{item.type === "task" ? "ÚKOL" : item.type === "schuzka" ? "SCHŮZKA" : "PLÁN"}</span>{item.title}</Link>)}
              {dayTrips.map((trip) => <Link key={trip._id} href={`/trips/${trip._id}`} className={styles.event} data-type="trip"><span>VÝPRAVA</span>{trip.name}</Link>)}
            </div>
          </article>;
        })}</div>
      </section>
      {troopId && documentItems === undefined && <div className={styles.sync}>Synchronizuji Dokumenty…</div>}
    </div>
  );
}
