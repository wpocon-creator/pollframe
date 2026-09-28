import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Same control on every device. The floating list cannot be clipped by an
// inspector's scrolling container; Escape and outside clicks never select.
export default function StudioSelect({
  children,
  value,
  onChange,
  disabled,
  ...props
}) {
  const options = React.Children.toArray(children)
    .flatMap((child) =>
      child?.type === React.Fragment
        ? React.Children.toArray(child.props.children)
        : [child],
    )
    .filter((child) => React.isValidElement(child) && child.type === "option");
  const [open, setOpen] = useState(false),
    [index, setIndex] = useState(0),
    [pos, setPos] = useState(null);
  const anchor = useRef(null),
    list = useRef(null),
    id = useId();
  const selected = options.find((o) => String(o.props.value) === String(value));
  const commit = (option) => {
    if (!option || option.props.disabled) return;
    onChange?.({ target: { value: String(option.props.value) } });
    setOpen(false);
    anchor.current?.focus({preventScroll:true});
  };
  useEffect(() => {
    if (!open) return;
    const place = () => {
      const r = anchor.current.getBoundingClientRect();
      const viewport = window.visualViewport;
      const topEdge = (viewport?.offsetTop || 0) + 12;
      const bottomEdge =
        (viewport?.offsetTop || 0) + (viewport?.height || innerHeight) - 12;
      const below = Math.max(0, bottomEdge - r.bottom - 6);
      const above = Math.max(0, r.top - topEdge - 6);
      const desired = Math.min(288, options.length * 44 + 12);
      // Short menus belong beside their trigger, not 320 px above it.
      const down = below >= Math.min(desired, 160) || below >= above;
      const h = Math.min(desired, down ? below : above);
      setPos({
        left: Math.max(
          12,
          Math.min(r.left, innerWidth - Math.max(r.width, 176) - 12),
        ),
        top: down ? r.bottom + 6 : Math.max(topEdge, r.top - h - 6),
        width: Math.min(Math.max(r.width, 176), innerWidth - 24),
        maxHeight: h,
      });
    };
    place();
    const close = (e) => {
      if (
        !anchor.current?.contains(e.target) &&
        !list.current?.contains(e.target)
      ) {
        setOpen(false);
        if(navigator.maxTouchPoints>0 || matchMedia('(pointer:coarse)').matches || e.pointerType==='touch'){
          e.preventDefault();e.stopPropagation();
        }
      }
    };
    // Prevent Safari moving focus (and scrolling/closing this menu) before
    // the release click has been consumed. Do not dismiss on pointer-down.
    const outsidePress=e=>{
      if((e.pointerType==='touch'||matchMedia('(pointer:coarse)').matches) && !anchor.current?.contains(e.target) && !list.current?.contains(e.target)){
        e.preventDefault();e.stopPropagation();
      }
    };
    const scrolled=e=>{if(!list.current?.contains(e.target))setOpen(false);};
    document.addEventListener("click", close, true);
    document.addEventListener("pointerdown", outsidePress, true);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", scrolled, true);
    window.visualViewport?.addEventListener("resize", place);
    return () => {
      document.removeEventListener("click", close, true);
      document.removeEventListener("pointerdown", outsidePress, true);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", scrolled, true);
      window.visualViewport?.removeEventListener("resize", place);
    };
  }, [open]);
  useEffect(() => {
    const menu=list.current,item=menu?.querySelector(`[data-index="${index}"]`);
    if(open && item){
      if(item.offsetTop<menu.scrollTop)menu.scrollTop=item.offsetTop;
      else if(item.offsetTop+item.offsetHeight>menu.scrollTop+menu.clientHeight)menu.scrollTop=item.offsetTop+item.offsetHeight-menu.clientHeight;
    }
  }, [index, open, Boolean(pos)]);
  return (
    <span className="studio-select">
      <button
        {...props}
        type="button"
        ref={anchor}
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-activedescendant={open ? `${id}-${index}` : undefined}
        onClick={() => {
          setIndex(Math.max(0, options.indexOf(selected)));
          setOpen(!open);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape" || e.key === "Tab") {
            if (e.key === "Escape" && open) {
              e.preventDefault();
              e.stopPropagation();
            }
            setOpen(false);
            return;
          }
          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
            e.preventDefault();
            setOpen(true);
            setIndex((i) =>
              e.key === "Home"
                ? 0
                : e.key === "End"
                  ? options.length - 1
                  : Math.max(
                      0,
                      Math.min(
                        options.length - 1,
                        i + (e.key === "ArrowDown" ? 1 : -1),
                      ),
                    ),
            );
          } else if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (open) commit(options[index]);
            else {
              setIndex(Math.max(0, options.indexOf(selected)));
              setOpen(true);
            }
          } else if (e.key.length === 1) {
            const i = options.findIndex((o) =>
              String(o.props.children)
                .toLowerCase()
                .startsWith(e.key.toLowerCase()),
            );
            if (i >= 0) {
              setIndex(i);
              setOpen(true);
            }
          }
        }}
      >
        <span>{selected?.props.children || value}</span>
        <span aria-hidden="true">⌄</span>
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            id={id}
            ref={list}
            className="studio-select-list"
            role="listbox"
            style={pos}
          >
            {options.map((option, i) => (
              <button
                type="button"
                role="option"
                tabIndex={-1}
                id={`${id}-${i}`}
                data-index={i}
                data-active={i === index}
                aria-selected={String(option.props.value) === String(value)}
                disabled={option.props.disabled}
                key={option.key || i}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => commit(option)}
              >
                {option.props.children}
                <span aria-hidden="true">
                  {String(option.props.value) === String(value) ? "✓" : ""}
                </span>
              </button>
            ))}
          </div>,
          anchor.current?.closest("dialog[open]") || document.body,
        )}
    </span>
  );
}
