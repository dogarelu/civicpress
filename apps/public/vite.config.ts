import { defineConfig } from 'vite';
import analog from '@analogjs/platform';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/public',
  plugins: [
    analog({
      ssr: true,
      static: false,
      prerender: { routes: [] },
      vite: { inlineStylesExtension: 'css' },
      nitro: {
        devProxy: {
          '/v1': { target: 'http://localhost:3000/v1', changeOrigin: true, prependPath: false },
          '/sitemap.xml': {
            target: 'http://localhost:3000/v1/sitemap.xml',
            changeOrigin: true,
          },
          '/rss.xml': {
            target: 'http://localhost:3000/v1/rss.xml',
            changeOrigin: true,
          },
          '/feed.xml': {
            target: 'http://localhost:3000/v1/feed.xml',
            changeOrigin: true,
          },
        },
        routeRules: {
          '/favicon.ico': { headers: { 'Cache-Control': 'public, max-age=300, must-revalidate' } },
          '/apple-touch-icon.png': {
            headers: { 'Cache-Control': 'public, max-age=300, must-revalidate' },
          },
          '/sitemap.xml': { proxy: 'http://localhost:3000/v1/sitemap.xml' },
          '/rss.xml': { proxy: 'http://localhost:3000/v1/rss.xml' },
          '/feed.xml': { proxy: 'http://localhost:3000/v1/feed.xml' },
          '/v1/**': { proxy: 'http://localhost:3000/v1/**' },
          '/preview/**': {
            headers: {
              'Content-Security-Policy':
                "frame-ancestors 'self' http://localhost:4300 http://127.0.0.1:4300 http://localhost:4301 http://127.0.0.1:4301 https://civicpress.ro https://www.civicpress.ro",
            },
          },
        },
      },
    }),
    tsconfigPaths({ root: '../../' }),
  ],
  server: {
    port: 4200,
    proxy: {
      '/v1': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/sitemap.xml': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: () => '/v1/sitemap.xml',
      },
      '/rss.xml': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: () => '/v1/rss.xml',
      },
      '/feed.xml': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: () => '/v1/feed.xml',
      },
    },
  },
  build: {
    outDir: '../../dist/apps/public',
    emptyOutDir: true,
    target: 'es2020',
  },
  ssr: {
    noExternal: [
      '@analogjs/router',
      '@analogjs/router/**',
      '@analogjs/platform',
      '@angular/platform-server',
      '@civicpress/shared',
    ],
  },
});
