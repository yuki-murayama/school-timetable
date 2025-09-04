/**
 * 制約チェッククラス基底クラス
 */

import type { TimetableSlot } from '@shared/schemas'
import type { AssignmentCandidate, ConstraintResult } from '../types'

export abstract class ConstraintChecker {
  abstract check(
    slot: TimetableSlot,
    candidate: AssignmentCandidate,
    timetable: TimetableSlot[][][]
  ): ConstraintResult
}
