// Run locally with SUPABASE_ACCESS_TOKEN set in your own environment.
// Never commit or paste that personal token into the website or chat.
// Node 22+ required. This only changes the project's Auth configuration.
const token=process.env.SUPABASE_ACCESS_TOKEN;
const site=process.argv[2];
if(!token||!site)throw Error('Set SUPABASE_ACCESS_TOKEN and pass the full hosted Stride URL.');
const url=new URL(site);
if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw Error('Use HTTPS, or localhost during development.');
url.search='';url.hash='';
// Copy the exact supported strongest preset from Supabase's public API schema.
const schemaResponse=await fetch('https://api.supabase.com/api/v1-json');
if(!schemaResponse.ok)throw Error('Could not check the supported password presets.');
const schema=await schemaResponse.json();
const required=Object.values(schema.components.schemas).flatMap(s=>s.properties?.password_required_characters?.enum||[]).find(s=>typeof s==='string'&&s.startsWith('abcdefghijklmnopqrstuvwxyz:ABCDEFGHIJKLMNOPQRSTUVWXYZ:0123456789:!'));
if(!required)throw Error('Supabase password presets changed. Configure the strongest character preset in Authentication settings instead.');
const r=await fetch('https://api.supabase.com/v1/projects/vmzjurdxjyshlcubxcju/config/auth',{
method:'PATCH',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
body:JSON.stringify({site_url:url.href,uri_allow_list:url.href+'?flow=confirm,'+url.href+'?flow=recovery',mailer_autoconfirm:false,password_min_length:8,password_required_characters:required})
});
if(!r.ok)throw Error('Auth configuration failed ('+r.status+'). No credentials were printed.');
console.log('Verification, password policy and redirect URLs configured for '+url.href);
