import { resolve } from "node:path";
import { defineConfig } from "vite";
import { previewLiveDataPlugin } from "./scripts/lib/preview-live-data.mjs";

// Vite serves the frontend, not Durable Objects. Keep the election endpoint
// connected to the local Worker instead of returning index.html with HTTP 200.
const electionProxy = {
  // Loopback-only account laboratory, not a production Worker route.
  "/api/auth": {target:"http://127.0.0.1:4182"},
  "/api/account": {target:"http://127.0.0.1:4182"},
  "/api/studio-assistant": {target:"http://127.0.0.1:4181",changeOrigin:true},
  "/api/elections/sachsen-anhalt-2026": {
    target: "http://127.0.0.1:4177",
    changeOrigin: true,
  },
};

export default defineConfig({
  // Prebundle this lazy account dependency before a form is opened. Discovering
  // it only during authenticator setup would reload Vite and discard the form.
  optimizeDeps:{include:['qrcode']},
  // Opt out explicitly for fixture-based/offline development. This does not
  // affect production builds, publish data, or overwrite files in this branch.
  plugins: [previewLiveDataPlugin({enabled:process.env.POLLFRAME_PREVIEW_DATA!=="local"})].filter(Boolean),
  server: {
    host: "127.0.0.1",
    proxy: electionProxy,
  },
  preview: {
    host: "127.0.0.1",
    proxy: electionProxy,
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        onlyExplicitManualChunks: true,
        // Shared presentation validation belongs to Studio, never country startup.
        manualChunks(id) {
          if (id.endsWith('/src/account-password.jsx')) return 'account-password';
          if (id.endsWith('/src/account-access.js')) return 'account-access';
          // Authenticator QR generation is explicitly on demand, not country
          // startup. Name it so release budgets cannot mistake it for base JS.
          if (/\/node_modules\/qrcode\//.test(id)) return 'account-qr';
          if (/\/src\/studio-search(?:-core|-descriptions)?\.js$/.test(id)) return 'studio-search';
          if (/\/src\/studio-(?:elements\.js|svg\.jsx)$/.test(id)) return 'studio-presentation';
          if (id.endsWith('/src/studio-range.jsx')) return 'studio-range';
          if (/\/src\/studio-event-(?:controls|layers)\.jsx$/.test(id)) return 'studio-event-controls';
          if (id.endsWith('/src/studio-custom-events.js')) return 'studio-custom-events';
        },
      },
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        embed: resolve(import.meta.dirname, "embed.html"),
      },
    },
  },
});
