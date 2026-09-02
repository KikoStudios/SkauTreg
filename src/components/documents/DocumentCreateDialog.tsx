"use client";

import { useEffect, useId, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { BookOpenText, CalendarDays, Check, ClipboardCheck, MapPin, TentTree } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../ui/Button";
import { Field, FieldLabel, SelectInput, TextInput } from "../ui/Form";
import { ModalBody, ModalCloseButton, ModalFooter, ModalHeader, ModalShell, ModalTitle } from "../ui/Modal";
import styles from "./DocumentCreateDialog.module.css";

export type DocumentCreateKind = "document" | "schuzka" | "trip_document" | "decision";

const kinds: Array<{ id: DocumentCreateKind; title: string; description: string; icon: typeof BookOpenText }> = [
  { id: "document", title: "Poznámkový blok", description: "Volné poznámky, příprava nebo společná práce.", icon: BookOpenText },
  { id: "schuzka", title: "Schůzka", description: "Program, Radit se, rozhodnutí a navazující úkoly.", icon: CalendarDays },
  { id: "decision", title: "Rozhodnutí", description: "Jedno téma, varianty, závěr a odpovědnost.", icon: ClipboardCheck },
  { id: "trip_document", title: "K výpravě", description: "Dokumentace propojená s konkrétní výpravou.", icon: TentTree },
];

function localDateTime(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function DocumentCreateDialog({ troopId, open, initialKind = "document", onClose }: {
  troopId: Id<"troops">;
  open: boolean;
  initialKind?: DocumentCreateKind;
  onClose: () => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const createDocument = useMutation(api.documents.create);
  const trips = useQuery(api.trips.list, open ? { troopId } : "skip");
  const [kind, setKind] = useState<DocumentCreateKind>(initialKind);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState(() => localDateTime(new Date(Date.now() + 86_400_000)));
  const [duration, setDuration] = useState(90);
  const [location, setLocation] = useState("");
  const [tripId, setTripId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) setKind(initialKind);
  }, [initialKind, open]);

  if (!open) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const start = new Date(startsAt).getTime();
      const created = await createDocument({
        troopId,
        kind,
        title: title.trim(),
        description: description.trim() || undefined,
        ...(kind === "schuzka" ? {
          scheduledStartAt: start,
          scheduledEndAt: start + Math.max(15, duration) * 60_000,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Prague",
          location: location.trim() || undefined,
        } : {}),
        ...(kind === "trip_document" && tripId ? { tripId: tripId as Id<"trips"> } : {}),
      });
      router.push(`/troop/${troopId}/documents/${created.documentId}`);
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Dokument se nepodařilo vytvořit.");
      setSubmitting(false);
    }
  };

  return (
    <ModalShell role="dialog" aria-modal="true" aria-labelledby={titleId} onClose={onClose} width="min(96vw, 760px)" maxHeight="min(94dvh, 840px)">
      <form onSubmit={submit}>
        <ModalHeader>
          <div><span className={styles.eyebrow}>NOVÝ DOKUMENT</span><ModalTitle id={titleId}>Co chcete zachytit?</ModalTitle></div>
          <ModalCloseButton onClick={onClose} />
        </ModalHeader>
        <ModalBody className={styles.body}>
          <div className={styles.kindGrid} role="radiogroup" aria-label="Typ dokumentu">
            {kinds.map((item) => {
              const Icon = item.icon;
              return <button key={item.id} type="button" role="radio" aria-checked={kind === item.id} className={styles.kindCard} data-selected={kind === item.id} onClick={() => setKind(item.id)}>
                <span className={styles.kindIcon}><Icon size={20} /></span>
                <span><strong>{item.title}</strong><small>{item.description}</small></span>
                <Check className={styles.kindCheck} size={16} />
              </button>;
            })}
          </div>

          <div className={styles.formSection}>
            <Field><FieldLabel>Název</FieldLabel><TextInput autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder={kind === "schuzka" ? "Schůzka vedení · 12. října" : "Název dokumentu"} /></Field>
            <Field><FieldLabel>Krátký kontext <span>volitelné</span></FieldLabel><textarea className={styles.textarea} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Proč dokument vzniká a co v něm má být…" rows={2} /></Field>

            {kind === "schuzka" && <div className={styles.setupGrid}>
              <Field><FieldLabel>Začátek</FieldLabel><TextInput type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></Field>
              <Field><FieldLabel>Délka</FieldLabel><SelectInput value={duration} onChange={(event) => setDuration(Number(event.target.value))}><option value={45}>45 minut</option><option value={60}>1 hodina</option><option value={90}>1,5 hodiny</option><option value={120}>2 hodiny</option><option value={180}>3 hodiny</option></SelectInput></Field>
              <Field className={styles.fullField}><FieldLabel>Místo</FieldLabel><span className={styles.iconField}><MapPin size={16} /><TextInput value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Klubovna nebo online" /></span></Field>
            </div>}

            {kind === "trip_document" && <Field><FieldLabel>Výprava</FieldLabel><SelectInput value={tripId} onChange={(event) => setTripId(event.target.value)}><option value="">Bez propojení</option>{trips?.map((trip) => <option key={trip._id} value={trip._id}>{trip.name} · {trip.startDate}</option>)}</SelectInput></Field>}
          </div>
          {message && <p className={styles.error} role="alert">{message}</p>}
        </ModalBody>
        <ModalFooter><Button type="button" variant="ghost" onClick={onClose}>Zrušit</Button><Button type="submit" disabled={submitting || !title.trim()}>{submitting ? "Vytvářím…" : "Vytvořit a otevřít"}</Button></ModalFooter>
      </form>
    </ModalShell>
  );
}
