import {useRef} from 'react';
export function swipeDirection(start,end,width){
  const dx=end.x-start.x,dy=end.y-start.y;
  return end.time-start.time<=900 && Math.abs(dx)>=Math.min(80,Math.max(40,width*.15)) && Math.abs(dx)>Math.abs(dy)*1.8 ? (dx<0?1:-1):0;
}
export function useStudioSwipe(enabled,onSwipe){
  const start=useRef(null),suppress=useRef(0);
  return {
    onTouchStart:e=>{
      start.current=null;
      if(!enabled||e.touches.length!==1||(window.visualViewport?.scale||1)>1.01||!e.target.closest('.studio-current-preview-image')||e.target.closest('a,button,input,select,textarea,[role="button"]'))return;
      const t=e.touches[0];start.current={x:t.clientX,y:t.clientY,time:Date.now()};
    },
    onTouchMove:e=>{if(e.touches.length!==1)start.current=null;},
    onTouchCancel:()=>{start.current=null;},
    onTouchEnd:e=>{
      const origin=start.current;start.current=null;
      if(!origin||!enabled||e.touches.length||!e.changedTouches[0])return;
      const t=e.changedTouches[0],direction=swipeDirection(origin,{x:t.clientX,y:t.clientY,time:Date.now()},innerWidth);
      if(direction){suppress.current=Date.now()+400;onSwipe(direction);}
    },
    onClickCapture:e=>{if(Date.now()<suppress.current){e.preventDefault();e.stopPropagation();}},
  };
}
