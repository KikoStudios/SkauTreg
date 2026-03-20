import { NextRequest, NextResponse } from 'next/server';
import { searchTripsHttpStream } from "../../../../lib/idos/searchHttp";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const departureDate = searchParams.get('date') || '';
  const departureTime = searchParams.get('time') || '';
  const isArrival = searchParams.get('arrival') === 'true';
  const maxPages = parseInt(searchParams.get('maxPages') || '3');

  if (!from || !to) {
    return NextResponse.json({ error: 'Missing from or to parameter' }, { status: 400 });
  }

  if (from.trim().toLowerCase() === to.trim().toLowerCase()) {
    return NextResponse.json({ error: 'Departure and arrival stations cannot be the same' }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        await searchTripsHttpStream({
          from,
          to,
          date: departureDate || undefined,
          time: departureTime || undefined,
          arrival: isArrival,
          limit: maxPages ? Math.max(1, maxPages * 5) : 15,
          onTrip: async (trip) => {
            const data = JSON.stringify(trip) + "\n";
            controller.enqueue(encoder.encode(data));
          },
        });
        controller.close();
      } catch (error) {
        console.error("IDOS scraper error:", error);
        const errorData =
          JSON.stringify({ error: "Failed to fetch connections", details: error instanceof Error ? error.message : "Unknown error" }) + "\n";
        controller.enqueue(encoder.encode(errorData));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
