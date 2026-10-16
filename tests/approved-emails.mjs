import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {PGlite}=createRequire(import.meta.url)('@electric-sql/pglite');
const setup=fs.readFileSync(new URL('../supabase/approved-emails.sql',import.meta.url),'utf8');
const roles='create role anon; create role authenticated; create role service_role; create role supabase_auth_admin;';
const db=new PGlite();
try{
 await db.exec(roles);
 await db.exec('create role stride_test_owner nosuperuser; alter schema public owner to stride_test_owner; set session authorization stride_test_owner;');
 await db.exec(setup);await db.exec(setup);
 await assert.rejects(db.exec('set role supabase_auth_admin;'),error=>error.code==='42501');
 const results=await db.exec(fs.readFileSync(new URL('../supabase/verify-approved-emails.sql',import.meta.url),'utf8'));
 assert(results.some(result=>result.rows?.some(row=>row.result==='PASS: approved-email rules and list permissions')));
 const count=await db.query('select count(*)::integer as count from public.stride_approved_emails');assert.equal(count.rows[0].count,0);
 const grants=await db.query("select has_function_privilege('anon','public.stride_check_signup(jsonb)','EXECUTE') as anon, has_function_privilege('authenticated','public.stride_check_signup(jsonb)','EXECUTE') as authenticated, has_function_privilege('supabase_auth_admin','public.stride_check_signup(jsonb)','EXECUTE') as auth");
 assert.deepEqual(grants.rows[0],{anon:false,authenticated:false,auth:true});
}finally{await db.close();}
const privileged=new PGlite();
try{
 await privileged.exec(roles);await privileged.exec(setup);
 await privileged.exec(fs.readFileSync(new URL('./approved-role-checks.sql',import.meta.url),'utf8'));
 assert.equal((await privileged.query('select count(*)::integer as count from public.stride_approved_emails')).rows[0].count,0);
 console.log('Passed: hosted-style owner cannot assume Auth role, owner-compatible verification, separate privileged local role isolation checks, approval rules, repeat setup and rolled-back test data.');
}finally{await privileged.close();}
