import type { Subject, Teacher } from '@shared/schemas'

export const timetableGenerator = {
  // 空の時間割生成
  generateEmptyTimetable(): unknown[] {
    console.log('📝 空の時間割を生成')

    const periods = ['1', '2', '3', '4', '5', '6']
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']

    return periods.map(period => {
      const periodData: unknown = { period }

      days.forEach(day => {
        periodData[day] = {
          subject: '',
          teacher: '',
          classroom: '',
          isAutoFilled: false,
          hasViolation: false,
          violations: [],
          violationSeverity: null,
        }
      })

      return periodData
    })
  },

  // クラス別に多様化された空の時間割生成
  generateDiversifiedEmptyTimetable(
    grade: number,
    classNumber: number,
    teachers: Teacher[],
    subjects: Subject[]
  ): unknown[] {
    console.log(`📝 ${grade}年${classNumber}組用の多様化された時間割を生成`)

    const periods = ['1', '2', '3', '4', '5', '6']
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']

    return periods.map(period => {
      const periodData: unknown = { period }

      days.forEach(day => {
        periodData[day] = this.generateUniqueSlotForClass(
          grade,
          classNumber,
          period,
          day,
          teachers,
          subjects
        )
      })

      return periodData
    })
  },

  // クラス別に一意なスロットを生成
  generateUniqueSlotForClass(
    grade: number,
    classNumber: number,
    period: string,
    day: string,
    teachers: Teacher[],
    subjects: Subject[]
  ): unknown {
    // 土曜日の5・6時限目は空きのままにする
    if (day === 'sat' && (period === '5' || period === '6')) {
      return {
        subject: '',
        teacher: '',
        classroom: '',
        isAutoFilled: false,
        hasViolation: false,
        violations: [],
        violationSeverity: null,
      }
    }

    // その学年で利用可能な科目と教師を取得
    const availableSubjects = subjects.filter(subject => subject.grades?.includes(grade))
    const availableTeachers = teachers.filter(
      teacher => teacher.grades?.includes(grade) && teacher.subjects && teacher.subjects.length > 0
    )

    // クラス番号と時限を基にして決定的に教師と科目を選択（ランダムではなく一貫性を保つ）
    const seedValue = grade * 100 + classNumber * 10 + parseInt(period) + (day.charCodeAt(0) % 7)

    if (availableTeachers.length > 0 && availableSubjects.length > 0) {
      const teacherIndex = seedValue % availableTeachers.length
      const selectedTeacher = availableTeachers[teacherIndex]

      // 選択された教師が担当できる科目を探す
      const teacherSubjects = availableSubjects.filter(subject =>
        selectedTeacher.subjects.includes(subject.name)
      )

      if (teacherSubjects.length > 0) {
        const subjectIndex = (seedValue + classNumber) % teacherSubjects.length
        const selectedSubject = teacherSubjects[subjectIndex]

        return {
          subject: selectedSubject.name,
          teacher: selectedTeacher.name,
          classroom: `${grade}-${classNumber}`,
          isAutoFilled: true,
          hasViolation: false,
          violations: [],
          violationSeverity: null,
        }
      }
    }

    // 適切な教師/科目が見つからない場合は空のスロット
    return {
      subject: '',
      teacher: '',
      classroom: '',
      isAutoFilled: false,
      hasViolation: false,
      violations: [],
      violationSeverity: null,
    }
  },

  // 単一クラスデータをクラス別に分散
  diversifyClassData(
    originalData: unknown,
    grade: number,
    classNumber: number,
    period: string,
    day: string,
    teachers: Teacher[],
    subjects: Subject[]
  ): unknown {
    if (!originalData || (!originalData.subject && !originalData.teacher)) {
      return this.generateUniqueSlotForClass(grade, classNumber, period, day, teachers, subjects)
    }

    // 元データがある場合は、クラス番号に基づいて別の教師を選択
    const seedValue = grade * 100 + classNumber * 10 + parseInt(period)

    // 同じ科目を教えることができる別の教師を探す
    const sameSubjectTeachers = teachers.filter(
      teacher =>
        teacher.subjects.includes(originalData.subject) &&
        teacher.grades?.includes(grade) &&
        teacher.name !== originalData.teacher // 元の教師以外
    )

    if (sameSubjectTeachers.length > 0) {
      const teacherIndex = seedValue % sameSubjectTeachers.length
      const alternativeTeacher = sameSubjectTeachers[teacherIndex]

      return {
        subject: originalData.subject,
        teacher: alternativeTeacher.name,
        classroom: `${grade}-${classNumber}`,
        isAutoFilled: true,
        hasViolation: false,
        violations: [],
        violationSeverity: null,
      }
    }

    // 代替教師が見つからない場合は新しいスロットを生成
    return this.generateUniqueSlotForClass(grade, classNumber, period, day, teachers, subjects)
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

              // console.log(
              //   `✅ ${day}曜日${periodRow.period}時限目に ${suitableSubject.name} (${availableTeacherForSlot.name}) を自動補完`
              // )
            }
          }
        }
      })

      return newRow
    })
  },

  // 競合回避機能付きの空きスロット補完
  fillEmptySlotsWithConflictAvoidance(
    displayData: unknown[],
    teachers: Teacher[],
    subjects: Subject[],
    grade: number,
    classNumber: number
  ): unknown[] {
    console.log(`🔧 ${grade}年${classNumber}組の空きスロット自動補完開始（競合回避機能付き）`)

    const availableSubjects = subjects.filter(subject => subject.grades?.includes(grade))
    const availableTeachers = teachers.filter(
      teacher => teacher.grades?.includes(grade) && teacher.subjects && teacher.subjects.length > 0
    )

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

          // この時限・曜日で他のクラスとの競合を避けて教師を選択
          const availableTeacherForSlot = availableTeachers.find(teacher => {
            // 同じ時限で他の曜日にすでに割り当てられていないかチェック
            const isTeacherBusyInSameClass = days.some(otherDay => {
              if (otherDay === day) return false
              const otherCell = newRow[otherDay]
              return otherCell && otherCell.teacher === teacher.name
            })

            // TODO: 他のクラスとの競合もチェックする（全校的な制約チェックと連携）
            // 現在は同一クラス内の競合のみをチェック

            return !isTeacherBusyInSameClass
          })

          if (availableTeacherForSlot && availableTeacherForSlot.subjects.length > 0) {
            const suitableSubject = availableSubjects.find(subject =>
              availableTeacherForSlot.subjects.includes(subject.name)
            )

            if (suitableSubject) {
              newRow[day] = {
                subject: suitableSubject.name,
                teacher: availableTeacherForSlot.name,
                classroom: `${grade}-${classNumber}`,
                isAutoFilled: true,
                hasViolation: false,
                violations: [],
                violationSeverity: null,
              }

              // console.log(
              //   `✅ ${grade}年${classNumber}組 ${day}曜日${periodRow.period}時限目に ${suitableSubject.name} (${availableTeacherForSlot.name}) を自動補完`
              // )
            }
          }
        }
      })

      return newRow
    })
  },

  // クラス別時間割データ生成機能
  generateClassTimetableData(
    sourceData: unknown[],
    grade: number,
    classNumber: number,
    teachers: Teacher[],
    subjects: Subject[]
  ): unknown[] {
    console.log(`🏫 ${grade}年${classNumber}組の時間割データ生成開始`)

    if (!Array.isArray(sourceData) || sourceData.length === 0) {
      console.warn('⚠️ ソースデータが無効または空です')
      // クラス別に異なる空の時間割を生成
      return this.generateDiversifiedEmptyTimetable(grade, classNumber, teachers, subjects)
    }

    // 指定されたクラスのデータを抽出
    const classData: unknown[] = []

    // ソースデータの構造を分析して適切にデータを抽出
    const periods = ['1', '2', '3', '4', '5', '6']
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']

    periods.forEach(period => {
      const periodData: unknown = { period }

      days.forEach(day => {
        // ソースデータから該当する時限・曜日・クラスのデータを検索
        let cellData = null

        // sourceDataの構造に応じてデータを抽出
        if (sourceData.length > 0 && sourceData[0] && typeof sourceData[0] === 'object') {
          // displayData形式の場合
          const periodRow = sourceData.find(row => row.period === period)
          if (periodRow?.[day]) {
            // クラス指定がある場合はそれを使用、なければクラス別に分散
            if (Array.isArray(periodRow[day])) {
              // 複数クラスのデータが配列形式の場合
              const classIndex = classNumber - 1
              cellData = periodRow[day][classIndex] || null
            } else {
              // 単一クラスデータの場合は、クラス別に分散させる
              cellData = this.diversifyClassData(
                periodRow[day],
                grade,
                classNumber,
                period,
                day,
                teachers,
                subjects
              )
            }
          }
        } else {
          // 他の形式のデータ構造に対応
          try {
            // 多次元配列形式の場合の処理
            const dayIndex = days.indexOf(day)
            const periodIndex = periods.indexOf(period)

            if (sourceData[dayIndex] && Array.isArray(sourceData[dayIndex])) {
              const periodSlots = sourceData[dayIndex][periodIndex]
              if (Array.isArray(periodSlots)) {
                // クラス別データが配列になっている場合
                const classIndex = (grade - 1) * 2 + (classNumber - 1) // 学年ごとに2クラス想定
                cellData = periodSlots[classIndex] || null
              } else {
                cellData = periodSlots
              }
            }
          } catch (error) {
            console.warn(`⚠️ ${day}曜日${period}時限目のデータ抽出でエラー:`, error)
          }
        }

        // 抽出したデータを整形
        if (cellData && (cellData.subject || cellData.teacher)) {
          periodData[day] = {
            subject: cellData.subject || '',
            teacher: cellData.teacher || '',
            classroom: cellData.classroom || '',
            isAutoFilled: cellData.isAutoFilled || false,
            hasViolation: cellData.hasViolation || false,
            violations: cellData.violations || [],
            violationSeverity: cellData.violationSeverity || null,
          }
        } else {
          // 空のスロット - クラス別に自動生成
          periodData[day] = this.generateUniqueSlotForClass(
            grade,
            classNumber,
            period,
            day,
            teachers,
            subjects
          )
        }
      })

      classData.push(periodData)
    })

    console.log(`✅ ${grade}年${classNumber}組の時間割データ生成完了: ${classData.length}時限`)

    // 空きスロットの自動補完を適用（クラス間競合回避）
    const filledData = this.fillEmptySlotsWithConflictAvoidance(
      classData,
      teachers,
      subjects,
      grade,
      classNumber
    )

    return filledData
  },
}
