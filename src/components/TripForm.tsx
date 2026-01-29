"use client";

import { useState } from "react";
import Button from "./Button";
import Select from "./Select";

const FIELD_TYPES = [
    { value: "text", label: "Textové pole (Input)" },
    { value: "boolean", label: "Ano/Ne" },
    { value: "checkbox", label: "Zaškrtávací políčko" },
    { value: "select", label: "Výběr z možností (Dropdown)" }
];

export type TripFormData = {
    name: string;
    description: string;
    location: string;
    startDate: string;
    endDate: string;
    formType: string;
    customFields: any[];
};

interface TripFormProps {
    initialData?: Partial<TripFormData>;
    onSubmit: (data: TripFormData) => Promise<void>;
    isLoading: boolean;
    buttonText: string;
}

export default function TripForm({ initialData, onSubmit, isLoading, buttonText }: TripFormProps) {
    const [formData, setFormData] = useState<TripFormData>({
        name: initialData?.name || "",
        description: initialData?.description || "",
        location: initialData?.location || "",
        startDate: initialData?.startDate || "",
        endDate: initialData?.endDate || "",
        formType: initialData?.formType || "registration",
        customFields: initialData?.customFields || []
    });

    const [customFields, setCustomFields] = useState<any[]>(initialData?.customFields || []);
    const [activeTab, setActiveTab] = useState<'basic' | 'fields'>('basic');

    // Add style tag for input focus effects
    const inputFocusStyles = `
        input:focus, textarea:focus, select:focus {
            outline: none;
            transform: translate(1px, 1px);
            box-shadow: 1px 1px 0 0 #000 !important;
        }
    `;


    // Sync customFields state with formData just to be safe, though we use the state
    // We update formData.customFields on submit usually

    // New Field State
    const [addingField, setAddingField] = useState(false);
    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [tempField, setTempField] = useState({
        label: "",
        type: "text",
        required: false,
        info: "",
        placeholder: "",
        optionsString: ""
    });

    const resetTempField = () => {
        setTempField({ label: "", type: "text", required: false, info: "", placeholder: "", optionsString: "" });
        setAddingField(false);
        setEditIndex(null);
    };

    const startAdding = () => {
        resetTempField();
        setAddingField(true);
    };

    const startEditing = (index: number) => {
        const field = customFields[index];
        setTempField({
            label: field.label,
            type: field.type,
            required: field.required,
            info: field.info || "",
            placeholder: field.placeholder || "",
            optionsString: field.options ? field.options.join(", ") : ""
        });
        setEditIndex(index);
        setAddingField(true);
    };

    const removeField = (index: number) => {
        if (confirm("Opravdu chcete odstranit tuto otázku?")) {
            const newFields = [...customFields];
            newFields.splice(index, 1);
            setCustomFields(newFields);
        }
    };

    const saveField = () => {
        if (!tempField.label) return;

        const fieldObject = {
            label: tempField.label,
            type: tempField.type,
            required: tempField.required,
            info: tempField.info,
            placeholder: tempField.placeholder,
            options: tempField.type === 'select' ? tempField.optionsString.split(',').map(s => s.trim()) : undefined
        };

        if (editIndex !== null) {
            const newFields = [...customFields];
            newFields[editIndex] = fieldObject;
            setCustomFields(newFields);
        } else {
            setCustomFields([...customFields, fieldObject]);
        }

        resetTempField();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit({
            ...formData,
            customFields: formData.formType === 'registration' ? customFields : []
        });
    };

    return (
        <>
            <style>{inputFocusStyles}</style>
            
            {/* Tabs */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "2px solid var(--border-color)" }}>
                <button
                    type="button"
                    onClick={() => setActiveTab('basic')}
                    style={{
                        padding: "0.75rem 1.5rem",
                        border: "none",
                        borderBottom: activeTab === 'basic' ? "3px solid #000" : "none",
                        background: activeTab === 'basic' ? "white" : "transparent",
                        fontWeight: activeTab === 'basic' ? "700" : "600",
                        fontSize: "1rem",
                        cursor: "pointer",
                        marginBottom: "-2px"
                    }}
                >
                    Základní Info
                </button>
                {formData.formType === "registration" && (
                    <button
                        type="button"
                        onClick={() => setActiveTab('fields')}
                        style={{
                            padding: "0.75rem 1.5rem",
                            border: "none",
                            borderBottom: activeTab === 'fields' ? "3px solid #000" : "none",
                            background: activeTab === 'fields' ? "white" : "transparent",
                            fontWeight: activeTab === 'fields' ? "700" : "600",
                            fontSize: "1rem",
                            cursor: "pointer",
                            marginBottom: "-2px"
                        }}
                    >
                        Otázky do formuláře ({customFields.length})
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
                <>
            {/* Basic Trip Info */}
            <div>
                <input required placeholder="Název Výpravy" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={inputStyle} />
            </div>
            
            <div>
                <textarea required placeholder="Popis" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} style={{ ...inputStyle, minHeight: "80px" }} />
            </div>
            
            <div>
                <input required placeholder="Místo" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} style={inputStyle} />
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <input required type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} style={inputStyle} />
                <input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} style={inputStyle} />
            </div>

            {/* Form Type Selection Box */}
            <div style={{
                backgroundColor: "var(--bg-card)",
                border: "2px solid var(--border-color)",
                borderRadius: "8px",
                padding: "1.5rem",
                boxShadow: "4px 4px 0 0 #000"
            }}>
                <label style={{ display: "block", marginBottom: "1rem", fontWeight: "700", fontSize: "1rem" }}>Typ Přihlašování</label>
                <div style={{ display: "flex", gap: "1.5rem", flexDirection: "column" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", fontWeight: "600" }}>
                        <input
                            type="radio"
                            name="formType"
                            value="registration"
                            checked={formData.formType === "registration"}
                            onChange={() => {
                                setFormData({ ...formData, formType: "registration" });
                            }}
                            style={{ width: "18px", height: "18px", cursor: "pointer" }}
                        />
                        Registrace + Omluvenky
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", fontWeight: "600" }}>
                        <input
                            type="radio"
                            name="formType"
                            value="apology"
                            checked={formData.formType === "apology"}
                            onChange={() => {
                                setFormData({ ...formData, formType: "apology" });
                                setActiveTab('basic');
                            }}
                            style={{ width: "18px", height: "18px", cursor: "pointer" }}
                        />
                        Pouze Omluvenky
                    </label>
                </div>
            </div>
            </>
            )}

            {/* Custom Fields Tab */}
            {activeTab === 'fields' && formData.formType === "registration" && (
                <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <h3 style={{ fontSize: "1.1rem", fontWeight: "700", margin: 0 }}>Otázky do formuláře</h3>
                        {!addingField && <Button type="button" onClick={startAdding} variant="outline">+ Přidat otázku</Button>}
                    </div>

                    {/* Two-column layout when editing/adding */}
                    <div style={{
                        display: addingField ? "grid" : "block",
                        gridTemplateColumns: addingField ? "1fr 1fr" : "1fr",
                        gap: "1.5rem"
                    }}>
                        {/* Left: Form Editor (only when adding/editing) */}
                        {addingField && (
                            <div style={{
                                backgroundColor: "var(--bg-card)",
                                border: "2px solid var(--border-color)",
                                borderRadius: "8px",
                                padding: "1.5rem",
                                boxShadow: "4px 4px 0 0 #000",
                                height: "fit-content",
                                position: "sticky",
                                top: "1rem"
                            }}>
                                <h4 style={{ marginBottom: "1.5rem", fontWeight: "700", fontSize: "1rem" }}>
                                    {editIndex !== null ? "Upravit otázku" : "Nová otázka"}
                                </h4>
                                <div style={{ display: "grid", gap: "1rem" }}>
                                    <div>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.9rem" }}>Znění otázky</label>
                                        <input
                                            placeholder="Např. Alergie"
                                            value={tempField.label}
                                            onChange={e => setTempField({ ...tempField, label: e.target.value })}
                                            style={inputStyle}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.9rem" }}>Typ pole</label>
                                        <Select
                                            value={tempField.type}
                                            onChange={(value) => setTempField({ ...tempField, type: value })}
                                            options={FIELD_TYPES}
                                        />
                                    </div>

                                    {tempField.type === 'select' && (
                                        <div>
                                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.9rem" }}>Možnosti oddělené čárkou</label>
                                            <input
                                                placeholder="Např. Stan, Chatka"
                                                value={tempField.optionsString}
                                                onChange={e => setTempField({ ...tempField, optionsString: e.target.value })}
                                                style={inputStyle}
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.9rem" }}>Nápověda (tooltip)</label>
                                        <input
                                            placeholder="Doplňující text"
                                            value={tempField.info}
                                            onChange={e => setTempField({ ...tempField, info: e.target.value })}
                                            style={inputStyle}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.9rem" }}>Příklad vyplnění</label>
                                        <input
                                            placeholder="Příklad pro uživatele"
                                            value={tempField.placeholder}
                                            onChange={e => setTempField({ ...tempField, placeholder: e.target.value })}
                                            style={inputStyle}
                                        />
                                    </div>

                                    <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.95rem", cursor: "pointer", fontWeight: "600" }}>
                                        <input
                                            type="checkbox"
                                            checked={tempField.required}
                                            onChange={e => setTempField({ ...tempField, required: e.target.checked })}
                                            style={{ width: "18px", height: "18px", cursor: "pointer" }}
                                        />
                                        Povinná otázka
                                    </label>

                                    <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                                        <Button type="button" onClick={saveField}>
                                            {editIndex !== null ? "Uložit změny" : "Přidat otázku"}
                                        </Button>
                                        <Button type="button" variant="outline" onClick={resetTempField}>Zrušit</Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Right: List of existing fields */}
                        {customFields.length > 0 && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                {customFields.map((f, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            backgroundColor: "var(--bg-card)",
                                            border: "2px solid var(--border-color)",
                                            borderRadius: "8px",
                                            padding: "1rem",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            boxShadow: "2px 2px 0 0 #000",
                                            fontSize: "0.95rem"
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontWeight: "700" }}>
                                                {f.label} {f.required && <span style={{ color: "red" }}>*</span>}
                                            </div>
                                            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                                                {f.type}
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", gap: "0.5rem" }}>
                                            <button
                                                type="button"
                                                onClick={() => startEditing(i)}
                                                style={{
                                                    padding: "0.5rem 1rem",
                                                    backgroundColor: "#86efac",
                                                    border: "2px solid #000",
                                                    borderRadius: "6px",
                                                    fontWeight: "600",
                                                    cursor: "pointer",
                                                    fontSize: "0.85rem",
                                                    boxShadow: "2px 2px 0 0 #000",
                                                    transition: "transform 0.1s"
                                                }}
                                                onMouseDown={e => e.currentTarget.style.transform = "translate(1px, 1px)"}
                                                onMouseUp={e => e.currentTarget.style.transform = "translate(0, 0)"}
                                            >
                                                Upravit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeField(i)}
                                                style={{
                                                    padding: "0.5rem 1rem",
                                                    backgroundColor: "#fca5a5",
                                                    border: "2px solid #000",
                                                    borderRadius: "6px",
                                                    fontWeight: "600",
                                                    cursor: "pointer",
                                                    fontSize: "0.85rem",
                                                    boxShadow: "2px 2px 0 0 #000",
                                                    transition: "transform 0.1s"
                                                }}
                                                onMouseDown={e => e.currentTarget.style.transform = "translate(1px, 1px)"}
                                                onMouseUp={e => e.currentTarget.style.transform = "translate(0, 0)"}
                                            >
                                                Smazat
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <Button type="submit" disabled={isLoading} style={{ marginTop: "0.5rem" }}>
                {isLoading ? "Ukládám..." : buttonText}
            </Button>
        </form>
        </>
    );
}

const inputStyle = {
    width: "100%",
    padding: "0.75rem",
    border: "2px solid var(--border-color)",
    borderRadius: "6px",
    fontSize: "0.95rem",
    fontFamily: "inherit",
    fontWeight: "500",
    boxShadow: "2px 2px 0 0 #000",
    transition: "all 0.1s"
} as React.CSSProperties;
