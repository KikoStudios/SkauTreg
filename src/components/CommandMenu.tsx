"use client";

import * as React from "react";
import { Command } from "cmdk";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import {
    Bus,
    CalendarDays,
    CircleUserRound,
    ClipboardList,
    FileText,
    FolderKanban,
    House,
    Lightbulb,
    Mail,
    MapPin,
    MapPinned,
    Plus,
    RefreshCw,
    Search,
    Settings,
    TentTree,
    Users,
    WalletCards,
    type LucideIcon,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { useProfileModal } from "../context/ProfileModalContext";

type PaletteItemProps = {
    label: string;
    description?: string;
    icon: LucideIcon;
    onSelect: () => void;
    value?: string;
};

const tripTabs = [
    { label: "Přehled", tab: "info", icon: ClipboardList, keywords: "plán termíny" },
    { label: "Základna", tab: "zakladna", icon: MapPin, keywords: "ubytování místo mapa" },
    { label: "Doprava", tab: "doprava", icon: Bus, keywords: "spoje trasy jízdenky" },
    { label: "Finance", tab: "finance", icon: WalletCards, keywords: "rozpočet platby výdaje" },
    { label: "Účastníci", tab: "ucastnici", icon: Users, keywords: "přihlášky odpovědi lidé" },
    { label: "Dokumentace", tab: "dokumentace", icon: FileText, keywords: "zápisy soubory rady" },
    { label: "E-maily – koncepty", tab: "emaily&emailView=drafts", icon: Mail, keywords: "komunikace návrhy" },
    { label: "E-maily – odeslané", tab: "emaily&emailView=sent", icon: Mail, keywords: "komunikace zprávy" },
    { label: "E-maily – odezva rodičů", tab: "emaily&emailView=responses", icon: Mail, keywords: "komunikace odpovědi" },
    { label: "Nastavení – základní údaje", tab: "nastaveni&settingsSection=details", icon: Settings, keywords: "upravit výpravu" },
    { label: "Nastavení – přihlašování a otázky", tab: "nastaveni&settingsSection=registration", icon: Settings, keywords: "formulář registrace" },
] as const;

export function CommandMenu() {
    const router = useRouter();
    const { openProfile } = useProfileModal();
    const [open, setOpen] = React.useState(false);

    const troops = useQuery(api.troops.getByUser) || [];
    const trips = useQuery(api.trips.getAllUserTrips) || [];
    const members = useQuery(api.members.getAllUserMembers) || [];
    const bases = useQuery(api.bases.getAllBases) || [];

    React.useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                setOpen((current) => !current);
            } else if (event.key === "Escape") {
                setOpen(false);
            }
        };
        const openFromTopbar = () => setOpen(true);

        document.addEventListener("keydown", onKeyDown);
        window.addEventListener("skautreg:open-command", openFromTopbar);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("skautreg:open-command", openFromTopbar);
        };
    }, []);

    const run = React.useCallback((action: () => void) => {
        setOpen(false);
        action();
    }, []);
    const go = React.useCallback((href: string) => run(() => router.push(href)), [router, run]);

    if (!open) return null;

    return (
        <div
            role="presentation"
            onClick={() => setOpen(false)}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                padding: "min(12vh, 7rem) 1rem 1rem",
                background: "rgba(0, 0, 0, 0.5)",
                backdropFilter: "blur(2px)",
            }}
        >
            <div role="dialog" aria-modal="true" aria-label="Hledat v aplikaci" onClick={(event) => event.stopPropagation()} style={{ width: "100%", maxWidth: 720 }}>
                <Command
                    label="Hledat v aplikaci"
                    loop
                    style={{
                        width: "100%",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        background: "white",
                        border: "3px solid #000",
                        borderRadius: 12,
                        boxShadow: "8px 8px 0 #000",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: ".75rem", padding: "1rem", borderBottom: "3px solid #000" }}>
                        <Search size={22} strokeWidth={2.6} aria-hidden="true" />
                        <Command.Input
                            autoFocus
                            placeholder="Stránky, oddíly, výpravy, záložky, členové, základny…"
                            style={{ width: "100%", border: 0, outline: 0, fontSize: "1.1rem", fontWeight: 650, background: "transparent" }}
                        />
                        <kbd style={{ padding: ".2rem .45rem", border: "2px solid #000", borderRadius: 5, background: "#f5f5f5", fontWeight: 800 }}>Esc</kbd>
                    </div>

                    <Command.List style={{ maxHeight: "min(62vh, 560px)", overflowY: "auto", padding: ".5rem" }}>
                        <Command.Empty style={{ padding: "2rem", textAlign: "center", fontWeight: 700 }}>Nic jsme nenašli.</Command.Empty>

                        <Group heading="Stránky a nabídky">
                            <PaletteItem icon={House} label="Přehled" description="Domovská stránka" value="přehled domů dashboard home" onSelect={() => go("/home")} />
                            <PaletteItem icon={FolderKanban} label="Všechny oddíly" description="Výběr a správa oddílů" value="všechny oddíly projekty" onSelect={() => go("/troop")} />
                            <PaletteItem icon={CalendarDays} label="Kalendář" description="Termíny napříč oddíly" value="kalendář termíny události" onSelect={() => go("/calendar")} />
                            <PaletteItem icon={Users} label="Členové" description="Seznam členů" value="členové skauti lidé" onSelect={() => go("/members")} />
                            <PaletteItem icon={TentTree} label="Výpravy – nadcházející" description="Plánované výpravy" value="výpravy nadcházející budoucí" onSelect={() => go("/trips?tab=upcoming")} />
                            <PaletteItem icon={TentTree} label="Výpravy – archiv" description="Proběhlé výpravy" value="výpravy archiv staré historie" onSelect={() => go("/trips?tab=old")} />
                            <PaletteItem icon={MapPinned} label="Vyhledávač základen" description="Mapa základen" value="vyhledávač základen mapa ubytování" onSelect={() => go("/tools/basefinder")} />
                            <PaletteItem icon={Lightbulb} label="Nápady na funkce" description="Nápady a hlasování" value="nápady funkce feedback" onSelect={() => go("/fae?tab=features")} />
                            <PaletteItem icon={Lightbulb} label="Hlášené chyby" description="Seznam chyb" value="chyby bug hlášení" onSelect={() => go("/fae?tab=errors")} />
                            <PaletteItem icon={Plus} label="Nový návrh nebo chyba" description="Odeslat zpětnou vazbu" value="nový návrh chyba feedback" onSelect={() => go("/fae?tab=submit")} />
                            <PaletteItem icon={FileText} label="Moje poznámky" description="Supernotes poznámky" value="moje poznámky supernotes" onSelect={() => go("/fae?tab=notes")} />
                            <PaletteItem icon={Settings} label="Nastavení" description="Vybrat oddíl k nastavení" value="nastavení oddílu" onSelect={() => go("/settings")} />
                        </Group>

                        <Group heading="Rychlé akce">
                            <PaletteItem icon={Plus} label="Vytvořit nový oddíl" value="akce vytvořit přidat nový oddíl" onSelect={() => go("/troop?create=true")} />
                            <PaletteItem icon={Plus} label="Naplánovat výpravu" value="akce vytvořit přidat nová výprava" onSelect={() => go("/trips?create=true")} />
                            <PaletteItem icon={Plus} label="Přidat člena" value="akce vytvořit přidat nový člen" onSelect={() => go("/members?create=true")} />
                            {troops[0] && <PaletteItem icon={Plus} label="Nový dokument" value="akce vytvořit dokument schůzka rada zápis" onSelect={() => go(`/troop/${troops[0]._id}/documents?create=true`)} />}
                            <PaletteItem icon={CircleUserRound} label="Můj profil" value="účet profil předvolby" onSelect={() => run(openProfile)} />
                        </Group>

                        {troops.length > 0 && (
                            <Group heading="Oddíly a jejich nabídky">
                                {troops.flatMap((troop) => [
                                    <PaletteItem key={`${troop._id}-overview`} icon={FolderKanban} label={`${troop.name} – přehled`} description="Přehled oddílu" value={`${troop.name} oddíl přehled`} onSelect={() => go(`/troop/${troop._id}`)} />,
                                    <PaletteItem key={`${troop._id}-members`} icon={Users} label={`${troop.name} – členové`} description="Členové oddílu" value={`${troop.name} členové skauti`} onSelect={() => go(`/members?troopId=${troop._id}`)} />,
                                    <PaletteItem key={`${troop._id}-trips`} icon={TentTree} label={`${troop.name} – výpravy`} description="Nadcházející výpravy oddílu" value={`${troop.name} výpravy nadcházející`} onSelect={() => go(`/trips?troopId=${troop._id}&tab=upcoming`)} />,
                                    <PaletteItem key={`${troop._id}-archive`} icon={TentTree} label={`${troop.name} – archiv výprav`} value={`${troop.name} výpravy archiv staré`} onSelect={() => go(`/trips?troopId=${troop._id}&tab=old`)} />,
                                    <PaletteItem key={`${troop._id}-documents`} icon={FileText} label={`${troop.name} – Dokumenty`} value={`${troop.name} dokumenty rady zápisy úkoly hry`} onSelect={() => go(`/troop/${troop._id}/documents`)} />,
                                    <PaletteItem key={`${troop._id}-leaders`} icon={CircleUserRound} label={`${troop.name} – vedení`} value={`${troop.name} vedení vedoucí`} onSelect={() => go(`/troop/${troop._id}/leaders`)} />,
                                    <PaletteItem key={`${troop._id}-general`} icon={Settings} label={`${troop.name} – základní údaje`} value={`${troop.name} nastavení základní údaje`} onSelect={() => go(`/settings/${troop._id}?section=general`)} />,
                                    <PaletteItem key={`${troop._id}-branding`} icon={Settings} label={`${troop.name} – vzhled a logo`} value={`${troop.name} nastavení vzhled logo branding`} onSelect={() => go(`/settings/${troop._id}?section=branding`)} />,
                                    <PaletteItem key={`${troop._id}-gmail`} icon={Mail} label={`${troop.name} – e-mailové připojení`} value={`${troop.name} nastavení email gmail připojení`} onSelect={() => go(`/settings/${troop._id}?section=gmail`)} />,
                                    <PaletteItem key={`${troop._id}-danger`} icon={Settings} label={`${troop.name} – nebezpečná zóna`} value={`${troop.name} nastavení nebezpečná zóna smazat`} onSelect={() => go(`/settings/${troop._id}?section=danger`)} />,
                                ])}
                            </Group>
                        )}

                        {trips.length > 0 && (
                            <Group heading="Výpravy a jejich nabídky">
                                {trips.flatMap((trip) => tripTabs.map(({ label, tab, icon, keywords }) => (
                                    <PaletteItem
                                        key={`${trip._id}-${tab}`}
                                        icon={icon}
                                        label={`${trip.name} – ${label}`}
                                        description={trip.troopName || trip.location || "Výprava"}
                                        value={`${trip.name} ${label} ${keywords} ${trip.location || ""} ${trip.troopName || ""} ${trip._id}`}
                                        onSelect={() => go(`/trips/${trip._id}?tab=${tab}`)}
                                    />
                                )))}
                            </Group>
                        )}

                        {members.length > 0 && (
                            <Group heading="Členové">
                                {members.map((member) => (
                                    <PaletteItem
                                        key={member._id}
                                        icon={Users}
                                        label={member.nickname ? `${member.name} „${member.nickname}“` : member.name}
                                        description={member.troopName || "Detail člena"}
                                        value={`${member.name} ${member.nickname || ""} ${member.guardianName || ""} ${member.guardianEmail || ""} člen ${member._id}`}
                                        onSelect={() => go(`/members?${member.troopId ? `troopId=${member.troopId}&` : ""}memberId=${member._id}`)}
                                    />
                                ))}
                            </Group>
                        )}

                        {bases.length > 0 && (
                            <Group heading="Základny na mapě">
                                {bases.flatMap((base) => [
                                    <PaletteItem
                                        key={`${base._id}-info`}
                                        icon={MapPin}
                                        label={`${base.name} – informace`}
                                        description={base.location?.city || base.location?.address || "Základna"}
                                        value={`${base.name} ${base.location?.city || ""} ${base.location?.address || ""} základna mapa informace`}
                                        onSelect={() => go(`/tools/basefinder?baseId=${base._id}&tab=info`)}
                                    />,
                                    <PaletteItem
                                        key={`${base._id}-transport`}
                                        icon={Bus}
                                        label={`${base.name} – doprava`}
                                        description="Spojení k základně"
                                        value={`${base.name} ${base.location?.city || ""} základna mapa doprava spojení`}
                                        onSelect={() => go(`/tools/basefinder?baseId=${base._id}&tab=doprava`)}
                                    />,
                                ])}
                            </Group>
                        )}

                        <Group heading="Systém">
                            <PaletteItem icon={RefreshCw} label="Obnovit stránku" value="systém obnovit reload refresh" onSelect={() => run(() => window.location.reload())} />
                        </Group>
                    </Command.List>
                </Command>
            </div>
        </div>
    );
}

function Group({ heading, children }: { heading: string; children: React.ReactNode }) {
    return (
        <Command.Group heading={heading} style={{ marginBottom: ".5rem" }}>
            <div style={{ padding: ".65rem .65rem .3rem", color: "#666", fontSize: ".74rem", fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase" }}>
                {heading}
            </div>
            {children}
        </Command.Group>
    );
}

function PaletteItem({ label, description, icon: Icon, onSelect, value }: PaletteItemProps) {
    return (
        <Command.Item
            onSelect={onSelect}
            value={value || label}
            style={{ display: "flex", alignItems: "center", gap: ".75rem", padding: ".7rem .75rem", borderRadius: 7, cursor: "pointer" }}
        >
            <Icon size={20} strokeWidth={2.35} style={{ flexShrink: 0 }} aria-hidden="true" />
            <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: ".1rem" }}>
                <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</strong>
                {description && <small style={{ overflow: "hidden", color: "#666", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{description}</small>}
            </span>
        </Command.Item>
    );
}
