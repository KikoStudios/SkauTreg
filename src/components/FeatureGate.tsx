import type { ReactNode } from "react";
import { getFeatureStage, type FeatureKey } from "@/lib/features";

const labels: Record<FeatureKey, string> = {
  finance: "Finance a platby",
  transportTickets: "Doprava a sdílení jízdenek",
  collaborativeMeetings: "Společné zápisy a dokumenty",
  feedbackHub: "Nápady a hlášení chyb",
};

export default function FeatureGate({
  feature,
  children,
}: {
  feature: FeatureKey;
  children: ReactNode;
}) {
  const stage = getFeatureStage(feature);
  if (stage === "off") {
    return (
      <section aria-labelledby={`feature-${feature}`} style={{ padding: "2rem", textAlign: "center" }}>
        <h1 id={`feature-${feature}`}>{labels[feature]}</h1>
        <p>Tato funkce je momentálně nedostupná. Ostatní části aplikace fungují dál.</p>
      </section>
    );
  }
  return (
    <>
      {stage === "beta" && (
        <aside
          aria-label="Upozornění na beta funkci"
          style={{
            margin: ".75rem",
            padding: ".65rem .8rem",
            border: "2px solid #111",
            borderRadius: "8px",
            background: "#fff3bf",
            fontSize: ".78rem",
          }}
        >
          <strong>Beta</strong> — {labels[feature]} se stále ladí. Výsledek zkontrolujte a případné
          potíže nahlaste přes zpětnou vazbu.
        </aside>
      )}
      {children}
    </>
  );
}
