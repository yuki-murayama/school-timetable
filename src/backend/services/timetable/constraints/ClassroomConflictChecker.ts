/**
 * 教室の重複チェック
 */

import type { TimetableSlot } from '../../../../shared/types'
import type { AssignmentCandidate, ConstraintResult } from '../types'
import { ConstraintChecker } from './ConstraintChecker'

export class ClassroomConflictChecker extends ConstraintChecker {
  check(
    _slot: TimetableSlot,
    candidate: AssignmentCandidate,
    _timetable: TimetableSlot[][][]
  ): ConstraintResult {
    if (!candidate.subject.requiresSpecialClassroom) {
      return { isValid: true } // 特別教室不要の場合はOK
    }

    // この実装では簡略化（実際の教室割当は TimetableGenerator で行う）
    return { isValid: true }
  }
}
