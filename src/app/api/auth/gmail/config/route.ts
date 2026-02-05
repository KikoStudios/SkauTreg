import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    clientId: process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID,
    redirectUri: '/api/auth/gmail/callback'
  });
}
