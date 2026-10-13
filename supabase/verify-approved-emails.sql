-- Run after approved-emails.sql in Supabase SQL Editor as project owner.
-- Test rows use reserved .invalid addresses. All changes are rolled back.
begin;
insert into public.stride_approved_emails(email,enabled) values
('  Stride-Approval-Test@Example.Invalid  ',true),
('stride-disabled-test@example.invalid',false);

do $$ begin
  if not exists(select 1 from public.stride_approved_emails where email='stride-approval-test@example.invalid') then
    raise exception 'FAIL: approval address was not normalized';
  end if;
end $$;

set local role supabase_auth_admin;
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
reset role;

set local role anon;
do $$ begin
  begin perform 1 from public.stride_approved_emails; raise exception 'FAIL: anonymous can read approvals'; exception when insufficient_privilege then null; end;
  begin perform public.stride_check_signup('{"user":{"email":"stride-approval-test@example.invalid"}}'); raise exception 'FAIL: anonymous can probe approval hook'; exception when insufficient_privilege then null; end;
end $$;
reset role;

set local role authenticated;
do $$ begin
  begin perform 1 from public.stride_approved_emails; raise exception 'FAIL: account can read approvals'; exception when insufficient_privilege then null; end;
  begin insert into public.stride_approved_emails(email) values('stride-self-approved@example.invalid'); raise exception 'FAIL: account can approve itself'; exception when insufficient_privilege then null; end;
  begin perform public.stride_check_signup('{"user":{"email":"stride-approval-test@example.invalid"}}'); raise exception 'FAIL: account can probe approval hook'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: approved-email rules and list permissions' as result;
rollback;
