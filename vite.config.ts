import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { mochaPlugins } from "@getmocha/vite-plugins";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins: [
    ...mochaPlugins(process.env as any),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "TaskSync",
        short_name: "TaskSync",
        description:
          "TaskSync: Chat with your Google Tasks & Keep, powered by AI. Sync, search, and manage all effortlessly in one place.",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        start_url: ".",
        icons: [
          {
            src: "https://mocha-cdn.com/apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png",
          },
          {
            src: "https://mocha-cdn.com/og.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "https://mocha-cdn.com/og.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "https://mocha-cdn.com/og.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  server: {
    allowedHosts: true,
  },
  build: {
    chunkSizeWarningLimit: 5000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
