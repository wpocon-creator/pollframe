// Private, temporary API-only acceptance environment. Not imported by index.js.
import { createAccountService } from "./accounts.js";
import { ACCOUNT_PREVIEW_ORIGIN } from "../server/account-origin.mjs";

const hidden = () => new Response("Not found", {status:404, headers:{
  "cache-control":"no-store", "x-robots-tag":"noindex, nofollow, noarchive",
  "content-security-policy":"default-src 'none'; frame-ancestors 'none'",
  "x-content-type-options":"nosniff", "referrer-policy":"no-referrer",
}});
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Missing, expired or incorrectly scoped configuration fails closed.
    if (url.origin !== ACCOUNT_PREVIEW_ORIGIN ||
        env.PREVIEW_GATE_SECRET?.length < 40 || !env.PREVIEW_GATE_SECRET ||
        !Number.isFinite(Number(env.PREVIEW_EXPIRES)) || Date.now() > Number(env.PREVIEW_EXPIRES) ||
        request.headers.get("authorization") !== `Bearer ${env.PREVIEW_GATE_SECRET}`)
      return hidden();
    if (url.pathname === "/preview-ready") return Response.json({privatePreview:true},{headers:{"cache-control":"no-store","x-robots-tag":"noindex"}});
    if (!url.pathname.startsWith("/api/auth/") && !url.pathname.startsWith("/api/account/")) return hidden();
    // Auth initialization includes asynchronous adapter work. Never carry that
    // request-owned promise into another invocation after a capabilities check.
    const service = createAccountService(env, {
      baseURL: ACCOUNT_PREVIEW_ORIGIN,
      fetchMail: async (address, options) => {
        const payload = JSON.parse(options.body);
        if (address !== "https://api.resend.com/emails" ||
            payload.to?.length !== 1 || payload.to[0] !== "william@pollframe.com")
          throw Error("Preview mail recipient is not allowed");
        return fetch(address, options);
      },
    });
    const response = await service(request);
    const headers = new Headers(response.headers);
    headers.set("x-robots-tag","noindex, nofollow, noarchive");
    return new Response(response.body,{status:response.status,headers});
  },
};
