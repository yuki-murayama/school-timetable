/**
 * OpenAPI ドキュメント自動生成システム
 * Zod スキーマから完全型安全なAPI仕様書を生成
 */
import { swaggerUI } from '@hono/swagger-ui'
import { OpenAPIHono } from '@hono/zod-openapi'
import type { Env } from '@shared/schemas'

// OpenAPI メタデータ設定
const openApiMetadata = {
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
  servers: [
    {
      url: '/api',
      description: '本番環境 API',
    },
    {
      url: 'http://localhost:8787/api',
      description: '開発環境 API',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: '自前システムのJWT認証トークン',
      },
      CSRFToken: {
        type: 'apiKey',
        in: 'header',
        name: 'X-CSRF-Token',
        description: 'CSRF保護トークン',
      },
    },
  },
  security: [
    {
      BearerAuth: [],
      CSRFToken: [],
    },
  ],
  tags: [
    {
      name: '学校設定',
      description: '学校の基本設定（学年・クラス・時限数など）',
    },
    {
      name: '教師管理',
      description: '教師の登録・編集・削除・割当制限',
    },
    {
      name: '教科管理',
      description: '教科の登録・編集・削除・時間数設定',
    },
    {
      name: '教室管理',
      description: '教室の登録・編集・削除・タイプ設定',
    },
    {
      name: '時間割生成',
      description: '時間割の自動生成・制約チェック・統計情報',
    },
    {
      name: '時間割参照',
      description: '生成済み時間割の参照・検索・フィルタリング',
    },
    {
      name: 'データ管理',
      description: 'データベース初期化・データクリーンアップ',
    },
    {
      name: 'システム',
      description: 'ヘルスチェック・認証・設定',
    },
  ],
}

// OpenAPI Hono インスタンス作成
export const createOpenApiApp = () => {
  const app = new OpenAPIHono<{ Bindings: Env }>()

  // OpenAPI仕様書エンドポイント
  app.doc('/spec', openApiMetadata)

  // Swagger UI エンドポイント
  app.get(
    '/docs',
    swaggerUI({
      url: '/api/spec',
      config: {
        displayOperationId: true,
        displayRequestDuration: true,
        defaultModelsExpandDepth: 3,
        defaultModelExpandDepth: 3,
        docExpansion: 'list',
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        tryItOutEnabled: true,
        requestSnippetsEnabled: true,
        syntaxHighlight: {
          activate: true,
          theme: 'agate',
        },
        layout: 'StandaloneLayout',
      },
    })
  )

  // API情報エンドポイント
  app.openapi(
    {
      method: 'get',
      path: '/info',
      summary: 'API情報取得',
      description: 'APIの基本情報とバージョンを取得',
      tags: ['システム'],
      responses: {
        200: {
          description: 'API情報',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', example: '学校時間割管理システム API' },
                      version: { type: 'string', example: '1.0.0' },
                      description: { type: 'string' },
                      timestamp: { type: 'string', format: 'date-time' },
                      environment: { type: 'string', example: 'development' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    c => {
      return c.json({
        success: true,
        data: {
          name: '学校時間割管理システム API',
          version: '1.0.0',
          description: 'Complete type-safe school timetable management system with Zod validation',
          timestamp: new Date().toISOString(),
          environment: c.env.NODE_ENV || 'development',
          features: [
            '完全型安全性',
            'リアルタイム検証',
            '自動ドキュメント生成',
            'OpenAPI 3.0.3 準拠',
          ],
        },
      })
    }
  )

  // ヘルスチェックエンドポイント
  app.openapi(
    {
      method: 'get',
      path: '/health',
      summary: 'ヘルスチェック',
      description: 'APIサーバーの稼働状況とデータベース接続を確認',
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
                      uptime: { type: 'number', example: 3600 },
                    },
                  },
                },
              },
            },
          },
        },
        503: {
          description: 'システム異常',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: { type: 'string', example: 'SERVICE_UNAVAILABLE' },
                  message: { type: 'string', example: 'データベース接続に失敗しました' },
                },
              },
            },
          },
        },
      },
    },
    async c => {
      try {
        // データベース接続チェック
        const testQuery = await c.env.DB.prepare('SELECT 1').first()
        const dbStatus = testQuery ? 'connected' : 'disconnected'

        return c.json({
          success: true,
          data: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: dbStatus,
            uptime: Math.floor(Date.now() / 1000), // 簡易アップタイム (process.uptimeはWorkers非対応)
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
    }
  )

  return app
}

// デフォルトOpenAPIアプリインスタンス
export const openApiApp = createOpenApiApp()

// 型安全なルート登録ヘルパー
export type OpenApiRouteHandler = (c: unknown) => Promise<Response> | Response

// OpenAPI ルート登録ヘルパー関数
export const createApiRoute = <_TRequest = unknown, _TResponse = unknown>(config: {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete'
  path: string
  summary: string
  description?: string
  tags: string[]
  request?: unknown
  responses: unknown
  handler: OpenApiRouteHandler
}) => {
  return {
    method: config.method,
    path: config.path,
    summary: config.summary,
    description: config.description,
    tags: config.tags,
    request: config.request,
    responses: config.responses,
    handler: config.handler,
  }
}

// OpenAPI スキーマヘルパー
export const createOpenApiSchema = <T>(schema: T, description?: string) => ({
  content: {
    'application/json': {
      schema: {
        ...schema,
        ...(description && { description }),
      },
    },
  },
})

// エラーレスポンススキーマ
export const errorResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    error: { type: 'string', example: 'VALIDATION_ERROR' },
    message: { type: 'string', example: 'バリデーションエラーが発生しました' },
    details: {
      type: 'object',
      properties: {
        validationErrors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              path: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
  },
}

// 成功レスポンススキーマ
export const successResponseSchema = <T>(dataSchema: T) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    data: dataSchema,
    message: { type: 'string', description: '成功メッセージ（オプション）' },
  },
})

// ページネーションスキーマ
export const paginationSchema = {
  type: 'object',
  properties: {
    page: { type: 'number', minimum: 1, example: 1 },
    limit: { type: 'number', minimum: 1, maximum: 100, example: 20 },
    total: { type: 'number', minimum: 0, example: 150 },
    totalPages: { type: 'number', minimum: 0, example: 8 },
  },
}

// 統一レスポンススキーマヘルパー
export const createResponseSchemas = <TSuccess>(successDataSchema: TSuccess) => ({
  200: {
    description: '成功',
    ...createOpenApiSchema(successResponseSchema(successDataSchema)),
  },
  400: {
    description: 'バリデーションエラー',
    ...createOpenApiSchema(errorResponseSchema),
  },
  401: {
    description: '認証エラー',
    ...createOpenApiSchema(errorResponseSchema),
  },
  403: {
    description: '権限不足',
    ...createOpenApiSchema(errorResponseSchema),
  },
  404: {
    description: 'リソースが見つかりません',
    ...createOpenApiSchema(errorResponseSchema),
  },
  500: {
    description: 'サーバーエラー',
    ...createOpenApiSchema(errorResponseSchema),
  },
})

// エラーレスポンスのみのスキーマヘルパー
export const createErrorResponseSchemas = () => ({
  400: {
    description: 'バリデーションエラー',
    ...createOpenApiSchema(errorResponseSchema),
  },
  401: {
    description: '認証エラー',
    ...createOpenApiSchema(errorResponseSchema),
  },
  403: {
    description: '権限不足',
    ...createOpenApiSchema(errorResponseSchema),
  },
  404: {
    description: 'リソースが見つかりません',
    ...createOpenApiSchema(errorResponseSchema),
  },
  500: {
    description: 'サーバーエラー',
    ...createOpenApiSchema(errorResponseSchema),
  },
})

export default openApiApp
