import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {PGlite}=createRequire(import.meta.url)('@electric-sql/pglite');
const db=new PGlite();
try{
 await db.exec('create role anon; create role authenticated; create role service_role; create role supabase_auth_admin;');
 const setup=fs.readFileSync(new URL('../supabase/approved-emails.sql',import.meta.url),'utf8');
 await db.exec(setup);await db.exec(setup);
 const results=await db.exec(fs.readFileSync(new URL('../supabase/verify-approved-emails.sql',import.meta.url),'utf8'));
 assert(results.some(result=>result.rows?.some(row=>row.result==='PASS: approved-email rules and list permissions')));
 const count=await db.query('select count(*)::integer as count from public.stride_approved_emails');assert.equal(count.rows[0].count,0);
 const grants=await db.query("select has_function_privilege('anon','public.stride_check_signup(jsonb)','EXECUTE') as anon, has_function_privilege('authenticated','public.stride_check_signup(jsonb)','EXECUTE') as authenticated, has_function_privilege('supabase_auth_admin','public.stride_check_signup(jsonb)','EXECUTE') as auth");
 assert.deepEqual(grants.rows[0],{anon:false,authenticated:false,auth:true});
 console.log('Passed: PostgreSQL approval hook, case/space normalization, rejection of outsiders/disabled/aliases/anonymous/forged metadata, hidden approval list, blocked self-approval, repeated setup and rolled-back test data.');
}finally{await db.close();}
