"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import { useFeedback } from "../context/FeedbackContext";

interface WorkflowBuilderProps {
    troopId: Id<"troops">;
}

interface FormState {
    name: string;
    trigger: string;
    integrationId: string;
    messageTemplate: string;
    conditions: Array<{ field: string; operator: string; value: string }>;
}

const TRIGGERS = [
    { id: "member_unregistered_late", name: "Odhlaska pozde", label: "ODHLASKA POZDE" },
    { id: "new_trip_created", name: "Nový výlet", label: "NOVÝ VÝLET" },
    { id: "payment_received", name: "Platba přijata", label: "PLATBA PŘIJATA" },
    { id: "trip_assigned_base", name: "Přiřazena základna", label: "PŘIŘAZENA ZÁKLADNA" },
];

const TEMPLATE_VARIABLES: Record<string, string[]> = {
    member_unregistered_late: ["{member_name}", "{trip_title}", "{trip_date}", "{leader_name}"],
    new_trip_created: ["{trip_title}", "{trip_date}", "{trip_location}", "{creator_name}"],
    payment_received: ["{member_name}", "{amount}", "{payment_method}", "{trip_title}"],
    trip_assigned_base: ["{trip_title}", "{base_name}", "{location}"],
};

export default function WorkflowBuilder({ troopId }: WorkflowBuilderProps) {
    const integrations = useQuery(api.integrations.getByTroop, { troopId });
    const actions = useQuery(api.integration_actions.getByTroop, { troopId });
    const createAction = useMutation(api.integration_actions.create);
    const updateAction = useMutation(api.integration_actions.update);
    const deleteAction = useMutation(api.integration_actions.deleteAction);
    const toggleAction = useMutation(api.integration_actions.toggleEnabled);

    const { showSuccess, showError } = useFeedback();

    const [formState, setFormState] = useState<FormState>({
        name: "",
        trigger: "member_unregistered_late",
        integrationId: "",
        messageTemplate: "",
        conditions: [],
    });
    const [selectedAction, setSelectedAction] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleCreateNew = () => {
        setSelectedAction(null);
        setFormState({
            name: "",
            trigger: "member_unregistered_late",
            integrationId: integrations?.[0]?._id.toString() || "",
            messageTemplate: "",
            conditions: [],
        });
        setIsCreating(true);
    };

    const handleSelectAction = (id: string) => {
        const action = actions?.find((a) => a._id === id);
        if (action) {
            setSelectedAction(id);
            setFormState({
                name: action.name,
                trigger: action.trigger,
                integrationId: (action as any).integrationId.toString(),
                messageTemplate: action.messageTemplate,
                conditions: ((action as any).triggerConfig?.conditions || []).map((c: any) => ({
                    field: c.field,
                    operator: c.operator,
                    value: c.value,
                })),
            });
            setIsCreating(false);
        }
    };

    const handleSave = async () => {
        if (!formState.name.trim()) {
            showError({ title: "Validation", message: "Please enter an automation name" });
            return;
        }
        if (!formState.messageTemplate.trim()) {
            showError({ title: "Validation", message: "Please enter a message template" });
            return;
        }
        if (!formState.integrationId) {
            showError({ title: "Validation", message: "Please select an integration" });
            return;
        }

        setIsSaving(true);
        try {
            const integrationId = formState.integrationId as unknown as Id<"integrations">;
            if (selectedAction) {
                await updateAction({
                    actionId: selectedAction as Id<"integration_actions">,
                    name: formState.name,
                    trigger: formState.trigger,
                    integrationId,
                    messageTemplate: formState.messageTemplate,
                    triggerConfig: {
                        conditions: formState.conditions.length > 0 ? formState.conditions : undefined,
                    },
                });
                showSuccess({ title: "Saved", message: "Automation updated!" });
            } else {
                await createAction({
                    troopId,
                    name: formState.name,
                    trigger: formState.trigger,
                    integrationId,
                    messageTemplate: formState.messageTemplate,
                    triggerConfig: {
                        conditions: formState.conditions.length > 0 ? formState.conditions : undefined,
                    },
                });
                showSuccess({ title: "Created", message: "New automation created!" });
                setIsCreating(false);
                setFormState({
                    name: "",
                    trigger: "member_unregistered_late",
                    integrationId: "",
                    messageTemplate: "",
                    conditions: [],
                });
            }
        } catch (error) {
            showError({
                title: "Error",
                message: error instanceof Error ? error.message : "Failed to save",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggle = async (actionId: string) => {
        try {
            await toggleAction({
                actionId: actionId as Id<"integration_actions">,
            });
            showSuccess({ title: "Updated", message: "Automation status changed" });
        } catch (error) {
            showError({
                title: "Error",
                message: error instanceof Error ? error.message : "Failed to toggle",
            });
        }
    };

    const handleDelete = async () => {
        if (!selectedAction) return;
        if (!window.confirm("Delete this automation?")) return;

        try {
            await deleteAction({
                actionId: selectedAction as Id<"integration_actions">,
            });
            showSuccess({ title: "Deleted", message: "Automation removed" });
            setSelectedAction(null);
            setIsCreating(false);
        } catch (error) {
            showError({
                title: "Error",
                message: error instanceof Error ? error.message : "Failed to delete",
            });
        }
    };

    return (
        <div style={{ width: "100%" }}>
            {/* Filter Bar */}
            <div
                style={{
                    backgroundColor: "white",
                    border: "3px solid #000",
                    borderRadius: "12px",
                    padding: "1rem",
                    marginBottom: "2rem",
                    boxShadow: "4px 4px 0 0 #000",
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    flexWrap: "wrap",
                }}
            >
                {/* Toggle */}
                <button
                    style={{
                        background: "none",
                        border: "2px solid #000",
                        borderRadius: "20px",
                        width: "48px",
                        height: "28px",
                        cursor: "pointer",
                        position: "relative",
                    }}
                >
                    <div
                        style={{
                            position: "absolute",
                            width: "22px",
                            height: "22px",
                            backgroundColor: "#86efac",
                            borderRadius: "50%",
                            top: "2px",
                            left: "2px",
                            transition: "all 0.2s",
                        }}
                    />
                </button>

                {/* Filter Labels */}
                {TRIGGERS.map((trigger) => (
                    <button
                        key={trigger.id}
                        onClick={() => setFormState({ ...formState, trigger: trigger.id })}
                        style={{
                            backgroundColor: formState.trigger === trigger.id ? "#000" : "white",
                            color: formState.trigger === trigger.id ? "white" : "#000",
                            border: "2px solid #000",
                            borderRadius: "20px",
                            padding: "0.4rem 1rem",
                            fontWeight: "700",
                            fontSize: "0.85rem",
                            cursor: "pointer",
                            transition: "all 0.2s",
                        }}
                    >
                        {trigger.label}
                    </button>
                ))}

                <button
                    style={{
                        marginLeft: "auto",
                        background: "none",
                        border: "2px solid #e74c3c",
                        borderRadius: "6px",
                        width: "32px",
                        height: "32px",
                        fontSize: "1.25rem",
                        cursor: "pointer",
                        color: "#e74c3c",
                    }}
                >
                    ✕
                </button>
            </div>

            {/* Actions List */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
                {/* Left: Actions */}
                <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "900", marginBottom: "1rem" }}>Akce</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {actions && actions.length > 0 ? (
                            actions.map((action) => (
                                <button
                                    key={action._id}
                                    onClick={() => handleSelectAction(action._id)}
                                    style={{
                                        backgroundColor: selectedAction === action._id ? "#f0f9ff" : "white",
                                        border: "3px solid #000",
                                        borderRadius: "10px",
                                        padding: "0.75rem 1rem",
                                        textAlign: "left",
                                        fontWeight: "700",
                                        fontSize: "1rem",
                                        boxShadow: "3px 3px 0 0 #000",
                                        cursor: "pointer",
                                    }}
                                >
                                    {action.name}
                                </button>
                            ))
                        ) : (
                            <p style={{ color: "#999", fontStyle: "italic" }}>Žádné akce</p>
                        )}
                    </div>
                    <button
                        onClick={handleCreateNew}
                        style={{
                            marginTop: "1rem",
                            backgroundColor: "white",
                            border: "3px solid #000",
                            borderRadius: "10px",
                            padding: "0.75rem 1rem",
                            fontWeight: "900",
                            cursor: "pointer",
                            boxShadow: "3px 3px 0 0 #000",
                            fontSize: "1rem",
                            width: "100%",
                        }}
                    >
                        ➕ Nová akce
                    </button>
                </div>

                {/* Right: Details */}
                <div
                    style={{
                        backgroundColor: "white",
                        border: "3px solid #000",
                        borderRadius: "12px",
                        padding: "1.5rem",
                        boxShadow: "6px 6px 0 0 #000",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    {isCreating || selectedAction ? (
                        <>
                            <h3 style={{ fontSize: "1.25rem", fontWeight: "900", marginTop: 0, marginBottom: "1.5rem" }}>
                                {isCreating ? "NOVÁ AKCE" : "UPRAVIT"}
                            </h3>

                            <div style={formGroupStyle}>
                                <label style={labelStyle}>NÁZEV</label>
                                <input
                                    type="text"
                                    placeholder="Název akce"
                                    value={formState.name}
                                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                                    style={inputStyle}
                                />
                            </div>

                            <div style={formGroupStyle}>
                                <label style={labelStyle}>TRIGGER</label>
                                <select
                                    value={formState.trigger}
                                    onChange={(e) => setFormState({ ...formState, trigger: e.target.value })}
                                    style={inputStyle}
                                >
                                    {TRIGGERS.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={formGroupStyle}>
                                <label style={labelStyle}>INTEGRACE</label>
                                <select
                                    value={formState.integrationId}
                                    onChange={(e) => setFormState({ ...formState, integrationId: e.target.value })}
                                    style={inputStyle}
                                >
                                    <option value="">-- Vyberte integraci --</option>
                                    {integrations?.map((i) => (
                                        <option key={i._id} value={i._id}>
                                            {i.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={formGroupStyle}>
                                <label style={labelStyle}>ZPRÁVA</label>
                                <textarea
                                    placeholder="Napište svou zprávu..."
                                    value={formState.messageTemplate}
                                    onChange={(e) => setFormState({ ...formState, messageTemplate: e.target.value })}
                                    style={{
                                        ...inputStyle,
                                        minHeight: "100px",
                                        fontFamily: "monospace",
                                        resize: "vertical",
                                    }}
                                />
                            </div>

                            <div style={{ display: "flex", gap: "1rem", marginTop: "auto" }}>
                                {!isCreating && (
                                    <button
                                        onClick={handleDelete}
                                        style={{
                                            padding: "0.75rem 1.5rem",
                                            backgroundColor: "#fecaca",
                                            border: "3px solid #000",
                                            borderRadius: "8px",
                                            fontWeight: "900",
                                            cursor: "pointer",
                                            boxShadow: "3px 3px 0 0 #000",
                                        }}
                                    >
                                        SMAZAT
                                    </button>
                                )}
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    style={{
                                        marginLeft: "auto",
                                        padding: "0.75rem 1.5rem",
                                        backgroundColor: "#86efac",
                                        border: "3px solid #000",
                                        borderRadius: "8px",
                                        fontWeight: "900",
                                        cursor: "pointer",
                                        boxShadow: "3px 3px 0 0 #000",
                                    }}
                                >
                                    {isSaving ? "UKLÁDÁ..." : isCreating ? "VYTVOŘIT" : "AKTUALIZOVAT"}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div style={{ textAlign: "center", color: "#999" }}>
                            <p style={{ fontSize: "1rem", fontWeight: "600" }}>
                                Vyberte akci nebo vytvořte novou
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Styles
const formGroupStyle = {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.5rem",
    marginBottom: "1.5rem",
};

const labelStyle = {
    fontWeight: "900",
    fontSize: "0.85rem",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
};

const inputStyle = {
    padding: "0.75rem",
    border: "3px solid #000",
    borderRadius: "8px",
    fontSize: "0.95rem",
    fontWeight: "600",
    outline: "none",
    boxShadow: "2px 2px 0 0 rgba(0,0,0,0.1)",
};

