/**
 * 型安全API統合エクスポート
 */

import { ValidationError } from '@shared/schemas'
import { z } from 'zod'

// 型安全な型定義エクスポート
export type {
  Classroom,
  SchoolSettings,
  Subject,
  Teacher,
  TimetableDetail,
  TimetableGenerationResponse,
  TimetableListItem,
} from '@shared/schemas'

// 型安全なAPIクライアント
export { classroomApi } from './classroom'
export type { ApiOptions } from './client'
export { apiClient } from './client'
// 統合APIクライアント
export {
  classroomsApi,
  schoolSettingsApi,
  subjectsApi,
  teachersApi,
} from './integrated-api'
export { schoolApi } from './school'
export { subjectApi } from './subject'
export { teacherApi } from './teacher'
export { timetableApi } from './timetable'
export { timetableAdvancedValidator } from './timetable-advanced-validator'

// API呼び出し結果検証スキーマ - 基本的な型チェック
const ApiCallResultSchema = z.union([
  z.object({}), // オブジェクト型
  z.array(z.unknown()), // 配列型（要素は混合可能）
  z.string(), // 文字列型
  z.number(), // 数値型
  z.boolean(), // ブール型
  z.null(), // null型
  z.undefined(), // undefined型
])

// 型安全なヘルパー関数
const validateApiCall = async <T>(apiCall: Promise<T>): Promise<T> => {
  try {
    const result = await apiCall
    // 結果をそのまま返すが、基本的な型チェックを実行
    ApiCallResultSchema.parse(result)
    return result
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('API呼び出し結果の検証に失敗しました', error.errors)
    }
    throw error
  }
}

// 型安全なレガシー互換性レイヤー - 実際に使用されている検証機能のみ
export const timetableUtils = {
  // timetable-advanced-validator からの型安全なデリゲート
  calculateComplianceRate: async (
    ...args: Parameters<
      typeof import('./timetable-advanced-validator').timetableAdvancedValidator.calculateComplianceRate
    >
  ) => {
    try {
      const result = (
        await import('./timetable-advanced-validator')
      ).timetableAdvancedValidator.calculateComplianceRate(...args)
      return await validateApiCall(Promise.resolve(result))
    } catch (error) {
      console.error('calculateComplianceRate validation failed:', error)
      throw error
    }
  },

  addViolationInfo: async (
    ...args: Parameters<
      typeof import('./timetable-advanced-validator').timetableAdvancedValidator.addViolationInfo
    >
  ) => {
    try {
      const result = (
        await import('./timetable-advanced-validator')
      ).timetableAdvancedValidator.addViolationInfo(...args)
      return await validateApiCall(Promise.resolve(result))
    } catch (error) {
      console.error('addViolationInfo validation failed:', error)
      throw error
    }
  },

  validateTimetableConstraints: async (
    ...args: Parameters<
      typeof import('./timetable-advanced-validator').timetableAdvancedValidator.validateTimetableConstraints
    >
  ) => {
    try {
      const result = (
        await import('./timetable-advanced-validator')
      ).timetableAdvancedValidator.validateTimetableConstraints(...args)
      return await validateApiCall(Promise.resolve(result))
    } catch (error) {
      console.error('validateTimetableConstraints validation failed:', error)
      throw error
    }
  },

  validateSchoolWideTimetableConstraints: async (
    ...args: Parameters<
      typeof import('./timetable-advanced-validator').timetableAdvancedValidator.validateSchoolWideTimetableConstraints
    >
  ) => {
    try {
      const result = (
        await import('./timetable-advanced-validator')
      ).timetableAdvancedValidator.validateSchoolWideTimetableConstraints(...args)
      return await validateApiCall(Promise.resolve(result))
    } catch (error) {
      console.error('validateSchoolWideTimetableConstraints validation failed:', error)
      throw error
    }
  },

  validateTimetableConstraintsEnhanced: async (
    ...args: Parameters<
      typeof import('./timetable-advanced-validator').timetableAdvancedValidator.validateTimetableConstraintsEnhanced
    >
  ) => {
    try {
      const result = (
        await import('./timetable-advanced-validator')
      ).timetableAdvancedValidator.validateTimetableConstraintsEnhanced(...args)
      return await validateApiCall(Promise.resolve(result))
    } catch (error) {
      console.error('validateTimetableConstraintsEnhanced validation failed:', error)
      throw error
    }
  },
}
