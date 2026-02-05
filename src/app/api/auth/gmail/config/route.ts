import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    clientId: process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID,
    redirectUri: typeof window !== 'undefined' 
      ? `${window.location.origin}/api/auth/gmail/callback`
      : '/api/auth/gmail/callback'
  });
}
