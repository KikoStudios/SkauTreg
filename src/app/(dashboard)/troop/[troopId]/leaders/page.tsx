"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Button from "../../../../../components/Button";
import Select from "../../../../../components/Select";
import { useFeedback } from "../../../../../context/FeedbackContext";

const ROLES = [
    { value: "main_leader", label: "HL. Vedoucí" },
    { value: "leader", label: "Vedoucí" },
    { value: "rover", label: "Rover" },
];

const RoleBadge = ({ role }: { role: string }) => {
    let imgSrc = "";
    switch (role) {
        case "owner": imgSrc = "/bages/owner-bage.svg"; break;
        case "main_leader": imgSrc = "/bages/main-vedouci-bage.svg"; break;
        case "leader": imgSrc = "/bages/vedouci-bage.svg"; break;
        case "rover": imgSrc = "/bages/rover-bage.svg"; break;
        default: imgSrc = "/bages/rover-bage.svg"; // Fallback
    }

    return (
        <img
            src={imgSrc}
            alt={role}
            style={{
                height: "28px",
                objectFit: "contain",
                verticalAlign: "middle"
            }}
        />
    );
};

export default function TroopLeadersPage() {
    const params = useParams();
    const router = useRouter();
    const troopId = params.troopId as Id<"troops">;
    const { showError, showSuccess } = useFeedback();

    const leaders = useQuery(api.troops.getLeaders, { troopId });
    const addLeader = useMutation(api.troops.addLeader);
    const removeLeader = useMutation(api.troops.removeLeader);
    const updateRole = useMutation(api.troops.updateRole);

    const [email, setEmail] = useState("");
    const [selectedRole, setSelectedRole] = useState("rover");
    const [isAdding, setIsAdding] = useState(false);

    // Permissions check (client side for UI only)
    const currentUser = leaders?.find(l => l.email === "MY_EMAIL???");
    // We don't easily know current user ID here without another query, 
    // but the backend validates everything.
    // For now, we show buttons to everyone, and they will fail if unauthorized.
    // Or we could fetch current user.

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAdding(true);
        try {
            await addLeader({ troopId, email, role: selectedRole });
            setEmail("");
            showSuccess({
                title: "✅ Úspěch",
                message: "Vedoucí byl přidán do týmu!",
                duration: 3000,
            });
        } catch (error: any) {
            console.error(error);
            const errorMsg = error?.message || "Nepodařilo se přidat vedoucího";
            
            let userMessage = "";
            let isUserError = false;
            
            if (errorMsg.includes("nebyl nalezen")) {
                userMessage = "👤 Uživatel nebyl nalezen. Vytvořte si účet na skautREG nebo zkuste jiný e-mail.";
                isUserError = true;
            } else if (errorMsg.includes("už v týmu")) {
                userMessage = "⚠️ Uživatel je již v týmu vedení.";
                isUserError = true;
            } else if (errorMsg.includes("oprávnění")) {
                userMessage = "🔐 Pouze majitel nebo hlavní vedoucí může přidávat členy do vedení.";
                isUserError = true;
            } else {
                userMessage = errorMsg;
            }

            showError({
                title: "❌ Chyba",
                message: userMessage,
                icon: "error",
                canReport: !isUserError,
                details: error?.message,
            });
        } finally {
            setIsAdding(false);
        }
    };

    const handleRemove = async (userId: Id<"users">) => {
        showError({
            title: "⚠️ Potvrzení",
            message: "Opravdu chcete odebrat tohoto člena z vedení?",
            icon: "warning",
            buttons: [
                {
                    label: "Ano, odebrat",
                    onClick: async () => {
                        try {
                            await removeLeader({ troopId, userId });
                            showSuccess({
                                title: "✅ Úspěch",
                                message: "Člen byl odstraněn z vedení.",
                                duration: 2000,
                            });
                        } catch (error: any) {
                            showError({
                                title: "❌ Chyba",
                                message: error?.message || "Nepodařilo se odebrat člena.",
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

    const handleRoleChange = async (userId: Id<"users">, newRole: string) => {
        try {
            await updateRole({ troopId, userId, newRole });
            showSuccess({
                title: "✅ Role změněna",
                message: "Role byla úspěšně aktualizována.",
                duration: 2000,
            });
        } catch (error: any) {
            showError({
                title: "❌ Chyba",
                message: error?.message || "Nepodařilo se změnit roli.",
                icon: "error",
                canReport: true,
            });
        }
    }

    if (leaders === undefined) return <div>Načítám vedení...</div>;

    return (
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
            <div className="u-flex u-justify-between u-items-center u-mb-4">
                <h1 className="u-text-lg u-font-bold">Vedení Oddílu & Role</h1>
                <Button variant="outline" onClick={() => router.push(`/troop/${troopId}`)}>Zpět na Dashboard</Button>
            </div>

            <div style={{ height: 'var(--border-width)', backgroundColor: 'var(--border-color)', margin: '0 -2rem 2rem -2rem' }} />

            <div style={{ display: "flex", flexWrap: "wrap", gap: "2rem" }}>
                {/* List */}
                <div style={{ flex: "2 1 400px", minWidth: "300px", backgroundColor: "white", padding: "1.5rem", borderRadius: "8px", border: "var(--border-width) solid var(--border-color)" }}>
                    <h2 className="u-font-bold u-mb-4" style={{ fontSize: "1.1rem" }}>Aktuální Tým ({leaders.length})</h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {leaders.map((leader: any) => (
                            <div key={leader._id} style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                paddingBottom: "0.75rem",
                                borderBottom: "1px solid #eee",
                                gap: "1rem"
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.25rem" }}>
                                        <span style={{ fontWeight: "900", fontSize: "1.5rem", color: "#000" }}>
                                            {leader.name || "Uživatel"}
                                        </span>
                                        <RoleBadge role={leader.role} />
                                    </div>
                                    <div style={{ fontSize: "0.9rem", color: "#52525b", fontWeight: "500" }}>{leader.email}</div>
                                </div>

                                {/* Allow editing for everyone, but careful with Owner deletion */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <select
                                        value={leader.role === 'owner' ? "" : leader.role}
                                        onChange={(e) => {
                                            const newRole = e.target.value;
                                            if (newRole === "") return; // Don't allow empty seleciton for now

                                            // If currently 'owner' (implicit), we need to ADD them to leaders table to set explicit role
                                            if (leader.role === 'owner') {
                                                addLeader({ troopId, email: leader.email!, role: newRole })
                                                    .then(() => alert("Role nastavena!"))
                                                    .catch(err => alert("Chyba: " + err.message));
                                            } else {
                                                handleRoleChange(leader._id, newRole);
                                            }
                                        }}
                                        style={{ padding: "0.25rem", borderRadius: "4px", border: "1px solid #ddd", fontSize: "0.85rem" }}
                                    >
                                        {/* If they are owner, show 'Majitel' as default option effectively */}
                                        {leader.role === 'owner' && <option value="" disabled>Vybrat roli...</option>}
                                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                    </select>

                                    {/* Show delete button unless it's the base 'owner' role (nothing to delete) */}
                                    {leader.role !== 'owner' && (
                                        <button
                                            onClick={() => handleRemove(leader._id)}
                                            style={{ color: "#991b1b", background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", lineHeight: 1 }}
                                            title="Odebrat / Resetovat roli"
                                        >
                                            &times;
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Invite Form */}
                <div style={{ flex: "1 1 300px", minWidth: "300px", backgroundColor: "white", padding: "1.5rem", borderRadius: "8px", border: "var(--border-width) solid var(--border-color)", height: "fit-content" }}>
                    <h2 className="u-font-bold u-mb-4" style={{ fontSize: "1.1rem" }}>Přidat Člena</h2>
                    <p style={{ fontSize: "0.9rem", marginBottom: "1rem", color: "#666" }}>
                        Pozvěte další uživatele do vedení a přidělte jim roli.
                    </p>
                    <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "0.25rem" }}>E-mail</label>
                            <input
                                type="email"
                                required
                                placeholder="jan.novak@email.cz"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                style={{ width: "100%", padding: "0.75rem", border: "1px solid #ddd", borderRadius: "4px" }}
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "0.25rem" }}>Role</label>
                            <Select
                                value={selectedRole}
                                onChange={setSelectedRole}
                                options={ROLES}
                            />
                        </div>

                        <Button type="submit" disabled={isAdding}>
                            {isAdding ? "Přidávám..." : "Přidat do týmu"}
                        </Button>
                    </form>

                    <div style={{ marginTop: "2rem", fontSize: "0.8rem", color: "#666", lineHeight: 1.4 }}>
                        <strong>Vysvětlení rolí:</strong>
                        <ul style={{ paddingLeft: "1.2rem", marginTop: "0.5rem" }}>
                            <li><strong>HL. Vedoucí:</strong> Má stejná práva jako majitel (správa týmu).</li>
                            <li><strong>Vedoucí / Rover:</strong> Mohou vidět a spravovat členy a výpravy.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
