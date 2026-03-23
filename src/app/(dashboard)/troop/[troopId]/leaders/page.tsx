"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "../../../../../components/Button";
import Select from "../../../../../components/Select";
import { useFeedback } from "../../../../../context/FeedbackContext";
import styles from "./page.module.css";

const ROLE_OPTIONS = [
    { value: "main_leader", label: "Hl. vedoucí" },
    { value: "leader", label: "Vedoucí" },
    { value: "rover", label: "Rover" },
];

const ROLE_META: Record<string, { label: string; tone: string }> = {
    owner: {
        label: "Majitel",
        tone: "roleOwner",
    },
    main_leader: {
        label: "Hl. vedoucí",
        tone: "roleMainLeader",
    },
    leader: {
        label: "Vedoucí",
        tone: "roleLeader",
    },
    rover: {
        label: "Rover",
        tone: "roleRover",
    },
};

type LeaderRecord = {
    _id: Id<"users">;
    name?: string;
    email?: string;
    image?: string;
    role: string;
    isOwner?: boolean;
    birthDate?: string;
    address?: string;
    personalEmail?: string;
    personalPhone?: string;
    contactProfileType?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactEmail?: string;
    parent1Name?: string;
    parent1Phone?: string;
    parent1Email?: string;
    parent2Name?: string;
    parent2Phone?: string;
    parent2Email?: string;
};

const getRoleMeta = (role: string) => ROLE_META[role] ?? ROLE_META.rover;

const getRoleBadgeSrc = (role: string) => {
    switch (role) {
        case "owner":
            return "/bages/owner-bage.svg";
        case "main_leader":
            return "/bages/main-vedouci-bage.svg";
        case "leader":
            return "/bages/vedouci-bage.svg";
        case "rover":
        default:
            return "/bages/rover-bage.svg";
    }
};

const getInitials = (name?: string, email?: string) => {
    if (name?.trim()) {
        const parts = name.trim().split(/\s+/).slice(0, 2);
        return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "U";
    }

    return email?.[0]?.toUpperCase() ?? "U";
};

const toErrorMessage = (error: unknown, fallback: string) => {
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
        return error.message;
    }

    return fallback;
};

function LeaderAvatar({ leader }: { leader: LeaderRecord }) {
    const initials = getInitials(leader.name, leader.email);

    if (leader.image) {
        return <img src={leader.image} alt={leader.name || leader.email || "Vedoucí"} className={styles.avatarImage} />;
    }

    return <span className={styles.avatarInitials}>{initials}</span>;
}

function RoleBadge({ role }: { role: string }) {
    const roleMeta = getRoleMeta(role);

    return (
        <img
            src={getRoleBadgeSrc(role)}
            alt={roleMeta.label}
            title={roleMeta.label}
            className={styles.roleBadge}
        />
    );
}

export default function TroopLeadersPage() {
    const params = useParams();
    const router = useRouter();
    const troopId = params.troopId as Id<"troops">;
    const { showError, showSuccess } = useFeedback();

    const troop = useQuery(api.troops.getById, { id: troopId });
    const leaders = useQuery(api.troops.getLeaders, { troopId }) as LeaderRecord[] | undefined;
    const viewer = useQuery(api.users.viewer, {});
    const addLeader = useMutation(api.troops.addLeader);
    const removeLeader = useMutation(api.troops.removeLeader);
    const updateRole = useMutation(api.troops.updateRole);

    const [email, setEmail] = useState("");
    const [selectedRole, setSelectedRole] = useState("rover");
    const [isAdding, setIsAdding] = useState(false);
    const [pendingRoleUserId, setPendingRoleUserId] = useState<Id<"users"> | null>(null);
    const [pendingRemoveUserId, setPendingRemoveUserId] = useState<Id<"users"> | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedLeaderForInfo, setSelectedLeaderForInfo] = useState<LeaderRecord | null>(null);

    const canManageLeaders = useMemo(() => {
        if (!viewer || !troop || !leaders) return false;
        if (troop.ownerId === viewer._id) return true;

        return leaders.some((leader) => leader._id === viewer._id && leader.role !== "owner");
    }, [leaders, troop, viewer]);

    const handleAdd = async (event: React.FormEvent) => {
        event.preventDefault();
        const trimmedEmail = email.trim().toLowerCase();

        if (!trimmedEmail) {
            showError({
                title: "Chybí e-mail",
                message: "Zadejte e-mail uživatele, kterého chcete přidat do vedení.",
                icon: "warning",
                canReport: false,
            });
            return;
        }

        setIsAdding(true);
        try {
            await addLeader({ troopId, email: trimmedEmail, role: selectedRole });
            setEmail("");
            setSelectedRole("rover");
            setIsAddModalOpen(false);
            showSuccess({
                title: "Vedoucí přidán",
                message: "Nový člen vedení byl úspěšně přidán do oddílu.",
                duration: 3000,
            });
        } catch (error) {
            const errorMessage = toErrorMessage(error, "Nepodařilo se přidat vedoucího.");
            const isUserError =
                errorMessage.includes("nebyl nalezen") ||
                errorMessage.includes("už v týmu") ||
                errorMessage.includes("oprávnění") ||
                errorMessage.includes("přihlásit");

            showError({
                title: "Přidání se nepovedlo",
                message: errorMessage,
                icon: "error",
                canReport: !isUserError,
                details: errorMessage,
            });
        } finally {
            setIsAdding(false);
        }
    };

    const handleRemove = async (leader: LeaderRecord) => {
        showError({
            title: "Odebrat člena vedení?",
            message: `Opravdu chcete odebrat ${leader.name || leader.email || "tohoto uživatele"} z vedení oddílu?`,
            icon: "warning",
            buttons: [
                {
                    label: "Ano, odebrat",
                    variant: "danger",
                    onClick: async () => {
                        setPendingRemoveUserId(leader._id);
                        try {
                            await removeLeader({ troopId, userId: leader._id });
                            showSuccess({
                                title: "Člen odebrán",
                                message: "Člen vedení byl úspěšně odebrán.",
                                duration: 2500,
                            });
                        } catch (error) {
                            const errorMessage = toErrorMessage(error, "Nepodařilo se odebrat člena vedení.");
                            showError({
                                title: "Odebrání se nepovedlo",
                                message: errorMessage,
                                icon: "error",
                                canReport: true,
                                details: errorMessage,
                            });
                        } finally {
                            setPendingRemoveUserId(null);
                        }
                    },
                },
                {
                    label: "Zrušit",
                    onClick: () => {},
                    variant: "secondary",
                },
            ],
        });
    };

    const handleRoleChange = async (leader: LeaderRecord, newRole: string) => {
        if (leader.role === "owner" || !newRole || newRole === leader.role) {
            return;
        }

        setPendingRoleUserId(leader._id);
        try {
            await updateRole({ troopId, userId: leader._id, newRole });
            showSuccess({
                title: "Role změněna",
                message: `${leader.name || leader.email || "Členovi"} byla nastavena role ${getRoleMeta(newRole).label.toLowerCase()}.`,
                duration: 2500,
            });
        } catch (error) {
            const errorMessage = toErrorMessage(error, "Nepodařilo se změnit roli.");
            showError({
                title: "Změna role se nepovedla",
                message: errorMessage,
                icon: "error",
                canReport: true,
                details: errorMessage,
            });
        } finally {
            setPendingRoleUserId(null);
        }
    };

    if (troop === undefined || leaders === undefined || viewer === undefined) {
        return <div className={styles.loadingState}>Načítám vedení oddílu...</div>;
    }

    if (troop === null) {
        return <div className={styles.loadingState}>Oddíl nebyl nalezen.</div>;
    }

    return (
        <div className={styles.page}>
            <div className={styles.shell}>
                <div className={styles.headerBar}>
                    <div className={styles.headerInfo}>
                        <div className={styles.headerBadge}>
                            {troop.logo ? (
                                <img src={troop.logo} alt={troop.name} className={styles.headerLogoImage} />
                            ) : (
                                <span className={styles.headerLogoFallback}>{getInitials(troop.name)}</span>
                            )}
                        </div>

                        <div className={styles.headerCopy}>
                            <div className={styles.kicker}>Vedení oddílu</div>
                            <h1 className={styles.title}>{troop.name}</h1>
                        </div>
                    </div>

                    <div className={styles.headerActions}>
                        {canManageLeaders && (
                            <button
                                type="button"
                                className={styles.plusButton}
                                onClick={() => setIsAddModalOpen(true)}
                                aria-label="Přidat člena vedení"
                            >
                                +
                            </button>
                        )}
                        <Button variant="outline" onClick={() => router.push(`/troop/${troopId}`)}>
                            Zpět na oddíl
                        </Button>
                    </div>
                </div>

                <div className={styles.contentGrid}>
                    <section className={styles.sectionCard}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>Aktuální tým</h2>
                        </div>

                        <div className={styles.listWrap}>
                            {leaders.map((leader) => {
                                const isRoleUpdating = pendingRoleUserId === leader._id;
                                const isRemoving = pendingRemoveUserId === leader._id;

                            return (
                                <article key={leader._id} className={styles.leaderRow}>
                                    <div className={styles.leaderMain}>
                                            <div className={styles.avatarWrap}>
                                                <LeaderAvatar leader={leader} />
                                            </div>

                                            <div className={styles.leaderIdentity}>
                                            <div className={styles.leaderTopRow}>
                                                <h3 className={styles.leaderName}>{leader.name || "Uživatel bez jména"}</h3>
                                                <RoleBadge role={leader.role} />
                                            </div>
                                            <div className={styles.leaderEmail}>{leader.email || "Bez e-mailu"}</div>
                                        </div>
                                        </div>

                                        <div className={styles.leaderActions}>
                                            {canManageLeaders ? (
                                                <>
                                                    {leader.role === "owner" ? (
                                                        <div className={styles.ownerState}>
                                                            <RoleBadge role={leader.role} />
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                onClick={() => setSelectedLeaderForInfo(leader)}
                                                            >
                                                                Info
                                                            </Button>
                                                            <select
                                                                className={styles.roleSelect}
                                                                value={leader.role}
                                                                onChange={(event) => handleRoleChange(leader, event.target.value)}
                                                                disabled={isRoleUpdating || isRemoving}
                                                            >
                                                                {ROLE_OPTIONS.map((roleOption) => (
                                                                    <option key={roleOption.value} value={roleOption.value}>
                                                                        {roleOption.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                onClick={() => handleRemove(leader)}
                                                                disabled={isRoleUpdating || isRemoving}
                                                            >
                                                                {isRemoving ? "Odebírám..." : "Odebrat"}
                                                            </Button>
                                                        </>
                                                    )}
                                                </>
                                            ) : (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => setSelectedLeaderForInfo(leader)}
                                                >
                                                    Info
                                                </Button>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </section>
                </div>
            </div>

            {isAddModalOpen && canManageLeaders && (
                <div className={styles.modalOverlay} onClick={() => setIsAddModalOpen(false)}>
                    <div className={styles.modalCard} onClick={(event) => event.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.sectionTitle}>Přidat člena</h2>
                            <button
                                type="button"
                                className={styles.closeButton}
                                onClick={() => setIsAddModalOpen(false)}
                                aria-label="Zavřít"
                            >
                                ×
                            </button>
                        </div>

                        <form className={styles.inviteForm} onSubmit={handleAdd}>
                            <label className={styles.controlGroup}>
                                <span className={styles.controlLabel}>E-mail uživatele</span>
                                <input
                                    className={styles.input}
                                    type="email"
                                    required
                                    placeholder="jan.novak@email.cz"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    disabled={isAdding}
                                />
                            </label>

                            <label className={styles.controlGroup}>
                                <span className={styles.controlLabel}>Role</span>
                                <Select value={selectedRole} onChange={setSelectedRole} options={ROLE_OPTIONS} />
                            </label>

                            <Button type="submit" disabled={isAdding}>
                                {isAdding ? "Přidávám do vedení..." : "Přidat do vedení"}
                            </Button>
                        </form>
                    </div>
                </div>
            )}

            {selectedLeaderForInfo && (
                <div className={styles.modalOverlay} onClick={() => setSelectedLeaderForInfo(null)}>
                    <div className={styles.modalCard} onClick={(event) => event.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <div>
                                <h2 className={styles.sectionTitle}>{selectedLeaderForInfo.name || "Detail vedoucího"}</h2>
                                <div className={styles.modalSubtitle}>{selectedLeaderForInfo.email || "Bez e-mailu"}</div>
                            </div>
                            <button
                                type="button"
                                className={styles.closeButton}
                                onClick={() => setSelectedLeaderForInfo(null)}
                                aria-label="Zavřít"
                            >
                                ×
                            </button>
                        </div>

                        <div className={styles.infoGrid}>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Datum narození</span>
                                <strong>{selectedLeaderForInfo.birthDate || "Není vyplněno"}</strong>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Adresa</span>
                                <strong>{selectedLeaderForInfo.address || "Není vyplněno"}</strong>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Osobní e-mail</span>
                                <strong>{selectedLeaderForInfo.personalEmail || selectedLeaderForInfo.email || "Není vyplněno"}</strong>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Osobní kontakt</span>
                                <strong>{selectedLeaderForInfo.personalPhone || "Není vyplněno"}</strong>
                            </div>

                            {selectedLeaderForInfo.role === "rover" ? (
                                <>
                                    <div className={styles.infoItem}>
                                        <span className={styles.infoLabel}>Rodič 1</span>
                                        <strong>{selectedLeaderForInfo.parent1Name || "Není vyplněno"}</strong>
                                        <span>{selectedLeaderForInfo.parent1Phone || selectedLeaderForInfo.parent1Email || "Bez kontaktu"}</span>
                                    </div>
                                    <div className={styles.infoItem}>
                                        <span className={styles.infoLabel}>Rodič 2</span>
                                        <strong>{selectedLeaderForInfo.parent2Name || "Není vyplněno"}</strong>
                                        <span>{selectedLeaderForInfo.parent2Phone || selectedLeaderForInfo.parent2Email || "Bez kontaktu"}</span>
                                    </div>
                                </>
                            ) : (
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Kontakt</span>
                                    <strong>{selectedLeaderForInfo.emergencyContactName || "Není vyplněno"}</strong>
                                    <span>
                                        {selectedLeaderForInfo.emergencyContactPhone ||
                                            selectedLeaderForInfo.emergencyContactEmail ||
                                            "Bez kontaktu"}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
