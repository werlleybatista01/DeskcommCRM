-- Private media bucket. Browser access always passes through an authenticated
-- CRM route; only the service role uploads/downloads objects directly.
insert into storage.buckets (id, name, public, file_size_limit)
values ('whatsapp-media', 'whatsapp-media', false, 33554432)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;
