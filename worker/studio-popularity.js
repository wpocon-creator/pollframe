import { STUDIO_TEMPLATE_IDS } from "../src/studio-template-ids.js";
const valid = new Set(STUDIO_TEMPLATE_IDS);
// Counts selections, not people. No IP, referrer, search text or identifier is stored.
export async function studioPopularity(request, storage) {
  const today = new Date().toISOString().slice(0, 10),
    cutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  if (request.method === "POST") {
    let data;
    try {
      data = await request.json();
    } catch {
      return new Response(null, { status: 400 });
    }
    if (!data || typeof data !== "object" || Array.isArray(data) || !valid.has(data.template)) return new Response(null, { status: 400 });
    await storage.transaction(async (tx) => {
      const key = "studio:" + today,
        counts = (await tx.get(key)) || {};
      counts[data.template] = (counts[data.template] || 0) + 1;
      await tx.put(key, counts);
    });
    await storage.setAlarm?.(Date.now() + 86400000);
  }
  const days = await storage.list({ prefix: "studio:" }),
    counts = {},
    expired = [];
  for (const [key, values] of days) {
    if (key.slice(7) < cutoff) {
      expired.push(key);
      continue;
    }
    for (const [id, n] of Object.entries(values)) {
      if (valid.has(id) && Number.isFinite(n))
        counts[id] = (counts[id] || 0) + n;
    }
  }
  if (expired.length) await storage.delete(expired);
  return request.method === "POST"
    ? new Response(null, { status: 204 })
    : Response.json(
        { counts },
        {
          headers: {
            "cache-control": "public, max-age=300",
            "x-content-type-options": "nosniff",
          },
        },
      );
}
