// Node 22+. Plans by default; --apply requires a private Supabase access token.
import {configureAuth} from './auth-config-plan.mjs';
configureAuth(process.argv.slice(2)).catch(error=>{console.error(error.message);process.exitCode=1;});
