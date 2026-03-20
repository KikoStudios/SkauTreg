import { NextRequest, NextResponse } from "next/server";
import { analyzeShareLink } from "../../../../lib/idos/shareAnalysis";

function isAllowedIdosUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    if (host === "idos.cz") return true;
    if (host === "idos.idnes.cz") return true;
    if (host.endsWith(".idos.cz")) return true;
    if (host.endsWith(".idos.idnes.cz")) return true;
    return false;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url") || "";
  if (!url || !isAllowedIdosUrl(url)) {
    return NextResponse.json({ error: "Invalid or unsupported IDOS URL" }, { status: 400 });
  }

  try {
    const trip = await analyzeShareLink(url);
    return NextResponse.json({ trip });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Failed to parse shared link", details: e instanceof Error ? e.message : undefined },
      { status: 500 }
    );
  }
}
