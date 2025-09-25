// 統合OpenAPIアプリケーション
import { createUnifiedOpenApiApp } from './unified-openapi'

/**
 * 統合OpenAPIアプリケーション作成
 * 全エンドポイントが統合された単一アプリケーション
 */
export const createTypeSafeApiApp = () => {
  // 統合OpenAPIアプリを使用
  return createUnifiedOpenApiApp()
}

// デフォルトエクスポート
export default createTypeSafeApiApp
