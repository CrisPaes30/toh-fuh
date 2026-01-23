import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const isProd = mode === "production";
  const enableManus = process.env.VITE_ENABLE_MANUS === "true";

  const plugins = [
    react(),
    tailwindcss(),
    jsxLocPlugin(),

    // ✅ PWA (Instalável no celular)
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: true, // ✅ permite testar PWA no dev (vite dev)
      },
      includeAssets: [
        "favicon.ico",
        "apple-touch-icon.png",
        "robots.txt",
      ],
      manifest: {
        name: "To Fuhh",
        short_name: "ToFuhh",
        description: "Seu gerenciador financeiro pessoal",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#2563eb",
        icons: [
          {
            src: "/pwa-192.png",
            sizes: "1024x1024",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512.png",
            sizes: "1024x1024",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512-maskable.png",
            sizes: "1024x1024",
            type: "image/png",
            purpose: "maskable",
          },
        ],        
      },
    }),

    // ✅ manus runtime só em produção (ou quando você ligar manualmente)
    isProd || enableManus ? vitePluginManusRuntime() : undefined,
  ].filter(Boolean);

  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    envDir: path.resolve(import.meta.dirname),

    root: path.resolve(import.meta.dirname, "client"),
    publicDir: path.resolve(import.meta.dirname, "client", "public"),

    build: {
      outDir: "dist",
      emptyOutDir: true,
    },

    server: {
      host: true,
      allowedHosts: [
        ".manuspre.computer",
        ".manus.computer",
        ".manus-asia.computer",
        ".manuscomputer.ai",
        ".manusvm.computer",
        "localhost",
        "127.0.0.1",
      ],
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
      proxy: {
        "/api": "http://localhost:3000",
      },
    },
  };
});
