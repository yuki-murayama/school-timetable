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
// OpenAPI システムとルートのインポート
import { openApiApp } from './openapi'
import classroomsApp from './routes/classrooms'
import conditionsApp from './routes/conditions'
import schoolSettingsApp from './routes/school-settings'
import subjectsApp from './routes/subjects'
import teachersApp from './routes/teachers'
import testDataApp from './routes/test-data'
import { timetablesApp } from './routes/timetables-simple'

/**
 * メイン統合OpenAPIアプリケーション
 * 完全型安全・自動ドキュメント生成・統一エラーハンドリング
 */
export const createTypeeSafeApiApp = () => {
  const app = new OpenAPIHono<{ Bindings: Env }>({
    strict: false,
    defaultHook: (result, c) => {
      // バリデーションエラー時の統一レスポンス
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'リクエストデータの形式が正しくありません',
            details: {
              validationErrors: result.error.issues.map(issue => ({
                code: issue.code,
                message: issue.message,
                path: issue.path,
              })),
            },
          },
          400
        )
      }

      return c.json(result.data)
    },
  })

  // ======================
  // グローバルミドルウェア
  // ======================

  // CORS設定
  app.use(
    '*',
    cors({
      origin: [
        'http://localhost:5173',
        'https://school-timetable-monorepo.grundhunter.workers.dev',
      ],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-CSRF-Token',
        'Accept',
        'Origin',
      ],
      credentials: true,
      maxAge: 86400, // 24時間キャッシュ
    })
  )

  // リクエストタイミング測定
  app.use('*', timing())

  // リクエストログ（生産環境でも一時的に有効化してデバッグ）
  app.use('*', logger())

  // レスポンスの美化（開発環境）
  app.use('*', async (c, next) => {
    if (c.env.NODE_ENV === 'development') {
      await prettyJSON()(c, next)
    } else {
      await next()
    }
  })

  // セキュリティヘッダー
  app.use('*', async (c, next) => {
    await next()

    c.header('X-Content-Type-Options', 'nosniff')
    c.header('X-Frame-Options', 'DENY')
    c.header('X-XSS-Protection', '1; mode=block')
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    c.header(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
    )

    // API情報ヘッダー
    c.header('X-API-Version', '1.0.0')
    c.header('X-API-Type', 'school-timetable-api')
  })

  // API認証ミドルウェア - 認証が必要なエンドポイントのみに適用
  app.use('/school/*', customAuthMiddleware)

  // ======================
  // エラーハンドリング
  // ======================

  // グローバルエラーハンドラー
  app.onError((error, c) => {
    console.error('API Error:', {
      error: error.message,
      stack: error.stack,
      path: c.req.path,
      method: c.req.method,
      timestamp: new Date().toISOString(),
    })

    // 型安全なエラーレスポンス
    return c.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'サーバー内部エラーが発生しました',
        ...(c.env.NODE_ENV === 'development' && {
          details: {
            originalError: error.message,
            stack: error.stack?.split('\n').slice(0, 5), // 先頭5行のみ
          },
        }),
      },
      500
    )
  })

  // 404エラーハンドラー
  app.notFound(c => {
    return c.json(
      {
        success: false,
        error: 'NOT_FOUND',
        message: `APIエンドポイント '${c.req.path}' が見つかりません`,
        suggestions: [
          'URLが正しいか確認してください',
          'API仕様書を確認してください: /api/docs',
          '利用可能なエンドポイント一覧: /api/spec',
        ],
      },
      404
    )
  })

  // ======================
  // OpenAPIベースコア
  // ======================

  // OpenAPIドキュメント・UI・メタデータ
  app.route('/', openApiApp)

  // ======================
  // APIルートマウント
  // ======================

  // 学校設定API
  app.route('/school', schoolSettingsApp)

  // 教師管理API
  app.route('/school', teachersApp)

  // 教科管理API
  app.route('/school', subjectsApp)

  // 教室管理API
  app.route('/school', classroomsApp)

  // 条件設定API
  app.route('/school', conditionsApp)

  // 時間割管理API
  app.route('/school', timetablesApp)

  // テストデータ管理API（認証なし - テスト環境専用）
  app.route('/test-data', testDataApp)

  // ======================
  // API統計情報エンドポイント
  // ======================

  app.get('/metrics', async c => {
    try {
      const db = c.env.DB

      // 基本統計
      const [teacherCount, subjectCount, classroomCount, settingsCount] = await Promise.all([
        db.prepare('SELECT COUNT(*) as count FROM teachers').first(),
        db.prepare('SELECT COUNT(*) as count FROM subjects').first(),
        db.prepare('SELECT COUNT(*) as count FROM classrooms').first(),
        db.prepare('SELECT COUNT(*) as count FROM school_settings').first(),
      ])

      return c.json({
        success: true,
        data: {
          statistics: {
            teachers: (teacherCount as { count: number } | undefined)?.count || 0,
            subjects: (subjectCount as { count: number } | undefined)?.count || 0,
            classrooms: (classroomCount as { count: number } | undefined)?.count || 0,
            schoolSettings: (settingsCount as { count: number } | undefined)?.count || 0,
          },
          api: {
            version: '1.0.0',
            environment: c.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString(),
            uptime: Math.floor(Date.now() / 1000), // 簡易アップタイム
          },
          features: [
            '完全型安全性',
            'OpenAPI 3.0.3準拠',
            '自動バリデーション',
            'リアルタイムドキュメント',
            '統一エラーハンドリング',
            'CORS対応',
            'セキュリティヘッダー',
          ],
        },
      })
    } catch (error) {
      console.error('統計情報取得エラー:', error)
      return c.json(
        {
          success: false,
          error: 'METRICS_ERROR',
          message: '統計情報の取得に失敗しました',
        },
        500
      )
    }
  })

  // ======================
  // 開発支援エンドポイント
  // ======================

  // デバッグ用：学校設定の生データ確認（開発環境のみ）
  app.get('/debug/school-settings-raw', async c => {
    if (c.env.NODE_ENV !== 'development') {
      return c.json(
        {
          success: false,
          error: 'NOT_AVAILABLE_IN_PRODUCTION',
          message: 'このエンドポイントは開発環境でのみ利用可能です',
        },
        403
      )
    }

    try {
      const db = c.env.DB
      
      const result = await db
        .prepare('SELECT * FROM school_settings WHERE id = ?')
        .bind('default')
        .first()
      
      return c.json({
        success: true,
        rawData: result,
        types: {
          created_at: typeof result?.created_at,
          updated_at: typeof result?.updated_at,
        },
        values: {
          created_at: result?.created_at,
          updated_at: result?.updated_at,
        },
        convertedValues: {
          created_at: result?.created_at ? new Date(result.created_at as string).toISOString() : null,
          updated_at: result?.updated_at ? new Date(result.updated_at as string).toISOString() : null,
        },
        dateConstructor: {
          created_at: result?.created_at ? new Date(result.created_at as string) : null,
          updated_at: result?.updated_at ? new Date(result.updated_at as string) : null,
        }
      })
    } catch (error) {
      console.error('Debug raw school settings error:', error)
      return c.json({
        success: false,
        error: error.message,
        stack: error.stack
      }, 500)
    }
  })

  // API構造情報（開発環境のみ）
  app.get('/debug/structure', async c => {
    if (c.env.NODE_ENV !== 'development') {
      return c.json(
        {
          success: false,
          error: 'NOT_AVAILABLE_IN_PRODUCTION',
          message: 'このエンドポイントは開発環境でのみ利用可能です',
        },
        403
      )
    }

    return c.json({
      success: true,
      data: {
        routes: {
          core: ['GET /', 'GET /health', 'GET /info', 'GET /spec', 'GET /docs', 'GET /metrics'],
          schoolSettings: ['GET /school/settings', 'PUT /school/settings'],
          teachers: [
            'GET /school/teachers',
            'GET /school/teachers/{id}',
            'POST /school/teachers',
            'PUT /school/teachers/{id}',
            'DELETE /school/teachers/{id}',
          ],
          subjects: [
            'GET /school/subjects',
            'GET /school/subjects/{id}',
            'POST /school/subjects',
            'PUT /school/subjects/{id}',
            'DELETE /school/subjects/{id}',
          ],
          classrooms: [
            'GET /school/classrooms',
            'GET /school/classrooms/{id}',
            'POST /school/classrooms',
            'PUT /school/classrooms/{id}',
            'DELETE /school/classrooms/{id}',
          ],
          conditions: [
            'GET /school/conditions',
            'PUT /school/conditions',
          ],
          debug: ['GET /debug/structure'],
        },
        middleware: [
          'CORS',
          'Timing',
          'Logger (dev)',
          'PrettyJSON (dev)',
          'SecurityHeaders',
          'ErrorHandler',
          'NotFound',
        ],
        features: {
          typeSafety: '完全型安全性（Zod）',
          documentation: 'OpenAPI 3.0.3自動生成',
          validation: 'リアルタイムバリデーション',
          errors: '統一エラーレスポンス',
          security: 'セキュリティヘッダー対応',
          cors: 'CORS完全対応',
        },
      },
    })
  })

  return app
}

// デフォルトエクスポート
export default createTypeeSafeApiApp
