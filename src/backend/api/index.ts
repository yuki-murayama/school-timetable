/**
 * 統合OpenAPIアプリケーション
 * すべての型安全APIルートとドキュメント生成システムを統合
 */
import { OpenAPIHono } from '@hono/zod-openapi'
// 型定義
import type { Env } from '@shared/schemas'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { timing } from 'hono/timing'
// 認証ミドルウェア
import { customAuthMiddleware } from '../middleware/auth'
// 統合OpenAPIアプリケーション
import { createUnifiedOpenApiApp } from './unified-openapi'

/**
 * 統合OpenAPIアプリケーション作成
 * 全エンドポイントが統合された単一アプリケーション
 */
export const createTypeeSafeApiApp = () => {
  // 統合OpenAPIアプリを使用
  return createUnifiedOpenApiApp()
}

// デフォルトエクスポート
export default createTypeeSafeApiApp
