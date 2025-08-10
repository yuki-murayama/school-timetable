import type { TimetableValidationResult } from './timetableGenerator'

export interface TimetableDataRequest {
  name: string
  timetable: unknown
}

export class TimetablePersistenceService {
  constructor(private db: D1Database) {}

  async saveTimetable(
    data: TimetableDataRequest
  ): Promise<{ timetableId: string; assignmentRate: number }> {
    const currentTime = new Date().toISOString()
    const timetableId = `timetable-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    // 時間割データをJSONとして保存
    const timetableData = JSON.stringify(data.timetable)
    const metadata = JSON.stringify({ method: 'manual' })

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
        JSON.stringify({}),
        metadata,
        'manual',
        0, // 手動保存時は割当率不明
        0,
        0,
        currentTime,
        currentTime
      )
      .run()

    console.log(`✅ 時間割保存完了: ${timetableId}`)

    return {
      timetableId,
      assignmentRate: 0,
    }
  }

  async getSavedTimetables(): Promise<unknown[]> {
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
        LIMIT 20
      `)
      .all()

    return (result.results || []).map((row: Record<string, unknown>) => ({
      id: row.id,
      assignmentRate: row.assignment_rate,
      totalSlots: row.total_slots,
      assignedSlots: row.assigned_slots,
      generationMethod: row.generation_method,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
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
