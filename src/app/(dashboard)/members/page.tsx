"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import { Id } from "../../../../convex/_generated/dataModel";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

const SpinningLogo = ({ src, alt = "Logo" }: { src?: string; alt?: string }) => (
    <div style={{
        width: "50px",
        height: "50px",
        borderRadius: "50%",
        border: "2px solid #000",
        backgroundColor: "#ccc",
        boxShadow: "2px 2px 0 0 #000",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    }}>
        {src ? (
            <img src={src} alt={alt} style={{ width: "100%", height: "100%", objectFit: "cover", animation: "spin 10s linear infinite" }} />
        ) : (
            <span style={{ fontSize: "0.6rem", fontWeight: "bold" }}>LOGO</span>
        )}
        <style jsx>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
);

export default function MembersPage() {
    const troops = useQuery(api.troops.getByUser);
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const troopIdParam = searchParams.get("troopId");

    const [selectedTroopId, setSelectedTroopId] = useState<Id<"troops"> | null>(
        troopIdParam ? (troopIdParam as Id<"troops">) : null
    );

    // Update URL when troop is selected
    const handleTroopChange = (newTroopId: string) => {
        setSelectedTroopId(newTroopId as Id<"troops">);
        const params = new URLSearchParams(searchParams);
        params.set("troopId", newTroopId);
        router.replace(`${pathname}?${params.toString()}`);
    };

    // Auto-select first troop if loading finishes and none selected
    if (troops && troops.length > 0 && !selectedTroopId) {
        setSelectedTroopId(troops[0]._id);
    }

    // Get currently selected troop details
    const selectedTroop = troops?.find(t => t._id === selectedTroopId);

    const members = useQuery(api.members.list, selectedTroopId ? { troopId: selectedTroopId } : "skip");
    const createMember = useMutation(api.members.create);
    const updateMember = useMutation(api.members.update);
    const removeMember = useMutation(api.members.remove);

    const [isSaving, setIsSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [editingMemberId, setEditingMemberId] = useState<Id<"members"> | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        nickname: "",
        birthDate: "",
        parentName: "",
        parentPhone: "",
        email: ""
    });

    const openAddModal = () => {
        setEditingMemberId(null);
        setFormData({
            name: "",
            nickname: "",
            birthDate: "",
            parentName: "",
            parentPhone: "",
            email: ""
        });
        setShowModal(true);
    };

    const openEditModal = (member: any) => {
        setEditingMemberId(member._id);
        setFormData({
            name: member.name,
            nickname: member.nickname || "",
            birthDate: member.birthDate || "",
            parentName: member.parentName,
            parentPhone: member.parentPhone,
            email: member.email || ""
        });
        setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTroopId) return;

        setIsSaving(true);
        try {
            if (editingMemberId) {
                await updateMember({
                    id: editingMemberId,
                    ...formData
                });
            } else {
                await createMember({
                    troopId: selectedTroopId,
                    ...formData
                });
            }
            setShowModal(false);
        } catch (error) {
            console.error("Failed to save member:", error);
            alert("Nepodařilo se uložit člena.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!editingMemberId || !confirm("Opravdu chcete smazat tohoto člena?")) return;

        setIsSaving(true);
        try {
            await removeMember({ id: editingMemberId });
            setShowModal(false);
        } catch (error) {
            console.error("Failed to delete member:", error);
            alert("Nepodařilo se smazat člena.");
        } finally {
            setIsSaving(false);
        }
    };

    if (troops === undefined) return <div>Načítám...</div>;

    if (troops.length === 0) {
        return (
            <div style={{ textAlign: "center", padding: "2rem" }}>
                <p>Nejdříve si musíte vytvořit oddíl.</p>
                <a href="/troop" style={{ color: "blue", textDecoration: "underline" }}>Přejít na Můj Oddíl</a>
            </div>
        );
    }

    // Filter members
    const filteredMembers = members?.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.nickname && m.nickname.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div style={{ width: "100%", position: "relative" }}>
            {/* Top Title Bar */}
            <div style={{
                backgroundColor: "white",
                borderBottom: "3px solid #000",
                padding: "1rem 2rem",
                margin: "0 -2rem 2rem -2rem", // Break out to full width
                width: "calc(100% + 4rem)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
            }}>
                <h1 style={{ fontSize: "1.5rem", fontWeight: "900", margin: 0 }}>Členové</h1>
            </div>

            {/* Controls Row */}
            <div className="controls-row">
                <div className="troop-selector-container">
                    {/* Troop Selector Pill */}
                    {troops.length > 0 && (
                        <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
                            <select
                                value={selectedTroopId || ""}
                                onChange={(e) => handleTroopChange(e.target.value)}
                                className="troop-select"
                            >
                                {troops.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                            </select>
                            {/* Custom Arrow */}
                            <span className="custom-arrow">▼</span>
                        </div>
                    )}

                    {/* Overlapping Spinning Logo */}
                    {selectedTroop && (
                        <div className="spinning-logo-container">
                            <SpinningLogo src={selectedTroop.logo} />
                        </div>
                    )}
                </div>

                {/* Search Bar */}
                <div className="search-container">
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>

                {/* ADD Button */}
                <button
                    onClick={openAddModal}
                    className="add-button"
                    onMouseDown={e => e.currentTarget.style.transform = "translate(2px, 2px)"}
                    onMouseUp={e => e.currentTarget.style.transform = "translate(0, 0)"}
                >
                    <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>+</span> ADD
                </button>
            </div>

            <style jsx>{`
                .controls-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                    flex-wrap: wrap;
                    gap: 1rem;
                }
                .troop-selector-container {
                    display: flex;
                    align-items: center;
                    position: relative;
                }
                .troop-select {
                    padding: 0.75rem 3rem 0.75rem 1.5rem;
                    border-radius: 999px;
                    border: 3px solid #000;
                    box-shadow: 4px 4px 0 0 #000;
                    font-weight: 900;
                    font-size: 1.5rem;
                    appearance: none;
                    background-color: white;
                    cursor: pointer;
                    line-height: 1;
                    padding-right: 60px;
                    max-width: 100%;
                }
                .custom-arrow {
                    position: absolute;
                    right: 15px;
                    top: 55%;
                    transform: translateY(-50%);
                    pointer-events: none;
                    font-weight: bold;
                }
                .spinning-logo-container {
                    margin-left: -25px;
                    z-index: 2;
                }
                .search-container {
                    flex: 1;
                    max-width: 500px;
                    min-width: 300px;
                    margin: 0 1rem;
                }
                .search-input {
                    width: 100%;
                    padding: 0.75rem 1.5rem;
                    border-radius: 999px;
                    border: 3px solid #000;
                    box-shadow: 4px 4px 0 0 #000;
                    font-size: 1.2rem;
                    outline: none;
                    font-weight: 500;
                }
                .add-button {
                    padding: 0.75rem 2rem;
                    border-radius: 999px;
                    background-color: white;
                    border: 3px solid #000;
                    box-shadow: 4px 4px 0 0 #000;
                    font-size: 1.2rem;
                    font-weight: 900;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    white-space: nowrap;
                    transition: transform 0.1s;
                }

                @media (max-width: 768px) {
                    .controls-row {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 1.5rem;
                    }
                    .troop-selector-container {
                        width: 100%;
                        justify-content: space-between; /* Spread select and logo if needed, or keep overlapping */
                    }
                    .troop-select {
                        width: 100%;
                        font-size: 1.2rem;
                        padding-right: 40px;
                    }
                    .search-container {
                        margin: 0;
                        width: 100%;
                        max-width: none;
                    }
                    .add-button {
                        width: 100%;
                        justify-content: center;
                    }
                }
            `}</style>

            {/* Members Table */}
            <div style={{
                border: "3px solid #000",
                borderRadius: "16px",
                boxShadow: "8px 8px 0 0 #000",
                overflow: "hidden",
                backgroundColor: "white"
            }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    {/* Green Accented Header */}
                    <thead style={{ backgroundColor: "#86efac", borderBottom: "3px solid #000" }}>
                        <tr>
                            <th style={{ padding: "1rem", textAlign: "left", fontWeight: "900", borderRight: "3px solid #000", fontSize: "1.1rem" }}>Jméno</th>
                            <th style={{ padding: "1rem", textAlign: "left", fontWeight: "900", borderRight: "3px solid #000", fontSize: "1.1rem" }}>Přezdívka</th>
                            <th style={{ padding: "1rem", textAlign: "left", fontWeight: "900", borderRight: "3px solid #000", fontSize: "1.1rem" }}>Rok Narození</th>
                            <th style={{ padding: "1rem", textAlign: "left", fontWeight: "900", borderRight: "3px solid #000", fontSize: "1.1rem" }}>Rodič</th>
                            <th style={{ padding: "1rem", textAlign: "left", fontWeight: "900", borderRight: "3px solid #000", fontSize: "1.1rem" }}>Telefon</th>
                            <th style={{ padding: "1rem", textAlign: "left", fontWeight: "900", fontSize: "1.1rem" }}>Email</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!members ? (
                            <tr><td colSpan={6} style={{ padding: "2rem", textAlign: "center" }}>Načítám seznam...</td></tr>
                        ) : filteredMembers?.length === 0 ? (
                            <tr><td colSpan={6} style={{ padding: "2rem", textAlign: "center", fontStyle: "italic" }}>Žádní členové nalezeni.</td></tr>
                        ) : (
                            filteredMembers?.map((member, index) => (
                                <tr
                                    key={member._id}
                                    onClick={() => openEditModal(member)}
                                    style={{
                                        borderBottom: index === filteredMembers.length - 1 ? "none" : "2px solid #000",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f0fdf4"}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                >
                                    <td style={{ padding: "1rem", borderRight: "3px solid #000", fontWeight: "800" }}>{member.name}</td>
                                    <td style={{ padding: "1rem", borderRight: "3px solid #000" }}>{member.nickname || "-"}</td>
                                    <td style={{ padding: "1rem", borderRight: "3px solid #000" }}>{member.birthDate || "-"}</td>
                                    <td style={{ padding: "1rem", borderRight: "3px solid #000" }}>{member.parentName}</td>
                                    <td style={{ padding: "1rem", borderRight: "3px solid #000" }}>{member.parentPhone}</td>
                                    <td style={{ padding: "1rem" }}>
                                        {member.email ? (
                                            <a href={`mailto:${member.email}`} style={{ color: "blue", textDecoration: "underline" }} onClick={e => e.stopPropagation()}>
                                                {member.email}
                                            </a>
                                        ) : "-"}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Member Modal */}
            {showModal && (
                <div style={{
                    position: "fixed",
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    zIndex: 2000,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }} onClick={() => setShowModal(false)}>
                    <div style={{
                        backgroundColor: "white",
                        padding: "2rem",
                        border: "3px solid #000",
                        borderRadius: "16px",
                        boxShadow: "8px 8px 0 0 #000",
                        width: "100%",
                        maxWidth: "500px",
                        maxHeight: "90vh",
                        overflowY: "auto"
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                            <h2 style={{ fontSize: "1.5rem", fontWeight: "900", margin: 0 }}>
                                {editingMemberId ? "Upravit Člena" : "Přidat Člena"}
                            </h2>
                            {editingMemberId && (
                                <button
                                    onClick={handleDelete}
                                    style={{
                                        backgroundColor: "#fca5a5",
                                        border: "2px solid #000",
                                        borderRadius: "6px",
                                        padding: "0.25rem 0.75rem",
                                        fontWeight: "bold",
                                        cursor: "pointer",
                                        boxShadow: "2px 2px 0 0 #000"
                                    }}
                                >
                                    Smazat
                                </button>
                            )}
                        </div>

                        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <div>
                                <label style={{ display: "block", fontWeight: "800", marginBottom: "0.25rem" }}>Celé Jméno</label>
                                <input
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    style={{ width: "100%", padding: "0.6rem", border: "2px solid #000", borderRadius: "6px", boxShadow: "4px 4px 0 0 #000", outline: "none", fontWeight: "600" }}
                                />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                <div>
                                    <label style={{ display: "block", fontWeight: "800", marginBottom: "0.25rem" }}>Přezdívka</label>
                                    <input
                                        value={formData.nickname}
                                        onChange={e => setFormData({ ...formData, nickname: e.target.value })}
                                        style={{ width: "100%", padding: "0.6rem", border: "2px solid #000", borderRadius: "6px", boxShadow: "4px 4px 0 0 #000", outline: "none", fontWeight: "600" }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontWeight: "800", marginBottom: "0.25rem" }}>Rok</label>
                                    <input
                                        value={formData.birthDate}
                                        onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                                        style={{ width: "100%", padding: "0.6rem", border: "2px solid #000", borderRadius: "6px", boxShadow: "4px 4px 0 0 #000", outline: "none", fontWeight: "600" }}
                                        placeholder="2012"
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: "block", fontWeight: "800", marginBottom: "0.25rem" }}>Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    style={{ width: "100%", padding: "0.6rem", border: "2px solid #000", borderRadius: "6px", boxShadow: "4px 4px 0 0 #000", outline: "none", fontWeight: "600" }}
                                    placeholder="email@example.com"
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontWeight: "800", marginBottom: "0.25rem" }}>Rodič</label>
                                <input
                                    required
                                    value={formData.parentName}
                                    onChange={e => setFormData({ ...formData, parentName: e.target.value })}
                                    style={{ width: "100%", padding: "0.6rem", border: "2px solid #000", borderRadius: "6px", boxShadow: "4px 4px 0 0 #000", outline: "none", fontWeight: "600" }}
                                />
                            </div>
                            <div>
                                <label style={{ display: "block", fontWeight: "800", marginBottom: "0.25rem" }}>Telefon</label>
                                <input
                                    required
                                    type="tel"
                                    value={formData.parentPhone}
                                    onChange={e => setFormData({ ...formData, parentPhone: e.target.value })}
                                    style={{ width: "100%", padding: "0.6rem", border: "2px solid #000", borderRadius: "6px", boxShadow: "4px 4px 0 0 #000", outline: "none", fontWeight: "600" }}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSaving}
                                style={{
                                    marginTop: "1rem",
                                    backgroundColor: "#86efac",
                                    color: "black",
                                    padding: "0.75rem",
                                    borderRadius: "6px",
                                    border: "2px solid #000",
                                    fontWeight: "900",
                                    boxShadow: "4px 4px 0 0 #000",
                                    cursor: "pointer",
                                    fontSize: "1.1rem"
                                }}
                            >
                                {isSaving ? "Ukládám..." : "Uložit"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
