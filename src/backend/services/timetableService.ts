/**
 * 型安全時間割サービス - Zodスキーマ統合
 */
import { z } from 'zod'
import { DatabaseService } from './database'

// 時間割構造スキーマ
const TimetableStructureSchema = z.object({
  grades: z.array(z.number()),
  classes: z.record(z.number()),
  periods: z.number(),
  days: z.array(z.string()),
})

// 時間割情報スキーマ
const TimetableInfoSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, '時間割名は必須です'),
  created_at: z.string(),
  updated_at: z.string().optional(),
})

// データ付き時間割スキーマ
const TimetableWithDataSchema = TimetableInfoSchema.extend({
  timetable: z.record(z.unknown()),
})

type TimetableStructure = z.infer<typeof TimetableStructureSchema>
export type TimetableInfo = z.infer<typeof TimetableInfoSchema>
export type TimetableWithData = z.infer<typeof TimetableWithDataSchema>

export class TimetableService {
  constructor(private db: D1Database) {}

  private get dbService(): DatabaseService {
    return new DatabaseService(this.db)
  }

  async getAllTimetables(): Promise<TimetableInfo[]> {
    const result = await this.db
      .prepare('SELECT id, name, created_at, updated_at FROM timetables ORDER BY created_at DESC')
      .all()

    return (result.results || []).map(
      (row: Record<string, unknown>): TimetableInfo => ({
        id: row.id,
        name: row.name,
        created_at: row.created_at,
        updated_at: row.updated_at,
      })
    )
  }

  async getTimetableById(id: string): Promise<TimetableWithData | null> {
    const timetable = await this.db
      .prepare('SELECT id, name, timetable, created_at, updated_at FROM timetables WHERE id = ?')
      .bind(id)
      .first()

    if (!timetable) {
      return null
    }

    let parsedTimetable: unknown
    try {
      parsedTimetable =
        typeof timetable.timetable === 'string'
          ? JSON.parse(timetable.timetable)
          : timetable.timetable
    } catch (error) {
      console.error('Failed to parse timetable JSON:', error)
      parsedTimetable = {}
    }

    return {
      id: timetable.id,
      name: timetable.name,
      timetable: parsedTimetable,
      created_at: timetable.created_at,
      updated_at: timetable.updated_at,
    }
  }

  async createTimetable(data: { name: string; timetable: unknown }): Promise<TimetableWithData> {
    const timetableId = `timetable-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

    await this.db
      .prepare(`
        INSERT INTO timetables (id, name, timetable, created_at, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `)
      .bind(timetableId, data.name, JSON.stringify(data.timetable))
      .run()

    const created = await this.db
      .prepare('SELECT * FROM timetables WHERE id = ?')
      .bind(timetableId)
      .first()

    return {
      id: created.id,
      name: created.name,
      timetable:
        typeof created.timetable === 'string' ? JSON.parse(created.timetable) : created.timetable,
      created_at: created.created_at,
      updated_at: created.updated_at,
    }
  }

  async updateTimetable(
    id: string,
    updates: {
      name?: string
      timetable?: unknown
    }
  ): Promise<TimetableWithData> {
    const existing = await this.db
      .prepare('SELECT id FROM timetables WHERE id = ?')
      .bind(id)
      .first()

    if (!existing) {
      throw new Error('Timetable not found')
    }

    const updateFields: string[] = []
    const updateValues: unknown[] = []

    if (updates.name !== undefined) {
      updateFields.push('name = ?')
      updateValues.push(updates.name)
    }

    if (updates.timetable !== undefined) {
      updateFields.push('timetable = ?')
      updateValues.push(JSON.stringify(updates.timetable))
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP')

    await this.db
      .prepare(`UPDATE timetables SET ${updateFields.join(', ')} WHERE id = ?`)
      .bind(...updateValues, id)
      .run()

    const updated = await this.db.prepare('SELECT * FROM timetables WHERE id = ?').bind(id).first()

    return {
      id: updated.id,
      name: updated.name,
      timetable:
        typeof updated.timetable === 'string' ? JSON.parse(updated.timetable) : updated.timetable,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    }
  }

  async deleteTimetable(id: string): Promise<void> {
    const existing = await this.db
      .prepare('SELECT id FROM timetables WHERE id = ?')
      .bind(id)
      .first()

    if (!existing) {
      throw new Error('Timetable not found')
    }

    await this.db.prepare('DELETE FROM timetables WHERE id = ?').bind(id).run()
  }

  async saveTimetable(timetable: TimetableStructure): Promise<{ id: string }> {
    return this.dbService.saveTimetable(timetable)
  }

  // デバッグ用
  async getDebugInfo(): Promise<{
    tableInfo: unknown
    allRecords: unknown[]
    targetRecord: unknown
  }> {
    const tableInfo = await this.db.prepare('PRAGMA table_info(timetables)').all()
    const allRecords = await this.db.prepare('SELECT * FROM timetables LIMIT 3').all()
    const targetRecord = await this.db
      .prepare('SELECT id, name, created_at FROM timetables ORDER BY created_at DESC LIMIT 1')
      .first()

    return {
      tableInfo: tableInfo.results || [],
      allRecords: allRecords.results || [],
      targetRecord,
    }
  }
}
