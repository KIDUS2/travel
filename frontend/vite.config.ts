import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** Writes asset-list.json with every built file, so the service worker can cache all of them for offline use. */
function offlineAssetList(): Plugin {
  return {
    name: 'teguwaz-offline-asset-list',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle).filter((f) => f.startsWith('assets/')).map((f) => `/${f}`);
      this.emitFile({ type: 'asset', fileName: 'asset-list.json', source: JSON.stringify(files) });
    },
  };
}

export default defineConfig({
  plugins: [react(), offlineAssetList()],
  server: {
    port: 5173,
    proxy: {
      // Forward API calls to the Spring Boot backend in development
      '/api': 'http://localhost:8080',
    },
  },
});
