import { z } from 'zod'
import type { TimetableValidationResult } from './timetableGenerator'

// 時間割データ統計スキーマ
const TimetableStatisticsSchema = z.object({
  assignmentRate: z.number().min(0).max(100).optional(),
  bestAssignmentRate: z.number().min(0).max(100).optional(),
  totalAssignments: z.number().int().min(0).optional(),
  totalSlots: z.number().int().min(0).optional(),
  assignedSlots: z.number().int().min(0).optional(),
})

// 時間割データリクエストスキーマ
const TimetableDataRequestSchema = z.object({
  name: z.string().min(1, '時間割名は必須です').max(200, '時間割名は200文字以内です'),
  timetable: z.unknown(), // 暫定的にunknownとし、後で詳細スキーマに変更
  statistics: TimetableStatisticsSchema.optional(),
})

export type TimetableDataRequest = z.infer<typeof TimetableDataRequestSchema>

export class TimetablePersistenceService {
  constructor(private db: D1Database) {}

  async saveTimetable(
    data: TimetableDataRequest
  ): Promise<{ timetableId: string; assignmentRate: number }> {
    // リクエストデータを検証
    const validatedData = TimetableDataRequestSchema.parse(data)
    const currentTime = new Date().toISOString()
    const timetableId = `timetable-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    // 統計データから割当率を計算（複数のフォールバックを使用）
    const assignmentRate = validatedData.statistics
      ? data.statistics.assignmentRate ||
        data.statistics.bestAssignmentRate ||
        (data.statistics.totalAssignments && data.statistics.totalSlots
          ? (data.statistics.totalAssignments / data.statistics.totalSlots) * 100
          : 0) ||
        (data.statistics.assignedSlots && data.statistics.totalSlots
          ? (data.statistics.assignedSlots / data.statistics.totalSlots) * 100
          : 0)
      : 0

    const totalSlots = data.statistics?.totalSlots || 0
    const assignedSlots = data.statistics?.assignedSlots || data.statistics?.totalAssignments || 0

    // 時間割データをJSONとして保存
    const timetableData = JSON.stringify(data.timetable)
    const metadata = JSON.stringify({
      method: 'manual',
      name: data.name,
      hasStatistics: !!data.statistics,
    })

    await this.db
      .prepare(`
        INSERT INTO generated_timetables (
          id, 
          timetable_data, 
          statistics, 
          metadata,
          generation_method,
          assignment_rate,
          total_slots,
          assigned_slots,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        timetableId,
        timetableData,
        JSON.stringify(data.statistics || {}),
        metadata,
        'manual',
        assignmentRate,
        totalSlots,
        assignedSlots,
        currentTime,
        currentTime
      )
      .run()

    console.log(`✅ 時間割保存完了: ${timetableId} (割当率: ${assignmentRate}%)`)

    return {
      timetableId,
      assignmentRate,
    }
  }

  async getSavedTimetables(
    page: number = 1,
    limit: number = 20
  ): Promise<{
    timetables: unknown[]
    totalCount: number
    currentPage: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }> {
    const offset = (page - 1) * limit

    // 総件数を取得
    const countResult = await this.db
      .prepare('SELECT COUNT(*) as total FROM generated_timetables')
      .first()

    const totalCount = (countResult as { total: number } | undefined)?.total || 0
    const totalPages = Math.ceil(totalCount / limit)

    // ページネーション対応のデータ取得
    const result = await this.db
      .prepare(`
        SELECT 
          id,
          assignment_rate,
          total_slots,
          assigned_slots,
          generation_method,
          created_at,
          updated_at
        FROM generated_timetables 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `)
      .bind(limit, offset)
      .all()

    const timetables = (result.results || []).map((row: Record<string, unknown>) => ({
      id: row.id,
      assignmentRate: row.assignment_rate,
      totalSlots: row.total_slots,
      assignedSlots: row.assigned_slots,
      generationMethod: row.generation_method,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))

    return {
      timetables,
      totalCount,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    }
  }

  async getSavedTimetableById(id: string): Promise<unknown | null> {
    const result = await this.db
      .prepare('SELECT * FROM generated_timetables WHERE id = ?')
      .bind(id)
      .first()

    if (!result) {
      return null
    }

    return {
      id: result.id,
      timetable: JSON.parse(result.timetable_data),
      statistics: JSON.parse(result.statistics),
      metadata: JSON.parse(result.metadata || '{}'),
      generationMethod: result.generation_method,
      assignmentRate: result.assignment_rate,
      totalSlots: result.total_slots,
      assignedSlots: result.assigned_slots,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    }
  }

  async autoSaveTimetable(result: TimetableValidationResult, statistics: unknown): Promise<string> {
    try {
      const currentTime = new Date().toISOString()
      const timetableId = `timetable-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

      await this.db
        .prepare(`
          INSERT INTO generated_timetables (
            id, timetable_data, statistics, metadata, generation_method,
            assignment_rate, total_slots, assigned_slots, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          timetableId,
          JSON.stringify(result.timetable),
          JSON.stringify(statistics),
          JSON.stringify({ method: 'program-optimized', autoSaved: true }),
          'program-optimized',
          statistics.bestAssignmentRate || 0,
          statistics.totalSlots || 0,
          statistics.totalAssignments || 0,
          currentTime,
          currentTime
        )
        .run()

      console.log(`💾 時間割自動保存完了: ${timetableId}`)
      return timetableId
    } catch (saveError) {
      console.error('⚠️ 時間割自動保存エラー（処理は継続）:', saveError)
      return null
    }
  }
}
