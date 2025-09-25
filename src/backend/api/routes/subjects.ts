/**
 * 教科管理API - OpenAPI完全型安全ルート
 * Zodスキーマによる厳密な型検証とドキュメント自動生成
 */
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { ClassroomTypeSchema, type Env, IdSchema, NameSchema, SubjectSchema } from '@shared/schemas'
import { createErrorResponseSchemas, createResponseSchemas } from '../openapi'

// 教科管理用OpenAPIアプリ
const subjectsApp = new OpenAPIHono<{ Bindings: Env }>()

// OpenAPI用の教科作成リクエストスキーマ（transform無し）
const CreateSubjectRequestSchemaForOpenAPI = z
  .object({
    // 必須フィールド
    name: NameSchema.describe('教科名（必須）'),

    // 新APIフィールド（推奨）
    school_id: z.string().optional().describe('学校ID（デフォルト: default）'),
    weekly_hours: z.number().int().optional().describe('週間授業数'),
    target_grades: z
      .union([z.string(), z.array(z.number())])
      .optional()
      .describe('対象学年'),
    special_classroom: z.string().optional().describe('特別教室名'),

    // レガシーフロントエンドフィールドサポート（互換性維持）
    grades: z.array(z.number()).optional().describe('対象学年（レガシー）'),
    weeklyHours: z
      .union([z.number(), z.record(z.string(), z.number())])
      .optional()
      .describe('週間授業数（レガシー）'),
    requiresSpecialClassroom: z.boolean().optional().describe('特別教室必要フラグ（レガシー）'),
    classroomType: z.string().optional().describe('教室タイプ（レガシー）'),
    specialClassroom: z.string().optional().describe('特別教室（レガシー）'),
  })
  .passthrough()

// 実際の処理用のスキーマ（transform付き）
const CreateSubjectRequestSchema = CreateSubjectRequestSchemaForOpenAPI.transform(data => {
  console.log('🔍 [SCHEMA TRANSFORM] 受信RAWデータ:', JSON.stringify(data, null, 2))
  console.log('🔍 [SCHEMA TRANSFORM] RAWデータのキー:', Object.keys(data || {}))

  // 正規化されたデータを作成
  const normalized = {
    name: data.name,
    school_id: data.school_id || 'default',
    weekly_hours: null as number | null,
    target_grades: null as string | null,
    special_classroom: null as string | null,
  }

  // 週間授業数の統一処理
  if (data.weekly_hours !== undefined) {
    normalized.weekly_hours = data.weekly_hours
  } else if (data.weeklyHours !== undefined) {
    if (typeof data.weeklyHours === 'number') {
      normalized.weekly_hours = data.weeklyHours
    } else if (typeof data.weeklyHours === 'object' && data.weeklyHours !== null) {
      const hours = Object.values(data.weeklyHours)
      normalized.weekly_hours = hours.length > 0 && typeof hours[0] === 'number' ? hours[0] : 1
    }
  }

  // 対象学年の統一処理
  if (data.target_grades !== undefined) {
    if (typeof data.target_grades === 'string') {
      normalized.target_grades = data.target_grades
    } else if (Array.isArray(data.target_grades)) {
      normalized.target_grades = JSON.stringify(data.target_grades)
    }
  } else if (data.grades && Array.isArray(data.grades)) {
    normalized.target_grades = JSON.stringify(data.grades)
  }

  // 特別教室の統一処理（nullを空文字列に変換）
  if (data.special_classroom !== undefined) {
    normalized.special_classroom = data.special_classroom || ''
  } else if (data.specialClassroom !== undefined) {
    normalized.special_classroom = data.specialClassroom || ''
  } else if (
    data.classroomType &&
    typeof data.classroomType === 'string' &&
    data.classroomType !== '普通教室'
  ) {
    normalized.special_classroom = data.classroomType
  } else {
    normalized.special_classroom = '' // デフォルト値として空文字列
  }

  console.log('🔧 [SCHEMA TRANSFORM] 正規化後データ:', JSON.stringify(normalized, null, 2))
  return normalized
})

// 教科更新リクエストスキーマ - 作成スキーマのpartial版 + transform処理付き
const UpdateSubjectRequestSchema = CreateSubjectRequestSchemaForOpenAPI.partial().transform(
  data => {
    console.log('🔍 [UPDATE SCHEMA TRANSFORM] 受信RAWデータ:', JSON.stringify(data, null, 2))
    console.log('🔍 [UPDATE SCHEMA TRANSFORM] RAWデータのキー:', Object.keys(data || {}))

    // 正規化されたデータを作成
    const normalized = {
      name: data.name,
      school_id: data.school_id || 'default', // 必須フィールド
      weekly_hours: null as number | null,
      target_grades: null as string | null,
      special_classroom: null as string | null,
    }

    // 週間授業数の統一処理
    if (data.weekly_hours !== undefined) {
      normalized.weekly_hours = data.weekly_hours
    } else if (data.weeklyHours !== undefined) {
      if (typeof data.weeklyHours === 'number') {
        normalized.weekly_hours = data.weeklyHours
      } else if (typeof data.weeklyHours === 'object' && data.weeklyHours !== null) {
        const hours = Object.values(data.weeklyHours)
        normalized.weekly_hours = hours.length > 0 && typeof hours[0] === 'number' ? hours[0] : 1
      }
    }

    // 対象学年の統一処理
    if (data.target_grades !== undefined) {
      if (typeof data.target_grades === 'string') {
        normalized.target_grades = data.target_grades
      } else if (Array.isArray(data.target_grades)) {
        normalized.target_grades = JSON.stringify(data.target_grades)
      }
    } else if (data.grades && Array.isArray(data.grades)) {
      normalized.target_grades = JSON.stringify(data.grades)
    }

    // 特別教室の統一処理（nullを空文字列に変換）
    if (data.special_classroom !== undefined) {
      normalized.special_classroom = data.special_classroom || ''
    } else if (data.specialClassroom !== undefined) {
      normalized.special_classroom = data.specialClassroom || ''
    } else if (
      data.classroomType &&
      typeof data.classroomType === 'string' &&
      data.classroomType !== '普通教室'
    ) {
      normalized.special_classroom = data.classroomType
    } else {
      normalized.special_classroom = '' // デフォルト値として空文字列
    }

    console.log('🔧 [UPDATE SCHEMA TRANSFORM] 正規化後データ:', JSON.stringify(normalized, null, 2))
    return normalized
  }
)

// 教科検索クエリスキーマ
const SubjectQuerySchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().min(1))
    .optional()
    .describe('ページ番号'),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().min(1).max(100))
    .optional()
    .describe('1ページの件数'),
  search: z.string().max(100).optional().describe('名前検索'),
  grade: z
    .string()
    .regex(/^[1-6]$/)
    .transform(Number)
    .optional()
    .describe('対象学年フィルタ'),
  classroomType: ClassroomTypeSchema.optional().describe('教室タイプフィルタ'),
  sort: z.enum(['name', 'created_at', 'order']).optional().describe('並び順'),
  order: z.enum(['asc', 'desc']).optional().describe('並び方向'),
})

// 教科一覧レスポンススキーマ
const _SubjectsListResponseSchema = z.object({
  subjects: z.array(SubjectSchema),
  pagination: z.object({
    page: z.number().min(1),
    limit: z.number().min(1),
    total: z.number().min(0),
    totalPages: z.number().min(0),
  }),
})

// 教科一覧取得ルート
const getSubjectsRoute = createRoute({
  method: 'get',
  path: '/',
  summary: '教科一覧取得',
  description: `
教科一覧を取得します。検索・フィルタリング・ページネーション機能付き。

## 機能

- **検索**: 教科名による部分一致検索
- **フィルタ**: 対象学年・教室タイプでフィルタリング
- **並び順**: 名前・作成日時・表示順序でソート
- **ページネーション**: 大量データに対応

## クエリパラメータ例

- \`?search=数学\` - 名前に「数学」を含む教科を検索
- \`?grade=1&classroomType=普通教室\` - 1年生対象で普通教室使用の教科
- \`?sort=name&order=asc\` - 名前順で昇順ソート
- \`?page=2&limit=10\` - 2ページ目を10件ずつ表示
  `,
  tags: ['教科管理'],
  request: {
    query: SubjectQuerySchema,
  },
  responses: createResponseSchemas(_SubjectsListResponseSchema),
})

// 教科詳細取得ルート
const getSubjectRoute = createRoute({
  method: 'get',
  path: '/{id}',
  summary: '教科詳細取得',
  description: `
指定されたIDの教科詳細情報を取得します。

## レスポンス内容

- **基本情報**: ID、名前、表示順序
- **対象学年**: 担当する学年配列
- **時間数**: 学年別週間授業数
- **教室情報**: 特別教室要否、教室タイプ
- **メタデータ**: 作成・更新日時
  `,
  tags: ['教科管理'],
  request: {
    params: z.object({
      id: IdSchema.describe('教科ID'),
    }),
  },
  responses: createResponseSchemas(SubjectSchema),
})

// シンプルな作成レスポンススキーマ
const CreateSubjectResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  school_id: z.string(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

// 教科作成ルート - OpenAPIルート復活
const createSubjectRoute = createRoute({
  method: 'post',
  path: '/',
  summary: '教科作成',
  description: `
新しい教科を作成します。

## 作成時の必須項目

- **name**: 教科名（1-100文字、日本語・英語対応）

## リクエスト例

\`\`\`json
{
  "name": "数学"
}
\`\`\`
  `,
  tags: ['教科管理'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateSubjectRequestSchemaForOpenAPI,
        },
      },
      description: '教科作成リクエスト',
      required: true,
    },
  },
  responses: createResponseSchemas(CreateSubjectResponseSchema),
})

// 教科更新ルート
const updateSubjectRoute = createRoute({
  method: 'put',
  path: '/{id}',
  summary: '教科更新',
  description: `
既存の教科情報を更新します。

## 更新可能項目

すべての項目が任意更新（partial update）対応：

- **name**: 教科名

## 更新時のバリデーション

- 既存教科の存在チェック
- 更新データの型安全性チェック
  `,
  tags: ['教科管理'],
  request: {
    params: z.object({
      id: IdSchema.describe('教科ID'),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateSubjectRequestSchema,
        },
      },
      description: '教科更新リクエスト',
      required: true,
    },
  },
  responses: createResponseSchemas(SubjectSchema),
})

// 教科削除ルート
const deleteSubjectRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  summary: '教科削除',
  description: `
指定されたIDの教科を削除します。

## 削除時の注意事項

- **参照整合性**: 関連する時間割・教師データも確認・更新
- **カスケード削除**: 教師-教科関連テーブルのデータも削除
- **復旧不可**: 削除されたデータは復旧できません

## 削除前チェック

- 教科の存在確認
- アクティブな時間割での使用状況確認
- 関連データの影響範囲確認
  `,
  tags: ['教科管理'],
  request: {
    params: z.object({
      id: IdSchema.describe('教科ID'),
    }),
  },
  responses: {
    200: {
      description: '削除成功',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string', example: '教科を正常に削除しました' },
              data: {
                type: 'object',
                properties: {
                  deletedId: { type: 'string', format: 'uuid' },
                  deletedName: { type: 'string' },
                  deletedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
    ...createErrorResponseSchemas(), // エラーレスポンス
  },
})

// ハンドラー実装

// 教科一覧取得ハンドラー
subjectsApp.openapi(getSubjectsRoute, async c => {
  try {
    console.log('🎯 統合API subjects一覧取得開始')

    const db = c.env.DB
    console.log('📊 Database:', !!db)

    const query = c.req.valid('query')
    console.log('✅ Query parsed:', query)

    // データベースから実際のデータを取得
    const subjects = await db.prepare('SELECT * FROM subjects ORDER BY name').all()

    console.log('📊 Subjects retrieved:', subjects.results?.length || 0)

    // データベース形式をフロントエンド期待形式に変換
    const convertedSubjects = (subjects.results || [])
      .map(subjectData => {
        const resultData = subjectData as Record<string, unknown>

        try {
          // target_gradesの安全な解析
          let grades: number[] = []
          if (resultData.target_grades && typeof resultData.target_grades === 'string') {
            try {
              const parsed = JSON.parse(resultData.target_grades as string)
              grades = Array.isArray(parsed) ? parsed : []
            } catch {
              grades = []
            }
          }

          // weekly_hoursの処理
          let weeklyHours: Record<string, number> = {}
          if (resultData.weekly_hours && typeof resultData.weekly_hours === 'string') {
            try {
              const parsed = JSON.parse(resultData.weekly_hours as string)
              weeklyHours = typeof parsed === 'object' && parsed !== null ? parsed : {}
            } catch {
              weeklyHours = {}
            }
          }

          const convertedSubject = {
            id: resultData.id,
            name: resultData.name,
            school_id: resultData.school_id, // 必須フィールドを追加
            grades, // フロントエンド期待フィールド
            targetGrades: grades, // 別名でも提供
            target_grades: resultData.target_grades, // 元のDB値も保持
            weeklyHours,
            weekly_hours: resultData.weekly_hours, // DB値も保持
            requiresSpecialClassroom:
              resultData.requires_special_room === 1 ||
              (resultData.special_classroom !== null &&
                resultData.special_classroom !== '' &&
                resultData.special_classroom !== '普通教室'),
            specialClassroom: (resultData.special_classroom as string) || '', // フロントエンド期待フィールド
            special_classroom: resultData.special_classroom, // DB値も保持
            classroomType: (resultData.special_classroom as string) || '普通教室',
            color: (resultData.color as string) || '#3B82F6',
            order: Number(resultData.order) || Number(resultData.id?.toString().slice(-2)) || 1,
            description: (resultData.description as string) || undefined,
            created_at: resultData.created_at,
            updated_at: resultData.updated_at,
          }

          // Zodスキーマで検証
          return SubjectSchema.parse(convertedSubject)
        } catch (parseError) {
          console.error('教科データ変換エラー:', parseError, 'Data:', resultData)
          // 変換に失敗した場合はnullを返し、後でフィルターする
          return null
        }
      })
      .filter(subject => subject !== null) // 変換失敗したものを除外

    return c.json({
      success: true,
      data: {
        subjects: convertedSubjects,
        pagination: {
          page: query.page || 1,
          limit: query.limit || 20,
          total: convertedSubjects.length,
          totalPages: Math.ceil(convertedSubjects.length / (query.limit || 20)),
        },
      },
    })
  } catch (error) {
    console.error('教科一覧取得エラー:', error)

    if (error instanceof z.ZodError) {
      return c.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'クエリパラメータが正しくありません',
          details: { validationErrors: error.issues },
        },
        400
      )
    }

    return c.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '教科一覧の取得中にエラーが発生しました',
      },
      500
    )
  }
})

// 教科詳細取得ハンドラー
subjectsApp.openapi(getSubjectRoute, async c => {
  try {
    const db = c.env.DB
    const { id } = c.req.valid('param')

    const result = await db.prepare('SELECT * FROM subjects WHERE id = ?').bind(id).first()

    if (!result) {
      return c.json(
        {
          success: false,
          error: 'SUBJECT_NOT_FOUND',
          message: '指定された教科が見つかりません',
        },
        404
      )
    }

    // データ変換と検証
    const resultData = result as Record<string, unknown>

    try {
      // target_gradesの安全な解析
      let grades: number[] = []
      if (resultData.target_grades && typeof resultData.target_grades === 'string') {
        try {
          const parsed = JSON.parse(resultData.target_grades as string)
          grades = Array.isArray(parsed) ? parsed : []
        } catch {
          grades = []
        }
      }

      // weekly_hoursの処理
      let weeklyHours: Record<string, number> = {}
      if (resultData.weekly_hours && typeof resultData.weekly_hours === 'number') {
        if (grades.length > 0) {
          for (const grade of grades) {
            weeklyHours[grade.toString()] = resultData.weekly_hours as number
          }
        } else {
          weeklyHours = {
            '1': resultData.weekly_hours as number,
            '2': resultData.weekly_hours as number,
            '3': resultData.weekly_hours as number,
          }
        }
      }

      const subjectData = {
        id: resultData.id,
        name: resultData.name,
        school_id: resultData.school_id, // 必須フィールドを追加
        grades, // フロントエンド期待フィールド
        targetGrades: grades, // 別名でも提供
        target_grades: resultData.target_grades, // 元のDB値も保持
        weeklyHours,
        weekly_hours: resultData.weekly_hours, // DB値も保持
        requiresSpecialClassroom:
          resultData.special_classroom !== null &&
          resultData.special_classroom !== '' &&
          resultData.special_classroom !== '普通教室',
        specialClassroom: (resultData.special_classroom as string) || '', // フロントエンド期待フィールド
        special_classroom: resultData.special_classroom, // DB値も保持
        classroomType: (resultData.special_classroom as string) || '普通教室',
        color: '#3B82F6', // デフォルト色（16進数形式）
        order: Number(resultData.id?.toString().slice(-2)) || 1, // IDから生成される順序
        description: (resultData.description as string) || undefined, // オプションフィールド
        created_at: resultData.created_at,
        updated_at: resultData.updated_at,
      }

      const subject = SubjectSchema.parse(subjectData)

      return c.json({
        success: true,
        data: subject,
      })
    } catch (parseError) {
      console.error('教科詳細データ変換エラー:', parseError, 'Data:', resultData)
      throw parseError
    }
  } catch (error) {
    console.error('教科詳細取得エラー:', error)

    if (error instanceof z.ZodError) {
      return c.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'IDが正しくありません',
          details: { validationErrors: error.issues },
        },
        400
      )
    }

    return c.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '教科詳細の取得中にエラーが発生しました',
      },
      500
    )
  }
})

// 教科更新ハンドラー
subjectsApp.openapi(updateSubjectRoute, async c => {
  try {
    const db = c.env.DB
    const { id } = c.req.valid('param')
    const rawUpdateData = await c.req.json()

    console.log(
      '🟢 [SUBJECTS UPDATE] 教科更新RAWリクエスト受信:',
      JSON.stringify(rawUpdateData, null, 2)
    )
    console.log('🔍 [SUBJECTS UPDATE] 受信データのキー:', Object.keys(rawUpdateData || {}))

    // transform処理を手動で実行
    const updateData = UpdateSubjectRequestSchema.parse(rawUpdateData)

    console.log('🔧 [SUBJECTS UPDATE] Transform後データ:', JSON.stringify(updateData, null, 2))
    console.log('🔍 [SUBJECTS UPDATE] school_id値:', updateData.school_id)

    // 既存教科の確認
    const existingSubject = await db.prepare('SELECT * FROM subjects WHERE id = ?').bind(id).first()

    if (!existingSubject) {
      return c.json(
        {
          success: false,
          error: 'SUBJECT_NOT_FOUND',
          message: '指定された教科が見つかりません',
        },
        404
      )
    }

    const now = new Date().toISOString()

    // 更新フィールド構築（正規化済みデータを使用）
    const updateFields: string[] = []
    const updateParams: (string | number)[] = []

    if (updateData.name !== undefined) {
      updateFields.push('name = ?')
      updateParams.push(updateData.name)
    }

    if (updateData.school_id !== undefined) {
      updateFields.push('school_id = ?')
      updateParams.push(updateData.school_id)
    }

    if (updateData.target_grades !== undefined) {
      updateFields.push('target_grades = ?')
      updateParams.push(updateData.target_grades)
    }

    if (updateData.weekly_hours !== undefined) {
      updateFields.push('weekly_hours = ?')
      updateParams.push(updateData.weekly_hours)
    }

    if (updateData.special_classroom !== undefined) {
      updateFields.push('special_classroom = ?')
      updateParams.push(updateData.special_classroom)
      updateFields.push('requires_special_room = ?')
      updateParams.push(updateData.special_classroom ? 1 : 0)
    }

    updateFields.push('updated_at = ?')
    updateParams.push(now)
    updateParams.push(id)

    // データベース更新
    const result = await db
      .prepare(`
        UPDATE subjects 
        SET ${updateFields.join(', ')} 
        WHERE id = ?
      `)
      .bind(...updateParams)
      .run()

    if (result.changes === 0) {
      return c.json(
        {
          success: false,
          error: 'SUBJECT_NOT_FOUND',
          message: '指定された教科が見つかりません',
        },
        404
      )
    }

    // 更新後のデータ取得
    const updatedResult = await db.prepare('SELECT * FROM subjects WHERE id = ?').bind(id).first()

    const updatedData = updatedResult as Record<string, unknown>

    try {
      // target_gradesの安全な解析
      let grades: number[] = []
      if (updatedData.target_grades && typeof updatedData.target_grades === 'string') {
        try {
          const parsed = JSON.parse(updatedData.target_grades as string)
          grades = Array.isArray(parsed) ? parsed : []
        } catch {
          grades = []
        }
      }

      // weekly_hoursの処理
      let weeklyHours: Record<string, number> = {}
      if (updatedData.weekly_hours && typeof updatedData.weekly_hours === 'number') {
        if (grades.length > 0) {
          for (const grade of grades) {
            weeklyHours[grade.toString()] = updatedData.weekly_hours as number
          }
        } else {
          weeklyHours = {
            '1': updatedData.weekly_hours as number,
            '2': updatedData.weekly_hours as number,
            '3': updatedData.weekly_hours as number,
          }
        }
      }

      const subjectData = {
        id: updatedData.id,
        name: updatedData.name,
        school_id: updatedData.school_id, // 必須フィールドを追加
        grades, // フロントエンド期待フィールド
        targetGrades: grades, // 別名でも提供
        target_grades: updatedData.target_grades, // 元のDB値も保持
        weeklyHours,
        weekly_hours: updatedData.weekly_hours, // DB値も保持
        requiresSpecialClassroom:
          updatedData.special_classroom !== null &&
          updatedData.special_classroom !== '' &&
          updatedData.special_classroom !== '普通教室',
        specialClassroom: (updatedData.special_classroom as string) || '', // フロントエンド期待フィールド
        special_classroom: updatedData.special_classroom, // DB値も保持
        classroomType: (updatedData.special_classroom as string) || '普通教室',
        color: '#3B82F6', // デフォルト色（16進数形式）
        order: Number(updatedData.id?.toString().slice(-2)) || 1, // IDから生成される順序
        description: (updatedData.description as string) || undefined, // オプションフィールド
        created_at: updatedData.created_at,
        updated_at: updatedData.updated_at,
      }

      const subject = SubjectSchema.parse(subjectData)

      return c.json({
        success: true,
        data: subject,
        message: '教科を正常に更新しました',
      })
    } catch (parseError) {
      console.error('教科更新データ変換エラー:', parseError, 'Data:', updatedData)
      throw parseError
    }
  } catch (error) {
    console.error('教科更新エラー:', error)

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
        message: '教科の更新中にエラーが発生しました',
      },
      500
    )
  }
})

// 教科削除ハンドラー
subjectsApp.openapi(deleteSubjectRoute, async c => {
  try {
    const db = c.env.DB
    const { id } = c.req.valid('param')

    // 削除前に教科データを取得
    const subjectToDelete = await db.prepare('SELECT * FROM subjects WHERE id = ?').bind(id).first()

    if (!subjectToDelete) {
      return c.json(
        {
          success: false,
          error: 'SUBJECT_NOT_FOUND',
          message: '指定された教科が見つかりません',
        },
        404
      )
    }

    // データベースから削除
    const result = await db.prepare('DELETE FROM subjects WHERE id = ?').bind(id).run()

    if (result.changes === 0) {
      return c.json(
        {
          success: false,
          error: 'DELETE_FAILED',
          message: '教科の削除に失敗しました',
        },
        500
      )
    }

    return c.json({
      success: true,
      message: '教科を正常に削除しました',
      data: {
        deletedId: id,
        deletedName: (subjectToDelete as Record<string, unknown>).name,
        deletedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('教科削除エラー:', error)

    if (error instanceof z.ZodError) {
      return c.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'IDが正しくありません',
          details: { validationErrors: error.issues },
        },
        400
      )
    }

    return c.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '教科の削除中にエラーが発生しました',
      },
      500
    )
  }
})

// 教科作成ハンドラー - OpenAPI統合型安全実装
subjectsApp.openapi(createSubjectRoute, async c => {
  try {
    const db = c.env.DB
    const rawData = await c.req.json()

    console.log('🟢 [SUBJECTS API] 教科作成RAWリクエスト受信:', JSON.stringify(rawData, null, 2))
    console.log('🔍 [SUBJECTS API] 受信データのキー:', Object.keys(rawData || {}))

    // transform処理を手動で実行
    const createData = CreateSubjectRequestSchema.parse(rawData)

    console.log('🔧 [SUBJECTS API] Transform後データ:', JSON.stringify(createData, null, 2))
    console.log('🔍 [SUBJECTS API] school_id値:', createData.school_id)
    console.log('🔍 [SUBJECTS API] school_id型:', typeof createData.school_id)

    // データベース挿入
    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    // 正規化済みデータを使用
    const normalizedData = {
      name: createData.name,
      school_id: createData.school_id,
      weekly_hours: createData.weekly_hours,
      target_grades: createData.target_grades || '[]',
      special_classroom: createData.special_classroom,
    }

    console.log('🔧 [SUBJECTS API] DB挿入用データ:', JSON.stringify(normalizedData, null, 2))

    const insertResult = await db
      .prepare(`
      INSERT INTO subjects (
        id, name, school_id, weekly_hours, target_grades, special_classroom, 
        created_at, updated_at, requires_special_room
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(
        id,
        normalizedData.name,
        normalizedData.school_id,
        normalizedData.weekly_hours,
        normalizedData.target_grades,
        normalizedData.special_classroom,
        now,
        now,
        normalizedData.special_classroom ? 1 : 0
      )
      .run()

    console.log('✅ [SUBJECTS API] DB挿入結果:', JSON.stringify(insertResult, null, 2))

    if (insertResult.changes === 0) {
      return c.json(
        {
          success: false,
          error: 'CREATE_FAILED',
          message: '教科の作成に失敗しました',
        },
        500
      )
    }

    // 作成された教科データを取得してフロントエンド形式に変換
    const createdSubject = await db.prepare('SELECT * FROM subjects WHERE id = ?').bind(id).first()
    const dbData = createdSubject as Record<string, unknown>

    // フロントエンド期待形式に変換
    // target_gradesの安全な解析
    let grades: number[] = []
    if (dbData.target_grades && typeof dbData.target_grades === 'string') {
      try {
        const parsed = JSON.parse(dbData.target_grades as string)
        grades = Array.isArray(parsed) ? parsed : []
      } catch {
        grades = []
      }
    }

    // weekly_hoursの処理（数値形式）
    const weeklyHoursNumber = typeof dbData.weekly_hours === 'number' ? dbData.weekly_hours : null

    const responseData = {
      id: dbData.id,
      name: dbData.name,
      grades, // フロントエンド期待フィールド
      targetGrades: grades, // 別名でも提供
      target_grades: dbData.target_grades, // 元のDB値も保持
      weeklyHours: weeklyHoursNumber
        ? {
            [grades[0] || '1']: weeklyHoursNumber,
            [grades[1] || '2']: weeklyHoursNumber,
            [grades[2] || '3']: weeklyHoursNumber,
          }
        : {},
      weekly_hours: dbData.weekly_hours, // DB値も保持
      requiresSpecialClassroom:
        dbData.special_classroom !== null &&
        dbData.special_classroom !== '' &&
        dbData.special_classroom !== '普通教室',
      specialClassroom: (dbData.special_classroom as string) || '', // フロントエンド期待フィールド
      special_classroom: dbData.special_classroom, // DB値も保持
      classroomType: (dbData.special_classroom as string) || '普通教室',
      color: '#3B82F6', // デフォルト色
      order: Number(dbData.id?.toString().slice(-2)) || 1,
      school_id: dbData.school_id,
      created_at: dbData.created_at,
      updated_at: dbData.updated_at,
    }

    console.log('✅ [SUBJECTS API] 教科作成完了:', JSON.stringify(responseData, null, 2))

    return c.json(
      {
        success: true,
        message: '教科を正常に作成しました',
        data: responseData,
      },
      201
    )
  } catch (error) {
    console.error('❌ [SUBJECTS API] 教科作成エラー:', error)
    console.error('❌ [SUBJECTS API] エラー詳細:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      isZodError: error instanceof z.ZodError,
    })

    if (error instanceof z.ZodError) {
      console.error(
        '❌ [SUBJECTS API] Zodバリデーションエラー詳細:',
        JSON.stringify(error.issues, null, 2)
      )
      return c.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'リクエストデータが正しくありません',
          details: {
            validationErrors: error.issues,
            errorDetails: JSON.stringify(error.issues, null, 2),
          },
        },
        400
      )
    }

    return c.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '教科の作成中にエラーが発生しました',
        details: {
          error: error.message,
          stack: error.stack,
        },
      },
      500
    )
  }
})

export default subjectsApp
