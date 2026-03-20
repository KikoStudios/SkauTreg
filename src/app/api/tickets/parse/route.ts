import { NextResponse } from "next/server";
import { parseTransportTicketFromPdfBytes } from "../../../../lib/tickets/parseTransportTicket";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const contentType = file.type || "application/octet-stream";

    if (contentType === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const parsed = await parseTransportTicketFromPdfBytes(bytes, file.name);
      return NextResponse.json({ parsed, contentType });
    }

    // Images: no OCR/QR yet; store only what we can from filename.
    const parsed = {
      ticketCode: (() => {
        const m = file.name.match(/\b([A-Z0-9]{4}(?:-[A-Z0-9]{4}){2,3})\b/);
        return m?.[1];
      })(),
    };
    return NextResponse.json({ parsed, contentType });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Failed to parse ticket", details: e instanceof Error ? e.message : undefined },
      { status: 500 }
    );
  }
}
