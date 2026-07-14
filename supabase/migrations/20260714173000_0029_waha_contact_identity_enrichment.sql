-- Enrich WhatsApp contacts with remote profile data while preserving LID identity.
alter table public.contacts add column if not exists avatar_url text;

create or replace function public.fn_upsert_wa_contact(
  p_org uuid, p_kind text, p_phone text, p_lid text, p_chat_id text, p_notify text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_lid is not null then
    select id into v_id
    from public.contacts
    where organization_id = p_org
      and is_merged_into is null
      and source_metadata->>'waha_lid' = regexp_replace(p_lid, '@.*$', '')
    limit 1
    for update;

    if v_id is not null then
      update public.contacts set
        phone_number = coalesce(case when p_kind = 'phone' then p_phone end, phone_number),
        display_name = coalesce(nullif(p_notify, ''), display_name),
        source_metadata = source_metadata || jsonb_strip_nulls(jsonb_build_object(
          'waha_lid', regexp_replace(p_lid, '@.*$', ''),
          'waha_chat_id', p_chat_id,
          'notify_name', nullif(p_notify, '')
        )),
        updated_at = now()
      where id = v_id;
      return v_id;
    end if;
  end if;

  insert into public.contacts (
    organization_id, phone_number, source, consent, tags, source_metadata, display_name
  ) values (
    p_org,
    case when p_kind = 'phone' then p_phone end,
    'whatsapp',
    '{}'::jsonb,
    '{}'::text[],
    jsonb_strip_nulls(jsonb_build_object(
      'waha_lid', case when p_lid is not null then regexp_replace(p_lid, '@.*$', '') end,
      'waha_chat_id', p_chat_id,
      'notify_name', nullif(p_notify, '')
    )),
    nullif(p_notify, '')
  )
  on conflict (organization_id, wa_identity) where wa_identity is not null and is_merged_into is null
  do update set
    display_name = coalesce(excluded.display_name, contacts.display_name),
    source_metadata = contacts.source_metadata || excluded.source_metadata,
    updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.fn_upsert_wa_contact(uuid, text, text, text, text, text) from public;
revoke execute on function public.fn_upsert_wa_contact(uuid, text, text, text, text, text) from anon;
revoke execute on function public.fn_upsert_wa_contact(uuid, text, text, text, text, text) from authenticated;
grant execute on function public.fn_upsert_wa_contact(uuid, text, text, text, text, text) to service_role;
