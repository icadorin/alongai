import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(fileURLToPath(new URL('./src', import.meta.url))),
    },
  },
});
