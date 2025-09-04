import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // 環境変数を読み込み
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    root: '.',
    define: {
      // カスタム認証システム用の環境変数定義
    },
    build: {
      outDir: 'dist/frontend',
      emptyOutDir: true,
      chunkSizeWarningLimit: 1000, // 警告しきい値を1000KBに上げる
      minify: 'esbuild', // esbuildを使用（高速）
      rollupOptions: {
        input: {
          main: './index.html',
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
            // 認証ライブラリを分離（Clerk削除）
            // ドラッグ&ドロップライブラリを分離
            dnd: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
            // ルーティングライブラリを分離
            router: ['react-router-dom'],
          },
          // ファイル名にハッシュを追加してキャッシュ最適化
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src/frontend'),
        '@shared': path.resolve(__dirname, './src/shared'),
        '@shared/schemas': path.resolve(__dirname, './src/shared/schemas.ts'),
      },
    },
    server: {
      port: parseInt(env.VITE_FRONTEND_PORT) || 5174,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:8787',
          changeOrigin: true,
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              // プロキシリクエストの修正
              if (proxyReq.path.startsWith('/api/api/')) {
                proxyReq.path = proxyReq.path.replace(/^\/api\/api\//, '/api/')
                console.log('🔧 Fixed proxyReq path:', req.url, '→', proxyReq.path)
              } else {
                console.log('🔄 Proxying request:', req.method, req.url, '→', proxyReq.path)
              }
            })
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('📨 Proxy response:', req.method, req.url, '→', proxyRes.statusCode)
            })
            proxy.on('error', (err, req, res) => {
              console.error('🚨 Proxy error:', err)
            })
          },
        },
      },
    },
  }
})
