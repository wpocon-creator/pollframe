import React, { useEffect, useRef, useState } from "react";
export default function StaticEmbedPreview({
  src,
  title,
  height,
  previewWidth = "article",
  targetHeight = 420,
  className = "",
  scrollableDesktop = true,
  onSize,
}) {
  const containerRef = useRef(null);
  const iframeRef = useRef(null);
  const [measurement, setMeasurement] = useState(null);
  const [availableWidth, setAvailableWidth] = useState(760);
  const viewportWidth =
    previewWidth === "wide" ? 1200 : previewWidth === "phone" ? 390 : 760;
  const contentHeight =
    measurement?.src === src && measurement?.width === viewportWidth
      ? measurement.height
      : height;
  useEffect(() => {
    const origin = new URL(src, location.href).origin;
    const receive = (event) => {
      const data = event.data;
      if (
        event.source !== iframeRef.current?.contentWindow ||
        event.origin !== origin ||
        data?.type !== "pollframe:embed-size" ||
        !Number.isFinite(data.height) ||
        data.height < 1 ||
        data.height > 16000
      )
        return;
      setMeasurement({
        src,
        width: viewportWidth,
        height: Math.ceil(data.height),
      });
      onSize?.({src,width:viewportWidth,height:Math.ceil(data.height)});
    };
    window.addEventListener("message", receive);
    iframeRef.current?.contentWindow?.postMessage(
      { type: "pollframe:request-size" },
      origin,
    );
    return () => window.removeEventListener("message", receive);
  }, [src, viewportWidth, onSize]);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const measure = () => setAvailableWidth(Math.max(1, container.clientWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [previewWidth]);
  const documentScroll = scrollableDesktop;
  const scale = Math.min(1, availableWidth / viewportWidth);
  const renderedWidth = Math.round(viewportWidth * scale);
  const stageHeight = Math.round(contentHeight * scale);
  const renderedHeight = documentScroll
    ? Math.min(targetHeight, stageHeight)
    : stageHeight;
  return (
    <div
      ref={containerRef}
      className={`embed-live-preview static-embed-preview preview-${previewWidth} ${documentScroll ? "is-document-scroll" : ""} ${className}`.trim()}
      style={{
        height: `${renderedHeight}px`,
        "--embed-rendered-height": `${renderedHeight}px`,
        "--embed-source-width": `${viewportWidth}px`,
        "--embed-source-height": `${contentHeight}px`,
        "--embed-preview-scale": scale,
      }}
    >
      <div
        className="static-embed-stage"
        style={{ width: `${renderedWidth}px`, height: `${stageHeight}px` }}
      >
        <iframe
          ref={iframeRef}
          src={src}
          title={title}
          width={viewportWidth}
          height={contentHeight}
          scrolling="no"
          tabIndex={-1}
          aria-hidden="true"
          style={{
            width: `${viewportWidth}px`,
            height: `${contentHeight}px`,
            transform: `scale(${scale})`,
          }}
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        />
      </div>
    </div>
  );
}
