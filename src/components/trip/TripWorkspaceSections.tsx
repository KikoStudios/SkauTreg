"use client";

import { useState } from "react";
import { CalendarDays, CheckCircle2, ClipboardCopy, ExternalLink, FileText, Mail, MapPin, Phone, Plus, Users, XCircle } from "lucide-react";
import styles from "./TripWorkspaceSections.module.css";

const formatDate = (value?: string | null) => {
    if (!value) return "Není nastaveno";
    const [year, month, day] = value.split("-");
    return day && month && year ? `${day}. ${month}. ${year}` : value;
};

export function TripOverview({ trip, participants, staff, onManageStaff, canManageStaff = true }: { trip: any; participants: any[]; staff: any[]; onManageStaff: () => void; canManageStaff?: boolean }) {
    const attending = participants.filter(item => item.status === "attending").length;
    const declined = participants.filter(item => item.status === "not_attending").length;
    const pending = participants.length - attending - declined;
    const setup = [trip.location, trip.startDate, trip.description].filter(Boolean).length;

    return (
        <div className={styles.stack}>
            <section className={styles.heroCard}>
                <div className={styles.heroCopy}>
                    <span className={styles.eyebrow}>Stav přípravy</span>
                    <h3>{trip.name}</h3>
                    <p>{trip.description || "Doplňte krátký popis výpravy v nastavení."}</p>
                </div>
                <img
                    className={styles.heroArtwork}
                    src={setup === 3 ? "/illustrations/ill-trip-complete.png" : "/illustrations/ill-trip-plan.png"}
                    alt=""
                    aria-hidden="true"
                />
                <div className={styles.readiness}><strong>{setup}/3</strong><span>základní údaje vyplněny</span></div>
            </section>

            <div className={styles.metrics}>
                <article><span className={styles.metricIcon}><CalendarDays size={18} /></span><div><small>Termín</small><strong>{formatDate(trip.startDate)}</strong><span>{trip.endDate ? `do ${formatDate(trip.endDate)}` : "Jednodenní / bez konce"}</span></div></article>
                <article><span className={styles.metricIcon}><MapPin size={18} /></span><div><small>Místo</small><strong>{trip.location || "Nevyplněno"}</strong><span>{trip.baseId ? "Základna přiřazena" : "Bez přiřazené základny"}</span></div></article>
                <article><span className={styles.metricIcon}><Users size={18} /></span><div><small>Účast</small><strong>{attending} potvrzeno</strong><span>{pending} čeká · {declined} nejede</span></div></article>
            </div>

            <div className={styles.overviewGrid}>
                <section className={styles.panel}>
                    <div className={styles.panelHeading}><div><span className={styles.eyebrow}>Přihlašování</span><h3>Aktuální odezva</h3></div><strong className={styles.count}>{participants.length}</strong></div>
                    <div className={styles.statusRows}>
                        <div><span><CheckCircle2 size={17} /> Jede</span><strong>{attending}</strong></div>
                        <div><span><XCircle size={17} /> Nejede</span><strong>{declined}</strong></div>
                        <div><span><span className={styles.pendingDot} /> Bez reakce</span><strong>{pending}</strong></div>
                    </div>
                </section>
                <section className={styles.panel}>
                    <div className={styles.panelHeading}><div><span className={styles.eyebrow}>Tým výpravy</span><h3>Vedoucí a roveři</h3></div>{canManageStaff && <button className={styles.secondaryButton} onClick={onManageStaff}><Plus size={16} /> Spravovat</button>}</div>
                    {staff.length === 0 ? <div className={styles.emptyInline}>Zatím není přiřazen žádný vedoucí.</div> : <div className={styles.peopleList}>{staff.slice(0, 5).map(person => <div key={person._id}><span className={styles.avatar}>{(person.user?.name || person.name || "?").slice(0, 1)}</span><div><strong>{person.user?.name || person.name}</strong><small>{person.role === "rover" ? "Rover" : "Vedoucí"}{person.benefit ? ` · ${person.benefit}` : ""}</small></div></div>)}</div>}
                </section>
            </div>
        </div>
    );
}

export function TripBase({ base, onUnassign }: { base: any; onUnassign: () => void }) {
    if (!base) return <EmptyState illustration="/illustrations/ill-no-base.png" title="Základna zatím není přiřazena" description="Vyberte vhodné ubytování v Hledači základen. Po přiřazení zde uvidíte kontakt, kapacitu, cenu i vybavení." actionLabel="Otevřít Hledač základen" onAction={() => window.location.assign("/tools/basefinder")} />;
    const photos = base.media?.photos || base.photos || [];
    const contact = base.contacts?.[0];
    const price = base.pricing?.pricePerPerson
        ? `${base.pricing.pricePerPerson} Kč / osoba`
        : base.pricing?.pricePerNight
            ? `${base.pricing.pricePerNight} Kč / noc`
            : base.price
                ? `${base.price} Kč`
                : "Neuvedeno";
    const equipment = base.amenities?.equipment || (Array.isArray(base.amenities) ? base.amenities : []);
    return (
        <div className={styles.stack}>
            <section className={styles.baseHero}>
                <div className={styles.baseImage}>{photos[0]?.url ? <img src={photos[0].url} alt="" /> : <img src="/illustrations/ill-scout-base.png" alt="" aria-hidden="true" />}</div>
                <div className={styles.baseTitle}><span className={styles.eyebrow}>Přiřazená základna</span><h3>{base.name}</h3><p><MapPin size={15} /> {base.location?.city || base.location?.address || "Místo neuvedeno"}</p></div>
                <button className={styles.ghostDanger} onClick={onUnassign}>Odebrat</button>
            </section>
            <div className={styles.metrics}>
                <article><div><small>Kapacita</small><strong>{base.capacity ? `${base.capacity} osob` : "Neuvedeno"}</strong><span>Celková kapacita objektu</span></div></article>
                <article><div><small>Cena</small><strong>{price}</strong><span>Podle údajů základny</span></div></article>
                <article><div><small>Kontakt</small><strong>{contact?.name || "Bez kontaktu"}</strong><span>{contact?.role || "Správce základny"}</span></div></article>
            </div>
            <div className={styles.baseGrid}>
                <section className={styles.panel}><span className={styles.eyebrow}>O místě</span><h3>Praktické informace</h3><p className={styles.bodyCopy}>{base.description || base.conditions?.specialNotes || "K této základně zatím není dostupný popis."}</p>{equipment.length > 0 && <div className={styles.tags}>{equipment.map((item: string) => <span key={item}>{item}</span>)}</div>}</section>
                <section className={styles.panel}><span className={styles.eyebrow}>Spojení</span><h3>Kontakt na základnu</h3>{contact ? <div className={styles.contactList}>{contact.email && <a href={`mailto:${contact.email}`}><Mail size={16} /><span><small>E-mail</small><strong>{contact.email}</strong></span></a>}{contact.phone && <a href={`tel:${contact.phone}`}><Phone size={16} /><span><small>Telefon</small><strong>{contact.phone}</strong></span></a>}{contact.website && <a href={contact.website} target="_blank" rel="noreferrer"><ExternalLink size={16} /><span><small>Web</small><strong>Otevřít stránky</strong></span></a>}</div> : <div className={styles.emptyInline}>Kontaktní údaje nejsou vyplněné.</div>}</section>
            </div>
        </div>
    );
}

export type TripParticipantDTO = {
    participationId: string;
    memberId: string;
    name: string;
    primaryEmail?: string;
    guardianContacts: Array<{ label: string; email: string }>;
    status: "pending" | "attending" | "not_attending";
    answers: Array<{ fieldId: string; label: string; displayValue: string }>;
    hasSecureLink: boolean;
    legacyLinkActive: boolean;
};

export function TripParticipants({ participants, copiedKey, onCopy, onRegenerate }: {
    participants: TripParticipantDTO[];
    copiedKey: string | null;
    onCopy: (participationId: string) => void;
    onRegenerate: (participationId: string, name: string) => void;
}) {
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState<"all" | TripParticipantDTO["status"]>("all");
    const [email, setEmail] = useState<"all" | "with" | "without">("all");
    const [answerDetail, setAnswerDetail] = useState<{ member: string; question: string; answer: string } | null>(null);
    const filtered = participants
        .filter((person) => person.name.toLocaleLowerCase("cs").includes(query.trim().toLocaleLowerCase("cs")))
        .filter((person) => status === "all" || person.status === status)
        .filter((person) => email === "all" || (email === "with" ? Boolean(person.primaryEmail) : !person.primaryEmail))
        .sort((a, b) => a.name.localeCompare(b.name, "cs"));
    const label = (value: TripParticipantDTO["status"]) => value === "attending" ? "Jede" : value === "not_attending" ? "Nejede" : "Bez reakce";

    if (participants.length === 0) {
        return <section className={styles.participantEmpty}><img src="/illustrations/ill-participant-group.png" alt="" aria-hidden="true" /><div><h3>Zatím bez účastníků</h3><p>Jakmile rozešlete přihlášky, stav účasti a odpovědi se objeví přehledně na tomto místě.</p></div></section>;
    }

    return <div className={styles.participantWorkspace}>
        <section className={styles.tablePanel}>
            <div className={styles.participantFilters}>
                <label>Hledat<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Jméno účastníka" /></label>
                <label>Stav<select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">Všechny stavy</option><option value="attending">Jede</option><option value="pending">Bez reakce</option><option value="not_attending">Nejede</option></select></label>
                <label>E-mail<select value={email} onChange={(event) => setEmail(event.target.value as typeof email)}><option value="all">Všichni</option><option value="with">S e-mailem</option><option value="without">Bez e-mailu</option></select></label>
            </div>
            <div className={styles.tableScroll}><table><thead><tr><th>Člen</th><th>Stav</th><th>Odpovědi</th><th>Bezpečný odkaz</th></tr></thead><tbody>{filtered.map((person) => <tr key={person.participationId}><td><strong>{person.name}</strong><small>{person.primaryEmail || "Bez e-mailu"}</small></td><td><span className={styles.status} data-status={person.status}>{label(person.status)}</span></td><td><button className={styles.answerCell} onClick={() => person.answers[0] && setAnswerDetail({ member: person.name, question: "Odpovědi", answer: person.answers.map((item) => `${item.label}: ${item.displayValue}`).join("\n") })}>{person.answers.length ? `${person.answers.length} odpovědí` : "—"}</button></td><td><div className={styles.participantActions}><button onClick={() => onCopy(person.participationId)} disabled={!person.hasSecureLink}><ClipboardCopy size={15} />{copiedKey === person.participationId ? "Zkopírováno" : "Kopírovat"}</button><button onClick={() => onRegenerate(person.participationId, person.name)}>Obnovit</button>{person.legacyLinkActive && <small>Starý odkaz je ještě aktivní</small>}</div></td></tr>)}</tbody></table></div>
            <div className={styles.participantCards}>{filtered.map((person) => <article key={person.participationId}><header><strong>{person.name}</strong><span className={styles.status} data-status={person.status}>{label(person.status)}</span></header><small>{person.primaryEmail || "Bez e-mailu"}</small><details><summary>Kontakty a odpovědi</summary>{person.guardianContacts.map((contact) => <p key={contact.email}><b>{contact.label}:</b> {contact.email}</p>)}{person.answers.map((answer) => <p key={answer.fieldId}><b>{answer.label}:</b> {answer.displayValue}</p>)}</details><button onClick={() => onCopy(person.participationId)} disabled={!person.hasSecureLink}>Kopírovat přihlašovací odkaz</button><button onClick={() => onRegenerate(person.participationId, person.name)}>Vytvořit nový odkaz</button></article>)}</div>
        </section>
        {answerDetail && <div className={styles.answerBackdrop} onClick={() => setAnswerDetail(null)}><section role="dialog" aria-modal="true" aria-labelledby="participant-answer-title" className={styles.answerDialog} onClick={(event) => event.stopPropagation()}><header><div><span>{answerDetail.member}</span><h3 id="participant-answer-title">{answerDetail.question}</h3></div><button aria-label="Zavřít" onClick={() => setAnswerDetail(null)}>×</button></header><p style={{ whiteSpace: "pre-wrap" }}>{answerDetail.answer}</p></section></div>}
    </div>;
}

export function TripDocumentation({ documents, onOpenMain, onOpenDocument }: { documents: any[] | undefined; onOpenMain: () => void; onOpenDocument: (id: string) => void }) {
    const main = documents?.find(document => document.category === "documentation");
    const notebooks = documents?.filter(document => document.category === "notebook") || [];
    return (
        <div className={styles.stack}>
            <section className={styles.documentHero}><img className={styles.documentArtwork} src="/illustrations/ill-trip-documents.png" alt="" aria-hidden="true" /><div><span className={styles.eyebrow}>Hlavní dokument</span><h3>{main ? main.title : "Dokumentace výpravy"}</h3><p>Program, důležité kontakty, úkoly a společné poznámky na jednom místě.</p></div><button className={styles.primaryButton} onClick={onOpenMain}>{main ? "Otevřít dokument" : "Vytvořit dokument"}</button></section>
            <section className={styles.panel}><div className={styles.panelHeading}><div><span className={styles.eyebrow}>Navazující zápisy</span><h3>Pracovní dokumenty</h3></div><strong className={styles.count}>{notebooks.length}</strong></div>{documents === undefined ? <div className={styles.emptyInline}>Načítám dokumenty…</div> : notebooks.length === 0 ? <div className={styles.emptyDocument}><FileText size={23} /><strong>Zatím žádné pracovní zápisy</strong><span>Zápisy vytvořené pro tuto výpravu se zobrazí zde.</span></div> : <div className={styles.documentGrid}>{notebooks.map(document => <button key={document._id} onClick={() => onOpenDocument(document._id)}><FileText size={18} /><span><strong>{document.title}</strong><small>{document.description || "Pracovní zápis"}</small></span><ExternalLink size={15} /></button>)}</div>}</section>
        </div>
    );
}

function EmptyState({ illustration, title, description, actionLabel, onAction }: { illustration: string; title: string; description: string; actionLabel: string; onAction: () => void }) {
    return <section className={styles.emptyState}><img src={illustration} alt="" aria-hidden="true" /><div><h3>{title}</h3><p>{description}</p><button className={styles.primaryButton} onClick={onAction}>{actionLabel}</button></div></section>;
}
