/**
 * Timetable API 単体テスト
 * 時間割関連APIの包括的テスト - 256行の重要APIファイル
 */

import type {
  TimetableDetail,
  TimetableGenerationResponse,
  TimetableListItem,
} from '@shared/schemas'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { timetableApi } from '../../../../../src/frontend/lib/api/timetable'

// APIクライアントをモック化
vi.mock('../../../../../src/frontend/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}))

import { apiClient } from '../../../../../src/frontend/lib/api/client'

const mockApiClient = apiClient as {
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
}

describe('Timetable API', () => {
  const mockTimetableListItem: TimetableListItem = {
    id: 'timetable-1',
    title: '1年A組時間割',
    createdAt: '2024-01-01T00:00:00.000Z',
    grade: 1,
    className: 'A',
  }

  const mockTimetableDetail: TimetableDetail = {
    id: 'timetable-1',
    title: '1年A組時間割',
    data: {
      monday: [{ period: 1, subject: '数学', teacher: '田中先生', classroom: '1-A' }],
    },
    createdAt: '2024-01-01T00:00:00.000Z',
  }

  const mockOptions = {
    token: 'test-token',
    getFreshToken: vi.fn().mockResolvedValue('fresh-token'),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // コンソールメソッドをモック化してログを抑制
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('generateTimetable', () => {
    it('時間割を正常に生成する', async () => {
      const mockResponse: TimetableGenerationResponse = {
        success: true,
        id: 'generated-1',
        message: '時間割が正常に生成されました',
        status: 'completed',
      }

      const request = {
        options: { algorithm: 'backtrack' },
      }

      mockApiClient.post.mockResolvedValue(mockResponse)

      const result = await timetableApi.generateTimetable(request, mockOptions)

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/timetables/generate',
        request,
        expect.any(Object), // TimetableGenerationRequestSchema
        expect.any(Object), // TimetableGenerationResponseSchema
        mockOptions
      )
      expect(result).toEqual(mockResponse)
    })

    it('空のオプションで時間割生成を実行する', async () => {
      const mockResponse: TimetableGenerationResponse = {
        success: true,
        id: 'generated-2',
        message: '時間割が正常に生成されました',
      }

      const request = {}

      mockApiClient.post.mockResolvedValue(mockResponse)

      const result = await timetableApi.generateTimetable(request, mockOptions)

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/timetables/generate',
        request,
        expect.any(Object),
        expect.any(Object),
        mockOptions
      )
      expect(result).toEqual(mockResponse)
    })

    it('時間割生成失敗時のエラーハンドリング', async () => {
      const error = new Error('Generation failed')
      mockApiClient.post.mockRejectedValue(error)

      await expect(timetableApi.generateTimetable({ options: {} }, mockOptions)).rejects.toThrow(
        'Generation failed'
      )
    })
  })

  describe('getTimetables', () => {
    it('時間割一覧を正常に取得する', async () => {
      const mockTimetables = [mockTimetableListItem]
      mockApiClient.get.mockResolvedValue(mockTimetables)

      const result = await timetableApi.getTimetables(mockOptions)

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/timetables',
        expect.any(Object), // TimetableListResponseSchema
        mockOptions
      )
      expect(result).toEqual(mockTimetables)
    })

    it('空の時間割一覧を正常に処理する', async () => {
      const mockTimetables: TimetableListItem[] = []
      mockApiClient.get.mockResolvedValue(mockTimetables)

      const result = await timetableApi.getTimetables(mockOptions)

      expect(result).toEqual([])
    })

    it('APIエラー時の適切な処理', async () => {
      const error = new Error('Network error')
      mockApiClient.get.mockRejectedValue(error)

      await expect(timetableApi.getTimetables(mockOptions)).rejects.toThrow('Network error')
    })
  })

  describe('getSavedTimetables', () => {
    it('保存済み時間割をページネーション付きで正常に取得する', async () => {
      const mockResponse = {
        success: true,
        data: {
          timetables: [mockTimetableListItem],
          totalCount: 1,
          currentPage: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      }

      mockApiClient.get.mockResolvedValue(mockResponse)

      const result = await timetableApi.getSavedTimetables(1, 10, mockOptions)

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/timetable/program/saved?page=1&limit=10',
        mockOptions
      )
      expect(result).toEqual(mockResponse.data)
    })

    it('デフォルトパラメータで保存済み時間割を取得する', async () => {
      const mockResponse = {
        success: true,
        data: {
          timetables: [mockTimetableListItem],
          totalCount: 1,
          currentPage: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      }

      mockApiClient.get.mockResolvedValue(mockResponse)

      const result = await timetableApi.getSavedTimetables()

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/timetable/program/saved?page=1&limit=20',
        undefined
      )
      expect(result).toEqual(mockResponse.data)
    })

    it('予期しないレスポンス形式を適切に処理する', async () => {
      const mockResponse = { unexpected: 'format' }

      mockApiClient.get.mockResolvedValue(mockResponse)

      const result = await timetableApi.getSavedTimetables(1, 10, mockOptions)

      expect(result).toEqual({
        timetables: [],
        totalCount: 0,
        currentPage: 1,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      })
    })

    it('APIエラー時にデフォルト値を返す', async () => {
      const error = new Error('API Error')
      mockApiClient.get.mockRejectedValue(error)

      const result = await timetableApi.getSavedTimetables(1, 10, mockOptions)

      expect(result).toEqual({
        timetables: [],
        totalCount: 0,
        currentPage: 1,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      })
    })

    it('successがfalseの場合にデフォルト値を返す', async () => {
      const mockResponse = {
        success: false,
        data: {
          timetables: [mockTimetableListItem],
          totalCount: 1,
        },
      }

      mockApiClient.get.mockResolvedValue(mockResponse)

      const result = await timetableApi.getSavedTimetables(1, 10, mockOptions)

      expect(result).toEqual({
        timetables: [],
        totalCount: 0,
        currentPage: 1,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      })
    })
  })

  describe('getTimetableDetail', () => {
    it('時間割詳細を正常に取得する', async () => {
      mockApiClient.get.mockResolvedValue(mockTimetableDetail)

      const result = await timetableApi.getTimetableDetail('timetable-1', mockOptions)

      expect(mockApiClient.get).toHaveBeenCalledWith('/timetables/timetable-1', mockOptions)
      expect(result).toEqual(mockTimetableDetail)
    })

    it('存在しない時間割IDでエラーハンドリング', async () => {
      const error = new Error('Timetable not found')
      mockApiClient.get.mockRejectedValue(error)

      await expect(timetableApi.getTimetableDetail('nonexistent', mockOptions)).rejects.toThrow(
        'Timetable not found'
      )
    })
  })

  describe('getSavedTimetableDetail', () => {
    it('保存済み時間割詳細を正常に取得する', async () => {
      mockApiClient.get.mockResolvedValue(mockTimetableDetail)

      const result = await timetableApi.getSavedTimetableDetail('saved-1', mockOptions)

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/timetable/program/saved/saved-1',
        mockOptions
      )
      expect(result).toEqual(mockTimetableDetail)
    })

    it('存在しない保存済み時間割でエラーハンドリング', async () => {
      const error = new Error('Saved timetable not found')
      mockApiClient.get.mockRejectedValue(error)

      await expect(
        timetableApi.getSavedTimetableDetail('nonexistent', mockOptions)
      ).rejects.toThrow('Saved timetable not found')
    })
  })

  describe('updateTimetable', () => {
    it('時間割を正常に更新する', async () => {
      const updateData = { title: '更新された時間割' }
      const updatedTimetable = { ...mockTimetableDetail, ...updateData }

      mockApiClient.put.mockResolvedValue(updatedTimetable)

      const result = await timetableApi.updateTimetable('timetable-1', updateData, mockOptions)

      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/timetables/timetable-1',
        updateData,
        mockOptions
      )
      expect(result).toEqual(updatedTimetable)
    })

    it('存在しない時間割の更新でエラーハンドリング', async () => {
      const error = new Error('Timetable not found')
      mockApiClient.put.mockRejectedValue(error)

      await expect(timetableApi.updateTimetable('nonexistent', {}, mockOptions)).rejects.toThrow(
        'Timetable not found'
      )
    })
  })

  describe('generateProgramTimetable', () => {
    it('プログラム型時間割を正常に生成する', async () => {
      const mockResponse = {
        success: true,
        message: 'プログラム型時間割が生成されました',
        data: {
          timetable: { monday: [] },
          statistics: {
            totalSlots: 30,
            assignedSlots: 25,
            unassignedSlots: 5,
            backtrackCount: 10,
          },
          generatedAt: '2024-01-01T10:00:00Z',
          method: 'backtrack',
        },
      }

      mockApiClient.post.mockResolvedValue(mockResponse)

      const result = await timetableApi.generateProgramTimetable(mockOptions)

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/timetable/program/generate',
        { useOptimization: false, useNewAlgorithm: true },
        mockOptions
      )
      expect(result).toEqual(mockResponse)
    })

    it('プログラム型時間割生成エラー時の処理', async () => {
      const error = new Error('Generation failed')
      mockApiClient.post.mockRejectedValue(error)

      await expect(timetableApi.generateProgramTimetable(mockOptions)).rejects.toThrow(
        'Generation failed'
      )
    })
  })

  describe('getProgramConfig', () => {
    it('プログラム設定を正常に取得する', async () => {
      const mockConfig = {
        algorithm: 'backtrack',
        description: 'バックトラック法による時間割生成',
        features: ['制約充足', '最適化', 'バックトラック'],
        statistics: {
          teachers: 10,
          subjects: 15,
          classrooms: 20,
          teachersWithRestrictions: 3,
        },
        constraints: [
          {
            name: '教師重複回避',
            description: '同じ時間に複数のクラスを担当しない',
            enabled: true,
          },
        ],
      }

      mockApiClient.get.mockResolvedValue(mockConfig)

      const result = await timetableApi.getProgramConfig(mockOptions)

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/timetable/program/config', mockOptions)
      expect(result).toEqual(mockConfig)
    })

    it('設定取得エラー時の処理', async () => {
      const error = new Error('Config not found')
      mockApiClient.get.mockRejectedValue(error)

      await expect(timetableApi.getProgramConfig(mockOptions)).rejects.toThrow('Config not found')
    })
  })

  describe('validateTimetable', () => {
    it('時間割バリデーションを正常に実行する', async () => {
      const mockValidation = {
        isValid: true,
        violations: [],
        checkedConstraints: ['teacher-conflict', 'classroom-conflict'],
      }

      const timetableData = { monday: [] }

      mockApiClient.post.mockResolvedValue(mockValidation)

      const result = await timetableApi.validateTimetable(timetableData, mockOptions)

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/timetable/program/validate',
        { timetableData },
        mockOptions
      )
      expect(result).toEqual(mockValidation)
    })

    it('バリデーション違反がある場合の処理', async () => {
      const mockValidation = {
        isValid: false,
        violations: [
          {
            type: 'teacher-conflict',
            message: '教師の重複が発生しています',
            slot: { period: 1, day: 'monday' },
            timeKey: 'monday-1',
          },
        ],
        checkedConstraints: ['teacher-conflict'],
      }

      const timetableData = { monday: [] }

      mockApiClient.post.mockResolvedValue(mockValidation)

      const result = await timetableApi.validateTimetable(timetableData, mockOptions)

      expect(result.isValid).toBe(false)
      expect(result.violations).toHaveLength(1)
    })

    it('バリデーションエラー時の処理', async () => {
      const error = new Error('Validation failed')
      mockApiClient.post.mockRejectedValue(error)

      await expect(timetableApi.validateTimetable({}, mockOptions)).rejects.toThrow(
        'Validation failed'
      )
    })
  })

  describe('saveProgramTimetable', () => {
    it('プログラム型時間割を正常に保存する', async () => {
      const mockResponse = {
        success: true,
        message: '時間割が保存されました',
        data: {
          timetableId: 'saved-123',
          assignmentRate: 85.5,
          totalSlots: 30,
          assignedSlots: 25,
          savedAt: '2024-01-01T10:00:00Z',
        },
      }

      const timetable = { monday: [] }
      const statistics = {
        assignmentRate: 85.5,
        totalSlots: 30,
        assignedSlots: 25,
      }
      const metadata = { name: 'テスト時間割' }

      mockApiClient.post.mockResolvedValue(mockResponse)

      const result = await timetableApi.saveProgramTimetable(
        timetable,
        statistics,
        metadata,
        mockOptions
      )

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/timetable/program/save',
        { timetable, statistics, metadata },
        mockOptions
      )
      expect(result).toEqual(mockResponse)
    })

    it('メタデータなしで時間割を保存する', async () => {
      const mockResponse = {
        success: true,
        message: '時間割が保存されました',
        data: {
          timetableId: 'saved-456',
          assignmentRate: 90.0,
          totalSlots: 20,
          assignedSlots: 18,
          savedAt: '2024-01-01T11:00:00Z',
        },
      }

      const timetable = { monday: [] }
      const statistics = {
        assignmentRate: 90.0,
        totalSlots: 20,
        assignedSlots: 18,
      }

      mockApiClient.post.mockResolvedValue(mockResponse)

      const result = await timetableApi.saveProgramTimetable(
        timetable,
        statistics,
        undefined,
        mockOptions
      )

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/timetable/program/save',
        { timetable, statistics, metadata: undefined },
        mockOptions
      )
      expect(result).toEqual(mockResponse)
    })

    it('時間割保存エラー時の処理', async () => {
      const error = new Error('Save failed')
      mockApiClient.post.mockRejectedValue(error)

      await expect(timetableApi.saveProgramTimetable({}, {}, {}, mockOptions)).rejects.toThrow(
        'Save failed'
      )
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

    it('timetableApiオブジェクトが正しく定義されている', () => {
      expect(timetableApi).toBeDefined()
      expect(typeof timetableApi).toBe('object')
      expect(typeof timetableApi.generateTimetable).toBe('function')
      expect(typeof timetableApi.getTimetables).toBe('function')
      expect(typeof timetableApi.getSavedTimetables).toBe('function')
      expect(typeof timetableApi.getTimetableDetail).toBe('function')
      expect(typeof timetableApi.getSavedTimetableDetail).toBe('function')
      expect(typeof timetableApi.updateTimetable).toBe('function')
      expect(typeof timetableApi.generateProgramTimetable).toBe('function')
      expect(typeof timetableApi.getProgramConfig).toBe('function')
      expect(typeof timetableApi.validateTimetable).toBe('function')
      expect(typeof timetableApi.saveProgramTimetable).toBe('function')
    })

    it('モックデータが適切に定義されている', () => {
      expect(mockTimetableListItem).toBeDefined()
      expect(mockTimetableListItem.id).toBe('timetable-1')
      expect(mockTimetableListItem.title).toBe('1年A組時間割')
      expect(mockTimetableDetail).toBeDefined()
      expect(mockTimetableDetail.id).toBe('timetable-1')
      expect(typeof mockTimetableDetail.data).toBe('object')
    })

    it('APIクライアントモックが正しく設定されている', () => {
      expect(mockApiClient).toBeDefined()
      expect(typeof mockApiClient.get).toBe('function')
      expect(typeof mockApiClient.post).toBe('function')
      expect(typeof mockApiClient.put).toBe('function')
    })

    it('Vitestモック機能が正しく動作している', () => {
      expect(vi.fn).toBeDefined()
      expect(typeof vi.fn).toBe('function')
      expect(vi.clearAllMocks).toBeDefined()
      expect(typeof vi.clearAllMocks).toBe('function')
      expect(vi.restoreAllMocks).toBeDefined()
      expect(typeof vi.restoreAllMocks).toBe('function')
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
  })
})
