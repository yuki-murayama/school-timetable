import { type DatabaseSubject, DataTransformService } from './DataTransformService'
import { TimetableGenerator } from './timetableGenerator'

export interface ValidationRequest {
  timetableData: unknown
}

export class TimetableTestingService {
  private dataTransform: DataTransformService

  constructor(private db: D1Database) {
    this.dataTransform = new DataTransformService(db)
  }

  async validateTimetable(
    timetableData: unknown
  ): Promise<{ isValid: boolean; violations: unknown[] }> {
    const violations = []

    // 教師重複チェック
    const teacherSlots = new Map<string, string[]>()

    for (const [dayIndex, daySlots] of timetableData.entries()) {
      for (const [periodIndex, periodSlots] of daySlots.entries()) {
        for (const slot of periodSlots) {
          if (slot.teacher) {
            const timeKey = `${dayIndex}-${periodIndex}`
            if (!teacherSlots.has(slot.teacher.id)) {
              teacherSlots.set(slot.teacher.id, [])
            }

            const existingSlots = teacherSlots.get(slot.teacher.id)
            if (existingSlots?.includes(timeKey)) {
              violations.push({
                type: 'teacher_conflict',
                message: `教師 ${slot.teacher.name} が重複割当`,
                slot: slot,
                timeKey,
              })
            } else {
              existingSlots.push(timeKey)
            }
          }
        }
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
    }
  }

  async getGenerationConfig(): Promise<unknown> {
    // 統計情報を取得
    const [teacherCount, subjectCount, classroomCount] = await Promise.all([
      this.db.prepare('SELECT COUNT(*) as count FROM teachers').first(),
      this.db.prepare('SELECT COUNT(*) as count FROM subjects').first(),
      this.db.prepare('SELECT COUNT(*) as count FROM classrooms').first(),
    ])

    // 割当制限統計
    const restrictionsStats = await this.db
      .prepare(`
        SELECT 
          COUNT(t.id) as total_teachers,
          COUNT(CASE WHEN t.assignment_restrictions != '[]' AND t.assignment_restrictions IS NOT NULL THEN 1 END) as teachers_with_restrictions
        FROM teachers t
      `)
      .first()

    return {
      algorithm: 'backtracking',
      description: 'バックトラッキング法による時間割自動生成',
      features: [
        '割当制限（必須・推奨）対応',
        '教師の時間重複チェック',
        '専門教室の重複チェック',
        '授業時数自動調整',
      ],
      statistics: {
        teachers: teacherCount?.count || 0,
        subjects: subjectCount?.count || 0,
        classrooms: classroomCount?.count || 0,
        teachersWithRestrictions: restrictionsStats?.teachers_with_restrictions || 0,
      },
      constraints: [
        {
          name: '教師時間重複チェック',
          description: '同一教師が同時間帯に複数クラスを担当しないようチェック',
          enabled: true,
        },
        {
          name: '専門教室重複チェック',
          description: '同一専門教室が同時間帯に複数利用されないようチェック',
          enabled: true,
        },
        {
          name: '割当制限チェック',
          description: '教師の必須・推奨割当制限に従った時間割配置',
          enabled: true,
        },
      ],
    }
  }

  async getDebugData(): Promise<unknown> {
    // 教師データを取得
    const teachersResult = await this.db
      .prepare('SELECT * FROM teachers ORDER BY name LIMIT 3')
      .all()
    const subjectsResult = await this.db
      .prepare('SELECT * FROM subjects ORDER BY name LIMIT 3')
      .all()

    const teacherSample = (teachersResult.results || [])[0]
    const subjectSample = (subjectsResult.results || [])[0]

    // 変換後のデータ形式を確認
    const teachers = this.dataTransform.transformTeachers(teachersResult.results?.slice(0, 3) || [])
    const subjects = this.dataTransform.transformSubjects(subjectsResult.results?.slice(0, 3) || [])

    return {
      teacherSamples: teachers,
      subjectSamples: subjects,
      rawTeacherSample: teacherSample,
      rawSubjectSample: subjectSample,
    }
  }

  async testMatching(): Promise<unknown> {
    const teachersResult = await this.db
      .prepare('SELECT * FROM teachers ORDER BY name LIMIT 5')
      .all()
    const subjectsResult = await this.db.prepare('SELECT * FROM subjects ORDER BY name').all()

    const matchingResults = []

    for (const teacher of teachersResult.results || []) {
      let teacherSubjects = []
      if (teacher.subjects) {
        try {
          teacherSubjects =
            typeof teacher.subjects === 'string' ? JSON.parse(teacher.subjects) : teacher.subjects
        } catch (e) {
          console.log(`⚠️ JSON parse エラー: ${e.message}`)
        }
      }

      const matches = []
      const mismatches = []

      for (const teacherSubject of teacherSubjects) {
        const matchingSubject = (subjectsResult.results || []).find(
          s => s.id === teacherSubject || s.name === teacherSubject
        )

        if (matchingSubject) {
          matches.push({
            teacherSubject,
            matchedBy: matchingSubject.id === teacherSubject ? 'ID' : 'NAME',
            subjectId: matchingSubject.id,
            subjectName: matchingSubject.name,
          })
        } else {
          mismatches.push({
            teacherSubject,
            reason: 'NO_MATCH_FOUND',
          })
        }
      }

      matchingResults.push({
        teacherName: teacher.name,
        teacherId: teacher.id,
        teacherSubjects,
        matches,
        mismatches,
        hasMatches: matches.length > 0,
        hasProblems: mismatches.length > 0,
      })
    }

    return {
      summary: {
        totalTeachers: matchingResults.length,
        teachersWithMatches: matchingResults.filter(r => r.hasMatches).length,
        teachersWithProblems: matchingResults.filter(r => r.hasProblems).length,
      },
      results: matchingResults,
    }
  }

  async runQuickTest(): Promise<unknown> {
    const db = this.db

    // 基本データ取得
    const teachersResult = await db.prepare('SELECT * FROM teachers LIMIT 3').all()

    // 教師が担当する教科名を取得
    const teacherSubjects = new Set()
    for (const teacher of teachersResult.results || []) {
      try {
        const subjects =
          typeof teacher.subjects === 'string' ? JSON.parse(teacher.subjects) : teacher.subjects
        if (Array.isArray(subjects)) {
          subjects.forEach(s => teacherSubjects.add(s))
        }
      } catch (e) {
        console.log('⚠️ 教師の教科解析エラー:', e.message)
      }
    }

    // 教師が担当する教科に一致する教科データを取得
    const subjectNames = Array.from(teacherSubjects).slice(0, 5)
    let subjectsResult: { results?: DatabaseSubject[] } = { results: [] }
    if (subjectNames.length > 0) {
      const placeholders = subjectNames.map(() => '?').join(',')
      subjectsResult = await db
        .prepare(`SELECT * FROM subjects WHERE name IN (${placeholders})`)
        .bind(...subjectNames)
        .all()
    } else {
      subjectsResult = await db.prepare('SELECT * FROM subjects LIMIT 3').all()
    }

    const classroomsResult = await db.prepare('SELECT * FROM classrooms LIMIT 3').all()
    const settingsResult = await db.prepare('SELECT * FROM school_settings LIMIT 1').all()

    // 設定データをパース
    const settings = this.dataTransform.parseSettings(settingsResult.results?.[0])

    // TimetableGeneratorインスタンス作成
    const teachers = this.dataTransform.transformTeachers(teachersResult.results || [])
    const subjects = this.dataTransform.transformSubjects(subjectsResult.results || [])
    const classrooms = this.dataTransform.transformClassrooms(classroomsResult.results || [])

    const generator = new TimetableGenerator(settings, teachers, subjects, classrooms, false)

    // 候補数だけ確認
    const candidateInfo = generator.candidates || []

    // 実際の時間割生成テスト
    let generationResult = null
    let constraintAnalysis = null
    if (candidateInfo.length > 0) {
      try {
        console.log('🚀 実際の時間割生成を開始...')
        generationResult = await generator.generateTimetable({ tolerantMode: true })

        // 制約分析を取得
        constraintAnalysis = generator.getConstraintAnalysis()
      } catch (genError) {
        console.error('❌ 時間割生成エラー:', genError)
        generationResult = { success: false, error: genError.message }

        // エラー時でも制約分析を取得
        try {
          constraintAnalysis = generator.getConstraintAnalysis()
        } catch (analysisError) {
          console.error('❌ 制約分析エラー:', analysisError)
        }
      }
    }

    return {
      teacherCount: teachers.length,
      subjectCount: subjects.length,
      classroomCount: classrooms.length,
      candidateCount: candidateInfo.length,
      sampleCandidates: candidateInfo.slice(0, 3),
      generationResult,
      constraintAnalysis,
    }
  }
}
