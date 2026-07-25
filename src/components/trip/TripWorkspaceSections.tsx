"use client";

import { useState } from "react";
import { CalendarDays, CheckCircle2, ClipboardCopy, ExternalLink, FileText, Mail, MapPin, Phone, Plus, Users, XCircle } from "lucide-react";
import styles from "./TripWorkspaceSections.module.css";

const formatDate = (value?: string | null) => {
    if (!value) return "Není nastaveno";
    const [year, month, day] = value.split("-");
    return day && month && year ? `${day}. ${month}. ${year}` : value;
};

export function TripOverview({ trip, participants, staff, onManageStaff }: { trip: any; participants: any[]; staff: any[]; onManageStaff: () => void }) {
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
                    <div className={styles.panelHeading}><div><span className={styles.eyebrow}>Tým výpravy</span><h3>Vedoucí a roveři</h3></div><button className={styles.secondaryButton} onClick={onManageStaff}><Plus size={16} /> Spravovat</button></div>
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

export function TripParticipants({ participants, customFields, copiedKey, onCopy }: { participants: any[]; customFields: any[]; copiedKey: string | null; onCopy: (key: string) => void }) {
    const [answerDetail, setAnswerDetail] = useState<{ member: string; question: string; answer: string } | null>(null);
    const parse = (value: unknown): Record<string, unknown> => {
        let parsed = value;
        for (let attempt = 0; attempt < 3 && typeof parsed === "string"; attempt += 1) {
            try { parsed = JSON.parse(parsed); } catch { return {}; }
        }
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    };
    const answerFor = (person: any, field: any) => {
        const answers = parse(person.responses);
        const direct = answers[field.label] ?? answers[field.id] ?? answers[field._id];
        if (typeof direct === "boolean") return direct ? "Ano" : "Ne";
        if (Array.isArray(direct)) return direct.join(", ");
        return direct === undefined || direct === null || direct === "" ? "—" : String(direct);
    };

    if (participants.length === 0) {
        return <section className={styles.participantEmpty}><img src="/illustrations/ill-participant-group.png" alt="" aria-hidden="true" /><div><h3>Zatím bez účastníků</h3><p>Jakmile rozešlete přihlášky, stav účasti a odpovědi se objeví přehledně na tomto místě.</p></div></section>;
    }

    return (
        <div className={styles.participantWorkspace}>
            <section className={styles.tablePanel}>
                <div className={styles.participantToolbar}><div><strong>{participants.length} účastníků</strong><span>Odpovědi jsou zobrazené přímo v seznamu.</span></div><div className={styles.statusLegend}><span data-status="attending">Jede</span><span data-status="pending">Bez reakce</span><span data-status="not_attending">Nejede</span></div></div>
                <div className={styles.tableScroll}><table><thead><tr><th>Člen</th><th>Stav</th>{customFields.map((field, index) => <th key={field.id || field._id || `${field.label}-${index}`}>{field.label}</th>)}<th>Odkaz</th></tr></thead><tbody>{participants.map(person => <tr key={person._id}><td><strong>{person.member?.name}</strong><small>{person.member?.email || person.member?.guardianEmail || "Bez e-mailu"}</small></td><td><span className={styles.status} data-status={person.status}>{person.status === "attending" ? "Jede" : person.status === "not_attending" ? "Nejede" : "Bez reakce"}</span></td>{customFields.map((field, index) => { const answer = answerFor(person, field); const needsDetail = answer.length > 34; return <td key={field.id || field._id || `${field.label}-${index}`}><button className={styles.answerCell} data-empty={answer === "—"} title={needsDetail ? "Zobrazit celou odpověď" : answer} onClick={() => needsDetail && setAnswerDetail({ member: person.member?.name || "Účastník", question: field.label, answer })}>{answer}</button></td>; })}<td><button className={styles.iconCopyButton} aria-label="Kopírovat přihlašovací odkaz" onClick={() => onCopy(person.accessKey)}><ClipboardCopy size={15} />{copiedKey === person.accessKey && <span>Zkopírováno</span>}</button></td></tr>)}</tbody></table></div>
            </section>
            {answerDetail && <div className={styles.answerBackdrop} onClick={() => setAnswerDetail(null)}><section className={styles.answerDialog} onClick={event => event.stopPropagation()}><header><div><span>{answerDetail.member}</span><h3>{answerDetail.question}</h3></div><button onClick={() => setAnswerDetail(null)}>×</button></header><p>{answerDetail.answer}</p></section></div>}
        </div>
    );
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
