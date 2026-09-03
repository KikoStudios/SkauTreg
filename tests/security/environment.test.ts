import { describe, expect, it } from "vitest";
import { productionEnvSchema, validateProductionEnv } from "../../src/lib/env";

describe("production environment validation", () => {
  const productionEnvironment: NodeJS.ProcessEnv = {
    NODE_ENV: "production",
    VERCEL_ENV: "production",
    NEXT_PUBLIC_CONVEX_URL: "https://example.convex.cloud",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_example",
    CLERK_SECRET_KEY: "sk_live_example",
    CREDENTIAL_ENCRYPTION_KEY: "ab".repeat(32),
    ANALYTICS_ID_SECRET: "cd".repeat(32),
    APP_ORIGIN: "https://skautreg.example.cz",
    NEXT_PUBLIC_STREDISKO_NAME: "Testovací středisko",
    NEXT_PUBLIC_LEGAL_OPERATOR_NAME: "Testovací provozovatel",
    NEXT_PUBLIC_PRIVACY_EMAIL: "privacy@example.cz",
    NEXT_PUBLIC_SECURITY_EMAIL: "security@example.cz",
    NEXT_PUBLIC_LEGAL_EFFECTIVE_DATE: "2026-07-25",
    NEXT_PUBLIC_FEATURE_FINANCE: "beta",
    NEXT_PUBLIC_FEATURE_TRANSPORT_TICKETS: "beta",
    NEXT_PUBLIC_FEATURE_COLLABORATIVE_MEETINGS: "beta",
    NEXT_PUBLIC_FEATURE_FEEDBACK_HUB: "beta",
  };

  it.each([
    { VERCEL_ENV: "preview" },
    { CONTEXT: "deploy-preview" },
    { CONTEXT: "branch-deploy" },
  ])("allows an isolated hosted preview without production secrets", (hosting) => {
    expect(() =>
      validateProductionEnv({
        NODE_ENV: "production",
        ...hosting,
      }),
    ).not.toThrow();
  });

  it("still rejects a real production deployment without required values", () => {
    expect(() =>
      validateProductionEnv({
        NODE_ENV: "production",
        VERCEL_ENV: "production",
      }),
    ).toThrow("Invalid production environment");
  });

  it("does not require legacy Google OAuth credentials for Gmail SMTP", () => {
    expect(() => validateProductionEnv(productionEnvironment)).not.toThrow();
    expect(() => validateProductionEnv({
      ...productionEnvironment,
      OAUTH_STATE_SECRET: "",
      NEXT_PUBLIC_GMAIL_CLIENT_ID: "",
      NEXT_PUBLIC_GMAIL_OAUTH_VERIFICATION_STATUS: "",
      GMAIL_CLIENT_SECRET: "",
    })).not.toThrow();
  });

  it("rejects the former organization-name placeholder", () => {
    const result = productionEnvSchema.safeParse({ NEXT_PUBLIC_STREDISKO_NAME: "LMAOOOOO" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((issue) => issue.path.join(".") === "NEXT_PUBLIC_STREDISKO_NAME")).toBe(true);
  });
});
