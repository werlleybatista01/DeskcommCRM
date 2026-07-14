import { afterEach, describe, expect, it } from "vitest";

import { decryptWahaWebhookSecret, encryptWahaWebhookSecret } from "./secret";
import { buildSessionWebhook, createSessionWebhook } from "./session-webhook";

describe("WAHA per-session webhook", () => {
  const previousKey = process.env.WAHA_BYO_ENCRYPTION_KEY;

  afterEach(() => {
    if (previousKey === undefined) delete process.env.WAHA_BYO_ENCRYPTION_KEY;
    else process.env.WAHA_BYO_ENCRYPTION_KEY = previousKey;
  });

  it("builds a tenant-specific HTTPS webhook with the required events", () => {
    const result = createSessionWebhook("https://crm.example.com/");

    expect(result.webhook.url).toBe(
      `https://crm.example.com/api/v1/webhooks/waha/${result.pathToken}`,
    );
    expect(result.webhook.events).toEqual([
      "message",
      "message.any",
      "message.ack",
      "session.status",
      "state.change",
    ]);
    expect(result.hmacSecret).toHaveLength(64);
    expect(result.webhook.hmac.key).toBe(result.hmacSecret);
  });

  it("rejects an insecure public webhook URL", () => {
    expect(() => buildSessionWebhook("http://crm.example.com", "token", "secret")).toThrow(
      "waha_webhook_base_url_must_use_https",
    );
  });

  it("encrypts and decrypts the HMAC secret without persisting plaintext", () => {
    process.env.WAHA_BYO_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    const plaintext = "a".repeat(64);
    const encrypted = encryptWahaWebhookSecret(plaintext);

    expect(encrypted).not.toContain(plaintext);
    expect(decryptWahaWebhookSecret(encrypted)).toBe(plaintext);
  });
});
