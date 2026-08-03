import { createHmac, timingSafeEqual } from "node:crypto";

export type OAuthState = {
  nonce: string;
  troopId: string;
  userId: string;
  returnAction: string;
  expiresAt: number;
};

function secret() {
  const value = process.env.OAUTH_STATE_SECRET;
  if (!value || !/^[a-fA-F0-9]{64}$/.test(value)) throw new Error("OAuth state is not configured.");
  return Buffer.from(value, "hex");
}

export function signOAuthState(payload: OAuthState) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyOAuthState(value: string): OAuthState {
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) throw new Error("Invalid OAuth state.");
  const expected = createHmac("sha256", secret()).update(encoded).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error("Invalid OAuth state.");
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as OAuthState;
  if (payload.expiresAt < Date.now()) throw new Error("Expired OAuth state.");
  return payload;
}
