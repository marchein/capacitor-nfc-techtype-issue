import { defineConfig } from 'vite';

export default defineConfig({
  root: './src',
  optimizeDeps: { 
    esbuildOptions: {
      target: "esnext", 
      define: {
        global: 'globalThis'
      },
      supported: { 
        bigint: true 
      },
    }
  },
  build: {
    outDir: '../dist',
    minify: false,
    emptyOutDir: true,
    target: ["esnext"],
  },
});
