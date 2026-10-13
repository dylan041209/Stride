-- Run after approved-emails.sql in Supabase SQL Editor as project owner.
-- Test rows use reserved .invalid addresses. All changes are rolled back.
-- Hosted projects may prohibit SET ROLE supabase_auth_admin. This script
-- checks logic as the function owner and inspects grants/policies by name.
begin;
insert into public.stride_approved_emails(email,enabled) values
('  Stride-Approval-Test@Example.Invalid  ',true),
('stride-disabled-test@example.invalid',false);

do $$ begin
  if not exists(select 1 from public.stride_approved_emails where email='stride-approval-test@example.invalid') then
    raise exception 'FAIL: approval address was not normalized';
  end if;
end $$;

do $$
declare result jsonb; address text;
begin
  result := public.stride_check_signup('{"user":{"email":"STRIDE-APPROVAL-TEST@example.invalid"}}');
  if result <> '{}'::jsonb then raise exception 'FAIL: approved address rejected'; end if;
  foreach address in array array['stride-disabled-test@example.invalid','stride-stranger-test@example.invalid','stride-approval-test+alias@example.invalid'] loop
    result := public.stride_check_signup(jsonb_build_object('user',jsonb_build_object('email',address)));
    if result#>>'{error,message}' is distinct from 'STRIDE_EMAIL_NOT_APPROVED' then
      raise exception 'FAIL: unapproved or disabled address accepted';
    end if;
  end loop;
  result := public.stride_check_signup('{"user":{"email":"stride-approval-test@example.invalid","is_anonymous":true}}');
  if result#>>'{error,http_code}' is distinct from '403' then raise exception 'FAIL: anonymous signup accepted'; end if;
  result := public.stride_check_signup('{"user":{"user_metadata":{"approved":true}}}');
  if result#>>'{error,http_code}' is distinct from '403' then raise exception 'FAIL: missing email/client approval flag accepted'; end if;
  result := public.stride_check_signup('{"user":{"email":"stride-stranger-test@example.invalid","user_metadata":{"approved":true,"email":"stride-approval-test@example.invalid"}}}');
  if result#>>'{error,http_code}' is distinct from '403' then raise exception 'FAIL: forged metadata bypassed root email check'; end if;
end $$;

do $$
declare actor text;
begin
  foreach actor in array array['anon','authenticated'] loop
    if has_table_privilege(actor,'public.stride_approved_emails','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then
      raise exception 'FAIL: % has approval-list privileges',actor;
    end if;
    if has_function_privilege(actor,'public.stride_check_signup(jsonb)','EXECUTE') then
      raise exception 'FAIL: % can probe the approval hook',actor;
    end if;
  end loop;
  if not has_schema_privilege('supabase_auth_admin','public','USAGE')
     or not has_table_privilege('supabase_auth_admin','public.stride_approved_emails','SELECT')
     or not has_function_privilege('supabase_auth_admin','public.stride_check_signup(jsonb)','EXECUTE') then
    raise exception 'FAIL: authentication service is missing required grants';
  end if;
  if not exists(select 1 from pg_class where oid='public.stride_approved_emails'::regclass and relrowsecurity) then
    raise exception 'FAIL: approval-list RLS is disabled';
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='stride_approved_emails'
      and policyname='stride_auth_read_approvals' and cmd='SELECT'
      and roles=array['supabase_auth_admin']::name[] and qual='true') then
    raise exception 'FAIL: authentication read policy is missing or changed';
  end if;
end $$;
select 'PASS: approved-email rules and list permissions' as result;
rollback;
-- A pass checks owner-executed logic and the configured grants/policy.
-- Actual signup through the enabled Auth hook remains a separate live test.
