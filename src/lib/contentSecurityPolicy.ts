const defaultClerkOrigins = [
  "https://*.clerk.accounts.dev",
  "https://*.clerk.com",
];

function normalizeHttpsOrigin(value: string | undefined): string | null {
  if (!value) return null;

  try {
    const candidate = value.includes("://") ? value : `https://${value}`;
    const url = new URL(candidate);
    if (url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function clerkOriginFromPublishableKey(
  publishableKey: string | undefined,
): string | null {
  if (!publishableKey) return null;

  const encodedFrontendApi = publishableKey.replace(/^pk_(?:test|live)_/, "");
  if (encodedFrontendApi === publishableKey) return null;

  try {
    const frontendApi = Buffer.from(encodedFrontendApi, "base64url")
      .toString("utf8")
      .replace(/\$$/, "");
    return normalizeHttpsOrigin(frontendApi);
  } catch {
    return null;
  }
}

export function buildContentSecurityPolicy(options: {
  enforce: boolean;
  clerkPublishableKey?: string;
  clerkFrontendApi?: string;
}): string {
  const customClerkOrigin =
    normalizeHttpsOrigin(options.clerkFrontendApi) ??
    clerkOriginFromPublishableKey(options.clerkPublishableKey);
  const clerkOrigins = [...defaultClerkOrigins, customClerkOrigin]
    .filter((origin): origin is string => Boolean(origin));
  const clerkSources = Array.from(new Set(clerkOrigins)).join(" ");

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${clerkSources}`,
    `connect-src 'self' https://*.convex.cloud wss://*.convex.cloud ${clerkSources} https://eu.i.posthog.com https://*.sentry.io`,
    `frame-src 'self' ${clerkSources}`,
    "worker-src 'self' blob:",
  ];

  if (options.enforce) directives.push("upgrade-insecure-requests");

  return directives.join("; ");
}

export function isProductionDeployment(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  return (
    environment.VERCEL_ENV === "production" ||
    environment.CONTEXT === "production"
  );
}
