/**
 * 時間割バリデーション・適合率計算ユーティリティ
 */

import type { Subject, Teacher } from '../../../shared/types'

export const timetableValidator = {
  calculateComplianceRate(
    timetableData: unknown,
    teachers: Teacher[],
    _subjects: Subject[]
  ): {
    overallRate: number
    violations: Array<{
      period: string
      day: string
      type: 'teacher_conflict' | 'subject_constraint' | 'empty_slot' | 'teacher_mismatch'
      message: string
      severity: 'high' | 'medium' | 'low'
    }>
  } {
    // 🔍 時間割適合率計算開始

    const violations: Array<{
      period: string
      day: string
      type: 'teacher_conflict' | 'subject_constraint' | 'empty_slot' | 'teacher_mismatch'
      message: string
      severity: 'high' | 'medium' | 'low'
    }> = []

    // 現在表示中の学年・クラスのスロット数のみを計算
    const maxPeriods = 6
    const maxDays = 6
    const totalSlots = maxPeriods * maxDays // 現在のクラスの1週間分のスロット
    let validAssignments = 0
    let _totalProcessedSlots = 0

    if (!Array.isArray(timetableData)) {
      console.warn('⚠️ 無効なデータ形式')
      return { overallRate: 0, violations: [] }
    }

    // 各時限での教師の重複チェック
    const teacherScheduleMap = new Map<string, Set<string>>() // "period-day" -> Set of teachers

    // データ構造分析
    for (let dayIndex = 0; dayIndex < timetableData.length; dayIndex++) {
      const dayData = timetableData[dayIndex]

      if (!Array.isArray(dayData)) continue

      for (let periodIndex = 0; periodIndex < dayData.length; periodIndex++) {
        const periodSlots = dayData[periodIndex]
        const period = (periodIndex + 1).toString()
        const dayName = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dayIndex] || `day${dayIndex}`
        const timeSlotKey = `${period}-${dayName}`

        if (!teacherScheduleMap.has(timeSlotKey)) {
          teacherScheduleMap.set(timeSlotKey, new Set())
        }

        const teachersInSlot = teacherScheduleMap.get(timeSlotKey)
        if (!teachersInSlot) continue

        if (Array.isArray(periodSlots)) {
          // 現在の時限・曜日で授業が割り当てられているかチェック
          _totalProcessedSlots++

          let hasValidAssignment = false
          for (const slot of periodSlots) {
            if (slot?.subject && slot.teacher) {
              const teacherName =
                typeof slot.teacher === 'object' ? slot.teacher.name : slot.teacher
              const subjectName =
                typeof slot.subject === 'object' ? slot.subject.name : slot.subject

              hasValidAssignment = true

              // 教師の重複チェック
              if (teachersInSlot.has(teacherName)) {
                violations.push({
                  period,
                  day: dayName,
                  type: 'teacher_conflict',
                  message: `${teacherName}先生が同じ時間に複数のクラスを担当しています`,
                  severity: 'high',
                })
              } else {
                teachersInSlot.add(teacherName)
              }

              // 教師-教科の適合性チェック
              const teacher = teachers.find(t => t.name === teacherName)
              if (teacher && !teacher.subjects.includes(subjectName)) {
                violations.push({
                  period,
                  day: dayName,
                  type: 'teacher_mismatch',
                  message: `${teacherName}先生は${subjectName}の担当ではありません`,
                  severity: 'medium',
                })
              }
            }
          }

          if (hasValidAssignment) {
            validAssignments++
          } else {
            // 土曜日の午後など、意図的に授業がない時間は軽微な違反
            if (dayIndex === 5 && periodIndex >= 4) {
              // 土曜日の5・6時限目
              // これは正常なので違反として扱わない
            } else {
              violations.push({
                period,
                day: dayName,
                type: 'empty_slot',
                message: '授業が割り当てられていません',
                severity: 'low',
              })
            }
          }
        }
      }
    }

    const overallRate = Math.round((validAssignments / totalSlots) * 100 * 100) / 100

    // 📊 適合率計算結果: ${overallRate}% (${validAssignments}/${totalSlots})
    // 🚨 違反件数: ${violations.length}件

    return {
      overallRate,
      violations,
    }
  },

  // 表示用データに違反情報を追加
  addViolationInfo(displayData: unknown[], violations: unknown[]): unknown[] {
    // 🎨 違反情報を表示データに追加

    return displayData.map(periodRow => {
      const newRow = { ...periodRow }

      const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']
      days.forEach(day => {
        const cellData = newRow[day]
        if (cellData) {
          // この時限・曜日に関連する違反を検索
          const cellViolations = violations.filter(
            v => v.period === periodRow.period && v.day === day
          )

          newRow[day] = {
            ...cellData,
            violations: cellViolations,
            hasViolation: cellViolations.length > 0,
            violationSeverity:
              cellViolations.length > 0
                ? cellViolations.reduce(
                    (max: 'high' | 'medium' | 'low', v) => {
                      const severityOrder: { [key: string]: number } = {
                        high: 3,
                        medium: 2,
                        low: 1,
                      }
                      return (severityOrder[v.severity] || 0) > (severityOrder[max] || 0)
                        ? v.severity
                        : max
                    },
                    'low' as 'high' | 'medium' | 'low'
                  )
                : null,
          }
        }
      })

      return newRow
    })
  },

  // 空きスロット自動補完機能
  fillEmptySlots(
    displayData: unknown[],
    teachers: Teacher[],
    subjects: Subject[],
    grade: number
  ): unknown[] {
    // 🔧 空きスロット自動補完開始

    // その学年で利用可能な科目を取得
    const availableSubjects = subjects.filter(subject => subject.grades?.includes(grade))

    // その学年の科目を担当する教師を取得
    const availableTeachers = teachers.filter(
      teacher => teacher.grades?.includes(grade) && teacher.subjects && teacher.subjects.length > 0
    )

    // 📚 利用可能科目: ${availableSubjects.length}件
    // 👨‍🏫 利用可能教師: ${availableTeachers.length}件

    return displayData.map(periodRow => {
      const newRow = { ...periodRow }
      const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']

      days.forEach(day => {
        const cellData = newRow[day]

        // 空きスロットを補完
        if (!cellData || (!cellData.subject && !cellData.teacher)) {
          // 土曜日の5・6時限目は空きのままにする
          if (day === 'sat' && (periodRow.period === '5' || periodRow.period === '6')) {
            return
          }

          // この時限・曜日で利用可能な教師を見つける
          const availableTeacherForSlot = availableTeachers.find(teacher => {
            // 同じ時限で他の曜日にすでに割り当てられていないかチェック
            const isTeacherBusy = days.some(otherDay => {
              if (otherDay === day) return false
              const otherCell = newRow[otherDay]
              return otherCell && otherCell.teacher === teacher.name
            })
            return !isTeacherBusy
          })

          if (availableTeacherForSlot && availableTeacherForSlot.subjects.length > 0) {
            // 教師が担当する科目の中から適切なものを選択
            const suitableSubject = availableSubjects.find(subject =>
              availableTeacherForSlot.subjects.includes(subject.name)
            )

            if (suitableSubject) {
              newRow[day] = {
                subject: suitableSubject.name,
                teacher: availableTeacherForSlot.name,
                isAutoFilled: true, // 自動補完フラグ
                hasViolation: false,
                violations: [],
                violationSeverity: null,
              }
            }
          }
        }
      })

      return newRow
    })
  },
}
