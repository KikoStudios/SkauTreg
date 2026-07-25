import { createHmac } from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  const secret = process.env.ANALYTICS_ID_SECRET;
  if (!userId || !secret || !/^[a-fA-F0-9]{64}$/.test(secret)) {
    return new NextResponse(null, { status: userId ? 503 : 401 });
  }
  const id = createHmac("sha256", Buffer.from(secret, "hex"))
    .update(userId)
    .digest("base64url");
  return NextResponse.json({ id }, { headers: { "Cache-Control": "no-store" } });
}
