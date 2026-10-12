/* Account access, onboarding and cloud persistence for the static Stride site. */
window.StrideAccount = (() => {
  'use strict';
  const catalogue = ['Art & Design','Biology','Business Studies','Chemistry','Criminology','English Literature','Engineering','Geography','Health & Social Care','History','ICT','Maths','Medical Science','Physics','Politics','Product Design','Psychology','Sociology','Spanish','Sport','Theatre Studies'];
  const palette = ['purple','red','green','blue','amber','teal','rose'];
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const star = '<svg class="star" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 3C35 22 42 29 61 32C42 35 35 42 32 61C29 42 22 35 3 32C22 29 29 22 32 3Z"/></svg>';
  const passwordOK = s => Array.from(s).length >= 8 && /[A-Z]/.test(s) && /[a-z]/.test(s) && /[0-9]/.test(s) && Array.from(s).some(c=>window.STRIDE_CONFIG.passwordSymbols.includes(c));
  const fresh = () => ({version:1,sessions:[],courses:[],tasks:[],plans:[],topics:[],rewards:[],goal:180,selectedSubjects:[],subjectColours:{},setupStage:'subjects'});
  let client, user, state=fresh(), revision=0, selected=new Set(), goal=180;
  let ready=false, loadedFor=null, email='', recovery=false, recoveryIntent=new URLSearchParams(location.search).get('flow')==='recovery';
  let resolveStart, pending=null, dirty=false, blocked=false, saveTimer, loadGeneration=0;
  let chain=Promise.resolve(), active=true;
  const readyPromise=new Promise(resolve=>resolveStart=resolve);
  const cacheKey=()=> 'stride.draft.'+user.id;
  function status(message) { const el=$('#storage'); if(el)el.textContent=message; }
  function cache(value, isPending) { try{localStorage.setItem(cacheKey(),JSON.stringify({state:value,revision,pending:isPending}));}catch{status('Browser backup unavailable — keep this tab open until synced.');} }
  function message(t,isError=false) { const el=$('#auth-status'); if(el){el.textContent=t;el.classList.toggle('auth-message-error',isError);el.setAttribute('role',isError?'alert':'status');} }
  const authErrorPanel='<div id="auth-error" class="auth-error" role="alert" aria-atomic="true" tabindex="-1" hidden><span class="auth-error-icon" aria-hidden="true">!</span><div><strong id="auth-error-title"></strong><p id="auth-error-message"></p></div></div>';
  function clearAuthError(form){
    const panel=form.querySelector('#auth-error');if(panel)panel.hidden=true;
    form.querySelectorAll('[aria-invalid="true"]').forEach(input=>{input.removeAttribute('aria-invalid');const ids=(input.getAttribute('aria-describedby')||'').split(/\s+/).filter(id=>id&&id!=='auth-error-message');if(ids.length)input.setAttribute('aria-describedby',ids.join(' '));else input.removeAttribute('aria-describedby');});
  }
  function showAuthError(form,error){
    const panel=form.isConnected&&form.querySelector('#auth-error');
    if(!panel){message(error.message||'Something went wrong. Please try again.',true);return;}
    const signin=form.dataset.authScreen==='signin',invalid=signin&&error.code==='invalid_credentials';
    let title=signin?'Couldn’t sign you in':'Couldn’t create your account',text=error.message||'Please try again in a moment.';
    if(invalid)text='The email address or password is incorrect. Check both and try again.';
    else if(error.code==='email_not_confirmed'){title='Verify your email first';text='Check your inbox and spam folder for the verification link, then try signing in again.';}
    else if(error.code==='over_request_rate_limit'||error.code==='over_email_send_rate_limit'||error.status===429){title='Too many attempts';text='Please wait before trying again.';}
    else if(error.name==='AuthRetryableFetchError'||error.name==='TypeError'){title='Couldn’t connect';text='Check your internet connection and try again.';}
    else if(signin)text='We couldn’t complete your sign-in. Please try again in a moment.';
    panel.querySelector('#auth-error-title').textContent=title;panel.querySelector('#auth-error-message').textContent=text;
    if(invalid)for(const name of ['email','password']){const input=form.elements[name];input.setAttribute('aria-invalid','true');const ids=(input.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean);if(!ids.includes('auth-error-message'))ids.push('auth-error-message');input.setAttribute('aria-describedby',ids.join(' '));}
    message('');panel.hidden=false;panel.focus({preventScroll:true});panel.scrollIntoView({block:'nearest',behavior:'auto'});
  }
  function callbackURL(flow='confirm') { const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('flow',flow);return url.href; }
  function navigate(screen) { history.replaceState(null,'','#'+screen);draw();window.scrollTo(0,0); }
  function visibleAuth() { $('#tracker-shell').hidden=true;$('#auth-root').hidden=false;document.body.classList.add('auth-page'); }
  function steps(n) { return '<div class="steps">'+['Account','Subjects','Your goal'].map((s,i)=>(i?'<span class="connector"></span>':'')+'<span class="step '+(i===n?'active':i<n?'done':'')+'"><b>'+(i<n?'✓':i+1)+'</b>'+s+'</span>').join('')+'</div>'; }
  const field=(label,name,type,placeholder,extra='')=>'<label class="field">'+label+'<input name="'+name+'" type="'+type+'" placeholder="'+placeholder+'" '+extra+' required></label>';
  async function task(form, fn) { const button=form.querySelector('button[type=submit]')||form.querySelector('button');clearAuthError(form);button.disabled=true;message('Working…');try{await fn();}catch(e){showAuthError(form,e);}finally{if(button.isConnected)button.disabled=false;} }
  function draw() {
    if(ready && !recovery)return;
    visibleAuth();let screen=location.hash.slice(1)||'welcome';
    const publicScreens=['welcome','signup','signin','verify','reset'];
    if(!user && !publicScreens.includes(screen))screen='signin';
    if(user && !user.email_confirmed_at)screen='verify';
    if(user?.email_confirmed_at && recovery)screen='new-password';
    else if(user?.email_confirmed_at && !ready){screen=state.setupStage==='goal'?'setup-goal':state.setupStage==='complete'?'loading':'setup-subjects';}
    const header='<header><a href="#welcome" class="brand">'+star+'Stride</a><div class="header-right">'+(user?'<button id="auth-signout" class="secondary">Sign out</button>':'<span class="muted">Already have an account?</span><a href="#signin">Sign in</a>')+'</div></header>';
    let out='';
    if(screen==='welcome')out='<div class="hero"><section><span class="tag"><span class="dot"></span>YOUR PERSONAL STUDY SPACE</span><h1>Your next chapter.<br>One small step<br>at a time.</h1><p class="lead muted">Make a plan, find your focus, and see how far you’ve come. A study space that grows with you.</p><div class="buttons"><button data-route="signup">Create your account →</button><button class="secondary" data-route="signin">Sign in</button></div><p class="footnote muted">Your subjects. Your goals. Your own pace.</p></section><section class="art"><div class="spark">'+star+'</div><div class="mini"><span class="mini-label">A SPACE THAT FEELS LIKE YOU</span><h2>Ready for your next stride?</h2><div class="mini-row">Choose your subjects<span>✓</span></div><div class="mini-row">Make a little time<span>✓</span></div><div class="mini-row">See your progress<span>✓</span></div><div class="mini-progress"><span></span></div><span class="muted" style="font-size:12px">A little progress, every session.</span></div><div class="float-pill">'+star+'Turn effort into achievements</div></section></div><div class="benefits"><div><h3>Make it your own</h3><p>Choose three subjects and a goal that fits your week.</p></div><div><h3>See what’s working</h3><p>Track topics, activities, and exam question scores.</p></div><div><h3>Keep your momentum</h3><p>Build XP and celebrate your effort.</p></div></div>';
    if(screen==='signup'||screen==='signin'){
      const signup=screen==='signup';
      out=(signup?steps(0):'')+'<div class="auth-layout"><section class="intro-panel">'+star+'<span class="tag" style="align-self:flex-start;margin-top:18px">'+(signup?'LET’S GET YOU STARTED':'WELCOME BACK')+'</span><h2>'+(signup?'A fresh start.<br>A space of your own.':'Your next stride<br>is waiting.')+'</h2><p class="muted">Keep your study progress together, wherever you choose to learn.</p><div class="intro-list"><span><b class="check">✓</b> Your own subjects and goals</span><span><b class="check">✓</b> Progress across devices</span><span><b class="check">✓</b> Personal XP and achievements</span></div></section><section class="form-card"><h2>'+(signup?'Create your account':'Sign in to Stride')+'</h2><p class="muted">'+(signup?'Start building your study routine.':'Good to see you again.')+'</p><form id="auth-form">'+authErrorPanel+(signup?field('What should we call you?','name','text','Your first name','autocomplete="given-name" maxlength="80"'):'')+field('Email address','email','email','you@example.com','autocomplete="email"')+field('Password','password','password',signup?'Choose a password':'Your password','autocomplete="'+(signup?'new':'current')+'-password" '+(signup?'minlength="8" aria-describedby="password-help"':''))+(signup?'<small id="password-help" class="muted">At least 8 characters, including uppercase, lowercase, a number and a special character (such as !, @ or #).</small>':'<a href="#reset" style="font-size:13px">Forgot your password?</a>')+'<button type="submit" class="full">'+(signup?'Create account':'Sign in')+' →</button></form><p id="auth-status" role="status"></p><div class="signin">'+(signup?'Already part of Stride? <a href="#signin">Sign in</a>':'New to Stride? <a href="#signup">Create an account</a>')+'</div></section></div>';
    }
    if(screen==='verify')out=steps(0)+'<section class="verify"><div class="mail-icon">'+star+'</div><h1>A quick check,<br>then you’re in.</h1><p class="muted">Check your email for your verification link.<br><strong>'+esc(email||user?.email||'')+'</strong></p><p class="muted">Open the link to confirm your account before choosing your subjects.</p><button id="resend" class="full">Resend verification email</button><p id="auth-status" role="status"></p><div class="tip">Check your spam folder if it hasn’t arrived.</div><a class="change" href="#signin">Back to sign in</a></section>';
    if(screen==='reset'||screen==='new-password')out='<section class="verify"><h1>'+(screen==='reset'?'Let’s get you<br>back on track.':'Choose a new<br>password.')+'</h1><p class="muted">'+(screen==='reset'?'Enter your account email to request a password-reset link.':'Use at least 8 characters, uppercase, lowercase, a number and a special character.')+'</p><form id="reset-form">'+(screen==='reset'?field('Email address','email','email','you@example.com','autocomplete="email"'):field('New password','password','password','Choose a password','autocomplete="new-password" minlength="8"'))+'<button type="submit" class="full">'+(screen==='reset'?'Send reset link':'Save new password')+'</button></form><p id="auth-status" role="status"></p><a class="change" href="#signin">← Back to sign in</a></section>';
    if(screen==='setup-subjects')out=steps(1)+'<section class="screen-head"><span class="tag">MAKE IT YOURS</span><h1>What are you studying?</h1><p class="muted">Choose three subjects to give your progress a home.<br>You can change your choices later.</p></section><section class="subject-layout"><div class="selection-tools"><label class="search"><input id="subject-search" placeholder="Search subjects" aria-label="Search subjects"></label><div id="subject-count" class="counter" aria-live="polite"></div></div><div id="subject-grid" class="subject-grid"></div><p id="auth-status" role="status"></p><div class="subject-actions"><p>Online courses and MOOCs have their own section<br>once you’re set up.</p><button id="continue-subjects">Continue →</button></div></section>';
    if(screen==='setup-goal')out=steps(2)+'<section class="screen-head"><span class="tag">ONE LAST SMALL STEP</span><h1>Find a rhythm that fits.</h1><p class="muted">Set a weekly study goal. You can adjust it any time.</p></section><div class="goal-layout"><section class="goal-card"><h2>Your weekly goal</h2><p class="muted">Across your subjects and independent learning.</p><div class="goal-options">'+[[120,'Ease into it','2 hours a week'],[180,'Build a routine','3 hours a week'],[300,'Make more room','5 hours a week']].map(([n,t,d])=>'<button type="button" class="goal-option '+(goal===n?'active':'')+'" data-goal="'+n+'" aria-pressed="'+(goal===n)+'"><span><strong>'+t+'</strong><small>'+d+'</small></span><span class="select-mark">'+(goal===n?'✓':'')+'</span></button>').join('')+'</div><label class="field">Or set your own goal<input id="custom-goal" type="number" min="1" max="10080" placeholder="Minutes per week"></label><div class="goal-controls"><button id="finish-setup">Let’s take the first step →</button><button id="skip-goal" class="skip">I’ll set a goal later</button></div><p id="auth-status" role="status"></p></section><section class="goal-summary"><span class="tag">YOUR STUDY SPACE</span><h2>Your next chapter<br>starts here.</h2>'+state.selectedSubjects.map(s=>'<div class="mini-row">'+esc(s)+'<span>✓</span></div>').join('')+'<p class="small">Every session counts. A missed day never takes away your XP.</p><p class="small">You can import your existing Stride backup from your dashboard.</p></section></div><button id="back-subjects" class="secondary" style="margin-top:22px">← Back to subjects</button>';
    if(screen==='loading')out='<section class="verify"><h1>Getting your space ready.</h1><p id="auth-status" role="status">Loading your study records…</p></section>';
    $('#auth-root').innerHTML=header+'<main>'+out+'</main><footer class="preview-footer"><span>Small steps. Big possibilities.</span><span>Your progress, your own space.</span></footer>';
    document.querySelectorAll('[data-route]').forEach(b=>b.onclick=()=>navigate(b.dataset.route));
    const signout=$('#auth-signout');if(signout)signout.onclick=signOut;
    if(screen==='signup'||screen==='signin'){
      const form=$('#auth-form');form.dataset.authScreen=screen;form.addEventListener('input',()=>clearAuthError(form));if(screen==='signup')form.elements.password.oninput=()=>form.elements.password.setCustomValidity(passwordOK(form.elements.password.value)?'':'Use at least 8 characters, uppercase, lowercase, a number and a special character.');
      form.onsubmit=e=>{e.preventDefault();task(form,async()=>{
        const values=Object.fromEntries(new FormData(form));email=values.email.trim();
        if(screen==='signup'){
          if(!passwordOK(values.password))throw Error('Use at least 8 characters, uppercase, lowercase, a number and a special character.');
          const {data,error}=await client.auth.signUp({email,password:values.password,options:{data:{display_name:values.name.trim()},emailRedirectTo:callbackURL()}});if(error)throw error;
          form.reset();if(data.session)await loadAccount();else navigate('verify');
        }else{
          const {error}=await client.auth.signInWithPassword({email,password:values.password});if(error)throw error;form.reset();await loadAccount();
        }
      });};
    }
    if(screen==='verify')$('#resend').onclick=async()=>{const button=$('#resend');button.disabled=true;try{if(!email&&!user?.email)throw Error('Enter your email on the sign-in screen first.');const {error}=await client.auth.resend({type:'signup',email:email||user.email,options:{emailRedirectTo:callbackURL()}});if(error)throw error;message('If your account needs verification, a new link has been requested.');}catch(e){message(e.message);}finally{button.disabled=false;}};
    if(screen==='reset'||screen==='new-password')$('#reset-form').onsubmit=e=>{e.preventDefault();task(e.target,async()=>{
      const values=Object.fromEntries(new FormData(e.target));
      if(screen==='reset'){const {error}=await client.auth.resetPasswordForEmail(values.email.trim(),{redirectTo:callbackURL('recovery')});if(error)throw error;message('If an account uses this email, a reset link has been requested.');}
      else{if(!passwordOK(values.password))throw Error('Use at least 8 characters, uppercase, lowercase, a number and a special character.');const {error}=await client.auth.updateUser({password:values.password});if(error)throw error;recovery=false;recoveryIntent=false;history.replaceState(null,'',location.pathname+'#dashboard');await loadAccount(true);}
    });};
    if(screen==='setup-subjects'){
      drawSubjects();$('#subject-search').oninput=drawSubjects;
      $('#continue-subjects').onclick=async()=>{if(selected.size!==3)return;const b=$('#continue-subjects');b.disabled=true;try{state.selectedSubjects=[...selected];state.setupStage='goal';await write(state);navigate('setup-goal');}catch(e){message(e.message);b.disabled=false;}};
    }
    if(screen==='setup-goal'){
      document.querySelectorAll('[data-goal]').forEach(b=>b.onclick=()=>{goal=Number(b.dataset.goal);$('#custom-goal').value='';updateGoal();});
      $('#custom-goal').oninput=()=>{if($('#custom-goal').value!==''){goal=Number($('#custom-goal').value);document.querySelectorAll('[data-goal]').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false');b.querySelector('.select-mark').textContent='';});}};
      $('#finish-setup').onclick=()=>finish(false);$('#skip-goal').onclick=()=>finish(true);
      $('#back-subjects').onclick=async()=>{try{state.setupStage='subjects';await write(state);navigate('setup-subjects');}catch(e){message(e.message);}};
    }
  }
  function drawSubjects(){const q=$('#subject-search').value.toLowerCase();$('#subject-grid').innerHTML=catalogue.map((s,i)=>({s,i})).filter(({s})=>s.toLowerCase().includes(q)).map(({s,i})=>'<button class="subject'+(selected.has(s)?' selected':'')+'" data-subject="'+i+'" aria-pressed="'+selected.has(s)+'" '+(!selected.has(s)&&selected.size===3?'disabled':'')+'><span>'+esc(s)+'</span><span class="select-mark">'+(selected.has(s)?'✓':'')+'</span></button>').join('')||'<p class="muted">No matching subjects.</p>';$('#subject-count').textContent=selected.size+' of 3 selected';$('#continue-subjects').disabled=selected.size!==3;document.querySelectorAll('[data-subject]').forEach(b=>b.onclick=()=>{const s=catalogue[Number(b.dataset.subject)];if(selected.has(s))selected.delete(s);else if(selected.size<3)selected.add(s);drawSubjects();});}
  function updateGoal(){document.querySelectorAll('[data-goal]').forEach(b=>{const on=Number(b.dataset.goal)===goal;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));b.querySelector('.select-mark').textContent=on?'✓':'';});}
  async function finish(skip){if(!skip&&$('#custom-goal').value!==''&&!$('#custom-goal').reportValidity())return;if(!skip&&(!Number.isInteger(goal)||goal<1||goal>10080))return;const b=$('#finish-setup');b.disabled=true;$('#skip-goal').disabled=true;try{state.goal=skip?null:goal;state.setupStage='complete';await write(state);enterTracker();}catch(e){message(e.message);b.disabled=false;$('#skip-goal').disabled=false;}}
  async function write(value){const {data,error}=await client.rpc('stride_save_state',{p_state:value,p_expected_revision:revision});if(error){if(error.code==='40001'||error.message?.includes('STRIDE_CONFLICT')){blocked=true;throw Error('Progress changed in another tab or device. Export this tab’s backup, then reload before making more changes.');}throw error;}revision=Number(data);state=JSON.parse(JSON.stringify(value));cache(state,false);return revision;}
  function queueSave(value){if(!user||!ready)return false;pending=JSON.parse(JSON.stringify(value));dirty=true;cache(pending,true);status(blocked?'Sync paused — export your backup, then reload.':'Saving to your account…');clearTimeout(saveTimer);saveTimer=setTimeout(flush,250);return true;}
  async function flush(){if(!pending||blocked)return;clearTimeout(saveTimer);chain=chain.then(async()=>{if(!pending||blocked)return;const snapshot=pending;pending=null;try{await write(snapshot);if(pending){cache(pending,true);dirty=true;}else{dirty=false;status('Saved to your account');}}catch(e){pending=pending||snapshot;dirty=true;cache(pending,true);status(blocked?e.message:'Not synced — your browser backup is kept. Export before leaving.');}});await chain;}
  async function signOut(){await flush();if(dirty&&!confirm('There are unsynced changes. Export a backup before signing out. Sign out anyway?'))return;const {error}=await client.auth.signOut({scope:'local'});if(error){message(error.message);status('Could not sign out. Please try again.');return;}active=false;ready=false;user=null;visibleAuth();location.replace(location.pathname+'#signin');location.reload();}
  function enterTracker(){if(recovery)return;ready=true;$('#auth-root').hidden=true;$('#tracker-shell').hidden=false;document.body.classList.remove('auth-page');history.replaceState(null,'',location.pathname+'#dashboard');resolveStart({state:JSON.parse(JSON.stringify(state)),user,save:queueSave,flush,signOut,catalogue,palette});}
  async function loadAccount(force=false){
    const ticket=++loadGeneration;const {data:auth,error:authError}=await client.auth.getUser();if(!active||ticket!==loadGeneration)return;
    if(authError||!auth.user){if(ready){ready=false;visibleAuth();location.reload();return;}user=null;loadedFor=null;draw();return;}
    const next=auth.user;if(ready&&user?.id!==next.id){visibleAuth();location.reload();return;}
    user=next;if(!user.email_confirmed_at){draw();return;}
    if(recovery||recoveryIntent){recovery=true;draw();return;}
    if(loadedFor===user.id&&!force)return;
    const {data:row,error}=await client.from('stride_state').select('state,revision').eq('user_id',user.id).maybeSingle();
    if(ticket!==loadGeneration)return;
    if(error){visibleAuth();$('#auth-root').innerHTML='<header><a class="brand" href="#welcome">'+star+'Stride</a></header><main><section class="verify"><h1>Your account is safe.</h1><p>We couldn’t load its study storage. The project may still need its database setup, or the connection may be unavailable.</p><button id="retry-account">Try again</button><p id="auth-status" role="status"></p><button id="auth-signout" class="secondary">Sign out</button></section></main>';$('#retry-account').onclick=()=>loadAccount(true);$('#auth-signout').onclick=signOut;return;}
    state=row?.state||fresh();revision=Number(row?.revision||0);loadedFor=user.id;selected=new Set(state.selectedSubjects||[]);goal=state.goal||180;
    // Offer recovery only to the same account. Never auto-import the old shared browser tracker.
    try{const draft=JSON.parse(localStorage.getItem(cacheKey())||'null');if(draft?.pending&&draft.state&&confirm('This account has unsynced work saved in this browser. Recover it?')){
      if(Number(draft.revision)!==revision){visibleAuth();$('#auth-root').innerHTML='<main><section class="verify"><h1>Keep both versions.</h1><p>Your online progress changed after the browser backup. Download the backup before loading online progress.</p><button id="download-draft">Download browser backup</button><button id="load-online" class="secondary">Use online progress</button></section></main>';$('#download-draft').onclick=()=>download(draft.state);$('#load-online').onclick=()=>{localStorage.removeItem(cacheKey());loadAccount(true);};return;}
      try{await write(draft.state);}catch(e){visibleAuth();$('#auth-root').innerHTML='<main><section class="verify"><h1>Your browser backup is kept.</h1><p>We could not restore it online. Download it before continuing.</p><button id="download-draft">Download browser backup</button><button id="retry-account" class="secondary">Try again</button></section></main>';$('#download-draft').onclick=()=>download(draft.state);$('#retry-account').onclick=()=>loadAccount(true);return;}selected=new Set(state.selectedSubjects);goal=state.goal||180;
    }}catch(e){console.warn('Browser draft recovery unavailable.');}
    if(state.setupStage==='complete')enterTracker();else draw();
  }
  function download(value){const u=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='stride-browser-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
  async function start(){
    visibleAuth();
    if(!window.supabase?.createClient||!window.STRIDE_CONFIG){$('#auth-root').innerHTML='<main><section class="verify"><h1>Connection unavailable.</h1><p>Refresh to try loading the account service again.</p></section></main>';return readyPromise;}
    if(location.protocol==='file:'){$('#auth-root').innerHTML='<main><section class="verify"><h1>Open your hosted Stride site.</h1><p>Real account verification needs an HTTPS website or a local development server. The standalone browser-only tracker remains in Stride.html.</p></section></main>';return readyPromise;}
    client=window.supabase.createClient(window.STRIDE_CONFIG.supabaseUrl,window.STRIDE_CONFIG.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'implicit'}});
    client.auth.onAuthStateChange((event,session)=>{
      if(event==='PASSWORD_RECOVERY'){recovery=true;setTimeout(()=>loadAccount(true),0);}
      else if(event==='SIGNED_OUT'&&ready){ready=false;visibleAuth();setTimeout(()=>location.reload(),0);}
      else if((event==='SIGNED_IN'||event==='INITIAL_SESSION')&&!ready)setTimeout(()=>loadAccount(),0);
    });
    window.addEventListener('hashchange',()=>{if(!ready)draw();});
    window.addEventListener('online',()=>{if(dirty&&!blocked)flush();});
    window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
    await loadAccount();return readyPromise;
  }
  return {start,passwordOK,catalogue,callbackURL,hasUnsynced:()=>dirty};
})();
