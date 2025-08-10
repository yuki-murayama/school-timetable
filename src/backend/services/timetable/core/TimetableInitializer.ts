/**
 * 時間割初期化・候補生成クラス
 */

import type { SchoolSettings, Subject, Teacher, TimetableSlot } from '../../../../shared/types'
import type { AssignmentCandidate } from '../types'

export class TimetableInitializer {
  constructor(
    private settings: SchoolSettings,
    private teachers: Teacher[],
    private subjects: Subject[],
    private classrooms: Classroom[]
  ) {}

  /**
   * 時間割スロット初期化
   */
  initializeTimetable(): TimetableSlot[][][] {
    console.log('🔧 initializeTimetable詳細チェック開始')

    if (!this.settings) {
      console.log('❌ CRITICAL: settingsがundefinedです')
      throw new Error('Settings is undefined in initializeTimetable')
    }

    // 安全なdefault値を使用
    const days = this.settings?.days || ['月曜', '火曜', '水曜', '木曜', '金曜', '土曜']
    const grades = this.settings?.grades || [1, 2, 3]
    const classesPerGrade = this.settings?.classesPerGrade || {
      1: ['1', '2', '3', '4'],
      2: ['1', '2', '3', '4'],
      3: ['1', '2', '3'],
    }
    const dailyPeriods = this.settings?.dailyPeriods || 6
    const saturdayPeriods = this.settings?.saturdayPeriods || 6

    console.log('Safe values:', { days: days.length, grades: grades.length })

    const timetable: TimetableSlot[][][] = []

    for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
      const day = days[dayIndex]
      timetable[dayIndex] = []

      const periodsForDay = day === '土曜' ? saturdayPeriods : dailyPeriods

      for (let period = 1; period <= periodsForDay; period++) {
        timetable[dayIndex][period - 1] = []

        for (const grade of grades) {
          const sections = classesPerGrade[grade] || ['A']
          for (const section of sections) {
            const slot = {
              classGrade: grade,
              classSection: section,
              day,
              period,
            }
            timetable[dayIndex][period - 1].push(slot)

            // デバッグ: スロット作成を記録（初回のみ）
            if (dayIndex === 0 && period === 1) {
              console.log(`📝 スロット作成: ${grade}年${section}組`, {
                classGrade: slot.classGrade,
                classSection: slot.classSection,
                gradeType: typeof slot.classGrade,
                sectionType: typeof slot.classSection,
              })
            }
          }
        }
      }
    }

    return timetable
  }

  /**
   * 割当候補を生成
   */
  generateCandidates(): AssignmentCandidate[] {
    console.log('🔍 generateCandidates開始：Defensive Programming')

    const candidates: AssignmentCandidate[] = []

    // 安全なグレード配列とクラス設定の取得
    const safeGrades = this.settings?.grades || [1, 2, 3]
    const safeClassesPerGrade = this.settings?.classesPerGrade || {
      1: ['1', '2', '3', '4'],
      2: ['1', '2', '3', '4'],
      3: ['1', '2', '3'],
    }

    console.log('SafeGrades:', safeGrades)
    console.log('SafeClassesPerGrade:', safeClassesPerGrade)

    // 教師と教科の組み合わせで候補を生成
    for (const teacher of this.teachers) {
      const teacherSubjects = teacher.subjects || []
      for (const subjectId of teacherSubjects) {
        const subject = this.subjects.find(s => s.id === subjectId)
        if (!subject) continue

        for (const grade of safeGrades) {
          if (!this.canSubjectBeTeachedToGrade(subject, grade)) continue

          const sections = safeClassesPerGrade[grade] || []
          for (const section of sections) {
            const requiredHours = this.getRequiredHoursForSubject(subject, grade)
            if (requiredHours > 0) {
              candidates.push({
                teacher,
                subject,
                classGrade: grade,
                classSection: section,
                requiredHours,
                assignedHours: 0,
              })
            }
          }
        }
      }
    }

    console.log(`✅ 候補生成完了: ${candidates.length}件`)
    return candidates
  }

  /**
   * 教科が学年に対応しているかチェック
   */
  private canSubjectBeTeachedToGrade(subject: Subject, grade: number): boolean {
    return subject.grades.includes(grade)
  }

  /**
   * 教科・学年の必要時数を取得
   */
  private getRequiredHoursForSubject(subject: Subject, _grade: number): number {
    if (subject.weeklyHours?.[0]) {
      return subject.weeklyHours[0]
    }
    return 0
  }

  /**
   * 拡張教科リスト（学年別分解）
   */
  expandSubjectGrades(): Subject[] {
    const expandedSubjects: Subject[] = []

    for (const subject of this.subjects) {
      console.log(`処理中の教科: ${subject.name}`, subject)

      if (!subject.grades || subject.grades.length === 0) {
        console.log(`⚠️ ${subject.name}: grades設定なし`)
        continue
      }

      for (const grade of subject.grades) {
        if (subject.weeklyHours?.[0]) {
          expandedSubjects.push({
            ...subject,
            grades: [grade], // 学年ごとに分解
          })
        }
      }
    }

    console.log(`展開された教科数: ${expandedSubjects.length}`)
    return expandedSubjects
  }

  /**
   * 拡張教師リスト（専門分野別）
   */
  expandTeacherSpecialization(): Teacher[] {
    const expandedTeachers: Teacher[] = []

    for (const teacher of this.teachers) {
      if (!teacher.subjects || teacher.subjects.length === 0) {
        console.log(`⚠️ ${teacher.name}: 専門教科設定なし`)
        continue
      }

      // 各教師の専門分野別に分析
      for (const subjectId of teacher.subjects) {
        const subject = this.subjects.find(s => s.id === subjectId)
        if (subject) {
          expandedTeachers.push({
            ...teacher,
            subjects: [subjectId], // 専門分野ごとに分解
          })
        }
      }
    }

    console.log(`展開された教師数: ${expandedTeachers.length}`)
    return expandedTeachers
  }
}
