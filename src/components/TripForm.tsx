"use client";

import { useState } from "react";
import Button from "./Button";

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
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <input required placeholder="Název Výpravy" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={inputStyle} />
            <textarea required placeholder="Popis" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} style={{ ...inputStyle, minHeight: "80px" }} />
            <input required placeholder="Místo" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} style={inputStyle} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <input required type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} style={inputStyle} />
                <input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} style={inputStyle} />
            </div>

            <div style={{ padding: "1rem", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Typ Přihlašování</label>
                <div style={{ display: "flex", gap: "1rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                        <input
                            type="radio"
                            name="formType"
                            value="registration"
                            checked={formData.formType === "registration"}
                            onChange={() => setFormData({ ...formData, formType: "registration" })}
                        />
                        Registrace + Omluvenky
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                        <input
                            type="radio"
                            name="formType"
                            value="apology"
                            checked={formData.formType === "apology"}
                            onChange={() => setFormData({ ...formData, formType: "apology" })}
                        />
                        Pouze Omluvenky
                    </label>
                </div>
            </div>

            {formData.formType === "registration" && (
                <div style={{ borderTop: "1px solid #eee", paddingTop: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <h3 style={{ fontSize: "1rem", fontWeight: "bold" }}>Otázky do formuláře</h3>
                        {!addingField && <Button type="button" onClick={startAdding} variant="outline">+ Přidat otázku</Button>}
                    </div>

                    {customFields.length > 0 && !addingField && (
                        <ul style={{ listStyle: "none", padding: 0, marginBottom: "1rem" }}>
                            {customFields.map((f, i) => (
                                <li key={i} style={{ backgroundColor: "#f3f4f6", padding: "0.5rem", marginBottom: "0.5rem", borderRadius: "4px", fontSize: "0.9rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                        <strong>{f.label}</strong> <span style={{ color: "#666" }}>({f.type})</span>
                                        {f.required && <img src="/exclamation-icon.svg" alt="required" style={{ marginLeft: "0.25rem", height: "20px", verticalAlign: "middle" }} />}
                                    </div>
                                    <div style={{ display: "flex", gap: "0.5rem" }}>
                                        <button type="button" onClick={() => startEditing(i)} style={{ cursor: "pointer", border: "none", background: "none", fontSize: "1rem" }}>
                                            <img src="/edit-icon.svg" alt="edit" style={{ height: "20px" }} />
                                        </button>
                                        <button type="button" onClick={() => removeField(i)} style={{ cursor: "pointer", border: "none", background: "none", fontSize: "1rem" }}>
                                            <img src="/delete-icon.svg" alt="delete" style={{ height: "20px" }} />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                    {addingField && (
                        <div style={{ padding: "1rem", border: "1px solid #ddd", borderRadius: "8px", backgroundColor: "#fff" }}>
                            <h4 style={{ marginBottom: "1rem", fontWeight: "bold" }}>{editIndex !== null ? "Upravit otázku" : "Nová otázka"}</h4>
                            <div style={{ display: "grid", gap: "0.5rem" }}>
                                <input placeholder="Znění otázky (např. Alergie)" value={tempField.label} onChange={e => setTempField({ ...tempField, label: e.target.value })} style={inputStyle} />

                                <select value={tempField.type} onChange={e => setTempField({ ...tempField, type: e.target.value })} style={inputStyle}>
                                    {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>

                                {tempField.type === 'select' && (
                                    <input placeholder="Možnosti oddělené čárkou (např. Stan, Chatka)" value={tempField.optionsString} onChange={e => setTempField({ ...tempField, optionsString: e.target.value })} style={inputStyle} />
                                )}

                                <input placeholder="Nápověda (tooltip)" value={tempField.info} onChange={e => setTempField({ ...tempField, info: e.target.value })} style={inputStyle} />
                                <input placeholder="Příklad vyplnění (placeholder)" value={tempField.placeholder} onChange={e => setTempField({ ...tempField, placeholder: e.target.value })} style={inputStyle} />

                                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem" }}>
                                    <input type="checkbox" checked={tempField.required} onChange={e => setTempField({ ...tempField, required: e.target.checked })} />
                                    Povinná otázka
                                </label>

                                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                                    <Button type="button" onClick={saveField}>{editIndex !== null ? "Uložit změny" : "Přidat otázku"}</Button>
                                    <Button type="button" variant="outline" onClick={resetTempField}>Zrušit</Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <Button type="submit" disabled={isLoading} style={{ marginTop: "1rem" }}>
                {isLoading ? "Ukládám..." : buttonText}
            </Button>
        </form>
    );
}

const inputStyle = {
    width: "100%", padding: "0.5rem", border: "1px solid #ddd", borderRadius: "4px"
};
