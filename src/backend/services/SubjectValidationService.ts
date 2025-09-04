/**
 * 教科データの型検証とクリーンアップサービス - Zodスキーマ統合
 * D1データベースの緩い型チェックを補完
 */

import { SubjectSchema } from '@shared/schemas'
import { z } from 'zod'

// クリーンアップ済み教科データスキーマ
const CleanSubjectDataSchema = SubjectSchema.extend({
  weeklyHours: z
    .number()
    .int('整数が必要です')
    .min(0, '0以上が必要です')
    .max(10, '10以下が必要です'),
  targetGrades: z.array(z.number().int().min(1).max(6)).min(0, '配列が必要です'),
  requiresSpecialClassroom: z.boolean().optional(),
  classroomType: z.string().optional(),
  order: z.number().int().min(0).optional(),
})

export type CleanSubjectData = z.infer<typeof CleanSubjectDataSchema>

// 教科検証ユーティリティ関数
export const SubjectValidationUtils = {
  /**
   * 週時間数の検証
   */
  validateWeeklyHours(value: unknown): number {
    const weeklyHoursSchema = z
      .number()
      .int('整数が必要です')
      .min(0, '0以上が必要です')
      .max(10, '10以下が必要です')

    try {
      // 文字列の場合は数値に変換を試行
      if (typeof value === 'string') {
        const parsed = parseInt(value, 10)
        if (!Number.isNaN(parsed)) {
          return weeklyHoursSchema.parse(parsed)
        }
      }

      return weeklyHoursSchema.parse(value)
    } catch (error) {
      console.error('❌ weekly_hours バリデーションエラー:', value)
      if (error instanceof z.ZodError) {
        throw new Error(`週時間数が不正です: ${error.errors.map(e => e.message).join(', ')}`)
      }
      throw error
    }
  },

  /**
   * 対象学年の検証
   */
  validateTargetGrades(value: unknown): number[] {
    const targetGradesSchema = z.array(z.number().int().min(1).max(6))

    try {
      // JSON文字列の場合はパースを試行
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value)
          return targetGradesSchema.parse(parsed)
        } catch (_parseError) {
          console.error('❌ targetGrades JSON解析エラー:', value)
        }
      }

      return targetGradesSchema.parse(value)
    } catch (error) {
      console.error('❌ targetGrades バリデーションエラー:', value)
      if (error instanceof z.ZodError) {
        throw new Error(`対象学年が不正です: ${error.errors.map(e => e.message).join(', ')}`)
      }
      throw error
    }
  },

  /**
   * 教科名の検証
   */
  validateName(name: unknown): string {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('教科名は空でない文字列である必要があります')
    }
    if (name.length > 50) {
      throw new Error('教科名は50文字以内である必要があります')
    }
    return name.trim()
  },

  /**
   * 完全な教科データの検証とクリーンアップ
   */
  validateAndCleanSubject(rawData: unknown): CleanSubjectData {
    try {
      const data = rawData as Record<string, unknown>
      const cleaned: CleanSubjectData = {
        id: data.id || '',
        name: SubjectValidationUtils.validateName(data.name),
        weeklyHours: SubjectValidationUtils.validateWeeklyHours(
          data.weekly_hours || data.weeklyHours || 1
        ),
        targetGrades: SubjectValidationUtils.validateTargetGrades(
          data.targetGrades || data.target_grades || [1, 2, 3]
        ),
      }

      // オプション項目
      if (data.requiresSpecialClassroom !== undefined) {
        cleaned.requiresSpecialClassroom = Boolean(data.requiresSpecialClassroom)
      }
      if (data.classroomType && typeof data.classroomType === 'string') {
        cleaned.classroomType = data.classroomType
      }
      if (data.order !== undefined && typeof data.order === 'number') {
        cleaned.order = data.order
      }

      console.log(`✅ 教科データ検証成功: ${cleaned.name} (週${cleaned.weeklyHours}時間)`)
      return cleaned
    } catch (error) {
      console.error('❌ 教科データ検証失敗:', rawData)
      if (error instanceof Error) {
        throw new Error(`教科データの検証に失敗しました: ${error.message}`)
      }
      throw new Error('不明な検証エラーが発生しました')
    }
  },

  /**
   * データベースに保存前の最終検証
   */
  validateForDatabase(data: CleanSubjectData): {
    id: string
    name: string
    weeklyHours: number // INTEGER型で保存
    targetGrades: string // JSON文字列で保存
    requiresSpecialClassroom?: number // INTEGER (0/1)
    classroomType?: string
    order?: number
  } {
    return {
      id: data.id,
      name: data.name,
      weeklyHours: data.weeklyHours, // INTEGER型として保存
      targetGrades: JSON.stringify(data.targetGrades), // JSON文字列として保存
      requiresSpecialClassroom: data.requiresSpecialClassroom ? 1 : 0,
      classroomType: data.classroomType || 'normal',
      order: data.order || 0,
    }
  },
}
