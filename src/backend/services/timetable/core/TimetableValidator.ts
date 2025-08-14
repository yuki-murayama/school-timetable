/**
 * 時間割バリデーションクラス
 */

import type { Subject, Teacher, TimetableSlot } from '../../../../shared/types'
import type { ConstraintChecker } from '../constraints'
import type {
  AssignmentCandidate,
  ConstraintResult,
  ConstraintViolation,
  EnhancedConstraintResult,
} from '../types'

export class TimetableValidator {
  constructor(
    private constraints: ConstraintChecker[],
    private logFn: (...args: unknown[]) => void = console.log
  ) {}

  /**
   * 制約チェック実行
   */
  checkConstraints(
    slot: TimetableSlot,
    candidate: AssignmentCandidate,
    timetable: TimetableSlot[][][]
  ): ConstraintResult {
    for (const constraint of this.constraints) {
      const result = constraint.check(slot, candidate, timetable)
      if (!result.isValid) {
        return result
      }
    }
    return { isValid: true }
  }

  /**
   * 寛容モードでの制約チェック（制約違反詳細を記録）
   */
  checkConstraintsTolerant(
    slot: TimetableSlot,
    candidate: AssignmentCandidate,
    timetable: TimetableSlot[][][]
  ): EnhancedConstraintResult {
    const violations: EnhancedConstraintResult['violations'] = []

    for (const constraint of this.constraints) {
      const result = constraint.check(slot, candidate, timetable)
      if (!result.isValid) {
        violations.push({
          type: constraint.constructor.name,
          severity: 'medium',
          message: result.reason || '制約違反',
          reason: result.reason,
        })
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
    }
  }

  /**
   * 教師が教科を担当できるかチェック
   */
  canTeacherTeachSubject(teacher: Teacher, subject: Subject): boolean {
    return teacher.subjects?.includes(subject.id) || false
  }

  /**
   * 教科が学年に対応しているかチェック
   */
  canSubjectBeTeachedToGrade(subject: Subject, grade: number): boolean {
    return subject.grades.includes(grade)
  }

  /**
   * 教師の時間制限チェック
   */
  isTeacherRestricted(teacher: Teacher, day: string, period: number): boolean {
    if (!teacher.assignmentRestrictions) return false

    for (const restriction of teacher.assignmentRestrictions) {
      if (restriction.restrictedDay === day) {
        if (restriction.restrictionLevel === '必須') {
          // 必須制限：指定時間帯以外は不可
          return !restriction.restrictedPeriods.includes(period)
        }
      }
    }

    return false
  }

  /**
   * 教師が指定時間に他の授業を担当しているかチェック
   */
  isTeacherBusyAtTime(
    teacher: Teacher,
    dayIndex: number,
    periodIndex: number,
    timetable: TimetableSlot[][][]
  ): boolean {
    const periodSlots = timetable[dayIndex]?.[periodIndex] || []
    return periodSlots.some(slot => slot.teacher?.id === teacher.id)
  }

  /**
   * 制約違反の検出
   */
  findConstraintViolations(timetable: TimetableSlot[][][]): ConstraintViolation[] {
    const violations: ConstraintViolation[] = []

    // 教師の時間重複チェック
    for (let day = 0; day < timetable.length; day++) {
      for (let period = 0; period < timetable[day].length; period++) {
        const periodSlots = timetable[day][period]
        const teacherCount = new Map<string, TimetableSlot[]>()

        for (const slot of periodSlots) {
          if (slot.teacher) {
            if (!teacherCount.has(slot.teacher.id)) {
              teacherCount.set(slot.teacher.id, [])
            }
            teacherCount.get(slot.teacher.id)?.push(slot)
          }
        }

        // 同じ時間に複数クラスを担当している教師を検出
        for (const [_teacherId, slots] of teacherCount) {
          if (slots.length > 1) {
            violations.push({
              type: 'teacher_conflict',
              severity: 'critical',
              description: `教師「${slots[0].teacher?.name}」が同じ時間帯に${slots.length}つのクラスを担当`,
              affectedSlots: slots.map(slot => ({
                day: slot.day,
                period: slot.period,
                classGrade: slot.classGrade,
                classSection: slot.classSection,
              })),
              suggestedFix: 'いずれかのクラスの授業を別の時間帯に移動してください',
            })
          }
        }
      }
    }

    return violations
  }

  /**
   * 教科・学年の必要時数を取得
   */
  getRequiredHoursForSubject(subject: Subject, grade: number): number {
    try {
      if (!subject || subject.weeklyHours === null || subject.weeklyHours === undefined) {
        return 0
      }

      // 学年別時数設定がある場合
      if (typeof subject.weeklyHours === 'object' && subject.weeklyHours && subject.weeklyHours[grade]) {
        return subject.weeklyHours[grade]
      }

      // デフォルト時数
      if (typeof subject.weeklyHours === 'object' && subject.weeklyHours && subject.weeklyHours[0]) {
        return subject.weeklyHours[0]
      }

      // 互換性のため数値形式も対応
      if (typeof subject.weeklyHours === 'number') {
        return subject.weeklyHours
      }

      return 0
    } catch (error) {
      console.log(`❌ TimetableValidator getRequiredHoursForSubject エラー (${subject?.name || 'unknown'}):`, error)
      return 0
    }
  }
}
