/**
 * 時間割分析・統計クラス
 */

import type { Subject, Teacher, TimetableSlot } from '../../../../shared/types'
import type {
  AssignmentCandidate,
  ConstraintViolation,
  QualityMetrics,
  TeacherDifficulty,
  UnassignedRequirement,
} from '../types'

export class TimetableAnalyzer {
  constructor(private logFn: (...args: unknown[]) => void = console.log) {}

  /**
   * 統計情報計算
   */
  calculateStatistics(timetable: TimetableSlot[][][]) {
    const totalSlots = this.calculateTotalSlots(timetable)
    const assignedSlots = this.calculateAssignedSlots(timetable)
    const constraintViolations = this.calculateConstraintViolations(timetable)

    return {
      totalSlots,
      assignedSlots,
      unassignedSlots: totalSlots - assignedSlots,
      constraintViolations,
    }
  }

  /**
   * 制約違反数計算
   */
  calculateConstraintViolations(timetable: TimetableSlot[][][]): number {
    let violationCount = 0

    for (const gradeSlots of timetable) {
      if (!gradeSlots) continue
      for (const classSlots of gradeSlots) {
        if (!classSlots) continue
        for (const slot of classSlots) {
          if (slot && slot.hasViolation && slot.violations && slot.violations.length > 0) {
            violationCount += slot.violations.length
          }
        }
      }
    }

    return violationCount
  }

  /**
   * 総スロット数計算
   */
  calculateTotalSlots(timetable: TimetableSlot[][][]): number {
    let total = 0
    for (const gradeSlots of timetable) {
      if (!gradeSlots) continue
      for (const classSlots of gradeSlots) {
        if (!classSlots) continue
        total += classSlots.length
      }
    }
    return total
  }

  /**
   * 割当済みスロット数計算
   */
  calculateAssignedSlots(timetable: TimetableSlot[][][]): number {
    let assigned = 0
    for (const gradeSlots of timetable) {
      if (!gradeSlots) continue
      for (const classSlots of gradeSlots) {
        if (!classSlots) continue
        for (const slot of classSlots) {
          if (slot && slot.teacher && slot.subject) {
            assigned++
          }
        }
      }
    }
    return assigned
  }

  /**
   * 割当完了率計算
   */
  calculateAssignmentRate(timetable: TimetableSlot[][][]): number {
    const totalSlots = this.calculateTotalSlots(timetable)
    const assignedSlots = this.calculateAssignedSlots(timetable)

    if (totalSlots === 0) return 0
    return Math.round((assignedSlots / totalSlots) * 100 * 100) / 100 // 小数点2桁
  }

  /**
   * 品質スコア計算
   */
  calculateQualityScore(timetable: TimetableSlot[][][]): number {
    const stats = this.calculateStatistics(timetable)
    const assignmentRate = this.calculateAssignmentRate(timetable)

    // 基本スコア: 割当完了率
    let qualityScore = assignmentRate

    // 制約違反によるペナルティ
    const violationPenalty = Math.min(stats.constraintViolations * 5, 30)
    qualityScore = Math.max(0, qualityScore - violationPenalty)

    return Math.round(qualityScore * 100) / 100
  }

  /**
   * 教師困難度分析
   */
  calculateTeacherDifficulties(
    teachers: Teacher[],
    _subjects: Subject[],
    candidates: AssignmentCandidate[]
  ): TeacherDifficulty[] {
    return teachers.map(teacher => {
      const teacherCandidates = candidates.filter(c => c.teacher.id === teacher.id)
      const totalRequiredHours = teacherCandidates.reduce((sum, c) => sum + c.requiredHours, 0)
      const assignedHours = teacherCandidates.reduce((sum, c) => sum + c.assignedHours, 0)
      const availableHours = this.getTeacherAvailableHours(teacher)

      const difficultyPercentage =
        availableHours > 0 ? Math.round((totalRequiredHours / availableHours) * 100) : 0

      return {
        teacher,
        totalRequiredHours,
        availableHours,
        difficultyPercentage,
        constraintFactors: {
          subjectCount: teacher.subjects?.length || 0,
          gradeCount: new Set(teacherCandidates.map(c => c.classGrade)).size,
          classCount: teacherCandidates.length,
        },
        assignedHours,
      }
    })
  }

  /**
   * 未割り当て要件分析
   */
  analyzeUnassignedRequirements(candidates: AssignmentCandidate[]): UnassignedRequirement[] {
    return candidates
      .filter(candidate => candidate.assignedHours < candidate.requiredHours)
      .map(candidate => ({
        teacher: candidate.teacher,
        subject: candidate.subject,
        classGrade: candidate.classGrade,
        classSection: candidate.classSection,
        requiredHours: candidate.requiredHours,
        assignedHours: candidate.assignedHours,
        missingHours: candidate.requiredHours - candidate.assignedHours,
        blockingReasons: [], // 具体的な理由は別途分析
      }))
  }

  /**
   * 品質メトリクス計算
   */
  calculateQualityMetrics(
    timetable: TimetableSlot[][][],
    teachers: Teacher[],
    _candidates: AssignmentCandidate[]
  ): QualityMetrics {
    const stats = this.calculateStatistics(timetable)
    const assignmentRate = this.calculateAssignmentRate(timetable)

    // 教師稼働率計算
    const activeTeachers = new Set(
      timetable
        .flat(2)
        .filter(slot => slot.teacher)
        .map(slot => slot.teacher?.id)
        .filter((id): id is string => id !== undefined)
    ).size
    const teacherUtilizationRate =
      teachers.length > 0 ? Math.round((activeTeachers / teachers.length) * 100) : 0

    return {
      assignmentCompletionRate: assignmentRate,
      teacherUtilizationRate,
      subjectDistributionBalance: 0.8, // 簡易実装
      constraintViolationCount: stats.constraintViolations,
      loadBalanceScore: 0.7, // 簡易実装
    }
  }

  /**
   * 教師利用可能時数取得
   */
  private getTeacherAvailableHours(teacher: Teacher): number {
    return teacher.maxHoursPerWeek || 30 // デフォルト30時間
  }

  /**
   * 全体スコア計算
   */
  calculateOverallScore(qualityMetrics: QualityMetrics, violations: ConstraintViolation[]): number {
    const criticalViolations = violations.filter(v => v.severity === 'critical').length
    const majorViolations = violations.filter(v => v.severity === 'major').length

    let score = qualityMetrics.assignmentCompletionRate

    // 違反によるペナルティ
    score -= criticalViolations * 20 // 重要違反: -20点
    score -= majorViolations * 10 // 主要違反: -10点

    return Math.max(0, Math.min(100, Math.round(score)))
  }
}
