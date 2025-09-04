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
export { conditionsApi } from './conditions'
export { dashboardApi } from './dashboard'
export { schoolApi } from './school'
export { subjectApi } from './subject'
export { teacherApi } from './teacher'
export { timetableApi } from './timetable'
export { timetableAdvancedValidator } from './timetable-advanced-validator'
export { timetableConverter } from './timetable-converter'
export { timetableGenerator } from './timetable-generator'
export { timetableValidator } from './timetable-validator'

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

// 型安全なレガシー互換性レイヤー - 既存コードとの互換性を維持
export const timetableUtils = {
  // timetable-converter からの型安全なデリゲート
  convertToDisplayFormat: async (
    ...args: Parameters<
      typeof import('./timetable-converter').timetableConverter.convertToDisplayFormat
    >
  ) => {
    try {
      const result = (
        await import('./timetable-converter')
      ).timetableConverter.convertToDisplayFormat(...args)
      return await validateApiCall(Promise.resolve(result))
    } catch (error) {
      console.error('convertToDisplayFormat validation failed:', error)
      throw error
    }
  },

  convertFromGeneratedFormat: async (
    ...args: Parameters<
      typeof import('./timetable-converter').timetableConverter.convertFromGeneratedFormat
    >
  ) => {
    try {
      const result = (
        await import('./timetable-converter')
      ).timetableConverter.convertFromGeneratedFormat(...args)
      return await validateApiCall(Promise.resolve(result))
    } catch (error) {
      console.error('convertFromGeneratedFormat validation failed:', error)
      throw error
    }
  },

  // timetable-generator からの型安全なデリゲート
  generateEmptyTimetable: async (
    ...args: Parameters<
      typeof import('./timetable-generator').timetableGenerator.generateEmptyTimetable
    >
  ) => {
    try {
      const result = (
        await import('./timetable-generator')
      ).timetableGenerator.generateEmptyTimetable(...args)
      return await validateApiCall(Promise.resolve(result))
    } catch (error) {
      console.error('generateEmptyTimetable validation failed:', error)
      throw error
    }
  },

  generateDiversifiedEmptyTimetable: async (
    ...args: Parameters<
      typeof import('./timetable-generator').timetableGenerator.generateDiversifiedEmptyTimetable
    >
  ) => {
    try {
      const result = (
        await import('./timetable-generator')
      ).timetableGenerator.generateDiversifiedEmptyTimetable(...args)
      return await validateApiCall(Promise.resolve(result))
    } catch (error) {
      console.error('generateDiversifiedEmptyTimetable validation failed:', error)
      throw error
    }
  },

  generateUniqueSlotForClass: async (
    ...args: Parameters<
      typeof import('./timetable-generator').timetableGenerator.generateUniqueSlotForClass
    >
  ) => {
    try {
      const result = (
        await import('./timetable-generator')
      ).timetableGenerator.generateUniqueSlotForClass(...args)
      return await validateApiCall(Promise.resolve(result))
    } catch (error) {
      console.error('generateUniqueSlotForClass validation failed:', error)
      throw error
    }
  },

  diversifyClassData: async (
    ...args: Parameters<
      typeof import('./timetable-generator').timetableGenerator.diversifyClassData
    >
  ) => {
    try {
      const result = (await import('./timetable-generator')).timetableGenerator.diversifyClassData(
        ...args
      )
      return await validateApiCall(Promise.resolve(result))
    } catch (error) {
      console.error('diversifyClassData validation failed:', error)
      throw error
    }
  },

  fillEmptySlots: async (
    ...args: Parameters<typeof import('./timetable-generator').timetableGenerator.fillEmptySlots>
  ) => {
    try {
      const result = (await import('./timetable-generator')).timetableGenerator.fillEmptySlots(
        ...args
      )
      return await validateApiCall(Promise.resolve(result))
    } catch (error) {
      console.error('fillEmptySlots validation failed:', error)
      throw error
    }
  },

  fillEmptySlotsWithConflictAvoidance: async (
    ...args: Parameters<
      typeof import('./timetable-generator').timetableGenerator.fillEmptySlotsWithConflictAvoidance
    >
  ) => {
    try {
      const result = (
        await import('./timetable-generator')
      ).timetableGenerator.fillEmptySlotsWithConflictAvoidance(...args)
      return await validateApiCall(Promise.resolve(result))
    } catch (error) {
      console.error('fillEmptySlotsWithConflictAvoidance validation failed:', error)
      throw error
    }
  },

  generateClassTimetableData: async (
    ...args: Parameters<
      typeof import('./timetable-generator').timetableGenerator.generateClassTimetableData
    >
  ) => {
    try {
      const result = (
        await import('./timetable-generator')
      ).timetableGenerator.generateClassTimetableData(...args)
      return await validateApiCall(Promise.resolve(result))
    } catch (error) {
      console.error('generateClassTimetableData validation failed:', error)
      throw error
    }
  },

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
