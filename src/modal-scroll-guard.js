// Native showModal() makes the background inert, but does not lock its scroll.
// One document-level owner also covers nested dialogs and lazy-loaded Studio UI.
export function installModalScrollGuard() {
  let locked=false, y=0, x=0;
  const root=document.documentElement;
  const sync=()=>{
    const active=[...document.querySelectorAll('dialog[open],[aria-modal="true"]')].some(el=>
      !el.closest('.png-export-clone,.png-preview-clone,[aria-hidden="true"]') && el.getClientRects().length);
    if(active===locked)return;
    locked=active;
    if(active){
      y=window.scrollY;x=window.scrollX;
      root.style.setProperty('--modal-scroll-top',`${-y}px`);
      root.dataset.modalScrollLocked='true';
    }else{
      delete root.dataset.modalScrollLocked;
      root.style.removeProperty('--modal-scroll-top');
      window.scrollTo({left:x,top:y,behavior:'instant'});
    }
  };
  // MutationObserver already batches DOM changes. Restore before the next
  // paint/input rather than leaving the page fixed for one extra frame.
  const observer=new MutationObserver(sync);
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open','aria-modal','hidden']});
  return ()=>{observer.disconnect();if(locked){delete root.dataset.modalScrollLocked;root.style.removeProperty('--modal-scroll-top');window.scrollTo({left:x,top:y,behavior:'instant'});}};
}
