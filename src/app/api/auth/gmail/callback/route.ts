import { createHash } from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { fetchMutation } from "convex/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { verifyOAuthState } from "../../../../../lib/oauthState";

type GmailOAuthErrorCode =
  | "OAUTH_CANCELLED"
  | "OAUTH_ADMIN_BLOCKED"
  | "OAUTH_INVALID_STATE"
  | "OAUTH_SESSION_EXPIRED"
  | "OAUTH_NOT_CONFIGURED"
  | "OAUTH_TOKEN_EXCHANGE_FAILED"
  | "OAUTH_SCOPE_MISSING"
  | "OAUTH_EMAIL_UNAVAILABLE"
  | "OAUTH_CONNECTION_FAILED";

function allowedOrigin(requestOrigin: string) {
  const origins = [
    process.env.APP_ORIGIN,
    process.env.STAGING_ORIGIN,
    process.env.NODE_ENV !== "production" ? requestOrigin : undefined,
  ].filter((value): value is string => Boolean(value)).map((value) => value.replace(/\/$/, ""));
  return origins.includes(requestOrigin) ? requestOrigin : null;
}

function redirect(req: NextRequest, troopId: string | null, params: Record<string, string>) {
  const origin = allowedOrigin(req.nextUrl.origin) ?? process.env.APP_ORIGIN ?? req.nextUrl.origin;
  const url = new URL(troopId ? `/settings/${troopId}` : "/settings", origin);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = NextResponse.redirect(url);
  response.cookies.delete("skautreg_oauth_nonce");
  return response;
}

function errorRedirect(req: NextRequest, troopId: string | null, code: GmailOAuthErrorCode) {
  return redirect(req, troopId, { gmail_error_code: code });
}

export async function GET(req: NextRequest) {
  if (!allowedOrigin(req.nextUrl.origin)) return errorRedirect(req, null, "OAUTH_INVALID_STATE");

  const authData = await auth();
  const state = req.nextUrl.searchParams.get("state");
  let troopId: string | null = null;
  let returnAction = "";
  let nonceHash = "";

  try {
    if (!state) throw new Error("Missing state");
    const decoded = verifyOAuthState(state);
    const nonce = req.cookies.get("skautreg_oauth_nonce")?.value;
    if (!nonce || nonce !== decoded.nonce || authData.userId !== decoded.userId) throw new Error("State mismatch");
    troopId = decoded.troopId;
    returnAction = decoded.returnAction;
    nonceHash = createHash("sha256").update(decoded.nonce).digest("hex");
  } catch {
    return errorRedirect(req, troopId, "OAUTH_INVALID_STATE");
  }

  const googleError = req.nextUrl.searchParams.get("error");
  if (googleError) {
    const adminBlocked = googleError === "admin_policy_enforced" || googleError === "access_not_configured";
    return errorRedirect(req, troopId, adminBlocked ? "OAUTH_ADMIN_BLOCKED" : "OAUTH_CANCELLED");
  }

  const code = req.nextUrl.searchParams.get("code");
  if (!code) return errorRedirect(req, troopId, "OAUTH_TOKEN_EXCHANGE_FAILED");

  const clientId = process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  if (!clientId || !clientSecret) return errorRedirect(req, troopId, "OAUTH_NOT_CONFIGURED");

  const token = await authData.getToken({ template: "convex" });
  if (!authData.userId || !token || !troopId) return errorRedirect(req, troopId, "OAUTH_SESSION_EXPIRED");

  try {
    // This both rechecks owner/main-leader permission and consumes the nonce once.
    await fetchMutation(api.gmailOAuthStates.consume, {
      nonceHash,
      troopId: troopId as Id<"troops">,
    }, { token });

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: `${req.nextUrl.origin}/api/auth/gmail/callback`,
      }).toString(),
      signal: AbortSignal.timeout(10_000),
    });
    if (!tokenResponse.ok) return errorRedirect(req, troopId, "OAUTH_TOKEN_EXCHANGE_FAILED");

    const tokens = await tokenResponse.json() as {
      refresh_token?: string;
      access_token?: string;
      scope?: string;
    };
    if (!tokens.refresh_token || !tokens.access_token) return errorRedirect(req, troopId, "OAUTH_TOKEN_EXCHANGE_FAILED");
    if (!tokens.scope?.split(" ").includes("https://www.googleapis.com/auth/gmail.send")) {
      return errorRedirect(req, troopId, "OAUTH_SCOPE_MISSING");
    }

    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      signal: AbortSignal.timeout(8_000),
    });
    if (!userInfoResponse.ok) return errorRedirect(req, troopId, "OAUTH_EMAIL_UNAVAILABLE");
    const userInfo = await userInfoResponse.json() as { email?: string; email_verified?: boolean };
    const email = userInfo.email?.trim().toLowerCase();
    if (!email || userInfo.email_verified !== true || !/^\S+@\S+\.\S+$/.test(email)) {
      return errorRedirect(req, troopId, "OAUTH_EMAIL_UNAVAILABLE");
    }

    await fetchMutation(api.troops.connectEmailProvider, {
      troopId: troopId as Id<"troops">,
      provider: "gmail",
      email,
      refreshToken: tokens.refresh_token,
    }, { token });

    const params: Record<string, string> = { gmail_connected: "true" };
    if (returnAction) params.returnAction = returnAction;
    return redirect(req, troopId, params);
  } catch {
    console.error("Gmail OAuth callback failed", { operation: "gmail_oauth_callback" });
    return errorRedirect(req, troopId, "OAUTH_CONNECTION_FAILED");
  }
}
