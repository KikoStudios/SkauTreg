"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useFeedback } from "../../context/FeedbackContext";
import styles from "./DopravaTicketPage.module.css";

type Direction = "outbound" | "return" | "unknown";

type PriceOverview = {
  kidUnitCzk?: number;
  adultUnitCzk?: number;
  studentUnitCzk?: number;
  kidCount?: number;
  adultCount?: number;
  studentCount?: number;
  // legacy v1 values
  kidCzk?: number;
  adultCzk?: number;
  studentCzk?: number;
};

type TransportRoute = {
  _id: Id<"transport_routes">;
  direction: string;
  from?: string;
  to?: string;
  date?: string;
  idosTrip?: unknown;
};

type TransportTicket = {
  _id: Id<"transport_tickets">;
  routeId?: Id<"transport_routes"> | null;
  name: string;
  url?: string | null;
  parsed?: unknown;
  shareEnabled?: boolean;
  shareSlug?: string;
  priceOverview?: PriceOverview;
  createdAt?: string;
};

type IdosSegment = {
  vehicleName: string;
  vehicleType: string;
  departureTime: string;
  arrivalTime: string;
  departureStation: string;
  arrivalStation: string;
};

type LatestByTrip = {
  outbound: TransportRoute | null;
  return: TransportRoute | null;
  unknown: TransportRoute | null;
};

function getTicketCode(parsed: unknown): string | null {
  if (typeof parsed !== "object" || parsed === null) return null;
  const rec = parsed as Record<string, unknown>;
  const code = rec.ticketCode;
  return typeof code === "string" && code.trim() ? code.trim() : null;
}

type ParsedGroup = {
  key: string;
  from?: string;
  to?: string;
  departTime?: string;
  departDate?: string;
  arriveTime?: string;
  arriveDate?: string;
  fareType?: string;
  platform?: string;
  seat?: string;
  seats?: string[];
  service?: string;
  codes?: string[];
  referenceCodes?: string[];
  pageNumbers?: number[];
};

function extractParsedGroups(parsed: unknown): ParsedGroup[] {
  if (typeof parsed !== "object" || parsed === null) return [];
  const rec = parsed as Record<string, unknown>;
  const groups = rec.groups;
  if (!Array.isArray(groups)) return [];
  return groups.filter((g) => typeof g === "object" && g !== null) as ParsedGroup[];
}

function parseCzkValue(input?: string): number | undefined {
  if (!input) return undefined;
  const m = String(input).match(/(\d[\d\s]*)/);
  if (!m) return undefined;
  const n = Number(m[1].replace(/\s+/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function normalizePriceOverview(
  p?: PriceOverview,
  route?: TransportRoute,
  autoCounts?: { kidCount?: number; adultCount?: number; studentCount?: number }
) {
  const idos = (route?.idosTrip as any) || undefined;
  const fallbackAdult = parseCzkValue(idos?.priceAdult ?? idos?.price);
  const fallbackChild = parseCzkValue(idos?.priceChild);
  const fallbackIsic = parseCzkValue(idos?.priceIsic);
  const resolvedKidCount =
    typeof p?.kidCount === "number"
      ? p.kidCount > 0 || !autoCounts?.kidCount
        ? p.kidCount
        : autoCounts.kidCount
      : autoCounts?.kidCount;
  const resolvedAdultCount =
    typeof p?.adultCount === "number"
      ? p.adultCount > 0 || !autoCounts?.adultCount
        ? p.adultCount
        : autoCounts.adultCount
      : autoCounts?.adultCount;
  const resolvedStudentCount =
    typeof p?.studentCount === "number"
      ? p.studentCount > 0 || !autoCounts?.studentCount
        ? p.studentCount
        : autoCounts.studentCount
      : autoCounts?.studentCount;
  return {
    kidUnitCzk: p?.kidUnitCzk ?? p?.kidCzk ?? fallbackChild,
    adultUnitCzk: p?.adultUnitCzk ?? p?.adultCzk ?? fallbackAdult,
    studentUnitCzk: p?.studentUnitCzk ?? p?.studentCzk ?? fallbackIsic,
    kidCount: resolvedKidCount,
    adultCount: resolvedAdultCount,
    studentCount: resolvedStudentCount,
  };
}

function formatCzk(n?: number) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("cs-CZ").format(n) + " Kč";
}

function sum(a?: number, b?: number, c?: number) {
  return (a || 0) + (b || 0) + (c || 0);
}

function parseSegments(route: TransportRoute): IdosSegment[] {
  if (typeof route.idosTrip !== "object" || route.idosTrip === null) return [];
  const tripObj = route.idosTrip as Record<string, unknown>;
  const segs = tripObj.segments;
  if (!Array.isArray(segs)) return [];
  return segs as IdosSegment[];
}

function getLabels(route: TransportRoute) {
  const segs = parseSegments(route);
  const first = segs[0];
  const last = segs[segs.length - 1];
  return {
    fromLabel: route.from || first?.departureStation || "",
    toLabel: route.to || last?.arrivalStation || "",
  };
}

function fmtDate(dStr?: string | null) {
  if (!dStr) return "";
  const [y, m, d] = dStr.split("-");
  if (!y || !m || !d) return dStr;
  return `${parseInt(d)}. ${parseInt(m)}. ${y}`;
}

function formatKc(n?: number) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("cs-CZ").format(n) + "kč";
}

export default function DopravaTicketPage(props: {
  tripId: Id<"trips">;
  trip: { location: string; startDate: string; endDate?: string | null };
}) {
  const { tripId } = props;
  const { showError, showSuccess } = useFeedback();

  const latest = useQuery(api.transportRoutes.getLatestByTrip, { tripId }) as LatestByTrip | undefined;
  const tickets = useQuery(api.transportTickets.listByTrip, { tripId }) as TransportTicket[] | undefined;
  const attendanceCounts = useQuery(api.trips.getAttendanceCounts, { tripId }) as
    | { kidCount: number; attendingCount: number; adultCount: number; studentCount: number; unknownCount: number }
    | undefined;

  const addFromIdos = useMutation(api.transportRoutes.addFromIdos);
  const removeRoute = useMutation(api.transportRoutes.remove);
  const generateUploadUrl = useMutation(api.transportTickets.generateUploadUrl);
  const uploadTicket = useMutation(api.transportTickets.upload);
  const removeTicket = useMutation(api.transportTickets.remove);
  const updatePriceOverview = useMutation(api.transportTickets.updatePriceOverview);
  const updateParsed = useMutation(api.transportTickets.updateParsed);

  const ticketsByRoute = useMemo(() => {
    const m = new Map<string, TransportTicket[]>();
    for (const t of tickets || []) {
      const key = t.routeId ? String(t.routeId) : "__unassigned__";
      const arr = m.get(key) || [];
      arr.push(t);
      m.set(key, arr);
    }
    for (const [k, arr] of m.entries()) {
      arr.sort((a, b) => ((a.createdAt || "") < (b.createdAt || "") ? 1 : -1));
      m.set(k, arr);
    }
    return m;
  }, [tickets]);

  const [activeTicketIdByRoute, setActiveTicketIdByRoute] = useState<Record<string, string>>({});
  const [ticketPickerRouteId, setTicketPickerRouteId] = useState<string | null>(null);
  const [siteOrigin, setSiteOrigin] = useState("");
  const [editRouteId, setEditRouteId] = useState<string | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Record<string, boolean>>({});
  const [reparsingTicketIds, setReparsingTicketIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setSiteOrigin(window.location.origin);
  }, []);

  // Edit modal state
  const [editDraft, setEditDraft] = useState<{
    kidUnitCzk?: number;
    adultUnitCzk?: number;
    studentUnitCzk?: number;
    kidCount?: number;
    adultCount?: number;
    studentCount?: number;
  }>({});

  const [assignDirection, setAssignDirection] = useState<Direction>("outbound");
  const [idosLink, setIdosLink] = useState("");
  const [isAssigningLink, setIsAssigningLink] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const fileInputByRoute = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!latest) return;
    for (const r of [latest.outbound, latest.return]) {
      if (!r) continue;
      const routeKey = String(r._id);
      const existing = activeTicketIdByRoute[routeKey];
      const list = ticketsByRoute.get(routeKey) || [];
      if (existing && list.some((t) => String(t._id) === existing)) continue;
      if (list[0]) {
        setActiveTicketIdByRoute((prev) => ({ ...prev, [routeKey]: String(list[0]._id) }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latest, ticketsByRoute]);

  useEffect(() => {
    setExpandedGroupKeys({});
  }, [ticketPickerRouteId]);

  const handleUploadForRoute = async (routeId: Id<"transport_routes">, files: FileList | null) => {
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      try {
        let parsed: unknown = undefined;
        try {
          const fd = new FormData();
          fd.append("file", file);
          const parseRes = await fetch("/api/tickets/parse", { method: "POST", body: fd });
          if (parseRes.ok) {
            const j: unknown = await parseRes.json();
            if (typeof j === "object" && j !== null && "parsed" in j) {
              parsed = (j as { parsed?: unknown }).parsed;
            }
          }
        } catch {
          // ignore
        }

        const uploadUrl = await generateUploadUrl();
        const upRes = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        const { storageId } = await upRes.json();

        await uploadTicket({
          tripId,
          routeId,
          storageId,
          name: file.name,
          contentType: file.type || "application/octet-stream",
          parsed,
        });

        showSuccess({ title: "✅ Nahráno", message: "Soubor byl nahrán.", duration: 1500 });
      } catch (e: unknown) {
        showError({
          title: "❌ Chyba",
          message: `Soubor "${file.name}" se nepodařilo nahrát.`,
          icon: "error",
          canReport: true,
          details: e instanceof Error ? e.message : undefined,
        });
      }
    }
  };

  const handleReparseTicket = async (ticket: TransportTicket) => {
    if (!ticket.url) return;
    const ticketKey = String(ticket._id);
    setReparsingTicketIds((current) => ({ ...current, [ticketKey]: true }));
    try {
      const source = await fetch(ticket.url);
      if (!source.ok) throw new Error("Soubor se nepodařilo načíst.");
      const blob = await source.blob();
      const form = new FormData();
      form.append("file", blob, ticket.name);
      const response = await fetch("/api/tickets/parse", { method: "POST", body: form });
      if (!response.ok) throw new Error("Jízdenku se nepodařilo znovu přečíst.");
      const payload = await response.json() as { parsed?: unknown };
      if (!payload.parsed) throw new Error("V souboru nebyly nalezeny údaje jízdenky.");
      await updateParsed({ ticketId: ticket._id, parsed: payload.parsed });
      showSuccess({ title: "Údaje obnoveny", message: "Jízdenka byla znovu načtena.", duration: 1800 });
    } catch (error) {
      showError({
        title: "Jízdenku se nepodařilo načíst",
        message: error instanceof Error ? error.message : "Zkuste to prosím znovu.",
      });
    } finally {
      setReparsingTicketIds((current) => ({ ...current, [ticketKey]: false }));
    }
  };

  const assignFromIdosLink = async (opts?: { onSuccess?: () => void }) => {
    setIsAssigningLink(true);
    setLinkError(null);
    try {
      const link = idosLink.trim();
      if (!link) throw new Error("Vložte odkaz z IDOS.");

      const res = await fetch(`/api/idos/share?url=${encodeURIComponent(link)}`);
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `IDOS: ${res.status}`);
      }
      const json: unknown = await res.json();
      if (typeof json !== "object" || json === null || !("trip" in json)) {
        throw new Error("Neplatná odpověď serveru.");
      }
      const idosTrip = (json as { trip: unknown }).trip;
      await addFromIdos({
        tripId,
        direction: assignDirection,
        from: undefined,
        to: undefined,
        date: undefined,
        idosTrip,
      });

      setIdosLink("");
      opts?.onSuccess?.();
      showSuccess({ title: "✅ Uloženo", message: "Trasa byla přiřazena k výpravě.", duration: 1500 });
    } catch (e: unknown) {
      setLinkError(e instanceof Error ? e.message : "Nepodařilo se přiřadit trasu.");
    } finally {
      setIsAssigningLink(false);
    }
  };

  const callUpdatePriceOverview = async (ticketId: Id<"transport_tickets">, draft: typeof editDraft) => {
    await updatePriceOverview({
      ticketId,
      kidUnitCzk: draft.kidUnitCzk,
      adultUnitCzk: draft.adultUnitCzk,
      studentUnitCzk: draft.studentUnitCzk,
      kidCount: draft.kidCount,
      adultCount: draft.adultCount,
      studentCount: draft.studentCount,
    });
  };

  const routeCards: Array<{ dir: Direction; route: TransportRoute | null }> = [
    { dir: "outbound", route: latest?.outbound || null },
    { dir: "return", route: latest?.return || null },
  ];

  return (
    <div className={styles.page}>
      {routeCards.map(({ dir, route }) => {
        if (!route) {
          const fromLabel = dir === "return" ? "Z výpravy" : "Domů";
          const toLabel = dir === "return" ? "Domů" : props.trip.location || "Z výpravy";
          return (
            <div
              key={`unassigned-${dir}`}
              className={`${styles.routeCard} ${styles.routeCardUnassigned}`}
              onClick={() => {
                setAssignDirection(dir);
                setAssignModalOpen(true);
                setIdosLink("");
                setLinkError(null);
              }}
            >
              <div className={styles.routeHeader}>
                <span className={styles.routeHeaderBadge}>{dir === "return" ? "Cesta zpět" : "Cesta tam"}</span>
                <span>{fromLabel}</span>
                <span className={styles.routeHeaderArrow}>→</span>
                <span>{toLabel}</span>
              </div>
              <div className={styles.unassignedBody}>
                <img src="/illustrations/ill-no-route.png" alt="" aria-hidden="true" />
                <div className={styles.unassignedCopy}>
                  <div className={styles.unassignedTitle}>Trasa není přiřazena</div>
                  <div className={styles.unassignedHint}>Vlož odkaz z IDOS a cesta se přehledně doplní sem.</div>
                  <button type="button" className={styles.assignBtn}>Přiřadit trasu</button>
                </div>
              </div>
            </div>
          );
        }
        const routeId = String(route._id);
        const segs = parseSegments(route);
        const { fromLabel, toLabel } = getLabels(route);
        const list = ticketsByRoute.get(routeId) || [];
        const activeId = activeTicketIdByRoute[routeId] || (list[0] ? String(list[0]._id) : "");
        const activeTicket = list.find((t) => String(t._id) === activeId) || null;
        const publicTicketUrl = activeTicket?.shareEnabled !== false && activeTicket?.shareSlug && siteOrigin
          ? `${siteOrigin}/ticket/${encodeURIComponent(activeTicket.shareSlug)}`
          : null;
        const overview = normalizePriceOverview(activeTicket?.priceOverview, route, {
          kidCount: attendanceCounts?.kidCount,
          adultCount: attendanceCounts?.adultCount,
          studentCount: attendanceCounts?.studentCount,
        });

        const kidTotal = (overview.kidUnitCzk || 0) * (overview.kidCount || 0);
        const adultTotal = (overview.adultUnitCzk || 0) * (overview.adultCount || 0);
        const studentTotal = (overview.studentUnitCzk || 0) * (overview.studentCount || 0);
        const pax = sum(overview.kidCount, overview.adultCount, overview.studentCount);
        const grand = kidTotal + adultTotal + studentTotal;

        return (
          <div key={routeId} className={styles.routeCard}>
            <div className={styles.routeHeader}>
              <span className={styles.routeHeaderBadge}>{dir === "return" ? "Cesta zpět" : "Cesta tam"}</span>
              <span>{fromLabel || "—"}</span>
              <span className={styles.routeHeaderArrow}>→</span>
              <span>{toLabel || "—"}</span>
              <span className={styles.routeHeaderSpacer} />
              {route.date ? <span className={styles.routeHeaderDate}>{fmtDate(route.date)}</span> : null}
              <div className={styles.routeHeaderRight}>
                <div className={styles.paxPill}>
                  <img src="/person-icon.svg" alt="" className={styles.paxIcon} />
                  {pax > 0 ? pax : "—"}
                </div>
                <div className={styles.grandTotalPill}>
                  <img src="/map-elements/money-symbol.png" alt="" className={styles.coinIcon} />
                  {formatKc(grand)}
                </div>
                <button
                  className={styles.editBtn}
                  onClick={() => {
                    setEditRouteId(routeId);
                    const p = normalizePriceOverview(activeTicket?.priceOverview, route, {
                      kidCount: attendanceCounts?.kidCount,
                      adultCount: attendanceCounts?.adultCount,
                      studentCount: attendanceCounts?.studentCount,
                    });
                    setEditDraft({
                      kidUnitCzk: p.kidUnitCzk,
                      adultUnitCzk: p.adultUnitCzk,
                      studentUnitCzk: p.studentUnitCzk,
                      kidCount: p.kidCount,
                      adultCount: p.adultCount,
                      studentCount: p.studentCount,
                    });
                    setAssignDirection(dir);
                    setLinkError(null);
                  }}
                  aria-label="Edit"
                >
                  ✎
                </button>
              </div>
            </div>

            <div className={styles.routeGrid}>
              <div className={styles.segments}>
                {segs.length === 0 ? (
                  <div style={{ fontWeight: 800, color: "#444" }}>Trasa nemá segmenty.</div>
                ) : (
                  segs.slice(0, 6).map((s, idx) => {
                    const vehicleType = String(s.vehicleType || "").toLowerCase();
                    const modeClass =
                      vehicleType.includes("bus") ? styles.modeBus : vehicleType.includes("tram") ? styles.modeTram : styles.modeTrain;
                    const modeLabel = vehicleType.includes("bus") ? "BUS" : vehicleType.includes("tram") ? "TRAM" : "VLAK";
                    return (
                      <div key={idx} className={styles.segmentRow}>
                        <div className={styles.segmentIndex}>{idx + 1}</div>
                        <div className={`${styles.modePill} ${modeClass}`}>{modeLabel}</div>
                        <div className={styles.segContent}>
                          <div className={styles.segRouteText}>
                            {s.departureStation} → {s.arrivalStation}
                          </div>
                          <div className={styles.segMeta}>
                            <div className={styles.timePill}>
                              {s.departureTime} - {s.arrivalTime}
                            </div>
                            <div className={styles.linePill}>{s.vehicleName}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className={styles.ticketQrPanel}>
                <span>Jízdenky</span>
                <button
                  type="button"
                  className={styles.ticketQrTile}
                  onClick={() => setTicketPickerRouteId(routeId)}
                  aria-label={publicTicketUrl ? "Spravovat nahrané jízdenky" : "Nahrát jízdenku"}
                  title={publicTicketUrl ? "Spravovat nahrané jízdenky" : "Nahrát jízdenku"}
                >
                  {publicTicketUrl ? (
                    <img src={`/api/qr?size=240&data=${encodeURIComponent(publicTicketUrl)}`} alt="QR kód veřejné stránky s jízdenkou" />
                  ) : (
                    <span><b>+</b>Nahrát lístek</span>
                  )}
                </button>
                <small>{list.length === 0 ? "Kliknutím nahrajete" : list.length === 1 ? "1 nahraný lístek" : `${list.length} nahraných lístků`}</small>
              </div>

                <div className={styles.pricesPanel}>
                  <div className={styles.priceTypeList}>
                    {([
                      { key: "kid", label: "Dítě", icon: "/bages/kid-icon.svg", unit: overview.kidUnitCzk, count: overview.kidCount, total: kidTotal },
                      { key: "adult", label: "Dospělý", icon: "/bages/adult-icon.svg", unit: overview.adultUnitCzk, count: overview.adultCount, total: adultTotal },
                      { key: "student", label: "Student", icon: "/bages/student-icon.svg", unit: overview.studentUnitCzk, count: overview.studentCount, total: studentTotal },
                    ] as const).map((row) => (
                      <div key={row.key} className={styles.priceTypeRow}>
                        <div className={styles.ageIcon}>
                          <img src={row.icon} alt="" className={styles.ageIconImg} />
                        </div>
                        <div className={styles.priceTypeLabel}>
                          <small>{row.label}</small>
                          <strong>{formatKc(row.unit)}</strong>
                        </div>
                        <div className={styles.typeCountPill}>{typeof row.count === "number" ? `${row.count}x` : "—"}</div>
                        <div className={styles.typeTotalPill}>{formatKc(row.total)}</div>
                      </div>
                    ))}
                  </div>

              </div>
            </div>
          </div>
        );
      })}

      {/* Assign modal (works even when no route exists yet) */}
      {assignModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setAssignModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>Přiřadit trasu (IDOS odkaz)</div>
              <button className={styles.btn} onClick={() => setAssignModalOpen(false)}>
                Zavřít
              </button>
            </div>

            <div className={styles.actionsRow} style={{ marginTop: 12 }}>
              <select className={styles.btn} value={assignDirection} onChange={(e) => setAssignDirection(e.target.value as Direction)}>
                <option value="outbound">Cesta tam</option>
                <option value="return">Cesta zpět</option>
                <option value="unknown">Neurčeno</option>
              </select>
              <input
                value={idosLink}
                onChange={(e) => setIdosLink(e.target.value)}
                placeholder="Vlož odkaz z IDOS"
                style={{ flex: 1, minWidth: 240, padding: "10px 12px", border: "3px solid #000", borderRadius: 14, fontWeight: 900 }}
              />
              <button
                className={`${styles.btn} ${styles.btnGreen}`}
                disabled={isAssigningLink}
                onClick={() => assignFromIdosLink({ onSuccess: () => setAssignModalOpen(false) })}
              >
                {isAssigningLink ? "…" : "Přiřadit"}
              </button>
            </div>
            {linkError && <div style={{ marginTop: 8, fontWeight: 900, color: "#b91c1c" }}>{linkError}</div>}
          </div>
        </div>
      )}

      {/* Ticket picker modal */}
      {ticketPickerRouteId && (
        <div className={styles.modalOverlay} onClick={() => setTicketPickerRouteId(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>Lístky</div>
              <button className={styles.btn} onClick={() => setTicketPickerRouteId(null)}>
                Zavřít
              </button>
            </div>

            <div className={styles.actionsRow} style={{ marginTop: 12 }}>
              <button className={`${styles.btn} ${styles.btnGreen}`} onClick={() => fileInputByRoute.current[ticketPickerRouteId]?.click()}>
                Nahrát
              </button>
              <input
                ref={(el) => {
                  fileInputByRoute.current[ticketPickerRouteId] = el;
                }}
                type="file"
                multiple
                style={{ display: "none" }}
                onChange={(e) => handleUploadForRoute(ticketPickerRouteId as any, e.target.files)}
              />
            </div>

            <div className={styles.ticketsGrid}>
              {(() => {
                const list = ticketsByRoute.get(ticketPickerRouteId) || [];
                const groups = new Map<
                  string,
                  {
                    key: string;
                    label: string;
                    meta: string;
                    codes: Set<string>;
                    tickets: TransportTicket[];
                  }
                >();

                for (const t of list) {
                  const parsedGroups = extractParsedGroups(t.parsed);
                  if (parsedGroups.length === 0) {
                    const fallbackKey = `ticket:${String(t._id)}`;
                    const code = getTicketCode(t.parsed);
                    const label = t.name;
                    const meta = code ? `Kód: ${code}` : "Bez kódu";
                    if (!groups.has(fallbackKey)) {
                      groups.set(fallbackKey, {
                        key: fallbackKey,
                        label,
                        meta,
                        codes: new Set(code ? [code] : []),
                        tickets: [],
                      });
                    }
                    groups.get(fallbackKey)!.tickets.push(t);
                    continue;
                  }

                  for (const g of parsedGroups) {
                    const key = `group:${g.key}`;
                    const label = `${g.from || "—"} → ${g.to || "—"}`;
                    const time =
                      g.departTime && g.departDate
                        ? `${g.departTime} ${g.departDate}`
                        : g.departTime || g.departDate || "";
                    const metaParts = [
                      time,
                      g.service ? `Spoj ${g.service}` : null,
                      g.platform ? `Nástupiště ${g.platform}` : null,
                      g.seats?.length
                        ? `Sedadla ${g.seats.join(", ")}`
                        : g.seat
                          ? `Sedadlo ${g.seat}`
                          : null,
                      g.fareType ? g.fareType : null,
                    ].filter(Boolean);
                    const meta = metaParts.join(" · ") || "Bez detailů";
                    if (!groups.has(key)) {
                      groups.set(key, { key, label, meta, codes: new Set(), tickets: [] });
                    }
                    const entry = groups.get(key)!;
                    (g.codes || []).forEach((c) => entry.codes.add(c));
                    entry.tickets.push(t);
                  }
                }

                return Array.from(groups.values()).map((g) => {
                  const isOpen = !!expandedGroupKeys[g.key];
                  const primary = g.tickets[0];
                  const isActive = primary ? activeTicketIdByRoute[ticketPickerRouteId] === String(primary._id) : false;
                  return (
                    <div
                      key={g.key}
                      className={`${styles.ticketTile} ${isActive ? styles.ticketTileActive : ""}`}
                      onClick={() => {
                        if (primary) setActiveTicketIdByRoute((prev) => ({ ...prev, [ticketPickerRouteId]: String(primary._id) }));
                      }}
                    >
                      <div style={{ fontWeight: 900 }}>{g.label}</div>
                      <div style={{ marginTop: 6, fontWeight: 800, color: "#333" }}>{g.meta}</div>
                      <div className={styles.actionsRow} style={{ marginTop: 10 }}>
                        <button
                          className={styles.btn}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedGroupKeys((prev) => ({ ...prev, [g.key]: !prev[g.key] }));
                          }}
                        >
                          {isOpen ? "Skrýt kódy" : "Zobrazit kódy"}
                        </button>
                      </div>
                      {isOpen && (
                        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                          {g.codes.size > 0 ? (
                            <div style={{ fontWeight: 900 }}>Kódy: {[...g.codes].join(", ")}</div>
                          ) : (
                            <div style={{ fontWeight: 900 }}>Kódy: —</div>
                          )}
                          {g.tickets.map((t) => (
                            <div key={String(t._id)} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                              <div style={{ fontWeight: 800 }}>{t.name}</div>
                              {t.url && (
                                <a className={styles.btn} href={t.url} target="_blank" rel="noopener noreferrer">
                                  Otevřít PDF
                                </a>
                              )}
                              <button
                                className={styles.btn}
                                disabled={reparsingTicketIds[String(t._id)]}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleReparseTicket(t);
                                }}
                              >
                                {reparsingTicketIds[String(t._id)] ? "Načítám…" : "Znovu načíst údaje"}
                              </button>
                              <button
                                className={styles.btn}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!confirm("Smazat tento soubor?")) return;
                                  await removeTicket({ ticketId: t._id });
                                }}
                              >
                                Smazat
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editRouteId && (
        <div className={styles.modalOverlay} onClick={() => setEditRouteId(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>Upravit</div>
              <button className={styles.btn} onClick={() => setEditRouteId(null)}>
                Zavřít
              </button>
            </div>

            <div style={{ marginTop: 14, fontWeight: 900, textTransform: "uppercase" }}>Přiřadit trasu (IDOS odkaz)</div>
            <div className={styles.actionsRow} style={{ marginTop: 8 }}>
              <select className={styles.btn} value={assignDirection} onChange={(e) => setAssignDirection(e.target.value as Direction)}>
                <option value="outbound">Cesta tam</option>
                <option value="return">Cesta zpět</option>
                <option value="unknown">Neurčeno</option>
              </select>
              <input
                value={idosLink}
                onChange={(e) => setIdosLink(e.target.value)}
                placeholder="Vlož odkaz z IDOS"
                style={{ flex: 1, minWidth: 240, padding: "10px 12px", border: "3px solid #000", borderRadius: 14, fontWeight: 900 }}
              />
              <button className={`${styles.btn} ${styles.btnGreen}`} disabled={isAssigningLink} onClick={() => assignFromIdosLink()}>
                {isAssigningLink ? "…" : "Přiřadit"}
              </button>
            </div>
            {linkError && <div style={{ marginTop: 8, fontWeight: 900, color: "#b91c1c" }}>{linkError}</div>}

            <div style={{ marginTop: 16, fontWeight: 900, textTransform: "uppercase" }}>Přehled cen</div>
            <div style={{ marginTop: 8, display: "grid", gap: 10 }}>
              {([
                { label: "Dítě", icon: "/bages/kid-icon.svg", unitKey: "kidUnitCzk", countKey: "kidCount" },
                { label: "Dospělý", icon: "/bages/adult-icon.svg", unitKey: "adultUnitCzk", countKey: "adultCount" },
                { label: "Student", icon: "/bages/student-icon.svg", unitKey: "studentUnitCzk", countKey: "studentCount" },
              ] as const).map((row) => (
                <div key={row.label} style={{ display: "grid", gridTemplateColumns: "1fr 140px 140px", gap: 10, alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 900 }}>
                    <img src={row.icon} alt="" style={{ width: 28, height: 28 }} />
                    {row.label}
                  </div>
                  <input
                    inputMode="numeric"
                    value={typeof (editDraft as any)[row.unitKey] === "number" ? String((editDraft as any)[row.unitKey]) : ""}
                    placeholder="Kč/ks"
                    style={{ padding: "10px 12px", border: "3px solid #000", borderRadius: 14, fontWeight: 900 }}
                    onChange={(e) => setEditDraft((prev) => ({ ...prev, [row.unitKey]: e.target.value.trim() === "" ? undefined : Number(e.target.value) }))}
                  />
                  <input
                    inputMode="numeric"
                    value={typeof (editDraft as any)[row.countKey] === "number" ? String((editDraft as any)[row.countKey]) : ""}
                    placeholder="počet"
                    style={{ padding: "10px 12px", border: "3px solid #000", borderRadius: 14, fontWeight: 900 }}
                    onChange={(e) => setEditDraft((prev) => ({ ...prev, [row.countKey]: e.target.value.trim() === "" ? undefined : Number(e.target.value) }))}
                  />
                </div>
              ))}
            </div>

            <div className={styles.actionsRow} style={{ marginTop: 12 }}>
              <button
                className={`${styles.btn} ${styles.btnGreen}`}
                onClick={async () => {
                  const list = ticketsByRoute.get(editRouteId) || [];
                  const activeId = activeTicketIdByRoute[editRouteId] || (list[0] ? String(list[0]._id) : "");
                  const t = list.find((x) => String(x._id) === activeId) || null;
                  if (!t) return;
                  await callUpdatePriceOverview(t._id, editDraft);
                  showSuccess({ title: "✅ Uloženo", message: "Přehled cen uložen.", duration: 1500 });
                }}
              >
                Uložit
              </button>
              <button
                className={styles.btn}
                onClick={async () => {
                  if (!confirm("Smazat trasu? (Jízdenky zůstanou, jen se odpojí od trasy.)")) return;
                  await removeRoute({ routeId: editRouteId as any });
                  setEditRouteId(null);
                }}
              >
                Smazat trasu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
