// Real loopback HTTPS, including Set-Cookie arrays and HTTP redirects. This
// avoids browser-specific limitations of Playwright route.fulfill mocks.
import { createServer } from "node:https";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve, extname } from "node:path";
const backend = "https://pollframe.com";
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
};
export async function accountBrowserServer(mf, directory) {
  const temp = await mkdtemp("/tmp/pollframe-account-tls-");
  const result = spawnSync(
    "openssl",
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-subj",
      "/CN=localhost",
      "-days",
      "1",
      "-keyout",
      temp + "/key.pem",
      "-out",
      temp + "/cert.pem",
    ],
    { stdio: "pipe" },
  );
  if (result.status !== 0)
    throw Error("OpenSSL is required for the local account HTTPS test");
  let origin;
  const assets = resolve(directory);
  const csp = (await readFile(resolve(directory, "_headers"), "utf8")).match(
    /^\s+Content-Security-Policy: (default-src[^\n]+)/m,
  )?.[1];
  if (!csp?.includes("require-trusted-types-for"))
    throw Error("Production CSP missing in release fixture");
  const server = createServer(
    {
      key: await readFile(temp + "/key.pem"),
      cert: await readFile(temp + "/cert.pem"),
    },
    async (req, res) => {
      try {
        const url = new URL(req.url, origin);
        if (
          url.pathname.startsWith("/api/auth/") ||
          url.pathname.startsWith("/api/account/")
        ) {
          const chunks = [];
          let size = 0;
          for await (const chunk of req) {
            size += chunk.length;
            if (size > 100000) {
              res.writeHead(413).end();
              return;
            }
            chunks.push(chunk);
          }
          let body = size ? Buffer.concat(chunks).toString() : undefined;
          if (body) {
            const parsed = JSON.parse(body);
            for (const key of ["redirectTo", "callbackURL"]) {
              if (typeof parsed[key] === "string") {
                const target = new URL(parsed[key], origin);
                if (target.origin === origin)
                  parsed[key] = backend + target.pathname + target.search;
              }
            }
            body = JSON.stringify(parsed);
          }
          const headers = { ...req.headers, "cf-connecting-ip": "192.0.2.71" };
          delete headers.host;
          if (headers.origin === origin) headers.origin = backend;
          if (body) headers["content-length"] = String(Buffer.byteLength(body));
          const response = await mf.dispatchFetch(
            backend + url.pathname + url.search,
            { method: req.method, headers, body, redirect: "manual" },
          );
          const output = Object.fromEntries(response.headers);
          if (response.headers.getSetCookie().length)
            output["set-cookie"] = response.headers.getSetCookie();
          if (output.location) {
            const target = new URL(output.location, backend);
            if (target.origin !== backend)
              throw Error("Unexpected test redirect origin");
            output.location = origin + target.pathname + target.search;
          }
          res
            .writeHead(response.status, output)
            .end(Buffer.from(await response.arrayBuffer()));
          return;
        }
        if (url.pathname.startsWith("/api/")) {
          res.writeHead(200, { "content-type": "application/json" }).end("{}");
          return;
        }
        const path = !extname(url.pathname) ? "/index.html" : url.pathname;
        const file = resolve(assets, "." + decodeURIComponent(path));
        if (!file.startsWith(assets + "/")) {
          res.writeHead(404).end();
          return;
        }
        let contents;
        try {
          contents = await readFile(file);
        } catch {
          res.writeHead(404).end();
          return;
        }
        res
          .writeHead(200, {
            "content-type": types[extname(file)] || "application/octet-stream",
            "cache-control": "no-store",
            "referrer-policy": "no-referrer",
            ...(extname(file) === ".html"
              ? { "content-security-policy": csp + "; frame-ancestors 'none'" }
              : {}),
          })
          .end(contents);
      } catch {
        res
          .writeHead(500, { "content-type": "application/json" })
          .end('{"error":"Local account HTTPS fixture failed"}');
      }
    },
  );
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  origin = `https://127.0.0.1:${server.address().port}`;
  return {
    origin,
    async close() {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
      await rm(temp, { recursive: true });
    },
  };
}
