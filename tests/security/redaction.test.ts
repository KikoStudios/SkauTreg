import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("secret redaction and public DTOs", () => {
  it("keeps troop directory opt-in and minimal", async () => {
    const source = await readFile("convex/troops.ts", "utf8");
    expect(source).toContain("publicDirectoryOptIn === true");
    expect(source).toContain("_id: t._id");
    expect(source).not.toMatch(/listPublic[\s\S]*contactEmail[\s\S]*return troopsWithUrls/);
  });

  it("does not return integration secret fields", async () => {
    const source = await readFile("convex/integrations.ts", "utf8");
    expect(source).toContain("publicIntegration");
    expect(source).toContain("configPayload: _configPayload");
    expect(source).toContain("webhookUrl: _webhookUrl");
  });
});
