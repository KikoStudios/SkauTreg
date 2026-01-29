import { NextRequest, NextResponse } from "next/server";

interface IDOSConnection {
  departure: string;
  arrival: string;
  duration: string;
  vehicle: string;
  changes: number;
}

/**
 * Search for public transport connections via iDOS API
 * 
 * Expected request body:
 * {
 *   from: "Station name or city",
 *   to: "Station name or city"
 * }
 * 
 * Returns:
 * {
 *   connections: [
 *     {
 *       departure: "HH:MM",
 *       arrival: "HH:MM",
 *       duration: "HH:MM",
 *       vehicle: "Bus/Train type",
 *       changes: number
 *     }
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { from, to } = body;

    if (!from || !to) {
      return NextResponse.json(
        { error: "Missing 'from' or 'to' parameter" },
        { status: 400 }
      );
    }

    // TODO: Implement actual iDOS API integration
    // For now, return mock data for demonstration
    const mockConnections: IDOSConnection[] = [
      {
        departure: "08:15",
        arrival: "09:45",
        duration: "01:30",
        vehicle: "RegioJet",
        changes: 0,
      },
      {
        departure: "09:30",
        arrival: "11:15",
        duration: "01:45",
        vehicle: "ČD + Bus",
        changes: 1,
      },
      {
        departure: "10:00",
        arrival: "12:00",
        duration: "02:00",
        vehicle: "Bus",
        changes: 0,
      },
      {
        departure: "11:45",
        arrival: "13:30",
        duration: "01:45",
        vehicle: "ČD Pendolino",
        changes: 0,
      },
      {
        departure: "13:15",
        arrival: "15:00",
        duration: "01:45",
        vehicle: "Bus",
        changes: 0,
      },
    ];

    return NextResponse.json({
      from,
      to,
      connections: mockConnections,
    });
  } catch (error) {
    console.error("iDOS API error:", error);
    return NextResponse.json(
      { error: "Failed to search connections" },
      { status: 500 }
    );
  }
}
