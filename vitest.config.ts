import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom', // フロントエンドコンポーネントテスト用にjsdomに変更
    testTimeout: 60000,
    hookTimeout: 60000,
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'tests/unit/**/*.test.ts',
      'tests/unit/**/*.test.tsx',
    ],
    exclude: [
      'node_modules',
      'dist',
      'src/test/setup.ts',
      '**/*.d.ts',
      'src/**/*.stories.{ts,tsx}',
    ],
    // カバレッジ設定
    coverage: {
      provider: 'v8', // または 'c8'
      reporter: ['text', 'html', 'json', 'json-summary'],
      reportsDirectory: './coverage',
      include: [
        // フロントエンド全体
        'src/frontend/**/*.{ts,tsx}',
        // バックエンド全体
        'src/backend/**/*.ts',
        // 共有モジュール
        'src/shared/**/*.ts',
      ],
      exclude: [
        // テスト関連ファイル
        'src/**/*.d.ts',
        'src/**/*.stories.{ts,tsx}',
        'src/**/*.test.{ts,tsx}',
        'src/test/**/*',
        // エントリーポイント（テスト対象外）
        'src/frontend/main.tsx',
        'src/worker.ts',
        // 設定・型定義（テスト対象外）
        'src/frontend/vite-env.d.ts',
        // 依存関係
        'node_modules',
      ],
      // 段階的カバレッジ要件（最終目標100%）
      thresholds: {
        global: {
          branches: 60, // 現実的な初期目標
          functions: 70, // 関数レベルは比較的高い目標
          lines: 65, // 行レベルカバレッジ
          statements: 65, // 文レベルカバレッジ
        },
        // 高品質実装済みファイルの厳格要件
        'src/frontend/lib/api/type-safe-client.ts': {
          branches: 100, // 完全テスト済み
          functions: 100,
          lines: 100,
          statements: 100,
        },
        'src/frontend/hooks/use-teacher-api.ts': {
          branches: 100, // 完全テスト済み
          functions: 100,
          lines: 100,
          statements: 100,
        },
        'src/frontend/lib/api/index.ts': {
          branches: 100, // 完全テスト済み
          functions: 100,
          lines: 100,
          statements: 100,
        },
        'src/backend/services/type-safe-service.ts': {
          branches: 100, // 完全テスト済み
          functions: 100,
          lines: 100,
          statements: 100,
        },
        'src/backend/controllers/type-safe-controller.ts': {
          branches: 100, // 完全テスト済み
          functions: 100,
          lines: 100,
          statements: 100,
        },
        'src/shared/schemas.ts': {
          branches: 80, // 共有モジュールは段階的に
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
      // カバレッジ不足の場合はテスト失敗
      skipFull: false,
      all: true,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/frontend/components'),
      '@/hooks': path.resolve(__dirname, './src/frontend/hooks'),
      '@/lib': path.resolve(__dirname, './src/frontend/lib'),
      '@/shared': path.resolve(__dirname, './src/shared'),
      '@shared/schemas': path.resolve(__dirname, './src/shared/schemas.ts'),
      // 追加のエイリアス
      '../../shared/schemas': path.resolve(__dirname, './src/shared/schemas.ts'),
      '../shared/schemas': path.resolve(__dirname, './src/shared/schemas.ts'),
    },
  },
  esbuild: {
    target: 'es2022',
  },
})
