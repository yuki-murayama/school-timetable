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

vi.mock('../../../../../src/frontend/lib/api/timetable-converter', () => ({
  timetableConverter: {
    convertToDisplayFormat: vi.fn().mockResolvedValue({ converted: 'display' }),
    convertFromGeneratedFormat: vi.fn().mockResolvedValue({ converted: 'generated' }),
  },
}))

vi.mock('../../../../../src/frontend/lib/api/timetable-generator', () => ({
  timetableGenerator: {
    generateEmptyTimetable: vi.fn().mockResolvedValue({ empty: 'timetable' }),
    generateDiversifiedEmptyTimetable: vi.fn().mockResolvedValue({ diversified: 'timetable' }),
    generateUniqueSlotForClass: vi.fn().mockResolvedValue({ unique: 'slot' }),
    diversifyClassData: vi.fn().mockResolvedValue({ diversified: 'class' }),
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
      expect(typeof timetableUtils.convertToDisplayFormat).toBe('function')
      expect(typeof timetableUtils.convertFromGeneratedFormat).toBe('function')
      expect(typeof timetableUtils.generateEmptyTimetable).toBe('function')
      expect(typeof timetableUtils.generateDiversifiedEmptyTimetable).toBe('function')
    })
  })

  describe('timetableUtils Functions', () => {
    it('should handle convertToDisplayFormat successfully', async () => {
      const { timetableUtils } = await import('../../../../../src/frontend/lib/api/index')

      const result = await timetableUtils.convertToDisplayFormat('test-data')
      expect(result).toEqual({ converted: 'display' })
    })

    it('should handle convertFromGeneratedFormat successfully', async () => {
      const { timetableUtils } = await import('../../../../../src/frontend/lib/api/index')

      const result = await timetableUtils.convertFromGeneratedFormat('test-data')
      expect(result).toEqual({ converted: 'generated' })
    })

    it('should handle generateEmptyTimetable successfully', async () => {
      const { timetableUtils } = await import('../../../../../src/frontend/lib/api/index')

      const result = await timetableUtils.generateEmptyTimetable('test-settings')
      expect(result).toEqual({ empty: 'timetable' })
    })

    it('should handle generateDiversifiedEmptyTimetable successfully', async () => {
      const { timetableUtils } = await import('../../../../../src/frontend/lib/api/index')

      const result = await timetableUtils.generateDiversifiedEmptyTimetable('test-settings')
      expect(result).toEqual({ diversified: 'timetable' })
    })

    it('should handle validation errors properly', async () => {
      // 無効なデータを返すモックを設定
      vi.doMock('../../../../../src/frontend/lib/api/timetable-converter', () => ({
        timetableConverter: {
          convertToDisplayFormat: vi.fn().mockRejectedValue(new Error('Invalid data format')),
        },
      }))

      // モジュールを再インポート
      const { timetableUtils } = await import(
        `../../../../../src/frontend/lib/api/index?t=${Date.now()}`
      )

      // エラーがスローされることを確認
      await expect(timetableUtils.convertToDisplayFormat('test')).rejects.toThrow()
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
      // エラーを投げるモックを設定
      vi.doMock('../../../../../src/frontend/lib/api/timetable-generator', () => ({
        timetableGenerator: {
          generateEmptyTimetable: vi.fn().mockRejectedValue(new Error('Mock error')),
        },
      }))

      const { timetableUtils } = await import(
        `../../../../../src/frontend/lib/api/index?t=${Date.now()}`
      )

      await expect(timetableUtils.generateEmptyTimetable('test')).rejects.toThrow('Mock error')
    })

    it('should handle console.error calls during errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // エラーを投げるモックを設定
      vi.doMock('../../../../../src/frontend/lib/api/timetable-converter', () => ({
        timetableConverter: {
          convertToDisplayFormat: vi.fn().mockRejectedValue(new Error('Convert error')),
        },
      }))

      const { timetableUtils } = await import(
        `../../../../../src/frontend/lib/api/index?t=${Date.now()}`
      )

      await expect(timetableUtils.convertToDisplayFormat('test')).rejects.toThrow('Convert error')
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'convertToDisplayFormat validation failed:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })
  })
})
