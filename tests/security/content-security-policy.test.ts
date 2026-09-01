import { describe, expect, it } from "vitest";
import {
  buildContentSecurityPolicy,
  clerkOriginFromPublishableKey,
  isProductionDeployment,
} from "../../src/lib/contentSecurityPolicy";

describe("content security policy", () => {
  it("derives the exact custom Clerk origin from a publishable key", () => {
    const encoded = Buffer.from("clerk.overload.studio$").toString("base64");

    expect(clerkOriginFromPublishableKey(`pk_live_${encoded}`)).toBe(
      "https://clerk.overload.studio",
    );
  });

  it("allows the custom Clerk origin in the required directives", () => {
    const policy = buildContentSecurityPolicy({
      enforce: true,
      clerkFrontendApi: "clerk.overload.studio",
    });

    expect(policy).toContain(
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.overload.studio",
    );
    expect(policy).toContain(
      "connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://*.clerk.accounts.dev https://*.clerk.com https://clerk.overload.studio",
    );
    expect(policy).toContain("upgrade-insecure-requests");
  });

  it("does not send an ignored upgrade directive in report-only mode", () => {
    const policy = buildContentSecurityPolicy({ enforce: false });
    expect(policy).not.toContain("upgrade-insecure-requests");
  });

  it("recognizes production on Vercel and Netlify", () => {
    expect(isProductionDeployment({ VERCEL_ENV: "production" })).toBe(true);
    expect(isProductionDeployment({ CONTEXT: "production" })).toBe(true);
    expect(isProductionDeployment({ VERCEL_ENV: "preview" })).toBe(false);
  });
});
