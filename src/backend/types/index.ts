// 統一型定義を再エクスポート
export type {
  AssignmentRestriction,
  Classroom,
  Env,
  SchoolSettings,
  Subject,
  Teacher,
  TimetableGenerationResult,
  TimetableSlot,
} from '@shared/schemas'

export interface Class {
  id: string
  grade: number
  class: number
  students?: number
}

export interface Period {
  period: number
  subject?: string
  teacher?: string
  classroom?: string
  classes?: Class[]
}

export interface DaySchedule {
  [day: string]: Period[]
}

export interface Timetable {
  id?: string
  name?: string
  timetable: DaySchedule
  created_at?: string
  updated_at?: string
}

export interface TimetableConditions {
  constraints?: string[]
  preferences?: Record<string, unknown>
  restrictions?: Record<string, unknown>
}

export interface TimetableStructure {
  [day: string]: Period[]
}

export interface TimetableData {
  teachers: Teacher[]
  subjects: Subject[]
  classrooms: Classroom[]
  classes: Class[]
  schoolSettings: SchoolSettings
  conditions?: TimetableConditions
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings?: string[]
}

export interface GenerationProgress {
  current: number
  total: number
  percentage: number
  currentStep: string
}

export interface GenerationResponse {
  sessionId: string
  completed: boolean
  currentDay?: string
  currentClass?: string
  progress: GenerationProgress
  message: string
  finalTimetableId?: string
  error?: string[]
}
