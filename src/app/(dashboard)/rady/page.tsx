"use client";

import RadyTab from "../../../components/RadyTab";

export default function RadyPage() {
    return (
        <div style={{ width: "100%", position: "relative", overflowX: "hidden", paddingBottom: "2rem" }}>
            {/* Top Title Bar */}
            <div style={{
                backgroundColor: "white",
                borderBottom: "3px solid #000",
                padding: "1rem 2rem",
                margin: "0 -2rem 2rem -2rem",
                width: "calc(100% + 4rem)",
                display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
                <h1 style={{ fontSize: "1.5rem", fontWeight: "900", margin: 0 }}>Rady a Dokumentace</h1>
            </div>

            <RadyTab />
        </div>
    );
}
