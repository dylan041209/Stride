const fs=require('node:fs'),path=require('node:path');
module.exports=async function checkMotion(original,url,stub,screenshotDir='outputs'){
  const browser=original.context().browser();fs.mkdirSync(screenshotDir,{recursive:true});
  const fixture={user:{id:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',email:'motion@example.test',email_confirmed_at:'2026-10-13T09:00:00Z'},state:{version:1,sessions:Array.from({length:120},(_,i)=>({id:'motion-'+i,target:'Criminology',activity:'Note taking',topic:'Revision topic '+i,date:'2026-10-13',minutes:20})),courses:[],tasks:[],plans:[],topics:[],rewards:[{id:'motion-reward',title:'Film night',level:3}],goal:180,selectedSubjects:['Criminology','Business Studies','ICT'],subjectColours:{Criminology:'red','Business Studies':'green',ICT:'blue'},setupStage:'complete'}};
  async function context(options={}){const ctx=await browser.newContext({viewport:{width:1440,height:900},...options});await ctx.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({contentType:'text/javascript',body:stub}));await ctx.addInitScript(f=>{localStorage.setItem('test.user',JSON.stringify(f.user));localStorage.setItem('test.rows',JSON.stringify({[f.user.id]:{state:f.state,revision:1}}));},fixture);return ctx;}
  const ctx=await context();const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+'#dashboard');await page.waitForSelector('#content .hero');
  if(!await page.evaluate(()=>Boolean(window.gsap&&window.Lenis&&window.StrideMotion&&document.documentElement.classList.contains('lenis'))))throw Error('Motion libraries or wheel controller missing');
  const moving=await page.evaluate(async()=>{const done=new Promise(resolve=>addEventListener('hashchange',()=>requestAnimationFrame(()=>resolve(Array.from(document.querySelectorAll('#content .card')).some(e=>getComputedStyle(e).transform!=='none'))),{once:true}));location.hash='#subjects';return done;});
  if(!moving)throw Error('GSAP page entrance is not visible');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>!document.documentElement.classList.contains('lenis'));
  if(!await page.evaluate(()=>Array.from(document.querySelectorAll('#content .card')).every(e=>getComputedStyle(e).transform==='none')))throw Error('Reduced motion leaves transforms active');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>document.documentElement.classList.contains('lenis'));
  await page.locator('#nav a[href="#history"]').click();await page.waitForSelector('#history-list .entry');
  await page.evaluate(()=>{window.scrollTo(0,0);document.activeElement.blur();});await page.mouse.move(1050,600);await page.mouse.wheel(0,900);
  await page.waitForFunction(()=>window.scrollY>60);await page.keyboard.press('End');
  await page.waitForFunction(()=>document.documentElement.scrollHeight-innerHeight-window.scrollY<220);
  await page.keyboard.press('Home');await page.waitForFunction(()=>window.scrollY<5);
  await page.setViewportSize({width:970,height:500});await page.locator('#log').click();await page.waitForSelector('html[data-motion-dialog-open]');
  const scroll=await page.evaluate(()=>window.scrollY);const box=await page.locator('#dialog').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,400);
  await page.waitForFunction(()=>document.querySelector('#dialog').scrollTop>30);
  if(await page.evaluate(()=>window.scrollY)!==scroll)throw Error('Modal wheel moves the background page');
  await page.locator('#cancel').click();await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-motion-dialog-open')&&!document.documentElement.classList.contains('lenis-stopped'));
  await page.setViewportSize({width:1440,height:1000});await page.locator('#nav a[href="#dashboard"]').click();
  await page.locator('.stride-spotlight').first().hover();await page.waitForFunction(()=>Array.from(document.querySelectorAll('.stride-spotlight')).some(e=>e.style.getPropertyValue('--spotlight-presence')==='1'));
  await page.waitForFunction(()=>gsap.getTweensOf(Array.from(document.querySelectorAll('#content *')),true).length===0);await page.evaluate(()=>document.activeElement.blur());await page.keyboard.press('Home');await page.waitForFunction(()=>window.scrollY<5);await page.screenshot({path:path.join(screenshotDir,'stride-motion-dashboard-light.png'),fullPage:true});
  await page.locator('#theme-toggle').click();await page.locator('.stride-spotlight').first().hover();await page.evaluate(()=>document.activeElement.blur());await page.keyboard.press('Home');await page.waitForFunction(()=>window.scrollY<5);await page.screenshot({path:path.join(screenshotDir,'stride-motion-dashboard-dark.png'),fullPage:true});
  for(const route of ['subjects','rewards','dashboard','history','dashboard']){await page.locator('#nav a[href="#'+route+'"]').click();}
  await page.waitForFunction(()=>gsap.getTweensOf(Array.from(document.querySelectorAll('#content *')),true).length===0);
  if(errors.length)throw Error(errors.join('\n'));await ctx.close();
  const mobile=await context({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const phone=await mobile.newPage();await phone.goto(url+'#dashboard');await phone.waitForSelector('#content .hero');
  if(await phone.evaluate(()=>document.documentElement.classList.contains('lenis')))throw Error('Touch device uses synthetic wheel scrolling');
  if(await phone.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth))throw Error('Motion layout overflows on phone');
  await phone.screenshot({path:path.join(screenshotDir,'stride-motion-dashboard-mobile.png'),fullPage:true});await mobile.close();
  const fallback=await context();await fallback.route('**/vendor/*.js',route=>route.abort());const plain=await fallback.newPage();await plain.goto(url+'#dashboard');await plain.waitForSelector('#content .hero');await plain.locator('#log').click();await plain.locator('[name=activity]').selectOption('Exam questions');if(!await plain.locator('#exam-marks').isVisible())throw Error('Missing animation files break the study form');await fallback.close();
  console.log('Passed: GSAP entrances, live reduced-motion cleanup, Lenis wheel/keyboard/native dialog scrolling, spotlight interaction, repeated navigation cleanup, native touch layout and missing-library fallback.');
};
