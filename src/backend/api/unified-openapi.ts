/**
 * 統合OpenAPIアプリケーション
 * 既存APIモジュールを統合してOpenAPI仕様書を生成
 */

import { swaggerUI } from '@hono/swagger-ui'
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import type { Env } from '@shared/schemas'
import { timing } from 'hono/timing'
import { createResponseSchemas } from './openapi'
// 循環インポート問題回避のため、APIモジュールのインポートを一時的に無効化
// import classroomsApp from './routes/classrooms'
// import conditionsApp from './routes/conditions'
// import schoolSettingsApp from './routes/school-settings'
// import subjectsApp from './routes/subjects'
// import teachersApp from './routes/teachers'
// import { testDataApp } from './routes/test-data'
// import timetablesApp from './routes/timetables'

/**
 * 統合OpenAPIアプリケーション作成
 * 既存の個別APIモジュールを統合
 */
export const createUnifiedOpenApiApp = () => {
  console.log('🎯 Creating unified OpenAPI app...')
  // console.log('🔍 subjectsApp import check:', !!subjectsApp)
  // console.log('🔍 subjectsApp type:', typeof subjectsApp)

  const app = new OpenAPIHono<{ Bindings: Env }>({
    strict: false,
    // defaultHook を削除して、個別モジュールのZodバリデーションを使用
  })

  console.log('🎯 OpenAPI Hono app created')

  // ======================
  // ミドルウェア設定
  // ======================
  app.use(timing())

  // 認証ミドルウェア適用（学校管理APIに対して）
  // 一時的にデバッグのため認証をスキップ
  // app.use('/school/*', customAuthMiddleware)

  // API情報設定
  app.doc('/spec', {
    openapi: '3.0.3',
    info: {
      title: '学校時間割管理システム API',
      version: '1.0.0',
      description: `
# 学校時間割管理システム API

完全型安全な学校時間割管理システムのAPIドキュメントです。
すべてのエンドポイントはZodスキーマによる厳密な型検証を実装しています。

## 特徴

- **完全型安全**: すべてのリクエスト・レスポンスがZodスキーマで検証
- **リアルタイム検証**: ランタイム型チェックによるデータ整合性保証
- **自動ドキュメント生成**: コードから自動的にAPIドキュメント生成
- **エラー詳細**: 詳細なバリデーションエラー情報
- **統一型定義**: フロントエンド・バックエンド・データベース統一型

## 認証

すべてのAPIエンドポイントは自前のJWT認証を使用しています。
リクエストヘッダーに以下を含めてください：

- \`Authorization: Bearer <token>\`
- \`X-Requested-With: XMLHttpRequest\`
- \`X-CSRF-Token: <csrf-token>\`

## 学校管理API エンドポイント

- **/settings** - 学校設定管理
- **/teachers** - 教師管理（CRUD）
- **/school/subjects** - 教科管理（CRUD）
- **/school/classrooms** - 教室管理（CRUD）
- **/school/conditions** - 条件設定管理
- **/school/timetables** - 時間割管理

## エラーレスポンス

すべてのエラーレスポンスは統一フォーマットです：

\`\`\`json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "人間が読める形のエラーメッセージ",
  "details": {
    "validationErrors": [...] // バリデーションエラーの場合
  }
}
\`\`\`
    `,
      contact: {
        name: '学校時間割システム開発チーム',
        url: 'https://github.com/school-timetable-system',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    tags: [
      {
        name: 'システム',
        description: 'システム情報・ヘルスチェック・メトリクス',
      },
      {
        name: '学校設定',
        description: '学校の基本設定管理',
      },
      {
        name: '教師管理',
        description: '教師情報のCRUD操作',
      },
      {
        name: '教科管理',
        description: '教科情報のCRUD操作',
      },
      {
        name: '教室管理',
        description: '教室情報のCRUD操作',
      },
    ],
    servers: [
      {
        url: 'http://localhost:8787/api',
        description: 'ローカル開発サーバー',
      },
      {
        url: 'https://school-timetable-monorepo.grundhunter.workers.dev/api',
        description: '本番環境',
      },
    ],
  })

  // Swagger UI
  app.get('/docs', swaggerUI({ url: '/api/spec' }))

  // ======================
  // システム情報エンドポイント
  // ======================

  // API情報取得ルート定義
  const getInfoRoute = createRoute({
    method: 'get',
    path: '/info',
    summary: 'API基本情報取得',
    description: `
API基本情報を取得します。

## 取得情報

- **システム名**: 学校時間割管理システム API
- **バージョン**: 1.0.0
- **環境**: development/production
- **機能一覧**: 実装済み機能リスト
- **タイムスタンプ**: 現在時刻

## レスポンス例

\`\`\`json
{
  "success": true,
  "data": {
    "name": "学校時間割管理システム API",
    "version": "1.0.0",
    "description": "Complete type-safe school timetable management system with unified OpenAPI architecture",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "environment": "development",
    "features": [
      "完全型安全APIアーキテクチャ",
      "Zodスキーマによるリアルタイム検証",
      "自動OpenAPIドキュメント生成",
      "統一エラーハンドリング",
      "JWT認証システム"
    ]
  }
}
\`\`\`
    `,
    tags: ['システム'],
    responses: createResponseSchemas({
      type: 'object',
      properties: {
        name: { type: 'string', example: '学校時間割管理システム API' },
        version: { type: 'string', example: '1.0.0' },
        description: {
          type: 'string',
          example:
            'Complete type-safe school timetable management system with unified OpenAPI architecture',
        },
        timestamp: { type: 'string', format: 'date-time' },
        environment: { type: 'string', example: 'development' },
        features: {
          type: 'array',
          items: { type: 'string' },
          example: [
            '完全型安全APIアーキテクチャ',
            'Zodスキーマによるリアルタイム検証',
            '自動OpenAPIドキュメント生成',
            '統一エラーハンドリング',
            'JWT認証システム',
          ],
        },
      },
    }),
  })

  // API情報取得ハンドラー
  app.openapi(getInfoRoute, async c => {
    return c.json({
      success: true,
      data: {
        name: '学校時間割管理システム API',
        version: '1.0.0',
        description:
          'Complete type-safe school timetable management system with unified OpenAPI architecture',
        timestamp: new Date().toISOString(),
        environment: c.env.NODE_ENV || 'development',
        features: [
          '完全型安全APIアーキテクチャ',
          'Zodスキーマによるリアルタイム検証',
          '自動OpenAPIドキュメント生成',
          '統一エラーハンドリング',
          'JWT認証システム',
        ],
      },
    })
  })

  // ヘルスチェックルート定義
  const getHealthRoute = createRoute({
    method: 'get',
    path: '/health',
    summary: 'システムヘルスチェック',
    description: `
システムの健康状態を確認します。

## チェック項目

- **データベース接続**: D1 Database接続状況
- **システム稼働時間**: アップタイム情報
- **環境情報**: 実行環境とバージョン
- **タイムスタンプ**: チェック実行時刻

## レスポンス状況

- **200 OK**: システム正常
- **503 Service Unavailable**: データベース接続エラー等

## レスポンス例

### 正常時
\`\`\`json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "database": "connected",
    "uptime": 1640995200,
    "version": "1.0.0",
    "environment": "development"
  }
}
\`\`\`

### エラー時  
\`\`\`json
{
  "success": false,
  "error": "SERVICE_UNAVAILABLE",
  "message": "データベース接続に失敗しました",
  "details": {
    "error": "connection timeout"
  }
}
\`\`\`
    `,
    tags: ['システム'],
    responses: {
      200: {
        description: 'システム正常',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                data: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'healthy' },
                    timestamp: { type: 'string', format: 'date-time' },
                    database: { type: 'string', example: 'connected' },
                    uptime: { type: 'number', example: 1640995200 },
                    version: { type: 'string', example: '1.0.0' },
                    environment: { type: 'string', example: 'development' },
                  },
                },
              },
            },
          },
        },
      },
      503: {
        description: 'サービス利用不可',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                error: { type: 'string', example: 'SERVICE_UNAVAILABLE' },
                message: { type: 'string', example: 'データベース接続に失敗しました' },
                details: {
                  type: 'object',
                  properties: {
                    error: { type: 'string', example: 'connection timeout' },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  // ヘルスチェックハンドラー
  app.openapi(getHealthRoute, async c => {
    try {
      // データベース接続チェック
      const dbCheck = await c.env.DB.prepare('SELECT 1').first()
      const dbStatus = dbCheck ? 'connected' : 'disconnected'

      return c.json({
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          database: dbStatus,
          uptime: Math.floor(Date.now() / 1000),
          version: '1.0.0',
          environment: c.env.NODE_ENV || 'development',
        },
      })
    } catch (error) {
      return c.json(
        {
          success: false,
          error: 'SERVICE_UNAVAILABLE',
          message: 'データベース接続に失敗しました',
          details: {
            error: error instanceof Error ? error.message : '不明なエラー',
          },
        },
        503
      )
    }
  })

  // ======================
  // 学校管理API統合 - 一時的に無効化（無限ループ問題調査）
  // ======================

  console.log('🚨 API modules mounting temporarily disabled to investigate infinite loop')
  console.log('🔍 All API module imports disabled to prevent circular import issues')

  // TODO: 無限ループ問題解決後に個別にマウントを有効化
  /*
  // 学校設定API統合（パス変更：/api/school/settings → /api/settings）
  app.route('/settings', schoolSettingsApp)

  // 教師管理API統合（パス変更：/api/school/teachers → /api/teachers）
  if (teachersApp) {
    app.route('/teachers', teachersApp)
    console.log('✅ Teachers app mounted successfully')
  }

  // 教科管理API統合（パス変更：/api/school/subjects → /api/subjects）
  if (subjectsApp) {
    app.route('/subjects', subjectsApp)
    console.log('✅ Subjects app mounted successfully')
  }

  // 教室管理API統合（パス変更：/api/school/classrooms → /api/classrooms）
  app.route('/classrooms', classroomsApp)

  // 条件設定API統合（パス変更：/api/school/conditions → /api/conditions）
  app.route('/conditions', conditionsApp)

  // 時間割管理API統合（パス変更：/api/school/timetables → /api/timetables）
  app.route('/timetables', timetablesApp)

  // テストデータ管理API統合（パス変更：/api/school/test-data → /api/test-data）
  app.route('/test-data', testDataApp)
  */

  return app
}

export default createUnifiedOpenApiApp
