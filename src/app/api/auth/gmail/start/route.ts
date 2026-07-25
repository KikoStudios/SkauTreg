import { randomBytes } from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
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

  const clientId = process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID;
  if (!clientId) return NextResponse.redirect(new URL(`/settings/${troopId}?gmail_error=Gmail není nakonfigurován`, request.url));
  const nonce = randomBytes(32).toString("base64url");
  const state = signOAuthState({ nonce, troopId, userId, returnAction, expiresAt: Date.now() + 10 * 60_000 });
  const redirectUri = `${request.nextUrl.origin}/api/auth/gmail/callback`;
  const google = new URL("https://accounts.google.com/o/oauth2/auth");
  google.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile https://www.googleapis.com/auth/gmail.send",
    access_type: "offline",
    prompt: "consent",
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
