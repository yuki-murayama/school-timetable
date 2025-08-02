import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: 'src/worker.ts',
      name: 'worker',
      fileName: () => 'worker.js',
      formats: ['es']
    },
    rollupOptions: {
      external: ['cloudflare:workers']
    },
    minify: false
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})