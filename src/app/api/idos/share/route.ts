import { NextRequest, NextResponse } from "next/server";
import { analyzeShareLink } from "../../../../lib/idos/shareAnalysis";
import { auth } from "@clerk/nextjs/server";

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
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Přihlášení je vyžadováno." }, { status: 401 });
  const url = request.nextUrl.searchParams.get("url") || "";
  if (!url || url.length > 2_048 || !isAllowedIdosUrl(url)) {
    return NextResponse.json({ error: "Invalid or unsupported IDOS URL" }, { status: 400 });
  }

  try {
    const trip = await analyzeShareLink(url);
    return NextResponse.json({ trip });
  } catch {
    return NextResponse.json({ error: "Odkaz IDOS se nepodařilo načíst." }, { status: 422 });
  }
}
