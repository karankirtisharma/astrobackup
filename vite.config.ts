import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages serves under /<repo>/ — the deploy workflow sets DEPLOY_BASE.
  base: process.env.DEPLOY_BASE ?? '/',
  plugins: [react()],
  server: {
    port: Number(process.env.PORT) || 5173,
    strictPort: false,
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
  },
  assetsInclude: ['**/*.glb'],
});
