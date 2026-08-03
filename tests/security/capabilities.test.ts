import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { generateSecureToken } from "../../convex/lib/tokens";

describe("public capabilities", () => {
  it("generates 256-bit base64url tokens without padding", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateSecureToken()));
    expect(tokens.size).toBe(100);
    for (const token of tokens) expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("does not use Math.random for capability generation", async () => {
    const [tokenSource, ticketSource] = await Promise.all([
      readFile("convex/lib/tokens.ts", "utf8"),
      readFile("convex/transportTickets.ts", "utf8"),
    ]);
    expect(tokenSource).not.toContain("Math.random");
    expect(ticketSource).not.toContain("Math.random");
  });

  it("generates QR codes locally", async () => {
    const source = await readFile("src/app/api/qr/route.ts", "utf8");
    expect(source).toContain('from "qrcode"');
    expect(source).not.toContain("api.qrserver.com");
    expect(source).not.toMatch(/\bfetch\s*\(/);
  });
});
