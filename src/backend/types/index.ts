// 統一型定義を再エクスポート
export type {
  Env,
  SchoolSettings,
  Teacher,
  Subject,
  Classroom,
  AssignmentRestriction,
  TimetableSlot,
  TimetableGenerationResult
} from '../../shared/types'

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

export interface GenerationSession {
  id: string
  status: 'active' | 'completed' | 'failed'
  current_day: string
  current_class_index: number
  completed_steps: number
  total_steps: number
  error_count?: number
  final_timetable_id?: string
  created_at: string
  updated_at: string
}

export interface GenerationStep {
  id: string
  session_id: string
  day: string
  class_id: string
  grade: number
  class_number: number
  step_data: string
  created_at: string
}

export interface TimetableData {
  teachers: Teacher[]
  subjects: Subject[]
  classrooms: Classroom[]
  classes: Class[]
  schoolSettings: SchoolSettings
  conditions?: any
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