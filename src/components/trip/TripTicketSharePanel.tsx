"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";

export default function TripTicketSharePanel({ tripId, defaultExpiry }: { tripId: Id<"trips">; defaultExpiry: string }) {
  const tickets = useQuery(api.transportTickets.listByTrip, { tripId });
  const share = useQuery(api.tripTicketShares.getForManagement, { tripId });
  const save = useMutation(api.tripTicketShares.createOrUpdate);
  const rotate = useMutation(api.tripTicketShares.rotate);
  const revoke = useMutation(api.tripTicketShares.revoke);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expiresAt, setExpiresAt] = useState(defaultExpiry);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);
  useEffect(() => {
    if (!share) return;
    setSelected(new Set(share.selectedTicketIds.map(String)));
    setExpiresAt(share.expiresAt);
  }, [share]);

  const url = share?.enabled && share.shareSlug && origin ? `${origin}/ticket/${share.shareSlug}` : "";
  const selectedTickets = useMemo(() => (tickets || []).filter((ticket) => selected.has(String(ticket._id))), [selected, tickets]);
  const toggle = (id: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const run = async (operation: () => Promise<unknown>, success: string) => {
    setBusy(true); setMessage("");
    try { await operation(); setMessage(success); }
    catch { setMessage("Akci se nepodařilo dokončit."); }
    finally { setBusy(false); }
  };

  return <section style={{ marginBottom: "1rem", padding: "1rem", background: "#f7f0d2", border: "2px solid #2b281e", borderRadius: 12, boxShadow: "3px 3px 0 #2b281e" }} aria-labelledby="trip-ticket-sharing-title">
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <div><small style={{ fontWeight: 900, textTransform: "uppercase" }}>Jeden odkaz pro celou výpravu</small><h3 id="trip-ticket-sharing-title" style={{ margin: ".2rem 0" }}>Sdílení jízdenek pro výpravu</h3><p style={{ margin: 0, maxWidth: 680, fontSize: ".8rem" }}>Veřejná stránka ukáže pouze níže vybrané soubory. Před sdílením zkontrolujte jména cestujících a rezervační kódy.</p></div>
      <strong>{share?.enabled ? "Sdílení zapnuto" : "Sdílení vypnuto"}</strong>
    </div>
    <fieldset style={{ display: "grid", gap: 6, margin: "1rem 0", border: 0, padding: 0 }}><legend style={{ fontWeight: 900, marginBottom: 6 }}>Vybrané jízdenky</legend>{tickets === undefined ? <span>Načítám…</span> : tickets.length === 0 ? <span>Nejdříve nahrajte alespoň jednu jízdenku.</span> : tickets.map((ticket) => <label key={ticket._id} style={{ display: "flex", alignItems: "center", gap: 8, padding: ".55rem", background: "#fff", border: "1px solid #8b7d48", borderRadius: 7 }}><input type="checkbox" checked={selected.has(String(ticket._id))} onChange={() => toggle(String(ticket._id))} /> <span>{ticket.name}</span></label>)}</fieldset>
    <label style={{ display: "grid", gap: 4, maxWidth: 240, fontWeight: 800 }}>Platnost do<input type="date" value={expiresAt} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setExpiresAt(event.target.value)} style={{ minHeight: 40, border: "2px solid #2b281e", borderRadius: 7, padding: ".4rem" }} /></label>
    {selectedTickets.length > 0 && <p style={{ fontSize: ".75rem" }}>Veřejný náhled bude obsahovat: {selectedTickets.map((ticket) => ticket.name).join(", ")}.</p>}
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
      <button disabled={busy || selected.size === 0} onClick={() => run(() => save({ tripId, selectedTicketIds: [...selected] as Id<"transport_tickets">[], expiresAt }), "Sdílení bylo uloženo.")}>Uložit a zapnout</button>
      {url && <button onClick={() => navigator.clipboard.writeText(url).then(() => setMessage("Odkaz je zkopírovaný."))}>Kopírovat odkaz</button>}
      {share && <button disabled={busy} onClick={() => run(() => rotate({ tripId }), "Byl vytvořen nový odkaz.")}>Vytvořit nový odkaz</button>}
      {share?.enabled && <button disabled={busy} onClick={() => run(() => revoke({ tripId }), "Sdílení bylo zrušeno.")}>Zrušit sdílení</button>}
    </div>
    {url && <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, overflowWrap: "anywhere" }}><img src={`/api/qr?data=${encodeURIComponent(url)}&size=140`} width={92} height={92} alt="QR kód veřejného odkazu na jízdenky" /><a href={url} target="_blank" rel="noreferrer">{url}</a></div>}
    {message && <p role="status" style={{ fontWeight: 800 }}>{message}</p>}
  </section>;
}
