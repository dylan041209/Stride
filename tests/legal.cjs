const fs=require('node:fs'),path=require('node:path');
module.exports=async function checkLegal(page,url,screenshotDir='outputs'){
  fs.mkdirSync(screenshotDir,{recursive:true});
  const browser=page.context().browser();
  const plain=await browser.newContext({javaScriptEnabled:false,viewport:{width:1440,height:1000}});
  const document=await plain.newPage();const requests=[];document.on('request',r=>requests.push(r.url()));
  for(const kind of ['terms','privacy']){
    await document.goto(url+kind+'.html');await document.waitForSelector('.legal-document');
    if(await document.locator('body').getAttribute('data-legal-status')!=='draft')throw Error('Legal page missing draft status');
    if(!(await document.locator('.draft-notice').textContent()).includes('public launch is not ready'))throw Error('Legal release gaps are hidden');
    if(await document.locator('script').count())throw Error('Legal page unexpectedly runs JavaScript');
    if(!await document.locator('[data-legal-placeholder=contact]').count()||!await document.locator('[data-legal-placeholder=operator]').count())throw Error('Unresolved legal identity/contact silently completed');
    if(!await document.evaluate(()=>Array.from(document.querySelectorAll('.legal-toc a')).every(a=>document.getElementById(a.hash.slice(1)))))throw Error('Legal contents link is broken');
    if(await document.locator('a[href^="mailto:"]').count())throw Error('Draft contact email must not be a fake sending link');
    await document.screenshot({path:path.join(screenshotDir,'stride-'+kind+'-desktop.png')});
    await document.emulateMedia({colorScheme:'dark'});await document.screenshot({path:path.join(screenshotDir,'stride-'+kind+'-dark.png')});
    await document.emulateMedia({colorScheme:'light'});await document.setViewportSize({width:390,height:844});
    if(await document.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth))throw Error('Legal page overflows on mobile');
    await document.screenshot({path:path.join(screenshotDir,'stride-'+kind+'-mobile.png')});
    await document.locator('.legal-toc a').filter({hasText:kind==='privacy'?'Retention':'Your legal rights'}).click();
    const target=kind==='privacy'?'#retention':'#rights';
    if(!await document.locator(target).isVisible())throw Error('Legal section is not accessible without JavaScript');
    if(kind==='privacy')await document.locator('#retention').screenshot({path:path.join(screenshotDir,'stride-privacy-retention-mobile.png')});
    await document.emulateMedia({media:'print'});
    if(await document.locator('.legal-toc').isVisible()||!await document.locator('.draft-notice').isVisible())throw Error('Print layout loses draft notice or keeps navigation');
    await document.emulateMedia({media:'screen'});await document.setViewportSize({width:1440,height:1000});
  }
  if(requests.some(request=>new URL(request).origin!==new URL(url).origin))throw Error('Reading legal pages contacts an external service');
  await document.goto(url);await document.waitForSelector('#site-legal-footer');
  if(await document.locator('#site-legal-footer a').count()!==2)throw Error('No-JavaScript entry page hides legal links');
  await plain.close();
  await page.goto(url+'#signup');await page.waitForSelector('#auth-form');
  if(await page.locator('.auth-legal-note a').count()!==2||await page.locator('#site-legal-footer a').count()!==2)throw Error('Pre-signup privacy links missing');
  for(const link of await page.locator('.auth-legal-note a, #site-legal-footer a').all()){
    if(await link.getAttribute('target')!=='_blank'||!(await link.getAttribute('rel')).includes('noopener'))throw Error('Legal links risk losing form input or opener access');
  }
  await page.goto(url+'#welcome');
  console.log('Passed: standalone legal drafts, JavaScript-disabled access, no external legal-page requests, working contents, honest placeholders, mobile/print layouts and pre-signup/footer links.');
};
