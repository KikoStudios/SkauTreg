export type FeatureKey =
  | "finance"
  | "transportTickets"
  | "collaborativeMeetings"
  | "feedbackHub";

export type FeatureStage = "off" | "beta" | "stable";

const values: Record<FeatureKey, string | undefined> = {
  finance: process.env.NEXT_PUBLIC_FEATURE_FINANCE,
  transportTickets: process.env.NEXT_PUBLIC_FEATURE_TRANSPORT_TICKETS,
  collaborativeMeetings: process.env.NEXT_PUBLIC_FEATURE_COLLABORATIVE_MEETINGS,
  feedbackHub: process.env.NEXT_PUBLIC_FEATURE_FEEDBACK_HUB,
};

export function getFeatureStage(feature: FeatureKey): FeatureStage {
  const value = values[feature];
  if (value === "off" || value === "stable") return value;
  return "beta";
}

export function isFeatureAvailable(feature: FeatureKey) {
  return getFeatureStage(feature) !== "off";
}
