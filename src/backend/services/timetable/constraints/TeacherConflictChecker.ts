/**
 * 教師の時間重複チェック
 */

import type { TimetableSlot } from '../../../../shared/types'
import type { AssignmentCandidate, ConstraintResult } from '../types'
import { ConstraintChecker } from './ConstraintChecker'

export class TeacherConflictChecker extends ConstraintChecker {
  check(
    slot: TimetableSlot,
    candidate: AssignmentCandidate,
    timetable: TimetableSlot[][][]
  ): ConstraintResult {
    const days = ['月曜', '火曜', '水曜', '木曜', '金曜', '土曜'] // 安全なfallback
    const dayIndex = days.indexOf(slot.day)
    if (dayIndex === -1) return { isValid: false, reason: '無効な曜日' }

    const periodSlots = timetable[dayIndex]?.[slot.period - 1] || []
    const conflictingSlot = periodSlots.find(
      s => s.teacher?.id === candidate.teacher.id && s !== slot
    )

    if (conflictingSlot) {
      return {
        isValid: false,
        reason: `教師 ${candidate.teacher.name} が同時間帯に他のクラスを担当`,
        conflictingSlots: [conflictingSlot],
      }
    }

    return { isValid: true }
  }
}
