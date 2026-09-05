import type { NextConfig } from "next";
import { validateProductionEnv } from "./src/lib/env";
import {
  buildContentSecurityPolicy,
  isProductionDeployment,
} from "./src/lib/contentSecurityPolicy";

validateProductionEnv();

const enforceCsp = isProductionDeployment();
const csp = buildContentSecurityPolicy({
  enforce: enforceCsp,
  clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  clerkFrontendApi: process.env.NEXT_PUBLIC_CLERK_FRONTEND_API,
});

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    root: __dirname,
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
      },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
      {
        key: enforceCsp
          ? "Content-Security-Policy"
          : "Content-Security-Policy-Report-Only",
        value: csp,
      },
    ];
    if (enforceCsp) {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
