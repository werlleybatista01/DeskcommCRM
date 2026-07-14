import { randomBytes, randomUUID } from "node:crypto";

export const WAHA_SESSION_WEBHOOK_EVENTS = [
  "message",
  "message.any",
  "message.ack",
  "session.status",
  "state.change",
] as const;

export interface WahaSessionWebhook {
  url: string;
  events: string[];
  hmac: { key: string };
  retries: {
    policy: "linear";
    delaySeconds: number;
    attempts: number;
  };
}

export interface NewSessionWebhook {
  pathToken: string;
  hmacSecret: string;
  webhook: WahaSessionWebhook;
}

export function buildSessionWebhook(
  baseUrl: string,
  pathToken: string,
  hmacSecret: string,
): WahaSessionWebhook {
  const normalizedBaseUrl = baseUrl.trim().replace(/\/$/, "");
  if (!normalizedBaseUrl) throw new Error("waha_webhook_base_url_missing");

  const parsed = new URL(normalizedBaseUrl);
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
    throw new Error("waha_webhook_base_url_must_use_https");
  }
  if (!pathToken || !hmacSecret) throw new Error("waha_webhook_material_missing");

  return {
    url: `${normalizedBaseUrl}/api/v1/webhooks/waha/${pathToken}`,
    events: [...WAHA_SESSION_WEBHOOK_EVENTS],
    hmac: { key: hmacSecret },
    retries: { policy: "linear", delaySeconds: 2, attempts: 4 },
  };
}

/**
 * Creates the per-session webhook material used by the CRM-owned WAHA session.
 * The secret must be encrypted before it is persisted and must never be logged.
 */
export function createSessionWebhook(baseUrl: string): NewSessionWebhook {
  const pathToken = randomUUID().replace(/-/g, "");
  const hmacSecret = randomBytes(32).toString("hex");

  return {
    pathToken,
    hmacSecret,
    webhook: buildSessionWebhook(baseUrl, pathToken, hmacSecret),
  };
}
