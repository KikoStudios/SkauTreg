import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@clerk/nextjs/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "../../../../../../convex/_generated/api";
import { verifyOAuthState } from "../../../../../lib/oauthState";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { createHash } from "node:crypto";

/**
 * Gmail OAuth Callback Handler
 * 
 * Flow:
 * 1. User clicks "Propojit Gmail"
 * 2. Redirected to Google login
 * 3. User approves
 * 4. Google redirects here with authorization code
 * 5. We exchange code for refresh token
 * 6. Store refresh token in Convex
 * 7. Redirect back to settings page
 */
export async function GET(req: NextRequest) {
  const GMAIL_CLIENT_ID = process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID;
  const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;

  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const redirectUri = `${req.nextUrl.origin}/api/auth/gmail/callback`;

  const authData = await auth();
  let troopId: string | null = null;
  let returnAction = "";
  let nonceHash = "";
  try {
    if (!state) throw new Error("Missing state");
    const decoded = verifyOAuthState(state);
    const nonce = req.cookies.get("skautreg_oauth_nonce")?.value;
    if (!nonce || nonce !== decoded.nonce || authData.userId !== decoded.userId) {
      throw new Error("State mismatch");
    }
    troopId = decoded.troopId;
    returnAction = decoded.returnAction;
    nonceHash = createHash("sha256").update(decoded.nonce).digest("hex");
  } catch {
    return NextResponse.redirect(new URL("/settings?gmail_error=Neplatný nebo expirovaný OAuth požadavek", req.url));
  }

  const getRedirectUrl = (errorOrParams: string) => {
    const path = troopId ? `/settings/${troopId}` : '/settings';
    const separator = errorOrParams ? '?' : '';
    return `${path}${separator}${errorOrParams}`;
  };

  // Handle errors from Google
  if (error) {
    console.error('Gmail OAuth was rejected', { operation: 'gmail_oauth' });
    return NextResponse.redirect(
      new URL(
        getRedirectUrl(`gmail_error=${encodeURIComponent('Připojení ke Gmailu bylo zrušeno')}`),
        req.url
      )
    );
  }

  // Validate we got the code
  if (!code) {
    console.error('No authorization code received');
    return NextResponse.redirect(
      new URL(
        getRedirectUrl('gmail_error=Neobdržen autorizační kód'),
        req.url
      )
    );
  }

  try {
    // Use server-side client credentials
    if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
      console.error('Missing Gmail configuration');
      return NextResponse.redirect(
        new URL(
          getRedirectUrl('gmail_error=Chyba konfigurace Gmail'),
          req.url
        )
      );
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GMAIL_CLIENT_ID,
        client_secret: GMAIL_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }).toString(),
      signal: AbortSignal.timeout(10_000),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json() as { error_description?: string };
      return NextResponse.redirect(
        new URL(
          getRedirectUrl(`gmail_error=${encodeURIComponent(
            errorData.error_description || 'Chyba při výměně tokenu'
          )}`),
          req.url
        )
      );
    }

    const tokens = await tokenResponse.json();
    const refreshToken = tokens.refresh_token;
    const accessToken = tokens.access_token;

    if (!refreshToken) {
      console.error('No refresh token in response');
      return NextResponse.redirect(
        new URL(
          getRedirectUrl('gmail_error=Neobdržen refresh token. Zkuste znovu s prompt=consent'),
          req.url
        )
      );
    }

    // Get user email from Google
    let email: string | undefined;

    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(8_000),
      }
    );

    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      email = userInfo.email;
    }

    // Fallback: try to read email from id_token (JWT)
    if (!email && tokens.id_token) {
      try {
        const payload = tokens.id_token.split('.')[1];
        const padded = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(payload.length + (4 - (payload.length % 4)) % 4, '=');
        const decoded = JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'));
        email = decoded.email;
      } catch (e) {
        console.error('Failed to decode id_token for email', e);
      }
    }

    if (!email) {
      console.error('Failed to get user info');
      return NextResponse.redirect(
        new URL(
          getRedirectUrl('gmail_error=Nelze načíst informace o uživateli'),
          req.url
        )
      );
    }

    if (!troopId) {
      return NextResponse.redirect(
        new URL(
          getRedirectUrl("gmail_error=Chybí identifikace oddílu pro dokončení propojení"),
          req.url
        )
      );
    }

    const token = await authData.getToken({ template: "convex" });

    if (!authData.userId || !token) {
      return NextResponse.redirect(
        new URL(
          getRedirectUrl("gmail_error=Relace vypršela. Přihlaste se znovu a opakujte propojení."),
          req.url
        )
      );
    }

    await fetchMutation(api.gmailOAuthStates.consume, {
      nonceHash,
      troopId: troopId as Id<"troops">,
    }, { token });

    await fetchMutation(
      api.troops.connectEmailProvider,
      {
        troopId: troopId as Id<"troops">,
        provider: "gmail",
        email,
        refreshToken,
      },
      { token }
    );

    const successParams = new URLSearchParams({
      gmail_connected: 'true',
      email,
    });
    if (returnAction) {
      successParams.set('returnAction', returnAction);
    }

    const response = NextResponse.redirect(new URL(getRedirectUrl(successParams.toString()), req.url));
    response.cookies.delete("skautreg_oauth_nonce");
    return response;
  } catch {
    return NextResponse.redirect(new URL(getRedirectUrl("gmail_error=Propojení se nepodařilo"), req.url));
  }
}
