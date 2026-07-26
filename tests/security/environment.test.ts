import { describe, expect, it } from "vitest";
import { validateProductionEnv } from "../../src/lib/env";

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
});
