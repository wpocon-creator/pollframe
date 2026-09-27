const escape = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
export function iframeMarkup({ src, title, height, measuredSize, previewWidth }) {
  const width = previewWidth === 'wide' ? 1200 : previewWidth === 'phone' ? 390 : 760;
  if(measuredSize?.src === src && measuredSize?.width === width) height = measuredSize.height;
  return `<iframe data-pollframe-autoheight src="${escape(src)}" title="${escape(title)}" width="100%" height="${Number(height)}" loading="lazy" style="border:0;display:block;width:100%;max-width:100%" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe>\n<script async src="${escape(new URL("/embed-resize.js", src).href)}"></script>`;
}
