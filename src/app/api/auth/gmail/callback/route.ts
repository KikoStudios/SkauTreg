import { NextRequest, NextResponse } from 'next/server';

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
  const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID;
  const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;

  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const redirectUri = `${req.nextUrl.origin}/api/auth/gmail/callback`;

  // Parse state to get troopId early for use in all redirects
  let troopId = null;
  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
      troopId = decoded.troopId;
    } catch (e) {
      console.error('Failed to decode state:', e);
    }
  }

  const getRedirectUrl = (errorOrParams: string) => {
    const path = troopId ? `/settings/${troopId}` : '/settings';
    return `${path}?${errorOrParams}`;
  };

  // Handle errors from Google
  if (error) {
    const errorDescription = searchParams.get('error_description') || error;
    console.error('Gmail OAuth Error:', errorDescription);
    return NextResponse.redirect(
      new URL(
        getRedirectUrl(`gmail_error=${encodeURIComponent(errorDescription)}`),
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
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange error:', errorData);
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

    // Success: Redirect to settings page with connection params
    const successParams = new URLSearchParams({
      gmail_connected: 'true',
      email,
      refresh_token: refreshToken,
    });

    return NextResponse.redirect(
      new URL(getRedirectUrl(successParams.toString()), req.url)
    );
  } catch (error: any) {
    console.error('Gmail callback error:', error);
    return NextResponse.redirect(
      new URL(
        getRedirectUrl(`gmail_error=${encodeURIComponent(error.message || 'Neznámá chyba')}`),
        req.url
      )
    );
  }
}
