"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import TripForm, { TripFormData } from "../../../../components/TripForm";
import Button from "../../../../components/Button";
import EmailDraftsTab from "../../../../components/EmailDraftsTab";
import { resolveAttendanceSummary } from "../../../../lib/tripAttendance";
import { useFeedback } from "../../../../context/FeedbackContext";
import TransportTab from "../../../../components/trip/TransportTab";
import FinanceTab from "../../../../components/trip/FinanceTab";
import { TripBase, TripDocumentation, TripOverview, TripParticipants, type TripParticipantDTO } from "../../../../components/trip/TripWorkspaceSections";
import { normalizeMemberContactFields } from "../../../../lib/memberEmails";
import { ArrowLeft, Bus, CalendarDays, ClipboardList, FileText, Mail, MapPin, Settings2, Trash2, Users, WalletCards } from "lucide-react";
import workspaceStyles from "./TripWorkspace.module.css";

type TabType = 'info' | 'zakladna' | 'doprava' | 'finance' | 'ucastnici' | 'dokumentace' | 'emaily' | 'nastaveni';
const URL_TO_TAB: Record<string, TabType> = { overview: "info", base: "zakladna", transport: "doprava", finance: "finance", participants: "ucastnici", documents: "dokumentace", email: "emaily", settings: "nastaveni" };
const TAB_TO_URL: Record<TabType, string> = Object.fromEntries(Object.entries(URL_TO_TAB).map(([url, tab]) => [tab, url])) as Record<TabType, string>;

const TAB_META: Record<TabType, { title: string; description: string }> = {
    info: { title: "Přehled a plán", description: "Základní informace, termíny, přihlašování a organizační odpovědnosti." },
    zakladna: { title: "Základna a místo", description: "Vyberte ubytování a držte informace o místě pohromadě s plánem výpravy." },
    doprava: { title: "Doprava", description: "Plánujte trasy, spoje, jízdenky a náklady na cestu." },
    finance: { title: "Finance", description: "Pracovní rozpočet, výdaje a přehled plateb účastníků." },
    ucastnici: { title: "Účastníci", description: "Přihlášky, odpovědi, kontakty a stav účasti na jednom místě." },
    dokumentace: { title: "Dokumentace", description: "Zápisy, pracovní dokumenty a návazné rady spojené s výpravou." },
    emaily: { title: "E-mailová komunikace", description: "Připravujte návrhy a rozesílejte aktuální informace účastníkům." },
    nastaveni: { title: "Nastavení výpravy", description: "Upravte hlavní údaje, pravidla přihlašování a vlastní otázky." },
};

const BENEFIT_OPTIONS = [
    "žákovský průkaz ČR",
    "karta ISIC",
    "karta ITIC",
    "karta ALIVE",
    "karta EYCA (EURO<26)",
    "potvrzení o studiu",
    "průkaz ZTP",
    "průkaz ZTP/P",
    "průvodce ZTP/P",
    "průkaz ŤZP",
    "průkaz ŤZP/S",
    "průvodce ŤZP/S",
    "JUNIOR (ZSSK)",
    "průkaz rodiče pro ústavy",
];

export default function TripDashboardPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const tripId = params.tripId as Id<"trips">;
    const { showError, showSuccess } = useFeedback();

    const dashboard = useQuery(api.trips.getDashboard, tripId ? { tripId } : "skip");
    const participantRows = useQuery(api.tripParticipants.list, dashboard?.role && dashboard.role !== "rover" ? { tripId } : "skip") as TripParticipantDTO[] | undefined;
    const updateTrip = useMutation(api.trips.update);
    const deleteTrip = useMutation(api.trips.remove);
    const unassignBase = useMutation(api.trips.unassignBase);
    const ensureParticipations = useMutation(api.trips.ensureParticipations);
    const getParticipantCapability = useMutation(api.tripParticipants.getCapabilityUrl);
    const regenerateParticipantCapability = useMutation(api.tripParticipants.regenerateCapability);
    const addTripStaffUser = useMutation(api.tripStaff.addUser);
    const addTripStaffExternal = useMutation(api.tripStaff.addExternal);
    const addTripStaffFromPreset = useMutation(api.tripStaff.addFromPreset);
    const removeTripStaff = useMutation(api.tripStaff.remove);
    const removeLeaderPreset = useMutation(api.leaderPresets.remove);

    const troop = useQuery(
        api.troops.getById,
        dashboard ? { id: dashboard.trip.troopId } : "skip"
    );

    const [activeTab, setActiveTab] = useState<TabType>('info');
    const [settingsSection, setSettingsSection] = useState<"details" | "registration">("details");
    const [emailView, setEmailView] = useState<"drafts" | "sent" | "responses">("drafts");
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [viewResponse, setViewResponse] = useState<any | null>(null);
    const [showCreateDoc, setShowCreateDoc] = useState(false);
    const [newDocTitle, setNewDocTitle] = useState("");
    const [didEnsureParticipants, setDidEnsureParticipants] = useState(false);
    const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
    const [selectedLeaderId, setSelectedLeaderId] = useState<string>("");
    const [externalName, setExternalName] = useState("");
    const [externalRole, setExternalRole] = useState<"leader" | "rover">("leader");
    const [externalAge, setExternalAge] = useState<string>("");
    const [externalBenefit, setExternalBenefit] = useState<string>("");
    const [saveExternalAsPreset, setSaveExternalAsPreset] = useState(false);

    useEffect(() => {
        const requestedTab = searchParams.get("tab") || "overview";
        setActiveTab(URL_TO_TAB[requestedTab] || "info");

        const requestedEmailView = searchParams.get("emailView");
        if (requestedEmailView === "drafts" || requestedEmailView === "sent" || requestedEmailView === "responses") {
            setEmailView(requestedEmailView);
            setActiveTab("emaily");
        }

        const requestedSettingsSection = searchParams.get("settingsSection");
        if (requestedSettingsSection === "details" || requestedSettingsSection === "registration") {
            setSettingsSection(requestedSettingsSection);
            setActiveTab("nastaveni");
        }
    }, [searchParams]);

    useEffect(() => {
        if (dashboard?.role !== "rover") return;
        if (["finance", "ucastnici", "emaily", "nastaveni"].includes(activeTab)) {
            router.replace(`/trips/${tripId}?tab=overview`, { scroll: false });
        }
    }, [activeTab, dashboard?.role, router, tripId]);

    const tripDocs = useQuery(api.meetings.listByTrip, { tripId });
    const createDoc = useMutation(api.meetings.create);

    const copyLink = async (participationId: string) => {
        try {
            const { url: capabilityUrl } = await getParticipantCapability({ participationId: participationId as Id<"participations"> });
            const url = capabilityUrl.startsWith("/") ? `${window.location.origin}${capabilityUrl}` : capabilityUrl;
            await navigator.clipboard.writeText(url);
            setCopiedKey(participationId);
            setTimeout(() => setCopiedKey(null), 2000);
        } catch (error) {
            showError({ title: "Odkaz nelze zkopírovat", message: "Zkuste akci znovu.", icon: "error", details: error instanceof Error ? error.message : undefined });
        }
    };

    const regenerateLink = async (participationId: string, name: string) => {
        showError({
            title: "Vytvořit nový odkaz?",
            message: `Předchozí bezpečný odkaz pro ${name} přestane fungovat.`,
            icon: "warning",
            buttons: [
                { label: "Vytvořit nový", variant: "danger", onClick: async () => {
                    const { url: capabilityUrl } = await regenerateParticipantCapability({ participationId: participationId as Id<"participations"> });
                    const url = capabilityUrl.startsWith("/") ? `${window.location.origin}${capabilityUrl}` : capabilityUrl;
                    await navigator.clipboard.writeText(url);
                    setCopiedKey(participationId);
                    showSuccess({ title: "Nový odkaz je zkopírovaný", message: "Starý bezpečný odkaz byl zneplatněn.", duration: 2500 });
                } },
                { label: "Zrušit", variant: "secondary", onClick: () => undefined },
            ],
        });
    };

    const confirmUnassignBase = () => showError({
        title: "Odebrat přiřazenou základnu?",
        message: "Výprava zůstane zachovaná, ale vazba na základnu se odstraní.",
        icon: "warning",
        buttons: [
            { label: "Odebrat", variant: "danger", onClick: async () => { await unassignBase({ tripId }); } },
            { label: "Ponechat", variant: "secondary", onClick: () => undefined },
        ],
    });

    const selectTab = (tab: TabType) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", TAB_TO_URL[tab]);
        router.replace(`/trips/${tripId}?${params.toString()}`, { scroll: false });
    };

    const handleUpdate = async (data: TripFormData) => {
        setIsSaving(true);
        try {
            await updateTrip({
                id: tripId,
                name: data.name,
                description: data.description,
                location: data.location,
                startDate: data.startDate,
                endDate: data.endDate,
                lastCancellationDate: data.lastCancellationDate,
                lateCancellationMessage: data.lateCancellationMessage,
                formType: data.formType,
                customFields: data.customFields
            });
            showSuccess({
                title: "✅ Uloženo",
                message: "Změny byly úspěšně uloženy.",
                duration: 2000,
            });
        } catch (error: any) {
            console.error(error);
            showError({
                title: "❌ Chyba",
                message: "Změny se nepodařily uložit. Zkuste to znovu.",
                icon: "error",
                canReport: true,
                details: error?.message,
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        showError({
            title: "⚠️ Potvrzení",
            message: "Opravdu chcete smazat celou výpravu a všechny odpovědi? Tuto akci nelze vrátit!",
            icon: "warning",
            buttons: [
                {
                    label: "Ano, smazat",
                    onClick: async () => {
                        try {
                            await deleteTrip({ id: tripId });
                            showSuccess({
                                title: "✅ Smazáno",
                                message: "Výprava byla smazána.",
                                duration: 2000,
                            });
                            router.push("/trips");
                        } catch (error: any) {
                            showError({
                                title: "❌ Chyba",
                                message: "Výpravu se nepodařilo smazat.",
                                icon: "error",
                                canReport: true,
                            });
                        }
                    },
                    variant: "danger",
                },
                {
                    label: "Zrušit",
                    onClick: () => {},
                    variant: "secondary",
                },
            ],
        });
    };

    const handleAddLeaderFromTeam = async () => {
        if (!selectedLeaderId) return;
        try {
            const selected = dashboard?.leaders?.find((l: any) => l._id === selectedLeaderId);
            const roleFromTeam = selected?.role === "rover" ? "rover" : "leader";
            await addTripStaffUser({
                tripId,
                userId: selectedLeaderId as Id<"users">,
                role: roleFromTeam,
            });
            setSelectedLeaderId("");
            showSuccess({ title: "✅ Přidáno", message: "Vedoucí/rover byl přidán.", duration: 1500 });
        } catch (error: any) {
            showError({
                title: "❌ Chyba",
                message: "Nepodařilo se přidat vedoucího/rovera.",
                icon: "error",
                canReport: true,
                details: error?.message,
            });
        }
    };

    const handleAddExternal = async () => {
        const name = externalName.trim();
        if (!name) return;
        const age = externalAge.trim() === "" ? undefined : Number(externalAge);
        try {
            await addTripStaffExternal({
                tripId,
                name,
                role: externalRole,
                age: Number.isFinite(age) ? age : undefined,
                benefit: externalBenefit || undefined,
                saveAsPreset: saveExternalAsPreset || undefined,
            });
            setExternalName("");
            setExternalAge("");
            setExternalBenefit("");
            setSaveExternalAsPreset(false);
            showSuccess({ title: "✅ Přidáno", message: "Externí vedoucí/rover byl přidán.", duration: 1500 });
        } catch (error: any) {
            showError({
                title: "❌ Chyba",
                message: "Nepodařilo se přidat externí osobu.",
                icon: "error",
                canReport: true,
                details: error?.message,
            });
        }
    };

    const handleAddFromPreset = async (presetId: Id<"leader_presets">) => {
        try {
            await addTripStaffFromPreset({ tripId, presetId });
            showSuccess({ title: "✅ Přidáno", message: "Preset byl přidán do výpravy.", duration: 1500 });
        } catch (error: any) {
            showError({
                title: "❌ Chyba",
                message: "Nepodařilo se přidat preset.",
                icon: "error",
                canReport: true,
                details: error?.message,
            });
        }
    };

    const handleOpenTripDocs = async () => {
        if (!trip.troopId) return;
        
        // Check if documentation already exists
        const docMeeting = tripDocs?.find(m => m.category === "documentation");
        
        if (docMeeting) {
            router.push(`/rady/${docMeeting._id}`);
        } else {
            try {
                const meetingId = await createDoc({
                    troopId: trip.troopId,
                    tripId: tripId,
                    title: `Dokumentace: ${trip.name}`,
                    description: `Sjednocená dokumentace a podklady k výpravě`,
                    category: "documentation"
                });
                router.push(`/rady/${meetingId}`);
            } catch (error: any) {
                console.error(error);
                showError({
                    title: "❌ Chyba",
                    message: "Dokument se nepodařilo vytvořit.",
                    icon: "error",
                    canReport: true,
                });
            }
        }
    };

    const getParsedResponses = (responses: any) => {
        if (!responses) return {};
        let parsed = responses;

        // Try to parse if it's a string. Handle generic double-serialization safely.
        // We loop a few times in case it was stringified multiple times.
        let attempts = 0;
        while (typeof parsed === 'string' && attempts < 3) {
            try {
                const temp = JSON.parse(parsed);
                parsed = temp;
            } catch (e) {
                // Not a JSON string, stop parsing
                break;
            }
            attempts++;
        }

        // Ensure we ended up with an object (and not null)
        if (typeof parsed !== 'object' || parsed === null) {
            return {};
        }

        return parsed;
    };

    useEffect(() => {
        if (!dashboard || dashboard.role === "rover" || didEnsureParticipants) return;
        setDidEnsureParticipants(true);
        ensureParticipations({ tripId }).catch((error) => {
            console.error("Failed to ensure participations", error);
        });
    }, [dashboard, didEnsureParticipants, ensureParticipations, tripId]);

    if (dashboard === undefined) {
        return <div>Načítám přehled...</div>;
    }

    if (dashboard === null) {
        return <div>Výprava nenalezena.</div>;
    }

    const { trip, base } = dashboard;
    const canSeeSensitive = Boolean(dashboard.role && dashboard.role !== "rover");
    const validParticipants: any[] = canSeeSensitive ? (participantRows || []) : [];
    const participantsWithEmail = validParticipants.filter((p) => p.primaryEmail);
    const tripStaff = (dashboard as any).tripStaff || [];
    const leaderPresets = (dashboard as any).leaderPresets || [];
    const attendanceSummary = resolveAttendanceSummary(dashboard);
    const attendingCount = attendanceSummary.attending;
    const notAttendingCount = attendanceSummary.notAttending;
    const pendingCount = attendanceSummary.pending;
    const overviewParticipants = canSeeSensitive ? validParticipants : [
        ...Array.from({ length: attendingCount }, () => ({ status: "attending" })),
        ...Array.from({ length: notAttendingCount }, () => ({ status: "not_attending" })),
        ...Array.from({ length: pendingCount }, () => ({ status: "pending" })),
    ];

    return (
        <div className={workspaceStyles.workspace}>
            <aside className={workspaceStyles.rail}>
                <div className={workspaceStyles.railBrand}><img src="/logo_skautreg.svg" alt="SkautREG" /><strong>{dashboard.role === "rover" ? "Náhled výpravy" : "Editor výpravy"}</strong></div>
                <button className={workspaceStyles.backLink} onClick={() => router.push("/trips")}><ArrowLeft size={17} /> Zpět na všechny výpravy</button>
                <div className={workspaceStyles.tripIdentity}>
                    <div className={workspaceStyles.identityTop}><span>Pracovní prostor</span><b>Výprava</b></div>
                    <h1>{trip.name}</h1>
                    <div className={workspaceStyles.tripMeta}><MapPin size={15} /> {trip.location || "Místo není vyplněno"}</div>
                    <div className={workspaceStyles.tripMeta}><CalendarDays size={15} /> {trip.startDate || "Datum není vyplněno"}{trip.endDate ? ` – ${trip.endDate}` : ""}</div>
                </div>

                <nav className={workspaceStyles.workspaceNav} aria-label="Plánování výpravy">
                    <span className={workspaceStyles.navLabel}>Plán</span>
                    <button data-active={activeTab === 'info'} onClick={() => selectTab('info')}><ClipboardList size={18} /><span><strong>Přehled</strong><small>Základní plán a termíny</small></span></button>
                    <button data-active={activeTab === 'zakladna'} onClick={() => selectTab('zakladna')}><MapPin size={18} /><span><strong>Základna</strong><small>Ubytování a místo</small></span></button>
                    <button data-active={activeTab === 'doprava'} onClick={() => selectTab('doprava')}><Bus size={18} /><span><strong>Doprava</strong><small>Spoje, trasy a jízdenky</small></span></button>
                    {canSeeSensitive && <button data-active={activeTab === 'finance'} onClick={() => selectTab('finance')}><WalletCards size={18} /><span><strong>Finance</strong><small>Rozpočet a platby</small></span></button>}
                    <span className={workspaceStyles.navLabel}>Lidé a komunikace</span>
                    {canSeeSensitive && <button data-active={activeTab === 'ucastnici'} onClick={() => selectTab('ucastnici')}><Users size={18} /><span><strong>Účastníci</strong><small>Přihlášky a odpovědi</small></span></button>}
                    <button data-active={activeTab === 'dokumentace'} onClick={() => selectTab('dokumentace')}><FileText size={18} /><span><strong>Dokumentace</strong><small>Zápisy a pracovní soubory</small></span></button>
                    <div className={workspaceStyles.navWithSubmenu}>
                        {canSeeSensitive && <button data-active={activeTab === 'emaily'} onClick={() => selectTab('emaily')}><Mail size={18} /><span><strong>E-maily</strong><small>Komunikace s rodiči</small></span></button>}
                        <div className={workspaceStyles.hoverSubmenu} aria-label="Části e-mailové komunikace">
                            <button data-selected={emailView === "drafts"} onClick={() => { setEmailView("drafts"); setActiveTab("emaily"); }}>Koncepty</button>
                            <button data-selected={emailView === "sent"} onClick={() => { setEmailView("sent"); setActiveTab("emaily"); }}>Odeslané zprávy</button>
                            <button data-selected={emailView === "responses"} onClick={() => { setEmailView("responses"); setActiveTab("emaily"); }}>Odezva rodičů</button>
                        </div>
                    </div>
                    <span className={workspaceStyles.navLabel}>Správa</span>
                    <div className={workspaceStyles.navWithSubmenu}>
                        {canSeeSensitive && <button data-active={activeTab === 'nastaveni'} onClick={() => selectTab('nastaveni')}><Settings2 size={18} /><span><strong>Nastavení</strong><small>Údaje a přihlašování</small></span></button>}
                        <div className={workspaceStyles.hoverSubmenu} aria-label="Části nastavení výpravy">
                            <button data-selected={settingsSection === "details"} onClick={() => { setSettingsSection("details"); setActiveTab("nastaveni"); }}>Základní údaje</button>
                            <button data-selected={settingsSection === "registration"} onClick={() => { setSettingsSection("registration"); setActiveTab("nastaveni"); }}>Přihlašování a otázky</button>
                        </div>
                    </div>
                </nav>

                <div className={workspaceStyles.railActions}>
                    <span>Správa výpravy</span>
                    <button className={workspaceStyles.deleteAction} onClick={handleDelete}><Trash2 size={16} /> Smazat</button>
                </div>
            </aside>

            <main className={workspaceStyles.workspaceContent}>
                <div className={workspaceStyles.mobileContext}><span>{dashboard.role === "rover" ? "Náhled výpravy" : "Editor výpravy"}</span><strong>{trip.name}</strong><button onClick={() => router.push("/trips")}><ArrowLeft size={15} /> Zpět</button></div>

                <div key={activeTab} className={workspaceStyles.sectionTransition}>
                    {activeTab === 'info' && <TripOverview trip={trip} participants={overviewParticipants} staff={tripStaff} onManageStaff={() => setIsStaffModalOpen(true)} canManageStaff={canSeeSensitive} />}
                    {activeTab === 'zakladna' && <TripBase base={base} onUnassign={confirmUnassignBase} />}
                    {activeTab === 'doprava' && <TransportTab tripId={tripId} trip={trip} />}
                    {activeTab === 'finance' && <FinanceTab tripId={tripId} />}
                    {activeTab === 'ucastnici' && canSeeSensitive && <TripParticipants participants={validParticipants} copiedKey={copiedKey} onCopy={copyLink} onRegenerate={regenerateLink} />}
                    {activeTab === 'dokumentace' && <TripDocumentation documents={tripDocs} onOpenMain={handleOpenTripDocs} onOpenDocument={id => router.push(`/rady/${id}`)} />}
                    {activeTab === 'emaily' && <EmailDraftsTab tripId={tripId} view={emailView} isLeader={dashboard && troop ? (() => { const leaders = dashboard.leaders || []; const user = dashboard.currentUser; return leaders.some((leader: any) => leader?._id === user?._id && (leader.role === "owner" || leader.role === "main_leader")); })() : false} />}
                    {activeTab === 'nastaveni' && <TripForm initialData={{ name: trip.name, description: trip.description, location: trip.location, startDate: trip.startDate, endDate: trip.endDate || "", lastCancellationDate: trip.lastCancellationDate || "", lateCancellationMessage: trip.lateCancellationMessage || "", formType: trip.formType || "registration", customFields: trip.customFields || [] }} onSubmit={handleUpdate} isLoading={isSaving} buttonText="Uložit změny" layout="workspace" section={settingsSection} showNavigation={false} />}
                </div>

            {/* Tab Content - INFO */}
            {activeTab === ('legacy-info' as TabType) && (
                <div className={workspaceStyles.sectionCanvas}>
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) 460px",
                        gap: "1.5rem",
                        alignItems: "start",
                        width: "100%"
                    }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                            {/* Info Card - Two Column Layout */}
                            <div style={{
                                backgroundColor: "#FFF9E6",
                                border: "3px solid #000",
                                borderRadius: "12px",
                                padding: "2rem",
                                boxShadow: "6px 6px 0 0 #000"
                            }}>
                                <h2 style={{ fontSize: "1.8rem", fontWeight: "900", marginBottom: "1.5rem", textTransform: "uppercase" }}>
                                    Informace o výpravě
                                </h2>
                                
                                {/* Two Column Grid */}
                                <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                                    gap: "1.5rem",
                                    marginBottom: "1.5rem"
                                }}>
                                    {/* Location Card */}
                                    <div style={{
                                        backgroundColor: "white",
                                        border: "2px solid #000",
                                        borderRadius: "8px",
                                        padding: "1.2rem",
                                        boxShadow: "3px 3px 0 0 #000"
                                    }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                                            <img src="/place-icon.svg" alt="Location" style={{ width: "28px", height: "28px" }} />
                                            <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#666", textTransform: "uppercase" }}>Místo</div>
                                        </div>
                                        <div style={{ fontSize: "1.2rem", fontWeight: "800", paddingLeft: "2.5rem" }}>{trip.location}</div>
                                    </div>

                                    {/* Date Card */}
                                    <div style={{
                                        backgroundColor: "white",
                                        border: "2px solid #000",
                                        borderRadius: "8px",
                                        padding: "1.2rem",
                                        boxShadow: "3px 3px 0 0 #000"
                                    }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                                            <img src="/clock-time-icon.svg" alt="Time" style={{ width: "28px", height: "28px" }} />
                                            <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#666", textTransform: "uppercase" }}>Termín</div>
                                        </div>
                                        <div style={{ fontSize: "1.2rem", fontWeight: "800", paddingLeft: "2.5rem" }}>
                                            {(() => {
                                                const fmt = (dStr: string) => {
                                                    if (!dStr) return "";
                                                    const [y, m, d] = dStr.split("-");
                                                    return `${parseInt(d)}. ${parseInt(m)}. ${y}`;
                                                };
                                                return `${fmt(trip.startDate)}${trip.endDate ? ` - ${fmt(trip.endDate)}` : ""}`;
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                {/* Description */}
                                {trip.description && (
                                    <div style={{
                                        backgroundColor: "white",
                                        border: "2px solid #000",
                                        borderRadius: "8px",
                                        padding: "1.2rem",
                                        boxShadow: "3px 3px 0 0 #000"
                                    }}>
                                        <div style={{ fontSize: "0.9rem", fontWeight: "900", textTransform: "uppercase", marginBottom: "0.75rem" }}>
                                            Popis
                                        </div>
                                        <p style={{ lineHeight: "1.6", margin: 0, fontSize: "1rem" }}>{trip.description}</p>
                                    </div>
                                )}
                            </div>

                            {/* Další informace (kompaktní) */}
                            <div style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                                gap: "0.85rem"
                            }}>
                                <div style={{
                                    backgroundColor: "white",
                                    border: "2px solid #000",
                                    borderRadius: "8px",
                                    padding: "0.85rem 1rem",
                                    boxShadow: "2px 2px 0 0 #000"
                                }}>
                                    <div style={{ fontSize: "0.8rem", fontWeight: "900", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                                        Účast
                                    </div>
                                    <div style={{ display: "grid", gap: "0.2rem", fontWeight: "700", fontSize: "0.95rem" }}>
                                        <div>Celkem: {validParticipants.length}</div>
                                        <div>Jede: {attendingCount} · Nejede: {notAttendingCount} · Bez reakce: {pendingCount}</div>
                                    </div>
                                </div>

                                <div style={{
                                    backgroundColor: "white",
                                    border: "2px solid #000",
                                    borderRadius: "8px",
                                    padding: "0.85rem 1rem",
                                    boxShadow: "2px 2px 0 0 #000"
                                }}>
                                    <div style={{ fontSize: "0.8rem", fontWeight: "900", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                                        Přihláška a kontakty
                                    </div>
                                    <div style={{ display: "grid", gap: "0.2rem", fontWeight: "700", fontSize: "0.95rem" }}>
                                        <div>Formulář: {trip.formType || "registration"} · Otázky: {trip.customFields ? trip.customFields.length : 0}</div>
                                        <div>E-maily: {participantsWithEmail.length} · Bez e-mailu: {validParticipants.length - participantsWithEmail.length}</div>
                                    </div>
                                </div>

                                <div style={{
                                    backgroundColor: "white",
                                    border: "2px solid #000",
                                    borderRadius: "8px",
                                    padding: "0.85rem 1rem",
                                    boxShadow: "2px 2px 0 0 #000"
                                }}>
                                    <div style={{ fontSize: "0.8rem", fontWeight: "900", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                                        Lhůty a základna
                                    </div>
                                    <div style={{ display: "grid", gap: "0.2rem", fontWeight: "700", fontSize: "0.95rem" }}>
                                        <div>
                                            Odhlášení: {trip.lastCancellationDate ? (() => {
                                                const [y, m, d] = trip.lastCancellationDate.split("-");
                                                return `${parseInt(d)}. ${parseInt(m)}. ${y}`;
                                            })() : "Nezadáno"}
                                        </div>
                                        <div>Pozdní: {trip.lateCancellationMessage ? "Ano" : "Ne"} · Základna: {base ? base.name : "Nezadaná"}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{
                            backgroundColor: "white",
                            border: "2px solid #000",
                            borderRadius: "10px",
                            padding: "0.9rem",
                            boxShadow: "2px 2px 0 0 #000",
                            position: "sticky",
                            top: "1rem"
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.6rem" }}>
                                <div style={{ fontWeight: "900", textTransform: "uppercase", fontSize: "0.95rem" }}>Vedoucí & Roveři</div>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <div style={{ fontSize: "0.8rem", color: "#666", fontWeight: "700" }}>Přidáno: {tripStaff.length}</div>
                                    <button
                                        onClick={() => setIsStaffModalOpen(true)}
                                        style={{
                                            padding: "6px 10px",
                                            border: "2px solid #000",
                                            borderRadius: "8px",
                                            backgroundColor: "#86efac",
                                            fontWeight: "900",
                                            cursor: "pointer",
                                            fontSize: "0.85rem",
                                        }}
                                    >
                                        Přidat
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                {tripStaff.length === 0 ? (
                                    <div style={{ color: "#888", fontStyle: "italic", fontWeight: "600" }}>Zatím nikdo není přiřazen.</div>
                                ) : (
                                    tripStaff.map((s: any) => (
                                        <div key={s._id} style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: "0.4rem",
                                            border: "2px solid #000",
                                            borderRadius: "8px",
                                            padding: "0.45rem 0.6rem",
                                            backgroundColor: "#f9fafb"
                                        }}>
                                            <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                                                <div style={{ fontWeight: "800" }}>{s.user?.name || s.name}</div>
                                                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", alignItems: "center" }}>
                                                    <span style={{
                                                        border: "2px solid #000",
                                                        borderRadius: "999px",
                                                        padding: "0 6px",
                                                        fontSize: "0.7rem",
                                                        fontWeight: "900",
                                                        backgroundColor: s.role === "rover" ? "#a7f3d0" : "#fde047"
                                                    }}>
                                                        {s.role === "rover" ? "ROVER" : "VEDOUCÍ"}
                                                    </span>
                                                    {typeof s.age === "number" && <span style={{ fontSize: "0.75rem", fontWeight: "700" }}>{s.age} let</span>}
                                                    {s.benefit && <span style={{ fontSize: "0.75rem", fontWeight: "700" }}>{s.benefit}</span>}
                                                </div>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    await removeTripStaff({ tripStaffId: s._id });
                                                }}
                                                style={{
                                                    border: "2px solid #000",
                                                    borderRadius: "6px",
                                                    backgroundColor: "#fee2e2",
                                                    fontWeight: "900",
                                                    padding: "0 6px",
                                                    cursor: "pointer"
                                                }}
                                                title="Odebrat"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {isStaffModalOpen && (
                        <div
                            style={{
                                position: "fixed",
                                inset: 0,
                                backgroundColor: "rgba(0,0,0,0.5)",
                                zIndex: 2000,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "1rem"
                            }}
                            onClick={() => setIsStaffModalOpen(false)}
                        >
                            <div
                                style={{
                                    backgroundColor: "white",
                                    border: "3px solid #000",
                                    borderRadius: "16px",
                                    boxShadow: "8px 8px 0 0 #000",
                                    width: "100%",
                                    maxWidth: "900px",
                                    maxHeight: "85vh",
                                    overflowY: "auto",
                                    padding: "1.5rem"
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                                    <h2 style={{ fontSize: "1.4rem", fontWeight: "900", margin: 0 }}>Vedoucí & Roveři</h2>
                                    <button
                                        onClick={() => setIsStaffModalOpen(false)}
                                        style={{
                                            border: "3px solid #000",
                                            borderRadius: "10px",
                                            padding: "0.4rem 0.8rem",
                                            fontWeight: "900",
                                            backgroundColor: "#f4f4f5",
                                            cursor: "pointer"
                                        }}
                                    >
                                        Zavřít
                                    </button>
                                </div>

                                <div style={{
                                    border: "2px solid #000",
                                    borderRadius: "12px",
                                    padding: "1rem",
                                    backgroundColor: "#f0fdf4",
                                    boxShadow: "3px 3px 0 0 #000",
                                    marginBottom: "1rem"
                                }}>
                                    <div style={{ fontWeight: "900", marginBottom: "0.6rem" }}>Přidat z týmu</div>
                                    <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 1fr) auto", gap: "0.6rem", alignItems: "center" }}>
                                        <select
                                            value={selectedLeaderId}
                                            onChange={(e) => setSelectedLeaderId(e.target.value)}
                                            style={{ padding: "10px 12px", border: "2px solid #000", borderRadius: "10px", fontWeight: "800" }}
                                        >
                                            <option value="">Vyber vedoucího/rovera…</option>
                                            {dashboard.leaders?.map((l: any) => (
                                                <option key={l._id} value={l._id}>
                                                    {l.name || l.email} · {l.role === "rover" ? "Rover" : "Vedoucí"}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={handleAddLeaderFromTeam}
                                            style={{
                                                padding: "10px 14px",
                                                border: "2px solid #000",
                                                borderRadius: "10px",
                                                backgroundColor: "#86efac",
                                                fontWeight: "900",
                                                cursor: "pointer",
                                            }}
                                        >
                                            Přidat
                                        </button>
                                    </div>
                                </div>

                                <div style={{
                                    border: "2px solid #000",
                                    borderRadius: "12px",
                                    padding: "1rem",
                                    backgroundColor: "#fff7ed",
                                    boxShadow: "3px 3px 0 0 #000",
                                    marginBottom: "1rem"
                                }}>
                                    <div style={{ fontWeight: "900", marginBottom: "0.6rem" }}>Přidat externího</div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 1fr auto", gap: "0.6rem", alignItems: "center" }}>
                                        <input
                                            value={externalName}
                                            onChange={(e) => setExternalName(e.target.value)}
                                            placeholder="Externí jméno"
                                            style={{ padding: "10px 12px", border: "2px solid #000", borderRadius: "10px", fontWeight: "800" }}
                                        />
                                        <input
                                            value={externalAge}
                                            onChange={(e) => setExternalAge(e.target.value)}
                                            placeholder="Věk"
                                            inputMode="numeric"
                                            style={{ padding: "10px 12px", border: "2px solid #000", borderRadius: "10px", fontWeight: "800" }}
                                        />
                                        <select
                                            value={externalBenefit}
                                            onChange={(e) => setExternalBenefit(e.target.value)}
                                            style={{ padding: "10px 12px", border: "2px solid #000", borderRadius: "10px", fontWeight: "800" }}
                                        >
                                            <option value="">Benefit</option>
                                            {BENEFIT_OPTIONS.map((b) => (
                                                <option key={b} value={b}>{b}</option>
                                            ))}
                                        </select>
                                        <select
                                            value={externalRole}
                                            onChange={(e) => setExternalRole(e.target.value as "leader" | "rover")}
                                            style={{ padding: "10px 12px", border: "2px solid #000", borderRadius: "10px", fontWeight: "800" }}
                                        >
                                            <option value="leader">Vedoucí</option>
                                            <option value="rover">Rover</option>
                                        </select>
                                    </div>

                                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", marginTop: "0.6rem" }}>
                                        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: "800", fontSize: "0.9rem" }}>
                                            <input
                                                type="checkbox"
                                                checked={saveExternalAsPreset}
                                                onChange={(e) => setSaveExternalAsPreset(e.target.checked)}
                                            />
                                            Uložit jako preset
                                        </label>
                                        <button
                                            onClick={handleAddExternal}
                                            style={{
                                                padding: "10px 14px",
                                                border: "2px solid #000",
                                                borderRadius: "10px",
                                                backgroundColor: "#fde047",
                                                fontWeight: "900",
                                                cursor: "pointer",
                                            }}
                                        >
                                            Přidat externího
                                        </button>
                                    </div>
                                </div>

                                {leaderPresets.length > 0 && (
                                    <div style={{
                                        border: "2px solid #000",
                                        borderRadius: "12px",
                                        padding: "0.8rem",
                                        backgroundColor: "#f8fafc",
                                        boxShadow: "3px 3px 0 0 #000"
                                    }}>
                                        <div style={{ fontWeight: "900", marginBottom: "0.5rem" }}>Presety</div>
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                                            {leaderPresets.map((p: any) => (
                                                <div key={p._id} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                                                    <button
                                                        onClick={() => handleAddFromPreset(p._id)}
                                                        style={{
                                                            padding: "6px 10px",
                                                            border: "2px solid #000",
                                                            borderRadius: "999px",
                                                            backgroundColor: "#f4f4f5",
                                                            fontWeight: "800",
                                                            cursor: "pointer",
                                                            fontSize: "0.85rem"
                                                        }}
                                                    >
                                                        {p.name} · {p.role === "rover" ? "Rover" : "Vedoucí"}
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            await removeLeaderPreset({ presetId: p._id });
                                                        }}
                                                        title="Smazat preset"
                                                        style={{
                                                            border: "2px solid #000",
                                                            borderRadius: "999px",
                                                            backgroundColor: "#fee2e2",
                                                            fontWeight: "900",
                                                            padding: "0 6px",
                                                            cursor: "pointer"
                                                        }}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Tab Content - ZAKLADNA */}
            {activeTab === ('legacy-zakladna' as TabType) && (
                <div className={workspaceStyles.sectionCanvas}>
                    {base ? (
                        <div style={{
                            backgroundColor: "#E3F2FD",
                            border: "3px solid #000",
                            borderRadius: "12px",
                            padding: "2rem",
                            boxShadow: "6px 6px 0 0 #000",
                            marginBottom: "2rem"
                        }}>
                            {/* Header with Unassign Button */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
                                <h2 style={{ fontSize: "2rem", fontWeight: "900", margin: 0, textTransform: "uppercase" }}>
                                    {base.name}
                                </h2>
                                <button
                                    onClick={async () => {
                                        if (confirm("Odebrat přiřazenou základnu?")) {
                                            await unassignBase({ tripId });
                                        }
                                    }}
                                    style={{
                                        padding: "0.75rem 1.25rem",
                                        backgroundColor: "#fca5a5",
                                        border: "3px solid #000",
                                        borderRadius: "8px",
                                        fontWeight: "900",
                                        cursor: "pointer",
                                        boxShadow: "4px 4px 0 0 #000",
                                        fontSize: "0.95rem",
                                        textTransform: "uppercase"
                                    }}
                                >
                                    Odebrat
                                </button>
                            </div>

                            {/* Two Column Layout */}
                            <div style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))",
                                gap: "1.5rem",
                                marginBottom: "1.5rem"
                            }}>
                                {/* Left Column - Photos */}
                                <div>
                                    {base.media?.photos && base.media.photos.length > 0 && (
                                        <div>
                                            <div style={{
                                                width: "100%",
                                                height: "350px",
                                                borderRadius: "8px",
                                                border: "3px solid #000",
                                                overflow: "hidden",
                                                boxShadow: "4px 4px 0 0 #000",
                                                marginBottom: "0.75rem",
                                                backgroundColor: "white"
                                            }}>
                                                <img 
                                                    src={base.media.photos[0].url} 
                                                    alt={base.name}
                                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                                />
                                            </div>
                                            {base.media.photos.length > 1 && (
                                                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                                    {base.media.photos.slice(1, 6).map((photo, idx) => (
                                                        <div key={idx} style={{
                                                            width: "70px",
                                                            height: "70px",
                                                            borderRadius: "6px",
                                                            border: "3px solid #000",
                                                            overflow: "hidden",
                                                            cursor: "pointer",
                                                            boxShadow: "2px 2px 0 0 #000"
                                                        }}>
                                                            <img src={photo.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Right Column - Basic Info */}
                                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                    {base.location?.city && (
                                        <div style={{
                                            backgroundColor: "white",
                                            border: "3px solid #000",
                                            borderRadius: "8px",
                                            padding: "1rem",
                                            boxShadow: "3px 3px 0 0 #000"
                                        }}>
                                            <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#666", marginBottom: "0.5rem", textTransform: "uppercase" }}>
                                                <img src="/place-icon.svg" alt="" style={{ width: "18px", height: "18px", verticalAlign: "middle", marginRight: "0.5rem" }} />
                                                Město
                                            </div>
                                            <div style={{ fontSize: "1.2rem", fontWeight: "900" }}>{base.location.city}</div>
                                        </div>
                                    )}
                                    {base.capacity && (
                                        <div style={{
                                            backgroundColor: "white",
                                            border: "3px solid #000",
                                            borderRadius: "8px",
                                            padding: "1rem",
                                            boxShadow: "3px 3px 0 0 #000"
                                        }}>
                                            <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#666", marginBottom: "0.5rem", textTransform: "uppercase" }}>Kapacita</div>
                                            <div style={{ fontSize: "1.2rem", fontWeight: "900" }}>{base.capacity} osob</div>
                                        </div>
                                    )}
                                    {base.pricing?.priceType && (
                                        <div style={{
                                            backgroundColor: "white",
                                            border: "3px solid #000",
                                            borderRadius: "8px",
                                            padding: "1rem",
                                            boxShadow: "3px 3px 0 0 #000"
                                        }}>
                                            <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#666", marginBottom: "0.5rem", textTransform: "uppercase" }}>Cena</div>
                                            <div style={{ fontSize: "1.2rem", fontWeight: "900" }}>
                                                {base.pricing.priceType}
                                                {base.pricing?.minimalPrice && ` • ${base.pricing.minimalPrice} Kč`}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Two Column Layout - Details */}
                            <div style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 350px), 1fr))",
                                gap: "1.5rem",
                                marginBottom: "1.5rem"
                            }}>
                                {/* Conditions */}
                                {base.conditions?.specialNotes && (
                                    <div style={{
                                        backgroundColor: "white",
                                        border: "3px solid #000",
                                        borderRadius: "8px",
                                        padding: "1.2rem",
                                        boxShadow: "3px 3px 0 0 #000"
                                    }}>
                                        <div style={{ fontSize: "0.95rem", fontWeight: "900", textTransform: "uppercase", marginBottom: "0.75rem" }}>
                                            Podmínky
                                        </div>
                                        <div style={{ fontSize: "0.95rem", lineHeight: "1.6", color: "#333" }}>
                                            {base.conditions.specialNotes.replace(/<[^>]*>/g, '')}
                                        </div>
                                    </div>
                                )}

                                {/* Contact Info */}
                                {base.contacts && base.contacts.length > 0 && (
                                    <div style={{
                                        backgroundColor: "white",
                                        border: "3px solid #000",
                                        borderRadius: "8px",
                                        padding: "1.2rem",
                                        boxShadow: "3px 3px 0 0 #000"
                                    }}>
                                        <div style={{ fontSize: "0.95rem", fontWeight: "900", textTransform: "uppercase", marginBottom: "0.75rem" }}>
                                            Kontakt
                                        </div>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                            {base.contacts[0].name && (
                                                <div style={{ fontWeight: "800", fontSize: "1.05rem" }}>
                                                    {base.contacts[0].name}
                                                    {base.contacts[0].role && <span style={{ color: "#666", fontWeight: "600" }}> ({base.contacts[0].role})</span>}
                                                </div>
                                            )}
                                            {base.contacts[0].email && (
                                                <a href={`mailto:${base.contacts[0].email}`} style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "0.5rem",
                                                    textDecoration: "none",
                                                    color: "#0066cc",
                                                    fontWeight: "700",
                                                    fontSize: "0.95rem"
                                                }}>
                                                    <img src="/mail-icon.svg" alt="Email" style={{ width: "18px", height: "18px" }} />
                                                    {base.contacts[0].email}
                                                </a>
                                            )}
                                            {base.contacts[0].phone && (
                                                <a href={`tel:${base.contacts[0].phone}`} style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "0.5rem",
                                                    textDecoration: "none",
                                                    color: "#0066cc",
                                                    fontWeight: "700",
                                                    fontSize: "0.95rem"
                                                }}>
                                                    <img src="/phone-icon.svg" alt="Phone" style={{ width: "18px", height: "18px" }} />
                                                    {base.contacts[0].phone}
                                                </a>
                                            )}
                                            {base.contacts[0].website && (
                                                <a href={base.contacts[0].website} target="_blank" rel="noopener noreferrer" style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "0.5rem",
                                                    textDecoration: "none",
                                                    color: "#0066cc",
                                                    fontWeight: "700",
                                                    fontSize: "0.95rem"
                                                }}>
                                                    <img src="/diagonal-arrow-icon.svg" alt="Website" style={{ width: "18px", height: "18px" }} />
                                                    Web
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Equipment - Full Width */}
                            {base.amenities?.equipment && base.amenities.equipment.length > 0 && (
                                <div style={{
                                    backgroundColor: "white",
                                    border: "3px solid #000",
                                    borderRadius: "8px",
                                    padding: "1.2rem",
                                    marginBottom: "1.5rem",
                                    boxShadow: "3px 3px 0 0 #000"
                                }}>
                                    <div style={{ fontSize: "0.95rem", fontWeight: "900", textTransform: "uppercase", marginBottom: "0.75rem" }}>
                                        Vybavení
                                    </div>
                                    <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                                        {base.amenities.equipment.map((item, idx) => (
                                            <span key={idx} style={{
                                                backgroundColor: "#dbeafe",
                                                border: "2px solid #000",
                                                borderRadius: "6px",
                                                padding: "0.5rem 1rem",
                                                fontSize: "0.9rem",
                                                fontWeight: "700",
                                                boxShadow: "2px 2px 0 0 #000"
                                            }}>
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Action Links */}
                            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                                {base.coordinates && (
                                    <>
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${base.coordinates.lat},${base.coordinates.lng}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                padding: "0.75rem 1.5rem",
                                                backgroundColor: "#86efac",
                                                border: "3px solid #000",
                                                borderRadius: "8px",
                                                fontWeight: "900",
                                                textDecoration: "none",
                                                color: "#000",
                                                boxShadow: "4px 4px 0 0 #000",
                                                fontSize: "1rem",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "0.5rem",
                                                cursor: "pointer",
                                                textTransform: "uppercase"
                                            }}
                                        >
                                            <img src="/place-icon.svg" alt="" style={{ width: "20px", height: "20px" }} />
                                            Zobrazit na mapě
                                        </a>
                                        <a
                                            href={`https://zakladny.skaut.cz/${base.slug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                padding: "0.75rem 1.5rem",
                                                backgroundColor: "white",
                                                border: "3px solid #000",
                                                borderRadius: "8px",
                                                fontWeight: "900",
                                                textDecoration: "none",
                                                color: "#000",
                                                boxShadow: "4px 4px 0 0 #000",
                                                fontSize: "1rem",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "0.5rem",
                                                cursor: "pointer",
                                                textTransform: "uppercase"
                                            }}
                                        >
                                            <img src="/info-icon.svg" alt="" style={{ width: "20px", height: "20px" }} />
                                            Celý detail
                                        </a>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            backgroundColor: "#fff3cd",
                            border: "3px solid #000",
                            borderRadius: "12px",
                            padding: "2rem",
                            boxShadow: "6px 6px 0 0 #000",
                            textAlign: "center",
                            marginBottom: "2rem"
                        }}>
                            <h3 style={{ fontSize: "1.3rem", fontWeight: "900", marginBottom: "0.5rem" }}>Žádná základna přiřazena</h3>
                            <p style={{ color: "#666", marginBottom: 0 }}>Přiřaďte základnu v aplikaci Hledač základen nebo v sekci s údaji o výpravě.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Tab Content - DOPRAVA */}
            {activeTab === ('legacy-doprava' as TabType) && (
                <div className={workspaceStyles.sectionCanvas}>
                    <TransportTab tripId={tripId} trip={trip} />
                </div>
            )}

            {/* Tab Content - FINANCE */}
            {activeTab === ('legacy-finance' as TabType) && (
                <div className={workspaceStyles.sectionCanvas}>
                    <FinanceTab tripId={tripId} />
                </div>
            )}

            {/* Tab Content - ÚČASTNÍCI */}
            {activeTab === ('legacy-ucastnici' as TabType) && (
                <div className={workspaceStyles.sectionCanvas}>
                    <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem", fontWeight: "900" }}>Účastníci ({validParticipants.length})</h2>

                    <div style={{
                        overflowX: "auto",
                        border: "3px solid #000",
                        borderRadius: "12px",
                        boxShadow: "6px 6px 0 0 #000",
                        backgroundColor: "white",
                        WebkitOverflowScrolling: "touch"
                    }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
                            <thead style={{ backgroundColor: "#86efac", borderBottom: "3px solid #000" }}>
                                <tr>
                                    <th style={thStyle}>Skaut</th>
                                    <th style={thStyle}>Stav</th>
                                    <th style={thStyle}>Odkaz na Přihlášku</th>
                                    {trip.customFields && trip.customFields.length > 0 && (
                                        <th style={thStyle}>Odpovědi</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {validParticipants.map((p, index) => (
                                    <tr key={p._id} style={{ borderBottom: index === validParticipants.length - 1 ? "none" : "2px solid #000" }}>
                                        <td style={{ ...tdStyle, borderRight: "3px solid #000" }}>
                                            <div style={{ fontWeight: "800", fontSize: "1rem" }}>{p.member?.name}</div>
                                            <div style={{ fontSize: "0.85rem", color: "#666", fontWeight: "600" }}>
                                                Kontakt: {normalizeMemberContactFields(p.member)?.guardianPhone || "Bez telefonu"}
                                            </div>
                                        </td>
                                        <td style={{ ...tdStyle, borderRight: "3px solid #000" }}>
                                            <span style={{
                                                padding: "0.25rem 0.75rem",
                                                borderRadius: "99px",
                                                fontSize: "0.85rem",
                                                border: "2px solid #000",
                                                backgroundColor: p.status === "attending" ? "#86efac" : p.status === "not_attending" ? "#fca5a5" : "#fff",
                                                color: "black",
                                                fontWeight: "700",
                                                boxShadow: "2px 2px 0 0 #000"
                                            }}>
                                                {p.status === "pending" ? "Bez reakce" : p.status === "attending" ? "Jede" : "Nejede"}
                                            </span>
                                            {p.status === "not_attending" && p.lateCancellation && (
                                                <span style={{
                                                    marginLeft: "0.5rem",
                                                    padding: "0.2rem 0.6rem",
                                                    borderRadius: "6px",
                                                    fontSize: "0.75rem",
                                                    border: "2px solid #dc2626",
                                                    color: "#991b1b",
                                                    fontWeight: "700",
                                                    backgroundColor: "#fee2e2"
                                                }}>
                                                    Po lhute
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ ...tdStyle, borderRight: "3px solid #000" }}>
                                            <button
                                                onClick={() => copyLink(p.accessKey)}
                                                style={{
                                                    fontSize: "0.85rem",
                                                    padding: "0.25rem 0.5rem",
                                                    border: "2px solid #000",
                                                    borderRadius: "4px",
                                                    cursor: "pointer",
                                                    backgroundColor: "white",
                                                    fontWeight: "600",
                                                    boxShadow: "2px 2px 0 0 #000",
                                                    transition: "transform 0.1s",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "0.5rem"
                                                }}
                                                onMouseDown={e => e.currentTarget.style.transform = "translate(1px, 1px)"}
                                                onMouseUp={e => e.currentTarget.style.transform = "translate(0, 0)"}
                                            >
                                                {copiedKey === p.accessKey ? "✅ Zkopírováno!" : (
                                                    <>
                                                        <img src="/Link-icon.svg" alt="link" style={{ width: "16px", height: "16px" }} />
                                                        Zkopírovat
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                        {trip.customFields && trip.customFields.length > 0 && (
                                            <td style={{ ...tdStyle, borderRight: "3px solid #000" }}>
                                                {(() => {
                                                    const parsed = getParsedResponses(p.responses);
                                                    const hasData = Object.keys(parsed).length > 0;

                                                    return hasData ? (
                                                        <button
                                                            onClick={() => setViewResponse({ name: p.member?.name, responses: parsed })}
                                                            style={{
                                                                padding: "0.25rem 0.75rem",
                                                                border: "2px solid #000",
                                                                borderRadius: "6px",
                                                                backgroundColor: "#e5e7eb",
                                                                fontWeight: "600",
                                                                cursor: "pointer",
                                                                fontSize: "0.85rem",
                                                                boxShadow: "2px 2px 0 0 #000"
                                                            }}
                                                        >
                                                            Zobrazit
                                                        </button>
                                                    ) : (
                                                        <span style={{ color: "#9ca3af", fontStyle: "italic" }}>-</span>
                                                    );
                                                })()}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tab Content - dokumentace */}
            {activeTab === ('legacy-dokumentace' as TabType) && (
                <div className={workspaceStyles.sectionCanvas} style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                    {/* Documentation Banner */}
                    <div style={{
                        backgroundColor: "#FFF9E6",
                        border: "3px solid #000",
                        borderRadius: "16px",
                        padding: "2.5rem",
                        boxShadow: "8px 8px 0 0 #000",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "2rem",
                        flexWrap: "wrap"
                    }}>
                        <div style={{ flex: "1 1 300px" }}>
                            <h2 style={{ fontSize: "2rem", fontWeight: "900", margin: "0 0 1rem 0", textTransform: "uppercase" }}>
                                Dokumentace výpravy
                            </h2>
                            <p style={{ margin: 0, fontSize: "1.1rem", color: "#666", lineHeight: 1.5 }}>
                                Sjednocené místo pro veškeré přípravy, dokumenty a podklady k této výpravě.
                            </p>
                        </div>
                        
                        <button
                            onClick={handleOpenTripDocs}
                            style={{
                                padding: "1.25rem 2.5rem",
                                backgroundColor: "#fcd34d",
                                border: "4px solid #000",
                                borderRadius: "12px",
                                fontWeight: "900",
                                cursor: "pointer",
                                boxShadow: "6px 6px 0 0 #000",
                                fontSize: "1.25rem",
                                transition: "all 0.1s"
                            }}
                            onMouseDown={e => e.currentTarget.style.transform = "translate(2px, 2px)"}
                            onMouseUp={e => e.currentTarget.style.transform = "translate(0, 0)"}
                        >
                            {tripDocs?.find(m => m.category === "documentation") ? "OTEVŘÍT DOKUMENTACI" : "VYTVOŘIT DOKUMENTACI"}
                        </button>
                    </div>

                    {/* Integrated Councils Section */}
                    <div style={{
                        backgroundColor: "white",
                        border: "3px solid #000",
                        borderRadius: "16px",
                        padding: "2rem",
                        boxShadow: "6px 6px 0 0 #000"
                    }}>
                        <h3 style={{ fontSize: "1.4rem", fontWeight: "900", margin: "0 0 1.5rem 0", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <img
                                src="/notepad.png"
                                alt=""
                                style={{ width: "1.8rem", height: "1.8rem", objectFit: "contain", display: "block" }}
                            />
                            <span>Připojené zápisy z rad</span>
                        </h3>
                        
                        {tripDocs === undefined ? (
                            <div>Načítám...</div>
                        ) : (() => {
                            const councils = tripDocs.filter(m => m.category === "notebook");
                            return councils.length === 0 ? (
                                <div style={{ padding: "2rem", textAlign: "center", border: "2px dashed #ccc", borderRadius: "12px", color: "#999", fontStyle: "italic" }}>
                                    K této výpravě zatím není připojena žádná rada.
                                </div>
                            ) : (
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
                                    {councils.map(council => (
                                        <div
                                            key={council._id}
                                            onClick={() => router.push(`/rady/${council._id}`)}
                                            style={{
                                                backgroundColor: "#f9fafb",
                                                border: "3px solid #000",
                                                borderRadius: "12px",
                                                padding: "1.5rem",
                                                boxShadow: "4px 4px 0 0 #000",
                                                cursor: "pointer",
                                                transition: "all 0.1s"
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.transform = "translate(-2px, -2px)";
                                                e.currentTarget.style.boxShadow = "6px 6px 0 0 #000";
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.transform = "translate(0, 0)";
                                                e.currentTarget.style.boxShadow = "4px 4px 0 0 #000";
                                            }}
                                        >
                                            <h4 style={{ margin: "0 0 0.5rem 0", fontWeight: "900", fontSize: "1.1rem" }}>{council.title}</h4>
                                            <p style={{ margin: 0, fontSize: "0.85rem", color: "#666" }}>{council.description || "Administrativní zápisník"}</p>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                        
                        <div style={{ marginTop: "1.5rem", padding: "1rem", backgroundColor: "#f0fdf4", border: "2px solid #bbf7d0", borderRadius: "8px", fontSize: "0.9rem", color: "#166534" }}>
                            <strong>O integraci:</strong> Rady jsou administrativní zápisníky připojené k výpravě pro kontext. Dokumentace výpravy je sjednocený pracovní dokument.
                        </div>
                    </div>
                </div>
            )}

            {/* Tab Content - emaily */}
            {activeTab === ('legacy-emaily' as TabType) && (
                <div className={workspaceStyles.sectionCanvas}>
                    <EmailDraftsTab
                        tripId={tripId}
                        isLeader={
                            dashboard && troop
                                ? (() => {
                                    const leaders = dashboard.leaders || [];
                                    const user = dashboard.currentUser;
                                    return leaders.some((l: any) => l?._id === user?._id && (l.role === "owner" || l.role === "main_leader"));
                                })()
                                : false
                        }
                    />
                </div>
            )}

            </main>


            {/* Responses Modal */}
            {viewResponse && (
                <div style={{
                    position: "fixed",
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    zIndex: 2000,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }} onClick={() => setViewResponse(null)}>
                    <div style={{
                        backgroundColor: "white",
                        padding: "2rem",
                        border: "3px solid #000",
                        borderRadius: "16px",
                        boxShadow: "8px 8px 0 0 #000",
                        width: "100%",
                        maxWidth: "500px",
                        maxHeight: "80vh",
                        overflowY: "auto"
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                            <h2 style={{ fontSize: "1.5rem", fontWeight: "900", margin: 0 }}>
                                Odpovědi: {viewResponse.name}
                            </h2>
                            <button onClick={() => setViewResponse(null)} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer" }}>×</button>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            {trip.customFields && Array.isArray(trip.customFields) ? (
                                trip.customFields.map((field: any, i: number) => {
                                    const val = viewResponse.responses[field.label];
                                    return (
                                        <div key={i} style={{ borderBottom: "1px solid #eee", paddingBottom: "0.5rem" }}>
                                            <div style={{ fontWeight: "800", fontSize: "0.9rem", color: "#666", marginBottom: "0.25rem" }}>
                                                {field.label}
                                            </div>
                                            <div style={{ fontSize: "1.1rem", fontWeight: "600" }}>
                                                {val !== undefined && val !== null && val !== "" ? String(val) : "-"}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div style={{ color: "#666", fontStyle: "italic" }}>Žádné otázky nebyly definovány.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const thStyle = { padding: "1rem", fontWeight: "900", fontSize: "1rem", textAlign: "left" as const, borderRight: "3px solid #000" };
const tdStyle = { padding: "1rem" };
