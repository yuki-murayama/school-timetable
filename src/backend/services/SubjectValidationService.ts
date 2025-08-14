/**
 * 教科データの型検証とクリーンアップサービス
 * D1データベースの緩い型チェックを補完
 */

export interface CleanSubjectData {
  id: string
  name: string
  weeklyHours: number // 整数のみ許可
  targetGrades: number[] // 数値配列のみ許可
  requiresSpecialClassroom?: boolean
  classroomType?: string
  order?: number
}

export class SubjectValidationService {
  /**
   * weekly_hoursフィールドの型検証と正規化
   */
  static validateWeeklyHours(value: any): number {
    // 数値の場合はそのまま返す
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 10) {
      return value
    }

    // 文字列の数値の場合は変換
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10)
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 10) {
        return parsed
      }
    }

    // JSONオブジェクトや配列、巨大データは拒否
    if (typeof value === 'object' || Array.isArray(value)) {
      console.error('❌ weekly_hours に不正なオブジェクト型データが検出されました:', JSON.stringify(value).slice(0, 100))
      throw new Error('weekly_hours は整数値のみ許可されています')
    }

    // その他の不正な値
    console.error('❌ weekly_hours に不正な値が検出されました:', value)
    throw new Error('weekly_hours は 0-10 の整数値である必要があります')
  }

  /**
   * targetGradesフィールドの型検証と正規化
   */
  static validateTargetGrades(value: any): number[] {
    // 既に数値配列の場合
    if (Array.isArray(value) && value.every(v => typeof v === 'number' && [1, 2, 3].includes(v))) {
      return value
    }

    // JSON文字列の場合はパース
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
        if (Array.isArray(parsed) && parsed.every(v => typeof v === 'number' && [1, 2, 3].includes(v))) {
          return parsed
        }
      } catch (error) {
        console.error('❌ targetGrades のJSON解析に失敗:', value)
      }
    }

    // 不正な値の場合はデフォルト（全学年）
    console.warn('⚠️ targetGrades に不正な値、デフォルト値 [1,2,3] を使用:', value)
    return [1, 2, 3]
  }

  /**
   * 教科名の検証
   */
  static validateName(name: any): string {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('教科名は空でない文字列である必要があります')
    }
    if (name.length > 50) {
      throw new Error('教科名は50文字以内である必要があります')
    }
    return name.trim()
  }

  /**
   * 完全な教科データの検証とクリーンアップ
   */
  static validateAndCleanSubject(rawData: any): CleanSubjectData {
    try {
      const cleaned: CleanSubjectData = {
        id: rawData.id || '',
        name: this.validateName(rawData.name),
        weeklyHours: this.validateWeeklyHours(rawData.weekly_hours || rawData.weeklyHours || 1),
        targetGrades: this.validateTargetGrades(rawData.targetGrades || rawData.target_grades || [1, 2, 3]),
      }

      // オプション項目
      if (rawData.requiresSpecialClassroom !== undefined) {
        cleaned.requiresSpecialClassroom = Boolean(rawData.requiresSpecialClassroom)
      }
      if (rawData.classroomType && typeof rawData.classroomType === 'string') {
        cleaned.classroomType = rawData.classroomType
      }
      if (rawData.order !== undefined && typeof rawData.order === 'number') {
        cleaned.order = rawData.order
      }

      console.log(`✅ 教科データ検証成功: ${cleaned.name} (週${cleaned.weeklyHours}時間)`)
      return cleaned
    } catch (error) {
      console.error('❌ 教科データ検証エラー:', error, 'rawData:', JSON.stringify(rawData).slice(0, 200))
      throw error
    }
  }

  /**
   * 教科データ配列の一括検証
   */
  static validateAndCleanSubjects(rawSubjects: any[]): CleanSubjectData[] {
    if (!Array.isArray(rawSubjects)) {
      throw new Error('教科データは配列である必要があります')
    }

    const cleaned: CleanSubjectData[] = []
    const errors: Array<{ index: number; error: string; data: any }> = []

    for (let i = 0; i < rawSubjects.length; i++) {
      try {
        const cleanedSubject = this.validateAndCleanSubject(rawSubjects[i])
        cleaned.push(cleanedSubject)
      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: rawSubjects[i]
        })
      }
    }

    if (errors.length > 0) {
      console.error('❌ 教科データ一括検証でエラーが発生:', errors)
      // 一部のデータが不正でも、検証に成功したデータは返す
      console.log(`⚠️ ${errors.length}件のエラーがありましたが、${cleaned.length}件の有効なデータを返します`)
    }

    return cleaned
  }

  /**
   * データベースに保存前の最終検証
   */
  static validateForDatabase(data: CleanSubjectData): {
    id: string
    name: string
    weeklyHours: number // INTEGER型で保存
    targetGrades: string // JSON文字列で保存
    requiresSpecialClassroom?: number // INTEGER (0/1)
    classroomType?: string
    order?: number
  } {
    return {
      id: data.id,
      name: data.name,
      weeklyHours: data.weeklyHours, // INTEGER型として保存
      targetGrades: JSON.stringify(data.targetGrades), // JSON文字列として保存
      requiresSpecialClassroom: data.requiresSpecialClassroom ? 1 : 0,
      classroomType: data.classroomType || 'normal',
      order: data.order || 0
    }
  }
}