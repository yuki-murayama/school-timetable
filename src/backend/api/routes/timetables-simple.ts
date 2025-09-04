/**
 * 時間割管理API - シンプル実装（safeParseAsync問題回避）
 */
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { type Env } from '@shared/schemas'

// 時間割管理用アプリ
const timetablesApp = new Hono<{ Bindings: Env }>()

// クエリスキーマ
const TimetableQuerySchema = z.object({
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('20').transform(Number),
  grade: z.string().optional().transform(val => val ? Number(val) : undefined),
  classSection: z.string().optional(),
})

// 時間割一覧取得
timetablesApp.get(
  '/timetables',
  zValidator('query', TimetableQuerySchema),
  async (c) => {
    try {
      const query = c.req.valid('query')
      console.log('📋 時間割一覧取得:', query)

      // 型安全時間割生成サービス初期化
      const { TypeSafeTimetableGenerationService } = await import(
        '../../services/timetable-generation-service'
      )
      const generationService = new TypeSafeTimetableGenerationService(c.env.DB)

      // 保存済み時間割取得
      const result = await generationService.getSavedTimetables({
        grade: query.grade,
        classSection: query.classSection,
        limit: query.limit,
      })

      console.log(`📊 取得結果: ${result.timetables.length}件の時間割を取得`)

      return c.json({
        success: true,
        data: {
          timetables: result.timetables.map(timetable => ({
            id: timetable.id,
            grade: timetable.grade,
            classSection: timetable.classSection,
            statistics: timetable.statistics,
            generatedAt: timetable.generatedAt,
          })),
          pagination: {
            page: query.page,
            limit: query.limit,
            total: result.timetables.length,
            totalPages: Math.ceil(result.timetables.length / query.limit),
          },
        },
        message: `${result.timetables.length}件の時間割を取得しました`,
      })
    } catch (error) {
      console.error('❌ 時間割一覧取得エラー:', error)
      return c.json(
        {
          success: false,
          error: 'INTERNAL_SERVER_ERROR',
          message: '時間割一覧の取得に失敗しました',
          details: {
            originalError: error instanceof Error ? error.message : String(error),
          },
        },
        500
      )
    }
  }
)

export { timetablesApp }