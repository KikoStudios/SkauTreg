"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import IntegrationsTab from "../../../../components/IntegrationsTab";

export default function IntegrationsPage() {
    const troops = useQuery(api.troops.getByUser);
    const troopId = troops?.[0]?._id as Id<"troops"> | undefined;

    if (!troopId) {
        return <div>Načítám...</div>;
    }

    return (
        <div style={{ width: "100%", position: "relative", overflowX: "hidden", paddingBottom: "2rem" }}>
            {/* Content */}
            <div style={{ padding: "0 2rem" }}>
                <IntegrationsTab troopId={troopId} />
            </div>
        </div>
    );
}
