-- Run AFTER setup.sql in the Supabase SQL Editor as project owner.
-- Temporary test users and records are rolled back; no emails are sent.
begin;
insert into auth.users(id,email,email_confirmed_at) values
('00000000-0000-4000-8000-000000000001','stride-test-a@example.invalid',now()),
('00000000-0000-4000-8000-000000000002','stride-test-b@example.invalid',now()),
('00000000-0000-4000-8000-000000000003','stride-test-unverified@example.invalid',null);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.stride_save_state('{"version":1,"sessions":[],"courses":[],"tasks":[],"plans":[],"topics":[],"rewards":[],"goal":180,"selectedSubjects":["Politics","Biology","Engineering"],"subjectColours":{},"setupStage":"complete"}'::jsonb,0);
do $$ begin
  if (select count(*) from public.stride_state) <> 1 then raise exception 'Owner read failed'; end if;
  begin
    perform public.stride_save_state('{"version":1,"sessions":[],"courses":[],"tasks":[],"plans":[],"topics":[],"rewards":[],"goal":180,"selectedSubjects":["Politics","Biology","Engineering"],"subjectColours":{},"setupStage":"complete"}'::jsonb,0);
    raise exception 'Revision conflict was accepted';
  exception when serialization_failure then null; end;
  begin
    update public.stride_state set state=state;
    raise exception 'Direct update was accepted';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ begin
  if (select count(*) from public.stride_state) <> 0 then raise exception 'Account B can read account A'; end if;
end $$;
select public.stride_save_state('{"version":1,"sessions":[],"courses":[],"tasks":[],"plans":[],"topics":[],"rewards":[],"goal":120,"selectedSubjects":["Maths","Physics","Chemistry"],"subjectColours":{},"setupStage":"complete"}'::jsonb,0);
do $$ begin
  if (select count(*) from public.stride_state) <> 1 then raise exception 'B cannot read own row or can read A'; end if;
  if exists(select 1 from public.stride_state where user_id='00000000-0000-4000-8000-000000000001') then raise exception 'Cross-account read allowed'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
do $$ begin
  if (select count(*) from public.stride_state) <> 0 then raise exception 'Unverified read allowed'; end if;
  begin
    perform public.stride_save_state('{"version":1,"sessions":[],"courses":[],"tasks":[],"plans":[],"topics":[],"rewards":[],"goal":180,"selectedSubjects":[],"subjectColours":{},"setupStage":"subjects"}'::jsonb,0);
    raise exception 'Unverified write allowed';
  exception when insufficient_privilege then null; end;
end $$;
set local role anon;
do $$ begin
  begin
    perform state from public.stride_state;
    raise exception 'Anonymous read allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
-- Success with no errors means the isolation assertions passed.
