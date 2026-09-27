/* Pollframe embeds: optional content sizing. No cookies, tracking or network calls. */
(() => {
  const script = document.currentScript;
  if (!script) return;
  const origin = new URL(script.src).origin;
  const key = "__pollframeEmbedResize";
  if (window[key]) return;
  window[key] = true;
  const frames = new WeakSet();
  const valid = (frame) => {
    try {
      const url = new URL(frame.src);
      return url.origin === origin && url.pathname === "/embed.html";
    } catch {
      return false;
    }
  };
  const request = (frame) => {
    if (valid(frame))
      frame.contentWindow?.postMessage(
        { type: "pollframe:request-size" },
        origin,
      );
  };
  const scan = () =>
    document
      .querySelectorAll("iframe[data-pollframe-autoheight]")
      .forEach((frame) => {
        if (!valid(frame) || frames.has(frame)) return;
        frames.add(frame);
        frame.addEventListener("load", () => request(frame));
        request(frame);
      });
  window.addEventListener("message", (event) => {
    const data = event.data;
    if (
      event.origin !== origin ||
      data?.type !== "pollframe:embed-size" ||
      !Number.isFinite(data.height) ||
      data.height < 1 ||
      data.height > 16000
    )
      return;
    for (const frame of document.querySelectorAll(
      "iframe[data-pollframe-autoheight]",
    )) {
      if (
        frames.has(frame) &&
        valid(frame) &&
        frame.contentWindow === event.source
      ) {
        frame.height = String(Math.ceil(data.height));
        frame.style.height = `${Math.ceil(data.height)}px`;
      }
    }
  });
  new MutationObserver(scan).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  scan();
})();
