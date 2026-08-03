import { createHash, randomBytes } from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { signOAuthState } from "../../../../../lib/oauthState";

export async function GET(request: NextRequest) {
  const { userId, getToken } = await auth();
  const troopId = request.nextUrl.searchParams.get("troopId");
  const requestedAction = request.nextUrl.searchParams.get("returnAction");
  const returnAction = requestedAction === "groups-import" ? requestedAction : "";
  if (!userId || !troopId) return NextResponse.redirect(new URL("/sign-in", request.url));
  const token = await getToken({ template: "convex" });
  if (!token) return NextResponse.redirect(new URL("/sign-in", request.url));
  const role = await fetchQuery(api.troops.getMyRole, { troopId: troopId as Id<"troops"> }, { token });
  if (role !== "owner" && role !== "main_leader") {
    return NextResponse.redirect(new URL(`/settings/${troopId}?gmail_error=Nemáte oprávnění`, request.url));
  }

  const requestOrigin = request.nextUrl.origin;
  const allowedOrigins = new Set([
    process.env.APP_ORIGIN,
    process.env.STAGING_ORIGIN,
    process.env.NODE_ENV !== "production" ? requestOrigin : undefined,
  ].filter((value): value is string => Boolean(value)).map((value) => value.replace(/\/$/, "")));
  if (!allowedOrigins.has(requestOrigin)) {
    return NextResponse.redirect(new URL(`/settings/${troopId}?gmail_error=Propojení Gmailu je dostupné na stagingu`, request.url));
  }

  const clientId = process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID;
  if (!clientId) return NextResponse.redirect(new URL(`/settings/${troopId}?gmail_error=Gmail není nakonfigurován`, request.url));
  const nonce = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + 10 * 60_000;
  const state = signOAuthState({ nonce, troopId, userId, returnAction, expiresAt });
  await fetchMutation(api.gmailOAuthStates.create, {
    nonceHash: createHash("sha256").update(nonce).digest("hex"),
    troopId: troopId as Id<"troops">,
    expiresAt,
  }, { token });
  const redirectUri = `${requestOrigin}/api/auth/gmail/callback`;
  const google = new URL("https://accounts.google.com/o/oauth2/auth");
  google.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile https://www.googleapis.com/auth/gmail.send",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  }).toString();
  const response = NextResponse.redirect(google);
  response.cookies.set("skautreg_oauth_nonce", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/gmail/callback",
    maxAge: 600,
  });
  return response;
}
