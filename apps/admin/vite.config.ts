import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  root: __dirname,
  plugins: [
    angular({ tsconfig: `${__dirname}/tsconfig.app.json` }),
    tsconfigPaths({ root: '../../' }),
  ],
  server: {
    port: 4300,
    proxy: {
      '/v1': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../../dist/apps/admin',
    emptyOutDir: true,
    target: 'es2020',
  },
});
