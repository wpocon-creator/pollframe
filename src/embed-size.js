// Only loaded inside embed.html. No visitor identifiers or analytics: messages
// contain just the public document height, never page contents or user data.
export function startEmbedSizeReporting() {
  if (window.parent === window) return;
  const query = new URLSearchParams(location.search);
  // Studio's same-origin data frames are never displayed as publisher embeds.
  // Their DOM snapshots do not need layout measurement or resize messages.
  if (["studioSource", "studioHistorySource", "studioExtraSource"].some(key => query.get(key) === "1")) return;
  let frame = 0,
    last = 0,
    observed;
  const measure = () => {
    frame = 0;
    const main = document.querySelector("#root > main, #root main");
    if (
      !main ||
      main.classList.contains("embed-loading") ||
      main.getAttribute("role") === "status"
    )
      return;
    if (observed !== main) {
      resize.disconnect();
      resize.observe(main);
      observed = main;
    }
    const height = Math.ceil(main.getBoundingClientRect().bottom + scrollY);
    if (height > 0 && height <= 16000 && height !== last) {
      last = height;
      parent.postMessage({ type: "pollframe:embed-size", height }, "*");
    }
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(measure);
  };
  const resize = new ResizeObserver(schedule);
  const changes = new MutationObserver(schedule);
  changes.observe(document.getElementById("root"), {
    childList: true,
    subtree: true,
    characterData: true,
  });
  window.addEventListener("resize", schedule);
  window.addEventListener("message", (event) => {
    if (
      event.source === parent &&
      event.data?.type === "pollframe:request-size"
    ) {
      last = 0;
      schedule();
    }
  });
  document.fonts?.ready.then(schedule);
  schedule();
}
