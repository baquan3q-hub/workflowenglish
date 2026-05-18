import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        // Disable SW in development to avoid cache issues during active development
        devOptions: {
          enabled: false,
        },
        workbox: {
          // Force the new service worker to activate immediately instead of
          // waiting for all tabs to close. This prevents the "stuck on old
          // cache" issue where users must manually clear browser data.
          skipWaiting: true,
          clientsClaim: true,
          // Don't precache the index.html — let it always fetch from network
          // so auth redirects and new deploys work immediately.
          navigateFallback: null,
          // Don't cache API calls or Supabase requests
          navigateFallbackDenylist: [/^\/auth/, /supabase/],
        },
        includeAssets: ['logo.svg'],
        manifest: {
          name: 'VocabMaster - AI English Learning',
          short_name: 'VocabMaster',
          description: 'Learn English vocabulary effectively with AI-powered stories and flashcards.',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: '/logo.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            },
            {
              src: '/logo.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
