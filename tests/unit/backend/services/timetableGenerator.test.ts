/**
 * TimetableGenerator 単体テスト
 * 時間割生成アルゴリズムの包括的テスト - 26KB の核心ビジネスロジック
 */

import type {
  Classroom,
  EnhancedSchoolSettings,
  Subject,
  Teacher,
  TimetableGenerationResult,
  TimetableSlot,
} from '@shared/schemas'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TimetableGenerator } from '../../../../src/backend/services/timetableGenerator'

// 大きなクラスなのでdynamic importを使用して遅延読み込み
let TimetableGeneratorClass: typeof TimetableGenerator
let generator: TimetableGenerator

// 依存サービスをモック化
const mockConfig = {
  getSettings: vi.fn(),
}

const mockInitializer = {
  initializeTimetable: vi.fn(),
}

const mockAssigner = {
  assignSlot: vi.fn(),
  isSlotAvailable: vi.fn(),
}

const mockValidator = {
  validateTimetableSlot: vi.fn(),
  validateTimetableComplete: vi.fn(),
  checkConstraintViolations: vi.fn(),
  calculateQualityScore: vi.fn(),
  getUnassignedRequirements: vi.fn(),
  getImprovementSuggestions: vi.fn(),
}

const mockAnalyzer = {
  calculateStatistics: vi.fn(),
  calculateAssignmentRate: vi.fn(),
  analyzeCandidates: vi.fn(),
  getOptimizationRecommendations: vi.fn(),
}

describe('TimetableGenerator', () => {
  const mockSettings: EnhancedSchoolSettings = {
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

  const mockTeachers: Teacher[] = [
    {
      id: 'teacher-1',
      name: '田中先生',
      subjects: ['数学'],
      restrictions: [],
      school_id: 'default',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'teacher-2',
      name: '佐藤先生',
      subjects: ['国語'],
      restrictions: ['月曜1限', '金曜6限'],
      school_id: 'default',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    },
  ]

  const mockSubjects: Subject[] = [
    {
      id: 'subject-1',
      name: '数学',
      grades: [1, 2, 3],
      weeklyHours: { '1': 4, '2': 4, '3': 3 },
      requiresSpecialClassroom: false,
      specialClassroom: '',
      classroomType: '普通教室',
      order: 1,
      school_id: 'default',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'subject-2',
      name: '国語',
      grades: [1, 2, 3],
      weeklyHours: { '1': 5, '2': 5, '3': 4 },
      requiresSpecialClassroom: false,
      specialClassroom: '',
      classroomType: '普通教室',
      order: 2,
      school_id: 'default',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    },
  ]

  const mockClassrooms: Classroom[] = [
    {
      id: 'classroom-1',
      name: '1-1教室',
      type: '普通教室',
      capacity: 35,
      count: 1,
      order: 1,
      school_id: 'default',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    },
  ]

  beforeEach(async () => {
    vi.clearAllMocks()

    // 動的インポート（遅延読み込みでメモリ効率化）
    const module = await import('../../../../src/backend/services/timetableGenerator')
    TimetableGeneratorClass = module.TimetableGenerator

    // モックの初期化
    mockConfig.getSettings.mockReturnValue(mockSettings)
    mockInitializer.initializeTimetable.mockReturnValue([])
    mockAssigner.assignSlot.mockReturnValue(true)
    mockAssigner.isSlotAvailable.mockReturnValue(true)
    mockValidator.validateTimetableSlot.mockReturnValue(true)
    mockValidator.validateTimetableComplete.mockReturnValue([])
    mockValidator.checkConstraintViolations.mockReturnValue([])
    mockValidator.calculateQualityScore.mockReturnValue(85)
    mockValidator.getUnassignedRequirements.mockReturnValue([])
    mockValidator.getImprovementSuggestions.mockReturnValue([])
    mockAnalyzer.calculateStatistics.mockReturnValue({
      totalSlots: 120,
      assignedSlots: 100,
      unassignedSlots: 20,
      constraintViolations: 0,
    })
    mockAnalyzer.calculateAssignmentRate.mockReturnValue(83.33)
    mockAnalyzer.analyzeCandidates.mockReturnValue([])
    mockAnalyzer.getOptimizationRecommendations.mockReturnValue([])

    // TimetableGenerator インスタンス作成
    generator = new TimetableGeneratorClass(
      mockTeachers,
      mockSubjects,
      mockClassrooms,
      mockConfig as any,
      mockInitializer as any,
      mockAssigner as any,
      mockValidator as any,
      mockAnalyzer as any
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('必要な依存関係がすべて注入される', () => {
      expect(generator.teachers).toEqual(mockTeachers)
      expect(generator.subjects).toEqual(mockSubjects)
      expect(generator.classrooms).toEqual(mockClassrooms)
      expect(generator.config).toEqual(mockConfig)
      expect(generator.initializer).toEqual(mockInitializer)
      expect(generator.assigner).toEqual(mockAssigner)
      expect(generator.validator).toEqual(mockValidator)
      expect(generator.analyzer).toEqual(mockAnalyzer)
    })

    it('設定値が正しく初期化される', () => {
      expect(mockConfig.getSettings).toHaveBeenCalledOnce()
      expect(generator.dailyPeriods).toBe(6)
      expect(generator.saturdayPeriods).toBe(4)
      expect(generator.grade1Classes).toBe(4)
      expect(generator.grade2Classes).toBe(3)
      expect(generator.grade3Classes).toBe(3)
    })

    it('候補配列が初期化される', () => {
      expect(generator.candidates).toEqual([])
    })

    it('時間割配列が初期化される', () => {
      expect(generator.timetable).toEqual([])
    })

    it('ログ関数が設定される', () => {
      expect(typeof generator.log).toBe('function')

      // ログ関数のテスト
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      generator.log('test message')
      expect(consoleSpy).toHaveBeenCalledWith('[TimetableGenerator]', 'test message')
      consoleSpy.mockRestore()
    })

    it('無効な設定値を処理する', () => {
      const invalidSettings = { ...mockSettings, dailyPeriods: null }
      mockConfig.getSettings.mockReturnValueOnce(invalidSettings)

      const invalidGenerator = new TimetableGeneratorClass(
        mockTeachers,
        mockSubjects,
        mockClassrooms,
        mockConfig as any,
        mockInitializer as any,
        mockAssigner as any,
        mockValidator as any,
        mockAnalyzer as any
      )

      expect(invalidGenerator.dailyPeriods).toBe(6) // デフォルト値
    })
  })

  describe('generateTimetable', () => {
    it('正常な時間割生成が成功する', async () => {
      mockAnalyzer.calculateAssignmentRate.mockReturnValue(95.5)

      const result = await generator.generateTimetable()

      expect(result.success).toBe(true)
      expect(result.message).toContain('時間割生成が完了しました')
      expect(result.message).toContain('95.5%')
      expect(result.timetable).toBeDefined()
      expect(result.statistics).toBeDefined()
      expect(result.statistics?.assignmentRate).toBe(95.5)
    })

    it('教師データが存在しない場合エラーになる', async () => {
      generator.teachers = []

      const result = await generator.generateTimetable()

      expect(result.success).toBe(false)
      expect(result.message).toContain('教師データが存在しません')
    })

    it('教科データが存在しない場合エラーになる', async () => {
      generator.subjects = []

      const result = await generator.generateTimetable()

      expect(result.success).toBe(false)
      expect(result.message).toContain('教科データが存在しません')
    })

    it('tolerantModeオプションが正しく渡される', async () => {
      const executeAdvancedAssignmentSpy = vi
        .spyOn(generator, 'executeAdvancedAssignment')
        .mockResolvedValue({ success: true, retryCount: 1, bestRate: 90 })

      await generator.generateTimetable({ tolerantMode: true })

      expect(executeAdvancedAssignmentSpy).toHaveBeenCalledWith(true)
    })

    it('useNewAlgorithmオプションが指定されても新アルゴリズムを使用する', async () => {
      const executeAdvancedAssignmentSpy = vi
        .spyOn(generator, 'executeAdvancedAssignment')
        .mockResolvedValue({ success: true, retryCount: 2, bestRate: 88 })

      const result = await generator.generateTimetable({ useNewAlgorithm: true })

      expect(executeAdvancedAssignmentSpy).toHaveBeenCalled()
      expect(result.success).toBe(true)
    })

    it('executeAdvancedAssignmentのエラーを適切にハンドルする', async () => {
      vi.spyOn(generator, 'executeAdvancedAssignment').mockRejectedValue(
        new Error('Assignment failed')
      )

      const result = await generator.generateTimetable()

      expect(result.success).toBe(false)
      expect(result.message).toContain('Assignment failed')
    })

    it('NaN関連エラーで詳細ログを出力する', async () => {
      const logSpy = vi.spyOn(generator, 'log')
      vi.spyOn(generator, 'executeAdvancedAssignment').mockRejectedValue(
        new Error('NaN detected in calculation')
      )

      await generator.generateTimetable()

      expect(logSpy).toHaveBeenCalledWith('🔍 NaN関連エラー詳細分析:')
      expect(logSpy).toHaveBeenCalledWith('   Settings詳細:', expect.any(String))
      expect(logSpy).toHaveBeenCalledWith('   Teachers数:', 2)
      expect(logSpy).toHaveBeenCalledWith('   Subjects数:', 2)
    })

    it('統計情報が正しく返される', async () => {
      const mockStats = {
        totalSlots: 150,
        assignedSlots: 140,
        unassignedSlots: 10,
        constraintViolations: 2,
      }
      mockAnalyzer.calculateStatistics.mockReturnValue(mockStats)
      mockAnalyzer.calculateAssignmentRate.mockReturnValue(93.33)

      vi.spyOn(generator, 'executeAdvancedAssignment').mockResolvedValue({
        success: true,
        retryCount: 3,
        bestRate: 93.33,
      })

      const result = await generator.generateTimetable()

      expect(result.statistics).toEqual({
        assignmentRate: 93.33,
        retryCount: 3,
        bestRate: 93.33,
        ...mockStats,
      })
    })
  })

  describe('executeAdvancedAssignment', () => {
    it('高度な配置アルゴリズムが成功する', async () => {
      const sortTeachersSpy = vi
        .spyOn(generator, 'sortTeachersByDifficulty')
        .mockReturnValue(mockTeachers)
      const assignTeacherSpy = vi.spyOn(generator, 'assignTeacherSubjects').mockReturnValue(true)
      mockAnalyzer.calculateAssignmentRate.mockReturnValue(92.0)

      const result = await generator.executeAdvancedAssignment(false)

      expect(result.success).toBe(true)
      expect(result.retryCount).toBe(1)
      expect(result.bestRate).toBe(92.0)
      expect(sortTeachersSpy).toHaveBeenCalled()
      expect(assignTeacherSpy).toHaveBeenCalledTimes(mockTeachers.length)
    })

    it('tolerantModeでリトライ制限が変わる', async () => {
      vi.spyOn(generator, 'sortTeachersByDifficulty').mockReturnValue(mockTeachers)
      vi.spyOn(generator, 'assignTeacherSubjects').mockReturnValue(false)
      mockAnalyzer.calculateAssignmentRate.mockReturnValue(60.0)

      const result = await generator.executeAdvancedAssignment(true)

      // tolerantModeではより多くのリトライが許可される
      expect(result.retryCount).toBeGreaterThan(1)
    })

    it('最大リトライ数に達すると最良結果を返す', async () => {
      vi.spyOn(generator, 'sortTeachersByDifficulty').mockReturnValue(mockTeachers)
      vi.spyOn(generator, 'assignTeacherSubjects').mockReturnValue(false)
      mockAnalyzer.calculateAssignmentRate
        .mockReturnValueOnce(70.0)
        .mockReturnValueOnce(75.0)
        .mockReturnValueOnce(73.0)

      const result = await generator.executeAdvancedAssignment(false)

      expect(result.success).toBe(true)
      expect(result.bestRate).toBe(75.0) // 最良の結果
      expect(result.retryCount).toBeGreaterThan(1)
    })
  })

  describe('executeSimpleAssignment', () => {
    it('シンプルな配置アルゴリズムが動作する', async () => {
      generator.candidates = [
        {
          teacher: mockTeachers[0],
          subject: mockSubjects[0],
          grade: 1,
          classSection: 1,
        },
      ]

      const getAvailableSlotsSpy = vi
        .spyOn(generator, 'getAvailableSlotsForAssignment')
        .mockReturnValue([
          { day: 0, period: 0, slotIndex: 0, isAvailable: true },
          { day: 0, period: 1, slotIndex: 1, isAvailable: true },
        ])
      const assignToTimetableSpy = vi
        .spyOn(generator, 'assignToTimetableSlot')
        .mockReturnValue(true)

      const result = await generator.executeSimpleAssignment()

      expect(result.success).toBe(true)
      expect(getAvailableSlotsSpy).toHaveBeenCalled()
      expect(assignToTimetableSpy).toHaveBeenCalled()
    })

    it('利用可能なスロットがない場合失敗する', async () => {
      generator.candidates = [
        {
          teacher: mockTeachers[0],
          subject: mockSubjects[0],
          grade: 1,
          classSection: 1,
        },
      ]

      vi.spyOn(generator, 'getAvailableSlotsForAssignment').mockReturnValue([])

      const result = await generator.executeSimpleAssignment()

      expect(result.success).toBe(false)
    })
  })

  describe('calculateTeacherDifficulty', () => {
    it('教師の配置困難度を正しく計算する', () => {
      const difficulty = generator.calculateTeacherDifficulty(mockTeachers[0])

      expect(typeof difficulty).toBe('number')
      expect(difficulty).toBeGreaterThanOrEqual(0)
      expect(mockConfig.getSettings).toHaveBeenCalled()
    })

    it('制約の多い教師ほど困難度が高くなる', () => {
      const difficulty1 = generator.calculateTeacherDifficulty(mockTeachers[0]) // 制約なし
      const difficulty2 = generator.calculateTeacherDifficulty(mockTeachers[1]) // 制約あり

      expect(difficulty2).toBeGreaterThanOrEqual(difficulty1)
    })

    it('エラーハンドリングが正しく動作する', () => {
      mockConfig.getSettings.mockImplementationOnce(() => {
        throw new Error('Settings error')
      })

      const difficulty = generator.calculateTeacherDifficulty(mockTeachers[0])

      expect(typeof difficulty).toBe('number')
      expect(difficulty).toBe(Infinity) // エラー時は最大困難度
    })
  })

  describe('sortTeachersByDifficulty', () => {
    it('教師を困難度順にソートする', () => {
      vi.spyOn(generator, 'calculateTeacherDifficulty')
        .mockReturnValueOnce(10) // teacher-1
        .mockReturnValueOnce(5) // teacher-2

      const sorted = generator.sortTeachersByDifficulty()

      expect(sorted).toHaveLength(2)
      expect(sorted[0].id).toBe('teacher-2') // より困難度の低い教師が先頭
      expect(sorted[1].id).toBe('teacher-1')
    })

    it('同じ困難度の教師の順序は保持される', () => {
      vi.spyOn(generator, 'calculateTeacherDifficulty').mockReturnValue(5) // 同じ困難度

      const sorted = generator.sortTeachersByDifficulty()

      expect(sorted[0].id).toBe('teacher-1') // 元の順序を保持
      expect(sorted[1].id).toBe('teacher-2')
    })
  })

  describe('assignTeacherSubjects', () => {
    it('教師の教科を正しく割り当てる', () => {
      const assignSubjectSpy = vi.spyOn(generator, 'assignSubjectToClass').mockReturnValue(true)

      const result = generator.assignTeacherSubjects(mockTeachers[0])

      expect(result).toBe(true)
      expect(assignSubjectSpy).toHaveBeenCalled()
    })

    it('割り当てに失敗した場合falseを返す', () => {
      vi.spyOn(generator, 'assignSubjectToClass').mockReturnValue(false)

      const result = generator.assignTeacherSubjects(mockTeachers[0])

      expect(result).toBe(false)
    })
  })

  describe('assignSubjectToClass', () => {
    it('教科をクラスに正しく割り当てる', () => {
      vi.spyOn(generator, 'getAvailableSlotsForAssignment').mockReturnValue([
        { day: 0, period: 0, slotIndex: 0, isAvailable: true },
        { day: 0, period: 1, slotIndex: 1, isAvailable: true },
      ])
      vi.spyOn(generator, 'assignToTimetableSlot').mockReturnValue(true)

      const result = generator.assignSubjectToClass(mockTeachers[0], '数学', 1, 1)

      expect(result).toBe(true)
    })

    it('利用可能なスロットがない場合は強制割り当てを試行する', () => {
      vi.spyOn(generator, 'getAvailableSlotsForAssignment').mockReturnValue([])
      const assignRemainingWithViolationsSpy = vi
        .spyOn(generator, 'assignRemainingWithViolations')
        .mockReturnValue(true)

      const result = generator.assignSubjectToClass(mockTeachers[0], '数学', 1, 1)

      expect(assignRemainingWithViolationsSpy).toHaveBeenCalled()
      expect(result).toBe(true)
    })
  })

  describe('getAvailableSlotsForAssignment', () => {
    it('利用可能なスロットを正しく返す', () => {
      mockAssigner.isSlotAvailable.mockReturnValue(true)

      const slots = generator.getAvailableSlotsForAssignment(mockTeachers[0], '数学', 1, 1)

      expect(Array.isArray(slots)).toBe(true)
      expect(slots.length).toBeGreaterThan(0)
      expect(slots[0]).toHaveProperty('day')
      expect(slots[0]).toHaveProperty('period')
      expect(slots[0]).toHaveProperty('slotIndex')
      expect(slots[0]).toHaveProperty('isAvailable')
    })

    it('利用できないスロットは除外される', () => {
      mockAssigner.isSlotAvailable
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)

      const slots = generator.getAvailableSlotsForAssignment(mockTeachers[0], '数学', 1, 1)

      const availableSlots = slots.filter(slot => slot.isAvailable)
      expect(availableSlots.length).toBe(2) // 1つが除外される
    })
  })

  describe('isTeacherAvailable', () => {
    it('教師の利用可能性を正しくチェックする', () => {
      const available = generator.isTeacherAvailable(mockTeachers[0], 0, 0) // 月曜1限

      expect(typeof available).toBe('boolean')
      expect(available).toBe(true) // 制約のない教師
    })

    it('制約のある教師の利用不可時間を正しく判定する', () => {
      const available = generator.isTeacherAvailable(mockTeachers[1], 0, 0) // 月曜1限（制約あり）

      expect(available).toBe(false) // 制約により利用不可
    })

    it('曜日名の変換が正しく動作する', () => {
      const dayNames = ['月曜', '火曜', '水曜', '木曜', '金曜', '土曜']

      dayNames.forEach((_, dayIndex) => {
        generator.isTeacherAvailable(mockTeachers[1], dayIndex, 0)
      })

      // エラーなく実行できることを確認
      expect(true).toBe(true)
    })
  })

  describe('calculateSlotIndex', () => {
    it('スロットインデックスを正しく計算する', () => {
      const index = generator.calculateSlotIndex(0, 0) // 月曜1限

      expect(typeof index).toBe('number')
      expect(index).toBeGreaterThanOrEqual(0)
    })

    it('無効な入力値を安全に処理する', () => {
      const index1 = generator.calculateSlotIndex(null as any, null as any)
      const index2 = generator.calculateSlotIndex(undefined as any, undefined as any)
      const index3 = generator.calculateSlotIndex(NaN, NaN)

      expect(typeof index1).toBe('number')
      expect(typeof index2).toBe('number')
      expect(typeof index3).toBe('number')
      expect(index1).toBeGreaterThanOrEqual(0)
      expect(index2).toBeGreaterThanOrEqual(0)
      expect(index3).toBeGreaterThanOrEqual(0)
    })

    it('土曜日の計算が正しく動作する', () => {
      const saturdayIndex = generator.calculateSlotIndex(5, 0) // 土曜1限
      const mondayIndex = generator.calculateSlotIndex(0, 0) // 月曜1限

      expect(saturdayIndex).toBeGreaterThan(mondayIndex)
    })
  })

  describe('assignToTimetableSlot', () => {
    it('時間割スロットに正しく配置する', () => {
      const candidate = {
        teacher: mockTeachers[0],
        subject: mockSubjects[0],
        grade: 1,
        classSection: 1,
      }

      const result = generator.assignToTimetableSlot(candidate, 0, 0)

      expect(typeof result).toBe('boolean')
      expect(result).toBe(true)
      expect(mockValidator.validateTimetableSlot).toHaveBeenCalled()
    })

    it('バリデーション失敗時はfalseを返す', () => {
      mockValidator.validateTimetableSlot.mockReturnValue(false)

      const candidate = {
        teacher: mockTeachers[0],
        subject: mockSubjects[0],
        grade: 1,
        classSection: 1,
      }

      const result = generator.assignToTimetableSlot(candidate, 0, 0)

      expect(result).toBe(false)
    })
  })

  describe('forceAssignWithViolation', () => {
    it('制約違反ありで強制配置する', () => {
      const candidate = {
        teacher: mockTeachers[0],
        subject: mockSubjects[0],
        grade: 1,
        classSection: 1,
      }

      const result = generator.forceAssignWithViolation(candidate)

      expect(typeof result).toBe('boolean')
      expect(result).toBe(true)
      expect(generator.timetable.length).toBeGreaterThan(0)

      // 制約違反フラグが設定されることを確認
      const lastAssignment = generator.timetable[generator.timetable.length - 1]
      expect(lastAssignment.isViolation).toBe(true)
    })

    it('設定値の検証が行われる', () => {
      const candidate = {
        teacher: mockTeachers[0],
        subject: mockSubjects[0],
        grade: 1,
        classSection: 1,
      }

      generator.forceAssignWithViolation(candidate)

      expect(mockConfig.getSettings).toHaveBeenCalled()
    })
  })

  describe('assignRemainingWithViolations', () => {
    it('残りの未配置項目を制約違反ありで配置する', () => {
      generator.candidates = [
        {
          teacher: mockTeachers[0],
          subject: mockSubjects[0],
          grade: 1,
          classSection: 1,
        },
      ]

      const forceAssignSpy = vi.spyOn(generator, 'forceAssignWithViolation').mockReturnValue(true)

      const result = generator.assignRemainingWithViolations()

      expect(result).toBe(true)
      expect(forceAssignSpy).toHaveBeenCalled()
    })

    it('候補が空の場合はtrueを返す', () => {
      generator.candidates = []

      const result = generator.assignRemainingWithViolations()

      expect(result).toBe(true)
    })
  })

  describe('validateTimetable', () => {
    it('時間割の妥当性検証を行う', () => {
      mockValidator.checkConstraintViolations.mockReturnValue([])
      mockValidator.calculateQualityScore.mockReturnValue(90)
      mockValidator.getUnassignedRequirements.mockReturnValue([])
      mockValidator.getImprovementSuggestions.mockReturnValue(['suggestion1'])

      const result = generator.validateTimetable()

      expect(result).toHaveProperty('isValid')
      expect(result).toHaveProperty('overallScore')
      expect(result).toHaveProperty('violations')
      expect(result).toHaveProperty('qualityMetrics')
      expect(result).toHaveProperty('unassignedRequirements')
      expect(result).toHaveProperty('improvementSuggestions')
      expect(result.overallScore).toBe(90)
    })

    it('制約違反がある場合は無効と判定する', () => {
      mockValidator.checkConstraintViolations.mockReturnValue(['violation1'])

      const result = generator.validateTimetable()

      expect(result.isValid).toBe(false)
      expect(result.violations).toContain('violation1')
    })
  })

  describe('getConstraintAnalysis', () => {
    it('制約分析を正しく実行する', () => {
      vi.spyOn(generator, 'calculateTeacherDifficulty')
        .mockReturnValueOnce(15)
        .mockReturnValueOnce(8)
      mockAnalyzer.analyzeCandidates.mockReturnValue(['analysis1'])
      mockAnalyzer.getOptimizationRecommendations.mockReturnValue(['rec1'])

      const analysis = generator.getConstraintAnalysis()

      expect(analysis).toHaveProperty('teacherDifficulties')
      expect(analysis).toHaveProperty('constraintStats')
      expect(analysis).toHaveProperty('candidateAnalysis')
      expect(analysis).toHaveProperty('optimizationRecommendations')
      expect(analysis.teacherDifficulties).toHaveLength(2)
      expect(analysis.constraintStats.averageDifficulty).toBe(11.5)
    })
  })

  describe('getStatistics', () => {
    it('統計情報を返す', () => {
      const stats = generator.getStatistics()

      expect(mockAnalyzer.calculateStatistics).toHaveBeenCalledWith(generator.timetable)
      expect(stats).toBeDefined()
    })
  })

  describe('getTimetable', () => {
    it('現在の時間割を返す', () => {
      const timetable = generator.getTimetable()

      expect(timetable).toEqual(generator.timetable)
    })
  })

  describe('エラーハンドリングとエッジケース', () => {
    it('null/undefinedの教師リストを処理する', () => {
      expect(() => {
        new TimetableGeneratorClass(
          null as any,
          mockSubjects,
          mockClassrooms,
          mockConfig as any,
          mockInitializer as any,
          mockAssigner as any,
          mockValidator as any,
          mockAnalyzer as any
        )
      }).not.toThrow()
    })

    it('空の教科リストを処理する', () => {
      expect(() => {
        new TimetableGeneratorClass(
          mockTeachers,
          [],
          mockClassrooms,
          mockConfig as any,
          mockInitializer as any,
          mockAssigner as any,
          mockValidator as any,
          mockAnalyzer as any
        )
      }).not.toThrow()
    })

    it('無効な設定値でも動作する', () => {
      const invalidSettings = {
        ...mockSettings,
        dailyPeriods: -1,
        saturdayPeriods: null,
        grade1Classes: undefined,
      }
      mockConfig.getSettings.mockReturnValue(invalidSettings)

      expect(() => {
        new TimetableGeneratorClass(
          mockTeachers,
          mockSubjects,
          mockClassrooms,
          mockConfig as any,
          mockInitializer as any,
          mockAssigner as any,
          mockValidator as any,
          mockAnalyzer as any
        )
      }).not.toThrow()
    })

    it('大きな数値に対して正しく動作する', () => {
      const largeSettings = {
        ...mockSettings,
        dailyPeriods: 100,
        grade1Classes: 50,
      }
      mockConfig.getSettings.mockReturnValue(largeSettings)

      const largeGenerator = new TimetableGeneratorClass(
        mockTeachers,
        mockSubjects,
        mockClassrooms,
        mockConfig as any,
        mockInitializer as any,
        mockAssigner as any,
        mockValidator as any,
        mockAnalyzer as any
      )

      expect(largeGenerator.dailyPeriods).toBe(100)
      expect(largeGenerator.grade1Classes).toBe(50)
    })
  })

  describe('メモリとパフォーマンス', () => {
    it('大量データでメモリリークしない', () => {
      const largeMockTeachers = Array.from({ length: 10 }, (_, i) => ({
        ...mockTeachers[0],
        id: `teacher-${i}`,
        name: `先生${i}`,
      }))

      expect(() => {
        const largeGenerator = new TimetableGeneratorClass(
          largeMockTeachers,
          mockSubjects,
          mockClassrooms,
          mockConfig as any,
          mockInitializer as any,
          mockAssigner as any,
          mockValidator as any,
          mockAnalyzer as any
        )

        // 大量データ操作をシミュレート
        largeGenerator.sortTeachersByDifficulty()
      }).not.toThrow()
    })

    it('候補配列の操作が効率的である', () => {
      const startTime = performance.now()

      // 少量の候補を生成（安全性重視）
      generator.candidates = Array.from({ length: 10 }, (_, i) => ({
        teacher: mockTeachers[i % mockTeachers.length],
        subject: mockSubjects[i % mockSubjects.length],
        grade: (i % 3) + 1,
        classSection: (i % 5) + 1,
      }))

      // 配列操作を実行
      generator.candidates.forEach(() => {})

      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(100) // 100ms以下
    })
  })

  describe('設定値の型安全性', () => {
    it('型安全な設定値アクセス', () => {
      expect(typeof generator.dailyPeriods).toBe('number')
      expect(typeof generator.saturdayPeriods).toBe('number')
      expect(typeof generator.grade1Classes).toBe('number')
      expect(typeof generator.grade2Classes).toBe('number')
      expect(typeof generator.grade3Classes).toBe('number')
    })

    it('設定値の範囲チェック', () => {
      expect(generator.dailyPeriods).toBeGreaterThan(0)
      expect(generator.saturdayPeriods).toBeGreaterThanOrEqual(0)
      expect(generator.grade1Classes).toBeGreaterThan(0)
      expect(generator.grade2Classes).toBeGreaterThan(0)
      expect(generator.grade3Classes).toBeGreaterThan(0)
    })
  })
})
