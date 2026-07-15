import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  root: __dirname,
  base: '/admin/',
  plugins: [
    angular({ tsconfig: `${__dirname}/tsconfig.app.json` }),
    tsconfigPaths({ root: '../../' }),
  ],
  server: {
    port: 4300,
    allowedHosts: ['civic_admin', 'civicpress.ro', '.civicpress.ro'],
    proxy: {
      '/v1': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4300,
    allowedHosts: ['civic_admin', 'civicpress.ro', '.civicpress.ro'],
  },
  build: {
    outDir: '../../dist/apps/admin',
    emptyOutDir: true,
    target: 'es2020',
  },
});
