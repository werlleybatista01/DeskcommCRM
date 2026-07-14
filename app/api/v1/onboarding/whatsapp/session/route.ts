import { NextResponse } from "next/server";
import { ok, fail } from "@/lib/api/wrappers";
import { loadAuthUser, resolveActiveOrg } from "@/lib/auth/server";
import { getWahaClient } from "@/lib/waha/client";
import { decryptWahaWebhookSecret, encryptWahaWebhookSecret } from "@/lib/waha/secret";
import {
  buildSessionWebhook,
  createSessionWebhook,
  type WahaSessionWebhook,
} from "@/lib/waha/session-webhook";
import { createClient } from "@/lib/supabase/server";

/**
 * Onboarding WhatsApp session orchestration.
 *
 * GET  → returns current session status (status enum from WAHA: STARTING|SCAN_QR_CODE|WORKING|FAILED|STOPPED)
 * POST → starts session if not already running. Idempotent.
 *
 * The actual QR image is served via /api/v1/onboarding/whatsapp/qr (proxy
 * to WAHA so client can <img src="..." /> without exposing the API key).
 */

interface WahaSessionResponse {
  name?: string;
  status?: string;
  config?: Record<string, unknown>;
  me?: { id?: string; pushName?: string };
}

function defaultSessionName(orgId: string): string {
  return `org_${orgId.slice(0, 8)}`;
}

async function ensureChannelSession(
  orgId: string,
  sessionName: string,
): Promise<{ id: string; webhook: WahaSessionWebhook }> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("channel_sessions")
    .select("id, webhook_path_token, webhook_secret_encrypted")
    .eq("organization_id", orgId)
    .eq("waha_session_name", sessionName)
    .maybeSingle();
  if (existing?.id) {
    const secret = decryptWahaWebhookSecret(existing.webhook_secret_encrypted);
    return {
      id: existing.id as string,
      webhook: buildSessionWebhook(
        process.env.WAHA_WEBHOOK_BASE_URL ?? "",
        existing.webhook_path_token,
        secret,
      ),
    };
  }
  const webhookMaterial = createSessionWebhook(process.env.WAHA_WEBHOOK_BASE_URL ?? "");
  const { data: created, error } = await supabase
    .from("channel_sessions")
    .insert({
      organization_id: orgId,
      waha_session_name: sessionName,
      engine: "NOWEB",
      webhook_path_token: webhookMaterial.pathToken,
      webhook_secret_encrypted: encryptWahaWebhookSecret(webhookMaterial.hmacSecret),
      status: "STARTING",
      last_status_change_at: new Date().toISOString(),
      consecutive_health_fails: 0,
      daily_message_limit: 250,
      metadata: {},
    })
    .select("id")
    .single();
  if (error) throw new Error(`channel_session_insert_failed: ${error.message}`);
  return { id: created.id as string, webhook: webhookMaterial.webhook };
}

export async function GET() {
  const user = await loadAuthUser();
  if (!user) return fail("unauthenticated", "Sessão expirada", 401);
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) return fail("tenant_not_found", "Sem organização ativa", 404);
  const waha = getWahaClient();
  if (!waha) return ok({ status: "WAHA_NOT_CONFIGURED", session: null });
  const sessionName = defaultSessionName(activeOrg.orgId);
  try {
    const remote = (await waha.getSessionQr(sessionName)) as WahaSessionResponse;
    return ok({ status: remote.status ?? "UNKNOWN", session: sessionName });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    if (msg.includes("404")) return ok({ status: "NOT_STARTED", session: sessionName });
    return ok({ status: "ERROR", session: sessionName, error: msg });
  }
}

export async function POST() {
  const user = await loadAuthUser();
  if (!user) return fail("unauthenticated", "Sessão expirada", 401);
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) return fail("tenant_not_found", "Sem organização ativa", 404);
  const waha = getWahaClient();
  if (!waha)
    return fail(
      "waha_not_configured",
      "Suba o Docker (docker compose up -d waha) e tente novamente.",
      503,
    );
  const sessionName = defaultSessionName(activeOrg.orgId);

  // 1) Make sure we have a row in channel_sessions.
  let channelSession: Awaited<ReturnType<typeof ensureChannelSession>>;
  try {
    channelSession = await ensureChannelSession(activeOrg.orgId, sessionName);
  } catch {
    return fail(
      "waha_webhook_not_configured",
      "Não foi possível preparar o webhook seguro desta sessão.",
      503,
    );
  }

  // 2) Start the session in WAHA. Idempotent — WAHA returns 422 if already started; treat as ok.
  try {
    const remote = (await waha.startSession(sessionName, {
      webhook: channelSession.webhook,
    })) as WahaSessionResponse;
    return ok({
      status: remote.status ?? "STARTING",
      session: sessionName,
      channel_session_id: channelSession.id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    if (msg.includes("422") || msg.includes("409")) {
      // Session already exists — just fetch status.
      const remote = (await waha.getSessionQr(sessionName)) as WahaSessionResponse;
      return ok({
        status: remote.status ?? "RUNNING",
        session: sessionName,
        channel_session_id: channelSession.id,
      });
    }
    return NextResponse.json(
      { error: { code: "waha_start_failed", message: msg } },
      { status: 502 },
    );
  }
}
