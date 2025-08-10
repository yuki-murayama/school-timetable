/**
 * API統合エクスポート
 */

// 型定義
export type {
  Classroom,
  SchoolSettings,
  Subject,
  Teacher,
  TimetableDetail,
  TimetableGenerationResponse,
  TimetableListItem,
} from '../../../shared/types'
export { classroomApi } from './classroom'
// 共通クライアント
export type { ApiOptions } from './client'
export { apiClient } from './client'
export { conditionsApi } from './conditions'
export { dashboardApi } from './dashboard'
// ドメイン別API
export { schoolApi } from './school'
export { subjectApi } from './subject'
export { teacherApi } from './teacher'
export { timetableApi } from './timetable'
export { timetableAdvancedValidator } from './timetable-advanced-validator'
// ユーティリティ
export { timetableConverter } from './timetable-converter'
export { timetableGenerator } from './timetable-generator'
export { timetableValidator } from './timetable-validator'

// レガシー互換性レイヤー - 既存コードとの互換性を維持
export const timetableUtils = {
  // timetable-converter からのデリゲート
  convertToDisplayFormat: async (
    ...args: Parameters<
      typeof import('./timetable-converter').timetableConverter.convertToDisplayFormat
    >
  ) => (await import('./timetable-converter')).timetableConverter.convertToDisplayFormat(...args),

  convertFromGeneratedFormat: async (
    ...args: Parameters<
      typeof import('./timetable-converter').timetableConverter.convertFromGeneratedFormat
    >
  ) =>
    (await import('./timetable-converter')).timetableConverter.convertFromGeneratedFormat(...args),

  // timetable-generator からのデリゲート
  generateEmptyTimetable: async (
    ...args: Parameters<
      typeof import('./timetable-generator').timetableGenerator.generateEmptyTimetable
    >
  ) => (await import('./timetable-generator')).timetableGenerator.generateEmptyTimetable(...args),

  generateDiversifiedEmptyTimetable: async (
    ...args: Parameters<
      typeof import('./timetable-generator').timetableGenerator.generateDiversifiedEmptyTimetable
    >
  ) =>
    (await import('./timetable-generator')).timetableGenerator.generateDiversifiedEmptyTimetable(
      ...args
    ),

  generateUniqueSlotForClass: async (
    ...args: Parameters<
      typeof import('./timetable-generator').timetableGenerator.generateUniqueSlotForClass
    >
  ) =>
    (await import('./timetable-generator')).timetableGenerator.generateUniqueSlotForClass(...args),

  diversifyClassData: async (
    ...args: Parameters<
      typeof import('./timetable-generator').timetableGenerator.diversifyClassData
    >
  ) => (await import('./timetable-generator')).timetableGenerator.diversifyClassData(...args),

  fillEmptySlots: async (
    ...args: Parameters<typeof import('./timetable-generator').timetableGenerator.fillEmptySlots>
  ) => (await import('./timetable-generator')).timetableGenerator.fillEmptySlots(...args),

  fillEmptySlotsWithConflictAvoidance: async (
    ...args: Parameters<
      typeof import('./timetable-generator').timetableGenerator.fillEmptySlotsWithConflictAvoidance
    >
  ) =>
    (await import('./timetable-generator')).timetableGenerator.fillEmptySlotsWithConflictAvoidance(
      ...args
    ),

  generateClassTimetableData: async (
    ...args: Parameters<
      typeof import('./timetable-generator').timetableGenerator.generateClassTimetableData
    >
  ) =>
    (await import('./timetable-generator')).timetableGenerator.generateClassTimetableData(...args),

  // timetable-advanced-validator からのデリゲート
  calculateComplianceRate: async (
    ...args: Parameters<
      typeof import('./timetable-advanced-validator').timetableAdvancedValidator.calculateComplianceRate
    >
  ) =>
    (
      await import('./timetable-advanced-validator')
    ).timetableAdvancedValidator.calculateComplianceRate(...args),

  addViolationInfo: async (
    ...args: Parameters<
      typeof import('./timetable-advanced-validator').timetableAdvancedValidator.addViolationInfo
    >
  ) =>
    (await import('./timetable-advanced-validator')).timetableAdvancedValidator.addViolationInfo(
      ...args
    ),

  validateTimetableConstraints: async (
    ...args: Parameters<
      typeof import('./timetable-advanced-validator').timetableAdvancedValidator.validateTimetableConstraints
    >
  ) =>
    (
      await import('./timetable-advanced-validator')
    ).timetableAdvancedValidator.validateTimetableConstraints(...args),

  validateSchoolWideTimetableConstraints: async (
    ...args: Parameters<
      typeof import('./timetable-advanced-validator').timetableAdvancedValidator.validateSchoolWideTimetableConstraints
    >
  ) =>
    (
      await import('./timetable-advanced-validator')
    ).timetableAdvancedValidator.validateSchoolWideTimetableConstraints(...args),

  validateTimetableConstraintsEnhanced: async (
    ...args: Parameters<
      typeof import('./timetable-advanced-validator').timetableAdvancedValidator.validateTimetableConstraintsEnhanced
    >
  ) =>
    (
      await import('./timetable-advanced-validator')
    ).timetableAdvancedValidator.validateTimetableConstraintsEnhanced(...args),
}
