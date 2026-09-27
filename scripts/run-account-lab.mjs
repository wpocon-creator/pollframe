import { createServer } from "node:http";
import { mkdir, readFile, writeFile, chmod } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { createAccountLab } from "../server/account-lab.mjs";

// Never bind 0.0.0.0 and never serve test mail links over a public interface.
const directory = new URL("../.account-lab/", import.meta.url);
await mkdir(directory, { recursive: true, mode: 0o700 });
await chmod(directory, 0o700);
const secretFile = new URL("secret", directory);
let secret;
try {
  secret = await readFile(secretFile, "utf8");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  secret = randomBytes(48).toString("base64url");
  await writeFile(secretFile, secret, { mode: 0o600, flag: "wx" });
}
const lab = await createAccountLab({
  database: new URL("accounts.sqlite", directory).pathname,
  secret,
});
const server = createServer(async (req, res) => {
  try {
    if (
      !["127.0.0.1:4182", "127.0.0.1:4173", "127.0.0.1:4174"].includes(
        req.headers.host,
      )
    ) {
      res.writeHead(403).end();
      return;
    }
    if (req.url === "/api/account/test-outbox") {
      // Require a same-origin scripted request; no token-bearing mails in URLs/logs.
      const allowed = [
        "http://127.0.0.1:4173",
        "http://127.0.0.1:4174",
        "http://127.0.0.1:4182",
      ];
      if (
        req.method !== "POST" ||
        !allowed.includes(req.headers.origin) ||
        req.headers["sec-fetch-site"] === "cross-site" ||
        req.headers["x-pollframe-lab"] !== "1"
      ) {
        res.writeHead(403).end();
        return;
      }
      res
        .writeHead(200, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, private",
          "X-Content-Type-Options": "nosniff",
        })
        .end(JSON.stringify({ items: lab.outbox }));
      return;
    }
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 300000) {
        res.writeHead(413).end();
        return;
      }
      chunks.push(chunk);
    }
    const request = new Request(`http://${req.headers.host}${req.url}`, {
      method: req.method,
      headers: req.headers,
      ...(size ? { body: Buffer.concat(chunks) } : {}),
    });
    const response = await lab.handle(request);
    res.writeHead(response.status, {
      ...Object.fromEntries(response.headers),
      ...(response.headers.getSetCookie().length
        ? { "set-cookie": response.headers.getSetCookie() }
        : {}),
    });
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res
      .writeHead(500, { "Cache-Control": "no-store" })
      .end("Local account test failed");
  }
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.listen(4182, "127.0.0.1", () =>
  console.log(
    "Local account lab ready on loopback :4182. Test addresses only; no real email is sent.",
  ),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, () =>
    server.close(() => {
      lab.close();
      process.exit(0);
    }),
  );
