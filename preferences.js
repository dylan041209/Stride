/* Browser display preferences. No study/account data is written by this module. */
window.StridePreferences=(()=>{
  'use strict';
  const key='stride.preferences',root=document.documentElement;
  const dark=matchMedia('(prefers-color-scheme: dark)'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const defaults={version:1,theme:'system',reduceMotion:false,smoothScroll:true,largeText:false,highContrast:false};
  let preferences={...defaults},remember=true,lastSave=true,syncControls=()=>{},returnFocus;
  function read(){
    preferences={...defaults};
    try{
      const saved=JSON.parse(localStorage.getItem(key)||'null');
      if(saved?.version===1){
        if(['system','light','dark'].includes(saved.theme))preferences.theme=saved.theme;
        for(const name of ['reduceMotion','smoothScroll','largeText','highContrast'])if(typeof saved[name]==='boolean')preferences[name]=saved[name];
      }else{const legacy=localStorage.getItem('stride.theme');if(['light','dark'].includes(legacy))preferences.theme=legacy;}
    }catch{}
  }
  function get(){return {...preferences,remember,systemReducedMotion:reduced.matches,effectiveReducedMotion:preferences.reduceMotion||reduced.matches};}
  function apply(){
    root.dataset.theme=preferences.theme==='system'?(dark.matches?'dark':'light'):preferences.theme;
    root.toggleAttribute('data-reduced-motion',preferences.reduceMotion||reduced.matches);
    root.toggleAttribute('data-large-text',preferences.largeText);
    root.toggleAttribute('data-high-contrast',preferences.highContrast);
    root.toggleAttribute('data-native-scroll',!preferences.smoothScroll);
    syncControls();dispatchEvent(new CustomEvent('stride:preferences-change',{detail:get()}));
  }
  function set(changes){
    if(['system','light','dark'].includes(changes.theme))preferences.theme=changes.theme;
    for(const name of ['reduceMotion','smoothScroll','largeText','highContrast'])if(typeof changes[name]==='boolean')preferences[name]=changes[name];
    if(typeof changes.remember==='boolean')remember=changes.remember;
    let stored=true;
    try{if(remember)localStorage.setItem(key,JSON.stringify(preferences));else localStorage.removeItem(key);localStorage.removeItem('stride.theme');}catch{stored=false;}
    lastSave=stored;apply();return stored;
  }
  function open(onClose){
    const dialog=document.getElementById('display-settings');returnFocus=onClose;
    if(!dialog.dataset.ready){
      dialog.innerHTML='<div class="settings-heading"><div><h2 id="display-settings-title">Settings</h2><p>Make Stride comfortable to use.</p></div><button type="button" class="quiet" id="close-display-settings" aria-label="Close settings">×</button></div><section class="settings-section" aria-labelledby="appearance-heading"><h3 id="appearance-heading">Appearance</h3><label class="settings-row" for="appearance-mode"><span><strong>Theme</strong><small>Choose light, dark or your device setting.</small></span><select id="appearance-mode"><option value="system">Use device setting</option><option value="light">Light</option><option value="dark">Dark</option></select></label></section><section class="settings-section" aria-labelledby="accessibility-heading"><h3 id="accessibility-heading">Accessibility</h3><label class="settings-row" for="setting-reduce-motion"><span><strong>Reduce motion</strong><small id="reduce-motion-help">Keep transitions gentle and remove moving effects.</small></span><input type="checkbox" id="setting-reduce-motion" aria-describedby="reduce-motion-help"></label><label class="settings-row" for="setting-smooth-scroll"><span><strong>Smooth scrolling</strong><small id="smooth-scroll-help">Gentle smoothing for mouse-wheel scrolling.</small></span><input type="checkbox" id="setting-smooth-scroll" aria-describedby="smooth-scroll-help"></label><label class="settings-row" for="setting-large-text"><span><strong>Larger text</strong><small>Increase text size and spacing in Stride.</small></span><input type="checkbox" id="setting-large-text"></label><label class="settings-row" for="setting-high-contrast"><span><strong>Stronger contrast</strong><small>Make text, controls and boundaries more distinct.</small></span><input type="checkbox" id="setting-high-contrast"></label></section><section class="settings-section settings-privacy" aria-labelledby="settings-privacy-heading"><h3 id="settings-privacy-heading">Privacy & terms</h3><a class="settings-document" href="privacy.html" target="_blank" rel="noopener noreferrer" aria-label="Privacy Policy review draft (opens in a new tab)"><span><strong>Privacy Policy</strong><small>How Stride handles your information · Review draft</small></span><span aria-hidden="true">↗</span></a><a class="settings-document" href="terms.html" target="_blank" rel="noopener noreferrer" aria-label="Terms and Conditions review draft (opens in a new tab)"><span><strong>Terms & Conditions</strong><small>Rules for using Stride · Review draft</small></span><span aria-hidden="true">↗</span></a></section><div class="settings-memory"><label class="settings-row" for="setting-remember"><span><strong>Remember preferences on this browser</strong><small>Turn off to keep these choices only until this page reloads or closes. Study records are unaffected.</small></span><input type="checkbox" id="setting-remember"></label><p id="preferences-status" role="status" aria-live="polite">Changes apply immediately. Display preferences are saved on this browser.</p></div>';
      dialog.dataset.ready='true';
      const find=id=>dialog.querySelector('#'+id);
      syncControls=()=>{
        const current=get();find('appearance-mode').value=current.theme;
        for(const [name,id] of Object.entries({reduceMotion:'reduce-motion',smoothScroll:'smooth-scroll',largeText:'large-text',highContrast:'high-contrast',remember:'remember'}))find('setting-'+id).checked=current[name];
        find('setting-reduce-motion').checked=current.effectiveReducedMotion;
        find('setting-reduce-motion').disabled=current.systemReducedMotion;
        find('reduce-motion-help').textContent=current.systemReducedMotion?'Your device already requests reduced motion. Stride follows that setting.':'Keep transitions gentle and remove moving effects.';
        find('setting-smooth-scroll').disabled=current.effectiveReducedMotion;
        find('smooth-scroll-help').textContent=current.effectiveReducedMotion?'Smooth scrolling is paused while reduced motion is on.':'Gentle smoothing for mouse-wheel scrolling. Touch scrolling stays native.';
      };
      const update=changes=>{const stored=set(changes);find('preferences-status').textContent=!remember?'Applied for this page. Preferences will reset when it reloads or closes.':stored?'Preferences saved on this browser.':'Applied for this page. This browser could not save your preferences.';};
      find('appearance-mode').onchange=event=>update({theme:event.target.value});
      for(const [name,id] of Object.entries({reduceMotion:'reduce-motion',smoothScroll:'smooth-scroll',largeText:'large-text',highContrast:'high-contrast',remember:'remember'}))find('setting-'+id).onchange=event=>update({[name]:event.target.checked});
      find('close-display-settings').onclick=()=>dialog.close();
      dialog.addEventListener('close',()=>returnFocus?.());
    }
    syncControls();dialog.querySelector('#preferences-status').textContent=!remember?'Applied for this page. Preferences will reset when it reloads or closes.':lastSave?'Changes apply immediately. Preferences are remembered on this browser.':'Applied for this page. This browser could not save your preferences.';
    dialog.showModal();dialog.scrollTop=0;dialog.querySelector('#appearance-mode').focus({preventScroll:true});
  }
  read();apply();
  dark.addEventListener('change',apply);reduced.addEventListener('change',apply);
  addEventListener('storage',event=>{if([key,'stride.theme',null].includes(event.key)){remember=true;read();apply();}});
  return {get,set,open};
})();
