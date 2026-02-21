"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import styles from "./IntegrationHub.module.css";

interface IntegrationHubProps {
    troopId: Id<"troops">;
    onNavigate: (view: "hub" | "connections" | "actions") => void;
    onSelectIntegration?: (integrationId: Id<"integrations">) => void;
}

interface ServiceButton {
    id: string;
    name: string;
}

const AVAILABLE_SERVICES: ServiceButton[] = [
    { id: "discord", name: "DISCORD" },
    { id: "email", name: "MAIL" },
    { id: "whatsapp", name: "WHATSUP SR-API" },
    { id: "custom_api", name: "OTHER" },
];

export default function IntegrationHub({ troopId, onNavigate }: IntegrationHubProps) {
    const integrations = useQuery(api.integrations.getByTroop, { troopId });
    const actions = useQuery(api.integration_actions.getByTroop, { troopId });

    return (
        <div className={styles.root}>
            {/* Welcome Section */}
            <div className={styles.welcome}>
                <h2 className={styles.title}>
                    Vítej v
                    <span className={styles.titleArrows}>
                        <img
                            src="/illustrations/illustration_arrows.png"
                            alt=""
                            className={styles.arrowsImage}
                        />
                    </span>
                    Integracích
                </h2>
                <p className={styles.subtitle}>
                    můžeš začít s:
                </p>

                {/* Service Icons */}
                <div className={styles.services}>
                    {AVAILABLE_SERVICES.map((service) => (
                        <button
                            key={service.id}
                            onClick={() => onNavigate("connections")}
                            className={styles.serviceButton}
                        >
                            {service.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Grid */}
            <div className={styles.contentGrid}>
                {/* Integrations Section */}
                <div>
                    <h3 className={styles.sectionTitle}>
                        Integrace
                    </h3>
                    <div className={styles.list}>
                        {integrations && integrations.length > 0 ? (
                            integrations.map((integration) => (
                                <button
                                    key={integration._id}
                                    className={styles.itemButton}
                                >
                                    {integration.name}
                                </button>
                            ))
                        ) : (
                            <p className={styles.emptyText}>Žádné integrace</p>
                        )}
                    </div>
                </div>

                {/* Actions Section */}
                <div>
                    <h3 className={styles.sectionTitle}>
                        Akce
                    </h3>
                    <div className={styles.list}>
                        {actions && actions.length > 0 ? (
                            actions.map((action) => (
                                <div
                                    key={action._id}
                                    className={styles.itemCard}
                                >
                                    {action.trigger}
                                </div>
                            ))
                        ) : (
                            <p className={styles.emptyText}>Žádné akce</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
