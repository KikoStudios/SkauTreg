import { NextRequest, NextResponse } from 'next/server';
import { fetchSupernotesCards } from '@/lib/supernotes';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.SUPERNOTES_API_KEY;

    console.log('[Supernotes API] API key present:', !!apiKey);

    if (!apiKey) {
      console.error('[Supernotes API] API key not configured');
      return NextResponse.json(
        { error: 'Supernotes API key not configured in environment variables' },
        { status: 500 }
      );
    }

    console.log('[Supernotes API] Fetching cards...');
    const cards = await fetchSupernotesCards(apiKey);
    console.log('[Supernotes API] Successfully fetched', cards.length, 'cards');
    
    return NextResponse.json({ cards, count: cards.length });
  } catch (error: any) {
    console.error('[Supernotes API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Supernotes cards' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.SUPERNOTES_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Supernotes API key not configured' },
        { status: 500 }
      );
    }

    const { name, markup, tags } = await request.json();

    if (!name || !markup) {
      return NextResponse.json(
        { error: 'Name and markup are required' },
        { status: 400 }
      );
    }

    const response = await fetch('https://api.supernotes.app/v1/cards', {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, markup, tags }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create card: ${response.status}`);
    }

    const card = await response.json();
    return NextResponse.json({ card });
  } catch (error: any) {
    console.error('Error creating Supernotes card:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create card' },
      { status: 500 }
    );
  }
}
