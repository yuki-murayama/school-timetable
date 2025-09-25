import type { Classroom, SchoolSettings, Subject, Teacher } from '@shared/schemas'

export interface DatabaseTeacher {
  id: string
  name: string
  subjects?: string
  grades?: string | number[]
  assignment_restrictions?: string
  max_hours_per_week?: number
  is_active?: number
  created_at?: string
  updated_at?: string
}

export interface DatabaseSubject {
  id: string
  name: string
  weeklyHours?: number
  targetGrades?: string
  target_grades?: string
  weekly_hours?: string
  requires_special_classroom?: number
  classroom_type?: string
  created_at?: string
  updated_at?: string
}

export interface DatabaseClassroom {
  id: string
  name: string
  capacity?: number
  type?: string
  classroom_type?: string
  is_special_classroom?: number
  created_at?: string
  updated_at?: string
}

export class DataTransformService {
  constructor(private db: D1Database) {}

  async loadSchoolData(): Promise<{
    settings: SchoolSettings
    teachers: Teacher[]
    subjects: Subject[]
    classrooms: Classroom[]
  }> {
    console.log('🔍 データベースからデータを取得中...')

    // 学校設定を取得
    const settingsResult = await this.db.prepare('SELECT * FROM school_settings LIMIT 1').first()
    if (!settingsResult) {
      throw new Error('学校設定が見つかりません')
    }

    // 教師、教科、教室データを並行取得
    const [teachersResult, subjectsResult, classroomsResult] = await Promise.all([
      this.db.prepare('SELECT * FROM teachers ORDER BY name').all(),
      this.db.prepare('SELECT * FROM subjects ORDER BY name').all(),
      this.db.prepare('SELECT * FROM classrooms ORDER BY name').all(),
    ])

    console.log('📊 データ取得完了:', {
      teachers: teachersResult.results?.length || 0,
      subjects: subjectsResult.results?.length || 0,
      classrooms: classroomsResult.results?.length || 0,
    })

    return {
      settings: this.parseSettings(settingsResult),
      teachers: this.transformTeachers(teachersResult.results || []),
      subjects: this.transformSubjects(subjectsResult.results || []),
      classrooms: this.transformClassrooms(classroomsResult.results || []),
    }
  }

  parseSettings(settingsResult: Record<string, unknown>): SchoolSettings {
    // 安全な数値変換関数
    const safeNumber = (value: unknown, defaultValue: number): number => {
      try {
        if (value === null || value === undefined) return defaultValue
        // 配列、オブジェクト、関数、BigInt、Symbolの場合もデフォルト値を使用
        if (
          Array.isArray(value) ||
          typeof value === 'object' ||
          typeof value === 'function' ||
          typeof value === 'bigint' ||
          typeof value === 'symbol'
        )
          return defaultValue
        const parsed = Number(value)
        return Number.isNaN(parsed) ? defaultValue : parsed
      } catch {
        return defaultValue
      }
    }

    const grade1Classes = safeNumber(settingsResult.grade1Classes, 4)
    const grade2Classes = safeNumber(settingsResult.grade2Classes, 4)
    const grade3Classes = safeNumber(settingsResult.grade3Classes, 3)
    const dailyPeriods = safeNumber(settingsResult.dailyPeriods, 6)
    const saturdayPeriods = safeNumber(settingsResult.saturdayPeriods, 4)

    return {
      id: settingsResult.id,
      grade1Classes,
      grade2Classes,
      grade3Classes,
      dailyPeriods,
      saturdayPeriods,
      days: ['月曜', '火曜', '水曜', '木曜', '金曜', '土曜'],
      grades: [1, 2, 3],
      classesPerGrade: {
        1: Array.from({ length: grade1Classes }, (_, i) => String(i + 1)),
        2: Array.from({ length: grade2Classes }, (_, i) => String(i + 1)),
        3: Array.from({ length: grade3Classes }, (_, i) => String(i + 1)),
      },
      created_at: settingsResult.created_at,
      updated_at: settingsResult.updated_at,
    }
  }

  transformTeachers(teachersData: DatabaseTeacher[]): Teacher[] {
    return teachersData.map((t: DatabaseTeacher): Teacher => {
      // grades の解析
      let grades = [1, 2, 3] // デフォルト全学年
      if (t.grades) {
        try {
          if (typeof t.grades === 'string') {
            grades = JSON.parse(t.grades)
          } else if (Array.isArray(t.grades)) {
            grades = t.grades
          }
        } catch (e) {
          console.log('⚠️ 教師 grades JSON parse エラー:', e.message)
        }
      }

      // assignmentRestrictions の解析
      let assignmentRestrictions = []
      if (t.assignment_restrictions) {
        try {
          if (typeof t.assignment_restrictions === 'string') {
            assignmentRestrictions = JSON.parse(t.assignment_restrictions)
          } else if (Array.isArray(t.assignment_restrictions)) {
            assignmentRestrictions = t.assignment_restrictions
          }
        } catch (e) {
          console.log('⚠️ 教師 assignment_restrictions JSON parse エラー:', e.message)
        }
      }

      // subjects の解析
      let subjects = []
      if (t.subjects) {
        try {
          if (typeof t.subjects === 'string') {
            subjects = JSON.parse(t.subjects)
          } else if (Array.isArray(t.subjects)) {
            subjects = t.subjects
          }
        } catch (e) {
          console.log('⚠️ 教師 subjects JSON parse エラー:', e.message)
        }
      }

      return {
        id: t.id,
        name: t.name,
        grades,
        subjects,
        assignmentRestrictions,
        created_at: t.created_at,
        updated_at: t.updated_at,
      }
    })
  }

  transformSubjects(subjectsData: DatabaseSubject[]): Subject[] {
    return subjectsData.map((s: DatabaseSubject): Subject => {
      // target_grades の解析
      let grades = [1, 2, 3] // デフォルト全学年
      if (s.target_grades) {
        try {
          if (typeof s.target_grades === 'string') {
            grades = JSON.parse(s.target_grades)
          } else if (Array.isArray(s.target_grades)) {
            grades = s.target_grades
          }
        } catch (e) {
          console.log('⚠️ target_grades JSON parse エラー:', e.message)
        }
      }

      // weeklyHours の安全な設定（NaNエラー対策）
      let weeklyHoursValue = 1 // デフォルト値

      try {
        if (s.weekly_hours !== null && s.weekly_hours !== undefined) {
          const parsed = Number(s.weekly_hours)
          if (!Number.isNaN(parsed) && parsed > 0 && parsed <= 10) {
            weeklyHoursValue = parsed
          } else {
            console.log(
              `⚠️ 教科 ${s.name} の週間時数が不正: ${s.weekly_hours}, デフォルト値 1 を使用`
            )
          }
        }
      } catch (error) {
        console.log(`❌ 教科 ${s.name} の週間時数解析エラー:`, error)
      }

      const weeklyHours = {
        1: weeklyHoursValue,
        2: weeklyHoursValue,
        3: weeklyHoursValue,
      }

      return {
        id: s.id,
        name: s.name,
        grades,
        weeklyHours,
        requiresSpecialClassroom: !!s.requires_special_classroom,
        classroomType: s.classroom_type || 'normal',
        created_at: s.created_at,
        updated_at: s.updated_at,
      }
    })
  }

  transformClassrooms(classroomsData: DatabaseClassroom[]): Classroom[] {
    // 安全な数値変換関数
    const safeNumber = (value: unknown, defaultValue: number): number => {
      try {
        if (value === null || value === undefined) return defaultValue
        // 配列、オブジェクト、関数、BigInt、Symbolの場合もデフォルト値を使用
        if (
          Array.isArray(value) ||
          typeof value === 'object' ||
          typeof value === 'function' ||
          typeof value === 'bigint' ||
          typeof value === 'symbol'
        )
          return defaultValue
        const parsed = Number(value)
        return Number.isNaN(parsed) ? defaultValue : parsed
      } catch {
        return defaultValue
      }
    }

    return classroomsData.map(
      (c: DatabaseClassroom): Classroom => ({
        id: c.id,
        name: c.name,
        capacity: safeNumber(c.capacity, 0),
        classroomType: c.type || c.classroom_type || 'normal',
        created_at: c.created_at,
        updated_at: c.updated_at,
      })
    )
  }

  optimizeSubjects(subjects: Subject[]): Subject[] {
    return subjects.map(subject => {
      // target_gradesが空の場合、全学年に拡張
      if (!subject.grades || subject.grades.length === 0) {
        console.log(`- 教科「${subject.name}」を全学年対応に拡張`)
        return {
          ...subject,
          grades: [1, 2, 3],
        }
      }
      return subject
    })
  }

  async getGenerationConfig() {
    // 生成設定のデフォルト値を返す
    return {
      useOptimization: false,
      useNewAlgorithm: false,
      tolerantMode: true,
      maxAttempts: 100,
      timeoutMs: 30000,
    }
  }
}
