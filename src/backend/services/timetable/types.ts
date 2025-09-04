/**
 * 時間割生成システム用型定義
 */

import type { Subject, Teacher, TimetableSlot } from '@shared/schemas'

// 割当候補
export interface AssignmentCandidate {
  teacher: Teacher
  subject: Subject
  classGrade: number
  classSection: string
  requiredHours: number
  assignedHours: number
}

// 制約チェック結果
export interface ConstraintResult {
  isValid: boolean
  reason?: string
  conflictingSlots?: TimetableSlot[]
}

// 拡張制約チェック結果（制約違反情報収集用）
export interface EnhancedConstraintResult {
  isValid: boolean
  violations: Array<{
    type: string
    severity: 'high' | 'medium' | 'low'
    message: string
    reason?: string
  }>
}

// 割当優先度
export enum AssignmentPriority {
  MANDATORY_RESTRICTION = 1, // 必須割当制限
  RECOMMENDED_RESTRICTION = 2, // 推奨割当制限
  LOW_HOURS_SUBJECT = 3, // 授業時数少ない教科
}

// 教師困難度分析
export interface TeacherDifficulty {
  teacher: Teacher
  totalRequiredHours: number
  availableHours: number
  difficultyPercentage: number
  constraintFactors: {
    subjectCount: number
    gradeCount: number
    classCount: number
  }
  assignedHours: number
}

// 制約分析結果
export interface ConstraintAnalysis {
  constraintStats: {
    teacherConflicts: number
    classroomConflicts: number
    assignmentRestrictions: number
    totalChecks: number
  }
  candidateAnalysis: {
    candidate: AssignmentCandidate
    availableSlots: number
    blockedReasons: string[]
    maxPossibleAssignments: number
  }[]
  teacherDifficulties: TeacherDifficulty[]
  optimizationRecommendations: string[]
}

// 時間割検証結果
export interface TimetableValidationResult {
  isValid: boolean
  overallScore: number
  violations: ConstraintViolation[]
  qualityMetrics: QualityMetrics
  unassignedRequirements: UnassignedRequirement[]
  improvementSuggestions: string[]
}

// 制約違反
export interface ConstraintViolation {
  type: 'teacher_conflict' | 'classroom_conflict' | 'subject_mismatch' | 'time_restriction'
  severity: 'critical' | 'major' | 'minor'
  description: string
  affectedSlots: {
    day: string
    period: number
    classGrade: number
    classSection: string
  }[]
  suggestedFix?: string
}

// 品質指標
export interface QualityMetrics {
  assignmentCompletionRate: number // 割り当て完了率 (%)
  teacherUtilizationRate: number // 教師稼働率 (%)
  subjectDistributionBalance: number // 教科配置バランス (0-1)
  constraintViolationCount: number // 制約違反数
  loadBalanceScore: number // 負荷分散スコア (0-1)
}

// 未割り当て要件
export interface UnassignedRequirement {
  teacher: Teacher
  subject: Subject
  classGrade: number
  classSection: string
  requiredHours: number
  assignedHours: number
  missingHours: number
  blockingReasons: string[]
}

// 生成試行結果（内部用）
export interface GenerationAttempt {
  timetable: TimetableSlot[][][]
  statistics: {
    assignmentRate: number
    violationCount: number
    totalSlots: number
    assignedSlots: number
    unassignedSlots: number
    backtrackCount: number
    constraintViolations?: number
  }
  attempt: number
  success: boolean
}
