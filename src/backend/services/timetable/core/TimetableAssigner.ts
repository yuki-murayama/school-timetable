/**
 * 時間割割当・削除ロジッククラス
 */

import type { Classroom, Subject, Teacher, TimetableSlot } from '@shared/schemas'
import type { ConstraintChecker } from '../constraints'
import type { AssignmentCandidate, ConstraintResult, EnhancedConstraintResult } from '../types'

export class TimetableAssigner {
  constructor(
    private classrooms: Classroom[],
    private constraints: ConstraintChecker[],
    private logFn: (...args: unknown[]) => void = console.log
  ) {}

  /**
   * スロットに割り当て
   */
  assignToSlot(slot: TimetableSlot, candidate: AssignmentCandidate): boolean {
    const classroom = this.findSuitableClassroom(candidate.subject, slot)

    if (!classroom && candidate.subject.requiresSpecialClassroom) {
      return false
    }

    slot.subject = candidate.subject
    slot.teacher = candidate.teacher
    slot.classroom = classroom

    return true
  }

  /**
   * 寛容モードでスロットに割り当て（制約違反情報も記録）
   */
  assignToSlotTolerant(
    slot: TimetableSlot,
    candidate: AssignmentCandidate,
    constraintResult: EnhancedConstraintResult
  ): boolean {
    const classroom = this.findSuitableClassroom(candidate.subject, slot)

    // 特別教室が必要だが見つからない場合でも寛容モードでは割り当てを行う
    if (!classroom && candidate.subject.requiresSpecialClassroom) {
      // 制約違反として記録
      constraintResult.violations.push({
        type: 'classroom_conflict',
        severity: 'medium',
        message: `特別教室「${candidate.subject.classroomType}」が利用できません`,
        reason: '特別教室不足',
      })
    }

    // 基本的な割り当てを実行
    slot.subject = candidate.subject
    slot.teacher = candidate.teacher
    slot.classroom = classroom

    // 制約違反情報をスロットに記録
    if (constraintResult.violations.length > 0) {
      slot.hasViolation = true
      slot.violations = constraintResult.violations

      // 最も重要度の高い違反レベルを設定
      const severities = constraintResult.violations.map(v => v.severity)
      if (severities.includes('high')) {
        slot.violationSeverity = 'high'
      } else if (severities.includes('medium')) {
        slot.violationSeverity = 'medium'
      } else {
        slot.violationSeverity = 'low'
      }
    } else {
      slot.hasViolation = false
      slot.violations = []
      slot.violationSeverity = undefined
    }

    return true
  }

  /**
   * スロットから割り当てを削除
   */
  unassignFromSlot(slot: TimetableSlot): void {
    slot.subject = undefined
    slot.teacher = undefined
    slot.classroom = undefined
  }

  /**
   * 通常の割り当て（制約チェック付き）
   */
  assignToSlotNormal(slot: TimetableSlot, teacher: Teacher, subject: Subject): void {
    const classroom = this.findSuitableClassroom(subject, slot)
    slot.teacher = teacher
    slot.subject = subject
    slot.classroom = classroom
  }

  /**
   * 制約違反を許可した割り当て
   */
  assignToSlotWithViolation(slot: TimetableSlot, teacher: Teacher, subject: Subject): void {
    const classroom = this.findSuitableClassroom(subject, slot)
    slot.teacher = teacher
    slot.subject = subject
    slot.classroom = classroom
    slot.hasViolation = true
  }

  /**
   * 候補に対応する全スロットを検索
   */
  findAllSlotsForCandidate(
    candidate: AssignmentCandidate,
    timetable: TimetableSlot[][][],
    days: string[]
  ): TimetableSlot[] {
    const slots: TimetableSlot[] = []

    for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
      for (let periodIndex = 0; periodIndex < timetable[dayIndex].length; periodIndex++) {
        const slotsInPeriod = timetable[dayIndex][periodIndex] || []
        for (const slot of slotsInPeriod) {
          if (
            slot.classGrade === candidate.classGrade &&
            slot.classSection === candidate.classSection
          ) {
            slots.push(slot)
          }
        }
      }
    }

    return slots
  }

  /**
   * 利用可能なスロット検索（制約チェック付き）
   */
  findAvailableSlots(
    candidate: AssignmentCandidate,
    timetable: TimetableSlot[][][],
    days: string[]
  ): TimetableSlot[] {
    const allSlots = this.findAllSlotsForCandidate(candidate, timetable, days)
    return allSlots.filter(slot => {
      // 既に割り当て済みのスロットは除外
      if (slot.teacher) return false

      // 制約チェック
      const constraintResult = this.checkConstraints(slot, candidate, timetable)
      return constraintResult.isValid
    })
  }

  /**
   * スロット割り当て試行
   */
  tryAssignToSlot(
    slot: TimetableSlot,
    candidate: AssignmentCandidate,
    timetable: TimetableSlot[][][]
  ): { success: boolean; violations: unknown[] } {
    // 制約チェック
    for (const constraint of this.constraints) {
      const result = constraint.check(slot, candidate, timetable)
      if (!result.isValid) {
        return {
          success: false,
          violations: [{ type: 'constraint', message: result.reason }],
        }
      }
    }

    // 割り当て実行
    const success = this.assignToSlot(slot, candidate)
    return { success, violations: [] }
  }

  /**
   * 適切な教室を検索
   */
  private findSuitableClassroom(subject: Subject, slot: TimetableSlot): Classroom | undefined {
    if (!subject.requiresSpecialClassroom) {
      return undefined // 普通教室使用（特に指定なし）
    }

    return this.classrooms.find(
      classroom =>
        classroom.type === subject.classroomType &&
        !this.isClassroomBusyAt(classroom, slot.day, slot.period)
    )
  }

  /**
   * 教室が指定時間に使用中かチェック
   */
  private isClassroomBusyAt(_classroom: Classroom, _day: string, _period: number): boolean {
    // 実装簡略化：基本的には空いているとする
    // 実際には他のクラスとの教室利用状況をチェックする必要がある
    return false
  }

  /**
   * 制約チェック実行
   */
  private checkConstraints(
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
}
