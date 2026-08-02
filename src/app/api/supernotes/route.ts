import { NextRequest, NextResponse } from 'next/server';
import { fetchSupernotesCards } from '@/lib/supernotes';
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

const cardSchema = z.object({
  name: z.string().trim().min(1).max(160),
  markup: z.string().min(1).max(20_000),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Přihlášení je vyžadováno.' }, { status: 401 });
    const apiKey = process.env.SUPERNOTES_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Supernotes API key not configured in environment variables' },
        { status: 500 }
      );
    }

    const cards = await fetchSupernotesCards(apiKey);
    
    return NextResponse.json({ cards, count: cards.length });
  } catch {
    console.error('[Supernotes API] request failed', { operation: 'supernotes_read' });
    return NextResponse.json(
      { error: 'Supernotes data se nepodařilo načíst.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Přihlášení je vyžadováno.' }, { status: 401 });
    const apiKey = process.env.SUPERNOTES_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Supernotes API key not configured' },
        { status: 500 }
      );
    }

    const parsed = cardSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Neplatný obsah karty.' }, { status: 400 });
    const { name, markup, tags } = parsed.data;

    const response = await fetch('https://api.supernotes.app/v1/cards', {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, markup, tags }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`Failed to create card: ${response.status}`);
    }

    const card = await response.json();
    return NextResponse.json({ card });
  } catch {
    console.error('[Supernotes API] request failed', { operation: 'supernotes_write' });
    return NextResponse.json(
      { error: 'Kartu se nepodařilo vytvořit.' },
      { status: 500 }
    );
  }
}
