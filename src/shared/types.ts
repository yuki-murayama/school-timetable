// ======================
// 統一型定義 - フロントエンド・バックエンド・データベース共通
// ======================

export interface Env {
  DB: D1Database
  ASSETS?: any
  GROQ_API_KEY: string
  AUTH0_DOMAIN: string
  AUTH0_AUDIENCE: string
  AUTH0_CLIENT_ID: string
  VITE_CLERK_PUBLISHABLE_KEY: string
  NODE_ENV: string
}

// ======================
// 学校設定
// ======================
export interface SchoolSettings {
  id?: string
  grade1Classes: number
  grade2Classes: number
  grade3Classes: number
  dailyPeriods: number
  saturdayPeriods: number
  grades: number[]  // [1, 2, 3]
  classesPerGrade: { [grade: number]: string[] }  // {1: ['A', 'B'], 2: ['A', 'B']}
  created_at?: string
  updated_at?: string
}

// ======================
// 教科
// ======================
export interface Subject {
  id: string
  name: string
  grades: number[]  // 対象学年 [1, 2, 3]、空配列=全学年対応
  weeklyHours: { [grade: number]: number }  // 学年別週間授業数 {1: 5, 2: 4, 3: 4}
  requiresSpecialClassroom?: boolean
  classroomType?: string
  // フロントエンド互換性のため追加
  specialClassroom?: string
  weekly_hours?: number  // データベース互換性
  target_grades?: number[]  // データベース互換性
  order?: number
  created_at?: string
  updated_at?: string
}

// ======================
// 教師
// ======================
export interface Teacher {
  id: string
  name: string
  subjects: (string | Subject)[]  // 担当教科（ID文字列またはオブジェクト）
  grades: number[]  // 受け持ち学年
  assignmentRestrictions?: AssignmentRestriction[]
  // データベース互換性のため追加
  assignment_restrictions?: string  // JSON文字列形式
  order?: number
  created_at?: string
  updated_at?: string
}

// ======================
// 教室
// ======================
export interface Classroom {
  id: string
  name: string
  capacity?: number
  classroomType?: string
  // フロントエンド互換性のため追加
  type?: string
  specialFor?: string
  count?: number
  order?: number
  created_at?: string
  updated_at?: string
}

// ======================
// 割当制限
// ======================
export interface AssignmentRestriction {
  displayOrder?: number        // 表示順序（1から開始）
  restrictedDay: string      // 割当不可曜日（月曜、火曜、水曜、木曜、金曜、土曜）
  restrictedPeriods: number[] // 割当不可時限（1〜授業数の配列）
  restrictionLevel: '必須' | '推奨'   // 割当不可レベル（必須、推奨）
  reason?: string
}

// ======================
// 時間割生成関連
// ======================
export interface TimetableSlot {
  classGrade: number
  classSection: string
  day: string
  period: number
  subject?: Subject
  teacher?: Teacher
  classroom?: Classroom
}

export interface TimetableGenerationResult {
  success: boolean
  timetable?: TimetableSlot[][][]  // [day][period][class]
  statistics?: {
    totalAssignments?: number
    assignedSlots?: number
    unassignedSlots?: number
    constraintViolations?: number
    generationTime?: string
    totalSlots?: number
    backtrackCount?: number
  }
  message?: string
  generatedAt?: string
  method?: string
}

// ======================
// API レスポンス型
// ======================
export interface TimetableGenerationResponse {
  success: boolean
  sessionId?: string
  message?: string
  data?: {
    timetable: any
    statistics: {
      totalSlots: number
      assignedSlots: number
      unassignedSlots: number
      backtrackCount: number
      generationTime?: string
      totalAssignments?: number
      constraintViolations?: number
    }
    generatedAt: string
    method: string
  }
  statistics?: any
}

export interface TimetableListItem {
  id: string
  name: string
  createdAt: string
  isActive: boolean
}

export interface TimetableDetail {
  id: string
  name: string
  createdAt: string
  isActive: boolean
  schedule: Array<{
    classId: string
    className: string
    schedule: Array<{
      day: number
      period: number
      subject: string
      teacher: string
      classroom: string
    }>
  }>
}