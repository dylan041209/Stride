module.exports=async function checkApprovedSignup(page,url){
  await page.goto(url+'#signup');await page.waitForSelector('#auth-form');
  await page.locator('[name=name]').fill('Test');await page.locator('[name=email]').fill('not-approved@example.test');await page.locator('[name=password]').fill('Example!1');
  await page.evaluate(()=>window.signupError={code:'hook_rejected',message:'STRIDE_EMAIL_NOT_APPROVED'});
  await page.locator('#auth-form button').click();await page.waitForSelector('#auth-error:not([hidden])');
  if(await page.locator('#auth-error-title').textContent()!=='Email not approved yet')throw Error('Approval rejection is unclear');
  if(!await page.locator('#auth-error-message').textContent().then(text=>text.includes('Ask Dylan')))throw Error('Approval rejection has no next step');
  if(await page.locator('[name=email]').inputValue()!=='not-approved@example.test'||await page.locator('[name=password]').inputValue()!=='Example!1')throw Error('Rejected signup loses user input');
  if(await page.locator('[name=email]').getAttribute('aria-invalid')!=='true'||await page.locator('[name=password]').getAttribute('aria-invalid'))throw Error('Approval failure marks the wrong fields');
  if(await page.locator('#tracker-shell').isVisible()||new URL(page.url()).hash!=='#signup')throw Error('Approval failure advances onboarding');
  await page.locator('[name=email]').fill('approved@example.test');if(await page.locator('#auth-error').isVisible())throw Error('Approval warning did not clear on edit');
  await page.evaluate(()=>window.signupError=null);
  console.log('Passed: clear server approval rejection, preserved inputs, email-only field association, clearing on edit and blocked onboarding.');
};
