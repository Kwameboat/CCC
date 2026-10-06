import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/** Stamp sw.js + version.json on every production build so installed apps detect updates. */
function pwaBuildStamp(): Plugin {
  return {
    name: 'pwa-build-stamp',
    closeBundle() {
      const stamp = `${Date.now().toString(36)}`;
      const dist = join(process.cwd(), 'dist');
      const swPath = join(dist, 'sw.js');
      if (existsSync(swPath)) {
        let sw = readFileSync(swPath, 'utf8');
        sw = sw.replace(/const CACHE_VERSION = ['"][^'"]+['"]/, `const CACHE_VERSION = 'ccc-pwa-${stamp}'`);
        if (!sw.includes(`// build ${stamp}`)) {
          sw += `\n// build ${stamp}\n`;
        }
        writeFileSync(swPath, sw);
      }
      writeFileSync(
        join(dist, 'version.json'),
        JSON.stringify({ version: stamp, builtAt: new Date().toISOString() }, null, 2)
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), pwaBuildStamp()],
  define: {
    'process.env': {}
  },
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000
  }
});
