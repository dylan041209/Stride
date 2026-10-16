/* Account disclosure motion. Design guidance: emilkowalski/skills (MIT).
 * CSS transitions retain their current value when the user reverses a toggle. */
window.StrideAccountMenu = {
  bind(menu) {
    const trigger=menu.querySelector('summary'),panel=menu.querySelector('.account-menu-panel');
    const abort=new AbortController(),options={signal:abort.signal};
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let closing,keyboardFocus=false;
    menu.dataset.menuEnhanced='true';menu.dataset.expanded='false';
    trigger.setAttribute('aria-expanded','false');panel.inert=true;panel.setAttribute('aria-hidden','true');
    const expanded=()=>menu.dataset.expanded==='true';
    const finishClose=()=>{if(!expanded()){menu.open=false;clearTimeout(closing);}};
    function close({instant=false,returnFocus=false}={}) {
      if(!menu.open)return;
      clearTimeout(closing);
      if(returnFocus||panel.contains(document.activeElement))trigger.focus({preventScroll:true});
      menu.dataset.instant=String(instant);menu.dataset.expanded='false';
      trigger.setAttribute('aria-expanded','false');panel.inert=true;panel.setAttribute('aria-hidden','true');
      if(instant)finishClose();else {
        const style=getComputedStyle(panel);
        const milliseconds=value=>parseFloat(value)*(value.trim().endsWith('ms')?1:1000);
        const durations=style.transitionDuration.split(',').map(milliseconds),delays=style.transitionDelay.split(',').map(milliseconds);
        const duration=Math.max(...durations.map((value,i)=>value+delays[i%delays.length]));
        closing=setTimeout(finishClose,duration+50);
      }
    }
    function open(instant=false) {
      clearTimeout(closing);
      if(!menu.open){
        menu.dataset.instant='true';menu.dataset.expanded='false';menu.open=true;
        panel.getBoundingClientRect(); // Establish the hidden starting style before the transition.
      }
      menu.dataset.instant=String(instant);menu.dataset.expanded='true';
      trigger.setAttribute('aria-expanded','true');panel.inert=false;panel.removeAttribute('aria-hidden');
    }
    trigger.addEventListener('click',event=>{
      event.preventDefault();
      if(expanded())close({instant:event.detail===0});else open(event.detail===0);
    },options);
    document.addEventListener('pointerdown',()=>{keyboardFocus=false;},options);
    trigger.addEventListener('keydown',event=>{
      if(event.key==='ArrowDown'||event.key==='ArrowUp'){
        event.preventDefault();open(true);const buttons=panel.querySelectorAll('button');
        (event.key==='ArrowDown'?buttons[0]:buttons[buttons.length-1])?.focus();
      }
    },options);
    panel.addEventListener('transitionend',event=>{
      if(event.target===panel&&event.propertyName==='opacity'&&Number(getComputedStyle(panel).opacity)<.001)finishClose();
    },options);
    document.addEventListener('click',event=>{
      if(menu.open&&!menu.contains(event.target))close({instant:event.detail===0});
    },options);
    document.addEventListener('focusin',event=>{
      if(menu.open&&!menu.contains(event.target))close({instant:keyboardFocus});
    },options);
    document.addEventListener('keydown',event=>{
      keyboardFocus=true;
      if(event.key==='Escape'&&menu.open){close({instant:true,returnFocus:true});event.preventDefault();}
    },options);
    const preferenceChanged=()=>{menu.dataset.instant='true';if(!expanded())finishClose();};
    reduced.addEventListener('change',preferenceChanged,options);
    window.addEventListener('stride:preferences-change',preferenceChanged,options);
    return {close,destroy(){clearTimeout(closing);abort.abort();}};
  }
};
