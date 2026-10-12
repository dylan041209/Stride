const fs=require('node:fs'),path=require('node:path');
module.exports=async function checkSigninErrors(page,url,screenshotDir='outputs'){
  await page.goto(url+'#signin');await page.waitForSelector('#auth-form');
  await page.locator('#auth-form [name=email]').fill('learner@example.com');
  await page.locator('#auth-form [name=password]').fill('Incorrect!1');
  await page.evaluate(()=>window.signInError={code:'invalid_credentials',status:400,message:'Invalid login credentials'});
  await page.locator('#auth-form button').click();await page.waitForSelector('#auth-error:not([hidden])');
  if(!(await page.locator('#auth-error').textContent()).includes('email address or password is incorrect'))throw Error('Unclear sign-in error');
  for(const name of ['email','password']){
    const input=page.locator('#auth-form [name='+name+']');
    if(await input.getAttribute('aria-invalid')!=='true'||!(await input.getAttribute('aria-describedby')).includes('auth-error-message'))throw Error('Credentials not associated with error');
  }
  if(await page.locator('#auth-form [name=email]').inputValue()!=='learner@example.com'||await page.locator('#auth-form [name=password]').inputValue()!=='Incorrect!1')throw Error('Failed sign-in erased input');
  if(!await page.locator('#auth-error').evaluate(el=>el===document.activeElement)||await page.locator('#tracker-shell').isVisible())throw Error('Error not focused or sign-in was bypassed');
  fs.mkdirSync(screenshotDir,{recursive:true});
  await page.locator('.form-card').screenshot({path:path.join(screenshotDir,'stride-signin-error-light.png')});
  await page.evaluate(()=>document.documentElement.dataset.theme='dark');
  await page.locator('.form-card').screenshot({path:path.join(screenshotDir,'stride-signin-error-dark.png')});
  await page.evaluate(()=>document.documentElement.dataset.theme='light');
  await page.setViewportSize({width:390,height:844});
  await page.locator('#auth-form button').click();await page.waitForSelector('#auth-error:not([hidden])');
  if(!await page.locator('#auth-error').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}))throw Error('Sign-in warning outside phone viewport');
  if(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth))throw Error('Sign-in form overflows mobile');
  await page.locator('.form-card').screenshot({path:path.join(screenshotDir,'stride-signin-error-mobile.png')});
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('#auth-form [name=password]').fill('Corrected!1');
  if(await page.locator('#auth-error').isVisible()||await page.locator('#auth-form [aria-invalid=true]').count())throw Error('Old error did not clear when editing');
  await page.evaluate(()=>window.signInError={name:'AuthRetryableFetchError',message:'Failed to fetch'});
  await page.locator('#auth-form button').click();await page.waitForSelector('#auth-error:not([hidden])');
  if(!(await page.locator('#auth-error').textContent()).includes('internet connection')||await page.locator('#auth-form [aria-invalid=true]').count())throw Error('Connection failure blamed credentials');
  await page.evaluate(()=>window.signInError={code:'over_request_rate_limit',status:429,message:'Too many requests'});
  await page.locator('#auth-form button').click();await page.waitForSelector('#auth-error:not([hidden])');
  if(!(await page.locator('#auth-error').textContent()).includes('Too many attempts')||await page.locator('#auth-form [aria-invalid=true]').count())throw Error('Rate-limit guidance missing');
  await page.evaluate(()=>window.signInError=null);
  await page.goto(url+'#welcome');
  console.log('Passed: prominent credential warning, preserved inputs, associated/focused alert, clearing on edit, visible mobile error, connection and rate-limit guidance.');
};
