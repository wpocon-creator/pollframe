import React, { useEffect, useLayoutEffect, useState } from "react";
import {createPortal} from 'react-dom';

// Only remembers an explicitly dismissed notice, never a visitor identifier.
export default function StudioAnnouncement({
  id,
  children,
  onAction,
  action,
  closeLabel,
}) {
  const key = `pollframe-notice-dismissed:${id}`;
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(key) === "yes";
    } catch {
      return false;
    }
  });
  const [hovered, setHovered] = useState(false);
  const [top,setTop]=useState(80);
  useLayoutEffect(()=>{
    const header=document.querySelector('.site-header');
    if(!header)return;
    const measure=()=>setTop(header.getBoundingClientRect().height+8);
    const observer=new ResizeObserver(measure);observer.observe(header);measure();
    return()=>observer.disconnect();
  },[]);
  const [focused, setFocused] = useState(false);
  const [replay,setReplay] = useState(0);
  useEffect(()=>{
    // Local demonstration shortcut only. Never override text formatting or
    // DevTools shortcuts, and never erase the visitor's dismissal preference.
    if(!['localhost','127.0.0.1','[::1]'].includes(location.hostname))return;
    const show=event=>{
      if(!(event.ctrlKey||event.metaKey)||event.altKey||event.shiftKey||event.key.toLowerCase()!=='i'||event.repeat)return;
      if(event.target?.isContentEditable || event.target?.closest?.('input,textarea,select,dialog[open],[role="dialog"]'))return;
      event.preventDefault();setHovered(false);setFocused(false);setDismissed(false);setReplay(n=>n+1);
    };
    window.addEventListener('keydown',show);
    return()=>window.removeEventListener('keydown',show);
  },[]);
  const engaged = hovered || focused;
  useEffect(() => {
    if (dismissed || engaged) return;
    // Pause while the user reads with a pointer/keyboard. Auto-hide is session-only;
    // only an explicit X remembers a preference across visits.
    const timer = setTimeout(() => setDismissed(true), 16000);
    return () => clearTimeout(timer);
  }, [dismissed, engaged, replay]);
  if (dismissed) return null;
  return createPortal(
    <aside
      key={replay}
      className="studio-announcement"
      style={{top}}
      aria-label="Studio"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
    >
      <span className="studio-announcement-copy">
        {children}{" "}
        <button type="button" onClick={onAction}>
          {action} <span aria-hidden="true">↗</span>
        </button>
      </span>
      <button
        type="button"
        className="studio-announcement-close"
        aria-label={closeLabel}
        onClick={() => {
          setDismissed(true);
          try {
            localStorage.setItem(key, "yes");
          } catch {
            /* Still dismiss for this visit. */
          }
        }}
      >
        ×
      </button>
    </aside>,document.body
  );
}
