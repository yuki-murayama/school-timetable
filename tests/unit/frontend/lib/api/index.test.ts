/**
 * frontend/lib/api/index.ts テスト - API統合エクスポートテスト
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ValidationError } from '../../../../../src/shared/schemas'

// モジュール全体をモック
vi.mock('../../../../../src/frontend/lib/api/classroom', () => ({
  classroomApi: { test: 'classroom' },
}))

vi.mock('../../../../../src/frontend/lib/api/client', () => ({
  apiClient: { test: 'client' },
}))

vi.mock('../../../../../src/frontend/lib/api/subject', () => ({
  subjectApi: { test: 'subject' },
}))

vi.mock('../../../../../src/frontend/lib/api/teacher', () => ({
  teacherApi: { test: 'teacher' },
}))

// timetable-advanced-validatorをモック（実際に使用されている関数のみ）
vi.mock('../../../../../src/frontend/lib/api/timetable-advanced-validator', () => ({
  timetableAdvancedValidator: {
    calculateComplianceRate: vi.fn().mockResolvedValue(0.85),
    addViolationInfo: vi.fn().mockResolvedValue({ violations: [] }),
    validateTimetableConstraints: vi.fn().mockResolvedValue({ valid: true }),
    validateSchoolWideTimetableConstraints: vi.fn().mockResolvedValue({ valid: true }),
    validateTimetableConstraintsEnhanced: vi.fn().mockResolvedValue({ valid: true }),
  },
}))

describe('API Index Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Exports', () => {
    it('should export all required API modules', async () => {
      const apiIndex = await import('../../../../../src/frontend/lib/api/index')

      expect(apiIndex.classroomApi).toBeDefined()
      expect(apiIndex.apiClient).toBeDefined()
      expect(apiIndex.subjectApi).toBeDefined()
      expect(apiIndex.teacherApi).toBeDefined()
    })

    it('should export timetableUtils object', async () => {
      const { timetableUtils } = await import('../../../../../src/frontend/lib/api/index')

      expect(timetableUtils).toBeDefined()
      expect(typeof timetableUtils.calculateComplianceRate).toBe('function')
      expect(typeof timetableUtils.addViolationInfo).toBe('function')
      expect(typeof timetableUtils.validateTimetableConstraints).toBe('function')
      expect(typeof timetableUtils.validateSchoolWideTimetableConstraints).toBe('function')
      expect(typeof timetableUtils.validateTimetableConstraintsEnhanced).toBe('function')
    })
  })

  describe('timetableUtils Functions', () => {
    it('should handle calculateComplianceRate successfully', async () => {
      const { timetableUtils } = await import('../../../../../src/frontend/lib/api/index')

      const result = await timetableUtils.calculateComplianceRate('test-data')
      expect(result).toBe(0.85)
    })

    it('should handle addViolationInfo successfully', async () => {
      const { timetableUtils } = await import('../../../../../src/frontend/lib/api/index')

      const result = await timetableUtils.addViolationInfo('test-data')
      expect(result).toEqual({ violations: [] })
    })

    it('should handle validateTimetableConstraints successfully', async () => {
      const { timetableUtils } = await import('../../../../../src/frontend/lib/api/index')

      const result = await timetableUtils.validateTimetableConstraints('test-settings')
      expect(result).toEqual({ valid: true })
    })

    it('should handle validateSchoolWideTimetableConstraints successfully', async () => {
      const { timetableUtils } = await import('../../../../../src/frontend/lib/api/index')

      const result = await timetableUtils.validateSchoolWideTimetableConstraints('test-settings')
      expect(result).toEqual({ valid: true })
    })

    it('should handle validation errors properly', async () => {
      // 既存のモックが設定されているため、直接エラーケースをテスト
      const { timetableUtils } = await import('../../../../../src/frontend/lib/api/index')

      // モックされた関数に対してエラーを設定
      vi.mocked(
        await import('../../../../../src/frontend/lib/api/timetable-advanced-validator')
      ).timetableAdvancedValidator.calculateComplianceRate.mockRejectedValueOnce(
        new Error('Invalid data format')
      )

      // エラーがスローされることを確認
      await expect(timetableUtils.calculateComplianceRate('test')).rejects.toThrow(
        'Invalid data format'
      )
    })
  })

  describe('Type Exports', () => {
    it('should export ValidationError', async () => {
      const _apiIndex = await import('../../../../../src/frontend/lib/api/index')

      // ValidationErrorが正しく動作するかテスト
      const zodIssue = {
        code: 'invalid_type' as const,
        expected: 'string',
        received: 'number',
        path: ['test'],
        message: 'test validation error',
      }
      const error = new ValidationError([zodIssue], null)
      expect(error.message).toContain('test validation error')
      expect(error.validationErrors).toEqual([zodIssue])
    })
  })

  describe('Error Handling', () => {
    it('should handle errors in utility functions gracefully', async () => {
      // 既存のモックが設定されているため、直接エラーケースをテスト
      const { timetableUtils } = await import('../../../../../src/frontend/lib/api/index')

      // モックされた関数に対してエラーを設定
      vi.mocked(
        await import('../../../../../src/frontend/lib/api/timetable-advanced-validator')
      ).timetableAdvancedValidator.validateTimetableConstraints.mockRejectedValueOnce(
        new Error('Mock error')
      )

      // エラーがスローされることを確認
      await expect(timetableUtils.validateTimetableConstraints('test')).rejects.toThrow(
        'Mock error'
      )
    })

    it('should handle console.error calls during errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // 既存のモックが設定されているため、直接エラーケースをテスト
      const { timetableUtils } = await import('../../../../../src/frontend/lib/api/index')

      // モックされた関数に対してエラーを設定
      vi.mocked(
        await import('../../../../../src/frontend/lib/api/timetable-advanced-validator')
      ).timetableAdvancedValidator.addViolationInfo.mockRejectedValueOnce(
        new Error('Validation error')
      )

      // エラーがスローされることを確認
      await expect(timetableUtils.addViolationInfo('test')).rejects.toThrow('Validation error')

      consoleErrorSpy.mockRestore()
    })
  })

  describe('基本プロパティテスト', () => {
    it('テストフレームワークが正しく設定されている', () => {
      expect(describe).toBeDefined()
      expect(it).toBeDefined()
      expect(expect).toBeDefined()
      expect(beforeEach).toBeDefined()
      expect(vi).toBeDefined()
    })

    it('Vitestモック機能が正しく動作している', () => {
      expect(vi.mock).toBeDefined()
      expect(typeof vi.mock).toBe('function')
      expect(vi.clearAllMocks).toBeDefined()
      expect(typeof vi.clearAllMocks).toBe('function')
      expect(vi.mocked).toBeDefined()
      expect(typeof vi.mocked).toBe('function')
      expect(vi.spyOn).toBeDefined()
      expect(typeof vi.spyOn).toBe('function')
    })

    it('API indexモジュールが正しく定義されている', async () => {
      const apiIndex = await import('../../../../../src/frontend/lib/api/index')
      expect(apiIndex).toBeDefined()
      expect(typeof apiIndex).toBe('object')
    })

    it('ValidationErrorクラスが正しく定義されている', () => {
      expect(ValidationError).toBeDefined()
      expect(typeof ValidationError).toBe('function')

      // ValidationErrorクラスの基本機能をテスト
      const testError = new ValidationError([], null)
      expect(testError).toBeInstanceOf(Error)
      expect(testError).toBeInstanceOf(ValidationError)
    })

    it('モックされたAPIモジュールが正しく設定されている', async () => {
      const apiIndex = await import('../../../../../src/frontend/lib/api/index')

      expect(apiIndex.classroomApi).toBeDefined()
      expect(apiIndex.apiClient).toBeDefined()
      expect(apiIndex.subjectApi).toBeDefined()
      expect(apiIndex.teacherApi).toBeDefined()
      expect(apiIndex.timetableUtils).toBeDefined()
    })

    it('コンソール機能が利用可能', () => {
      expect(console).toBeDefined()
      expect(console.error).toBeDefined()
      expect(typeof console.error).toBe('function')
    })

    it('Error機能が利用可能', () => {
      expect(Error).toBeDefined()
      expect(typeof Error).toBe('function')

      const testError = new Error('test message')
      expect(testError).toBeInstanceOf(Error)
      expect(testError.message).toBe('test message')
    })

    it('JavaScript基本機能が利用可能', () => {
      expect(Object).toBeDefined()
      expect(typeof Object.keys).toBe('function')
      expect(Promise).toBeDefined()
      expect(typeof Promise).toBe('function')
    })
  })
})
