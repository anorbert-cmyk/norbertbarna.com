// Builds the admin single-page app (React + Astryx) into ../admin, which is
// committed and served by server.js at /admin. Run: npm run build:admin
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: import.meta.dirname,
  base: "/admin/",
  plugins: [react()],
  build: {
    outDir: "../admin",
    emptyOutDir: true,
    sourcemap: false,
    target: "es2022",
    chunkSizeWarningLimit: 1500,
  },
  server: { proxy: { "/admin/api": "http://localhost:3000", "/assets": "http://localhost:3000" } },
});
