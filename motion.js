/* GSAP/Lenis integration; React Bits SpotlightCard adapted for the Stride website.
 * SpotlightCard copyright (c) 2026 David Haz, MIT + Commons Clause.
 * See vendor/REACT-BITS-LICENSE.txt and THIRD_PARTY.md. */
window.StrideMotion = (() => {
  'use strict';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer=matchMedia('(hover: hover) and (pointer: fine)');
  const reduceRequested=()=>reduced.matches||Boolean(window.StridePreferences?.get().effectiveReducedMotion);
  const smoothAllowed=()=>window.StridePreferences?.get().smoothScroll!==false;
  const views=new Map();
  let lenis=null,ticker=null,spotlight=null,pointerFrame=0,point=null;
  const visible=element=>{const rect=element.getBoundingClientRect();return rect.bottom>0&&rect.top<innerHeight&&rect.width>0;};
  function settleScroll(){lenis?.reset();}
  function clearSpotlight(){if(spotlight)spotlight.style.removeProperty('--spotlight-presence');spotlight=null;point=null;cancelAnimationFrame(pointerFrame);pointerFrame=0;}
  function updateDialog(){
    const open=Boolean(document.querySelector('dialog:modal'));
    document.documentElement.toggleAttribute('data-motion-dialog-open',open);
    if(lenis){if(open)lenis.stop();else if(lenis.isStopped)lenis.start();lenis.resize();}
  }
  function configureScroll(){
    if(ticker&&window.gsap)window.gsap.ticker.remove(ticker);
    ticker=null;if(lenis){lenis.destroy();lenis=null;}
    if(!reduceRequested()&&smoothAllowed()&&finePointer.matches&&window.Lenis){
      lenis=new window.Lenis({autoRaf:!window.gsap,lerp:0.16,smoothWheel:true,syncTouch:false,
        prevent:node=>Boolean(node.closest?.('dialog, aside, textarea, select, input, [data-native-scroll]'))});
      if(window.gsap){ticker=time=>lenis?.raf(time*1000);window.gsap.ticker.lagSmoothing(0);window.gsap.ticker.add(ticker);}
    }
    updateDialog();
  }
  function beforeRender(root){
    views.get(root)?.context?.revert();
    if(views.has(root))views.get(root).context=null;
    clearSpotlight();settleScroll();
  }
  function decorate(root){
    root.querySelectorAll('.card').forEach(card=>{
      if(!card.classList.contains('personal-reward')&&!card.querySelector('a[href^="#subjects/"]'))return;
      card.classList.add('stride-spotlight');
      if(!card.querySelector(':scope > .spotlight-light')){
        const light=document.createElement('span');light.className='spotlight-light';light.setAttribute('aria-hidden','true');card.prepend(light);
      }
    });
  }
  function render(root,key){
    if(!root)return;
    const old=views.get(root),changed=old?.key!==key;
    old?.context?.revert();decorate(root);
    const bars=Array.from(root.querySelectorAll('.bar > span,.reward-progress > span'));
    const widths=bars.map(bar=>bar.style.width);
    const state={key,context:null,widths};views.set(root,state);
    if(lenis){lenis.resize();updateDialog();}
    if(reduceRequested()||!window.gsap)return;
    state.context=window.gsap.context(()=>{
      if(changed){
        const selector=root.id==='auth-root'?'.hero > section,.benefits,.intro-panel,.form-card,.screen-head,.subject-layout,.goal-card,.goal-summary,.verify':':scope > .card,:scope > .hero,:scope > .grid > .card,:scope > .personal-rewards';
        const panels=Array.from(root.querySelectorAll(selector)).filter(visible).slice(0,8);
        if(panels.length)window.gsap.from(panels,{y:8,opacity:0.65,duration:0.32,stagger:0.035,ease:'power2.out',clearProps:'opacity,transform'});
      }
      const progress=bars.filter((bar,index)=>visible(bar)&&(changed||widths[index]!==old?.widths[index]));
      if(progress.length)window.gsap.from(progress,{scaleX:0.85,transformOrigin:'left center',duration:0.4,ease:'power2.out',clearProps:'transform,transformOrigin'});
    },root);
  }
  document.addEventListener('pointermove',event=>{
    if(reduceRequested()||!finePointer.matches||event.pointerType!=='mouse')return;
    const card=event.target.closest?.('.stride-spotlight');
    if(card!==spotlight){clearSpotlight();spotlight=card;}
    if(!card)return;point={x:event.clientX,y:event.clientY};
    if(!pointerFrame)pointerFrame=requestAnimationFrame(()=>{
      pointerFrame=0;if(!spotlight?.isConnected||!point)return;
      const rect=spotlight.getBoundingClientRect();
      spotlight.style.setProperty('--spotlight-x',(point.x-rect.left)+'px');
      spotlight.style.setProperty('--spotlight-y',(point.y-rect.top)+'px');
      spotlight.style.setProperty('--spotlight-presence','1');
    });
  },{passive:true});
  document.addEventListener('pointerout',event=>{if(!event.relatedTarget||spotlight&&!spotlight.contains(event.relatedTarget))clearSpotlight();},{passive:true});
  document.addEventListener('keydown',event=>{if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key))settleScroll();},{capture:true});
  const observer=new MutationObserver(updateDialog);
  observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
  function preferenceChanged(){
    clearSpotlight();for(const state of views.values()){state.context?.revert();state.context=null;}
    configureScroll();
  }
  if(!window.StridePreferences)reduced.addEventListener('change',preferenceChanged);
  addEventListener('stride:preferences-change',preferenceChanged);finePointer.addEventListener('change',preferenceChanged);
  configureScroll();
  addEventListener('pagehide',()=>{clearSpotlight();for(const state of views.values())state.context?.revert();if(ticker&&window.gsap)window.gsap.ticker.remove(ticker);lenis?.destroy();lenis=null;observer.disconnect();});
  addEventListener('pageshow',event=>{if(event.persisted){configureScroll();observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});}});
  return {beforeRender,render};
})();
