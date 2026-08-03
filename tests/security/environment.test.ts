import { describe, expect, it } from "vitest";
import { productionEnvSchema, validateProductionEnv } from "../../src/lib/env";

describe("production environment validation", () => {
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

  it("rejects the former organization-name placeholder", () => {
    const result = productionEnvSchema.safeParse({ NEXT_PUBLIC_STREDISKO_NAME: "LMAOOOOO" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((issue) => issue.path.join(".") === "NEXT_PUBLIC_STREDISKO_NAME")).toBe(true);
  });
});
