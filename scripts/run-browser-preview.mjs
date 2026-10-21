// UI-only tests need a deterministic anonymous API, not a missing account lab
// that turns every navigation into HTTP 500. Auth, writes and live Workers are
// exercised by separate real workerd/D1/HTTPS fixtures, never mocked here.
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { sourceDigest } from "./release-provenance.mjs";

export function assertBrowserBuildCurrent(manifest, digest) {
  if (manifest?.schema !== 1 || manifest.sourceDigest !== digest)
    throw Error("Browser tests blocked: dist does not match current application source. Run npm run build before testing.");
}

export function anonymousBrowserResponse(path, method) {
  if (method !== "GET") return null;
  if (path === "/api/auth/get-session") return nullSession;
  if (path === "/api/account/capabilities") return { enabled: true, localOnly: true, privateResults: false };
  if (path === "/api/elections/sachsen-anhalt-2026") return { result: null };
  return undefined;
}
const nullSession = Object.freeze({ fixtureBody: "null" });
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  assertBrowserBuildCurrent(JSON.parse(await readFile("dist/release.json", "utf8")), await sourceDigest());
  const { preview } = await import("vite");
  const server = await preview({
    preview: { host: "127.0.0.1", port: 4174, strictPort: true },
    plugins: [{
      name: "pollframe-anonymous-browser-fixture",
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          const value = anonymousBrowserResponse(new URL(req.url, "http://127.0.0.1").pathname, req.method);
          if (value === undefined || value === null) return next();
          res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Pollframe-Test-Fixture": "anonymous-ui-only" });
          res.end(value === nullSession ? "null" : JSON.stringify(value));
        });
      },
    }],
  });
  server.printUrls();
  console.log("Anonymous UI test preview only; account release tests use real isolated D1/HTTPS.");
}
