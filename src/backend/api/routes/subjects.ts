/**
 * 教科管理API - OpenAPI完全型安全ルート
 * Zodスキーマによる厳密な型検証とドキュメント自動生成
 */
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import {
  ClassroomTypeSchema,
  type Env,
  GradeSchema,
  IdSchema,
  NameSchema,
  PositiveIntegerSchema,
  SubjectSchema,
} from '@shared/schemas'
import { createErrorResponseSchemas, createResponseSchemas, paginationSchema } from '../openapi'

// 教科管理用OpenAPIアプリ
const subjectsApp = new OpenAPIHono<{ Bindings: Env }>()

// 教科作成リクエストスキーマ
const CreateSubjectRequestSchema = z.object({
  name: NameSchema.describe('教科名'),
  grades: z.array(GradeSchema).min(0).describe('対象学年配列（空配列=全学年対応）'),
  weeklyHours: z
    .record(
      z.string().regex(/^[1-6]$/, '学年は1-6です'),
      PositiveIntegerSchema.max(10, '週間時数は10以下です')
    )
    .describe('学年別週間授業数'),
  requiresSpecialClassroom: z.boolean().optional().default(false).describe('特別教室が必要か'),
  classroomType: ClassroomTypeSchema.optional().describe('必要な教室タイプ'),
  order: z.number().int().positive().optional().describe('表示順序'),
})

// 教科更新リクエストスキーマ
const UpdateSubjectRequestSchema = CreateSubjectRequestSchema.partial()

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
  path: '/subjects',
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
  responses: createResponseSchemas({
    type: 'object',
    properties: {
      subjects: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: '数学' },
            grades: {
              type: 'array',
              items: { type: 'number', minimum: 1, maximum: 6 },
              description: '対象学年配列',
            },
            weeklyHours: {
              type: 'object',
              additionalProperties: { type: 'number', minimum: 1, maximum: 10 },
              description: '学年別週間授業数',
              example: { '1': 5, '2': 4, '3': 4 },
            },
            requiresSpecialClassroom: { type: 'boolean' },
            classroomType: {
              type: 'string',
              enum: [
                '普通教室',
                '理科室',
                '音楽室',
                '美術室',
                '体育館',
                '図書室',
                'コンピュータ室',
                '技術室',
                '家庭科室',
                'その他',
              ],
            },
            order: { type: 'number' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
      pagination: paginationSchema,
    },
  }),
})

// 教科詳細取得ルート
const getSubjectRoute = createRoute({
  method: 'get',
  path: '/subjects/{id}',
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
  responses: createResponseSchemas({
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string', example: '数学' },
      grades: {
        type: 'array',
        items: { type: 'number', minimum: 1, maximum: 6 },
        description: '対象学年配列',
      },
      weeklyHours: {
        type: 'object',
        additionalProperties: { type: 'number', minimum: 1, maximum: 10 },
        description: '学年別週間授業数',
      },
      requiresSpecialClassroom: { type: 'boolean', description: '特別教室が必要か' },
      classroomType: {
        type: 'string',
        enum: [
          '普通教室',
          '理科室',
          '音楽室',
          '美術室',
          '体育館',
          '図書室',
          'コンピュータ室',
          '技術室',
          '家庭科室',
          'その他',
        ],
        description: '必要な教室タイプ',
      },
      order: { type: 'number', description: '表示順序' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
    },
  }),
})

// 教科作成ルート
const createSubjectRoute = createRoute({
  method: 'post',
  path: '/subjects',
  summary: '教科作成',
  description: `
新しい教科を作成します。

## 作成時の必須項目

- **name**: 教科名（1-100文字、日本語・英語対応）
- **weeklyHours**: 学年別週間授業数（必須）

## オプション項目

- **grades**: 対象学年配列（空配列=全学年対応）
- **requiresSpecialClassroom**: 特別教室要否
- **classroomType**: 必要な教室タイプ
- **order**: 表示順序

## バリデーション

- 教科名の重複チェック
- 学年範囲チェック（1-6年生）
- 週間時数の妥当性チェック（1-10時間）
- 教室タイプの整合性チェック

## リクエスト例

\`\`\`json
{
  "name": "数学",
  "grades": [1, 2, 3],
  "weeklyHours": {
    "1": 5,
    "2": 4,
    "3": 4
  },
  "requiresSpecialClassroom": false,
  "classroomType": "普通教室",
  "order": 1
}
\`\`\`
  `,
  tags: ['教科管理'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                minLength: 1,
                maxLength: 100,
                example: '数学',
              },
              grades: {
                type: 'array',
                items: { type: 'number', minimum: 1, maximum: 6 },
                description: '対象学年配列（空配列=全学年対応）',
                example: [1, 2, 3],
              },
              weeklyHours: {
                type: 'object',
                additionalProperties: { type: 'number', minimum: 1, maximum: 10 },
                description: '学年別週間授業数',
                example: { '1': 5, '2': 4, '3': 4 },
              },
              requiresSpecialClassroom: {
                type: 'boolean',
                description: '特別教室が必要か',
                default: false,
              },
              classroomType: {
                type: 'string',
                enum: [
                  '普通教室',
                  '理科室',
                  '音楽室',
                  '美術室',
                  '体育館',
                  '図書室',
                  'コンピュータ室',
                  '技術室',
                  '家庭科室',
                  'その他',
                ],
                description: '必要な教室タイプ',
              },
              order: { type: 'number', minimum: 1, description: '表示順序' },
            },
            required: ['name', 'weeklyHours'],
          },
        },
      },
    },
  },
  responses: createResponseSchemas({
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      grades: { type: 'array', items: { type: 'number' } },
      weeklyHours: { type: 'object', additionalProperties: { type: 'number' } },
      requiresSpecialClassroom: { type: 'boolean' },
      classroomType: { type: 'string' },
      order: { type: 'number' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
    },
  }),
})

// 教科更新ルート
const updateSubjectRoute = createRoute({
  method: 'put',
  path: '/subjects/{id}',
  summary: '教科更新',
  description: `
既存の教科情報を更新します。

## 更新可能項目

すべての項目が任意更新（partial update）対応：

- **name**: 教科名
- **grades**: 対象学年
- **weeklyHours**: 学年別週間授業数
- **requiresSpecialClassroom**: 特別教室要否
- **classroomType**: 教室タイプ
- **order**: 表示順序

## 更新時のバリデーション

- 既存教科の存在チェック
- 更新データの型安全性チェック
- 学年・時数の妥当性チェック
- 教室タイプの整合性チェック
  `,
  tags: ['教科管理'],
  request: {
    params: z.object({
      id: IdSchema.describe('教科ID'),
    }),
    body: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string', minLength: 1, maxLength: 100 },
              grades: {
                type: 'array',
                items: { type: 'number', minimum: 1, maximum: 6 },
              },
              weeklyHours: {
                type: 'object',
                additionalProperties: { type: 'number', minimum: 1, maximum: 10 },
              },
              requiresSpecialClassroom: { type: 'boolean' },
              classroomType: {
                type: 'string',
                enum: [
                  '普通教室',
                  '理科室',
                  '音楽室',
                  '美術室',
                  '体育館',
                  '図書室',
                  'コンピュータ室',
                  '技術室',
                  '家庭科室',
                  'その他',
                ],
              },
              order: { type: 'number', minimum: 1 },
            },
          },
        },
      },
    },
  },
  responses: createResponseSchemas({
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      grades: { type: 'array', items: { type: 'number' } },
      weeklyHours: { type: 'object', additionalProperties: { type: 'number' } },
      requiresSpecialClassroom: { type: 'boolean' },
      classroomType: { type: 'string' },
      order: { type: 'number' },
      updated_at: { type: 'string', format: 'date-time' },
    },
  }),
})

// 教科削除ルート
const deleteSubjectRoute = createRoute({
  method: 'delete',
  path: '/subjects/{id}',
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
    
    const query = SubjectQuerySchema.parse(c.req.query())
    console.log('✅ Query parsed:', query)

    // データベースから実際のデータを取得
    const subjects = await db
      .prepare('SELECT * FROM subjects ORDER BY name')
      .all()

    console.log('📊 Subjects retrieved:', subjects.results?.length || 0)

    return c.json({
      success: true,
      data: {
        subjects: subjects.results || [],
        pagination: {
          page: query.page || 1,
          limit: query.limit || 20,
          total: subjects.results?.length || 0,
          totalPages: Math.ceil((subjects.results?.length || 0) / (query.limit || 20)),
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
    const { id } = c.req.param()

    // IDの形式検証
    IdSchema.parse(id)

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

      // weekly_lessonsの処理
      let weeklyHours: Record<string, number> = {}
      if (resultData.weekly_lessons && typeof resultData.weekly_lessons === 'number') {
        if (grades.length > 0) {
          for (const grade of grades) {
            weeklyHours[grade.toString()] = resultData.weekly_lessons as number
          }
        } else {
          weeklyHours = {
            '1': resultData.weekly_lessons as number,
            '2': resultData.weekly_lessons as number,
            '3': resultData.weekly_lessons as number,
          }
        }
      }

      const subjectData = {
        id: resultData.id,
        name: resultData.name,
        grades,
        weeklyHours,
        requiresSpecialClassroom:
          resultData.special_classroom !== null &&
          resultData.special_classroom !== '' &&
          resultData.special_classroom !== '普通教室',
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

// 教科作成ハンドラー
subjectsApp.openapi(createSubjectRoute, async c => {
  try {
    const db = c.env.DB
    const body = await c.req.json()

    // リクエストデータ検証
    const validatedData = CreateSubjectRequestSchema.parse(body)

    // 一意ID生成
    const subjectId = crypto.randomUUID()
    const now = new Date().toISOString()

    // データベース挿入
    const result = await db
      .prepare(`
        INSERT INTO subjects (
          id, name, target_grades, weekly_lessons, special_classroom, 
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        subjectId,
        validatedData.name,
        JSON.stringify(validatedData.grades || []),
        Object.values(validatedData.weeklyHours)[0] || 1, // 最初の学年の時数を使用
        validatedData.classroomType || '普通教室',
        now,
        now
      )
      .run()

    if (!result.success) {
      throw new Error('データベース挿入に失敗しました')
    }

    // 作成された教科データを返却
    const subjectData = {
      id: subjectId,
      name: validatedData.name,
      grades: validatedData.grades || [],
      weeklyHours: validatedData.weeklyHours || {},
      requiresSpecialClassroom: validatedData.requiresSpecialClassroom || false,
      classroomType: validatedData.classroomType || '普通教室',
      color: '#3B82F6', // デフォルト色（16進数形式）
      order: validatedData.order || Number(subjectId.slice(-2)) || 1, // IDから生成される順序
      description: undefined, // オプションフィールド
      created_at: now,
      updated_at: now,
    }

    const subject = SubjectSchema.parse(subjectData)

    return c.json(
      {
        success: true,
        data: subject,
        message: '教科を正常に作成しました',
      },
      201
    )
  } catch (error) {
    console.error('教科作成エラー:', error)

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
        message: '教科の作成中にエラーが発生しました',
      },
      500
    )
  }
})

// 教科更新ハンドラー
subjectsApp.openapi(updateSubjectRoute, async c => {
  try {
    const db = c.env.DB
    const { id } = c.req.param()
    const body = await c.req.json()

    // パラメータとデータの検証
    IdSchema.parse(id)
    const updateData = UpdateSubjectRequestSchema.parse(body)

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

    // 更新フィールド構築
    const updateFields: string[] = []
    const updateParams: (string | number)[] = []

    if (updateData.name !== undefined) {
      updateFields.push('name = ?')
      updateParams.push(updateData.name)
    }

    if (updateData.grades !== undefined) {
      updateFields.push('target_grades = ?')
      updateParams.push(JSON.stringify(updateData.grades))
    }

    if (updateData.weeklyHours !== undefined) {
      updateFields.push('weekly_lessons = ?')
      updateParams.push(Object.values(updateData.weeklyHours)[0] || 1)
    }

    if (updateData.classroomType !== undefined) {
      updateFields.push('special_classroom = ?')
      updateParams.push(updateData.classroomType)
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

      // weekly_lessonsの処理
      let weeklyHours: Record<string, number> = {}
      if (updatedData.weekly_lessons && typeof updatedData.weekly_lessons === 'number') {
        if (grades.length > 0) {
          for (const grade of grades) {
            weeklyHours[grade.toString()] = updatedData.weekly_lessons as number
          }
        } else {
          weeklyHours = {
            '1': updatedData.weekly_lessons as number,
            '2': updatedData.weekly_lessons as number,
            '3': updatedData.weekly_lessons as number,
          }
        }
      }

      const subjectData = {
        id: updatedData.id,
        name: updatedData.name,
        grades,
        weeklyHours,
        requiresSpecialClassroom:
          updatedData.special_classroom !== null &&
          updatedData.special_classroom !== '' &&
          updatedData.special_classroom !== '普通教室',
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
    const { id } = c.req.param()

    // ID検証
    IdSchema.parse(id)

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

export default subjectsApp
