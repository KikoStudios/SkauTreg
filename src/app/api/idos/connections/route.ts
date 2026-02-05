import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

interface Stop {
  time: string;
  station: string;
  platform?: string;
}

interface Segment {
  vehicleName: string;
  vehicleType: string;
  departureTime: string;
  arrivalTime: string;
  departureStation: string;
  arrivalStation: string;
  stops: Stop[];
}

interface Trip {
  departureTime: string;
  arrivalTime: string;
  duration: string;
  distance: string;
  transferCount: number;
  price: string;
  segments: Segment[];
  shareLink?: string;
}

function getVehicleType(vehicleName: string): string {
  const name = vehicleName.toLowerCase();
  
  if (name.startsWith('bus ')) return 'Bus';
  if (name.startsWith('trol ')) return 'Trolleybus';
  if (name.startsWith('tram ')) return 'Tram';
  if (name.includes('metro')) return 'Metro';
  
  return 'Train';
}

function parseConnections(html: string): Trip[] {
  const trips: Trip[] = [];

  try {
    const $ = cheerio.load(html);
    const connectionElements = $('div.box.connection');
    
    if (connectionElements.length === 0) {
      return [];
    }

    connectionElements.each((_idx: number, el: cheerio.Element) => {
      const $connection = $(el);

      const timeElements = $connection.find('p.time');
      const depTime = timeElements.first().text().trim();
      const arrTime = timeElements.last().text().trim();
      
      const durationText = $connection.find('p.total strong').text().trim();
      
      const priceMatch = $connection.text().match(/(\d+)\s*Kč/);
      const price = priceMatch ? priceMatch[1] + ' Kč' : 'N/A';

      const segments: Segment[] = [];
      
      $connection.find('h3 span').each((_segIdx: number, vehicleEl: cheerio.Element) => {
        const $vehicleSpan = $(vehicleEl);
        const vehicleName = $vehicleSpan.text().trim();
        
        if (!vehicleName) return;

        const $journeyContainer = $vehicleSpan.closest('div.outside-of-popup, div.journey');
        
        const $segmentTimes = $journeyContainer.find('p.time');
        const segDepTime = $segmentTimes.first().text().trim();
        const segArrTime = $segmentTimes.last().text().trim();
        
        const $stationNames = $journeyContainer.find('strong.name');
        const depStation = $stationNames.first().text().trim();
        const arrStation = $stationNames.last().text().trim();

        if (vehicleName) {
          segments.push({
            vehicleName: vehicleName,
            vehicleType: getVehicleType(vehicleName),
            departureTime: segDepTime,
            arrivalTime: segArrTime,
            departureStation: depStation,
            arrivalStation: arrStation,
            stops: []
          });
        }
      });

      if (segments.length === 0) return;

      // Extract share link from data-share-url attribute
      const shareUrl = $connection.attr('data-share-url') || '';

      const trip: Trip = {
        departureTime: depTime,
        arrivalTime: arrTime,
        duration: durationText,
        distance: 'N/A',
        transferCount: segments.length - 1,
        price: price,
        segments: segments,
        shareLink: shareUrl || undefined
      };

      trips.push(trip);
    });

    return trips;
  } catch (error) {
    console.error('Error parsing HTML:', error);
    return [];
  }
}

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
        const browserlessToken = process.env.BROWSERLESS_API_KEY;
        const browserlessBaseUrl = process.env.BROWSERLESS_URL || 'https://chrome.browserless.io';
        if (!browserlessToken) {
          throw new Error('BROWSERLESS_API_KEY environment variable not set');
        }

        let url = `https://idos.cz/vlakyautobusymhdvse/spojeni/vysledky/?f=${encodeURIComponent(from)}&t=${encodeURIComponent(to)}`;
        
        if (departureDate && departureDate.trim()) {
          url += `&date=${encodeURIComponent(departureDate)}`;
        }
        if (departureTime && departureTime.trim()) {
          url += `&time=${encodeURIComponent(departureTime)}`;
        }
        if (isArrival) {
          url += `&arr=true`;
        }

        // Fetch using Browserless (minimal payload to avoid 400s)
        const browserlessResponse = await fetch(`${browserlessBaseUrl.replace(/\/$/, '')}/content?token=${browserlessToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: url
          })
        });

        if (!browserlessResponse.ok) {
          const errorText = await browserlessResponse.text();
          throw new Error(`Browserless request failed: ${browserlessResponse.status} - ${errorText}`);
        }

        const html = await browserlessResponse.text();
        const trips = parseConnections(html);
        const seenDedupKeys = new Set<string>();
        
        // Send trips immediately
        for (const trip of trips) {
          const segmentKey = trip.segments.map(s => `${s.departureStation}-${s.arrivalStation}-${s.departureTime}-${s.arrivalTime}`).join('|');
          const key = `${trip.departureTime}|${trip.arrivalTime}|${trip.duration}|${segmentKey}`;
          if (!seenDedupKeys.has(key)) {
            seenDedupKeys.add(key);
            const data = JSON.stringify(trip) + '\n';
            controller.enqueue(encoder.encode(data));
          }
        }

        controller.close();
      } catch (error) {
        console.error('IDOS scraper error:', error);
        const errorData = JSON.stringify({ error: 'Failed to fetch connections', details: error instanceof Error ? error.message : 'Unknown error' }) + '\n';
        controller.enqueue(encoder.encode(errorData));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
