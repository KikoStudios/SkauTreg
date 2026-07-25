"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useEffect, useRef, useState } from "react";
import { Id } from "../../../../convex/_generated/dataModel";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useFeedback } from "@/context/FeedbackContext";
import Image from "next/image";
import Link from "next/link";

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
    const { showError, showSuccess } = useFeedback();

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

    useEffect(() => {
        if (troopIdParam) {
            setSelectedTroopId(troopIdParam as Id<"troops">);
        } else if (troops && troops.length > 0) {
            setSelectedTroopId((current) => current || troops[0]._id);
        }
    }, [troopIdParam, troops]);

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

    const [showImportModal, setShowImportModal] = useState(false);
    const [importFileName, setImportFileName] = useState<string | null>(null);
    type ImportRow = Record<string, string | boolean>;
    const [importHeaders, setImportHeaders] = useState<string[]>([]);
    const [importRows, setImportRows] = useState<ImportRow[]>([]);
    const [importMapping, setImportMapping] = useState({
        name: "",
        nickname: "",
        birthDate: "",
        guardianName: "",
        guardianPhone: "",
        guardianEmail: "",
        guardian2Name: "",
        guardian2Phone: "",
        guardian2Email: "",
        address: ""
    });
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const importFileInputRef = useRef<HTMLInputElement>(null);

    const getImportValue = (row: ImportRow, key: string) => {
        const value = row[key];
        return typeof value === "string" ? value : "";
    };

    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedMemberForDetail, setSelectedMemberForDetail] = useState<any>(null);

    useEffect(() => {
        if (searchParams.get("create") === "true") {
            openAddModal();
            return;
        }

        const requestedMemberId = searchParams.get("memberId");
        const requestedMember = members?.find((member) => member._id === requestedMemberId);
        if (requestedMember) {
            setSelectedMemberForDetail(requestedMember);
            setShowDetailModal(true);
        }
    }, [members, searchParams]);

    // Google Groups CSV Import State
    const [showGoogleGroupsCSVModal, setShowGoogleGroupsCSVModal] = useState(false);
    const [googleGroupsCSVFile, setGoogleGroupsCSVFile] = useState<File | null>(null);
    const [googleGroupsCSVMatched, setGoogleGroupsCSVMatched] = useState<Array<{ email: string; memberName: string; memberId: Id<"members">; currentEmail?: string }>>([]);
    const [googleGroupsCSVUnmatched, setGoogleGroupsCSVUnmatched] = useState<Array<{ email: string }>>([]);
    const [googleGroupsCSVEmailsToUpdate, setGoogleGroupsCSVEmailsToUpdate] = useState<Record<string, boolean>>({});
    const [googleGroupsCSVEmailFieldSelection, setGoogleGroupsCSVEmailFieldSelection] = useState<Record<string, "member" | "parent1" | "parent2">>({});
    const [googleGroupsCSVManualAssignments, setGoogleGroupsCSVManualAssignments] = useState<Record<string, Id<"members"> | "">>({});
    const [googleGroupsCSVManualFieldSelection, setGoogleGroupsCSVManualFieldSelection] = useState<Record<string, "member" | "parent1" | "parent2">>({});
    const [googleGroupsCSVError, setGoogleGroupsCSVError] = useState<string | null>(null);
    const [googleGroupsCSVLoading, setGoogleGroupsCSVLoading] = useState(false);
    const googleGroupsFileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        name: "",
        nickname: "",
        birthDate: "",
        guardianName: "",
        guardianPhone: "",
        guardianEmail: "",
        guardian2Name: "",
        guardian2Phone: "",
        guardian2Email: "",
        address: ""
    });

    const openAddModal = () => {
        setEditingMemberId(null);
        setFormData({
            name: "",
            nickname: "",
            birthDate: "",
            guardianName: "",
            guardianPhone: "",
            guardianEmail: "",
            guardian2Name: "",
            guardian2Phone: "",
            guardian2Email: "",
            address: ""
        });
        setShowModal(true);
    };

    const openEditModal = (member: any) => {
        setEditingMemberId(member._id);
        setFormData({
            name: member.name,
            nickname: member.nickname || "",
            birthDate: member.birthDate || "",
            guardianName: member.guardianName,
            guardianPhone: member.guardianPhone,
            guardianEmail: member.guardianEmail || "",
            guardian2Name: member.guardian2Name || "",
            guardian2Phone: member.guardian2Phone || "",
            guardian2Email: member.guardian2Email || "",
            address: member.address || ""
        });
        setShowModal(true);
    };

    const guessMapping = (headers: string[]) => {
        const normalized = headers.map(h => h.toLowerCase());
        const pick = (patterns: RegExp[]) => {
            const idx = normalized.findIndex(h => patterns.some(p => p.test(h)));
            return idx >= 0 ? headers[idx] : "";
        };
        return {
            name: pick([/jméno/, /name/]),
            nickname: pick([/přezdív/, /nick/]),
            birthDate: pick([/datum.*narožení/, /birth|narožení/i]),
            guardianName: pick([/zástupce|rodič.*jméno|parent.*name|guardian.*name/i]),
            guardianPhone: pick([/zástupce.*tel|rodič.*tel|parent.*phone|guardian.*phone/i, /telefon/]),
            guardianEmail: pick([/zástupce.*email|rodič.*email|parent.*email|guardian.*email/i]),
            guardian2Name: pick([/zástupce.?2|rodič.?2|parent.?2|guardian.?2/i]),
            guardian2Phone: pick([/zástupce.?2.*tel|rodič.?2.*tel|telefon.?2|phone.?2/i]),
            guardian2Email: pick([/zástupce.?2.*email|rodič.?2.*email|email.?2/i]),
            address: pick([/adresa/, /address/])
        };
    };

    // Handle Google Groups CSV Import
    const handleGoogleGroupsCSVFileChange = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const file = files[0];
        
        setGoogleGroupsCSVFile(file);
        setGoogleGroupsCSVError(null);
        setGoogleGroupsCSVLoading(true);

        try {
            const text = await file.text();
            const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
            
            if (lines.length === 0) {
                setGoogleGroupsCSVError("Soubor je prázdný.");
                setGoogleGroupsCSVLoading(false);
                return;
            }

            // Parse CSV - extract email addresses
            const emails: string[] = [];
            for (const line of lines) {
                // Split by comma and find email-like patterns
                const parts = line.split(",").map(p => p.trim());
                for (const part of parts) {
                    if (part.includes("@")) {
                        emails.push(part.toLowerCase());
                        break; // Only take first email per line
                    }
                }
            }

            if (emails.length === 0) {
                setGoogleGroupsCSVError("V souboru nebyly nalezeny žádné e-mailové adresy.");
                setGoogleGroupsCSVLoading(false);
                return;
            }

            // Match against existing members by name matching
            const matched: typeof googleGroupsCSVMatched = [];
            const unmatched: typeof googleGroupsCSVUnmatched = [];
            const updateMap: Record<string, boolean> = {};

            for (const email of emails) {
                // Try to match by guardianEmail, guardian2Email, or member name similarity
                let found = false;
                
                for (const member of members || []) {
                    // Check if email already assigned
                    if (member.guardianEmail?.toLowerCase() === email || 
                        member.guardian2Email?.toLowerCase() === email) {
                        found = true;
                        break;
                    }
                    
                    // Check if member name matches email prefix (e.g., jan.novak@gmail.com matches "Jan Novák")
                    const emailPrefix = email.split("@")[0].toLowerCase().replace(/[._-]/g, " ");
                    const memberNameNorm = member.name.toLowerCase().replace(/[._-]/g, " ");
                    const guardianNameNorm = member.guardianName?.toLowerCase().replace(/[._-]/g, " ") || "";
                    const guardian2NameNorm = member.guardian2Name?.toLowerCase().replace(/[._-]/g, " ") || "";
                    
                    if (emailPrefix.includes(memberNameNorm.split(" ")[0]) || 
                        emailPrefix.includes(memberNameNorm.split(" ").slice(-1)[0]) ||
                        (guardianNameNorm && emailPrefix.includes(guardianNameNorm.split(" ")[0])) ||
                        (guardian2NameNorm && emailPrefix.includes(guardian2NameNorm.split(" ")[0]))) {
                        
                        matched.push({
                            email,
                            memberName: member.name,
                            memberId: member._id,
                            currentEmail: member.guardianEmail || member.guardian2Email
                        });
                        updateMap[member._id] = true;
                        found = true;
                        break;
                    }
                }

                if (!found) {
                    unmatched.push({ email });
                }
            }

            setGoogleGroupsCSVMatched(matched);
            setGoogleGroupsCSVUnmatched(unmatched);
            setGoogleGroupsCSVEmailsToUpdate(updateMap);
            // Initialize field selections to parent1 by default
            const fieldSelectionMap: Record<string, "member" | "parent1" | "parent2"> = {};
            matched.forEach(m => { fieldSelectionMap[m.memberId] = "parent1"; });
            setGoogleGroupsCSVEmailFieldSelection(fieldSelectionMap);
            // Initialize manual assignments to empty
            const manualMap: Record<string, Id<"members"> | ""> = {};
            const manualFieldMap: Record<string, "member" | "parent1" | "parent2"> = {};
            unmatched.forEach(u => { 
                manualMap[u.email] = ""; 
                manualFieldMap[u.email] = "parent1";
            });
            setGoogleGroupsCSVManualAssignments(manualMap);
            setGoogleGroupsCSVManualFieldSelection(manualFieldMap);
            setShowGoogleGroupsCSVModal(true);
        } catch (error) {
            console.error("CSV parse error:", error);
            setGoogleGroupsCSVError("Nepodařilo se načíst soubor. Zkontrolujte formát.");
        } finally {
            setGoogleGroupsCSVLoading(false);
            if (googleGroupsFileInputRef.current) {
                googleGroupsFileInputRef.current.value = "";
            }
        }
    };

    const handleGoogleGroupsCSVConfirm = async () => {
        if (!selectedTroopId) return;

        setGoogleGroupsCSVLoading(true);
        setGoogleGroupsCSVError(null);

        try {
            let updatedCount = 0;
            
            // Update emails for selected auto-matched members
            for (const match of googleGroupsCSVMatched) {
                if (googleGroupsCSVEmailsToUpdate[match.memberId]) {
                    const member = members?.find(m => m._id === match.memberId);
                    if (!member) continue;
                    
                    const fieldType = googleGroupsCSVEmailFieldSelection[match.memberId] || "parent1";
                    const updateData: any = { id: match.memberId };
                    
                    if (fieldType === "member") {
                        updateData.email = match.email;
                    } else if (fieldType === "parent1") {
                        updateData.guardianEmail = match.email;
                    } else if (fieldType === "parent2") {
                        updateData.guardian2Email = match.email;
                    }
                    
                    await updateMember(updateData);
                    updatedCount++;
                }
            }

            // Update emails for manually assigned members
            for (const [email, memberId] of Object.entries(googleGroupsCSVManualAssignments)) {
                if (memberId && memberId !== "") {
                    const member = members?.find(m => m._id === memberId);
                    if (!member) continue;
                    
                    const fieldType = googleGroupsCSVManualFieldSelection[email] || "parent1";
                    const updateData: any = { id: memberId };
                    
                    if (fieldType === "member") {
                        updateData.email = email;
                    } else if (fieldType === "parent1") {
                        updateData.guardianEmail = email;
                    } else if (fieldType === "parent2") {
                        updateData.guardian2Email = email;
                    }
                    
                    await updateMember(updateData);
                    updatedCount++;
                }
            }

            const manualCount = Object.values(googleGroupsCSVManualAssignments).filter(v => v && v !== "").length;
            const totalUnassigned = googleGroupsCSVUnmatched.length - manualCount;

            showSuccess({
                title: "✅ Import uspěl",
                message: `Aktualizováno ${updatedCount} e-mailových adres.${totalUnassigned > 0 ? ` ${totalUnassigned} e-mailů zůstalo nepřiřazeno.` : ""}`,
            });

            setShowGoogleGroupsCSVModal(false);
            setGoogleGroupsCSVFile(null);
            setGoogleGroupsCSVMatched([]);
            setGoogleGroupsCSVUnmatched([]);
            setGoogleGroupsCSVEmailsToUpdate({});
            setGoogleGroupsCSVEmailFieldSelection({});
            setGoogleGroupsCSVManualAssignments({});
            setGoogleGroupsCSVManualFieldSelection({});
        } catch (error: any) {
            console.error("Google Groups CSV import failed:", error);
            showError({
                title: "❌ Chyba při importu",
                message: error?.message || "Nepodařilo se aktualizovat e-maily.",
            });
        } finally {
            setGoogleGroupsCSVLoading(false);
        }
    };

    const handleImportFileChange = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const file = files[0];
        setImportError(null);
        try {
            const isCSV = file.name.toLowerCase().endsWith('.csv');
            let rows: string[][] = [];
            
            if (isCSV) {
                // CSV: Use FileReader to properly handle UTF-8 encoding
                const text = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target?.result as string);
                    reader.onerror = () => reject(new Error("Failed to read file"));
                    reader.readAsText(file, 'UTF-8');
                });
                
                // Simple CSV parser handling quoted fields and commas within quotes
                rows = text.split('\n').map(line => {
                    if (!line.trim()) return [];
                    const fields: string[] = [];
                    let current = '';
                    let inQuotes = false;
                    
                    for (let i = 0; i < line.length; i++) {
                        const char = line[i];
                        const nextChar = line[i + 1];
                        
                        if (char === '"') {
                            if (inQuotes && nextChar === '"') {
                                current += '"';
                                i++;
                            } else {
                                inQuotes = !inQuotes;
                            }
                        } else if (char === ',' && !inQuotes) {
                            fields.push(current.trim());
                            current = '';
                        } else {
                            current += char;
                        }
                    }
                    fields.push(current.trim());
                    return fields;
                }).filter(row => row.some(cell => cell.length > 0));
            } else {
                throw new Error("Unsupported spreadsheet format");
            }

            if (!rows || rows.length === 0) {
                setImportError("Soubor je prázdný.");
                return;
            }

            const [headerRow, ...dataRows] = rows;
            const headers = headerRow.map(h => String(h || "").trim()).filter(h => h.length > 0);

            if (headers.length === 0) {
                setImportError("Nepodařilo se najít hlavičku (první řádek).");
                return;
            }

            const mappedRows: ImportRow[] = dataRows
                .map(row => {
                    const obj: Record<string, string> = {};
                    headers.forEach((h, i) => {
                        obj[h] = String(row[i] ?? "").trim();
                    });
                    return obj;
                })
                .filter(r => Object.values(r).some(v => v && v.length > 0));

            setImportFileName(file.name);
            setImportHeaders(headers);
            setImportRows(mappedRows);
            setImportMapping(guessMapping(headers));
            setShowImportModal(true);
        } catch (e) {
            console.error("Import parse failed:", e);
            setImportError("Soubor se nepodařilo načíst. Použijte bezpečný CSV export.");
        } finally {
            if (importFileInputRef.current) {
                importFileInputRef.current.value = "";
            }
        }
    };

    const handleConfirmImport = async () => {
        if (!selectedTroopId) return;
        if (!importMapping.name || !importMapping.guardianName || !importMapping.guardianPhone) {
            setImportError("Vyberte sloupce pro Jméno, Zástupce a Telefon.");
            return;
        }

        setIsImporting(true);
        setImportError(null);
        try {
            const rowsToImport = importRows.map((row) => ({
                name: getImportValue(row, importMapping.name),
                nickname: importMapping.nickname ? getImportValue(row, importMapping.nickname) : "",
                birthDate: importMapping.birthDate ? getImportValue(row, importMapping.birthDate) : "",
                guardianName: getImportValue(row, importMapping.guardianName),
                guardianPhone: getImportValue(row, importMapping.guardianPhone),
                guardianEmail: importMapping.guardianEmail ? getImportValue(row, importMapping.guardianEmail) : "",
                guardian2Name: importMapping.guardian2Name ? getImportValue(row, importMapping.guardian2Name) : "",
                guardian2Phone: importMapping.guardian2Phone ? getImportValue(row, importMapping.guardian2Phone) : "",
                guardian2Email: importMapping.guardian2Email ? getImportValue(row, importMapping.guardian2Email) : "",
                address: importMapping.address ? getImportValue(row, importMapping.address) : ""
            })).filter(r => r.name && r.guardianName && r.guardianPhone);

            for (const row of rowsToImport) {
                await createMember({
                    troopId: selectedTroopId,
                    ...row
                });
            }

            setShowImportModal(false);
        } catch (e) {
            console.error("Import failed:", e);
            setImportError("Import se nezdařil. Zkuste to prosím znovu.");
        } finally {
            setIsImporting(false);
        }
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
            showSuccess({
                title: "✅ Uloženo",
                message: `Člen byl ${editingMemberId ? "aktualizován" : "přidán"}.`,
                duration: 2000,
            });
        } catch (error: any) {
            console.error("Failed to save member:", error);
            showError({
                title: "❌ Chyba",
                message: "Člena se nepodařilo uložit. Zkontrolujte vyplněné údaje.",
                icon: "error",
                canReport: true,
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!editingMemberId) return;

        showError({
            title: "⚠️ Potvrzení",
            message: "Opravdu chcete smazat tohoto člena? Tuto akci nelze vrátit.",
            icon: "warning",
            buttons: [
                {
                    label: "Ano, smazat",
                    onClick: async () => {
                        setIsSaving(true);
                        try {
                            await removeMember({ id: editingMemberId });
                            setShowModal(false);
                            showSuccess({
                                title: "✅ Smazáno",
                                message: "Člen byl odstraněn.",
                                duration: 2000,
                            });
                        } catch (error: any) {
                            showError({
                                title: "❌ Chyba",
                                message: "Člena se nepodařilo smazat.",
                                icon: "error",
                                canReport: true,
                            });
                        } finally {
                            setIsSaving(false);
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

    if (troops === undefined) return <div>Načítám...</div>;

    if (troops.length === 0) {
        return (
            <div style={{ textAlign: "center", padding: "2rem" }}>
                <p>Nejdříve si musíte vytvořit oddíl.</p>
                <Link href="/troop" style={{ color: "blue", textDecoration: "underline" }}>Přejít na Můj Oddíl</Link>
            </div>
        );
    }

    // Filter members
    const filteredMembers = members?.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.nickname && m.nickname.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div style={{ width: "100%", position: "relative", overflowX: "hidden", paddingBottom: "2rem", boxSizing: "border-box" }}>
            {/* Top Title Bar */}
            <div className="headingContainer">
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
                        placeholder="Hledat podle jména nebo přezdívky…"
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
                    <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>+</span> Přidat člena
                </button>

                <details className="import-menu">
                    <summary>Importovat</summary>
                    <div className="import-menu-popover">
                        <button onClick={() => importFileInputRef.current?.click()}>CSV</button>
                        <button onClick={() => googleGroupsFileInputRef.current?.click()}>Google Groups CSV</button>
                    </div>
                </details>

                <input
                    ref={importFileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    style={{ display: "none" }}
                    onChange={(e) => handleImportFileChange(e.target.files)}
                />
                <input
                    ref={googleGroupsFileInputRef}
                    type="file"
                    accept=".csv"
                    style={{ display: "none" }}
                    onChange={(e) => handleGoogleGroupsCSVFileChange(e.target.files)}
                />
            </div>

            <style jsx>{`
                .controls-row {
                    display: flex;
                    align-items: center;
                    padding: 1.5rem 2rem 0;
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
                    border-radius: 10px;
                    border: 2px solid #000;
                    box-shadow: 2px 2px 0 0 #000;
                    font-weight: 800;
                    font-size: 1rem;
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
                    margin: 0 auto;
                }
                .search-input {
                    width: 100%;
                    padding: 0.75rem 1.5rem;
                    border-radius: 10px;
                    border: 2px solid #000;
                    box-shadow: 2px 2px 0 0 #000;
                    font-size: .95rem;
                    outline: none;
                    font-weight: 500;
                }
                .add-button {
                    padding: 0.75rem 2rem;
                    border-radius: 10px;
                    background-color: var(--color-primary);
                    border: 2px solid #000;
                    box-shadow: 2px 2px 0 0 #000;
                    font-size: .9rem;
                    font-weight: 850;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    white-space: nowrap;
                    transition: transform 0.1s;
                    flex-shrink: 0;
                }
                .add-button:first-of-type {
                    margin-left: auto;
                }
                .import-menu { position: relative; flex-shrink: 0; }
                .import-menu summary { list-style: none; padding: .75rem 1rem; border: 2px solid #000; border-radius: 10px; background: #fff; box-shadow: 2px 2px 0 #000; font-size: .85rem; font-weight: 800; cursor: pointer; }
                .import-menu summary::-webkit-details-marker { display: none; }
                .import-menu-popover { position: absolute; right: 0; top: calc(100% + .5rem); z-index: 20; width: 210px; display: grid; padding: .35rem; background: #fff; border: 2px solid #000; border-radius: 10px; box-shadow: 4px 4px 0 #000; }
                .import-menu-popover button { padding: .7rem; background: transparent; border: 0; border-radius: 7px; text-align: left; font-weight: 700; cursor: pointer; }
                .import-menu-popover button:hover { background: #f0f0ee; }

                @media (max-width: 768px) {
                    .controls-row {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 1rem;
                        padding: 1rem;
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
                    .import-menu, .import-menu summary { width: 100%; text-align: center; }
                    .import-menu-popover { position: static; width: 100%; margin-top: .5rem; box-shadow: none; }
                }
            `}</style>

            {/* Members Table */}
            <div style={{
                border: "2px solid #000",
                borderRadius: "14px",
                boxShadow: "3px 3px 0 0 #000",
                overflow: "hidden",
                backgroundColor: "white",
                margin: "0 2rem"
            }}>
                <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    {/* Green Accented Header */}
                    <thead style={{ backgroundColor: "#86efac", borderBottom: "3px solid #000" }}>
                        <tr>
                            <th style={{ padding: "1rem", textAlign: "left", fontWeight: "900", borderRight: "3px solid #000", fontSize: "1.1rem" }}>Jméno</th>
                            <th style={{ padding: "1rem", textAlign: "left", fontWeight: "900", borderRight: "3px solid #000", fontSize: "1.1rem" }}>Přezdívka</th>
                            <th style={{ padding: "1rem", textAlign: "left", fontWeight: "900", borderRight: "3px solid #000", fontSize: "1.1rem" }}>Rok Narození</th>
                            <th style={{ padding: "1rem", textAlign: "left", fontWeight: "900", borderRight: "3px solid #000", fontSize: "1.1rem" }}>Zástupce</th>
                            <th style={{ padding: "1rem", textAlign: "center", fontWeight: "900", fontSize: "1.1rem" }}>Akce</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!members ? (
                            <tr><td colSpan={5} style={{ padding: "2rem", textAlign: "center" }}>Načítám seznam...</td></tr>
                        ) : filteredMembers?.length === 0 ? (
                            <tr><td colSpan={5} style={{ padding: "2rem", textAlign: "center", fontStyle: "italic" }}>Žádní členové nalezeni.</td></tr>
                        ) : (
                            filteredMembers?.map((member, index) => (
                                <tr
                                    key={member._id}
                                    style={{
                                        borderBottom: index === filteredMembers.length - 1 ? "none" : "2px solid #000",
                                        fontWeight: "600",
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f0fdf4"}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                >
                                    <td style={{ padding: "1rem", borderRight: "3px solid #000", fontWeight: "800" }}>{member.name}</td>
                                    <td style={{ padding: "1rem", borderRight: "3px solid #000" }}>{member.nickname || "-"}</td>
                                    <td style={{ padding: "1rem", borderRight: "3px solid #000" }}>{member.birthDate || "-"}</td>
                                    <td style={{ padding: "1rem", borderRight: "3px solid #000" }}>{member.guardianName || member.parentName || "-"}</td>
                                    <td style={{ padding: "1rem", textAlign: "center" }}>
                                        <button
                                            onClick={() => {
                                                setSelectedMemberForDetail(member);
                                                setShowDetailModal(true);
                                            }}
                                            style={{
                                                backgroundColor: "white",
                                                color: "black",
                                                padding: "0.5rem 1.2rem",
                                                borderRadius: "6px",
                                                border: "2px solid #000",
                                                fontWeight: "900",
                                                cursor: "pointer",
                                                fontSize: "0.9rem",
                                                boxShadow: "3px 3px 0 0 #000"
                                            }}
                                        >
                                            Zobrazit
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                </div>
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
                                    aria-label="Smazat člena"
                                    title="Smazat člena"
                                    style={{
                                        backgroundColor: "#fca5a5",
                                        border: "2px solid #000",
                                        borderRadius: "6px",
                                        width: "64px",
                                        height: "54px",
                                        padding: "15px",
                                        fontWeight: "bold",
                                        cursor: "pointer",
                                        boxShadow: "2px 2px 0 0 #000",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}
                                >
                                    <Image
                                        src="/cross-icon.svg"
                                        alt=""
                                        width={20}
                                        height={20}
                                        aria-hidden="true"
                                        style={{
                                            display: "block",
                                            objectFit: "contain"
                                        }}
                                    />
                                </button>
                            )}
                        </div>

                        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                            {/* Member Info */}
                            <div>
                                <h3 style={{ fontSize: "0.95rem", fontWeight: "900", marginBottom: "1rem", textTransform: "uppercase", color: "#666" }}>Údaje člena</h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                    <div>
                                        <label style={{ display: "block", fontWeight: "800", marginBottom: "0.25rem" }}>Jméno a Příjmení</label>
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
                                            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.25rem" }}>Datum Narození</label>
                                            <input
                                                value={formData.birthDate}
                                                onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                                                style={{ width: "100%", padding: "0.6rem", border: "2px solid #000", borderRadius: "6px", boxShadow: "4px 4px 0 0 #000", outline: "none", fontWeight: "600" }}
                                                placeholder="1.1.2012"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Guardian 1 */}
                            <div>
                                <h3 style={{ fontSize: "0.95rem", fontWeight: "900", marginBottom: "1rem", textTransform: "uppercase", color: "#666" }}>Zástupce 1</h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                    <div>
                                        <label style={{ display: "block", fontWeight: "800", marginBottom: "0.25rem" }}>Jméno Zástupce</label>
                                        <input
                                            required
                                            value={formData.guardianName}
                                            onChange={e => setFormData({ ...formData, guardianName: e.target.value })}
                                            style={{ width: "100%", padding: "0.6rem", border: "2px solid #000", borderRadius: "6px", boxShadow: "4px 4px 0 0 #000", outline: "none", fontWeight: "600" }}
                                        />
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                        <div>
                                            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.25rem" }}>Číslo Zástupce</label>
                                            <input
                                                required
                                                type="tel"
                                                value={formData.guardianPhone}
                                                onChange={e => setFormData({ ...formData, guardianPhone: e.target.value })}
                                                style={{ width: "100%", padding: "0.6rem", border: "2px solid #000", borderRadius: "6px", boxShadow: "4px 4px 0 0 #000", outline: "none", fontWeight: "600" }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.25rem" }}>Email Zástupce</label>
                                            <input
                                                type="email"
                                                value={formData.guardianEmail}
                                                onChange={e => setFormData({ ...formData, guardianEmail: e.target.value })}
                                                style={{ width: "100%", padding: "0.6rem", border: "2px solid #000", borderRadius: "6px", boxShadow: "4px 4px 0 0 #000", outline: "none", fontWeight: "600" }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Guardian 2 (optional) */}
                            <details>
                                <summary style={{ fontWeight: "900", fontSize: "0.95rem", cursor: "pointer", textTransform: "uppercase", padding: "0.5rem", backgroundColor: "#f3f4f6", borderRadius: "6px", marginBottom: "1rem", border: "2px solid #e5e7eb", color: "#666" }}>
                                    ▼ Přidat druhého zástupce
                                </summary>
                                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", paddingTop: "1rem" }}>
                                    <div>
                                        <label style={{ display: "block", fontWeight: "800", marginBottom: "0.25rem" }}>Jméno 2. Zástupce</label>
                                        <input
                                            value={formData.guardian2Name}
                                            onChange={e => setFormData({ ...formData, guardian2Name: e.target.value })}
                                            style={{ width: "100%", padding: "0.6rem", border: "2px solid #000", borderRadius: "6px", boxShadow: "4px 4px 0 0 #000", outline: "none", fontWeight: "600" }}
                                        />
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                        <div>
                                            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.25rem" }}>Číslo 2</label>
                                            <input
                                                type="tel"
                                                value={formData.guardian2Phone}
                                                onChange={e => setFormData({ ...formData, guardian2Phone: e.target.value })}
                                                style={{ width: "100%", padding: "0.6rem", border: "2px solid #000", borderRadius: "6px", boxShadow: "4px 4px 0 0 #000", outline: "none", fontWeight: "600" }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.25rem" }}>Email 2</label>
                                            <input
                                                type="email"
                                                value={formData.guardian2Email}
                                                onChange={e => setFormData({ ...formData, guardian2Email: e.target.value })}
                                                style={{ width: "100%", padding: "0.6rem", border: "2px solid #000", borderRadius: "6px", boxShadow: "4px 4px 0 0 #000", outline: "none", fontWeight: "600" }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </details>

                            {/* Address */}
                            <div>
                                <label style={{ display: "block", fontWeight: "800", marginBottom: "0.25rem" }}>Adresa</label>
                                <input
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    style={{ width: "100%", padding: "0.6rem", border: "2px solid #000", borderRadius: "6px", boxShadow: "4px 4px 0 0 #000", outline: "none", fontWeight: "600" }}
                                    placeholder="Ulice, číslo, město"
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

            {/* Import Mapping Modal */}
            {showImportModal && (
                <div style={{
                    position: "fixed",
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    zIndex: 2000,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }} onClick={() => setShowImportModal(false)}>
                    <div style={{
                        backgroundColor: "white",
                        padding: "2rem",
                        border: "3px solid #000",
                        borderRadius: "16px",
                        boxShadow: "8px 8px 0 0 #000",
                        width: "95%",
                        maxWidth: "1000px",
                        maxHeight: "90vh",
                        overflowY: "auto",
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "2rem"
                    }} onClick={e => e.stopPropagation()}>
                        {/* LEFT: Field Mapping */}
                        <div>
                            <div style={{ marginBottom: "1.5rem" }}>
                                <h2 style={{ fontSize: "1.3rem", fontWeight: "900", margin: "0 0 0.5rem 0" }}>Import členů</h2>
                                <span style={{ fontWeight: "700", fontSize: "0.85rem", color: "#666" }}>Soubor: {importFileName}</span>
                            </div>

                            {importError && (
                                <div style={{ backgroundColor: "#fef2f2", border: "2px solid #fecaca", borderRadius: "12px", padding: "0.75rem", color: "#991b1b", fontWeight: "700", marginBottom: "1rem" }}>
                                    {importError}
                                </div>
                            )}

                            <p style={{ marginTop: 0, fontWeight: "600", marginBottom: "1rem" }}>Vyberte, který sloupec odpovídá kterému poli.</p>

                            {/* Base Fields */}
                            <div style={{ marginBottom: "1.5rem" }}>
                                <h3 style={{ fontSize: "0.95rem", fontWeight: "900", marginBottom: "0.75rem", textTransform: "uppercase" }}>Základní údaje</h3>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.75rem" }}>
                                    {([
                                        { key: "name", label: "Jméno a Příjmení" },
                                        { key: "guardianName", label: "Zástupce - Jméno" },
                                        { key: "guardianPhone", label: "Zástupce - Telefon" }
                                    ] as const).map(field => (
                                        <div key={field.key}>
                                            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.25rem", fontSize: "0.9rem" }}>{field.label}</label>
                                            <select
                                                value={importMapping[field.key]}
                                                onChange={(e) => setImportMapping({ ...importMapping, [field.key]: e.target.value })}
                                                style={{ width: "100%", padding: "0.5rem", border: "2px solid #000", borderRadius: "6px", boxShadow: "3px 3px 0 0 #000", outline: "none", fontWeight: "600", fontSize: "0.9rem" }}
                                            >
                                                <option value="">— Neimportovat —</option>
                                                {importHeaders.map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Optional Fields */}
                            <div style={{ marginBottom: "1.5rem" }}>
                                <h3 style={{ fontSize: "0.95rem", fontWeight: "900", marginBottom: "0.75rem", textTransform: "uppercase" }}>Další údaje</h3>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.75rem" }}>
                                    {([
                                        { key: "nickname", label: "Přezdívka" },
                                        { key: "birthDate", label: "Datum Narození" },
                                        { key: "guardianEmail", label: "Zástupce - Email" }
                                    ] as const).map(field => (
                                        <div key={field.key}>
                                            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.25rem", fontSize: "0.9rem" }}>{field.label}</label>
                                            <select
                                                value={importMapping[field.key]}
                                                onChange={(e) => setImportMapping({ ...importMapping, [field.key]: e.target.value })}
                                                style={{ width: "100%", padding: "0.5rem", border: "2px solid #000", borderRadius: "6px", boxShadow: "3px 3px 0 0 #000", outline: "none", fontWeight: "600", fontSize: "0.9rem" }}
                                            >
                                                <option value="">— Neimportovat —</option>
                                                {importHeaders.map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* More Info Expandable */}
                            <details style={{ marginBottom: "1.5rem" }}>
                                <summary style={{ fontWeight: "900", fontSize: "0.95rem", cursor: "pointer", textTransform: "uppercase", padding: "0.5rem", backgroundColor: "#f3f4f6", borderRadius: "6px", marginBottom: "0.75rem", border: "2px solid #e5e7eb" }}>
                                    ▼ Další kontakty a informace
                                </summary>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.75rem", paddingTop: "1rem" }}>
                                    {([
                                        { key: "guardian2Name", label: "Zástupce 2 - Jméno" },
                                        { key: "guardian2Phone", label: "Zástupce 2 - Telefon" },
                                        { key: "guardian2Email", label: "Zástupce 2 - Email" },
                                        { key: "address", label: "Adresa" }
                                    ] as const).map(field => (
                                        <div key={field.key}>
                                            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.25rem", fontSize: "0.9rem" }}>{field.label}</label>
                                            <select
                                                value={importMapping[field.key]}
                                                onChange={(e) => setImportMapping({ ...importMapping, [field.key]: e.target.value })}
                                                style={{ width: "100%", padding: "0.5rem", border: "2px solid #000", borderRadius: "6px", boxShadow: "3px 3px 0 0 #000", outline: "none", fontWeight: "600", fontSize: "0.9rem" }}
                                            >
                                                <option value="">— Neimportovat —</option>
                                                {importHeaders.map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </details>
                        </div>

                        {/* RIGHT: Data Preview - Card Based */}
                        <div>
                            <h3 style={{ fontSize: "1rem", fontWeight: "900", marginBottom: "1rem" }}>Náhled členů k importu</h3>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.75rem", maxHeight: "500px", overflowY: "auto" }}>
                                {importRows.slice(0, 10).map((row, idx) => {
                                    const memberName = importMapping.name ? getImportValue(row, importMapping.name) : "—";
                                    const guardianName = importMapping.guardianName ? getImportValue(row, importMapping.guardianName) : "—";
                                    const guardianEmail = importMapping.guardianEmail ? getImportValue(row, importMapping.guardianEmail) : "—";
                                    const guardian2Name = importMapping.guardian2Name ? getImportValue(row, importMapping.guardian2Name) : "";
                                    const guardian2Email = importMapping.guardian2Email ? getImportValue(row, importMapping.guardian2Email) : "";
                                    
                                    return (
                                        <div
                                            key={idx}
                                            style={{
                                                border: "2px solid #000",
                                                borderRadius: "8px",
                                                padding: "1rem",
                                                backgroundColor: "#f9fafb",
                                                cursor: "pointer",
                                                transition: "all 0.2s"
                                            }}
                                            onClick={() => {
                                                setImportRows(importRows.map((r, i) =>
                                                    i === idx ? { ...r, _expandedDetail: !(r._expandedDetail === true) } : r
                                                ));
                                            }}
                                        >
                                            {/* Summary Row */}
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <div>
                                                    <div style={{ fontWeight: "900", fontSize: "0.95rem" }}>{memberName}</div>
                                                    <div style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "0.25rem" }}>
                                                        {guardianName} - {guardianEmail}
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: "1.2rem" }}>▼</div>
                                            </div>

                                            {/* Expandable Details */}
                                            {importRows[idx]._expandedDetail === true && (
                                                <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "2px solid #e5e7eb" }}>
                                                    {/* Member Info */}
                                                    <div style={{ marginBottom: "1rem" }}>
                                                        <div style={{ fontWeight: "800", fontSize: "0.85rem", textTransform: "uppercase", marginBottom: "0.5rem" }}>Člen</div>
                                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                                            <div>
                                                                <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#6b7280" }}>Jméno</div>
                                                                <div style={{ fontSize: "0.9rem" }}>{memberName}</div>
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#6b7280" }}>Přezdívka</div>
                                                                <div style={{ fontSize: "0.9rem" }}>{importMapping.nickname ? getImportValue(row, importMapping.nickname) : "—"}</div>
                                                            </div>
                                                            <div style={{ gridColumn: "1 / -1" }}>
                                                                <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#6b7280" }}>Rok narození</div>
                                                                <div style={{ fontSize: "0.9rem" }}>{importMapping.birthDate ? getImportValue(row, importMapping.birthDate) : "—"}</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Guardian 1 */}
                                                    <div style={{ marginBottom: "1rem" }}>
                                                        <div style={{ fontWeight: "800", fontSize: "0.85rem", textTransform: "uppercase", marginBottom: "0.5rem" }}>Zástupce 1</div>
                                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                                            <div>
                                                                <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#6b7280" }}>Jméno</div>
                                                                <div style={{ fontSize: "0.9rem" }}>{guardianName}</div>
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#6b7280" }}>Telefon</div>
                                                                <div style={{ fontSize: "0.9rem" }}>{importMapping.guardianPhone ? getImportValue(row, importMapping.guardianPhone) : "—"}</div>
                                                            </div>
                                                            <div style={{ gridColumn: "1 / -1" }}>
                                                                <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#6b7280" }}>Email</div>
                                                                <div style={{ fontSize: "0.9rem" }}>{guardianEmail}</div>
                                                            </div>
                                                        </div>
                                                        <label style={{ display: "flex", alignItems: "center", marginTop: "0.75rem", gap: "0.5rem", cursor: "pointer" }}>
                                                            <input
                                                                type="checkbox"
                                                                defaultChecked={true}
                                                                onChange={(e) => {
                                                                    setImportRows(importRows.map((r, i) =>
                                                                        i === idx ? { ...r, _emailGuardian1: e.target.checked } : r
                                                                    ));
                                                                }}
                                                                style={{ width: "18px", height: "18px", cursor: "pointer" }}
                                                            />
                                                            <span style={{ fontWeight: "700", fontSize: "0.9rem" }}>Poslat maily na tento email</span>
                                                        </label>
                                                    </div>

                                                    {/* Guardian 2 (if exists) */}
                                                    {guardian2Name && (
                                                        <div style={{ marginBottom: "1rem", paddingTop: "1rem", borderTop: "2px solid #e5e7eb" }}>
                                                            <div style={{ fontWeight: "800", fontSize: "0.85rem", textTransform: "uppercase", marginBottom: "0.5rem" }}>Zástupce 2</div>
                                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                                                <div>
                                                                    <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#6b7280" }}>Jméno</div>
                                                                    <div style={{ fontSize: "0.9rem" }}>{guardian2Name}</div>
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#6b7280" }}>Telefon</div>
                                                                    <div style={{ fontSize: "0.9rem" }}>{importMapping.guardian2Phone ? getImportValue(row, importMapping.guardian2Phone) : "—"}</div>
                                                                </div>
                                                                <div style={{ gridColumn: "1 / -1" }}>
                                                                    <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#6b7280" }}>Email</div>
                                                                    <div style={{ fontSize: "0.9rem" }}>{guardian2Email}</div>
                                                                </div>
                                                            </div>
                                                            <label style={{ display: "flex", alignItems: "center", marginTop: "0.75rem", gap: "0.5rem", cursor: "pointer" }}>
                                                                <input
                                                                    type="checkbox"
                                                                    onChange={(e) => {
                                                                        setImportRows(importRows.map((r, i) =>
                                                                            i === idx ? { ...r, _emailGuardian2: e.target.checked } : r
                                                                        ));
                                                                    }}
                                                                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                                                                />
                                                                <span style={{ fontWeight: "700", fontSize: "0.9rem" }}>Poslat maily i na tento email</span>
                                                            </label>
                                                        </div>
                                                    )}
                                                </div>
                            )}
                                    </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* BUTTONS: Full width at bottom */}
                        <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                            <button
                                onClick={() => setShowImportModal(false)}
                                style={{
                                    backgroundColor: "white",
                                    color: "black",
                                    padding: "0.6rem 1rem",
                                    borderRadius: "6px",
                                    border: "2px solid #000",
                                    fontWeight: "900",
                                    boxShadow: "4px 4px 0 0 #000",
                                    cursor: "pointer"
                                }}
                            >
                                Zrušit
                            </button>
                            <button
                                onClick={handleConfirmImport}
                                disabled={isImporting}
                                style={{
                                    backgroundColor: "#86efac",
                                    color: "black",
                                    padding: "0.6rem 1rem",
                                    borderRadius: "6px",
                                    border: "2px solid #000",
                                    fontWeight: "900",
                                    boxShadow: "4px 4px 0 0 #000",
                                    cursor: "pointer"
                                }}
                            >
                                {isImporting ? "Importuji..." : "Importovat"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Member Detail Popup */}
            {showDetailModal && selectedMemberForDetail && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0, 0, 0, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 3000,
                    padding: "2rem"
                }} onClick={() => setShowDetailModal(false)}>
                    <div style={{
                        backgroundColor: "white",
                        border: "2px solid var(--border-color)",
                        borderRadius: "8px",
                        boxShadow: "6px 6px 0 0 #000",
                        padding: "2rem",
                        maxWidth: "600px",
                        width: "100%",
                        maxHeight: "90vh",
                        overflowY: "auto"
                    }} onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                            <h2 style={{ fontSize: "1.5rem", fontWeight: "900", margin: 0 }}>{selectedMemberForDetail.name}</h2>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                style={{
                                    backgroundColor: "transparent",
                                    border: "none",
                                    fontSize: "1.5rem",
                                    cursor: "pointer",
                                    fontWeight: "900",
                                    padding: 0,
                                    width: "32px",
                                    height: "32px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Member Info */}
                        <div style={{ marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: "2px solid #e5e7eb" }}>
                            <h3 style={{ fontSize: "0.9rem", fontWeight: "900", textTransform: "uppercase", marginBottom: "1rem", letterSpacing: "0.05em" }}>Údaje člena</h3>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                                <div>
                                    <div style={{ fontSize: "0.75rem", fontWeight: "800", color: "#6b7280", marginBottom: "0.5rem", textTransform: "uppercase" }}>Jméno a Příjmení</div>
                                    <div style={{ fontSize: "0.95rem", fontWeight: "700" }}>{selectedMemberForDetail.name}</div>
                                </div>
                                {selectedMemberForDetail.nickname && (
                                    <div>
                                        <div style={{ fontSize: "0.75rem", fontWeight: "800", color: "#6b7280", marginBottom: "0.5rem", textTransform: "uppercase" }}>Přezdívka</div>
                                        <div style={{ fontSize: "0.95rem", fontWeight: "700" }}>{selectedMemberForDetail.nickname}</div>
                                    </div>
                                )}
                                {selectedMemberForDetail.birthDate && (
                                    <div>
                                        <div style={{ fontSize: "0.75rem", fontWeight: "800", color: "#6b7280", marginBottom: "0.5rem", textTransform: "uppercase" }}>Rok narození</div>
                                        <div style={{ fontSize: "0.95rem", fontWeight: "700" }}>{selectedMemberForDetail.birthDate}</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Guardian 1 */}
                        <div style={{ marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: "2px solid #e5e7eb" }}>
                            <h3 style={{ fontSize: "0.9rem", fontWeight: "900", textTransform: "uppercase", marginBottom: "1rem", letterSpacing: "0.05em" }}>Zástupce 1</h3>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
                                {(selectedMemberForDetail.guardianName || selectedMemberForDetail.parentName) && (
                                    <div>
                                        <div style={{ fontSize: "0.75rem", fontWeight: "800", color: "#6b7280", marginBottom: "0.5rem", textTransform: "uppercase" }}>Jméno</div>
                                        <div style={{ fontSize: "0.95rem", fontWeight: "700" }}>{selectedMemberForDetail.guardianName || selectedMemberForDetail.parentName}</div>
                                    </div>
                                )}
                                {(selectedMemberForDetail.guardianPhone || selectedMemberForDetail.parentPhone) && (
                                    <div>
                                        <div style={{ fontSize: "0.75rem", fontWeight: "800", color: "#6b7280", marginBottom: "0.5rem", textTransform: "uppercase" }}>Telefon</div>
                                        <div style={{ fontSize: "0.95rem", fontWeight: "700" }}>{selectedMemberForDetail.guardianPhone || selectedMemberForDetail.parentPhone}</div>
                                    </div>
                                )}
                                {(selectedMemberForDetail.guardianEmail || selectedMemberForDetail.email) && (
                                    <div>
                                        <div style={{ fontSize: "0.75rem", fontWeight: "800", color: "#6b7280", marginBottom: "0.5rem", textTransform: "uppercase" }}>Email</div>
                                        <a href={`mailto:${selectedMemberForDetail.guardianEmail || selectedMemberForDetail.email}`} style={{ fontSize: "0.95rem", fontWeight: "700", color: "#2563eb", textDecoration: "none", borderBottom: "2px solid #2563eb" }}>
                                            {selectedMemberForDetail.guardianEmail || selectedMemberForDetail.email}
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Guardian 2 (if exists) */}
                        {(selectedMemberForDetail.guardian2Name || selectedMemberForDetail.parent2Name) && (
                            <div style={{ marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: "2px solid #e5e7eb" }}>
                                <h3 style={{ fontSize: "0.9rem", fontWeight: "900", textTransform: "uppercase", marginBottom: "1rem", letterSpacing: "0.05em" }}>Zástupce 2</h3>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
                                    <div>
                                        <div style={{ fontSize: "0.75rem", fontWeight: "800", color: "#6b7280", marginBottom: "0.5rem", textTransform: "uppercase" }}>Jméno</div>
                                        <div style={{ fontSize: "0.95rem", fontWeight: "700" }}>{selectedMemberForDetail.guardian2Name || selectedMemberForDetail.parent2Name}</div>
                                    </div>
                                    {(selectedMemberForDetail.guardian2Phone || selectedMemberForDetail.parent2Phone) && (
                                        <div>
                                            <div style={{ fontSize: "0.75rem", fontWeight: "800", color: "#6b7280", marginBottom: "0.5rem", textTransform: "uppercase" }}>Telefon</div>
                                            <div style={{ fontSize: "0.95rem", fontWeight: "700" }}>{selectedMemberForDetail.guardian2Phone || selectedMemberForDetail.parent2Phone}</div>
                                        </div>
                                    )}
                                    {selectedMemberForDetail.guardian2Email && (
                                        <div>
                                            <div style={{ fontSize: "0.75rem", fontWeight: "800", color: "#6b7280", marginBottom: "0.5rem", textTransform: "uppercase" }}>Email</div>
                                            <a href={`mailto:${selectedMemberForDetail.guardian2Email}`} style={{ fontSize: "0.95rem", fontWeight: "700", color: "#2563eb", textDecoration: "none", borderBottom: "2px solid #2563eb" }}>
                                                {selectedMemberForDetail.guardian2Email}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Address */}
                        {selectedMemberForDetail.address && (
                            <div style={{ marginBottom: "2rem" }}>
                                <h3 style={{ fontSize: "0.9rem", fontWeight: "900", textTransform: "uppercase", marginBottom: "1rem", letterSpacing: "0.05em" }}>Adresa</h3>
                                <div style={{ fontSize: "0.95rem", fontWeight: "700" }}>{selectedMemberForDetail.address}</div>
                            </div>
                        )}

                        {/* Edit Button */}
                        <button
                            onClick={() => {
                                openEditModal(selectedMemberForDetail);
                                setShowDetailModal(false);
                            }}
                            style={{
                                width: "100%",
                                backgroundColor: "#fbbf24",
                                color: "#000",
                                padding: "0.8rem 1rem",
                                borderRadius: "6px",
                                border: "2px solid #000",
                                fontWeight: "900",
                                boxShadow: "4px 4px 0 0 #000",
                                cursor: "pointer",
                                marginTop: "0.5rem"
                            }}
                        >
                            Upravit člena
                        </button>
                    </div>
                </div>
            )}

            {/* Google Groups CSV Import Modal */}
            {showGoogleGroupsCSVModal && (
                <div style={{
                    position: "fixed",
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    zIndex: 2000,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "2rem"
                }} onClick={() => setShowGoogleGroupsCSVModal(false)}>
                    <div style={{
                        backgroundColor: "white",
                        padding: "2rem",
                        border: "3px solid #000",
                        borderRadius: "16px",
                        boxShadow: "8px 8px 0 0 #000",
                        width: "95%",
                        maxWidth: "800px",
                        maxHeight: "90vh",
                        overflowY: "auto",
                        display: "grid",
                        gridTemplateColumns: "1fr"
                    }} onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                            <h2 style={{ fontSize: "1.3rem", fontWeight: "900", margin: 0 }}>Import z Google Groups</h2>
                            <button
                                onClick={() => setShowGoogleGroupsCSVModal(false)}
                                style={{
                                    backgroundColor: "transparent",
                                    border: "none",
                                    fontSize: "1.5rem",
                                    cursor: "pointer",
                                    fontWeight: "900",
                                    padding: 0,
                                    width: "32px",
                                    height: "32px"
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* File Info */}
                        {googleGroupsCSVFile && (
                            <div style={{
                                border: "2px solid #10b981",
                                borderRadius: "10px",
                                padding: "1rem",
                                backgroundColor: "#ecfdf5",
                                marginBottom: "1.5rem"
                            }}>
                                <div style={{ fontWeight: "800", marginBottom: "0.5rem", fontSize: "0.95rem" }}>📄 Soubor: {googleGroupsCSVFile.name}</div>
                                <div style={{ fontWeight: "600", fontSize: "0.85rem", color: "#047857" }}>Nalezeno {googleGroupsCSVMatched.length + googleGroupsCSVUnmatched.length} e-mailů</div>
                            </div>
                        )}

                        {/* Error Message */}
                        {googleGroupsCSVError && (
                            <div style={{
                                backgroundColor: "#fee2e2",
                                border: "2px solid #fca5a5",
                                borderRadius: "10px",
                                padding: "1rem",
                                color: "#991b1b",
                                fontWeight: "700",
                                marginBottom: "1rem"
                            }}>
                                {googleGroupsCSVError}
                            </div>
                        )}

                        {/* Loading */}
                        {googleGroupsCSVLoading && (
                            <div style={{ textAlign: "center", padding: "2rem", fontWeight: "800", fontSize: "1rem" }}>
                                ⏳ Načítám a porovnávám členy...
                            </div>
                        )}

                        {/* Results Section */}
                        {!googleGroupsCSVLoading && (googleGroupsCSVMatched.length > 0 || googleGroupsCSVUnmatched.length > 0) && (
                            <div style={{ display: "grid", gap: "1.5rem" }}>
                                {/* Matched Members */}
                                {googleGroupsCSVMatched.length > 0 && (
                                    <div style={{
                                        border: "2px solid #10b981",
                                        borderRadius: "10px",
                                        padding: "1rem",
                                        backgroundColor: "#ecfdf5"
                                    }}>
                                        <div style={{ fontWeight: "800", marginBottom: "0.75rem", color: "#047857", fontSize: "0.95rem" }}>
                                            ✓ Nalezeno a přiřazeno: {googleGroupsCSVMatched.length}
                                        </div>
                                        <p style={{ margin: "0 0 0.75rem 0", fontWeight: "600", fontSize: "0.85rem", color: "#047857" }}>
                                            Vyberte členy, kterým chcete aktualizovat e-mail:
                                        </p>
                                        <div style={{ display: "grid", gap: "0.5rem" }}>
                                            {googleGroupsCSVMatched.map((m, idx) => (
                                                <div key={idx} style={{
                                                    padding: "0.75rem",
                                                    backgroundColor: "white",
                                                    borderRadius: "6px",
                                                    border: "2px solid #d1fae5",
                                                    display: "grid",
                                                    gap: "0.5rem"
                                                }}>
                                                    <label style={{
                                                        display: "flex",
                                                        alignItems: "flex-start",
                                                        gap: "0.75rem",
                                                        cursor: "pointer",
                                                        fontSize: "0.85rem",
                                                        fontWeight: "600"
                                                    }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={googleGroupsCSVEmailsToUpdate[m.memberId] || false}
                                                            onChange={(evt) => {
                                                                setGoogleGroupsCSVEmailsToUpdate(prev => ({
                                                                    ...prev,
                                                                    [m.memberId]: evt.target.checked
                                                                }));
                                                            }}
                                                            style={{
                                                                width: "1rem",
                                                                height: "1rem",
                                                                cursor: "pointer",
                                                                accentColor: "#000",
                                                                marginTop: "0.15rem",
                                                                flexShrink: 0
                                                            }}
                                                        />
                                                        <div style={{ flex: 1 }}>
                                                            <div>{m.memberName}</div>
                                                            <div style={{ color: "#6b7280", fontSize: "0.75rem" }}>
                                                                {m.currentEmail ? `Současný: ${m.currentEmail} → ` : ""}
                                                                <span style={{ color: "#047857" }}>{m.email}</span>
                                                            </div>
                                                        </div>
                                                    </label>
                                                    <div style={{ marginLeft: "1.75rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                                                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600" }}>
                                                            <input
                                                                type="radio"
                                                                name={`field-${m.memberId}`}
                                                                value="member"
                                                                checked={googleGroupsCSVEmailFieldSelection[m.memberId] === "member"}
                                                                onChange={(e) => {
                                                                    setGoogleGroupsCSVEmailFieldSelection(prev => ({
                                                                        ...prev,
                                                                        [m.memberId]: "member"
                                                                    }));
                                                                }}
                                                                style={{ cursor: "pointer", accentColor: "#000" }}
                                                            />
                                                            Člen
                                                        </label>
                                                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600" }}>
                                                            <input
                                                                type="radio"
                                                                name={`field-${m.memberId}`}
                                                                value="parent1"
                                                                checked={googleGroupsCSVEmailFieldSelection[m.memberId] === "parent1"}
                                                                onChange={(e) => {
                                                                    setGoogleGroupsCSVEmailFieldSelection(prev => ({
                                                                        ...prev,
                                                                        [m.memberId]: "parent1"
                                                                    }));
                                                                }}
                                                                style={{ cursor: "pointer", accentColor: "#000" }}
                                                            />
                                                            Rodič 1
                                                        </label>
                                                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600" }}>
                                                            <input
                                                                type="radio"
                                                                name={`field-${m.memberId}`}
                                                                value="parent2"
                                                                checked={googleGroupsCSVEmailFieldSelection[m.memberId] === "parent2"}
                                                                onChange={(e) => {
                                                                    setGoogleGroupsCSVEmailFieldSelection(prev => ({
                                                                        ...prev,
                                                                        [m.memberId]: "parent2"
                                                                    }));
                                                                }}
                                                                style={{ cursor: "pointer", accentColor: "#000" }}
                                                            />
                                                            Rodič 2
                                                        </label>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Unmatched Emails - Manual Assignment */}
                                {googleGroupsCSVUnmatched.length > 0 && (
                                    <div style={{
                                        border: "3px solid #f59e0b",
                                        borderRadius: "10px",
                                        padding: "1rem",
                                        backgroundColor: "#fffbeb"
                                    }}>
                                        <div style={{ fontWeight: "800", marginBottom: "0.75rem", color: "#b45309", fontSize: "0.95rem" }}>
                                            ⚠️ Nepřiřazené e-maily: {googleGroupsCSVUnmatched.length}
                                        </div>
                                        <p style={{ margin: "0 0 0.75rem 0", fontWeight: "600", fontSize: "0.85rem", color: "#92400e" }}>
                                            Můžete přiřadit ručně k existujícím členům:
                                        </p>
                                        <div style={{ display: "grid", gap: "0.75rem", maxHeight: "300px", overflowY: "auto" }}>
                                            {googleGroupsCSVUnmatched.map((e, idx) => (
                                                <div key={idx} style={{
                                                    padding: "0.75rem",
                                                    backgroundColor: "white",
                                                    borderRadius: "6px",
                                                    border: "2px solid #fed7aa",
                                                    display: "grid",
                                                    gap: "0.5rem"
                                                }}>
                                                    <div style={{ fontWeight: "700", fontSize: "0.85rem", color: "#92400e" }}>
                                                        {e.email}
                                                    </div>
                                                    <select
                                                        value={googleGroupsCSVManualAssignments[e.email] || ""}
                                                        onChange={(evt) => {
                                                            setGoogleGroupsCSVManualAssignments(prev => ({
                                                                ...prev,
                                                                [e.email]: evt.target.value as Id<"members"> | ""
                                                            }));
                                                        }}
                                                        style={{
                                                            padding: "0.5rem",
                                                            border: "2px solid #000",
                                                            borderRadius: "6px",
                                                            fontSize: "0.85rem",
                                                            fontWeight: "600",
                                                            outline: "none",
                                                            cursor: "pointer",
                                                            backgroundColor: googleGroupsCSVManualAssignments[e.email] ? "#ecfdf5" : "white"
                                                        }}
                                                    >
                                                        <option value="">— Nepřiřazovat —</option>
                                                        {members?.map(m => (
                                                            <option key={m._id} value={m._id}>
                                                                {m.name} {m.guardianName ? `(${m.guardianName})` : ""}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {googleGroupsCSVManualAssignments[e.email] && googleGroupsCSVManualAssignments[e.email] !== "" && (
                                                        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                                                            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.75rem", fontWeight: "600" }}>
                                                                <input
                                                                    type="radio"
                                                                    name={`manual-field-${e.email}`}
                                                                    value="member"
                                                                    checked={googleGroupsCSVManualFieldSelection[e.email] === "member"}
                                                                    onChange={(evt) => {
                                                                        setGoogleGroupsCSVManualFieldSelection(prev => ({
                                                                            ...prev,
                                                                            [e.email]: "member"
                                                                        }));
                                                                    }}
                                                                    style={{ cursor: "pointer", accentColor: "#000" }}
                                                                />
                                                                Člen
                                                            </label>
                                                            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.75rem", fontWeight: "600" }}>
                                                                <input
                                                                    type="radio"
                                                                    name={`manual-field-${e.email}`}
                                                                    value="parent1"
                                                                    checked={googleGroupsCSVManualFieldSelection[e.email] === "parent1"}
                                                                    onChange={(evt) => {
                                                                        setGoogleGroupsCSVManualFieldSelection(prev => ({
                                                                            ...prev,
                                                                            [e.email]: "parent1"
                                                                        }));
                                                                    }}
                                                                    style={{ cursor: "pointer", accentColor: "#000" }}
                                                                />
                                                                Rodič 1
                                                            </label>
                                                            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.75rem", fontWeight: "600" }}>
                                                                <input
                                                                    type="radio"
                                                                    name={`manual-field-${e.email}`}
                                                                    value="parent2"
                                                                    checked={googleGroupsCSVManualFieldSelection[e.email] === "parent2"}
                                                                    onChange={(evt) => {
                                                                        setGoogleGroupsCSVManualFieldSelection(prev => ({
                                                                            ...prev,
                                                                            [e.email]: "parent2"
                                                                        }));
                                                                    }}
                                                                    style={{ cursor: "pointer", accentColor: "#000" }}
                                                                />
                                                                Rodič 2
                                                            </label>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                    <button
                                        onClick={() => {
                                            setShowGoogleGroupsCSVModal(false);
                                            setGoogleGroupsCSVFile(null);
                                            setGoogleGroupsCSVMatched([]);
                                            setGoogleGroupsCSVUnmatched([]);
                                            setGoogleGroupsCSVEmailsToUpdate({});
                                            setGoogleGroupsCSVEmailFieldSelection({});
                                            setGoogleGroupsCSVManualAssignments({});
                                            setGoogleGroupsCSVManualFieldSelection({});
                                            setGoogleGroupsCSVError(null);
                                        }}
                                        style={{
                                            padding: "0.9rem",
                                            backgroundColor: "#e5e7eb",
                                            border: "3px solid #000",
                                            borderRadius: "10px",
                                            fontWeight: "900",
                                            fontSize: "0.95rem",
                                            cursor: "pointer",
                                            boxShadow: "3px 3px 0 0 #000"
                                        }}
                                    >
                                        Zrušit
                                    </button>
                                    <button
                                        onClick={handleGoogleGroupsCSVConfirm}
                                        disabled={googleGroupsCSVLoading || (Object.values(googleGroupsCSVEmailsToUpdate).filter(Boolean).length === 0 && Object.values(googleGroupsCSVManualAssignments).filter(v => v && v !== "").length === 0)}
                                        style={{
                                            padding: "0.9rem",
                                            backgroundColor: (googleGroupsCSVLoading || (Object.values(googleGroupsCSVEmailsToUpdate).filter(Boolean).length === 0 && Object.values(googleGroupsCSVManualAssignments).filter(v => v && v !== "").length === 0)) ? "#e5e7eb" : "#86efac",
                                            color: (googleGroupsCSVLoading || (Object.values(googleGroupsCSVEmailsToUpdate).filter(Boolean).length === 0 && Object.values(googleGroupsCSVManualAssignments).filter(v => v && v !== "").length === 0)) ? "#9ca3af" : "#000",
                                            border: "3px solid #000",
                                            borderRadius: "10px",
                                            fontWeight: "900",
                                            fontSize: "0.95rem",
                                            cursor: (googleGroupsCSVLoading || (Object.values(googleGroupsCSVEmailsToUpdate).filter(Boolean).length === 0 && Object.values(googleGroupsCSVManualAssignments).filter(v => v && v !== "").length === 0)) ? "not-allowed" : "pointer",
                                            boxShadow: "3px 3px 0 0 #000"
                                        }}
                                    >
                                        {googleGroupsCSVLoading ? "Aktualizuji..." : `Aktualizovat (${Object.values(googleGroupsCSVEmailsToUpdate).filter(Boolean).length + Object.values(googleGroupsCSVManualAssignments).filter(v => v && v !== "").length})`}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
