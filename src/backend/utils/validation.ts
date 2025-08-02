import { TimetableData, ValidationResult } from '../types'

export function validateTimetable(timetable: any, data: TimetableData, isPartialGeneration = false): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!timetable) {
    errors.push('時間割データが存在しません')
    return { isValid: false, errors, warnings }
  }

  // 基本的な構造チェック
  if (typeof timetable !== 'object') {
    errors.push('時間割データの形式が正しくありません')
    return { isValid: false, errors, warnings }
  }

  // 各曜日のチェック
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  for (const day of days) {
    if (timetable[day] && Array.isArray(timetable[day])) {
      const daySchedule = timetable[day]
      
      // 時限の重複チェック
      const periods = new Set()
      for (const period of daySchedule) {
        if (periods.has(period.period)) {
          errors.push(`${day}: 時限${period.period}が重複しています`)
        }
        periods.add(period.period)
        
        // 教師の重複チェック（部分生成でない場合）
        if (!isPartialGeneration && period.teacher) {
          // 他の時限で同じ教師が使われていないかチェック
          const sameTimeSlots = daySchedule.filter(p => 
            p.period === period.period && p.teacher === period.teacher
          )
          if (sameTimeSlots.length > 1) {
            errors.push(`${day} 時限${period.period}: 教師 ${period.teacher} が重複しています`)
          }
        }
        
        // 教室の重複チェック
        if (period.classroom) {
          const sameClassroom = daySchedule.filter(p => 
            p.period === period.period && p.classroom === period.classroom
          )
          if (sameClassroom.length > 1) {
            errors.push(`${day} 時限${period.period}: 教室 ${period.classroom} が重複しています`)
          }
        }
      }
    }
  }

  // 登録されている教師・科目・教室のチェック
  const teacherNames = data.teachers.map(t => t.name)
  const subjectNames = data.subjects.map(s => s.name)
  const classroomNames = data.classrooms.map(c => c.name)

  for (const day of days) {
    if (timetable[day] && Array.isArray(timetable[day])) {
      for (const period of timetable[day]) {
        if (period.teacher && !teacherNames.includes(period.teacher)) {
          errors.push(`${day} 時限${period.period}: 未登録の教師 ${period.teacher} が使用されています`)
        }
        
        if (period.subject && !subjectNames.includes(period.subject)) {
          errors.push(`${day} 時限${period.period}: 未登録の科目 ${period.subject} が使用されています`)
        }
        
        if (period.classroom && !classroomNames.includes(period.classroom)) {
          errors.push(`${day} 時限${period.period}: 未登録の教室 ${period.classroom} が使用されています`)
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

export function validateTimetableWithRelaxedConstraints(
  timetable: any, 
  data: TimetableData, 
  isPartialGeneration = false, 
  retryCount = 0
): ValidationResult {
  // リトライ回数に応じて制約を緩和
  const relaxationLevel = Math.min(retryCount, 3)
  
  if (relaxationLevel >= 2) {
    // 高レベル緩和: 基本的な構造チェックのみ
    return validateBasicStructure(timetable)
  } else if (relaxationLevel >= 1) {
    // 中レベル緩和: 重複チェックを緩和
    return validateWithMediumRelaxation(timetable, data, isPartialGeneration)
  } else {
    // 通常のバリデーション
    return validateTimetable(timetable, data, isPartialGeneration)
  }
}

function validateBasicStructure(timetable: any): ValidationResult {
  const errors: string[] = []
  
  if (!timetable || typeof timetable !== 'object') {
    errors.push('時間割データの形式が正しくありません')
  }
  
  return { isValid: errors.length === 0, errors }
}

function validateWithMediumRelaxation(
  timetable: any, 
  data: TimetableData, 
  isPartialGeneration: boolean
): ValidationResult {
  const errors: string[] = []
  
  if (!timetable || typeof timetable !== 'object') {
    errors.push('時間割データの形式が正しくありません')
    return { isValid: false, errors }
  }
  
  // 登録チェックのみ実行（重複チェックは緩和）
  const teacherNames = data.teachers.map(t => t.name)
  const subjectNames = data.subjects.map(s => s.name)
  const classroomNames = data.classrooms.map(c => c.name)
  
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  for (const day of days) {
    if (timetable[day] && Array.isArray(timetable[day])) {
      for (const period of timetable[day]) {
        if (period.teacher && !teacherNames.includes(period.teacher)) {
          errors.push(`${day} 時限${period.period}: 未登録の教師 ${period.teacher}`)
        }
        
        if (period.subject && !subjectNames.includes(period.subject)) {
          errors.push(`${day} 時限${period.period}: 未登録の科目 ${period.subject}`)
        }
        
        if (period.classroom && !classroomNames.includes(period.classroom)) {
          errors.push(`${day} 時限${period.period}: 未登録の教室 ${period.classroom}`)
        }
      }
    }
  }
  
  return { isValid: errors.length === 0, errors }
}

export function validatePartialTimetable(timetable: any, data: TimetableData): ValidationResult {
  return validateTimetable(timetable, data, true)
}