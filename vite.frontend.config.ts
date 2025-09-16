import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { PORTS, URLS } from './config/ports'

export default defineConfig(({ mode }) => {
  // 環境変数を読み込み
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react({
        // JSX自動変換を有効化（React 17+）
        jsxRuntime: 'automatic',
      }),
    ],
    root: '.',
    define: {
      // カスタム認証システム用の環境変数定義
    },
    build: {
      outDir: 'dist/frontend',
      emptyOutDir: true,
      chunkSizeWarningLimit: 1000, // 警告しきい値を1000KBに上げる
      minify: false, // Minifyを無効化（初期化問題回避）
      target: 'es2015', // より広いブラウザ互換性
      sourcemap: false, // 本番では無効化
      // ESBuild設定
      esbuild: {
        // 本番環境では console を削除
        drop: mode === 'production' ? ['console', 'debugger'] : [],
      },
      rollupOptions: {
        input: {
          main: './index.html',
        },
        output: {
          // バンドル分割を無効化（初期化問題回避）
          manualChunks: undefined,
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
      port: parseInt(env.VITE_FRONTEND_PORT) || PORTS.FRONTEND_DEV,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || URLS.BACKEND_LOCAL,
          changeOrigin: true,
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              // プロキシリクエストの修正
              if (proxyReq.path.startsWith('/api/api/')) {
                proxyReq.path = proxyReq.path.replace(/^\/api\/api\//, '/api/')
                console.log('🔧 Fixed proxyReq path:', req.url, '→', proxyReq.path)
              } else {
                console.log('🔄 Proxying request:', req.method, req.url, '→', proxyReq.path)
              }
            })
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('📨 Proxy response:', req.method, req.url, '→', proxyRes.statusCode)
            })
            proxy.on('error', (err, _req, _res) => {
              console.error('🚨 Proxy error:', err)
            })
          },
        },
      },
    },
  }
})
