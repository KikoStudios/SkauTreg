"use client";

import { Fragment, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useFeedback } from "../../context/FeedbackContext";

type FinanceTabProps = { tripId: Id<"trips"> };
type BudgetCategory = "transport" | "food" | "accommodation" | "materials" | "other";
type BudgetField = "name" | "subcategory" | "plannedAmount" | "actualAmount" | "quantity" | "unitLabel" | "note";
type BudgetItem = {
    _id: Id<"trip_budget_items">;
    category: BudgetCategory;
    subcategory: string;
    name: string;
    plannedAmount?: number;
    actualAmount?: number;
    quantity?: number;
    unitLabel?: string;
    note?: string;
};
type PaymentRow = {
    _id: Id<"trip_member_payments">;
    status: "unpaid" | "partial" | "paid" | "excused";
    expectedAmount?: number;
    paidAmount?: number;
    paidAt?: string;
    note?: string;
    member?: { _id: Id<"members">; name?: string } | null;
};
type FinanceDashboard = {
    financeSettings: {
        currency: string;
        manualPricePerParticipant?: number;
        paymentDueDate?: string;
        useManualParticipantPrice?: boolean;
        notes?: string;
    };
    budgetItems: BudgetItem[];
    payments: PaymentRow[];
    summary: {
        plannedTotal: number;
        actualTotal: number;
        participantCount: number;
        payingParticipantCount: number;
        calculatedPricePerParticipant: number;
        effectivePricePerParticipant: number;
        expectedRevenue: number;
        collectedRevenue: number;
        outstandingRevenue: number;
    };
};
type NewItemDraft = {
    name: string;
    subcategory: string;
    plannedAmount: string;
    actualAmount: string;
    quantity: string;
    unitLabel: string;
    note: string;
};
type NewItemState = Record<BudgetCategory, NewItemDraft>;

const CATEGORY_CONFIG = [
    { key: "transport", label: "Doprava", color: "#eef1ef", subcategories: [["outbound", "Tam"], ["return", "Zpátky"], ["local", "Místní přesuny"], ["extra", "Mimořádná doprava"]] },
    { key: "food", label: "Jídlo", color: "#f4f2ec", subcategories: [["snacks", "Svačiny"], ["breakfast", "Snídaně"], ["lunch", "Obědy"], ["dinner", "Večeře"], ["drinks", "Pitný režim"], ["shared_purchase", "Společný nákup"], ["reserve", "Potravinová rezerva"]] },
    { key: "accommodation", label: "Ubytování", color: "#edf2ee", subcategories: [["lodging", "Nocleh"], ["energy", "Energie"], ["deposit", "Kauce"], ["cleaning", "Úklid"], ["extra_fees", "Další poplatky"]] },
    { key: "materials", label: "Materiál", color: "#f2f0ef", subcategories: [["program", "Program"], ["first_aid", "Lékárna"], ["consumables", "Spotřební materiál"], ["printing", "Tisk"], ["rewards", "Odměny"], ["repairs", "Opravy"]] },
    { key: "other", label: "Ostatní", color: "#f0f1f0", subcategories: [["entry_fees", "Vstupy"], ["insurance", "Pojištění"], ["reserve", "Finanční rezerva"], ["unexpected", "Neočekávané výdaje"]] },
] as const satisfies ReadonlyArray<{ key: BudgetCategory; label: string; color: string; subcategories: ReadonlyArray<readonly [string, string]> }>;

const PAYMENT_STATUS_OPTIONS = [
    ["unpaid", "Nezaplaceno"],
    ["partial", "Castecne"],
    ["paid", "Zaplaceno"],
    ["excused", "Prominuto"],
] as const;

const formatCurrency = (value?: number | null) =>
    typeof value === "number" && !Number.isNaN(value) ? `${new Intl.NumberFormat("cs-CZ").format(value)} Kc` : "0 Kc";
const toInputValue = (value?: number | null) => (typeof value === "number" && !Number.isNaN(value) ? String(value) : "");
const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Neznama chyba");
const parseOptionalAmount = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0) throw new Error("Zadej nezaporne cislo.");
    return Math.round(parsed);
};
const parseOptionalQuantity = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0) throw new Error("Zadej nezapornou hodnotu.");
    return parsed;
};
const getDefaultNewItems = (): NewItemState => ({
    transport: { name: "", subcategory: "outbound", plannedAmount: "", actualAmount: "", quantity: "", unitLabel: "", note: "" },
    food: { name: "", subcategory: "snacks", plannedAmount: "", actualAmount: "", quantity: "", unitLabel: "", note: "" },
    accommodation: { name: "", subcategory: "lodging", plannedAmount: "", actualAmount: "", quantity: "", unitLabel: "", note: "" },
    materials: { name: "", subcategory: "program", plannedAmount: "", actualAmount: "", quantity: "", unitLabel: "", note: "" },
    other: { name: "", subcategory: "entry_fees", plannedAmount: "", actualAmount: "", quantity: "", unitLabel: "", note: "" },
});

export default function FinanceTab({ tripId }: FinanceTabProps) {
    const { showError, showSuccess } = useFeedback();
    const dashboard = useQuery(api.tripFinance.getDashboard, { tripId }) as FinanceDashboard | undefined;
    const updateFinanceSettings = useMutation(api.tripFinance.updateFinanceSettings);
    const addBudgetItem = useMutation(api.tripFinance.addBudgetItem);
    const updateBudgetItem = useMutation(api.tripFinance.updateBudgetItem);
    const removeBudgetItem = useMutation(api.tripFinance.removeBudgetItem);
    const ensurePaymentRows = useMutation(api.tripFinance.ensurePaymentRows);
    const updateMemberPayment = useMutation(api.tripFinance.updateMemberPayment);
    const bulkSetExpectedAmounts = useMutation(api.tripFinance.bulkSetExpectedAmounts);

    const [didEnsurePayments, setDidEnsurePayments] = useState(false);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [isSyncingExpected, setIsSyncingExpected] = useState(false);
    const [financeForm, setFinanceForm] = useState({ useManualParticipantPrice: false, manualPricePerParticipant: "", paymentDueDate: "", notes: "" });
    const [newItems, setNewItems] = useState<NewItemState>(getDefaultNewItems);

    useEffect(() => {
        if (!dashboard) return;
        setFinanceForm({
            useManualParticipantPrice: dashboard.financeSettings.useManualParticipantPrice ?? false,
            manualPricePerParticipant: toInputValue(dashboard.financeSettings.manualPricePerParticipant),
            paymentDueDate: dashboard.financeSettings.paymentDueDate || "",
            notes: dashboard.financeSettings.notes || "",
        });
    }, [dashboard]);

    useEffect(() => {
        if (!dashboard || didEnsurePayments) return;
        setDidEnsurePayments(true);
        ensurePaymentRows({ tripId }).catch((error) => console.error("Failed to ensure payment rows", error));
    }, [dashboard, didEnsurePayments, ensurePaymentRows, tripId]);

    const groupedItems = useMemo(() => {
        const map = new Map<BudgetCategory, BudgetItem[]>();
        for (const category of CATEGORY_CONFIG) map.set(category.key, []);
        for (const item of dashboard?.budgetItems || []) {
            map.set(item.category, [...(map.get(item.category) || []), item]);
        }
        return map;
    }, [dashboard?.budgetItems]);

    const breakdown = useMemo(
        () =>
            CATEGORY_CONFIG.map((category) => {
                const items = [...(groupedItems.get(category.key) || [])].sort((a, b) => a.name.localeCompare(b.name, "cs"));
                return {
                    ...category,
                    items,
                    planned: items.reduce((sum, item) => sum + (item.plannedAmount || 0), 0),
                    actual: items.reduce((sum, item) => sum + (item.actualAmount || 0), 0),
                    subs: category.subcategories.map(([value, label]) => {
                        const subItems = items.filter((item) => item.subcategory === value);
                        return {
                            value,
                            label,
                            count: subItems.length,
                            planned: subItems.reduce((sum, item) => sum + (item.plannedAmount || 0), 0),
                            actual: subItems.reduce((sum, item) => sum + (item.actualAmount || 0), 0),
                        };
                    }),
                };
            }),
        [groupedItems]
    );

    if (!dashboard) return <div style={{ padding: "2rem", fontWeight: 700 }}>Nacitam finance vypravy...</div>;

    const saveSettings = async () => {
        try {
            setIsSavingSettings(true);
            await updateFinanceSettings({
                tripId,
                manualPricePerParticipant: parseOptionalAmount(financeForm.manualPricePerParticipant),
                paymentDueDate: financeForm.paymentDueDate || null,
                useManualParticipantPrice: financeForm.useManualParticipantPrice,
                notes: financeForm.notes || null,
            });
            showSuccess({ title: "Ulozeno", message: "Nastaveni financi bylo ulozeno.", duration: 1500 });
        } catch (error) {
            showError({ title: "Chyba", message: "Nastaveni financi se nepodarilo ulozit.", icon: "error", canReport: true, details: getErrorMessage(error) });
        } finally {
            setIsSavingSettings(false);
        }
    };

    const saveBudgetField = async (itemId: Id<"trip_budget_items">, field: BudgetField, rawValue: string) => {
        try {
            if (field === "name") await updateBudgetItem({ itemId, name: rawValue });
            if (field === "subcategory") await updateBudgetItem({ itemId, subcategory: rawValue });
            if (field === "plannedAmount") await updateBudgetItem({ itemId, plannedAmount: parseOptionalAmount(rawValue) });
            if (field === "actualAmount") await updateBudgetItem({ itemId, actualAmount: parseOptionalAmount(rawValue) });
            if (field === "quantity") await updateBudgetItem({ itemId, quantity: parseOptionalQuantity(rawValue) });
            if (field === "unitLabel") await updateBudgetItem({ itemId, unitLabel: rawValue || null });
            if (field === "note") await updateBudgetItem({ itemId, note: rawValue || null });
        } catch (error) {
            showError({ title: "Chyba", message: "Polozku se nepodarilo upravit.", icon: "error", canReport: true, details: getErrorMessage(error) });
        }
    };

    const removeItem = async (itemId: Id<"trip_budget_items">) => {
        try {
            await removeBudgetItem({ itemId });
            showSuccess({ title: "Smazano", message: "Polozka rozpoctu byla odebrana.", duration: 1200 });
        } catch (error) {
            showError({ title: "Chyba", message: "Polozku se nepodarilo smazat.", icon: "error", canReport: true, details: getErrorMessage(error) });
        }
    };

    const addItem = async (category: BudgetCategory) => {
        const draft = newItems[category];
        try {
            await addBudgetItem({
                tripId,
                category,
                subcategory: draft.subcategory,
                name: draft.name.trim(),
                plannedAmount: parseOptionalAmount(draft.plannedAmount) ?? undefined,
                actualAmount: parseOptionalAmount(draft.actualAmount) ?? undefined,
                quantity: parseOptionalQuantity(draft.quantity) ?? undefined,
                unitLabel: draft.unitLabel.trim() || undefined,
                note: draft.note.trim() || undefined,
            });
            setNewItems((prev) => ({ ...prev, [category]: getDefaultNewItems()[category] }));
            showSuccess({ title: "Pridano", message: "Polozka rozpoctu byla pridana.", duration: 1200 });
        } catch (error) {
            showError({ title: "Chyba", message: "Polozku se nepodarilo ulozit.", icon: "error", canReport: true, details: getErrorMessage(error) });
        }
    };

    const savePayment = async (
        paymentId: Id<"trip_member_payments">,
        patch: Partial<{ status: PaymentRow["status"]; expectedAmount: string; paidAmount: string; paidAt: string; note: string }>
    ) => {
        try {
            await updateMemberPayment({
                paymentId,
                status: patch.status,
                expectedAmount: patch.expectedAmount !== undefined ? parseOptionalAmount(patch.expectedAmount) : undefined,
                paidAmount: patch.paidAmount !== undefined ? parseOptionalAmount(patch.paidAmount) : undefined,
                paidAt: patch.paidAt !== undefined ? patch.paidAt || null : undefined,
                note: patch.note !== undefined ? patch.note || null : undefined,
            });
        } catch (error) {
            showError({ title: "Chyba", message: "Platbu se nepodarilo ulozit.", icon: "error", canReport: true, details: getErrorMessage(error) });
        }
    };

    const syncExpectedAmounts = async () => {
        try {
            setIsSyncingExpected(true);
            const result = await bulkSetExpectedAmounts({ tripId });
            showSuccess({ title: "Hotovo", message: `Aktualizovano ${result.updatedCount} plateb.`, duration: 1500 });
        } catch (error) {
            showError({ title: "Chyba", message: "Nepodarilo se propsat castky do plateb.", icon: "error", canReport: true, details: getErrorMessage(error) });
        } finally {
            setIsSyncingExpected(false);
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "1rem" }}>
                {[
                    ["Plánované náklady", formatCurrency(dashboard.summary.plannedTotal), "#f3f4f3"],
                    ["Skutečné náklady", formatCurrency(dashboard.summary.actualTotal), "#f1efee"],
                    ["Cena na účastníka", formatCurrency(dashboard.summary.effectivePricePerParticipant), "#edf1ee"],
                    ["Vybráno / zbývá", `${formatCurrency(dashboard.summary.collectedRevenue)} / ${formatCurrency(dashboard.summary.outstandingRevenue)}`, "#e8eeea"],
                ].map(([label, value, color]) => (
                    <div key={String(label)} style={{ ...panelStyle, backgroundColor: String(color), padding: "1.1rem" }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", marginBottom: "0.4rem" }}>{label}</div>
                        <div style={{ fontSize: "1.45rem", fontWeight: 900 }}>{value}</div>
                    </div>
                ))}
            </div>

            <div style={panelStyle}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1.25rem", marginBottom: "1rem" }}>
                    <div>
                        <h2 style={{ margin: "0 0 0.35rem", fontSize: "1.45rem", fontWeight: 900, textTransform: "uppercase" }}>Zakladni prehled rozpoctu</h2>
                        <div style={{ color: "#666" }}>Finance se oteviraji jako rychly prehled po hlavich a podkategoriich. Detailni polozky, platby a nastaveni jsou schovane nize v podmenu.</div>
                    </div>
                    <img src="/illustrations/ill-trip-budget.png" alt="" aria-hidden="true" style={{ width: "112px", height: "94px", objectFit: "contain", flex: "0 0 auto" }} />
                </div>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "760px" }}>
                        <thead>
                            <tr style={{ backgroundColor: "#f3f4f6" }}>
                                <th style={thStyle}>Kategorie</th>
                                <th style={thStyle}>Podkategorie</th>
                                <th style={thStyle}>Plan</th>
                                <th style={thStyle}>Skutecnost</th>
                                <th style={thStyle}>Polozky</th>
                            </tr>
                        </thead>
                        <tbody>
                            {breakdown.map((category) => (
                                <Fragment key={category.key}>
                                    <tr style={{ backgroundColor: category.color, borderTop: "3px solid #000" }}>
                                        <td style={{ ...tdStyle, fontWeight: 900 }}>{category.label}</td>
                                        <td style={{ ...tdStyle, fontWeight: 800 }}>Celkem</td>
                                        <td style={{ ...tdStyle, fontWeight: 900 }}>{formatCurrency(category.planned)}</td>
                                        <td style={{ ...tdStyle, fontWeight: 900 }}>{formatCurrency(category.actual)}</td>
                                        <td style={{ ...tdStyle, fontWeight: 800 }}>{category.items.length}</td>
                                    </tr>
                                    {category.subs.map((sub) => (
                                        <tr key={`${category.key}-${sub.value}`} style={{ borderTop: "1px solid #d1d5db" }}>
                                            <td style={tdStyle}></td>
                                            <td style={{ ...tdStyle, paddingLeft: "1.5rem", fontWeight: 700 }}>{sub.label}</td>
                                            <td style={tdStyle}>{formatCurrency(sub.planned)}</td>
                                            <td style={tdStyle}>{formatCurrency(sub.actual)}</td>
                                            <td style={tdStyle}>{sub.count}</td>
                                        </tr>
                                    ))}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <details style={detailsStyle}>
                <summary style={summaryStyle}>
                    <span>Rozpad polozek podle kategorii</span>
                    <span style={summaryMetaStyle}>{dashboard.budgetItems.length} polozek</span>
                </summary>
                <div style={detailsContentStyle}>
                    {breakdown.map((category) => {
                        const draft = newItems[category.key];
                        return (
                            <section key={category.key} style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                                <div style={{ ...subPanelStyle, backgroundColor: category.color }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                                        <div>
                                            <div style={{ fontWeight: 900, fontSize: "1.05rem", textTransform: "uppercase" }}>{category.label}</div>
                                            <div style={{ color: "#444", fontSize: "0.92rem" }}>
                                                Plan {formatCurrency(category.planned)} | Skutecnost {formatCurrency(category.actual)}
                                            </div>
                                        </div>
                                        <div style={{ fontWeight: 800 }}>{category.items.length} polozek</div>
                                    </div>
                                </div>

                                {category.items.length === 0 ? (
                                    <div style={{ ...subPanelStyle, color: "#666" }}>Zatim bez polozek.</div>
                                ) : (
                                    <div style={{ overflowX: "auto" }}>
                                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "980px" }}>
                                            <thead>
                                                <tr style={{ backgroundColor: "#f9fafb" }}>
                                                    <th style={thStyle}>Nazev</th>
                                                    <th style={thStyle}>Podkategorie</th>
                                                    <th style={thStyle}>Plan</th>
                                                    <th style={thStyle}>Skutecnost</th>
                                                    <th style={thStyle}>Mnozstvi</th>
                                                    <th style={thStyle}>Jednotka</th>
                                                    <th style={thStyle}>Poznamka</th>
                                                    <th style={thStyle}>Akce</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {category.items.map((item) => (
                                                    <tr key={item._id} style={{ borderTop: "1px solid #d1d5db" }}>
                                                        <td style={tdStyle}>
                                                            <input defaultValue={item.name} onBlur={(e) => void saveBudgetField(item._id, "name", e.target.value)} style={inputStyle} />
                                                        </td>
                                                        <td style={tdStyle}>
                                                            <select defaultValue={item.subcategory} onChange={(e) => void saveBudgetField(item._id, "subcategory", e.target.value)} style={inputStyle}>
                                                                {category.subcategories.map(([value, label]) => (
                                                                    <option key={value} value={value}>
                                                                        {label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td style={tdStyle}>
                                                            <input defaultValue={toInputValue(item.plannedAmount)} onBlur={(e) => void saveBudgetField(item._id, "plannedAmount", e.target.value)} style={inputStyle} inputMode="numeric" />
                                                        </td>
                                                        <td style={tdStyle}>
                                                            <input defaultValue={toInputValue(item.actualAmount)} onBlur={(e) => void saveBudgetField(item._id, "actualAmount", e.target.value)} style={inputStyle} inputMode="numeric" />
                                                        </td>
                                                        <td style={tdStyle}>
                                                            <input defaultValue={toInputValue(item.quantity)} onBlur={(e) => void saveBudgetField(item._id, "quantity", e.target.value)} style={inputStyle} inputMode="decimal" />
                                                        </td>
                                                        <td style={tdStyle}>
                                                            <input defaultValue={item.unitLabel || ""} onBlur={(e) => void saveBudgetField(item._id, "unitLabel", e.target.value)} style={inputStyle} />
                                                        </td>
                                                        <td style={tdStyle}>
                                                            <input defaultValue={item.note || ""} onBlur={(e) => void saveBudgetField(item._id, "note", e.target.value)} style={inputStyle} />
                                                        </td>
                                                        <td style={tdStyle}>
                                                            <button type="button" onClick={() => void removeItem(item._id)} style={dangerButtonStyle}>
                                                                Smazat
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                <div style={subPanelStyle}>
                                    <div style={{ fontWeight: 900, marginBottom: "0.75rem" }}>Nova polozka</div>
                                    <div style={formGridStyle}>
                                        <input
                                            value={draft.name}
                                            onChange={(e) => setNewItems((prev) => ({ ...prev, [category.key]: { ...prev[category.key], name: e.target.value } }))}
                                            placeholder="Nazev"
                                            style={inputStyle}
                                        />
                                        <select
                                            value={draft.subcategory}
                                            onChange={(e) => setNewItems((prev) => ({ ...prev, [category.key]: { ...prev[category.key], subcategory: e.target.value } }))}
                                            style={inputStyle}
                                        >
                                            {category.subcategories.map(([value, label]) => (
                                                <option key={value} value={value}>
                                                    {label}
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            value={draft.plannedAmount}
                                            onChange={(e) => setNewItems((prev) => ({ ...prev, [category.key]: { ...prev[category.key], plannedAmount: e.target.value } }))}
                                            placeholder="Plan"
                                            style={inputStyle}
                                            inputMode="numeric"
                                        />
                                        <input
                                            value={draft.actualAmount}
                                            onChange={(e) => setNewItems((prev) => ({ ...prev, [category.key]: { ...prev[category.key], actualAmount: e.target.value } }))}
                                            placeholder="Skutecnost"
                                            style={inputStyle}
                                            inputMode="numeric"
                                        />
                                        <input
                                            value={draft.quantity}
                                            onChange={(e) => setNewItems((prev) => ({ ...prev, [category.key]: { ...prev[category.key], quantity: e.target.value } }))}
                                            placeholder="Mnozstvi"
                                            style={inputStyle}
                                            inputMode="decimal"
                                        />
                                        <input
                                            value={draft.unitLabel}
                                            onChange={(e) => setNewItems((prev) => ({ ...prev, [category.key]: { ...prev[category.key], unitLabel: e.target.value } }))}
                                            placeholder="Jednotka"
                                            style={inputStyle}
                                        />
                                        <input
                                            value={draft.note}
                                            onChange={(e) => setNewItems((prev) => ({ ...prev, [category.key]: { ...prev[category.key], note: e.target.value } }))}
                                            placeholder="Poznamka"
                                            style={{ ...inputStyle, gridColumn: "1 / -2" }}
                                        />
                                        <button type="button" onClick={() => void addItem(category.key)} style={actionButtonStyle}>
                                            Pridat
                                        </button>
                                    </div>
                                </div>
                            </section>
                        );
                    })}
                </div>
            </details>

            <details style={detailsStyle}>
                <summary style={summaryStyle}>
                    <span>Platby ucastniku</span>
                    <span style={summaryMetaStyle}>
                        {dashboard.summary.payingParticipantCount}/{dashboard.summary.participantCount} platicich
                    </span>
                </summary>
                <div style={detailsContentStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                        <div style={{ color: "#555" }}>Po otevreni vidis vsechny jednotlive platby. Zakladni obraz tabu tim zustava cisty.</div>
                        <button type="button" onClick={() => void syncExpectedAmounts()} disabled={isSyncingExpected} style={actionButtonStyle}>
                            {isSyncingExpected ? "Propisuji..." : "Propsat cenu do plateb"}
                        </button>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
                            <thead>
                                <tr style={{ backgroundColor: "#f3f4f6" }}>
                                    <th style={thStyle}>Ucastnik</th>
                                    <th style={thStyle}>Stav</th>
                                    <th style={thStyle}>Ma zaplatit</th>
                                    <th style={thStyle}>Zaplaceno</th>
                                    <th style={thStyle}>Datum</th>
                                    <th style={thStyle}>Poznamka</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dashboard.payments.map((payment) => (
                                    <tr key={payment._id} style={{ borderTop: "1px solid #d1d5db" }}>
                                        <td style={{ ...tdStyle, fontWeight: 800 }}>{payment.member?.name || "Bez jmena"}</td>
                                        <td style={tdStyle}>
                                            <select defaultValue={payment.status} onChange={(e) => void savePayment(payment._id, { status: e.target.value as PaymentRow["status"] })} style={inputStyle}>
                                                {PAYMENT_STATUS_OPTIONS.map(([value, label]) => (
                                                    <option key={value} value={value}>
                                                        {label}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td style={tdStyle}>
                                            <input defaultValue={toInputValue(payment.expectedAmount)} onBlur={(e) => void savePayment(payment._id, { expectedAmount: e.target.value })} style={inputStyle} inputMode="numeric" />
                                        </td>
                                        <td style={tdStyle}>
                                            <input defaultValue={toInputValue(payment.paidAmount)} onBlur={(e) => void savePayment(payment._id, { paidAmount: e.target.value })} style={inputStyle} inputMode="numeric" />
                                        </td>
                                        <td style={tdStyle}>
                                            <input type="date" defaultValue={payment.paidAt || ""} onBlur={(e) => void savePayment(payment._id, { paidAt: e.target.value })} style={inputStyle} />
                                        </td>
                                        <td style={tdStyle}>
                                            <input defaultValue={payment.note || ""} onBlur={(e) => void savePayment(payment._id, { note: e.target.value })} style={inputStyle} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </details>

            <details style={detailsStyle}>
                <summary style={summaryStyle}>
                    <span>Nastaveni financovani</span>
                    <span style={summaryMetaStyle}>{financeForm.useManualParticipantPrice ? "Rucni cena" : "Automaticka cena"}</span>
                </summary>
                <div style={detailsContentStyle}>
                    <div style={formGridStyle}>
                        <label style={fieldStyle}>
                            <span style={labelStyle}>Rucni cena za ucastnika</span>
                            <input
                                type="checkbox"
                                checked={financeForm.useManualParticipantPrice}
                                onChange={(e) => setFinanceForm((prev) => ({ ...prev, useManualParticipantPrice: e.target.checked }))}
                                style={{ width: "1.1rem", height: "1.1rem" }}
                            />
                        </label>
                        <label style={fieldStyle}>
                            <span style={labelStyle}>Castka na ucastnika</span>
                            <input
                                value={financeForm.manualPricePerParticipant}
                                onChange={(e) => setFinanceForm((prev) => ({ ...prev, manualPricePerParticipant: e.target.value }))}
                                style={inputStyle}
                                inputMode="numeric"
                            />
                        </label>
                        <label style={fieldStyle}>
                            <span style={labelStyle}>Termin platby</span>
                            <input
                                type="date"
                                value={financeForm.paymentDueDate}
                                onChange={(e) => setFinanceForm((prev) => ({ ...prev, paymentDueDate: e.target.value }))}
                                style={inputStyle}
                            />
                        </label>
                        <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                            <span style={labelStyle}>Interni poznamka</span>
                            <textarea
                                value={financeForm.notes}
                                onChange={(e) => setFinanceForm((prev) => ({ ...prev, notes: e.target.value }))}
                                style={{ ...inputStyle, minHeight: "110px", resize: "vertical" }}
                            />
                        </label>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                        <div style={{ color: "#555" }}>
                            Vypocitana cena: {formatCurrency(dashboard.summary.calculatedPricePerParticipant)} | Aktivni cena:{" "}
                            {formatCurrency(dashboard.summary.effectivePricePerParticipant)}
                        </div>
                        <button type="button" onClick={() => void saveSettings()} disabled={isSavingSettings} style={actionButtonStyle}>
                            {isSavingSettings ? "Ukladam..." : "Ulozit nastaveni"}
                        </button>
                    </div>
                </div>
            </details>

            <div style={{ ...panelStyle, backgroundColor: "#f9fafb" }}>
                <div style={{ fontWeight: 900, marginBottom: "0.4rem", textTransform: "uppercase" }}>Rychla orientace</div>
                <div style={{ color: "#555", lineHeight: 1.5 }}>
                    Nejvetsi polozky zustavaji v horni tabulce. Detail polozek je schovany po kategoriich, platby maji vlastni submenu a cenotvorba
                    s terminem je oddelena v nastaveni.
                </div>
            </div>
        </div>
    );
}

const panelStyle: CSSProperties = {
    backgroundColor: "white",
    border: "2px solid #111",
    borderRadius: "12px",
    boxShadow: "3px 3px 0 #111",
    padding: "1.3rem",
};

const subPanelStyle: CSSProperties = {
    border: "2px solid #111",
    borderRadius: "9px",
    padding: "1rem",
    backgroundColor: "white",
};

const detailsStyle: CSSProperties = {
    ...panelStyle,
    padding: 0,
    overflow: "hidden",
};

const summaryStyle: CSSProperties = {
    listStyle: "none",
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
    padding: "1rem 1.25rem",
    fontWeight: 900,
    textTransform: "uppercase",
};

const summaryMetaStyle: CSSProperties = {
    fontSize: "0.85rem",
    color: "#555",
};

const detailsContentStyle: CSSProperties = {
    borderTop: "2px solid #111",
    padding: "1.2rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
};

const formGridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "0.75rem",
    alignItems: "end",
};

const fieldStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
};

const labelStyle: CSSProperties = {
    fontSize: "0.85rem",
    fontWeight: 800,
};

const inputStyle: CSSProperties = {
    width: "100%",
    padding: "0.65rem 0.75rem",
    border: "2px solid #111",
    borderRadius: "8px",
    fontSize: "0.95rem",
    backgroundColor: "white",
};

const actionButtonStyle: CSSProperties = {
    padding: "0.75rem 1rem",
    border: "2px solid #111",
    borderRadius: "8px",
    color: "white",
    backgroundColor: "#315f3f",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "2px 2px 0 #111",
};

const dangerButtonStyle: CSSProperties = {
    ...actionButtonStyle,
    color: "#8a3838",
    backgroundColor: "#f7e9e9",
    borderColor: "#e2bcbc",
};

const thStyle: CSSProperties = {
    padding: "0.85rem",
    fontWeight: 900,
    fontSize: "0.92rem",
    textAlign: "left",
    borderBottom: "2px solid #111",
};

const tdStyle: CSSProperties = {
    padding: "0.75rem 0.85rem",
    verticalAlign: "top",
};
