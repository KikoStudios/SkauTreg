import { NextRequest, NextResponse } from "next/server";
import updatesConfig from "@/config/updates.json";

type Update = {
  version: string;
  title: string;
  tags: string[];
  description: string;
  releaseDate: string;
  id?: string;
};

export async function GET(request: NextRequest) {
  try {
    const updates: Update[] = updatesConfig.updates.map((update, index) => ({
      ...update,
      id: `update-${update.version}`,
    }));

    // Sort by version (newest first)
    updates.sort((a, b) => compareVersions(b.version, a.version));

    const latestVersion = updates.length > 0 ? updates[0].version : null;

    return NextResponse.json({
      success: true,
      updates,
      latestVersion,
      total: updates.length,
    });
  } catch (error) {
    console.error("[Local Updates] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to load updates",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

function compareVersions(a: string, b: string): number {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;

  const aParts = a.split(".").map((value) => Number(value));
  const bParts = b.split(".").map((value) => Number(value));

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i += 1) {
    const aPart = aParts[i] || 0;
    const bPart = bParts[i] || 0;

    if (aPart > bPart) return 1;
    if (aPart < bPart) return -1;
  }

  return 0;
}
