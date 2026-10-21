// Native showModal() makes the background inert, but does not lock its scroll.
// One document-level owner also covers nested dialogs and lazy-loaded Studio UI.
export function installModalScrollGuard() {
  let locked=false, y=0, x=0;
  const root=document.documentElement;
  const lock=()=>{
    if(locked)return;
    y=window.scrollY;x=window.scrollX;
    locked=true;
    root.style.setProperty('--modal-scroll-top',`${-y}px`);
    root.dataset.modalScrollLocked='true';
  };
  const sync=()=>{
    const active=[...document.querySelectorAll('dialog[open],[aria-modal="true"]')].some(el=>
      !el.closest('.png-export-clone,.png-preview-clone,[aria-hidden="true"]') && el.getClientRects().length);
    if(active===locked)return;
    if(active){
      lock();
    }else{
      locked=false;
      delete root.dataset.modalScrollLocked;
      root.style.removeProperty('--modal-scroll-top');
      window.scrollTo({left:x,top:y,behavior:'instant'});
    }
  };
  // MutationObserver already batches DOM changes. Restore before the next
  // paint/input rather than leaving the page fixed for one extra frame.
  const observer=new MutationObserver(sync);
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open','aria-modal','hidden']});
  document.addEventListener('pollframe-before-modal-open',lock);
  document.addEventListener('pollframe-modal-open-failed',sync);
  return ()=>{observer.disconnect();document.removeEventListener('pollframe-before-modal-open',lock);document.removeEventListener('pollframe-modal-open-failed',sync);if(locked){delete root.dataset.modalScrollLocked;root.style.removeProperty('--modal-scroll-top');window.scrollTo({left:x,top:y,behavior:'instant'});}};
}

// Capture the real page position before showModal() moves keyboard focus.
// Safari can synchronously scroll during native focus, before our observer
// sees the open attribute. Nested dialogs retain the outer dialog's snapshot.
export function openModalDialog(dialog) {
  if(dialog.open)return;
  document.dispatchEvent(new Event('pollframe-before-modal-open'));
  try { dialog.showModal(); }
  catch(error){document.dispatchEvent(new Event('pollframe-modal-open-failed'));throw error;}
}
