import { afterEach, describe, expect, it } from "vitest";
import { signOAuthState, verifyOAuthState } from "../../src/lib/oauthState";

const originalSecret = process.env.OAUTH_STATE_SECRET;

afterEach(() => {
  if (originalSecret === undefined) delete process.env.OAUTH_STATE_SECRET;
  else process.env.OAUTH_STATE_SECRET = originalSecret;
});

describe("Gmail OAuth state", () => {
  it("signs, verifies, and rejects tampered state", () => {
    process.env.OAUTH_STATE_SECRET = "ab".repeat(32);
    const state = signOAuthState({ nonce: "nonce", troopId: "troop", userId: "user", returnAction: "", expiresAt: Date.now() + 60_000 });
    expect(verifyOAuthState(state).troopId).toBe("troop");
    expect(() => verifyOAuthState(`${state.slice(0, -1)}x`)).toThrow();
  });

  it("rejects expired state", () => {
    process.env.OAUTH_STATE_SECRET = "cd".repeat(32);
    const state = signOAuthState({ nonce: "nonce", troopId: "troop", userId: "user", returnAction: "", expiresAt: Date.now() - 1 });
    expect(() => verifyOAuthState(state)).toThrow("Expired OAuth state");
  });
});
