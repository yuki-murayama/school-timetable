/**
 * 割当制限チェック
 */

import type { TimetableSlot } from '../../../../shared/types'
import type { AssignmentCandidate, ConstraintResult } from '../types'
import { ConstraintChecker } from './ConstraintChecker'

export class AssignmentRestrictionChecker extends ConstraintChecker {
  check(
    slot: TimetableSlot,
    candidate: AssignmentCandidate,
    _timetable: TimetableSlot[][][]
  ): ConstraintResult {
    const restrictions = candidate.teacher.assignmentRestrictions
    if (!restrictions || restrictions.length === 0) {
      return { isValid: true }
    }

    for (const restriction of restrictions) {
      if (restriction.restrictedDay === slot.day) {
        // この曜日に制限がある
        if (restriction.restrictedPeriods.includes(slot.period)) {
          if (restriction.restrictionLevel === '必須') {
            // 必須制限：この時間帯は割当必須
            return { isValid: true } // 必須なので割当OK
          } else {
            // 推奨制限：この時間帯は推奨
            return { isValid: true } // 推奨なので割当OK
          }
        } else {
          if (restriction.restrictionLevel === '必須') {
            // 必須制限があるが、指定時間帯でない場合は割当不可
            return {
              isValid: false,
              reason: `教師 ${candidate.teacher.name} は ${slot.day}の${restriction.restrictedPeriods.join(',')}限のみ割当必須`,
            }
          }
        }
      }
    }

    return { isValid: true }
  }
}
