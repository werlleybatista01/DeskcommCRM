import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = 1;
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

function encryptionKey(): Buffer {
  const raw = process.env.WAHA_BYO_ENCRYPTION_KEY ?? "";
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error("WAHA_BYO_ENCRYPTION_KEY deve conter 32 bytes em base64.");
  }
  return key;
}

/** Packs version + IV + auth tag + ciphertext into the existing bytea column. */
export function encryptWahaWebhookSecret(secret: string): string {
  if (!secret) throw new Error("waha_webhook_secret_empty");
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const packed = Buffer.concat([Buffer.from([VERSION]), iv, cipher.getAuthTag(), ciphertext]);
  return `\\x${packed.toString("hex")}`;
}

export function decryptWahaWebhookSecret(value: unknown): string {
  if (typeof value !== "string") throw new Error("waha_webhook_secret_invalid");
  const packed = Buffer.from(value.startsWith("\\x") ? value.slice(2) : value, "hex");
  if (packed.length <= 1 + IV_BYTES + TAG_BYTES || packed[0] !== VERSION) {
    throw new Error("waha_webhook_secret_invalid");
  }
  const iv = packed.subarray(1, 1 + IV_BYTES);
  const tag = packed.subarray(1 + IV_BYTES, 1 + IV_BYTES + TAG_BYTES);
  const ciphertext = packed.subarray(1 + IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
