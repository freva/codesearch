import react from '@vitejs/plugin-react';
import { defineConfig as defineViteConfig, mergeConfig } from 'vite';
import { defineConfig as defineVitestConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';

const viteConfig = defineViteConfig({
  build: {
    sourcemap: false,
  },
  plugins: [react(), tailwindcss()],
});

const vitestConfig = defineVitestConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    watch: false,
  },
});

export default mergeConfig(viteConfig, vitestConfig);
