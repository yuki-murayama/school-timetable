/**
 * 学校設定API - OpenAPI完全型安全ルート
 * Zodスキーマによる厳密な型検証とドキュメント自動生成
 */
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import {
  createEnhancedSchoolSettings,
  EnhancedSchoolSettingsSchema,
  type Env,
  type SchoolSettings,
  SchoolSettingsSchema,
} from '@shared/schemas'
import { createResponseSchemas } from '../openapi'

// 学校設定用OpenAPIアプリ
const schoolSettingsApp = new OpenAPIHono<{ Bindings: Env }>()

// 学校設定取得ルート定義
const getSchoolSettingsRoute = createRoute({
  method: 'get',
  path: '/settings',
  summary: '学校設定取得',
  description: `
学校の基本設定（学年・クラス・時限数）を取得します。

## 取得されるデータ

- **基本設定**: 各学年のクラス数、平日・土曜日の時限数
- **計算プロパティ**: 有効な曜日配列、学年配列、学年別クラス配列
- **メタデータ**: 作成・更新日時

## レスポンス形式

\`\`\`json
{
  "success": true,
  "data": {
    "id": "default",
    "grade1Classes": 4,
    "grade2Classes": 4, 
    "grade3Classes": 3,
    "dailyPeriods": 6,
    "saturdayPeriods": 4,
    "days": ["月曜", "火曜", "水曜", "木曜", "金曜", "土曜"],
    "grades": [1, 2, 3],
    "classesPerGrade": {
      "1": ["A", "B", "C", "D"],
      "2": ["A", "B", "C", "D"],
      "3": ["A", "B", "C"]
    }
  }
}
\`\`\`
  `,
  tags: ['学校設定'],
  responses: createResponseSchemas({
    type: 'object',
    properties: {
      id: { type: 'string', example: 'default' },
      grade1Classes: { type: 'number', example: 4 },
      grade2Classes: { type: 'number', example: 4 },
      grade3Classes: { type: 'number', example: 3 },
      dailyPeriods: { type: 'number', example: 6 },
      saturdayPeriods: { type: 'number', example: 4 },
      days: {
        type: 'array',
        items: { type: 'string' },
        example: ['月曜', '火曜', '水曜', '木曜', '金曜', '土曜'],
      },
      grades: {
        type: 'array',
        items: { type: 'number' },
        example: [1, 2, 3],
      },
      classesPerGrade: {
        type: 'object',
        additionalProperties: {
          type: 'array',
          items: { type: 'string' },
        },
        example: {
          '1': ['A', 'B', 'C', 'D'],
          '2': ['A', 'B', 'C', 'D'],
          '3': ['A', 'B', 'C'],
        },
      },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
    },
  }),
})

// 学校設定更新ルート定義
const updateSchoolSettingsRoute = createRoute({
  method: 'put',
  path: '/settings',
  summary: '学校設定更新',
  description: `
学校の基本設定を更新します。

## 更新可能な項目

- **grade1Classes**: 1学年のクラス数（1-20）
- **grade2Classes**: 2学年のクラス数（1-20）
- **grade3Classes**: 3学年のクラス数（1-20）
- **dailyPeriods**: 平日の時限数（1-10）
- **saturdayPeriods**: 土曜日の時限数（0-8）

## バリデーション

すべての値は厳密にチェックされます：
- クラス数は正の整数で20以下
- 時限数は適切な範囲内
- 必須フィールドのチェック

## リクエスト例

\`\`\`json
{
  "grade1Classes": 5,
  "grade2Classes": 4,
  "grade3Classes": 3,
  "dailyPeriods": 6,
  "saturdayPeriods": 0
}
\`\`\`
  `,
  tags: ['学校設定'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              grade1Classes: {
                type: 'number',
                minimum: 1,
                maximum: 20,
                description: '1学年のクラス数',
              },
              grade2Classes: {
                type: 'number',
                minimum: 1,
                maximum: 20,
                description: '2学年のクラス数',
              },
              grade3Classes: {
                type: 'number',
                minimum: 1,
                maximum: 20,
                description: '3学年のクラス数',
              },
              dailyPeriods: {
                type: 'number',
                minimum: 1,
                maximum: 10,
                description: '平日の時限数',
              },
              saturdayPeriods: {
                type: 'number',
                minimum: 0,
                maximum: 8,
                description: '土曜日の時限数',
              },
            },
            required: [
              'grade1Classes',
              'grade2Classes',
              'grade3Classes',
              'dailyPeriods',
              'saturdayPeriods',
            ],
            example: {
              grade1Classes: 4,
              grade2Classes: 4,
              grade3Classes: 3,
              dailyPeriods: 6,
              saturdayPeriods: 4,
            },
          },
        },
      },
    },
  },
  responses: createResponseSchemas({
    type: 'object',
    properties: {
      id: { type: 'string', example: 'default' },
      grade1Classes: { type: 'number', example: 4 },
      grade2Classes: { type: 'number', example: 4 },
      grade3Classes: { type: 'number', example: 3 },
      dailyPeriods: { type: 'number', example: 6 },
      saturdayPeriods: { type: 'number', example: 4 },
      days: {
        type: 'array',
        items: { type: 'string' },
        example: ['月曜', '火曜', '水曜', '木曜', '金曜', '土曜'],
      },
      grades: {
        type: 'array',
        items: { type: 'number' },
        example: [1, 2, 3],
      },
      classesPerGrade: {
        type: 'object',
        additionalProperties: {
          type: 'array',
          items: { type: 'string' },
        },
        example: {
          '1': ['A', 'B', 'C', 'D'],
          '2': ['A', 'B', 'C', 'D'],
          '3': ['A', 'B', 'C'],
        },
      },
      updated_at: { type: 'string', format: 'date-time' },
    },
  }),
})

// 学校設定取得ハンドラー
schoolSettingsApp.openapi(getSchoolSettingsRoute, async c => {
  try {
    const db = c.env.DB

    // データベースから学校設定を取得
    const result = await db
      .prepare('SELECT * FROM school_settings WHERE id = ?')
      .bind('default')
      .first()

    if (!result) {
      return c.json(
        {
          success: false,
          error: 'SETTINGS_NOT_FOUND',
          message: '学校設定が見つかりません。初期化が必要です。',
        },
        404
      )
    }

    // 基本設定オブジェクト作成（日付をISO8601形式に変換）
    const basicSettings: SchoolSettings = {
      id: result.id as string,
      grade1Classes: result.grade1Classes as number,
      grade2Classes: result.grade2Classes as number,
      grade3Classes: result.grade3Classes as number,
      dailyPeriods: result.dailyPeriods as number,
      saturdayPeriods: result.saturdayPeriods as number,
      created_at: result.created_at
        ? new Date(result.created_at as string).toISOString()
        : undefined,
      updated_at: result.updated_at
        ? new Date(result.updated_at as string).toISOString()
        : undefined,
    }

    // Zodスキーマでバリデーション
    const validatedSettings = SchoolSettingsSchema.parse(basicSettings)

    // 統計情報を取得
    const [teachersCount, subjectsCount, classroomsCount] = await Promise.all([
      db.prepare('SELECT COUNT(*) as count FROM teachers').first(),
      db.prepare('SELECT COUNT(*) as count FROM subjects').first(),
      db.prepare('SELECT COUNT(*) as count FROM classrooms').first(),
    ])

    const statistics = {
      totalTeachers: (teachersCount?.count as number) || 0,
      totalSubjects: (subjectsCount?.count as number) || 0,
      totalClassrooms: (classroomsCount?.count as number) || 0,
    }

    // 計算プロパティ付きの拡張設定を作成
    const enhancedSettings = createEnhancedSchoolSettings(validatedSettings, statistics)

    // 最終レスポンス検証
    const validatedResponse = EnhancedSchoolSettingsSchema.parse(enhancedSettings)

    return c.json({
      success: true,
      data: validatedResponse,
      message: '学校設定を正常に取得しました',
    })
  } catch (error) {
    console.error('学校設定取得エラー:', error)

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
        message: '学校設定の取得中にエラーが発生しました',
      },
      500
    )
  }
})

// 学校設定更新ハンドラー
schoolSettingsApp.openapi(updateSchoolSettingsRoute, async c => {
  try {
    const db = c.env.DB
    const body = await c.req.json()

    // リクエストデータをZodスキーマで検証
    const updateData = SchoolSettingsSchema.omit({
      id: true,
      created_at: true,
      updated_at: true,
    }).parse(body)

    const now = new Date().toISOString()

    // データベース更新
    const result = await db
      .prepare(`
        UPDATE school_settings 
        SET 
          grade1Classes = ?,
          grade2Classes = ?,
          grade3Classes = ?,
          dailyPeriods = ?,
          saturdayPeriods = ?,
          updated_at = ?
        WHERE id = 'default'
      `)
      .bind(
        updateData.grade1Classes,
        updateData.grade2Classes,
        updateData.grade3Classes,
        updateData.dailyPeriods,
        updateData.saturdayPeriods,
        now
      )
      .run()

    if (result.changes === 0) {
      return c.json(
        {
          success: false,
          error: 'SETTINGS_NOT_FOUND',
          message: '学校設定が見つかりません。初期化が必要です。',
        },
        404
      )
    }

    // 更新後のデータを取得
    const updatedResult = await db
      .prepare('SELECT * FROM school_settings WHERE id = ?')
      .bind('default')
      .first()

    if (!updatedResult) {
      throw new Error('更新後のデータ取得に失敗しました')
    }

    // 基本設定オブジェクト作成（日付をISO8601形式に変換）
    const basicSettings: SchoolSettings = {
      id: updatedResult.id as string,
      grade1Classes: updatedResult.grade1Classes as number,
      grade2Classes: updatedResult.grade2Classes as number,
      grade3Classes: updatedResult.grade3Classes as number,
      dailyPeriods: updatedResult.dailyPeriods as number,
      saturdayPeriods: updatedResult.saturdayPeriods as number,
      created_at: updatedResult.created_at
        ? new Date(updatedResult.created_at as string).toISOString()
        : undefined,
      updated_at: updatedResult.updated_at
        ? new Date(updatedResult.updated_at as string).toISOString()
        : undefined,
    }

    // Zodスキーマでバリデーション
    const validatedSettings = SchoolSettingsSchema.parse(basicSettings)

    // 統計情報を取得
    const [teachersCount, subjectsCount, classroomsCount] = await Promise.all([
      db.prepare('SELECT COUNT(*) as count FROM teachers').first(),
      db.prepare('SELECT COUNT(*) as count FROM subjects').first(),
      db.prepare('SELECT COUNT(*) as count FROM classrooms').first(),
    ])

    const statistics = {
      totalTeachers: (teachersCount?.count as number) || 0,
      totalSubjects: (subjectsCount?.count as number) || 0,
      totalClassrooms: (classroomsCount?.count as number) || 0,
    }

    // 計算プロパティ付きの拡張設定を作成
    const enhancedSettings = createEnhancedSchoolSettings(validatedSettings, statistics)

    // 最終レスポンス検証
    const validatedResponse = EnhancedSchoolSettingsSchema.parse(enhancedSettings)

    return c.json({
      success: true,
      data: validatedResponse,
      message: '学校設定を正常に更新しました',
    })
  } catch (error) {
    console.error('学校設定更新エラー:', error)

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
        message: '学校設定の更新中にエラーが発生しました',
      },
      500
    )
  }
})

// デバッグ用：生データ確認エンドポイント
schoolSettingsApp.get('/debug/raw', async c => {
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
    })
  } catch (error) {
    console.error('Debug raw data error:', error)
    return c.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      500
    )
  }
})

export default schoolSettingsApp
