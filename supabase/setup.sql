-- Stride account storage. Run once in the project's Supabase SQL Editor.
-- No passwords, access tokens or secret API keys are stored in this table.
begin;

create or replace function public.stride_verified()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from auth.users
    where id = (select auth.uid()) and email_confirmed_at is not null);
$$;
revoke all on function public.stride_verified() from public, anon;
grant execute on function public.stride_verified() to authenticated;

create or replace function public.stride_valid_state(s jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare k text; chosen jsonb; stage text; count_subjects integer;
begin
  if s is null or jsonb_typeof(s) <> 'object' or s->>'version' <> '1' then return false; end if;
  stage := s->>'setupStage';
  if stage is null or stage not in ('subjects','goal','complete') then return false; end if;
  foreach k in array array['sessions','courses','tasks','plans','topics','rewards','selectedSubjects'] loop
    if jsonb_typeof(s->k) is distinct from 'array' then return false; end if;
    if jsonb_array_length(s->k) > 10000 then return false; end if;
  end loop;
  chosen := s->'selectedSubjects';
  count_subjects := jsonb_array_length(chosen);
  if (stage = 'subjects' and count_subjects not in (0,3)) or
     (stage in ('goal','complete') and count_subjects <> 3) then return false; end if;
  if (select count(distinct value) from jsonb_array_elements_text(chosen)) <> count_subjects then return false; end if;
  if exists (select 1 from jsonb_array_elements_text(chosen) as t(value) where value <> all(array[
    'Art & Design','Biology','Business Studies','Chemistry','Criminology','English Literature',
    'Engineering','Geography','Health & Social Care','History','ICT','Maths','Medical Science',
    'Physics','Politics','Product Design','Psychology','Sociology','Spanish','Sport','Theatre Studies'
  ])) then return false; end if;
  if s->'goal' is distinct from 'null'::jsonb then
    if coalesce(s->>'goal','') !~ '^[0-9]+$' then return false; end if;
    if (s->>'goal')::numeric < 1 or (s->>'goal')::numeric > 10080 then return false; end if;
  end if;
  if jsonb_typeof(s->'subjectColours') is distinct from 'object' then return false; end if;
  if exists(select 1 from jsonb_each_text(s->'subjectColours') as t(key,value)
    where value <> all(array['purple','red','green','blue','amber','teal','rose'])) then return false; end if;
  if octet_length(s::text) > 10000000 then return false; end if;
  return true;
exception when others then return false;
end;
$$;

create table if not exists public.stride_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null check(public.stride_valid_state(state)),
  revision bigint not null default 1 check(revision > 0),
  updated_at timestamptz not null default now()
);
alter table public.stride_state enable row level security;
revoke all on table public.stride_state from public, anon, authenticated;
grant select on table public.stride_state to authenticated;
drop policy if exists stride_read_own_state on public.stride_state;
create policy stride_read_own_state on public.stride_state for select to authenticated
  using (user_id = (select auth.uid()) and (select public.stride_verified()));

-- Writes always use the caller's ID; clients cannot supply another account's ID.
-- Revision checks prevent one device from silently overwriting another device.
create or replace function public.stride_save_state(p_state jsonb, p_expected_revision bigint)
returns bigint language plpgsql security definer set search_path = '' as $$
declare caller uuid; current_revision bigint; new_revision bigint;
begin
  caller := auth.uid();
  if caller is null or not public.stride_verified() then
    raise exception 'Verified sign-in required' using errcode = '42501';
  end if;
  if not public.stride_valid_state(p_state) then
    raise exception 'Invalid Stride data' using errcode = '22023';
  end if;
  -- Lock the account even before its first row exists, including across devices.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller::text,0));
  select revision into current_revision from public.stride_state where user_id = caller for update;
  if current_revision is null then
    if p_expected_revision is distinct from 0 then raise exception 'STRIDE_CONFLICT' using errcode='40001'; end if;
    insert into public.stride_state(user_id,state) values(caller,p_state) returning revision into new_revision;
  else
    if current_revision is distinct from p_expected_revision then raise exception 'STRIDE_CONFLICT' using errcode='40001'; end if;
    update public.stride_state set state=p_state,revision=revision+1,updated_at=now()
      where user_id=caller returning revision into new_revision;
  end if;
  return new_revision;
end;
$$;
revoke all on function public.stride_save_state(jsonb,bigint) from public, anon;
grant execute on function public.stride_save_state(jsonb,bigint) to authenticated;
commit;
