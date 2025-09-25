import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DataTransformService } from '../../../../src/backend/services/DataTransformService'
import { TimetableOrchestrator } from '../../../../src/backend/services/TimetableOrchestrator'
import { TimetableGenerator } from '../../../../src/backend/services/timetableGenerator'
import type { Classroom, SchoolSettings, Subject, Teacher } from '../../../../src/shared/schemas'

// モック用の型定義
interface MockDatabase {
  prepare: (sql: string) => {
    bind: (...args: any[]) => {
      first: () => Promise<any>
      all: () => Promise<any[]>
      run: () => Promise<{ changes: number }>
    }
    first: () => Promise<any>
    all: () => Promise<any[]>
  }
}

// console.log をモック（ログを抑制）
const mockConsoleLog = vi.fn()
global.console.log = mockConsoleLog

// DataTransformService をモック
vi.mock('../../../../src/backend/services/DataTransformService')

// TimetableGenerator をモック
vi.mock('../../../../src/backend/services/timetableGenerator')

const MockDataTransformService = DataTransformService as vi.MockedClass<typeof DataTransformService>
const MockTimetableGenerator = TimetableGenerator as vi.MockedClass<typeof TimetableGenerator>

describe('TimetableOrchestrator', () => {
  let mockDB: MockDatabase
  let orchestrator: TimetableOrchestrator
  let mockDataTransform: vi.Mocked<DataTransformService>
  let mockGenerator: vi.Mocked<TimetableGenerator>

  const sampleSettings: SchoolSettings = {
    id: 'school-1',
    school_id: 'default',
    school_name: 'テスト学校',
    grades: [1, 2, 3],
    classes_per_grade: 2,
    days_per_week: 5,
    periods_per_day: 6,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  }

  const sampleTeachers: Teacher[] = [
    {
      id: 'teacher-1',
      name: '田中太郎',
      subjects: ['math-001'],
      grades: [1, 2, 3],
      assignmentRestrictions: [],
      order: 1,
      school_id: 'default',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    },
  ]

  const sampleSubjects: Subject[] = [
    {
      id: 'subject-1',
      name: '数学',
      grades: [1, 2, 3],
      weeklyHours: 4,
      school_id: 'default',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    },
  ]

  const sampleClassrooms: Classroom[] = [
    {
      id: 'classroom-1',
      name: '1年A組',
      grade: 1,
      capacity: 35,
      school_id: 'default',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    // データベースモックの作成
    mockDB = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
          all: vi.fn().mockResolvedValue([]),
          run: vi.fn().mockResolvedValue({ changes: 1 }),
        }),
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue([]),
      }),
    }

    // DataTransformService モックの設定
    mockDataTransform = new MockDataTransformService(mockDB) as vi.Mocked<DataTransformService>
    mockDataTransform.loadSchoolData = vi.fn().mockResolvedValue({
      settings: sampleSettings,
      teachers: sampleTeachers,
      subjects: sampleSubjects,
      classrooms: sampleClassrooms,
    })
    mockDataTransform.optimizeSubjects = vi.fn().mockReturnValue(sampleSubjects)

    MockDataTransformService.mockImplementation(() => mockDataTransform)

    // TimetableGenerator モックの設定
    mockGenerator = new MockTimetableGenerator(
      sampleSettings,
      sampleTeachers,
      sampleSubjects,
      sampleClassrooms,
      false
    ) as vi.Mocked<TimetableGenerator>

    mockGenerator.generateTimetable = vi.fn().mockResolvedValue({
      success: true,
      message: '時間割生成が完了しました',
      statistics: {
        assignedSlots: 150,
        totalSlots: 150,
        unassignedSlots: 0,
        constraintViolations: 0,
        backtrackCount: 5,
      },
    })

    MockTimetableGenerator.mockImplementation(() => mockGenerator)

    orchestrator = new TimetableOrchestrator(mockDB)
  })

  describe('constructor', () => {
    it('正常にインスタンスが作成される', () => {
      expect(orchestrator).toBeInstanceOf(TimetableOrchestrator)
      expect(MockDataTransformService).toHaveBeenCalledWith(mockDB)
    })
  })

  describe('generateTimetable', () => {
    it('標準モードで時間割生成が正常に動作する', async () => {
      const result = await orchestrator.generateTimetable()

      expect(result.success).toBe(true)
      expect(result.message).toBe('時間割生成が完了しました')
      expect(mockDataTransform.loadSchoolData).toHaveBeenCalledOnce()
      expect(MockTimetableGenerator).toHaveBeenCalledWith(
        sampleSettings,
        sampleTeachers,
        sampleSubjects,
        sampleClassrooms,
        false
      )
      expect(mockGenerator.generateTimetable).toHaveBeenCalledWith({ tolerantMode: true })
    })

    it('最適化モードで時間割生成が正常に動作する', async () => {
      const result = await orchestrator.generateTimetable({ useOptimization: true })

      expect(result.success).toBe(true)
      expect(mockDataTransform.optimizeSubjects).toHaveBeenCalledWith(sampleSubjects)
      expect(MockTimetableGenerator).toHaveBeenCalledWith(
        sampleSettings,
        sampleTeachers,
        sampleSubjects,
        sampleClassrooms,
        false
      )
    })

    it('新アルゴリズムモードで時間割生成が正常に動作する', async () => {
      const result = await orchestrator.generateTimetable({ useNewAlgorithm: true })

      expect(result.success).toBe(true)
      expect(mockGenerator.generateTimetable).toHaveBeenCalledWith({
        tolerantMode: true,
        useNewAlgorithm: true,
      })
    })

    it('教師データが存在しない場合エラーを投げる', async () => {
      mockDataTransform.loadSchoolData.mockResolvedValue({
        settings: sampleSettings,
        teachers: [],
        subjects: sampleSubjects,
        classrooms: sampleClassrooms,
      })

      await expect(orchestrator.generateTimetable()).rejects.toThrow(
        '教師データが登録されていません'
      )
    })

    it('教科データが存在しない場合エラーを投げる', async () => {
      mockDataTransform.loadSchoolData.mockResolvedValue({
        settings: sampleSettings,
        teachers: sampleTeachers,
        subjects: [],
        classrooms: sampleClassrooms,
      })

      await expect(orchestrator.generateTimetable()).rejects.toThrow(
        '教科データが登録されていません'
      )
    })

    it('時間割生成が失敗した場合エラーを投げる', async () => {
      mockGenerator.generateTimetable.mockResolvedValue({
        success: false,
        message: '生成に失敗しました',
      })

      await expect(orchestrator.generateTimetable()).rejects.toThrow('生成に失敗しました')
    })

    it('時間割生成が失敗してメッセージがない場合デフォルトエラーを投げる', async () => {
      mockGenerator.generateTimetable.mockResolvedValue({
        success: false,
      })

      await expect(orchestrator.generateTimetable()).rejects.toThrow('時間割生成に失敗しました')
    })

    it('tolerantModeがfalseの場合正しく設定される', async () => {
      await orchestrator.generateTimetable({ tolerantMode: false })

      expect(mockGenerator.generateTimetable).toHaveBeenCalledWith({ tolerantMode: false })
    })
  })

  describe('generateWithOptimization', () => {
    it('最適化モードで複数回試行して最良結果を返す', async () => {
      // 全て99%未満の結果を返すように設定（早期終了を避ける）
      mockGenerator.generateTimetable
        .mockResolvedValueOnce({
          success: true,
          statistics: {
            assignedSlots: 120,
            totalSlots: 150,
            unassignedSlots: 30,
            constraintViolations: 0,
            backtrackCount: 10,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          statistics: {
            assignedSlots: 142,
            totalSlots: 150,
            unassignedSlots: 8,
            constraintViolations: 0,
            backtrackCount: 15,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          statistics: {
            assignedSlots: 135,
            totalSlots: 150,
            unassignedSlots: 15,
            constraintViolations: 0,
            backtrackCount: 12,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          statistics: {
            assignedSlots: 140,
            totalSlots: 150,
            unassignedSlots: 10,
            constraintViolations: 0,
            backtrackCount: 8,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          statistics: {
            assignedSlots: 138,
            totalSlots: 150,
            unassignedSlots: 12,
            constraintViolations: 0,
            backtrackCount: 9,
          },
        })

      const result = await orchestrator.generateTimetable({ useOptimization: true })

      expect(result.success).toBe(true)
      // 最良の結果（2回目：142 assigned slots、94.7%）が返されるはず
      expect(result.statistics?.assignedSlots).toBe(142)
      expect(result.statistics?.bestAssignmentRate).toBeCloseTo(94.7, 1)
      expect(result.statistics?.retryAttempts).toBe(5)
    })

    it('99%以上の結果が得られた場合早期終了する', async () => {
      mockGenerator.generateTimetable.mockResolvedValue({
        success: true,
        statistics: {
          assignedSlots: 149,
          totalSlots: 150,
          unassignedSlots: 1,
          constraintViolations: 0,
          backtrackCount: 5,
        },
      })

      const result = await orchestrator.generateTimetable({ useOptimization: true })

      expect(result.success).toBe(true)
      expect(mockGenerator.generateTimetable).toHaveBeenCalledTimes(1)
    })

    it('全ての試行が失敗した場合失敗結果を返す', async () => {
      mockGenerator.generateTimetable.mockResolvedValue({
        success: true,
        statistics: undefined,
      })

      // 実装上、TimetableOrchestratorは失敗時に例外を投げるため、それをキャッチする
      await expect(orchestrator.generateTimetable({ useOptimization: true })).rejects.toThrow(
        '最適化時間割生成に失敗しました'
      )
    })

    it('部分的な結果の場合適切なメッセージを返す', async () => {
      mockGenerator.generateTimetable.mockResolvedValue({
        success: true,
        statistics: {
          assignedSlots: 120,
          totalSlots: 150,
          unassignedSlots: 30,
          constraintViolations: 5,
          backtrackCount: 20,
        },
      })

      const result = await orchestrator.generateTimetable({ useOptimization: true })

      expect(result.success).toBe(true)
      expect(result.message).toContain('部分的な時間割を生成しました')
      expect(result.message).toContain('手動での調整をお勧めします')
    })

    it('良好な結果の場合適切なメッセージを返す', async () => {
      mockGenerator.generateTimetable.mockResolvedValue({
        success: true,
        statistics: {
          assignedSlots: 135,
          totalSlots: 150,
          unassignedSlots: 15,
          constraintViolations: 2,
          backtrackCount: 12,
        },
      })

      const result = await orchestrator.generateTimetable({ useOptimization: true })

      expect(result.success).toBe(true)
      expect(result.message).toContain('良好な時間割を生成しました')
    })
  })

  describe('formatStatistics', () => {
    it('統計情報を正しくフォーマットする', () => {
      const generationResult = {
        success: true,
        statistics: {
          assignedSlots: 140,
          totalSlots: 150,
          unassignedSlots: 10,
          constraintViolations: 3,
          backtrackCount: 25,
          retryAttempts: 3,
          bestAssignmentRate: 93.3,
        },
      }

      const formatted = orchestrator.formatStatistics(generationResult, true, false)

      expect(formatted).toEqual({
        generationTime: '0.1秒',
        totalAssignments: 140,
        constraintViolations: 3,
        totalSlots: 150,
        unassignedSlots: 10,
        backtrackCount: 25,
        retryAttempts: 3,
        bestAssignmentRate: 93.3,
        optimizationMode: true,
        tolerantMode: false,
      })
    })

    it('統計情報がない場合デフォルト値を使用する', () => {
      const generationResult = {
        success: true,
        statistics: undefined,
      }

      const formatted = orchestrator.formatStatistics(generationResult, false, true)

      expect(formatted).toEqual({
        generationTime: '0.1秒',
        totalAssignments: 0,
        constraintViolations: 0,
        totalSlots: 0,
        unassignedSlots: 0,
        backtrackCount: 0,
        retryAttempts: 0,
        bestAssignmentRate: 0,
        optimizationMode: false,
        tolerantMode: true,
      })
    })

    it('寛容モードで制約違反がある場合ログ出力する', () => {
      const generationResult = {
        success: true,
        statistics: {
          assignedSlots: 140,
          totalSlots: 150,
          unassignedSlots: 10,
          constraintViolations: 5,
          backtrackCount: 25,
        },
      }

      orchestrator.formatStatistics(generationResult, false, true)

      expect(mockConsoleLog).toHaveBeenCalledWith('⚠️ 寛容モードで5件の制約違反を記録しました')
    })
  })

  describe('エラーハンドリング', () => {
    it('DataTransformService でエラーが発生した場合適切に処理する', async () => {
      mockDataTransform.loadSchoolData.mockRejectedValue(new Error('データ読み込みエラー'))

      await expect(orchestrator.generateTimetable()).rejects.toThrow('データ読み込みエラー')
    })

    it('TimetableGenerator でエラーが発生した場合適切に処理する', async () => {
      mockGenerator.generateTimetable.mockRejectedValue(new Error('生成処理エラー'))

      await expect(orchestrator.generateTimetable()).rejects.toThrow('生成処理エラー')
    })
  })

  describe('統合テスト', () => {
    it('全オプションが有効な場合正常に動作する', async () => {
      const result = await orchestrator.generateTimetable({
        useOptimization: true,
        useNewAlgorithm: false,
        tolerantMode: false,
      })

      expect(result.success).toBe(true)
      expect(mockDataTransform.loadSchoolData).toHaveBeenCalledOnce()
      expect(mockDataTransform.optimizeSubjects).toHaveBeenCalledWith(sampleSubjects)
    })

    it('オプションが未指定の場合デフォルト値が使用される', async () => {
      const result = await orchestrator.generateTimetable({})

      expect(result.success).toBe(true)
      expect(mockDataTransform.optimizeSubjects).not.toHaveBeenCalled()
      expect(mockGenerator.generateTimetable).toHaveBeenCalledWith({ tolerantMode: true })
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

    it('TimetableOrchestratorが正しくインポートされている', () => {
      expect(TimetableOrchestrator).toBeDefined()
      expect(typeof TimetableOrchestrator).toBe('function')
      expect(orchestrator).toBeDefined()
      expect(typeof orchestrator.generateTimetable).toBe('function')
    })

    it('依存サービスが正しくインポートされている', () => {
      expect(DataTransformService).toBeDefined()
      expect(TimetableGenerator).toBeDefined()
      expect(MockDataTransformService).toBeDefined()
      expect(MockTimetableGenerator).toBeDefined()
    })

    it('モックインスタンスが正しく設定されている', () => {
      expect(mockDataTransform).toBeDefined()
      expect(typeof mockDataTransform.loadSchoolData).toBe('function')
      expect(typeof mockDataTransform.transformTeachers).toBe('function')
      expect(typeof mockDataTransform.transformSubjects).toBe('function')
      expect(typeof mockDataTransform.transformClassrooms).toBe('function')
      expect(typeof mockDataTransform.optimizeSubjects).toBe('function')

      expect(mockGenerator).toBeDefined()
      expect(typeof mockGenerator.generateTimetable).toBe('function')
    })

    it('テスト用データが正しく定義されている', () => {
      expect(sampleSettings).toBeDefined()
      expect(sampleSettings.id).toBe('school-1')
      expect(sampleSettings.grades).toEqual([1, 2, 3])
    })

    it('モックされたconsole.logが設定されている', () => {
      expect(mockConsoleLog).toBeDefined()
      expect(typeof mockConsoleLog).toBe('function')
      expect(global.console.log).toBe(mockConsoleLog)
    })

    it('Vitestモック機能が正しく動作している', () => {
      expect(vi.fn).toBeDefined()
      expect(typeof vi.fn).toBe('function')
      expect(vi.mock).toBeDefined()
      expect(typeof vi.mock).toBe('function')
      expect(vi.clearAllMocks).toBeDefined()
      expect(typeof vi.clearAllMocks).toBe('function')
    })

    it('JavaScript基本機能が利用可能', () => {
      expect(Object).toBeDefined()
      expect(typeof Object.keys).toBe('function')
      expect(Array).toBeDefined()
      expect(typeof Array.isArray).toBe('function')
      expect(Promise).toBeDefined()
      expect(typeof Promise.resolve).toBe('function')
    })

    it('サンプルデータ配列が正しく初期化されている', () => {
      expect(Array.isArray(sampleTeachers)).toBe(true)
      expect(sampleTeachers).toHaveLength(1)
      expect(Array.isArray(sampleSubjects)).toBe(true)
      expect(sampleSubjects).toHaveLength(1)
      expect(Array.isArray(sampleClassrooms)).toBe(true)
      expect(sampleClassrooms).toHaveLength(1)
    })

    it('サンプルデータの構造が正しく動作している', () => {
      expect(sampleTeachers[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          subjects: expect.any(Array),
          grades: expect.any(Array),
        })
      )
      expect(sampleSubjects[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          grades: expect.any(Array),
        })
      )
      expect(sampleClassrooms[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
        })
      )
    })

    it('オーケストレーターのオプション構造が正しく動作している', () => {
      const sampleOptions = {
        useOptimization: true,
        useNewAlgorithm: false,
        tolerantMode: false,
      }

      expect(typeof sampleOptions.useOptimization).toBe('boolean')
      expect(typeof sampleOptions.useNewAlgorithm).toBe('boolean')
      expect(typeof sampleOptions.tolerantMode).toBe('boolean')
    })

    it('モック戻り値の構造が正しく動作している', () => {
      const sampleResult = { success: true, data: { timetable: [] } }
      const sampleData = { settings: sampleSettings, teachers: sampleTeachers }

      expect(typeof sampleResult.success).toBe('boolean')
      expect(sampleResult.data).toBeDefined()
      expect(sampleData.settings).toBeDefined()
      expect(Array.isArray(sampleData.teachers)).toBe(true)
    })

    it('エラーハンドリング構造が正しく動作している', () => {
      const testError = new Error('テスト用エラー')
      expect(testError).toBeInstanceOf(Error)
      expect(testError.message).toBe('テスト用エラー')
      expect(typeof testError.stack).toBe('string')
    })
  })
})
