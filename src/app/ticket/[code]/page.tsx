"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import styles from "./TicketPage.module.css";

type Overview = {
  from?: string;
  to?: string;
  departTime?: string;
  departDate?: string;
  arriveTime?: string;
  arriveDate?: string;
  fareType?: string;
  platform?: string;
  seat?: string;
  service?: string;
};

type ParsedPage = {
  pageNumber?: number;
  overview?: Overview;
  eTicketCodes?: string[];
  referenceCodes?: string[];
  seats?: string[];
};

type ParsedGroup = Overview & {
  key?: string;
  codes?: string[];
  referenceCodes?: string[];
  seats?: string[];
  pageNumbers?: number[];
};

type ParsedTicket = {
  ticketCode?: string;
  pages?: ParsedPage[];
  groups?: ParsedGroup[];
};

type TicketSource = {
  _id?: unknown;
  name: string;
  url?: string | null;
  parsed?: unknown;
};

type TicketEntry = {
  key: string;
  seat?: string;
  fareType?: string;
  codes: string[];
  references: string[];
  pageNumber?: number;
  sourceName: string;
  sourceUrl?: string | null;
};

type Journey = Overview & {
  key: string;
  entries: TicketEntry[];
};

function cleanPlace(value?: string) {
  return value?.replace(/,,/g, ", ").replace(/\s+/g, " ").trim();
}

function unique(values: Array<string | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())).map((value) => value.trim()))];
}

function journeyKey(overview: Overview, fallbackFrom: string, fallbackTo: string) {
  return [
    cleanPlace(overview.from) || fallbackFrom,
    cleanPlace(overview.to) || fallbackTo,
    overview.departDate,
    overview.departTime,
    overview.arriveDate,
    overview.arriveTime,
    overview.service,
  ].filter(Boolean).join("|");
}

function addEntry(map: Map<string, Journey>, overview: Overview, entry: TicketEntry, fallbackFrom: string, fallbackTo: string) {
  const key = journeyKey(overview, fallbackFrom, fallbackTo) || entry.key;
  const existing = map.get(key);
  if (existing) {
    const duplicate = existing.entries.find((candidate) => {
      const code = entry.codes[0] || entry.references[0];
      return code && (candidate.codes.includes(code) || candidate.references.includes(code));
    });
    if (!duplicate) existing.entries.push(entry);
    return;
  }

  map.set(key, {
    ...overview,
    from: cleanPlace(overview.from) || fallbackFrom,
    to: cleanPlace(overview.to) || fallbackTo,
    key,
    entries: [entry],
  });
}

function buildJourneys(tickets: TicketSource[], fallbackFrom: string, fallbackTo: string) {
  const journeys = new Map<string, Journey>();

  tickets.forEach((ticket) => {
    const parsed = ticket.parsed && typeof ticket.parsed === "object" ? ticket.parsed as ParsedTicket : {};
    const pages = Array.isArray(parsed.pages) ? parsed.pages : [];

    if (pages.length > 0) {
      pages.forEach((page, index) => {
        const overview = page.overview || {};
        const pageNumber = page.pageNumber || index + 1;
        addEntry(journeys, overview, {
          key: `${String(ticket._id)}-${pageNumber}`,
          seat: overview.seat || page.seats?.[0],
          fareType: overview.fareType,
          codes: unique(page.eTicketCodes?.length ? page.eTicketCodes : pages.length === 1 ? [parsed.ticketCode] : []),
          references: unique(page.referenceCodes || []),
          pageNumber,
          sourceName: ticket.name,
          sourceUrl: ticket.url,
        }, fallbackFrom, fallbackTo);
      });
      return;
    }

    const groups = Array.isArray(parsed.groups) ? parsed.groups : [];
    if (groups.length > 0) {
      groups.forEach((group, groupIndex) => {
        const seats = unique(group.seats?.length ? group.seats : [group.seat]);
        const codes = unique(group.codes || []);
        const references = unique(group.referenceCodes || []);
        const rowCount = Math.max(seats.length, codes.length, references.length, 1);
        for (let index = 0; index < rowCount; index++) {
          addEntry(journeys, group, {
            key: `${String(ticket._id)}-${groupIndex}-${index}`,
            seat: seats[index] || seats[0],
            fareType: group.fareType,
            codes: unique([codes[index] || (rowCount === 1 ? parsed.ticketCode : undefined)]),
            references: unique([references[index]]),
            pageNumber: group.pageNumbers?.[index] || group.pageNumbers?.[0],
            sourceName: ticket.name,
            sourceUrl: ticket.url,
          }, fallbackFrom, fallbackTo);
        }
      });
      return;
    }

    addEntry(journeys, {}, {
      key: String(ticket._id),
      codes: unique([parsed.ticketCode]),
      references: [],
      sourceName: ticket.name,
      sourceUrl: ticket.url,
    }, fallbackFrom, fallbackTo);
  });

  return [...journeys.values()].map((journey) => ({
    ...journey,
    entries: journey.entries.sort((a, b) => (a.seat || "").localeCompare(b.seat || "", "cs", { numeric: true })),
  }));
}

function directionLabel(direction?: string) {
  if (direction === "outbound") return "Cesta tam";
  if (direction === "return") return "Cesta zpět";
  return "Jízdenky k výpravě";
}

export default function PublicTicketPage() {
  const params = useParams();
  const code = (params.code as string | undefined) || "";
  const tripShare = useQuery(api.tripTicketShares.getPublic, code ? { shareSlug: code } : "skip");
  const legacyBundle = useQuery(api.publicTickets.getBundleByShareSlug, code ? { shareSlug: code } : "skip");
  const bundle = tripShare?.status === "active"
    ? { trip: tripShare.trip, route: null, tickets: tripShare.tickets }
    : legacyBundle;

  if (tripShare === undefined || legacyBundle === undefined) return <main className={styles.statePage}><strong>Načítám jízdenky…</strong></main>;
  if (tripShare.status === "expired" || tripShare.status === "revoked") {
    return <main className={styles.statePage}><section className={styles.stateCard}><span>Odkaz již není aktivní</span><h1>Platnost sdílení skončila</h1><p>Požádejte organizátora výpravy o nový odkaz.</p></section></main>;
  }
  if (!bundle) {
    return <main className={styles.statePage}><section className={styles.stateCard}><span>Neplatný odkaz</span><h1>Jízdenky nejsou dostupné</h1><p>Požádejte organizátora výpravy o nový QR kód.</p></section></main>;
  }

  const routeFrom = cleanPlace(bundle.route?.from) || bundle.trip?.location || "Výchozí místo";
  const routeTo = cleanPlace(bundle.route?.to) || bundle.trip?.location || "Cílové místo";
  const journeys = buildJourneys(bundle.tickets as TicketSource[], routeFrom, routeTo);
  const ticketCount = journeys.reduce((count, journey) => count + journey.entries.length, 0);

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <div>
            <span>{directionLabel(bundle.route?.direction)}</span>
            <h1>{bundle.trip?.name || "Jízdenky k výpravě"}</h1>
            <p>{routeFrom} <b>→</b> {routeTo}</p>
          </div>
          <div className={styles.headerMeta}><strong>{ticketCount}</strong><span>{ticketCount === 1 ? "jízdenka" : ticketCount < 5 ? "jízdenky" : "jízdenek"}</span></div>
        </header>

        <div className={styles.journeyList}>
          {journeys.map((journey, journeyIndex) => (
            <article className={styles.journeyCard} key={journey.key}>
              <div className={styles.journeyHeader}>
                <div className={styles.journeyNumber}>{journeyIndex + 1}</div>
                <div className={styles.routeBlock}>
                  <span>{directionLabel(bundle.route?.direction)}</span>
                  <h2>{journey.from || routeFrom} <b>→</b> {journey.to || routeTo}</h2>
                </div>
                <div className={styles.journeyFacts}>
                  <TicketDetail label="Odjezd" value={[journey.departTime, journey.departDate].filter(Boolean).join(" · ") || "Neuvedeno"} />
                  <TicketDetail label="Příjezd" value={[journey.arriveTime, journey.arriveDate].filter(Boolean).join(" · ") || "Neuvedeno"} />
                  {journey.platform && <TicketDetail label="Nástupiště" value={journey.platform} />}
                  {journey.service && <TicketDetail label="Spoj" value={journey.service} />}
                </div>
              </div>

              <div className={styles.tableHeader}><span>Sedadlo</span><span>Odbavovací kód</span><span>Referenční kód IDOS</span><span>Doklad</span></div>
              <div className={styles.ticketRows}>
                {journey.entries.map((entry, entryIndex) => (
                  <div className={styles.ticketRow} key={entry.key}>
                    <div className={styles.seatCell}><small>Jízdenka {entryIndex + 1}</small><strong>{entry.seat || "—"}</strong>{entry.fareType && <span>{entry.fareType}</span>}</div>
                    <CodeCell label="Odbavovací kód" values={entry.codes} />
                    <CodeCell label="Referenční kód IDOS" values={entry.references} muted />
                    <div className={styles.pdfCell}>
                      {entry.sourceUrl ? <a href={`${entry.sourceUrl}${entry.pageNumber ? `#page=${entry.pageNumber}` : ""}`} target="_blank" rel="noopener noreferrer">Původní PDF</a> : <span>PDF nedostupné</span>}
                      <small>{entry.pageNumber ? `Strana ${entry.pageNumber} · ` : ""}{entry.sourceName}</small>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        <footer className={styles.footer}><span>Veřejný přehled · bez přihlášení</span><strong>{code}</strong></footer>
      </section>
    </main>
  );
}

function TicketDetail({ label, value }: { label: string; value: string }) {
  return <div className={styles.ticketDetail}><span>{label}</span><strong>{value}</strong></div>;
}

function CodeCell({ label, values, muted = false }: { label: string; values: string[]; muted?: boolean }) {
  return <div className={`${styles.codeCell} ${muted ? styles.codeCellMuted : ""}`}><small>{label}</small>{values.length ? values.map((value) => <strong key={value}>{value}</strong>) : <span>—</span>}</div>;
}
