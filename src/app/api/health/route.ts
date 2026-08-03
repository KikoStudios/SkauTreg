import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  let convex: "ok" | "unavailable" = "unavailable";
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (convexUrl) {
    try {
      const response = await fetch(convexUrl, {
        method: "HEAD",
        cache: "no-store",
        signal: AbortSignal.timeout(2_000),
      });
      if (response.status < 500) convex = "ok";
    } catch {
      convex = "unavailable";
    }
  }

  return NextResponse.json(
    {
      status: convex === "ok" ? "ok" : "degraded",
      release: process.env.SENTRY_RELEASE || process.env.COMMIT_REF || "development",
      checks: {
        app: "ok",
        convex,
      },
    },
    {
      status: convex === "ok" ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
