import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Só em desenvolvimento (npm run dev): permite ao browser ligar-se ao Supabase local.
// Em produção (npm run build) a CSP do index.html fica inalterada.
function localSupabaseCspPlugin(): Plugin {
  return {
    name: "local-supabase-csp",
    apply: "serve",
    transformIndexHtml(html) {
      return html.replace(
        "connect-src 'self'",
        "connect-src 'self' http://127.0.0.1:54321 ws://127.0.0.1:54321 http://localhost:54321 ws://localhost:54321",
      );
    },
  };
}

/** Converte os <link> de CSS em preload não bloqueante (com <noscript> de recurso). */
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
    strictPort: true, // se a 8080 estiver ocupada, falha em vez de mudar de porta (o login depende dela)
    hmr: {
      overlay: false,
    },
    // Não recarregar a página quando os testes escrevem relatórios.
    watch: {
      ignored: ["**/e2e-relatorio/**", "**/test-results/**", "**/playwright-report/**"],
    },
  },
  plugins: [react(), cssPreloadPlugin(), localSupabaseCspPlugin()],
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
