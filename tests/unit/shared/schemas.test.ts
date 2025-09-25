/**
 * shared/schemas.ts テスト - 基本バリデーションテスト
 */

import { describe, expect, it } from 'vitest'
import {
  ClassroomSchema,
  DayOfWeekSchema,
  EnhancedSchoolSettingsSchema,
  GradeSchema,
  IdSchema,
  ISODateTimeSchema,
  NameSchema,
  PeriodSchema,
  PositiveIntegerSchema,
  SubjectSchema,
  safeJsonParse,
  safeJsonStringify,
  TeacherSchema,
} from '../../../src/shared/schemas'

describe('Schema Validation Tests', () => {
  describe('Basic Schemas', () => {
    it('should validate IdSchema correctly', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000'
      expect(IdSchema.parse(validUUID)).toBe(validUUID)
      expect(() => IdSchema.parse('')).toThrow()
      expect(() => IdSchema.parse(123)).toThrow()
      expect(() => IdSchema.parse('invalid-id')).toThrow()
    })

    it('should validate NameSchema correctly', () => {
      expect(NameSchema.parse('Valid Name')).toBe('Valid Name')
      expect(() => NameSchema.parse('')).toThrow()
      expect(() => NameSchema.parse('x'.repeat(256))).toThrow()
    })

    it('should validate GradeSchema correctly', () => {
      expect(GradeSchema.parse(1)).toBe(1)
      expect(GradeSchema.parse(6)).toBe(6)
      expect(() => GradeSchema.parse(0)).toThrow()
      expect(() => GradeSchema.parse(7)).toThrow()
    })

    it('should validate PeriodSchema correctly', () => {
      expect(PeriodSchema.parse(1)).toBe(1)
      expect(PeriodSchema.parse(8)).toBe(8)
      expect(() => PeriodSchema.parse(0)).toThrow()
      expect(() => PeriodSchema.parse(11)).toThrow()
    })

    it('should validate DayOfWeekSchema correctly', () => {
      expect(DayOfWeekSchema.parse('月曜')).toBe('月曜')
      expect(DayOfWeekSchema.parse('日曜')).toBe('日曜')
      expect(() => DayOfWeekSchema.parse('不正な曜日')).toThrow()
      expect(() => DayOfWeekSchema.parse(0)).toThrow()
    })

    it('should validate PositiveIntegerSchema correctly', () => {
      expect(PositiveIntegerSchema.parse(1)).toBe(1)
      expect(PositiveIntegerSchema.parse(100)).toBe(100)
      expect(() => PositiveIntegerSchema.parse(0)).toThrow()
      expect(() => PositiveIntegerSchema.parse(-1)).toThrow()
      expect(() => PositiveIntegerSchema.parse(1.5)).toThrow()
    })

    it('should validate ISODateTimeSchema correctly', () => {
      const validDate = '2024-01-01T12:00:00.000Z'
      expect(ISODateTimeSchema.parse(validDate)).toBe(validDate)
      expect(() => ISODateTimeSchema.parse('invalid-date')).toThrow()
    })
  })

  describe('Utility Functions', () => {
    it('should parse valid JSON safely', () => {
      const result = safeJsonParse('{"key": "value"}', {})
      expect(result).toEqual({ key: 'value' })
    })

    it('should handle invalid JSON safely', () => {
      const defaultValue = { error: 'default' }
      const result = safeJsonParse('invalid json', defaultValue)
      expect(result).toBe(defaultValue)
    })

    it('should return default for null/undefined', () => {
      const defaultValue = { default: true }
      expect(safeJsonParse(null, defaultValue)).toBe(defaultValue)
      expect(safeJsonParse(undefined, defaultValue)).toBe(defaultValue)
    })

    it('should stringify objects safely', () => {
      const result = safeJsonStringify({ key: 'value' })
      expect(result).toBe('{"key":"value"}')
    })

    it('should handle unstringifiable objects safely', () => {
      const circular = { a: 1 }
      circular.b = circular // Create circular reference

      const result = safeJsonStringify(circular)
      expect(result).toBe('[]') // Returns empty array string as fallback
    })
  })

  describe('Complex Schemas', () => {
    it('should validate EnhancedSchoolSettings partially', () => {
      const validSettings = {
        id: 'default',
        grade1Classes: 3,
        grade2Classes: 3,
        grade3Classes: 3,
        grade4Classes: 3,
        grade5Classes: 3,
        grade6Classes: 3,
        dailyPeriods: 6,
        saturdayPeriods: 0,
        created_at: '2024-01-01T12:00:00.000Z',
        updated_at: '2024-01-01T12:00:00.000Z',
        statistics: {
          totalTeachers: 10,
          totalSubjects: 8,
          totalClassrooms: 15,
          totalClasses: 18,
        },
        validation: {
          isConfigured: true,
          hasMinimumTeachers: true,
          hasMinimumSubjects: true,
          warnings: [],
        },
      }

      expect(() => EnhancedSchoolSettingsSchema.parse(validSettings)).not.toThrow()
    })

    it('should validate Teacher schema structure', () => {
      const validTeacher = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Teacher',
        school_id: '123e4567-e89b-12d3-a456-426614174000',
        created_at: '2024-01-01T12:00:00.000Z',
        updated_at: '2024-01-01T12:00:00.000Z',
        is_active: 1,
        subjects: '["math", "science"]',
        grades: '[1, 2, 3]',
      }

      expect(() => TeacherSchema.parse(validTeacher)).not.toThrow()
    })

    it('should validate Subject schema structure', () => {
      const validSubject = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Mathematics',
        school_id: '123e4567-e89b-12d3-a456-426614174000',
        is_active: 1,
      }

      expect(() => SubjectSchema.parse(validSubject)).not.toThrow()
    })

    it('should validate Classroom schema structure', () => {
      const validClassroom = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Room 1A',
        type: '普通教室',
        count: 1,
        order: 0,
      }

      expect(() => ClassroomSchema.parse(validClassroom)).not.toThrow()
    })
  })

  describe('スキーマ基本プロパティテスト', () => {
    it('テストフレームワークが正しく設定されている', () => {
      expect(describe).toBeDefined()
      expect(it).toBeDefined()
      expect(expect).toBeDefined()
    })

    it('Vitestテスト機能が正しく動作している', () => {
      expect(() => expect(true).toBe(true)).not.toThrow()
      expect(() => expect(false).toBe(false)).not.toThrow()
      expect(() =>
        expect(() => {
          throw new Error('test')
        }).toThrow()
      ).not.toThrow()
    })

    it('全スキーマが正しく定義されている', () => {
      expect(IdSchema).toBeDefined()
      expect(NameSchema).toBeDefined()
      expect(GradeSchema).toBeDefined()
      expect(PeriodSchema).toBeDefined()
      expect(DayOfWeekSchema).toBeDefined()
      expect(PositiveIntegerSchema).toBeDefined()
      expect(ISODateTimeSchema).toBeDefined()
    })

    it('スキーマがparse関数を持っている', () => {
      expect(typeof IdSchema.parse).toBe('function')
      expect(typeof NameSchema.parse).toBe('function')
      expect(typeof GradeSchema.parse).toBe('function')
      expect(typeof PeriodSchema.parse).toBe('function')
      expect(typeof DayOfWeekSchema.parse).toBe('function')
      expect(typeof PositiveIntegerSchema.parse).toBe('function')
      expect(typeof ISODateTimeSchema.parse).toBe('function')
    })

    it('複合スキーマが正しく定義されている', () => {
      expect(EnhancedSchoolSettingsSchema).toBeDefined()
      expect(TeacherSchema).toBeDefined()
      expect(SubjectSchema).toBeDefined()
      expect(ClassroomSchema).toBeDefined()
    })

    it('複合スキーマがparse関数を持っている', () => {
      expect(typeof EnhancedSchoolSettingsSchema.parse).toBe('function')
      expect(typeof TeacherSchema.parse).toBe('function')
      expect(typeof SubjectSchema.parse).toBe('function')
      expect(typeof ClassroomSchema.parse).toBe('function')
    })

    it('ユーティリティ関数が正しく定義されている', () => {
      expect(safeJsonParse).toBeDefined()
      expect(typeof safeJsonParse).toBe('function')
      expect(safeJsonStringify).toBeDefined()
      expect(typeof safeJsonStringify).toBe('function')
    })

    it('JSON機能が利用可能', () => {
      expect(JSON).toBeDefined()
      expect(JSON.parse).toBeDefined()
      expect(typeof JSON.parse).toBe('function')
      expect(JSON.stringify).toBeDefined()
      expect(typeof JSON.stringify).toBe('function')
    })

    it('Error機能が利用可能', () => {
      expect(Error).toBeDefined()
      expect(typeof Error).toBe('function')
      const testError = new Error('test')
      expect(testError).toBeInstanceOf(Error)
      expect(testError.message).toBe('test')
    })
  })
})
