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
        },
        routeRules: {
          '/v1/**': { proxy: 'http://localhost:3000/v1/**' },
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
    ],
  },
});
