import path from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: 'src/worker.ts',
      name: 'worker',
      fileName: () => `worker.js`,
      formats: ['es'],
    },
    rollupOptions: {
      external: ['cloudflare:workers'],
      output: {
        inlineDynamicImports: true,
      },
    },
    minify: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@shared/schemas': path.resolve(__dirname, './src/shared/schemas.ts'),
    },
  },
})
