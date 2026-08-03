"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Check, CheckCircle2, ClipboardList, FileQuestion, Pencil, Plus, Trash2 } from "lucide-react";
import Button from "./Button";
import Select from "./Select";
import styles from "./TripForm.module.css";

const FIELD_TYPES = [
    { value: "text", label: "Krátká textová odpověď" },
    { value: "boolean", label: "Ano / ne" },
    { value: "checkbox", label: "Zaškrtávací políčko" },
    { value: "select", label: "Výběr z možností" },
];

export type TripFormData = {
    name: string;
    description: string;
    location: string;
    startDate: string;
    endDate: string;
    lastCancellationDate?: string;
    lateCancellationMessage?: string;
    formType: string;
    customFields: any[];
};

interface TripFormProps {
    initialData?: Partial<TripFormData>;
    onSubmit: (data: TripFormData) => Promise<void>;
    isLoading: boolean;
    buttonText: string;
    layout?: "compact" | "workspace";
    section?: "details" | "registration";
    showNavigation?: boolean;
}

const emptyField = {
    label: "",
    type: "text",
    required: false,
    info: "",
    placeholder: "",
    optionsString: "",
};

export default function TripForm({ initialData, onSubmit, isLoading, buttonText, layout = "compact", section, showNavigation = true }: TripFormProps) {
    const initialDataSignature = JSON.stringify(initialData || {});
    const createFormData = (): TripFormData => ({
        name: initialData?.name || "",
        description: initialData?.description || "",
        location: initialData?.location || "",
        startDate: initialData?.startDate || "",
        endDate: initialData?.endDate || "",
        lastCancellationDate: initialData?.lastCancellationDate || "",
        lateCancellationMessage: initialData?.lateCancellationMessage || "",
        formType: initialData?.formType || "registration",
        customFields: initialData?.customFields || [],
    });

    const [formData, setFormData] = useState<TripFormData>(createFormData);
    const [customFields, setCustomFields] = useState<any[]>(initialData?.customFields || []);
    const [internalSection, setInternalSection] = useState<"details" | "registration">("details");
    const activeSection = section || internalSection;
    const [isDirty, setIsDirty] = useState(false);
    const [addingField, setAddingField] = useState(false);
    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [tempField, setTempField] = useState(emptyField);

    useEffect(() => {
        if (!initialData) return;
        setFormData(createFormData());
        setCustomFields(initialData.customFields || []);
        setIsDirty(false);
        // initialData intentionally represents one loaded trip snapshot.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialDataSignature]);

    const resetTempField = () => {
        setTempField(emptyField);
        setAddingField(false);
        setEditIndex(null);
    };

    const startEditing = (index: number) => {
        const field = customFields[index];
        setTempField({
            label: field.label,
            type: field.type,
            required: Boolean(field.required),
            info: field.info || "",
            placeholder: field.placeholder || "",
            optionsString: field.options ? field.options.join(", ") : "",
        });
        setEditIndex(index);
        setAddingField(true);
    };

    const removeField = (index: number) => {
        if (!confirm("Opravdu chcete odstranit tuto otázku?")) return;
        setCustomFields(fields => fields.filter((_, fieldIndex) => fieldIndex !== index));
        setIsDirty(true);
        if (editIndex === index) resetTempField();
    };

    const saveField = () => {
        if (!tempField.label.trim()) return;
        const field = {
            label: tempField.label.trim(),
            type: tempField.type,
            required: tempField.required,
            info: tempField.info.trim(),
            placeholder: tempField.placeholder.trim(),
            options: tempField.type === "select"
                ? tempField.optionsString.split(",").map(option => option.trim()).filter(Boolean)
                : undefined,
        };
        setCustomFields(fields => editIndex === null
            ? [...fields, field]
            : fields.map((item, index) => index === editIndex ? field : item));
        setIsDirty(true);
        resetTempField();
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        await onSubmit({
            ...formData,
            endDate: formData.endDate || "",
            lastCancellationDate: formData.lastCancellationDate || "",
            lateCancellationMessage: formData.lateCancellationMessage || "",
            customFields: formData.formType === "registration" ? customFields : [],
        });
        setIsDirty(false);
    };

    const input = (key: keyof TripFormData, value: string) => {
        setFormData(current => ({ ...current, [key]: value }));
        setIsDirty(true);
    };

    return (
        <form className={styles.form} data-layout={layout} data-navigation={showNavigation} onSubmit={handleSubmit}>
            {showNavigation && <aside className={styles.sectionNav} aria-label="Části nastavení výpravy">
                <div className={styles.navHeading}>Nastavení</div>
                <button type="button" data-active={activeSection === "details"} onClick={() => setInternalSection("details")}>
                    <ClipboardList size={19} />
                    <span><strong>Základní údaje</strong><small>Název, termín a pravidla</small></span>
                </button>
                <button type="button" data-active={activeSection === "registration"} onClick={() => setInternalSection("registration")}>
                    <FileQuestion size={19} />
                    <span><strong>Přihlašování</strong><small>{customFields.length} vlastních otázek</small></span>
                </button>
                <div className={styles.navHint}>Změny se uloží společně tlačítkem dole.</div>
            </aside>}

            <div className={styles.editor}>
                {activeSection === "details" && (
                    <div className={styles.sectionStack}>
                        <section className={styles.card}>
                            <div className={styles.cardHeading}>
                                <span className={styles.iconBox}><ClipboardList size={20} /></span>
                                <div><h3>Základní informace</h3><p>Údaje, podle kterých výpravu poznají vedoucí i účastníci.</p></div>
                            </div>
                            <div className={styles.twoColumns}>
                                <label><span>Název výpravy</span><input required value={formData.name} onChange={e => input("name", e.target.value)} placeholder="Např. Podzimní výprava" /></label>
                                <label><span>Místo</span><input required value={formData.location} onChange={e => input("location", e.target.value)} placeholder="Město nebo základna" /></label>
                            </div>
                            <label><span>Popis</span><textarea required value={formData.description} onChange={e => input("description", e.target.value)} placeholder="Co účastníky čeká a co je důležité vědět?" /></label>
                        </section>

                        <section className={styles.card}>
                            <div className={styles.cardHeading}>
                                <span className={styles.iconBox}><CalendarDays size={20} /></span>
                                <div><h3>Termín a rušení účasti</h3><p>Držte běžný termín a storno podmínky na jednom místě.</p></div>
                            </div>
                            <div className={styles.twoColumns}>
                                <label><span>Začátek</span><input required type="date" value={formData.startDate} onChange={e => input("startDate", e.target.value)} /></label>
                                <label><span>Konec <em>volitelné</em></span><input type="date" value={formData.endDate} onChange={e => input("endDate", e.target.value)} /></label>
                            </div>
                            <div className={styles.policyGrid}>
                                <label><span>Bezplatné zrušení do <em>volitelné</em></span><input type="date" value={formData.lastCancellationDate || ""} onChange={e => input("lastCancellationDate", e.target.value)} /><small>Po tomto datu aplikace zobrazí upozornění.</small></label>
                                <label><span>Text upozornění po lhůtě <em>volitelné</em></span><textarea value={formData.lateCancellationMessage || ""} onChange={e => input("lateCancellationMessage", e.target.value)} placeholder="Např. Jízdenky už jsou zakoupené…" /></label>
                            </div>
                        </section>
                    </div>
                )}

                {activeSection === "registration" && (
                    <div className={styles.sectionStack}>
                        <section className={styles.card}>
                            <div className={styles.cardHeading}>
                                <span className={styles.iconBox}><Check size={20} /></span>
                                <div><h3>Způsob přihlašování</h3><p>Zvolte, jestli sbíráte přihlášky, nebo pouze omluvenky.</p></div>
                            </div>
                            <div className={styles.choiceGrid}>
                                <label data-selected={formData.formType === "registration"}><input type="radio" name="formType" checked={formData.formType === "registration"} onChange={() => { setFormData(current => ({ ...current, formType: "registration" })); setIsDirty(true); }} /><span><strong>Registrace a omluvenky</strong><small>Účastníci se mohou přihlásit a vyplnit doplňující otázky.</small></span></label>
                                <label data-selected={formData.formType === "apology"}><input type="radio" name="formType" checked={formData.formType === "apology"} onChange={() => { setFormData(current => ({ ...current, formType: "apology" })); setIsDirty(true); }} /><span><strong>Pouze omluvenky</strong><small>Výchozí je účast; evidují se jen lidé, kteří nejedou.</small></span></label>
                            </div>
                        </section>

                        {formData.formType === "registration" && (
                            <section className={styles.card}>
                                <div className={styles.questionsHeader}>
                                    <div className={styles.cardHeading}>
                                        <span className={styles.iconBox}><FileQuestion size={20} /></span>
                                        <div><h3>Otázky v přihlášce</h3><p>Ptejte se jen na informace potřebné pro tuto výpravu.</p></div>
                                    </div>
                                    {!addingField && <button className={styles.addButton} type="button" onClick={() => setAddingField(true)}><Plus size={17} /> Přidat otázku</button>}
                                </div>

                                <div className={styles.questionWorkspace} data-editing={addingField}>
                                    {addingField && (
                                        <div className={styles.questionEditor}>
                                            <h4>{editIndex === null ? "Nová otázka" : "Upravit otázku"}</h4>
                                            <label><span>Znění otázky</span><input value={tempField.label} onChange={e => setTempField({ ...tempField, label: e.target.value })} placeholder="Např. Alergie a omezení" /></label>
                                            <label><span>Typ odpovědi</span><Select value={tempField.type} onChange={value => setTempField({ ...tempField, type: value })} options={FIELD_TYPES} /></label>
                                            {tempField.type === "select" && <label><span>Možnosti oddělené čárkou</span><input value={tempField.optionsString} onChange={e => setTempField({ ...tempField, optionsString: e.target.value })} placeholder="Stan, chatka, bez preference" /></label>}
                                            <label><span>Nápověda</span><input value={tempField.info} onChange={e => setTempField({ ...tempField, info: e.target.value })} placeholder="Doplňující vysvětlení" /></label>
                                            <label><span>Příklad odpovědi</span><input value={tempField.placeholder} onChange={e => setTempField({ ...tempField, placeholder: e.target.value })} placeholder="Text zobrazený v prázdném poli" /></label>
                                            <label className={styles.checkbox}><input type="checkbox" checked={tempField.required} onChange={e => setTempField({ ...tempField, required: e.target.checked })} /> Povinná otázka</label>
                                            <div className={styles.editorActions}><Button type="button" onClick={saveField}>{editIndex === null ? "Přidat" : "Uložit"}</Button><Button type="button" variant="outline" onClick={resetTempField}>Zrušit</Button></div>
                                        </div>
                                    )}

                                    <div className={styles.questionList}>
                                        {customFields.length === 0 ? (
                                            <div className={styles.emptyQuestions}><FileQuestion size={25} /><strong>Žádné vlastní otázky</strong><span>Jméno a stav účasti aplikace sbírá automaticky.</span>{!addingField && <button type="button" onClick={() => setAddingField(true)}><Plus size={16} /> Přidat první otázku</button>}</div>
                                        ) : customFields.map((field, index) => (
                                            <div className={styles.questionRow} key={`${field.label}-${index}`}>
                                                <span className={styles.questionNumber}>{index + 1}</span>
                                                <div><strong>{field.label}{field.required && <b> *</b>}</strong><small>{FIELD_TYPES.find(type => type.value === field.type)?.label || field.type}</small></div>
                                                <div className={styles.rowActions}><button type="button" aria-label="Upravit otázku" onClick={() => startEditing(index)}><Pencil size={16} /></button><button type="button" aria-label="Smazat otázku" onClick={() => removeField(index)}><Trash2 size={16} /></button></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        )}
                    </div>
                )}

                {isDirty && <footer className={styles.formFooter} role="status">
                    <div><CheckCircle2 size={18} /><span><strong>Neuložené změny</strong><small>Zkontrolujte údaje a potvrďte uložení.</small></span></div>
                    <Button type="submit" disabled={isLoading}>{isLoading ? "Ukládám…" : buttonText}</Button>
                </footer>}
            </div>
        </form>
    );
}
