import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";

import { fail } from "@/lib/api/wrappers";
import { loadAuthUser, resolveActiveOrg } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getWahaClient } from "@/lib/waha/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function safeFilename(value: unknown): string {
  if (typeof value !== "string") return "arquivo";
  return value.replace(/[\r\n"\\/]/g, "_").slice(0, 180) || "arquivo";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const requestId = randomUUID();
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("unauthenticated", "Auth required.", 401, { requestId });

  const authUser = await loadAuthUser();
  const activeOrg = authUser ? await resolveActiveOrg(authUser) : null;
  if (!activeOrg) return fail("no_active_org", "No active organization.", 403, { requestId });

  const { data: message, error } = await supabase
    .from("messages")
    .select("id, organization_id, media_url, media_mime, media_storage_path, metadata")
    .eq("id", id)
    .eq("organization_id", activeOrg.orgId)
    .maybeSingle();
  if (error || !message) return fail("not_found", "Mídia não encontrada.", 404, { requestId });

  try {
    let source: Response;
    if (message.media_storage_path) {
      const admin = createAdminClient();
      const { data, error: storageError } = await admin.storage
        .from("whatsapp-media")
        .download(message.media_storage_path);
      if (storageError || !data) throw new Error("media_storage_unavailable");
      source = new Response(data, { headers: { "content-type": data.type } });
    } else if (message.media_url) {
      const waha = getWahaClient();
      if (!waha) throw new Error("waha_not_configured");
      source = await waha.downloadMedia(message.media_url);
    } else {
      return fail("not_found", "Mensagem sem mídia disponível.", 404, { requestId });
    }

    const metadata = message.metadata as Record<string, unknown> | null;
    const filename = safeFilename(metadata?.media_filename);
    const headers = new Headers();
    const contentType =
      message.media_mime ?? source.headers.get("content-type") ?? "application/octet-stream";
    const disposition = /^(image|audio|video)\//.test(contentType) ? "inline" : "attachment";
    headers.set("Content-Type", contentType);
    headers.set("Content-Disposition", `${disposition}; filename="${filename}"`);
    headers.set("Cache-Control", "private, max-age=300");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Content-Security-Policy", "default-src 'none'; sandbox");
    if (!source.body) throw new Error("media_empty");
    return new Response(source.body, { status: 200, headers });
  } catch {
    return fail("not_found", "A mídia expirou ou está indisponível no WAHA.", 404, { requestId });
  }
}
