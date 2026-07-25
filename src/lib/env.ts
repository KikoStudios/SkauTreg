import { z } from "zod";

const placeholder = /^(change[-_ ]?me|example|placeholder|todo|tbd|lma+o+)$/i;
const realText = z.string().trim().min(2).refine((value) => !placeholder.test(value), {
  message: "must not be a placeholder",
});
const httpsUrl = z.string().url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && url.hostname !== "localhost";
}, "must be a public HTTPS URL");
const featureStage = z.enum(["off", "beta", "stable"]);

export const productionEnvSchema = z.object({
  NEXT_PUBLIC_CONVEX_URL: httpsUrl,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith("pk_live_"),
  CLERK_SECRET_KEY: z.string().startsWith("sk_live_"),
  CREDENTIAL_ENCRYPTION_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/),
  ANALYTICS_ID_SECRET: z.string().regex(/^[a-fA-F0-9]{64}$/),
  OAUTH_STATE_SECRET: z.string().regex(/^[a-fA-F0-9]{64}$/),
  NEXT_PUBLIC_LEGAL_OPERATOR_NAME: realText,
  NEXT_PUBLIC_LEGAL_OPERATOR_ADDRESS: realText,
  NEXT_PUBLIC_PRIVACY_EMAIL: z.string().email(),
  NEXT_PUBLIC_SECURITY_EMAIL: z.string().email(),
  NEXT_PUBLIC_LEGAL_EFFECTIVE_DATE: z.string().date(),
  NEXT_PUBLIC_FEATURE_FINANCE: featureStage,
  NEXT_PUBLIC_FEATURE_TRANSPORT_TICKETS: featureStage,
  NEXT_PUBLIC_FEATURE_COLLABORATIVE_MEETINGS: featureStage,
  NEXT_PUBLIC_FEATURE_FEEDBACK_HUB: featureStage,
  NEXT_PUBLIC_POSTHOG_HOST: z.literal("https://eu.i.posthog.com").optional(),
  SENTRY_DSN: httpsUrl.optional(),
  AXIOM_INGEST_URL: z.literal("https://eu-central-1.aws.edge.axiom.co").optional(),
});

export function validateProductionEnv(environment: NodeJS.ProcessEnv = process.env) {
  if (environment.NODE_ENV !== "production") return;
  const result = productionEnvSchema.safeParse(environment);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid production environment:\n${details}`);
  }
}
