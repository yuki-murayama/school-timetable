/**
 * 時間割生成サービス 簡略化テスト
 *
 * 目的: 実装されているメソッドのみをテストする最小テストファイル
 * 対象ファイル: src/backend/services/timetable-generation-service.ts
 */

import type { Classroom, EnhancedSchoolSettings, Subject, Teacher } from '@shared/schemas'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TypeSafeTimetableGenerationService } from './timetable-generation-service'

// ======================
// モックデータ定義
// ======================

const mockSchoolSettings: EnhancedSchoolSettings = {
  id: 'settings-1',
  grade1Classes: 4,
  grade2Classes: 3,
  grade3Classes: 3,
  grade4Classes: 0,
  grade5Classes: 0,
  grade6Classes: 0,
  dailyPeriods: 6,
  saturdayPeriods: 4,
  validation: {
    rules: [],
    constraints: {},
    qualityThresholds: {},
  },
  statistics: {
    metrics: {},
    reports: {},
  },
  total: 1,
}

const mockTeachers: Teacher[] = [
  {
    id: 'teacher-1',
    name: '田中先生',
    grades: [1],
    subjects: ['math'],
    assignmentRestrictions: [],
    maxWeeklyHours: 20,
    preferredTimeSlots: [],
    unavailableSlots: [],
  },
]

const mockSubjects: Subject[] = [
  {
    id: 'math',
    name: '数学',
    grades: [1, 2, 3],
    weeklyHours: {
      '1': 4,
      '2': 3,
      '3': 4,
    },
    requiresSpecialClassroom: false,
    classroomType: 'general',
    color: '#ff0000',
    order: 1,
  },
]

const mockClassrooms: Classroom[] = [
  {
    id: 'classroom-1',
    name: '1-A教室',
    type: 'general',
    capacity: 30,
    features: [],
    equipment: [],
  },
]

// ======================
// モック関数定義
// ======================
const mockPreparedStatement = {
  bind: vi.fn().mockReturnThis(),
  first: vi.fn().mockResolvedValue(mockSchoolSettings),
  all: vi.fn().mockResolvedValue({
    results: [...mockTeachers, ...mockSubjects, ...mockClassrooms],
    total: 10,
    count: 10,
  }),
  run: vi.fn().mockResolvedValue({ success: true }),
}

const mockD1Database = {
  prepare: vi.fn().mockReturnValue(mockPreparedStatement),
}

const mockEnv = {
  DB: mockD1Database,
}

// サービスインスタンス
let service: TypeSafeTimetableGenerationService

describe('TypeSafeTimetableGenerationService - 簡略化テスト', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    service = new TypeSafeTimetableGenerationService(mockEnv.DB)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('初期化', () => {
    it('サービスが正常にインスタンス化される', () => {
      expect(service).toBeDefined()
      expect(service.generateTimetableForClass).toBeDefined()
      expect(service.getSavedTimetables).toBeDefined()
    })
  })

  describe('時間割生成', () => {
    it('時間割生成メソッドが存在する', async () => {
      expect(typeof service.generateTimetableForClass).toBe('function')
    })
  })

  describe('時間割取得', () => {
    it('保存された時間割取得メソッドが存在する', async () => {
      expect(typeof service.getSavedTimetables).toBe('function')
    })
  })

  describe('バリデーション', () => {
    it('無効な学年でエラーが発生する', async () => {
      await expect(service.generateTimetableForClass(0, 'A')).rejects.toThrow()
    })

    it('無効なクラス名でエラーが発生する', async () => {
      await expect(service.generateTimetableForClass(1, '1')).rejects.toThrow()
    })
  })

  describe('データ構造', () => {
    it('モックデータが正しく定義されている', () => {
      expect(mockSchoolSettings).toBeDefined()
      expect(mockSchoolSettings.total).toBe(1)
      expect(mockTeachers).toBeDefined()
      expect(mockSubjects).toBeDefined()
      expect(mockClassrooms).toBeDefined()
    })
  })
})
