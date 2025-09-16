/**
 * 🔧 ポート設定 - 一括管理
 * 全ての開発サーバーとE2Eテストのポート番号を統一管理
 */

export const PORTS = {
  // フロントエンド開発サーバー
  FRONTEND_DEV: 5176,

  // バックエンド開発サーバー (Wrangler)
  BACKEND_DEV: 8787,

  // E2Eテスト対象ポート（通常はフロントエンドと同じ）
  E2E_TARGET: 5176,
  
  // 本番環境（動的・環境変数から取得）
  PRODUCTION: process.env.PORT ? parseInt(process.env.PORT, 10) : 443,
} as const

export const URLS = {
  // ローカル開発用URL
  FRONTEND_LOCAL: `http://localhost:${PORTS.FRONTEND_DEV}`,
  BACKEND_LOCAL: `http://localhost:${PORTS.BACKEND_DEV}`,
  E2E_LOCAL: `http://localhost:${PORTS.E2E_TARGET}`,
  
  // API用URL
  API_LOCAL: `http://localhost:${PORTS.BACKEND_DEV}/api`,
  
  // 本番用URL（環境変数から取得）
  PRODUCTION: process.env.PRODUCTION_URL || 'https://school-timetable-monorepo.grundhunter.workers.dev',
  PRODUCTION_API: (process.env.PRODUCTION_URL || 'https://school-timetable-monorepo.grundhunter.workers.dev') + '/api',
} as const

/**
 * 環境に応じたURL取得ヘルパー
 */
export const getBaseURL = (env: 'local' | 'production' = 'local') => {
  switch (env) {
    case 'production':
      return URLS.PRODUCTION
    case 'local':
    default:
      return URLS.E2E_LOCAL
  }
}

export const getApiURL = (env: 'local' | 'production' = 'local') => {
  switch (env) {
    case 'production':
      return URLS.PRODUCTION_API
    case 'local':
    default:
      return URLS.API_LOCAL
  }
}

// 環境変数を一括設定用の関数
export const setEnvironmentVariables = () => {
  process.env.VITE_FRONTEND_PORT = PORTS.FRONTEND_DEV.toString()
  process.env.VITE_BACKEND_PORT = PORTS.BACKEND_DEV.toString()
  process.env.VITE_API_URL = URLS.API_LOCAL
}

export default PORTS