import React, { useEffect, useRef, useState } from "react";

// Source calculators are shared with the live widgets, not reimplemented here.
export function useExtraSnapshot(state, kind, enabled) {
  const frame = useRef(null),
    cache = useRef(new Map());
  const [result, setResult] = useState({}),
    [retry, setRetry] = useState(0);
  const params = new URLSearchParams({
    region: state.region,
    lang: state.lang,
    embed: "1",
    widget: kind === "seats" ? "modelled-seats" : "tendencies",
    studioExtraSource: "1",
  });
  if (kind === "map") {
    params.set("view", "map");
    params.delete("region");
    params.delete("widget");
    params.set("mapMode", state.mapMode);
    params.set("mapParty", state.mapParty);
  }
  if (state.pollsters !== null) params.set("pollsters", state.pollsters);
  const key = params.toString();
  useEffect(() => {
    if (!enabled || cache.current.has(key)) return;
    let cancelled = false,
      timer;
    const start = Date.now();
    const inspect = () => {
      if (cancelled) return;
      const raw = frame.current?.contentDocument
        ?.querySelector(`[data-studio-${kind}]`)
        ?.getAttribute(`data-studio-${kind}`);
      if (raw)
        try {
          const data = JSON.parse(raw);
          if (!Array.isArray(data.rows) || !data.date) throw Error("snapshot");
          if (cache.current.size >= 8)
            cache.current.delete(cache.current.keys().next().value);
          cache.current.set(key, data);
          setResult({ key, data });
          return;
        } catch {}
      if (Date.now() - start > 25000) {
        setResult({ key, error: true });
        return;
      }
      timer = setTimeout(inspect, 160);
    };
    inspect();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, enabled, retry, kind]);
  return {
    data: cache.current.get(key) || (result.key === key ? result.data : null),
    error: result.key === key && result.error,
    retry: () => setRetry((n) => n + 1),
    frame:
      enabled && !cache.current.has(key) ? (
        <iframe
          key={`${key}:${retry}`}
          ref={frame}
          className="studio-snapshot-frame"
          src={`/embed.html?${key}`}
          title="Pollframe calculation source"
          tabIndex={-1}
          aria-hidden="true"
          inert=""
        />
      ) : null,
  };
}

let approvalRequest;
export function useApprovalSnapshot(state, enabled, events = []) {
  const [data, setData] = useState(null),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setError(false);
    approvalRequest ||= fetch("/data/approval.json")
      .then((r) => {
        if (!r.ok) throw Error("approval");
        return r.json();
      })
      .then((data) => {
        if (!data.countries?.de?.series?.leader?.length)
          throw Error("approval");
        return data;
      })
      .catch((error) => {
        approvalRequest = null;
        throw error;
      });
    Promise.all([approvalRequest,import("./studio-approval-model.js")]).then(
      ([data,model]) => {
        if (active) setData({raw:data,create:model.approvalSnapshot});
      },
      () => {
        if (active) setError(true);
      },
    );
    return () => {
      active = false;
    };
  }, [enabled, retry]);
  return {
    data: data ? data.create(data.raw, state, events) : null,
    raw: data?.raw,
    create: data?.create,
    error,
    retry: () => setRetry((n) => n + 1),
    frame: null,
  };
}
