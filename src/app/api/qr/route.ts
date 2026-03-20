import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const dataRaw = req.nextUrl.searchParams.get("data") || "";
  const sizeParam = req.nextUrl.searchParams.get("size") || "220";
  const size = Math.max(120, Math.min(512, parseInt(sizeParam, 10) || 220));

  if (!dataRaw || dataRaw.length > 2048) {
    return new Response("Invalid data", { status: 400 });
  }

  const data = dataRaw.startsWith("/") ? `${req.nextUrl.origin}${dataRaw}` : dataRaw;

  const upstream = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
  const r = await fetch(upstream, { cache: "force-cache" });
  if (!r.ok) {
    return new Response("QR upstream failed", { status: 502 });
  }

  const bytes = await r.arrayBuffer();
  return new Response(bytes, {
    headers: {
      "Content-Type": r.headers.get("content-type") || "image/png",
      "Cache-Control": "public, max-age=86400, s-maxage=86400, immutable",
    },
  });
}

