-- Approved-email registration. Run in Supabase SQL Editor as project owner.
-- This installs the rule but does not activate the Authentication hook.
-- Add real addresses privately in Table Editor, then enable the hook.
begin;

create table if not exists public.stride_approved_emails (
  email text primary key,
  enabled boolean not null default true,
  added_at timestamptz not null default now(),
  constraint stride_approved_email_format check (
    email = lower(btrim(email)) and email ~ '^[^@[:space:]]+@[^@[:space:]]+$'
  )
);

create or replace function public.stride_normalize_approved_email()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.email := pg_catalog.lower(pg_catalog.btrim(new.email));
  return new;
end;
$$;
revoke all on function public.stride_normalize_approved_email() from public, anon, authenticated, service_role;
drop trigger if exists stride_normalize_approved_email on public.stride_approved_emails;
create trigger stride_normalize_approved_email
before insert or update of email on public.stride_approved_emails
for each row execute function public.stride_normalize_approved_email();

alter table public.stride_approved_emails enable row level security;
revoke all on table public.stride_approved_emails from public, anon, authenticated;
grant select on table public.stride_approved_emails to supabase_auth_admin;
drop policy if exists stride_auth_read_approvals on public.stride_approved_emails;
create policy stride_auth_read_approvals on public.stride_approved_emails
for select to supabase_auth_admin using (true);

create or replace function public.stride_check_signup(event jsonb)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare signup_email text;
begin
  if pg_catalog.jsonb_typeof(event->'user'->'email') = 'string'
     and coalesce(event->'user'->>'is_anonymous','false') = 'false' then
    signup_email := pg_catalog.lower(pg_catalog.btrim(event->'user'->>'email'));
    if exists(select 1 from public.stride_approved_emails
              where email = signup_email and enabled) then
      return '{}'::jsonb;
    end if;
  end if;
  return pg_catalog.jsonb_build_object('error',pg_catalog.jsonb_build_object(
    'http_code',403,'message','STRIDE_EMAIL_NOT_APPROVED'
  ));
end;
$$;
grant usage on schema public to supabase_auth_admin;
revoke all on function public.stride_check_signup(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.stride_check_signup(jsonb) to supabase_auth_admin;
commit;
