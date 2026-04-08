import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

/**
 * Converts render-blocking CSS <link> tags to non-blocking preloads
 * with a fallback noscript block for no-JS environments.
 */
function cssPreloadPlugin(): Plugin {
  return {
    name: 'css-preload',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace(
        /<link rel="stylesheet"([^>]*href="([^"]+\.css)"[^>]*)>/g,
        (_, attrs, href) =>
          `<link rel="preload" as="style"${attrs} onload="this.onload=null;this.rel='stylesheet'">\n    <noscript><link rel="stylesheet"${attrs}></noscript>`
      );
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), cssPreloadPlugin(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-ui': ['framer-motion', 'recharts', 'react-markdown'],
        },
      },
    },
  },
}));
