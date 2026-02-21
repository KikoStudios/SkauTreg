"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import { useFeedback } from "../context/FeedbackContext";

interface ConnectionsManagerProps {
    troopId: Id<"troops">;
}

type ServiceType = "discord" | "email" | "whatsapp" | "custom_api";

interface FormState {
    name: string;
    serviceType: ServiceType;
    webhookUrl: string;
    webhookName: string;
    emailProvider: string;
    emailAddress: string;
    phoneNumber: string;
}

const INITIAL_FORM: FormState = {
    name: "",
    serviceType: "discord",
    webhookUrl: "",
    webhookName: "",
    emailProvider: "smtp",
    emailAddress: "",
    phoneNumber: "",
};

const SERVICE_ICONS: Record<ServiceType, string> = {
    discord: "🎙️",
    email: "📧",
    whatsapp: "💬",
    custom_api: "🔌",
};

export default function ConnectionsManager({ troopId }: ConnectionsManagerProps) {
    const integrations = useQuery(api.integrations.getByTroop, { troopId });
    const createIntegration = useMutation(api.integrations.create);
    const updateIntegration = useMutation(api.integrations.update);
    const deleteIntegration = useMutation(api.integrations.deleteIntegration);
    const testIntegration = useMutation(api.integrations.testIntegration);

    const { showSuccess, showError } = useFeedback();

    const [formState, setFormState] = useState<FormState>(INITIAL_FORM);
    const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

    const handleCreateNew = () => {
        setSelectedIntegration(null);
        setFormState(INITIAL_FORM);
        setIsCreating(true);
    };

    const handleSelectIntegration = (id: string) => {
        const integration = integrations?.find((i) => i._id === id);
        if (integration) {
            setSelectedIntegration(id);
            setFormState({
                name: integration.name,
                serviceType: integration.serviceType as ServiceType,
                webhookUrl: integration.webhookUrl || "",
                webhookName: integration.webhookName || "",
                emailProvider: integration.emailProvider || "smtp",
                emailAddress: integration.emailAddress || "",
                phoneNumber: integration.phoneNumber || "",
            });
            setIsCreating(false);
        }
    };

    const handleSave = async () => {
        if (!formState.name.trim()) {
            showError({ title: "Validation Error", message: "Please enter a name for this integration" });
            return;
        }

        setIsSaving(true);
        try {
            if (selectedIntegration) {
                // Update existing
                await updateIntegration({
                    integrationId: selectedIntegration as Id<"integrations">,
                    name: formState.name,
                    serviceType: formState.serviceType,
                    webhookUrl: formState.webhookUrl || undefined,
                    webhookName: formState.webhookName || undefined,
                    emailProvider: formState.emailProvider || undefined,
                    emailAddress: formState.emailAddress || undefined,
                    phoneNumber: formState.phoneNumber || undefined,
                });
                showSuccess({ title: "Success", message: "Integration updated!" });
            } else {
                // Create new
                await createIntegration({
                    troopId,
                    name: formState.name,
                    serviceType: formState.serviceType,
                    configPayload: JSON.stringify({
                        webhookUrl: formState.webhookUrl,
                        emailProvider: formState.emailProvider,
                    }),
                    webhookUrl: formState.webhookUrl || undefined,
                    webhookName: formState.webhookName || undefined,
                    emailProvider: formState.emailProvider || undefined,
                    emailAddress: formState.emailAddress || undefined,
                    phoneNumber: formState.phoneNumber || undefined,
                });
                showSuccess({ title: "Success", message: "Integration created!" });
                setIsCreating(false);
                setFormState(INITIAL_FORM);
            }
        } catch (error) {
            showError({
                title: "Error",
                message: error instanceof Error ? error.message : "Failed to save integration",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleTest = async () => {
        if (!selectedIntegration) {
            showError({ title: "Error", message: "Please save the integration first before testing" });
            return;
        }

        setIsTesting(true);
        try {
            const result = await testIntegration({
                integrationId: selectedIntegration as Id<"integrations">,
                testMessage: "✅ SkauTreg integration test - funktioniert!",
            });

            if (result.success) {
                showSuccess({ title: "Test Successful", message: "Integration is working correctly!" });
            } else {
                showError({ title: "Test Failed", message: result.error || "Integration test failed" });
            }
        } catch (error) {
            showError({
                title: "Error",
                message: error instanceof Error ? error.message : "Test failed",
            });
        } finally {
            setIsTesting(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedIntegration) return;

        if (!window.confirm("Are you sure you want to delete this integration? All associated actions will be disabled.")) {
            return;
        }

        try {
            await deleteIntegration({
                integrationId: selectedIntegration as Id<"integrations">,
            });
            showSuccess({ title: "Deleted", message: "Integration has been removed" });
            setSelectedIntegration(null);
            setIsCreating(false);
        } catch (error) {
            showError({
                title: "Error",
                message: error instanceof Error ? error.message : "Failed to delete integration",
            });
        }
    };

    const renderFieldsForService = () => {
        switch (formState.serviceType) {
            case "discord":
                return (
                    <div style={formGroupStyle}>
                        <label style={labelStyle}>WEBHOOK</label>
                        <input
                            type="password"
                            placeholder="https://discord.com/api/webhooks/..."
                            value={formState.webhookUrl}
                            onChange={(e) => setFormState({ ...formState, webhookUrl: e.target.value })}
                            style={inputStyle}
                        />
                    </div>
                );
            case "email":
                return (
                    <div style={formGroupStyle}>
                        <label style={labelStyle}>EMAIL ADDRESS</label>
                        <input
                            type="email"
                            placeholder="noreply@skautreg.cz"
                            value={formState.emailAddress}
                            onChange={(e) => setFormState({ ...formState, emailAddress: e.target.value })}
                            style={inputStyle}
                        />
                    </div>
                );
            case "whatsapp":
                return (
                    <div style={formGroupStyle}>
                        <label style={labelStyle}>PHONE NUMBER</label>
                        <input
                            type="tel"
                            placeholder="+420 775 123 456"
                            value={formState.phoneNumber}
                            onChange={(e) => setFormState({ ...formState, phoneNumber: e.target.value })}
                            style={inputStyle}
                        />
                    </div>
                );
            case "custom_api":
                return (
                    <div style={formGroupStyle}>
                        <label style={labelStyle}>WEBHOOK</label>
                        <input
                            type="url"
                            placeholder="https://your-api.example.com/webhook"
                            value={formState.webhookUrl}
                            onChange={(e) => setFormState({ ...formState, webhookUrl: e.target.value })}
                            style={inputStyle}
                        />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", width: "100%" }}>
            {/* Left: Integration List */}
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                    maxHeight: "70vh",
                    overflowY: "auto",
                }}
            >
                <h3 style={{ fontSize: "1.1rem", fontWeight: "900", margin: 0 }}>Integrace</h3>
                {integrations && integrations.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {integrations.map((integration) => (
                            <button
                                key={integration._id}
                                onClick={() => handleSelectIntegration(integration._id)}
                                style={{
                                    padding: "0.75rem 1rem",
                                    backgroundColor: selectedIntegration === integration._id ? "#f0f9ff" : "white",
                                    border: "3px solid #000",
                                    borderRadius: "10px",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    fontWeight: "700",
                                    fontSize: "1rem",
                                    boxShadow: "3px 3px 0 0 #000",
                                    transition: "all 0.2s",
                                }}
                                onMouseDown={(e) => {
                                    (e.currentTarget as HTMLElement).style.transform = "translate(2px, 2px)";
                                }}
                                onMouseUp={(e) => {
                                    (e.currentTarget as HTMLElement).style.transform = "translate(0, 0)";
                                }}
                            >
                                {SERVICE_ICONS[integration.serviceType as ServiceType]} {integration.name}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div style={{ textAlign: "center", padding: "2rem 1rem", color: "#999" }}>
                        Žádné integrace
                    </div>
                )}
                <button
                    onClick={handleCreateNew}
                    style={{
                        padding: "0.75rem 1rem",
                        backgroundColor: "white",
                        border: "3px solid #000",
                        borderRadius: "10px",
                        fontWeight: "900",
                        cursor: "pointer",
                        boxShadow: "3px 3px 0 0 #000",
                        fontSize: "1rem",
                        marginTop: "0.5rem",
                    }}
                >
                    ➕ Nová integrace
                </button>
            </div>

            {/* Right: Form/Details */}
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
                {isCreating || selectedIntegration ? (
                    <>
                        {/* Header with delete/edit buttons */}
                        {!isCreating && selectedIntegration && (
                            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", justifyContent: "flex-end" }}>
                                <button
                                    onClick={handleTest}
                                    disabled={isTesting}
                                    style={{
                                        background: "none",
                                        border: "2px solid #000",
                                        borderRadius: "6px",
                                        padding: "0.5rem 0.75rem",
                                        cursor: "pointer",
                                        fontSize: "1rem",
                                    }}
                                    title="Test integration"
                                >
                                    ✏️
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isSaving}
                                    style={{
                                        background: "none",
                                        border: "2px solid #e74c3c",
                                        borderRadius: "6px",
                                        padding: "0.5rem 0.75rem",
                                        cursor: "pointer",
                                        fontSize: "1rem",
                                        color: "#e74c3c",
                                    }}
                                    title="Delete integration"
                                >
                                    ✕
                                </button>
                            </div>
                        )}

                        <h3 style={{ fontSize: "1.25rem", fontWeight: "900", marginTop: 0, marginBottom: "1.5rem" }}>
                            {isCreating ? "NOVÁ INTEGRACE" : "UPRAVIT"}
                        </h3>

                        {/* Type Dropdown */}
                        {isCreating && (
                            <div style={formGroupStyle}>
                                <label style={labelStyle}>TYPE</label>
                                <select
                                    value={formState.serviceType}
                                    onChange={(e) => setFormState({ ...formState, serviceType: e.target.value as ServiceType })}
                                    style={inputStyle}
                                >
                                    <option value="discord">DISCORD</option>
                                    <option value="email">EMAIL</option>
                                    <option value="whatsapp">WHATSAPP</option>
                                    <option value="custom_api">OTHER</option>
                                </select>
                            </div>
                        )}

                        {/* Connection Type Dropdown (for webhook-based) */}
                        {(formState.serviceType === "discord" || formState.serviceType === "custom_api") && (
                            <div style={formGroupStyle}>
                                <label style={labelStyle}>CONNECTION TYPE</label>
                                <select
                                    defaultValue="webhook"
                                    style={inputStyle}
                                >
                                    <option value="webhook">WEBHOOK</option>
                                </select>
                            </div>
                        )}

                        {/* Service-Specific Fields */}
                        {renderFieldsForService()}

                        {/* Integration Name */}
                        <div style={formGroupStyle}>
                            <label style={labelStyle}>NAME</label>
                            <input
                                type="text"
                                placeholder="Enter integration name"
                                value={formState.name}
                                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                                style={inputStyle}
                            />
                        </div>

                        {/* Save Button */}
                        <button
                            onClick={handleSave}
                            disabled={isSaving || isTesting}
                            style={{
                                marginTop: "auto",
                                padding: "0.75rem 1.5rem",
                                backgroundColor: "#86efac",
                                border: "3px solid #000",
                                borderRadius: "8px",
                                fontWeight: "900",
                                cursor: "pointer",
                                boxShadow: "3px 3px 0 0 #000",
                                fontSize: "1rem",
                            }}
                        >
                            {isSaving ? "SAVING..." : isCreating ? "CREATE" : "UPDATE"}
                        </button>
                    </>
                ) : (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            height: "100%",
                            color: "#999",
                            textAlign: "center",
                        }}
                    >
                        <p style={{ fontSize: "1rem", fontWeight: "600" }}>
                            Vyberte integraci nebo vytvořte novou
                        </p>
                    </div>
                )}
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
