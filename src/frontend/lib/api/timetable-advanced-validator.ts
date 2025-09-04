import type { Subject, Teacher } from '@shared/schemas'

export const timetableAdvancedValidator = {
  // 適合率計算とバリデーション機能
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

  // リアルタイム条件チェック機能
  validateTimetableConstraints(
    displayData: unknown[],
    teachers: Teacher[],
    _subjects: Subject[]
  ): {
    isValid: boolean
    conflicts: Array<{
      period: string
      day: string
      type: 'teacher_double_booking' | 'subject_constraint' | 'teacher_mismatch'
      message: string
      severity: 'high' | 'medium' | 'low'
      affectedCells: Array<{ period: string; day: string }>
    }>
  } {
    // 🔍 リアルタイム条件チェック開始

    const conflicts: Array<{
      period: string
      day: string
      type: 'teacher_double_booking' | 'subject_constraint' | 'teacher_mismatch'
      message: string
      severity: 'high' | 'medium' | 'low'
      affectedCells: Array<{ period: string; day: string }>
    }> = []

    // 各時限での教師重複チェック
    displayData.forEach(periodRow => {
      const teacherAssignments = new Map<string, string[]>() // teacher -> [days]
      const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']

      days.forEach(day => {
        const cellData = periodRow[day]
        if (cellData?.teacher) {
          if (!teacherAssignments.has(cellData.teacher)) {
            teacherAssignments.set(cellData.teacher, [])
          }
          teacherAssignments.get(cellData.teacher)?.push(day)
        }
      })

      // 同じ時限で複数の曜日に割り当てられている教師をチェック
      teacherAssignments.forEach((assignedDays, teacherName) => {
        if (assignedDays.length > 1) {
          assignedDays.forEach(day => {
            conflicts.push({
              period: periodRow.period,
              day,
              type: 'teacher_double_booking',
              message: `${teacherName}先生が同じ時限の複数曜日に割り当てられています`,
              severity: 'high',
              affectedCells: assignedDays.map(d => ({ period: periodRow.period, day: d })),
            })
          })
        }
      })

      // 教師の資格チェック
      days.forEach(day => {
        const cellData = periodRow[day]
        if (cellData?.teacher && cellData.subject) {
          const teacher = teachers.find(t => t.name === cellData.teacher)
          if (teacher && !teacher.subjects.includes(cellData.subject)) {
            conflicts.push({
              period: periodRow.period,
              day,
              type: 'teacher_mismatch',
              message: `${cellData.teacher}先生は${cellData.subject}の担当ではありません`,
              severity: 'medium',
              affectedCells: [{ period: periodRow.period, day }],
            })
          }
        }
      })
    })

    const isValid = conflicts.length === 0
    console.log(
      `📊 条件チェック結果: ${isValid ? '✅ 適合' : '❌ 違反あり'} (${conflicts.length}件の問題)`
    )

    return { isValid, conflicts }
  },

  // 全校横断的な制約チェック機能
  validateSchoolWideTimetableConstraints(
    allClassTimetables: Map<string, unknown[]>, // "grade-classNumber" -> timetableData
    teachers: Teacher[],
    _subjects: Subject[]
  ): {
    isValid: boolean
    conflicts: Array<{
      period: string
      day: string
      type: 'teacher_conflict' | 'subject_constraint' | 'teacher_mismatch'
      message: string
      severity: 'high' | 'medium' | 'low'
      affectedClasses: Array<{ grade: number; classNumber: number }>
    }>
  } {
    console.log('🔍 全校横断的な制約チェック開始')

    const conflicts: Array<{
      period: string
      day: string
      type: 'teacher_conflict' | 'subject_constraint' | 'teacher_mismatch'
      message: string
      severity: 'high' | 'medium' | 'low'
      affectedClasses: Array<{ grade: number; classNumber: number }>
    }> = []

    const periods = ['1', '2', '3', '4', '5', '6']
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']

    // 各時限・曜日での全校的な教師重複チェック
    periods.forEach(period => {
      days.forEach(day => {
        const teacherAssignments = new Map<string, Array<{ grade: number; classNumber: number }>>()

        // 全クラスのこの時限・曜日での教師配置を収集
        allClassTimetables.forEach((timetableData, classKey) => {
          const [gradeStr, classNumberStr] = classKey.split('-')
          const grade = parseInt(gradeStr)
          const classNumber = parseInt(classNumberStr)

          const periodRow = timetableData.find((row: unknown) => row.period === period)
          if (periodRow?.[day]?.teacher) {
            const teacherName = periodRow[day].teacher

            if (!teacherAssignments.has(teacherName)) {
              teacherAssignments.set(teacherName, [])
            }
            teacherAssignments.get(teacherName)?.push({ grade, classNumber })
          }
        })

        // 同じ時限・曜日で複数クラスに割り当てられている教師をチェック
        teacherAssignments.forEach((assignedClasses, teacherName) => {
          if (assignedClasses.length > 1) {
            conflicts.push({
              period,
              day,
              type: 'teacher_conflict',
              message: `${teacherName}先生が同じ時限に複数クラス（${assignedClasses.map(c => `${c.grade}年${c.classNumber}組`).join(', ')}）で教えています`,
              severity: 'high',
              affectedClasses: assignedClasses,
            })

            console.log(
              `🚨 教師重複発見: ${teacherName}先生 ${day}曜日${period}時限目`,
              assignedClasses
            )
          }
        })

        // 教師の資格チェック
        allClassTimetables.forEach((timetableData, classKey) => {
          const [gradeStr, classNumberStr] = classKey.split('-')
          const grade = parseInt(gradeStr)
          const classNumber = parseInt(classNumberStr)

          const periodRow = timetableData.find((row: unknown) => row.period === period)
          const cellData = periodRow?.[day]

          if (cellData?.teacher && cellData.subject) {
            const teacher = teachers.find(t => t.name === cellData.teacher)
            if (teacher && !teacher.subjects.includes(cellData.subject)) {
              conflicts.push({
                period,
                day,
                type: 'teacher_mismatch',
                message: `${cellData.teacher}先生は${cellData.subject}の担当資格がありません（${grade}年${classNumber}組）`,
                severity: 'medium',
                affectedClasses: [{ grade, classNumber }],
              })
            }
          }
        })
      })
    })

    const isValid = conflicts.length === 0
    console.log(
      `📊 全校制約チェック結果: ${isValid ? '✅ 適合' : '❌ 違反あり'} (${conflicts.length}件の問題)`
    )

    return { isValid, conflicts }
  },

  // 強化された制約チェック（全校視点を含む）
  validateTimetableConstraintsEnhanced(
    displayData: unknown[],
    teachers: Teacher[],
    subjects: Subject[],
    grade: number,
    classNumber: number,
    allClassTimetables?: Map<string, unknown[]>
  ): {
    isValid: boolean
    conflicts: Array<{
      period: string
      day: string
      type:
        | 'teacher_double_booking'
        | 'subject_constraint'
        | 'teacher_qualification'
        | 'school_wide_conflict'
      message: string
      severity: 'high' | 'medium' | 'low'
      affectedCells: Array<{ period: string; day: string }>
    }>
  } {
    console.log(`🔍 強化された制約チェック開始 (${grade}年${classNumber}組)`)

    const conflicts: Array<{
      period: string
      day: string
      type:
        | 'teacher_double_booking'
        | 'subject_constraint'
        | 'teacher_qualification'
        | 'school_wide_conflict'
      message: string
      severity: 'high' | 'medium' | 'low'
      affectedCells: Array<{ period: string; day: string }>
    }> = []

    // 既存のクラス内制約チェック
    const classInternalResult = this.validateTimetableConstraints(displayData, teachers, subjects)
    conflicts.push(
      ...classInternalResult.conflicts.map(c => ({
        ...c,
        type: c.type as
          | 'teacher_double_booking'
          | 'subject_constraint'
          | 'teacher_qualification'
          | 'school_wide_conflict',
      }))
    )

    // 全校横断制約チェック（データが利用可能な場合）
    if (allClassTimetables) {
      // 現在のクラスデータを全校データに追加
      const enhancedAllClassTimetables = new Map(allClassTimetables)
      enhancedAllClassTimetables.set(`${grade}-${classNumber}`, displayData)

      const schoolWideResult = this.validateSchoolWideTimetableConstraints(
        enhancedAllClassTimetables,
        teachers,
        subjects
      )

      // 全校制約違反のうち、現在のクラスに影響するもののみを追加
      schoolWideResult.conflicts.forEach(conflict => {
        const affectsCurrentClass = conflict.affectedClasses.some(
          ac => ac.grade === grade && ac.classNumber === classNumber
        )

        if (affectsCurrentClass) {
          conflicts.push({
            period: conflict.period,
            day: conflict.day,
            type: 'school_wide_conflict',
            message: conflict.message,
            severity: conflict.severity,
            affectedCells: [{ period: conflict.period, day: conflict.day }],
          })
        }
      })
    }

    const isValid = conflicts.length === 0
    console.log(
      `📊 強化制約チェック結果: ${isValid ? '✅ 適合' : '❌ 違反あり'} (${conflicts.length}件の問題)`
    )

    return { isValid, conflicts }
  },
}
