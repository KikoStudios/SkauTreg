"use client";

import RadyTab from "../../../components/RadyTab";
import Breadcrumbs from "../../../components/Breadcrumbs";
import FeatureGate from "../../../components/FeatureGate";

export default function RadyPage() {
    return (
        <div style={{ width: "100%", position: "relative", overflowX: "hidden", paddingBottom: "2rem" }}>
            {/* Top Title Bar */}
            <div className="headingContainer">
                <h1 style={{ fontSize: "1.5rem", fontWeight: "900", margin: 0 }}>Rady a Dokumentace</h1>
            </div>

            <div className="dashboardContent">
                <FeatureGate feature="collaborativeMeetings"><RadyTab /></FeatureGate>
            </div>
        </div>
    );
}
