-- Harden RPC exposure after restoring the pg_dump baseline.
-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default, while the
-- baseline also carried default grants for anon/authenticated.  That made
-- SECURITY DEFINER helpers reachable through PostgREST with the anon key.

-- No anonymous RPC is required by DeskcommCRM. Authentication endpoints are
-- provided by Supabase Auth and are unaffected by these schema privileges.
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;

-- Prevent the same exposure on functions created by future migrations.
alter default privileges for role postgres in schema public
  revoke execute on functions from public;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon;

-- Trigger/admin helpers and server-side ingestion functions must never be
-- callable with an end-user JWT. They remain available to service_role and to
-- PostgreSQL when invoked by their owning triggers.
revoke execute on function public.fn_audit_log_row() from authenticated;
revoke execute on function public.fn_decrypt_oauth(bytea) from authenticated;
revoke execute on function public.fn_encrypt_oauth(text) from authenticated;
revoke execute on function public.fn_lgpd_cascade_redact_contact(uuid, uuid, uuid) from authenticated;
revoke execute on function public.fn_update_budget_consumption() from authenticated;
revoke execute on function public.fn_upsert_wa_contact(uuid, text, text, text, text, text) from authenticated;
revoke execute on function public.fn_upsert_wa_conversation(uuid, uuid, uuid) from authenticated;
revoke execute on function public.fn_mark_conversation_message(uuid, text, text, timestamptz) from authenticated;
revoke execute on function public.rls_auto_enable() from authenticated;

-- Explicitly retain the server-side contract after tightening defaults.
grant execute on function public.fn_audit_log_row() to service_role;
grant execute on function public.fn_decrypt_oauth(bytea) to service_role;
grant execute on function public.fn_encrypt_oauth(text) to service_role;
grant execute on function public.fn_lgpd_cascade_redact_contact(uuid, uuid, uuid) to service_role;
grant execute on function public.fn_update_budget_consumption() to service_role;
grant execute on function public.fn_upsert_wa_contact(uuid, text, text, text, text, text) to service_role;
grant execute on function public.fn_upsert_wa_conversation(uuid, uuid, uuid) to service_role;
grant execute on function public.fn_mark_conversation_message(uuid, text, text, timestamptz) to service_role;
