import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { loadAuthUser, resolveActiveOrg } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
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

  const { data, error } = await supabase
    .from("contacts")
    .update({ is_blocked: false, blocked_reason: null, blocked_at: null })
    .eq("id", id)
    .eq("organization_id", activeOrg.orgId)
    .select("id")
    .maybeSingle();
  if (error) return fail("internal_error", "Falha ao desbloquear contato.", 500, { requestId });
  if (!data) return fail("not_found", "Contato não encontrado.", 404, { requestId });

  await audit({
    action: "contact.updated",
    actorUserId: user.id,
    organizationId: activeOrg.orgId,
    resourceType: "contact",
    resourceId: id,
    requestId,
    metadata: { source: "manual_inbox", fields: ["is_blocked", "blocked_reason", "blocked_at"] },
  });
  return ok({ id, is_blocked: false }, { requestId });
}
