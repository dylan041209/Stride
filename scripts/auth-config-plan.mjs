const project='vmzjurdxjyshlcubxcju';
export function siteCallbacks(site){
  const url=new URL(site);
  if(url.username||url.password)throw Error('Do not include credentials in the website URL.');
  if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw Error('Use HTTPS, or localhost during development.');
  url.search='';url.hash='';
  if(url.pathname.endsWith('/index.html'))url.pathname=url.pathname.slice(0,-'index.html'.length);
  else if(!url.pathname.endsWith('/')){if(/\.[^/]+$/.test(url.pathname))throw Error('Use the website directory address or index.html.');url.pathname+='/';}
  const callbacks=['','index.html'].flatMap(file=>['confirm','recovery'].map(flow=>url.href+file+'?flow='+flow));
  return {site_url:url.href,callbacks};
}
export function buildAuthConfig(site,current,requiredCharacters){
  const {site_url,callbacks}=siteCallbacks(site),previous=current.uri_allow_list??'';
  const entries=Array.isArray(previous)?previous:typeof previous==='string'?previous.split(','):null;
  if(!entries||entries.some(value=>typeof value!=='string'))throw Error('Could not interpret existing redirects. No settings were changed.');
  return {site_url,uri_allow_list:[...new Set([...entries.map(v=>v.trim()).filter(Boolean),...callbacks])].join(','),mailer_autoconfirm:false,password_min_length:8,password_required_characters:requiredCharacters};
}
export async function configureAuth(args){
  const site=args.find(arg=>!arg.startsWith('--'));
  if(!site||args.filter(arg=>!arg.startsWith('--')).length!==1||args.some(arg=>arg.startsWith('--')&&arg!=='--apply'))throw Error('Usage: node scripts/configure-supabase.mjs WEBSITE_URL [--apply]');
  const plan=siteCallbacks(site);
  if(!args.includes('--apply')){
    console.log(JSON.stringify({mode:'plan-only',project,siteURL:plan.site_url,callbacks:plan.callbacks,emailVerification:true,password:'8+ characters: uppercase, lowercase, number and symbol',existingRedirects:'Will be read and preserved when applied'},null,2));
    console.log('No settings changed. To apply, set SUPABASE_ACCESS_TOKEN privately and add --apply.');return;
  }
  const token=process.env.SUPABASE_ACCESS_TOKEN;
  if(!token)throw Error('Set SUPABASE_ACCESS_TOKEN privately before using --apply. Never paste it into chat or source control.');
  const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'},endpoint='https://api.supabase.com/v1/projects/'+project+'/config/auth';
  const [currentResponse,schemaResponse]=await Promise.all([fetch(endpoint,{headers}),fetch('https://api.supabase.com/api/v1-json')]);
  if(!currentResponse.ok||!schemaResponse.ok)throw Error('Could not read configuration/password presets. No settings changed.');
  const [current,schema]=await Promise.all([currentResponse.json(),schemaResponse.json()]);
  const required=Object.values(schema.components.schemas).flatMap(s=>s.properties?.password_required_characters?.enum||[]).find(s=>typeof s==='string'&&s.startsWith('abcdefghijklmnopqrstuvwxyz:ABCDEFGHIJKLMNOPQRSTUVWXYZ:0123456789:!'));
  if(!required)throw Error('Password presets changed. Configure the strongest preset in Authentication settings instead.');
  const body=buildAuthConfig(site,current,required);
  const response=await fetch(endpoint,{method:'PATCH',headers,body:JSON.stringify(body)});
  if(!response.ok)throw Error('Auth configuration failed ('+response.status+'). No credentials were printed.');
  console.log('Verification, password rules and all four callbacks configured. Existing redirects were preserved.');
}
