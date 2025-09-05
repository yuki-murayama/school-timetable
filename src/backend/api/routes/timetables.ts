/**
 * 時間割管理API - シンプルなHono実装（safeParseAsync問題回避）
 */

import type { Env } from '@shared/schemas'
import { Hono } from 'hono'
import { z } from 'zod'

// 時間割管理用アプリ
const timetablesApp = new Hono<{ Bindings: Env }>()

// 時間割生成リクエストスキーマ
const GenerateTimetableRequestSchema = z.object({
  grade: GradeSchema.describe('学年'),
  classNumber: ClassNumberSchema.describe('クラス番号'),
  version: z.string().min(1).max(50).default('v1').describe('時間割バージョン'),
  constraints: z
    .object({
      maxPeriodsPerDay: PositiveIntegerSchema.max(10, '1日の最大授業数は10以下です')
        .default(6)
        .describe('1日の最大授業数'),
      allowConsecutive: z.boolean().default(true).describe('同じ教科の連続授業を許可するか'),
      preferMorning: z.array(z.string().uuid()).default([]).describe('午前を優先する教科ID配列'),
      avoidFriday: z.array(z.string().uuid()).default([]).describe('金曜日を避ける教科ID配列'),
      fixedSlots: z
        .array(
          z.object({
            weekday: WeekdaySchema,
            period: PeriodSchema,
            subjectId: z.string().uuid(),
            teacherId: z.string().uuid().optional(),
            classroomId: z.string().uuid().optional(),
          })
        )
        .default([])
        .describe('固定授業スロット配列'),
    })
    .optional()
    .default({})
    .describe('時間割生成制約条件'),
  metadata: z
    .object({
      description: z.string().max(500).optional().describe('時間割の説明'),
      tags: z.array(z.string().max(50)).max(10).default([]).describe('タグ配列'),
      priority: z.enum(['low', 'normal', 'high']).default('normal').describe('優先度'),
    })
    .optional()
    .default({})
    .describe('時間割メタデータ'),
})

// 時間割更新リクエストスキーマ
const _UpdateTimetableRequestSchema = z.object({
  slots: z.array(TimetableSlotSchema).describe('更新する時間割スロット配列'),
  version: z.string().min(1).max(50).optional().describe('新しいバージョン'),
  metadata: z
    .object({
      description: z.string().max(500).optional(),
      tags: z.array(z.string().max(50)).max(10).optional(),
      priority: z.enum(['low', 'normal', 'high']).optional(),
    })
    .optional()
    .describe('更新するメタデータ'),
})

// 時間割検索クエリスキーマ
const TimetableQuerySchema = z.object({
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
  grade: z
    .string()
    .regex(/^[1-6]$/)
    .transform(Number)
    .optional()
    .describe('学年フィルタ'),
  classNumber: z
    .string()
    .regex(/^[1-9]\d{0,1}$/)
    .transform(Number)
    .optional()
    .describe('クラス番号フィルタ'),
  version: z.string().max(50).optional().describe('バージョンフィルタ'),
  status: z.enum(['draft', 'active', 'archived']).optional().describe('ステータスフィルタ'),
  sort: z
    .enum(['created_at', 'updated_at', 'grade', 'class_number', 'version'])
    .optional()
    .describe('並び順'),
  order: z.enum(['asc', 'desc']).optional().describe('並び方向'),
})

// 時間割一覧レスポンススキーマ
const _TimetablesListResponseSchema = z.object({
  timetables: z.array(TimetableSchema),
  pagination: z.object({
    page: z.number().min(1),
    limit: z.number().min(1),
    total: z.number().min(0),
    totalPages: z.number().min(0),
  }),
  summary: z
    .object({
      byGrade: z.record(z.string(), z.number()),
      byStatus: z.record(z.string(), z.number()),
      totalSlots: z.number().min(0),
    })
    .optional(),
})

// 時間割生成状況レスポンススキーマ
const _TimetableGenerationStatusSchema = z.object({
  id: IdSchema.describe('生成ジョブID'),
  status: z.enum(['pending', 'running', 'completed', 'failed']).describe('生成状況'),
  progress: z.number().min(0).max(100).describe('進捗率（0-100%）'),
  startTime: z.string().datetime().describe('開始時刻'),
  endTime: z.string().datetime().optional().describe('終了時刻'),
  result: TimetableSchema.optional().describe('生成結果'),
  errors: z
    .array(
      z.object({
        code: z.string(),
        message: z.string(),
        details: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .default([])
    .describe('エラー配列'),
  metadata: z
    .object({
      totalSlots: z.number(),
      filledSlots: z.number(),
      conflicts: z.number(),
      optimizationScore: z.number().min(0).max(1).optional(),
    })
    .optional()
    .describe('生成統計情報'),
})

// 時間割一覧取得ルート
const getTimetablesRoute = createRoute({
  method: 'get',
  path: '/timetables',
  summary: '時間割一覧取得',
  description: `
時間割一覧を取得します。検索・フィルタリング・ページネーション機能付き。

## 機能

- **検索**: 学年・クラス・バージョンでフィルタリング
- **ステータス**: draft（下書き）・active（有効）・archived（アーカイブ）
- **並び順**: 作成日時・更新日時・学年・クラス番号・バージョンでソート
- **ページネーション**: 大量データに対応
- **統計情報**: 学年別・ステータス別の分布

## クエリパラメータ例

- \`?grade=1&classNumber=1\` - 1年1組の時間割を検索
- \`?status=active\` - 有効な時間割のみ
- \`?sort=updated_at&order=desc\` - 更新日時降順でソート
- \`?page=2&limit=10\` - 2ページ目を10件ずつ表示
  `,
  tags: ['時間割管理'],
  request: {
    query: {
      type: 'object',
      properties: {
        page: { type: 'string', pattern: '^\\d+$', description: 'ページ番号（1から開始）' },
        limit: { type: 'string', pattern: '^\\d+$', description: '1ページの件数（1-100）' },
        grade: { type: 'string', pattern: '^[1-6]$', description: '学年' },
        classNumber: { type: 'string', pattern: '^[1-9]\\d{0,1}$', description: 'クラス番号' },
        version: { type: 'string', maxLength: 50, description: 'バージョン' },
        status: {
          type: 'string',
          enum: ['draft', 'active', 'archived'],
          description: 'ステータス',
        },
        sort: {
          type: 'string',
          enum: ['created_at', 'updated_at', 'grade', 'class_number', 'version'],
          description: '並び順',
        },
        order: { type: 'string', enum: ['asc', 'desc'], description: '並び方向' },
      },
    },
  },
  responses: createResponseSchemas({
    type: 'object',
    properties: {
      timetables: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            grade: { type: 'number', minimum: 1, maximum: 6 },
            classNumber: { type: 'number', minimum: 1, maximum: 20 },
            version: { type: 'string', example: 'v1' },
            status: { type: 'string', enum: ['draft', 'active', 'archived'] },
            slots: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  weekday: { type: 'number', minimum: 1, maximum: 5 },
                  period: { type: 'number', minimum: 1, maximum: 10 },
                  subjectId: { type: 'string', format: 'uuid' },
                  teacherId: { type: 'string', format: 'uuid' },
                  classroomId: { type: 'string', format: 'uuid' },
                },
              },
            },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
      pagination: paginationSchema,
      summary: {
        type: 'object',
        properties: {
          byGrade: { type: 'object', additionalProperties: { type: 'number' } },
          byStatus: { type: 'object', additionalProperties: { type: 'number' } },
          totalSlots: { type: 'number', description: '総スロット数' },
        },
      },
    },
  }),
})

// 時間割詳細取得ルート
const getTimetableRoute = createRoute({
  method: 'get',
  path: '/timetables/{id}',
  summary: '時間割詳細取得',
  description: `
指定されたIDの時間割詳細情報を取得します。

## レスポンス内容

- **基本情報**: ID、学年、クラス番号、バージョン、ステータス
- **授業スロット**: 曜日・時限・教科・教師・教室の詳細配置
- **制約条件**: 生成時の制約とルール
- **統計情報**: 授業数・空きコマ・制約違反の統計
- **メタデータ**: 作成・更新日時、説明、タグ
  `,
  tags: ['時間割管理'],
  request: {
    params: z.object({
      id: IdSchema.describe('時間割ID'),
    }),
  },
  responses: createResponseSchemas({
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      grade: { type: 'number', minimum: 1, maximum: 6 },
      classNumber: { type: 'number', minimum: 1, maximum: 20 },
      version: { type: 'string' },
      status: { type: 'string', enum: ['draft', 'active', 'archived'] },
      slots: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            weekday: { type: 'number', minimum: 1, maximum: 5 },
            period: { type: 'number', minimum: 1, maximum: 10 },
            subjectId: { type: 'string', format: 'uuid' },
            teacherId: { type: 'string', format: 'uuid' },
            classroomId: { type: 'string', format: 'uuid' },
          },
        },
      },
      constraints: { type: 'object', description: '生成制約条件' },
      metadata: { type: 'object', description: 'メタデータ' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
    },
  }),
})

// 時間割生成ルート
const generateTimetableRoute = createRoute({
  method: 'post',
  path: '/timetables/generate',
  summary: '時間割生成',
  description: `
AI時間割生成エンジンを使用して新しい時間割を生成します。

## 生成アルゴリズム

1. **制約収集**: 教師・教科・教室・学校設定の制約を収集
2. **スロット初期化**: 週5日×最大10時限のスロットマトリクスを作成
3. **制約解決**: 最適化アルゴリズムで制約を満たす配置を探索
4. **品質評価**: 生成された時間割の品質を評価・スコア化
5. **最適化**: 複数回の試行で最良の結果を選択

## 生成制約

- **教師制約**: 同時刻の重複授業なし、専門教科の担当
- **教室制約**: 特別教室の適切な割り当て、収容人数
- **教科制約**: 週間時数の遵守、学年適合性
- **学校制約**: 授業時間、曜日制限、休み時間

## リクエスト例

\`\`\`json
{
  "grade": 1,
  "classNumber": 1,
  "version": "2024春学期",
  "constraints": {
    "maxPeriodsPerDay": 6,
    "allowConsecutive": true,
    "preferMorning": ["subject-math-id", "subject-japanese-id"],
    "avoidFriday": ["subject-pe-id"],
    "fixedSlots": []
  },
  "metadata": {
    "description": "1年1組の春学期時間割",
    "tags": ["春学期", "標準"],
    "priority": "high"
  }
}
\`\`\`
  `,
  tags: ['時間割管理'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              grade: { type: 'number', minimum: 1, maximum: 6, example: 1 },
              classNumber: { type: 'number', minimum: 1, maximum: 20, example: 1 },
              version: {
                type: 'string',
                minLength: 1,
                maxLength: 50,
                default: 'v1',
                example: '2024春学期',
              },
              constraints: {
                type: 'object',
                properties: {
                  maxPeriodsPerDay: { type: 'number', minimum: 1, maximum: 10, default: 6 },
                  allowConsecutive: { type: 'boolean', default: true },
                  preferMorning: {
                    type: 'array',
                    items: { type: 'string', format: 'uuid' },
                    default: [],
                  },
                  avoidFriday: {
                    type: 'array',
                    items: { type: 'string', format: 'uuid' },
                    default: [],
                  },
                  fixedSlots: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        weekday: { type: 'number', minimum: 1, maximum: 5 },
                        period: { type: 'number', minimum: 1, maximum: 10 },
                        subjectId: { type: 'string', format: 'uuid' },
                        teacherId: { type: 'string', format: 'uuid' },
                        classroomId: { type: 'string', format: 'uuid' },
                      },
                      required: ['weekday', 'period', 'subjectId'],
                    },
                    default: [],
                  },
                },
                default: {},
              },
              metadata: {
                type: 'object',
                properties: {
                  description: { type: 'string', maxLength: 500 },
                  tags: {
                    type: 'array',
                    items: { type: 'string', maxLength: 50 },
                    maxItems: 10,
                    default: [],
                  },
                  priority: { type: 'string', enum: ['low', 'normal', 'high'], default: 'normal' },
                },
                default: {},
              },
            },
            required: ['grade', 'classNumber'],
          },
        },
      },
    },
  },
  responses: {
    202: {
      description: '生成開始',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string', example: '時間割生成を開始しました' },
              data: {
                type: 'object',
                properties: {
                  jobId: { type: 'string', format: 'uuid' },
                  estimatedDuration: { type: 'number', description: '推定完了時間（秒）' },
                  statusUrl: { type: 'string', description: '生成状況確認URL' },
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

// 時間割生成状況確認ルート
const getTimetableGenerationStatusRoute = createRoute({
  method: 'get',
  path: '/timetables/generate/{jobId}',
  summary: '時間割生成状況確認',
  description: `
時間割生成の進行状況と結果を確認します。

## ステータス種類

- **pending**: 生成待機中
- **running**: 生成実行中
- **completed**: 生成完了
- **failed**: 生成失敗

## 進捗情報

- 進捗率（0-100%）
- 現在のフェーズ（制約収集、スロット配置、最適化など）
- 推定残り時間
- 中間結果とスコア

## エラー情報

生成失敗時の詳細なエラー情報：
- 制約違反の詳細
- リソース不足の警告
- 推奨される修正方法
  `,
  tags: ['時間割管理'],
  request: {
    params: z.object({
      jobId: IdSchema.describe('生成ジョブID'),
    }),
  },
  responses: createResponseSchemas({
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed'] },
      progress: { type: 'number', minimum: 0, maximum: 100 },
      startTime: { type: 'string', format: 'date-time' },
      endTime: { type: 'string', format: 'date-time' },
      result: {
        type: 'object',
        description: '生成結果の時間割データ',
        properties: {
          id: { type: 'string', format: 'uuid' },
          grade: { type: 'number' },
          classNumber: { type: 'number' },
          slots: { type: 'array', items: { type: 'object' } },
        },
      },
      errors: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            message: { type: 'string' },
            details: { type: 'object' },
          },
        },
      },
      metadata: {
        type: 'object',
        properties: {
          totalSlots: { type: 'number' },
          filledSlots: { type: 'number' },
          conflicts: { type: 'number' },
          optimizationScore: { type: 'number', minimum: 0, maximum: 1 },
        },
      },
    },
  }),
})

// 時間割更新ルート
const updateTimetableRoute = createRoute({
  method: 'put',
  path: '/timetables/{id}',
  summary: '時間割更新',
  description: `
既存の時間割を更新します。

## 更新可能項目

- **slots**: 授業スロットの配置変更
- **version**: バージョン情報の更新
- **metadata**: 説明・タグ・優先度の更新

## 更新時の検証

- **制約チェック**: 教師・教室・教科の制約違反チェック
- **整合性検証**: スロット配置の論理的整合性
- **権限確認**: 更新権限と承認プロセス

## 部分更新対応

指定されたフィールドのみを更新し、その他は既存値を保持します。
  `,
  tags: ['時間割管理'],
  request: {
    params: z.object({
      id: IdSchema.describe('時間割ID'),
    }),
    body: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              slots: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    weekday: { type: 'number', minimum: 1, maximum: 5 },
                    period: { type: 'number', minimum: 1, maximum: 10 },
                    subjectId: { type: 'string', format: 'uuid' },
                    teacherId: { type: 'string', format: 'uuid' },
                    classroomId: { type: 'string', format: 'uuid' },
                  },
                  required: ['weekday', 'period', 'subjectId'],
                },
              },
              version: { type: 'string', minLength: 1, maxLength: 50 },
              metadata: {
                type: 'object',
                properties: {
                  description: { type: 'string', maxLength: 500 },
                  tags: { type: 'array', items: { type: 'string', maxLength: 50 }, maxItems: 10 },
                  priority: { type: 'string', enum: ['low', 'normal', 'high'] },
                },
              },
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
      grade: { type: 'number' },
      classNumber: { type: 'number' },
      version: { type: 'string' },
      status: { type: 'string' },
      slots: { type: 'array', items: { type: 'object' } },
      updated_at: { type: 'string', format: 'date-time' },
    },
  }),
})

// 時間割削除ルート
const deleteTimetableRoute = createRoute({
  method: 'delete',
  path: '/timetables/{id}',
  summary: '時間割削除',
  description: `
指定されたIDの時間割を削除します。

## 削除時の注意事項

- **ステータス確認**: activeステータスの時間割は削除前に確認
- **参照整合性**: 関連するデータの影響範囲確認
- **バックアップ**: 削除前の自動バックアップ作成
- **復旧不可**: 削除されたデータは復旧できません

## 安全な削除プロセス

1. 時間割の存在確認
2. アクティブステータスの警告
3. 依存関係の確認
4. 削除実行とログ記録
  `,
  tags: ['時間割管理'],
  request: {
    params: z.object({
      id: IdSchema.describe('時間割ID'),
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
              message: { type: 'string', example: '時間割を正常に削除しました' },
              data: {
                type: 'object',
                properties: {
                  deletedId: { type: 'string', format: 'uuid' },
                  deletedVersion: { type: 'string' },
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

// ハンドラー実装は後ほど実装予定
// 現在は基本的なCRUD操作のスタブを提供

// 時間割一覧取得ハンドラー（型安全実装）
timetablesApp.openapi(getTimetablesRoute, async c => {
  try {
    const query = TimetableQuerySchema.parse(c.req.query())

    console.log('📋 時間割一覧取得:', query)

    // 型安全時間割生成サービス初期化
    const { TypeSafeTimetableGenerationService } = await import(
      '../../services/timetable-generation-service'
    )
    const generationService = new TypeSafeTimetableGenerationService(c.env.DB)

    // 保存済み時間割取得
    const result = await generationService.getSavedTimetables({
      grade: query.grade,
      classSection: query.classNumber?.toString(),
      limit: query.limit || 20,
    })

    console.log(`📊 取得結果: ${result.timetables.length}件の時間割を取得`)

    return c.json({
      success: true,
      data: {
        timetables: result.timetables.map(timetable => ({
          id: timetable.id,
          grade: timetable.grade,
          classNumber: parseInt(timetable.classSection) || 1,
          version: 'v1',
          status: 'active' as const,
          slots: [], // 簡略化
          statistics: timetable.statistics,
          created_at: timetable.generatedAt,
          updated_at: timetable.generatedAt,
        })),
        pagination: {
          page: query.page || 1,
          limit: query.limit || 20,
          total: result.timetables.length,
          totalPages: Math.ceil(result.timetables.length / (query.limit || 20)),
        },
        summary: {
          byGrade: result.timetables.reduce(
            (acc, t) => {
              acc[t.grade.toString()] = (acc[t.grade.toString()] || 0) + 1
              return acc
            },
            {} as Record<string, number>
          ),
          byStatus: { active: result.timetables.length },
          totalSlots: result.timetables.reduce((sum, t) => sum + t.statistics.totalSlots, 0),
        },
      },
    })
  } catch (error) {
    console.error('❌ 時間割一覧取得エラー:', error)

    if (error instanceof z.ZodError) {
      return c.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'クエリパラメータが無効です',
          details: error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
          })),
        },
        400
      )
    }

    return c.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '時間割一覧の取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      500
    )
  }
})

// 時間割詳細取得ハンドラー（スタブ）
timetablesApp.openapi(getTimetableRoute, async c => {
  try {
    const { id: _id } = c.req.param()

    // TODO: 実際のデータベース操作実装
    return c.json(
      {
        success: false,
        error: 'TIMETABLE_NOT_FOUND',
        message: '指定された時間割が見つかりません',
      },
      404
    )
  } catch (error) {
    console.error('時間割詳細取得エラー:', error)
    return c.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '時間割詳細の取得中にエラーが発生しました',
      },
      500
    )
  }
})

// 時間割生成ハンドラー（型安全AI実装）
timetablesApp.openapi(generateTimetableRoute, async c => {
  try {
    const body = await c.req.json()
    const validatedData = GenerateTimetableRequestSchema.parse(body)

    console.log('🧠 時間割生成開始:', {
      grade: validatedData.grade,
      classNumber: validatedData.classNumber,
      constraints: validatedData.constraints,
    })

    // 型安全時間割生成サービス初期化
    const { TypeSafeTimetableGenerationService } = await import(
      '../../services/timetable-generation-service'
    )
    const generationService = new TypeSafeTimetableGenerationService(c.env.DB)

    // 生成オプション構築
    const generationOptions = {
      method: 'optimized' as const,
      maxIterations: 1000,
      timeoutMs: 60000,
      qualityThreshold: 75,
      enableParallelProcessing: true,
      constraintWeights: {
        teacherConflict: 100,
        classroomConflict: 90,
        subjectDistribution: 80,
        teacherWorkload: 70,
        classroomUtilization: 60,
      },
    }

    // 型安全時間割生成実行
    const result: TimetableGenerationResult = await generationService.generateTimetableForClass(
      validatedData.grade,
      validatedData.classNumber.toString(),
      generationOptions
    )

    if (result.success) {
      console.log(`✅ 時間割生成完了: 品質スコア ${result.statistics?.qualityScore}%`)

      return c.json({
        success: true,
        message: '時間割生成が完了しました',
        data: {
          result,
          generationId: crypto.randomUUID(),
          completedAt: new Date().toISOString(),
        },
      })
    } else {
      console.warn(`⚠️ 時間割生成部分失敗: ${result.message}`)

      return c.json(
        {
          success: false,
          error: 'GENERATION_PARTIAL_FAILURE',
          message: result.message || '時間割生成中に制約を満たせませんでした',
          data: {
            result,
            suggestions: [
              '制約条件を緩和してください',
              '教師や教室のリソースを増やしてください',
              '必要な教科の時数を調整してください',
            ],
          },
        },
        409
      )
    }
  } catch (error) {
    console.error('❌ 時間割生成エラー:', error)

    if (error instanceof z.ZodError) {
      return c.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'リクエストデータが無効です',
          details: error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
          })),
        },
        400
      )
    }

    return c.json(
      {
        success: false,
        error: 'GENERATION_ERROR',
        message: '時間割生成中にエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      500
    )
  }
})

// 時間割生成状況確認ハンドラー（スタブ）
timetablesApp.openapi(getTimetableGenerationStatusRoute, async c => {
  try {
    const { jobId } = c.req.param()

    // TODO: 実際の生成状況確認ロジック実装
    return c.json({
      success: true,
      data: {
        id: jobId,
        status: 'completed' as const,
        progress: 100,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        result: null,
        errors: [],
        metadata: {
          totalSlots: 30,
          filledSlots: 30,
          conflicts: 0,
          optimizationScore: 0.95,
        },
      },
    })
  } catch (error) {
    console.error('時間割生成状況確認エラー:', error)
    return c.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '生成状況の確認中にエラーが発生しました',
      },
      500
    )
  }
})

// 時間割更新ハンドラー（スタブ）
timetablesApp.openapi(updateTimetableRoute, async c => {
  try {
    const { id: _id } = c.req.param()
    const _body = await c.req.json()

    // TODO: 実際の更新ロジック実装
    return c.json(
      {
        success: false,
        error: 'TIMETABLE_NOT_FOUND',
        message: '指定された時間割が見つかりません',
      },
      404
    )
  } catch (error) {
    console.error('時間割更新エラー:', error)

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
        message: '時間割の更新中にエラーが発生しました',
      },
      500
    )
  }
})

// 時間割削除ハンドラー（スタブ）
timetablesApp.openapi(deleteTimetableRoute, async c => {
  try {
    const { id: _id } = c.req.param()

    // TODO: 実際の削除ロジック実装
    return c.json(
      {
        success: false,
        error: 'TIMETABLE_NOT_FOUND',
        message: '指定された時間割が見つかりません',
      },
      404
    )
  } catch (error) {
    console.error('時間割削除エラー:', error)
    return c.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '時間割の削除中にエラーが発生しました',
      },
      500
    )
  }
})

export default timetablesApp
