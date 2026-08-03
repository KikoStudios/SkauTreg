import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { parseTransportTicketFromPdfBytes } from "../../../../lib/tickets/parseTransportTicket";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

function detectedType(bytes: Uint8Array) {
  if (bytes.length >= 5 && new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-") return "application/pdf";
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte)) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if (
    bytes.length >= 12 &&
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
  ) return "image/webp";
  return null;
}

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (declaredLength > MAX_FILE_BYTES + 256_000) {
    return NextResponse.json({ error: "Soubor je příliš velký." }, { status: 413 });
  }

  try {
    const { userId, getToken } = await auth();
    if (!userId) return NextResponse.json({ error: "Přihlášení je vyžadováno." }, { status: 401 });
    const token = await getToken({ template: "convex" });
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!token || !convexUrl) return NextResponse.json({ error: "Služba není dostupná." }, { status: 503 });

    const form = await request.formData();
    const file = form.get("file");
    const tripId = form.get("tripId");
    if (!(file instanceof File) || typeof tripId !== "string") {
      return NextResponse.json({ error: "Chybí soubor nebo výprava." }, { status: 400 });
    }
    if (file.size < 1 || file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "Soubor musí mít nejvýše 10 MB." }, { status: 413 });
    }

    const client = new ConvexHttpClient(convexUrl);
    client.setAuth(token);
    await client.query(api.transportTickets.authorizeParsing, { tripId: tripId as Id<"trips"> });
    await client.mutation(api.rateLimits.consume, { operation: "ticket_parse" });

    const bytes = new Uint8Array(await file.arrayBuffer());
    const contentType = detectedType(bytes);
    if (!contentType || !ALLOWED_TYPES.has(contentType) || (file.type && file.type !== contentType)) {
      return NextResponse.json({ error: "Podporovány jsou pouze PDF, PNG, JPEG a WebP." }, { status: 415 });
    }

    if (contentType === "application/pdf") {
      const parsed = await Promise.race([
        parseTransportTicketFromPdfBytes(bytes, file.name),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("PARSE_TIMEOUT")), 12_000)),
      ]);
      return NextResponse.json({ parsed, contentType });
    }

    const code = file.name.match(/\b([A-Z0-9]{4}(?:-[A-Z0-9]{4}){2,3})\b/)?.[1];
    return NextResponse.json({ parsed: { ticketCode: code }, contentType });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = /FORBIDDEN/.test(message) ? 403 : /RATE_LIMITED/.test(message) ? 429 : /PARSE_TIMEOUT/.test(message) ? 408 : 422;
    return NextResponse.json(
      { error: status === 429 ? "Příliš mnoho požadavků." : "Jízdenku se nepodařilo bezpečně přečíst." },
      { status },
    );
  }
}
