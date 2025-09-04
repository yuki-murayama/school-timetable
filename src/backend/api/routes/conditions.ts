/**
 * 条件設定API - OpenAPI完全型安全ルート
 * Zodスキーマによる厳密な型検証とドキュメント自動生成
 */
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { Env } from '@shared/schemas'
import { createResponseSchemas } from '../openapi'

// 条件設定用OpenAPIアプリ
const conditionsApp = new OpenAPIHono<{ Bindings: Env }>()

// 条件設定スキーマ
const ConditionsSchema = z.object({
  id: z.string().default('default'),
  conditions: z.string().describe('時間割生成時の特別な条件'),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

// 条件設定取得ルート定義
const getConditionsRoute = createRoute({
  method: 'get',
  path: '/conditions',
  summary: '条件設定取得',
  description: `
時間割生成時の特別な条件設定を取得します。

## 取得されるデータ

- **conditions**: 時間割生成時の特別な条件（テキスト形式）
- **メタデータ**: 作成・更新日時

## レスポンス形式

\`\`\`json
{
  "success": true,
  "data": {
    "id": "default",
    "conditions": "体育は午後に配置、数学は1時間目を避ける"
  }
}
\`\`\`
  `,
  tags: ['条件設定'],
  responses: createResponseSchemas({
    type: 'object',
    properties: {
      id: { type: 'string', example: 'default' },
      conditions: { 
        type: 'string', 
        example: '体育は午後に配置、数学は1時間目を避ける',
        description: '時間割生成時の特別な条件'
      },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
    },
  }),
})

// 条件設定更新ルート定義
const updateConditionsRoute = createRoute({
  method: 'put',
  path: '/conditions',
  summary: '条件設定更新',
  description: `
時間割生成時の特別な条件設定を更新します。

## 更新可能な項目

- **conditions**: 時間割生成時の特別な条件（テキスト形式、空文字も可）

## リクエスト例

\`\`\`json
{
  "conditions": "体育は午後に配置、数学は1時間目を避ける、金曜日の6時間目は避ける"
}
\`\`\`
  `,
  tags: ['条件設定'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              conditions: {
                type: 'string',
                description: '時間割生成時の特別な条件',
                example: '体育は午後に配置、数学は1時間目を避ける'
              },
            },
            required: ['conditions'],
          },
        },
      },
    },
  },
  responses: createResponseSchemas({
    type: 'object',
    properties: {
      id: { type: 'string', example: 'default' },
      conditions: { 
        type: 'string', 
        example: '体育は午後に配置、数学は1時間目を避ける',
        description: '時間割生成時の特別な条件'
      },
      updated_at: { type: 'string', format: 'date-time' },
    },
  }),
})

// 条件設定取得ハンドラー
conditionsApp.openapi(getConditionsRoute, async c => {
  try {
    const db = c.env.DB

    // データベースから条件設定を取得
    const result = await db
      .prepare('SELECT * FROM conditions WHERE id = ?')
      .bind('default')
      .first()

    if (!result) {
      // データが存在しない場合は空の条件を返す
      return c.json({
        success: true,
        data: {
          id: 'default',
          conditions: '',
        },
        message: '条件設定を取得しました（初期状態）',
      })
    }

    // データ形式の正規化
    let conditions = ''
    try {
      // データベースのdata列にはJSON文字列が格納されている場合がある
      const parsedData = JSON.parse(result.data as string)
      conditions = parsedData.constraints ? parsedData.constraints.join('\n') : ''
    } catch {
      // JSONでない場合は文字列として扱う
      conditions = result.data as string || ''
    }

    const conditionsData = {
      id: result.id as string,
      conditions,
      created_at: result.created_at as string,
      updated_at: result.updated_at as string,
    }

    // Zodスキーマでバリデーション
    const validatedConditions = ConditionsSchema.parse(conditionsData)

    return c.json({
      success: true,
      data: validatedConditions,
      message: '条件設定を正常に取得しました',
    })
  } catch (error) {
    console.error('条件設定取得エラー:', error)

    if (error instanceof z.ZodError) {
      return c.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'データ形式が正しくありません',
          details: { validationErrors: error.issues },
        },
        400
      )
    }

    return c.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '条件設定の取得中にエラーが発生しました',
      },
      500
    )
  }
})

// 条件設定更新ハンドラー
conditionsApp.openapi(updateConditionsRoute, async c => {
  try {
    const db = c.env.DB
    const body = await c.req.json()

    // リクエストデータをZodスキーマで検証
    const updateData = z.object({
      conditions: z.string(),
    }).parse(body)

    const now = new Date().toISOString()

    // データベース形式に変換（JSON形式で保存）
    const dataToStore = JSON.stringify({
      constraints: updateData.conditions ? updateData.conditions.split('\n').filter(line => line.trim()) : []
    })

    // データベース更新（INSERT OR REPLACE を使用）
    const result = await db
      .prepare(`
        INSERT OR REPLACE INTO conditions (id, data, updated_at)
        VALUES (?, ?, ?)
      `)
      .bind('default', dataToStore, now)
      .run()

    if (result.changes === 0) {
      return c.json(
        {
          success: false,
          error: 'UPDATE_FAILED',
          message: '条件設定の更新に失敗しました',
        },
        500
      )
    }

    // 更新後のデータを取得
    const updatedResult = await db
      .prepare('SELECT * FROM conditions WHERE id = ?')
      .bind('default')
      .first()

    if (!updatedResult) {
      throw new Error('更新後のデータ取得に失敗しました')
    }

    const conditionsData = {
      id: updatedResult.id as string,
      conditions: updateData.conditions,
      updated_at: updatedResult.updated_at as string,
    }

    // Zodスキーマでバリデーション
    const validatedConditions = ConditionsSchema.parse(conditionsData)

    return c.json({
      success: true,
      data: validatedConditions,
      message: '条件設定を正常に更新しました',
    })
  } catch (error) {
    console.error('条件設定更新エラー:', error)

    if (error instanceof z.ZodError) {
      return c.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'リクエストデータが正しくありません',
          details: { validationErrors: error.issues },
        },
        400
      )
    }

    return c.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '条件設定の更新中にエラーが発生しました',
      },
      500
    )
  }
})

export default conditionsApp