import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: '.',
  define: {
    'import.meta.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify('pk_test_ZXF1YWwteWV0aS00Ny5jbGVyay5hY2NvdW50cy5kZXYk'),
  },
  build: {
    outDir: 'dist/frontend',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000, // 警告しきい値を1000KBに上げる
    minify: 'esbuild', // esbuildを使用（高速）
    rollupOptions: {
      input: {
        main: './index.html'
      },
      output: {
        manualChunks: {
          // ベンダーライブラリを分離
          vendor: ['react', 'react-dom'],
          // UI ライブラリを分離
          ui: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-select',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-label',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
          ],
          // 認証ライブラリを分離
          auth: ['@clerk/clerk-react'],
          // ドラッグ&ドロップライブラリを分離
          dnd: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          // ルーティングライブラリを分離
          router: ['react-router-dom'],
        },
        // ファイル名にハッシュを追加してキャッシュ最適化
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/frontend'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      }
    }
  }
})