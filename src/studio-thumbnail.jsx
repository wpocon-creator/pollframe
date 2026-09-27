import React, { useEffect, useRef, useState } from "react";

// Keep gallery geometry stable without rendering dozens of offscreen SVGs or
// starting all five source calculators before the first thumbnail is visible.
export default function StudioThumbnail({
  topic,
  onVisible,
  children,
  loading,
}) {
  const ref = useRef(null),
    [visible, setVisible] = useState(false);
  useEffect(() => {
    if (visible) return;
    if (!globalThis.IntersectionObserver) {
      setVisible(true);
      onVisible(topic);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          onVisible(topic);
          observer.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible, topic, onVisible]);
  return (
    <div className="studio-template-canvas" ref={ref}>
      {visible ? (
        children()
      ) : (
        <div className="studio-thumbnail-loading">{loading}</div>
      )}
    </div>
  );
}
