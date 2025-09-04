import { ValidationError } from '@shared/schemas'
import { z } from 'zod'
import type { TimetableData, TimetableStructure, ValidationResult } from '../types'

// 時間割構造バリデーション用スキーマ
const TimetablePeriodSchema = z.object({
  period: z.union([z.string(), z.number()]).transform(val => String(val)),
  subject: z.string().optional(),
  teacher: z.string().optional(),
  classroom: z.string().optional(),
})

const TimetableDaySchema = z.array(TimetablePeriodSchema)

const TimetableStructureSchema = z
  .object({
    monday: TimetableDaySchema.optional(),
    tuesday: TimetableDaySchema.optional(),
    wednesday: TimetableDaySchema.optional(),
    thursday: TimetableDaySchema.optional(),
    friday: TimetableDaySchema.optional(),
    saturday: TimetableDaySchema.optional(),
  })
  .passthrough()

// バリデーション結果スキーマ
const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
})

type ValidatedTimetableStructure = z.infer<typeof TimetableStructureSchema>

/**
 * 型安全な時間割バリデーション
 */
export function validateTimetable(
  timetable: TimetableStructure,
  data: TimetableData,
  isPartialGeneration = false
): ValidationResult {
  try {
    const errors: string[] = []
    const warnings: string[] = []

    if (!timetable) {
      errors.push('時間割データが存在しません')
      return ValidationResultSchema.parse({ isValid: false, errors, warnings })
    }

    // 型安全な構造チェック
    let validatedTimetable: ValidatedTimetableStructure
    try {
      validatedTimetable = TimetableStructureSchema.parse(timetable)
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push('時間割データの形式が正しくありません')
        error.errors.forEach(err => {
          errors.push(`構造エラー: ${err.path.join('.')} - ${err.message}`)
        })
      } else {
        errors.push('時間割データの形式が正しくありません')
      }
      return ValidationResultSchema.parse({ isValid: false, errors, warnings })
    }

    // 型安全な各曜日のチェック
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
    for (const day of days) {
      const daySchedule = validatedTimetable[day]
      if (daySchedule && Array.isArray(daySchedule)) {
        // 型安全な時限の重複チェック
        const periods = new Set<string>()
        for (const period of daySchedule) {
          const validatedPeriod = TimetablePeriodSchema.parse(period)
          if (periods.has(validatedPeriod.period)) {
            errors.push(`${day}: 時限${validatedPeriod.period}が重複しています`)
          }
          periods.add(validatedPeriod.period)

          // 型安全な教師の重複チェック（部分生成でない場合）
          if (!isPartialGeneration && validatedPeriod.teacher) {
            // 他の時限で同じ教師が使われていないかチェック
            const sameTimeSlots = daySchedule.filter(p => {
              const validatedP = TimetablePeriodSchema.parse(p)
              return (
                validatedP.period === validatedPeriod.period &&
                validatedP.teacher === validatedPeriod.teacher
              )
            })
            if (sameTimeSlots.length > 1) {
              errors.push(
                `${day} 時限${validatedPeriod.period}: 教師 ${validatedPeriod.teacher} が重複しています`
              )
            }
          }

          // 型安全な教室の重複チェック
          if (validatedPeriod.classroom) {
            const sameClassroom = daySchedule.filter(p => {
              const validatedP = TimetablePeriodSchema.parse(p)
              return (
                validatedP.period === validatedPeriod.period &&
                validatedP.classroom === validatedPeriod.classroom
              )
            })
            if (sameClassroom.length > 1) {
              errors.push(
                `${day} 時限${validatedPeriod.period}: 教室 ${validatedPeriod.classroom} が重複しています`
              )
            }
          }
        }
      }
    }

    // 型安全な登録されている教師・科目・教室のチェック
    const teacherNames = data.teachers.map(t => t.name)
    const subjectNames = data.subjects.map(s => s.name)
    const classroomNames = data.classrooms.map(c => c.name)

    for (const day of days) {
      const daySchedule = validatedTimetable[day]
      if (daySchedule && Array.isArray(daySchedule)) {
        for (const period of daySchedule) {
          const validatedPeriod = TimetablePeriodSchema.parse(period)

          if (validatedPeriod.teacher && !teacherNames.includes(validatedPeriod.teacher)) {
            errors.push(
              `${day} 時限${validatedPeriod.period}: 未登録の教師 ${validatedPeriod.teacher} が使用されています`
            )
          }

          if (validatedPeriod.subject && !subjectNames.includes(validatedPeriod.subject)) {
            errors.push(
              `${day} 時限${validatedPeriod.period}: 未登録の科目 ${validatedPeriod.subject} が使用されています`
            )
          }

          if (validatedPeriod.classroom && !classroomNames.includes(validatedPeriod.classroom)) {
            errors.push(
              `${day} 時限${validatedPeriod.period}: 未登録の教室 ${validatedPeriod.classroom} が使用されています`
            )
          }
        }
      }
    }

    return ValidationResultSchema.parse({
      isValid: errors.length === 0,
      errors,
      warnings,
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }
    if (error instanceof z.ZodError) {
      throw new ValidationError('時間割のバリデーションに失敗しました', error.errors)
    }
    throw error
  }
}

/**
 * 型安全な緩和制約での時間割バリデーション
 */
export function validateTimetableWithRelaxedConstraints(
  timetable: TimetableStructure,
  data: TimetableData,
  isPartialGeneration = false,
  retryCount = 0
): ValidationResult {
  try {
    // リトライ回数に応じて制約を緩和
    const relaxationLevel = Math.min(retryCount, 3)

    if (relaxationLevel >= 2) {
      // 高レベル緩和: 基本的な構造チェックのみ
      return validateBasicStructure(timetable)
    } else if (relaxationLevel >= 1) {
      // 中レベル緩和: 重複チェックを緩和
      return validateWithMediumRelaxation(timetable, data, isPartialGeneration)
    } else {
      // 通常のバリデーション
      return validateTimetable(timetable, data, isPartialGeneration)
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }
    if (error instanceof z.ZodError) {
      throw new ValidationError('緩和制約での時間割バリデーションに失敗しました', error.errors)
    }
    throw error
  }
}

/**
 * 型安全な基本構造バリデーション
 */
function validateBasicStructure(timetable: TimetableStructure): ValidationResult {
  try {
    const errors: string[] = []

    if (!timetable) {
      errors.push('時間割データが存在しません')
      return ValidationResultSchema.parse({ isValid: false, errors })
    }

    // 型安全な構造チェック
    try {
      TimetableStructureSchema.parse(timetable)
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push('時間割データの形式が正しくありません')
        error.errors.forEach(err => {
          errors.push(`構造エラー: ${err.path.join('.')} - ${err.message}`)
        })
      } else {
        errors.push('時間割データの形式が正しくありません')
      }
    }

    return ValidationResultSchema.parse({ isValid: errors.length === 0, errors })
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('基本構造のバリデーションに失敗しました', error.errors)
    }
    throw error
  }
}

/**
 * 型安全な中レベル緩和バリデーション
 */
function validateWithMediumRelaxation(
  timetable: TimetableStructure,
  data: TimetableData,
  _isPartialGeneration: boolean
): ValidationResult {
  try {
    const errors: string[] = []

    if (!timetable) {
      errors.push('時間割データが存在しません')
      return ValidationResultSchema.parse({ isValid: false, errors })
    }

    // 型安全な構造チェック
    let validatedTimetable: ValidatedTimetableStructure
    try {
      validatedTimetable = TimetableStructureSchema.parse(timetable)
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push('時間割データの形式が正しくありません')
        error.errors.forEach(err => {
          errors.push(`構造エラー: ${err.path.join('.')} - ${err.message}`)
        })
      } else {
        errors.push('時間割データの形式が正しくありません')
      }
      return ValidationResultSchema.parse({ isValid: false, errors })
    }

    // 登録チェックのみ実行（重複チェックは緩和）
    const teacherNames = data.teachers.map(t => t.name)
    const subjectNames = data.subjects.map(s => s.name)
    const classroomNames = data.classrooms.map(c => c.name)

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
    for (const day of days) {
      const daySchedule = validatedTimetable[day]
      if (daySchedule && Array.isArray(daySchedule)) {
        for (const period of daySchedule) {
          const validatedPeriod = TimetablePeriodSchema.parse(period)

          if (validatedPeriod.teacher && !teacherNames.includes(validatedPeriod.teacher)) {
            errors.push(
              `${day} 時限${validatedPeriod.period}: 未登録の教師 ${validatedPeriod.teacher}`
            )
          }

          if (validatedPeriod.subject && !subjectNames.includes(validatedPeriod.subject)) {
            errors.push(
              `${day} 時限${validatedPeriod.period}: 未登録の科目 ${validatedPeriod.subject}`
            )
          }

          if (validatedPeriod.classroom && !classroomNames.includes(validatedPeriod.classroom)) {
            errors.push(
              `${day} 時限${validatedPeriod.period}: 未登録の教室 ${validatedPeriod.classroom}`
            )
          }
        }
      }
    }

    return ValidationResultSchema.parse({ isValid: errors.length === 0, errors })
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }
    if (error instanceof z.ZodError) {
      throw new ValidationError('中レベル緩和バリデーションに失敗しました', error.errors)
    }
    throw error
  }
}

/**
 * 型安全な部分時間割バリデーション
 */
export function validatePartialTimetable(
  timetable: TimetableStructure,
  data: TimetableData
): ValidationResult {
  try {
    return validateTimetable(timetable, data, true)
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }
    if (error instanceof z.ZodError) {
      throw new ValidationError('部分時間割のバリデーションに失敗しました', error.errors)
    }
    throw error
  }
}
