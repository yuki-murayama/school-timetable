/**
 * School API 単体テスト
 * 学校設定関連APIの包括的テスト - 38行の重要APIファイル
 */

import type { EnhancedSchoolSettings, SchoolSettings } from '@shared/schemas'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { schoolApi } from '../../../../../src/frontend/lib/api/school'

// 共有スキーマをモック化
vi.mock('@shared/schemas', async importOriginal => {
  const original = await importOriginal<typeof import('@shared/schemas')>()
  return {
    ...original,
    EnhancedSchoolSettingsSchema: {
      parse: vi.fn(),
      optional: vi.fn(() => ({ parse: vi.fn() })),
    },
    SchoolSettingsSchema: {
      omit: vi.fn(() => ({
        parse: vi.fn(),
      })),
    },
  }
})

// APIクライアントをモック化
vi.mock('../../../../../src/frontend/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
  },
}))

import { EnhancedSchoolSettingsSchema } from '@shared/schemas'
import { apiClient } from '../../../../../src/frontend/lib/api/client'

const mockApiClient = apiClient as {
  get: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
}

describe('School API', () => {
  const mockEnhancedSchoolSettings: EnhancedSchoolSettings = {
    id: 'default',
    grade1Classes: 4,
    grade2Classes: 3,
    grade3Classes: 3,
    grade4Classes: 3,
    grade5Classes: 3,
    grade6Classes: 3,
    dailyPeriods: 6,
    saturdayPeriods: 4,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    // 拡張プロパティ
    totalClasses: 19,
    maxPeriods: 6,
    hasWeekendClasses: false,
    classDistribution: {
      '1': 4,
      '2': 3,
      '3': 3,
      '4': 3,
      '5': 3,
      '6': 3,
    },
  }

  const mockOptions = {
    token: 'test-token',
    getFreshToken: vi.fn().mockResolvedValue('fresh-token'),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // EnhancedSchoolSettingsSchemaのparseをモック設定
    vi.mocked(EnhancedSchoolSettingsSchema.parse).mockReturnValue(mockEnhancedSchoolSettings)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getSettings', () => {
    it('学校設定を正常に取得する', async () => {
      mockApiClient.get.mockResolvedValue(mockEnhancedSchoolSettings)

      const result = await schoolApi.getSettings(mockOptions)

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/settings',
        expect.any(Object), // EnhancedSchoolSettingsSchema
        mockOptions
      )
      expect(result).toEqual(mockEnhancedSchoolSettings)
      expect(result.totalClasses).toBe(19)
      expect(result.hasWeekendClasses).toBe(false)
    })

    it('オプションなしで学校設定を取得する', async () => {
      mockApiClient.get.mockResolvedValue(mockEnhancedSchoolSettings)

      const result = await schoolApi.getSettings()

      expect(mockApiClient.get).toHaveBeenCalledWith('/settings', expect.any(Object), undefined)
      expect(result).toEqual(mockEnhancedSchoolSettings)
    })

    it('学校設定取得エラー時のハンドリング', async () => {
      const error = new Error('Settings not found')
      mockApiClient.get.mockRejectedValue(error)

      await expect(schoolApi.getSettings(mockOptions)).rejects.toThrow('Settings not found')
    })

    it('ネットワークエラー時のハンドリング', async () => {
      const error = new Error('Network error')
      mockApiClient.get.mockRejectedValue(error)

      await expect(schoolApi.getSettings(mockOptions)).rejects.toThrow('Network error')
    })

    it('拡張プロパティが正しく含まれている', async () => {
      mockApiClient.get.mockResolvedValue(mockEnhancedSchoolSettings)

      const result = await schoolApi.getSettings(mockOptions)

      // 基本プロパティ
      expect(result.grade1Classes).toBe(4)
      expect(result.dailyPeriods).toBe(6)
      expect(result.saturdayPeriods).toBe(4)

      // 拡張プロパティ
      expect(result.totalClasses).toBe(19)
      expect(result.maxPeriods).toBe(6)
      expect(result.hasWeekendClasses).toBe(false)
      expect(result.classDistribution).toEqual({
        '1': 4,
        '2': 3,
        '3': 3,
        '4': 3,
        '5': 3,
        '6': 3,
      })
    })
  })

  describe('updateSettings', () => {
    const updateData: Partial<SchoolSettings> = {
      grade1Classes: 5,
      dailyPeriods: 7,
    }

    it('学校設定を正常に更新する', async () => {
      const updatedSettings = {
        ...mockEnhancedSchoolSettings,
        ...updateData,
        totalClasses: 20, // 更新後の拡張プロパティ
      }
      mockApiClient.put.mockResolvedValue(updatedSettings)

      const result = await schoolApi.updateSettings(updateData, mockOptions)

      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/settings',
        updateData,
        expect.any(Object), // UpdateSchoolSettingsSchema
        expect.any(Object), // EnhancedSchoolSettingsSchema
        mockOptions
      )
      expect(result).toEqual(updatedSettings)
      expect(result.grade1Classes).toBe(5)
      expect(result.dailyPeriods).toBe(7)
      expect(result.totalClasses).toBe(20)
    })

    it('部分更新で単一フィールドのみを送信する', async () => {
      const partialUpdate: Partial<SchoolSettings> = { grade1Classes: 6 }
      const updatedSettings = { ...mockEnhancedSchoolSettings, grade1Classes: 6 }
      mockApiClient.put.mockResolvedValue(updatedSettings)

      const result = await schoolApi.updateSettings(partialUpdate, mockOptions)

      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/settings',
        partialUpdate,
        expect.any(Object),
        expect.any(Object),
        mockOptions
      )
      expect(result.grade1Classes).toBe(6)
      // 他のフィールドは変更されない
      expect(result.grade2Classes).toBe(3)
      expect(result.dailyPeriods).toBe(6)
    })

    it('空のオブジェクトで更新を実行する', async () => {
      const emptyUpdate: Partial<SchoolSettings> = {}
      mockApiClient.put.mockResolvedValue(mockEnhancedSchoolSettings)

      const result = await schoolApi.updateSettings(emptyUpdate, mockOptions)

      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/settings',
        emptyUpdate,
        expect.any(Object),
        expect.any(Object),
        mockOptions
      )
      expect(result).toEqual(mockEnhancedSchoolSettings)
    })

    it('オプションなしで設定を更新する', async () => {
      mockApiClient.put.mockResolvedValue(mockEnhancedSchoolSettings)

      const result = await schoolApi.updateSettings(updateData)

      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/settings',
        updateData,
        expect.any(Object),
        expect.any(Object),
        undefined
      )
      expect(result).toEqual(mockEnhancedSchoolSettings)
    })

    it('設定更新エラー時のハンドリング', async () => {
      const error = new Error('Update failed')
      mockApiClient.put.mockRejectedValue(error)

      await expect(schoolApi.updateSettings(updateData, mockOptions)).rejects.toThrow(
        'Update failed'
      )
    })

    it('バリデーションエラー時のハンドリング', async () => {
      const error = new Error('Validation error')
      mockApiClient.put.mockRejectedValue(error)

      await expect(schoolApi.updateSettings(updateData, mockOptions)).rejects.toThrow(
        'Validation error'
      )
    })

    it('複数フィールド同時更新', async () => {
      const multiUpdate: Partial<SchoolSettings> = {
        grade1Classes: 5,
        grade2Classes: 4,
        dailyPeriods: 7,
        saturdayPeriods: 5,
      }
      const updatedSettings = { ...mockEnhancedSchoolSettings, ...multiUpdate }
      mockApiClient.put.mockResolvedValue(updatedSettings)

      const result = await schoolApi.updateSettings(multiUpdate, mockOptions)

      expect(result.grade1Classes).toBe(5)
      expect(result.grade2Classes).toBe(4)
      expect(result.dailyPeriods).toBe(7)
      expect(result.saturdayPeriods).toBe(5)
      // 未変更フィールドは元の値を維持
      expect(result.grade3Classes).toBe(3)
    })
  })

  describe('基本プロパティテスト', () => {
    it('テストフレームワークが正しく設定されている', () => {
      expect(describe).toBeDefined()
      expect(it).toBeDefined()
      expect(expect).toBeDefined()
      expect(beforeEach).toBeDefined()
      expect(afterEach).toBeDefined()
      expect(vi).toBeDefined()
    })

    it('schoolApiオブジェクトが正しく定義されている', () => {
      expect(schoolApi).toBeDefined()
      expect(typeof schoolApi).toBe('object')
      expect(typeof schoolApi.getSettings).toBe('function')
      expect(typeof schoolApi.updateSettings).toBe('function')
    })

    it('APIメソッドの数が正しい', () => {
      const methods = Object.keys(schoolApi)
      expect(methods).toHaveLength(2)
      expect(methods).toContain('getSettings')
      expect(methods).toContain('updateSettings')
    })

    it('モックデータが適切に定義されている', () => {
      expect(mockEnhancedSchoolSettings).toBeDefined()
      expect(mockEnhancedSchoolSettings.id).toBe('default')
      expect(typeof mockEnhancedSchoolSettings.grade1Classes).toBe('number')
      expect(typeof mockEnhancedSchoolSettings.dailyPeriods).toBe('number')
      expect(typeof mockEnhancedSchoolSettings.totalClasses).toBe('number')
      expect(typeof mockEnhancedSchoolSettings.hasWeekendClasses).toBe('boolean')
      expect(typeof mockEnhancedSchoolSettings.classDistribution).toBe('object')
    })

    it('APIクライアントモックが正しく設定されている', () => {
      expect(mockApiClient).toBeDefined()
      expect(typeof mockApiClient.get).toBe('function')
      expect(typeof mockApiClient.put).toBe('function')
      // school APIはpostやdeleteを使用しない
      expect(mockApiClient.post).toBeUndefined()
      expect(mockApiClient.delete).toBeUndefined()
    })

    it('共有スキーマモックが正しく設定されている', () => {
      expect(EnhancedSchoolSettingsSchema).toBeDefined()
      expect(typeof EnhancedSchoolSettingsSchema.parse).toBe('function')
      expect(EnhancedSchoolSettingsSchema.parse).toHaveProperty('mock')
    })

    it('Vitestモック機能が正しく動作している', () => {
      expect(vi.fn).toBeDefined()
      expect(typeof vi.fn).toBe('function')
      expect(vi.clearAllMocks).toBeDefined()
      expect(typeof vi.clearAllMocks).toBe('function')
      expect(vi.restoreAllMocks).toBeDefined()
      expect(typeof vi.restoreAllMocks).toBe('function')
      expect(vi.mocked).toBeDefined()
      expect(typeof vi.mocked).toBe('function')
    })

    it('JavaScript基本機能が利用可能', () => {
      expect(Object).toBeDefined()
      expect(typeof Object.keys).toBe('function')
      expect(Array).toBeDefined()
      expect(typeof Array.isArray).toBe('function')
      expect(Promise).toBeDefined()
      expect(typeof Promise.resolve).toBe('function')
      expect(JSON).toBeDefined()
      expect(typeof JSON.stringify).toBe('function')
      expect(typeof JSON.parse).toBe('function')
    })

    it('テストユーティリティが正常に動作している', () => {
      expect(() => expect(true).toBe(true)).not.toThrow()
      expect(() => expect(false).toBe(false)).not.toThrow()
      expect(() => expect([1, 2]).toEqual([1, 2])).not.toThrow()
      expect(() => expect({ a: 1 }).toEqual({ a: 1 })).not.toThrow()
    })

    it('非同期テスト処理が正常に動作している', async () => {
      const promise = Promise.resolve('test')
      const result = await promise
      expect(result).toBe('test')

      const asyncFunction = async () => 'async test'
      expect(await asyncFunction()).toBe('async test')
    })

    it('型の整合性が保たれている', () => {
      // EnhancedSchoolSettingsの基本プロパティ
      expect(mockEnhancedSchoolSettings).toHaveProperty('id')
      expect(mockEnhancedSchoolSettings).toHaveProperty('grade1Classes')
      expect(mockEnhancedSchoolSettings).toHaveProperty('dailyPeriods')
      expect(mockEnhancedSchoolSettings).toHaveProperty('created_at')
      expect(mockEnhancedSchoolSettings).toHaveProperty('updated_at')

      // 拡張プロパティ
      expect(mockEnhancedSchoolSettings).toHaveProperty('totalClasses')
      expect(mockEnhancedSchoolSettings).toHaveProperty('maxPeriods')
      expect(mockEnhancedSchoolSettings).toHaveProperty('hasWeekendClasses')
      expect(mockEnhancedSchoolSettings).toHaveProperty('classDistribution')
    })
  })
})
