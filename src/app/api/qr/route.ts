import { NextRequest } from "next/server";
import QRCode from "qrcode";

export async function GET(req: NextRequest) {
  const dataRaw = req.nextUrl.searchParams.get("data") || "";
  const sizeParam = req.nextUrl.searchParams.get("size") || "220";
  const size = Math.max(120, Math.min(512, parseInt(sizeParam, 10) || 220));

  if (!dataRaw || dataRaw.length > 2048) {
    return new Response("Invalid data", { status: 400 });
  }

  const data = dataRaw.startsWith("/") ? `${req.nextUrl.origin}${dataRaw}` : dataRaw;

  const bytes = await QRCode.toBuffer(data, {
    type: "png",
    width: size,
    margin: 2,
    errorCorrectionLevel: "M",
  });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, s-maxage=86400, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

