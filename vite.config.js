import { resolve } from "node:path";
import { defineConfig } from "vite";

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
