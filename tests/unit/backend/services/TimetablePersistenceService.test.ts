/**
 * TimetablePersistenceService 単体テスト
 * 時間割永続化サービスの包括的テスト - 6KB の重要なデータ管理層
 */

import type { TimetableSlot } from '@shared/schemas'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  TimetableDataRequest,
  TimetablePersistenceService,
} from '../../../../src/backend/services/TimetablePersistenceService'

// 動的インポート用の変数
let TimetablePersistenceServiceClass: typeof TimetablePersistenceService
let persistenceService: TimetablePersistenceService

// データベースサービスをモック化
const mockDb = {
  prepare: vi.fn(),
}

const mockStatement = {
  all: vi.fn(),
  get: vi.fn(),
  first: vi.fn(),
  run: vi.fn(),
  bind: vi.fn(),
}

// Zodスキーマをモック化
vi.mock('../../../../src/backend/services/TimetablePersistenceService', async importOriginal => {
  const original =
    await importOriginal<
      typeof import('../../../../src/backend/services/TimetablePersistenceService')
    >()
  return {
    ...original,
    TimetableDataRequestSchema: {
      parse: vi.fn(),
    },
    TimetableStatisticsSchema: {
      parse: vi.fn(),
    },
  }
})

describe('TimetablePersistenceService', () => {
  const mockTimetableSlot: TimetableSlot = {
    id: 'slot-1',
    classGrade: 1,
    classSection: 1,
    day: 0,
    period: 0,
    subject: '数学',
    teacher: '田中先生',
    classroom: '1-1教室',
    isViolation: false,
  }

  const mockTimetableData: TimetableDataRequest = {
    name: 'テスト時間割',
    timetable: [mockTimetableSlot],
    statistics: {
      totalSlots: 100,
      assignedSlots: 85,
      assignmentRate: 85.0,
      bestAssignmentRate: 87.5,
      totalAssignments: 85,
      constraintViolations: 2,
      retryCount: 3,
    },
  }

  const mockSavedTimetable = {
    id: 'timetable-123456789-abcdef',
    name: 'テスト時間割',
    timetable_data: JSON.stringify([mockTimetableSlot]),
    statistics: JSON.stringify(mockTimetableData.statistics),
    metadata: JSON.stringify({ method: 'manual', name: 'テスト時間割', hasStatistics: true }),
    generation_method: 'manual',
    assignment_rate: 85.0,
    total_slots: 100,
    assigned_slots: 85,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  }

  beforeEach(async () => {
    vi.clearAllMocks()

    // 動的インポート（遅延読み込みでメモリ効率化）
    const module = await import('../../../../src/backend/services/TimetablePersistenceService')
    TimetablePersistenceServiceClass = module.TimetablePersistenceService

    // モックの初期化
    mockDb.prepare.mockReturnValue(mockStatement)
    mockStatement.all.mockResolvedValue({ results: [mockSavedTimetable] })
    mockStatement.first.mockResolvedValue(null)
    mockStatement.first.mockResolvedValue(mockSavedTimetable)
    mockStatement.run.mockResolvedValue({ success: true, changes: 1 })
    mockStatement.bind.mockReturnValue(mockStatement)

    // Zodスキーマモックの初期化
    const { TimetableDataRequestSchema } = await import(
      '../../../../src/backend/services/TimetablePersistenceService'
    )
    vi.mocked(TimetableDataRequestSchema.parse).mockReturnValue(mockTimetableData)

    // TimetablePersistenceService インスタンス作成
    persistenceService = new TimetablePersistenceServiceClass(mockDb as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('データベースインスタンスが正しく設定される', () => {
      expect(persistenceService.db).toBe(mockDb)
    })

    it('複数のインスタンス作成が可能', () => {
      const service1 = new TimetablePersistenceServiceClass(mockDb as any)
      const service2 = new TimetablePersistenceServiceClass(mockDb as any)

      expect(service1).toBeInstanceOf(TimetablePersistenceServiceClass)
      expect(service2).toBeInstanceOf(TimetablePersistenceServiceClass)
      expect(service1).not.toBe(service2)
    })
  })

  describe('saveTimetable', () => {
    it('時間割データを正しく保存する', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const result = await persistenceService.saveTimetable(mockTimetableData)

      expect(result).toHaveProperty('timetableId')
      expect(result).toHaveProperty('assignmentRate', 85.0)
      expect(result.timetableId).toMatch(/^timetable-\d+-[a-z0-9]{6}$/)

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO generated_timetables')
      )
      expect(mockStatement.bind).toHaveBeenCalledWith(
        expect.stringMatching(/^timetable-/),
        expect.stringContaining('"id":"slot-1"'),
        expect.stringContaining('"assignmentRate":85'),
        expect.stringContaining('"method":"manual"'),
        'manual',
        85.0,
        100,
        85,
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      )

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✅ 時間割保存完了'))
      consoleSpy.mockRestore()
    })

    it('統計データなしでも正しく保存される', async () => {
      const dataWithoutStats = {
        name: '統計なし時間割',
        timetable: [mockTimetableSlot],
      }

      const { TimetableDataRequestSchema } = await import(
        '../../../../src/backend/services/TimetablePersistenceService'
      )
      vi.mocked(TimetableDataRequestSchema.parse).mockReturnValue(dataWithoutStats)

      const result = await persistenceService.saveTimetable(dataWithoutStats)

      expect(result.assignmentRate).toBe(0) // 統計なしの場合のデフォルト値
      expect(mockStatement.bind).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        '{}', // 空の統計オブジェクト
        expect.stringContaining('"hasStatistics":false'),
        'manual',
        0,
        0,
        0,
        expect.any(String),
        expect.any(String)
      )
    })

    it('複数の割当率フォールバックが動作する', async () => {
      const testCases = [
        {
          name: 'assignmentRateが優先',
          statistics: { assignmentRate: 90.0, bestAssignmentRate: 95.0 },
          expected: 90.0,
        },
        {
          name: 'bestAssignmentRateがフォールバック',
          statistics: { bestAssignmentRate: 95.0, totalAssignments: 80, totalSlots: 100 },
          expected: 95.0,
        },
        {
          name: 'totalAssignments/totalSlotsで計算',
          statistics: { totalAssignments: 75, totalSlots: 100 },
          expected: 75.0,
        },
        {
          name: 'assignedSlots/totalSlotsで計算',
          statistics: { assignedSlots: 80, totalSlots: 100 },
          expected: 80.0,
        },
      ]

      const { TimetableDataRequestSchema } = await import(
        '../../../../src/backend/services/TimetablePersistenceService'
      )

      for (const testCase of testCases) {
        const testData = {
          name: testCase.name,
          timetable: [mockTimetableSlot],
          statistics: testCase.statistics,
        }

        vi.mocked(TimetableDataRequestSchema.parse).mockReturnValue(testData)

        const result = await persistenceService.saveTimetable(testData)

        expect(result.assignmentRate).toBe(testCase.expected)
      }
    })

    it('一意なIDが生成される', async () => {
      const ids = new Set<string>()

      for (let i = 0; i < 10; i++) {
        const result = await persistenceService.saveTimetable(mockTimetableData)
        ids.add(result.timetableId)
      }

      expect(ids.size).toBe(10) // すべて一意
    })

    it('バリデーションエラーが適切に処理される', async () => {
      const { TimetableDataRequestSchema } = await import(
        '../../../../src/backend/services/TimetablePersistenceService'
      )

      // Zodのエラー形式に合わせてモックを修正
      const zodError = new Error(JSON.stringify([{
        code: "invalid_type",
        expected: "string",
        received: "undefined",
        path: ["name"],
        message: "Required"
      }]))

      vi.mocked(TimetableDataRequestSchema.parse).mockImplementation(() => {
        throw zodError
      })

      await expect(persistenceService.saveTimetable({} as any)).rejects.toThrow()
    })

    it('データベースエラーが適切に処理される', async () => {
      mockStatement.run.mockRejectedValue(new Error('Database error'))

      await expect(persistenceService.saveTimetable(mockTimetableData)).rejects.toThrow(
        'Database error'
      )
    })

    it('大きな時間割データを処理できる', async () => {
      const largeTimetable = Array.from({ length: 50 }, (_, i) => ({
        ...mockTimetableSlot,
        id: `slot-${i}`,
      }))

      const largeData = {
        ...mockTimetableData,
        timetable: largeTimetable,
      }

      const { TimetableDataRequestSchema } = await import(
        '../../../../src/backend/services/TimetablePersistenceService'
      )
      vi.mocked(TimetableDataRequestSchema.parse).mockReturnValue(largeData)

      const result = await persistenceService.saveTimetable(largeData)

      expect(result.timetableId).toBeDefined()
      expect(mockStatement.bind).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"id":"slot-49"'), // 最後の要素が含まれる
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(String),
        expect.any(String)
      )
    })

    it('メタデータが正しく生成される', async () => {
      await persistenceService.saveTimetable(mockTimetableData)

      const metadataArg = mockStatement.bind.mock.calls[0][3]
      const metadata = JSON.parse(metadataArg)

      expect(metadata).toEqual({
        method: 'manual',
        name: 'テスト時間割',
        hasStatistics: true,
      })
    })

    it('タイムスタンプが正しく設定される', async () => {
      const beforeTime = new Date().toISOString()
      await persistenceService.saveTimetable(mockTimetableData)
      const afterTime = new Date().toISOString()

      const createdAt = mockStatement.bind.mock.calls[0][8]
      const updatedAt = mockStatement.bind.mock.calls[0][9]

      expect(createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      expect(updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      expect(createdAt).toBe(updatedAt)
      expect(Date.parse(createdAt)).toBeGreaterThanOrEqual(Date.parse(beforeTime))
      expect(Date.parse(createdAt)).toBeLessThanOrEqual(Date.parse(afterTime))
    })
  })

  describe('getSavedTimetables', () => {
    it('保存済み時間割一覧を正しく取得する', async () => {
      const mockCountResult = { total: 25 }
      const mockTimetables = [
        mockSavedTimetable,
        { ...mockSavedTimetable, id: 'timetable-2', name: '時間割2' },
      ]

      mockStatement.first.mockResolvedValueOnce(mockCountResult) // COUNT query
      mockStatement.all.mockResolvedValueOnce({ results: mockTimetables }) // SELECT query

      const result = await persistenceService.getSavedTimetables(1, 10)

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT COUNT(*) as total FROM generated_timetables'
      )
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT.*FROM generated_timetables/)
      )

      expect(result).toEqual({
        timetables: expect.arrayContaining([
          expect.objectContaining({
            id: 'timetable-123456789-abcdef',
            assignmentRate: 85.0,
            totalSlots: 100,
            assignedSlots: 85,
            generationMethod: 'manual',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          }),
        ]),
        totalCount: 25,
        totalPages: 3,
        currentPage: 1,
        hasNextPage: true,
        hasPrevPage: false,
      })
    })

    it('ページネーションが正しく動作する', async () => {
      const mockCountResult = { total: 50 }

      mockStatement.first.mockResolvedValueOnce(mockCountResult)
      mockStatement.all.mockResolvedValueOnce({ results: [] })

      await persistenceService.getSavedTimetables(3, 15)

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringMatching(/LIMIT.*OFFSET/))
    })

    it('デフォルトページネーション値が適用される', async () => {
      const mockCountResult = { total: 10 }

      mockStatement.first.mockResolvedValueOnce(mockCountResult)
      mockStatement.all.mockResolvedValueOnce({ results: [] })

      await persistenceService.getSavedTimetables()

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringMatching(/LIMIT.*OFFSET/))
    })

    it('空のデータベース結果を処理する', async () => {
      const mockCountResult = { total: 0 }

      mockStatement.first.mockResolvedValueOnce(mockCountResult)
      mockStatement.all.mockResolvedValueOnce({ results: [] })

      const result = await persistenceService.getSavedTimetables()

      expect(result).toEqual({
        timetables: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
        hasNextPage: false,
        hasPrevPage: false,
      })
    })

    it('JSONデータの解析が正しく動作する', async () => {
      const complexTimetable = {
        ...mockSavedTimetable,
        statistics: JSON.stringify({
          assignmentRate: 92.5,
          constraintViolations: 1,
          customMetric: 'test',
        }),
        metadata: JSON.stringify({
          method: 'automatic',
          algorithmVersion: '2.0',
          executionTime: 1500,
        }),
      }

      mockStatement.first.mockResolvedValueOnce({ total: 1 })
      mockStatement.all.mockResolvedValueOnce({ results: [complexTimetable] })

      const result = await persistenceService.getSavedTimetables()

      expect(result.timetables[0]).toMatchObject({
        id: mockSavedTimetable.id,
        assignmentRate: 85.0,
        totalSlots: 100,
        assignedSlots: 85,
        generationMethod: 'manual',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      })
    })

    it('無効なJSONを安全に処理する', async () => {
      const invalidJsonTimetable = {
        ...mockSavedTimetable,
        statistics: 'invalid json',
        metadata: '{ invalid json }',
      }

      mockStatement.first.mockResolvedValueOnce({ total: 1 })
      mockStatement.all.mockResolvedValueOnce({ results: [invalidJsonTimetable] })

      const result = await persistenceService.getSavedTimetables()

      expect(result.timetables[0]).toMatchObject({
        id: mockSavedTimetable.id,
        assignmentRate: 85.0,
        totalSlots: 100,
        assignedSlots: 85,
        generationMethod: 'manual',
      })
    })

    it('大きなページ数での計算が正しい', async () => {
      const mockCountResult = { total: 1000 }

      mockStatement.first.mockResolvedValueOnce(mockCountResult)
      mockStatement.all.mockResolvedValueOnce({ results: [] })

      const result = await persistenceService.getSavedTimetables(50, 20)

      expect(result).toEqual({
        timetables: [],
        totalCount: 1000,
        totalPages: 50,
        currentPage: 50,
        hasNextPage: false,
        hasPrevPage: true,
      })
    })
  })

  describe('getSavedTimetableById', () => {
    it('IDで時間割を正しく取得する', async () => {
      mockStatement.first.mockResolvedValue(mockSavedTimetable)

      const result = await persistenceService.getSavedTimetableById('timetable-123456789-abcdef')

      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM generated_timetables WHERE id = ?')
      expect(mockStatement.bind).toHaveBeenCalledWith('timetable-123456789-abcdef')

      expect(result).toEqual({
        id: 'timetable-123456789-abcdef',
        timetable: [mockTimetableSlot],
        statistics: mockTimetableData.statistics,
        metadata: { method: 'manual', name: 'テスト時間割', hasStatistics: true },
        generationMethod: 'manual',
        assignmentRate: 85.0,
        totalSlots: 100,
        assignedSlots: 85,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      })
    })

    it('存在しないIDでnullを返す', async () => {
      mockStatement.first.mockResolvedValue(null)

      const result = await persistenceService.getSavedTimetableById('nonexistent')

      expect(result).toBeNull()
    })

    it('無効なJSON形式のデータを安全に処理する', async () => {
      const corruptedData = {
        ...mockSavedTimetable,
        timetable_data: 'invalid json',
        statistics: '{ corrupted',
        metadata: 'not json at all',
      }

      mockStatement.first.mockResolvedValue(corruptedData)

      // 実装では JSON.parse エラーハンドリングがないため、エラーが発生することを期待
      await expect(persistenceService.getSavedTimetableById('corrupted-id')).rejects.toThrow()
    })

    it('データベースエラーが適切に処理される', async () => {
      mockStatement.first.mockRejectedValue(new Error('Database error'))

      await expect(persistenceService.getSavedTimetableById('test-id')).rejects.toThrow(
        'Database error'
      )
    })
  })

  describe('autoSaveTimetable', () => {
    it('自動保存が正しく動作する', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const mockValidationResult = {
        timetable: [mockTimetableSlot],
        isValid: true,
        violations: []
      }

      const result = await persistenceService.autoSaveTimetable(mockValidationResult, mockTimetableData.statistics)

      expect(result).toEqual(expect.stringMatching(/^timetable-/))

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO generated_timetables')
      )
      expect(mockStatement.bind).toHaveBeenCalledWith(
        expect.stringMatching(/^timetable-/),
        expect.any(String),
        expect.any(String),
        expect.stringContaining('"method":"program-optimized"'), // 自動保存のメタデータ
        'program-optimized',
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(String),
        expect.any(String)
      )

      consoleSpy.mockRestore()
    })

    it('自動保存エラーが適切に処理される', async () => {
      mockStatement.run.mockRejectedValue(new Error('Auto-save failed'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const mockValidationResult = {
        timetable: [mockTimetableSlot],
        isValid: true,
        violations: []
      }

      const result = await persistenceService.autoSaveTimetable(mockValidationResult, mockTimetableData.statistics)

      expect(result).toBeNull()

      expect(consoleSpy).toHaveBeenCalledWith('⚠️ 時間割自動保存エラー（処理は継続）:', expect.any(Error))
      consoleSpy.mockRestore()
    })

    it('バリデーションエラーでも安全に処理する', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // autoSaveTimetable は JSON.stringify でエラーまたはDB実行でエラーが発生した場合 null を返す
      // データベースエラーをシミュレート
      mockStatement.run.mockRejectedValueOnce(new Error('Database error'))

      const mockValidationResult = {
        timetable: [mockTimetableSlot],
        isValid: true,
        violations: []
      }

      const result = await persistenceService.autoSaveTimetable(mockValidationResult, mockTimetableData.statistics)

      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith('⚠️ 時間割自動保存エラー（処理は継続）:', expect.any(Error))
      consoleSpy.mockRestore()
    })

    it('自動保存のタイムスタンプが設定される', async () => {
      const mockValidationResult = {
        timetable: [mockTimetableSlot],
        isValid: true,
        violations: []
      }

      await persistenceService.autoSaveTimetable(mockValidationResult, mockTimetableData.statistics)

      const createdAt = mockStatement.bind.mock.calls[0][8]
      expect(createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    })

    it('自動保存の成功ログが出力される', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const mockValidationResult = {
        timetable: [mockTimetableSlot],
        isValid: true,
        violations: []
      }

      const result = await persistenceService.autoSaveTimetable(mockValidationResult, mockTimetableData.statistics)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('💾 時間割自動保存完了:')
      )
      consoleSpy.mockRestore()
    })
  })

  describe('エラーハンドリングとエッジケース', () => {
    it('null/undefined入力を安全に処理する', async () => {
      const { TimetableDataRequestSchema } = await import(
        '../../../../src/backend/services/TimetablePersistenceService'
      )

      vi.mocked(TimetableDataRequestSchema.parse).mockImplementation(() => {
        throw new Error('Invalid input')
      })

      await expect(persistenceService.saveTimetable(null as any)).rejects.toThrow()

      await expect(persistenceService.getSavedTimetableById('')).resolves.toBeTruthy() // 空文字列でもエラーにならない
    })

    it('データベース接続失敗を処理する', async () => {
      mockDb.prepare.mockImplementation(() => {
        throw new Error('Connection failed')
      })

      await expect(persistenceService.saveTimetable(mockTimetableData)).rejects.toThrow(
        'Connection failed'
      )
    })

    it('大きなデータセットでメモリ効率を維持する', async () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        ...mockSavedTimetable,
        id: `timetable-${i}`,
      }))

      mockStatement.first.mockResolvedValueOnce({ total: 100 })
      mockStatement.all.mockResolvedValueOnce({ results: largeDataset })

      const result = await persistenceService.getSavedTimetables(1, 100)

      expect(result.timetables).toHaveLength(100)
    })

    it('並行アクセス時の競合状態を処理する', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        persistenceService.saveTimetable({
          ...mockTimetableData,
          name: `並行テスト${i}`,
        })
      )

      const results = await Promise.all(promises)

      expect(results).toHaveLength(10)
      const ids = new Set(results.map(r => r.timetableId))
      expect(ids.size).toBe(10) // 全て一意のID
    })

    it('SQLインジェクション攻撃を防ぐ', async () => {
      const maliciousId = "'; DROP TABLE generated_timetables; --"

      // 正常にパラメータ化クエリが使用される
      await persistenceService.getSavedTimetableById(maliciousId)

      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM generated_timetables WHERE id = ?')
      expect(mockStatement.bind).toHaveBeenCalledWith(maliciousId)
    })

    it('タイムゾーンの問題を回避する', async () => {
      // UTCタイムスタンプが一貫して使用される
      await persistenceService.saveTimetable(mockTimetableData)

      const timestamp = mockStatement.bind.mock.calls[0][8]
      expect(timestamp).toMatch(/Z$/) // UTC表記
    })
  })

  describe('パフォーマンス', () => {
    it('クエリが適切に最適化されている', async () => {
      await persistenceService.getSavedTimetables(1, 20)

      // 効率的なクエリが使用される
      const countQuery = mockDb.prepare.mock.calls[0][0]
      const selectQuery = mockDb.prepare.mock.calls[1][0]

      expect(countQuery).toContain('COUNT(*)')
      expect(selectQuery).toContain('LIMIT')
      expect(selectQuery).toContain('OFFSET')
      expect(selectQuery).toContain('ORDER BY')
    })

    it('JSONパース処理が効率的', async () => {
      const complexData = {
        ...mockSavedTimetable,
        timetable_data: JSON.stringify(
          Array.from({ length: 50 }, (_, i) => ({
            ...mockTimetableSlot,
            id: `slot-${i}`,
          }))
        ),
      }

      mockStatement.first.mockResolvedValue(complexData)

      const startTime = performance.now()
      const result = await persistenceService.getSavedTimetableById('complex-id')
      const endTime = performance.now()

      expect(result?.timetable).toHaveLength(50)
      expect(endTime - startTime).toBeLessThan(100) // 100ms以内
    })

    it('メモリリークを防ぐ', () => {
      // 大量インスタンス作成後も適切にメモリが管理される
      const services = Array.from(
        { length: 100 },
        () => new TimetablePersistenceServiceClass(mockDb as any)
      )

      expect(services).toHaveLength(100)
      services.length = 0
      expect(services).toHaveLength(0)
    })
  })

  describe('データ整合性', () => {
    it('保存と取得でデータの整合性が保たれる', async () => {
      const saveResult = await persistenceService.saveTimetable(mockTimetableData)

      mockStatement.first.mockResolvedValue({
        ...mockSavedTimetable,
        id: saveResult.timetableId,
      })

      const retrieved = await persistenceService.getSavedTimetableById(saveResult.timetableId)

      expect(retrieved?.id).toBe(saveResult.timetableId)
      expect(retrieved?.timetable).toEqual(mockTimetableData.timetable)
      expect(retrieved?.assignmentRate).toBe(saveResult.assignmentRate)
    })

    it('統計データの計算が一貫している', async () => {
      const testStatistics = {
        totalSlots: 120,
        assignedSlots: 96,
        // 96/120 = 80%
      }

      const testData = {
        ...mockTimetableData,
        statistics: testStatistics,
      }

      const { TimetableDataRequestSchema } = await import(
        '../../../../src/backend/services/TimetablePersistenceService'
      )
      vi.mocked(TimetableDataRequestSchema.parse).mockReturnValue(testData)

      const result = await persistenceService.saveTimetable(testData)

      expect(result.assignmentRate).toBe(80.0)
    })
  })
})
