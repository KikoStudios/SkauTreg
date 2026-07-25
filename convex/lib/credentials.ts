const PREFIX = "enc:v1:";
const TAG_BYTES = 16;

function getKeyBytes() {
  const value = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!value || !/^[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY must be a 64-character hexadecimal key.");
  }
  return Uint8Array.from(value.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16));
}

function encodeBase64Url(bytes: Uint8Array) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index];
    const b = bytes[index + 1];
    const c = bytes[index + 2];
    output += alphabet[a >> 2];
    output += alphabet[((a & 3) << 4) | ((b ?? 0) >> 4)];
    if (b !== undefined) output += alphabet[((b & 15) << 2) | ((c ?? 0) >> 6)];
    if (c !== undefined) output += alphabet[c & 63];
  }
  return output;
}

function decodeBase64Url(value: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const bytes: number[] = [];
  let accumulator = 0;
  let bits = 0;
  for (const character of value) {
    const digit = alphabet.indexOf(character);
    if (digit < 0) throw new Error("Invalid encrypted credential.");
    accumulator = (accumulator << 6) | digit;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((accumulator >> bits) & 255);
    }
  }
  return Uint8Array.from(bytes);
}

async function importKey() {
  return crypto.subtle.importKey("raw", getKeyBytes(), "AES-GCM", false, ["encrypt", "decrypt"]);
}

export function isEncryptedCredential(value: string | undefined): value is string {
  return Boolean(value?.startsWith(PREFIX));
}

export async function encryptCredential(value: string | undefined) {
  if (value === undefined || isEncryptedCredential(value)) return value;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      await importKey(),
      new TextEncoder().encode(value),
    ),
  );
  const ciphertext = encrypted.slice(0, -TAG_BYTES);
  const tag = encrypted.slice(-TAG_BYTES);
  return `${PREFIX}${encodeBase64Url(iv)}:${encodeBase64Url(ciphertext)}:${encodeBase64Url(tag)}`;
}

export async function decryptCredential(value: string | undefined) {
  if (value === undefined || !isEncryptedCredential(value)) return value;
  const [ivValue, ciphertextValue, tagValue] = value.slice(PREFIX.length).split(":");
  if (!ivValue || !ciphertextValue || !tagValue) throw new Error("Invalid encrypted credential.");
  const iv = decodeBase64Url(ivValue);
  const ciphertext = decodeBase64Url(ciphertextValue);
  const tag = decodeBase64Url(tagValue);
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext);
  combined.set(tag, ciphertext.length);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    await importKey(),
    combined,
  );
  return new TextDecoder().decode(plaintext);
}
