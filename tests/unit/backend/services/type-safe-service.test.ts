/**
 * 型安全サービスレイヤー 単体テスト
 *
 * 目的: データベースヘルパーとサービス機能の完全型安全性とバリデーション確認
 * 対象ファイル: src/backend/services/type-safe-service.ts
 * カバレッジ目標: 55分岐 100%
 *
 * テスト分類:
 * - TSS-HELPER: データベースヘルパー（10分岐）
 * - TSS-SCHOOL: 学校設定サービス（8分岐）
 * - TSS-TEACHER: 教師サービス（15分岐）
 * - TSS-SUBJECT: 教科サービス（12分岐）
 * - TSS-CLASSROOM: 教室サービス（10分岐）
 */

import type {
  Classroom,
  CreateTeacherRequest,
  EnhancedSchoolSettings,
  Subject,
  Teacher,
} from '@shared/schemas'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import {
  TypeSafeClassroomService,
  TypeSafeDbHelper,
  TypeSafeSchoolService,
  TypeSafeSchoolSettingsService,
  TypeSafeServiceError,
  TypeSafeSubjectService,
  TypeSafeTeacherService,
} from '../../../../src/backend/services/type-safe-service'

// ======================
// モックデータ定義
// ======================

// テスト用有効なUUID定数
const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000'
const VALID_UUID_2 = '456e7890-e89b-12d3-a456-426614174001'
const VALID_UUID_3 = '789e1234-e89b-12d3-a456-426614174002'
const VALID_UUID_4 = '012e5678-e89b-12d3-a456-426614174003'

const _mockSchoolSettings: EnhancedSchoolSettings = {
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
  statistics: {
    totalTeachers: 10,
    totalSubjects: 8,
    totalClassrooms: 15,
    totalClasses: 22,
  },
  validation: {
    isConfigured: true,
    hasMinimumTeachers: true,
    hasMinimumSubjects: true,
    warnings: [],
  },
}

const mockTeacher: Teacher = {
  id: VALID_UUID,
  name: '田中先生',
  school_id: 'default',
  subjects: JSON.stringify(['数学', '理科']),
  grades: JSON.stringify([1, 2]),
  assignment_restrictions: JSON.stringify([]),
  is_active: 1,
  order: 1,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  employee_number: null,
  email: null,
  phone: null,
  specialization: null,
  employment_type: null,
  max_hours_per_week: null,
}

const _mockSubject: Subject = {
  id: VALID_UUID_2,
  name: '数学',
  school_id: 'default',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  short_name: null,
  subject_code: null,
  category: null,
  weekly_hours: 4,
  requires_special_room: 0,
  color: null,
  settings: '{}',
  is_active: 1,
  target_grades: JSON.stringify([1, 2, 3]),
  order: 1,
  special_classroom: null,
}

const mockClassroom: Classroom = {
  id: VALID_UUID_3,
  name: '1年A組教室',
  type: '普通教室',
  capacity: 35,
  count: 1,
  location: null,
  order: 1,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
}

// ======================
// モック関数定義
// ======================

// 統一されたモックオブジェクト
const mockStatementMethods = {
  first: vi.fn(),
  all: vi.fn(),
  run: vi.fn(),
}

const mockPreparedStatement = {
  bind: vi.fn().mockReturnValue(mockStatementMethods),
  ...mockStatementMethods,
}

const mockD1Database = {
  prepare: vi.fn().mockReturnValue(mockPreparedStatement),
  first: vi.fn(),
  all: vi.fn(),
  run: vi.fn(),
}

// グローバルcrypto.randomUUID のモック
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
  },
})

// サービスインスタンス
let dbHelper: TypeSafeDbHelper
let schoolSettingsService: TypeSafeSchoolSettingsService
let teacherService: TypeSafeTeacherService
let subjectService: TypeSafeSubjectService
let classroomService: TypeSafeClassroomService
let schoolService: TypeSafeSchoolService

describe.skip('TypeSafeServiceLayer', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // モックメソッドを再設定
    mockStatementMethods.first.mockReset()
    mockStatementMethods.all.mockReset()
    mockStatementMethods.run.mockReset()

    // bindメソッドが正しくmockStatementMethodsを返すよう再設定
    mockPreparedStatement.bind.mockReturnValue(mockStatementMethods)

    // prepareが返すmockPreparedStatementを再設定
    mockD1Database.prepare.mockReturnValue(mockPreparedStatement)

    dbHelper = new TypeSafeDbHelper(mockD1Database as unknown as D1Database)
    schoolSettingsService = new TypeSafeSchoolSettingsService(
      mockD1Database as unknown as D1Database
    )
    teacherService = new TypeSafeTeacherService(mockD1Database as unknown as D1Database)
    subjectService = new TypeSafeSubjectService(mockD1Database as unknown as D1Database)
    classroomService = new TypeSafeClassroomService(mockD1Database as unknown as D1Database)
    schoolService = new TypeSafeSchoolService(mockD1Database as unknown as D1Database)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ======================
  // TSS-HELPER: データベースヘルパー（10分岐）
  // ======================

  describe('TypeSafeDbHelper', () => {
    /**
     * TSS-HELPER-001: queryFirst正常実行
     * 目的: 単一行取得の正常動作確認
     * 分岐カバレッジ: first()成功分岐
     */
    it('TSS-HELPER-001: queryFirst正常実行', async () => {
      const testData = { id: VALID_UUID, name: 'テスト' }
      mockStatementMethods.first.mockResolvedValue(testData)

      const TestSchema = z.object({ id: z.string().uuid(), name: z.string() })
      const result = await dbHelper.queryFirst('SELECT * FROM test', [], TestSchema)

      expect(result).toEqual(testData)
      expect(mockD1Database.prepare).toHaveBeenCalledWith('SELECT * FROM test')
    })

    /**
     * TSS-HELPER-002: queryFirst結果なし
     * 目的: 結果がない場合のnull返却確認
     * 分岐カバレッジ: result無し分岐
     */
    it('TSS-HELPER-002: queryFirst結果なし', async () => {
      mockStatementMethods.first.mockResolvedValue(null)

      const TestSchema = z.object({ id: z.string() })
      const result = await dbHelper.queryFirst('SELECT * FROM test', [], TestSchema)

      expect(result).toBeNull()
    })

    /**
     * TSS-HELPER-003: queryFirstデータベースエラー
     * 目的: データベース接続エラーの処理確認
     * 分岐カバレッジ: DB接続エラー分岐
     */
    it('TSS-HELPER-003: queryFirstデータベースエラー', async () => {
      // console.errorをモック化してエラーログを抑制
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockStatementMethods.first.mockRejectedValue(new Error('DB connection failed'))

      const TestSchema = z.object({ id: z.string() })
      await expect(dbHelper.queryFirst('SELECT * FROM test', [], TestSchema)).rejects.toThrow(
        'データベース操作に失敗しました'
      )

      consoleErrorSpy.mockRestore()
    })

    /**
     * TSS-HELPER-004: queryAll正常実行
     * 目的: 複数行取得の正常動作確認
     * 分岐カバレッジ: all()成功分岐
     */
    it('TSS-HELPER-004: queryAll正常実行', async () => {
      const testData = [
        { id: 'test1', name: 'テスト1' },
        { id: 'test2', name: 'テスト2' },
      ]
      mockStatementMethods.all.mockResolvedValue({ results: testData })

      const TestSchema = z.object({ id: z.string(), name: z.string() })
      const result = await dbHelper.queryAll('SELECT * FROM test', [], TestSchema)

      expect(result).toEqual(testData)
      expect(result).toHaveLength(2)
    })

    /**
     * TSS-HELPER-005: queryAllデータ型エラー
     * 目的: データ型変換エラーの処理確認
     * 分岐カバレッジ: 型変換エラー分岐
     */
    it('TSS-HELPER-005: queryAllデータ型エラー', async () => {
      // console.errorをモック化してエラーログを抑制
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const invalidData = [{ id: 123, name: 'テスト' }] // idが数値（string期待）
      mockStatementMethods.all.mockResolvedValue({ results: invalidData })

      const TestSchema = z.object({ id: z.string(), name: z.string() })
      await expect(dbHelper.queryAll('SELECT * FROM test', [], TestSchema)).rejects.toThrow(
        'データベース操作に失敗しました'
      )

      consoleErrorSpy.mockRestore()
    })

    /**
     * TSS-HELPER-006: execute正常実行
     * 目的: 実行系クエリの正常動作確認
     * 分岐カバレッジ: execute成功分岐
     */
    it('TSS-HELPER-006: execute正常実行', async () => {
      const mockResult = { success: true, changes: 1 }
      mockStatementMethods.run.mockResolvedValue(mockResult)

      const result = await dbHelper.execute('INSERT INTO test VALUES (?, ?)', ['id', 'name'])

      expect(result).toEqual(mockResult)
      expect(mockD1Database.prepare).toHaveBeenCalledWith('INSERT INTO test VALUES (?, ?)')
    })

    /**
     * TSS-HELPER-007: executeデータベースエラー
     * 目的: 実行エラーの処理確認
     * 分岐カバレッジ: execute失敗分岐
     */
    it('TSS-HELPER-007: executeデータベースエラー', async () => {
      // console.errorをモック化してエラーログを抑制
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockStatementMethods.run.mockRejectedValue(new Error('SQL execution failed'))

      await expect(dbHelper.execute('UPDATE test SET name = ?', ['新しい名前'])).rejects.toThrow(
        'データベース操作に失敗しました'
      )

      consoleErrorSpy.mockRestore()
    })
  })

  // ======================
  // TSS-SCHOOL: 学校設定サービス（8分岐）
  // ======================

  describe('TypeSafeSchoolSettingsService', () => {
    /**
     * TSS-SCHOOL-001: 学校設定取得正常（既存設定）
     * 目的: 既存設定の取得確認
     * 分岐カバレッジ: 既存設定分岐
     */
    it('TSS-SCHOOL-001: 学校設定取得正常（既存設定）', async () => {
      mockStatementMethods.first
        .mockResolvedValueOnce({
          // school_settings
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
        })
        .mockResolvedValueOnce({ count: 10 }) // teachers count
        .mockResolvedValueOnce({ count: 8 }) // subjects count
        .mockResolvedValueOnce({ count: 15 }) // classrooms count

      const result = await schoolSettingsService.getSchoolSettings()

      expect(result.id).toBe('default')
      expect(result.statistics.totalTeachers).toBe(10)
      expect(result.validation.isConfigured).toBe(true)
    })

    /**
     * TSS-SCHOOL-002: 学校設定取得（デフォルト適用）
     * 目的: 設定がない場合のデフォルト適用確認
     * 分岐カバレッジ: デフォルト設定適用分岐
     */
    it('TSS-SCHOOL-002: 学校設定取得（デフォルト適用）', async () => {
      mockStatementMethods.first
        .mockResolvedValueOnce(null) // school_settings なし
        .mockResolvedValueOnce({ count: 3 }) // teachers count
        .mockResolvedValueOnce({ count: 5 }) // subjects count
        .mockResolvedValueOnce({ count: 8 }) // classrooms count

      const result = await schoolSettingsService.getSchoolSettings()

      expect(result.grade1Classes).toBe(4) // デフォルト値
      expect(result.validation.hasMinimumTeachers).toBe(false) // 3人 < 5人
      expect(result.validation.warnings).toContain('教師が不足しています（推奨：5人以上）')
    })

    /**
     * TSS-SCHOOL-003: 学校設定更新正常
     * 目的: 設定更新の正常動作確認
     * 分岐カバレッジ: 更新成功分岐
     */
    it('TSS-SCHOOL-003: 学校設定更新正常', async () => {
      mockStatementMethods.run.mockResolvedValue({ success: true, changes: 1 })

      // 更新後の取得設定をモック
      mockStatementMethods.first
        .mockResolvedValueOnce({
          // 更新後のschool_settings
          id: 'default',
          grade1Classes: 5, // 更新された値
          grade2Classes: 4,
          grade3Classes: 4,
          grade4Classes: 3,
          grade5Classes: 3,
          grade6Classes: 3,
          dailyPeriods: 7, // 更新された値
          saturdayPeriods: 5,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T01:00:00.000Z',
        })
        .mockResolvedValueOnce({ count: 10 }) // teachers count
        .mockResolvedValueOnce({ count: 8 }) // subjects count
        .mockResolvedValueOnce({ count: 15 }) // classrooms count

      const updateData = {
        grade1Classes: 5,
        grade2Classes: 4,
        grade3Classes: 4,
        grade4Classes: 3,
        grade5Classes: 3,
        grade6Classes: 3,
        dailyPeriods: 7,
        saturdayPeriods: 5,
      }

      const result = await schoolSettingsService.updateSchoolSettings(updateData)

      expect(result.grade1Classes).toBe(5)
      expect(result.dailyPeriods).toBe(7)
      expect(mockStatementMethods.run).toHaveBeenCalled()
    })

    /**
     * TSS-SCHOOL-004: 学校設定更新失敗
     * 目的: 更新失敗時のエラー処理確認
     * 分岐カバレッジ: 更新失敗分岐
     */
    it('TSS-SCHOOL-004: 学校設定更新失敗', async () => {
      mockStatementMethods.run.mockResolvedValue({ success: false, changes: 0 })

      const updateData = {
        grade1Classes: 5,
        grade2Classes: 4,
        grade3Classes: 4,
        grade4Classes: 3,
        grade5Classes: 3,
        grade6Classes: 3,
        dailyPeriods: 7,
        saturdayPeriods: 5,
      }

      await expect(schoolSettingsService.updateSchoolSettings(updateData)).rejects.toThrow(
        '学校設定の更新に失敗しました'
      )
    })
  })

  // ======================
  // TSS-TEACHER: 教師サービス（15分岐）
  // ======================

  describe('TypeSafeTeacherService', () => {
    /**
     * TSS-TEACHER-001: 教師一覧取得正常（フィルタなし）
     * 目的: 基本的な教師一覧取得確認
     * 分岐カバレッジ: 基本クエリ分岐
     */
    it('TSS-TEACHER-001: 教師一覧取得正常（フィルタなし）', async () => {
      mockStatementMethods.first.mockResolvedValue({ total: 2 })
      mockStatementMethods.all.mockResolvedValue({
        results: [
          mockTeacher,
          {
            ...mockTeacher,
            id: VALID_UUID_2,
            name: '佐藤先生',
          },
        ],
      })

      const result = await teacherService.getTeachers()

      expect(result.teachers).toHaveLength(2)
      expect(result.pagination.total).toBe(2)
      expect(result.pagination.page).toBe(1)
    })

    /**
     * TSS-TEACHER-002: 教師一覧取得（検索フィルタ）
     * 目的: 名前検索フィルタの動作確認
     * 分岐カバレッジ: search条件分岐
     */
    it('TSS-TEACHER-002: 教師一覧取得（検索フィルタ）', async () => {
      mockStatementMethods.first.mockResolvedValue({ total: 1 })
      mockStatementMethods.all.mockResolvedValue({
        results: [
          mockTeacher,
        ],
      })

      const result = await teacherService.getTeachers({ search: '田中' })

      expect(result.teachers).toHaveLength(1)
      expect(mockD1Database.prepare).toHaveBeenCalledWith(expect.stringContaining('name LIKE ?'))
    })

    /**
     * TSS-TEACHER-003: 教師詳細取得正常
     * 目的: 教師詳細取得の正常動作確認
     * 分岐カバレッジ: 詳細取得成功分岐
     */
    it('TSS-TEACHER-003: 教師詳細取得正常', async () => {
      mockStatementMethods.first.mockResolvedValue(mockTeacher)

      const result = await teacherService.getTeacher(VALID_UUID)

      expect(result.id).toBe(VALID_UUID)
      expect(result.subjects).toEqual(['数学', '理科'])
    })

    /**
     * TSS-TEACHER-004: 教師詳細取得失敗
     * 目的: 存在しない教師の取得エラー確認
     * 分岐カバレッジ: 教師存在しない分岐
     */
    it('TSS-TEACHER-004: 教師詳細取得失敗', async () => {
      mockStatementMethods.first.mockResolvedValue(null)

      await expect(teacherService.getTeacher(VALID_UUID_2)).rejects.toThrow('教師が見つかりません')
    })

    /**
     * TSS-TEACHER-005: 教師作成正常
     * 目的: 教師作成の正常動作確認
     * 分岐カバレッジ: 作成成功分岐
     */
    it('TSS-TEACHER-005: 教師作成正常', async () => {
      mockStatementMethods.run.mockResolvedValue({ success: true, changes: 1 })
      mockStatementMethods.first.mockResolvedValue({
        ...mockTeacher,
        id: VALID_UUID_4,
        name: '新しい先生'
      })

      const teacherData: CreateTeacherRequest = {
        name: '新しい先生',
        subjects: ['数学'],
        grades: [1],
      }

      const result = await teacherService.createTeacher(teacherData)

      expect(result.id).toBe(VALID_UUID_4)
      expect(result.name).toBe('新しい先生')
      expect(mockStatementMethods.run).toHaveBeenCalled()
    })

    /**
     * TSS-TEACHER-006: 教師作成失敗
     * 目的: 教師作成失敗の処理確認
     * 分岐カバレッジ: 作成失敗分岐
     */
    it('TSS-TEACHER-006: 教師作成失敗', async () => {
      mockStatementMethods.run.mockResolvedValue({ success: false, changes: 0 })

      const teacherData: CreateTeacherRequest = {
        name: '新しい先生',
        subjects: ['数学'],
        grades: [1],
      }

      await expect(teacherService.createTeacher(teacherData)).rejects.toThrow(
        '教師の作成に失敗しました'
      )
    })

    /**
     * TSS-TEACHER-007: 教師更新正常
     * 目的: 教師更新の正常動作確認
     * 分岐カバレッジ: 更新成功分岐
     */
    it('TSS-TEACHER-007: 教師更新正常', async () => {
      // 既存教師取得のモック
      mockStatementMethods.first
        .mockResolvedValueOnce(mockTeacher)
        .mockResolvedValueOnce({
          ...mockTeacher,
          name: '更新された先生',
        })

      mockStatementMethods.run.mockResolvedValue({ success: true, changes: 1 })

      const updateData = {
        name: '更新された先生',
        subjects: ['数学', '理科'],
      }

      const result = await teacherService.updateTeacher(VALID_UUID, updateData)

      expect(result.name).toBe('更新された先生')
      expect(mockStatementMethods.run).toHaveBeenCalledWith()
    })

    /**
     * TSS-TEACHER-008: 教師更新失敗（存在しない）
     * 目的: 存在しない教師の更新エラー確認
     * 分岐カバレッジ: 更新対象なし分岐
     */
    it('TSS-TEACHER-008: 教師更新失敗（存在しない）', async () => {
      mockStatementMethods.first.mockResolvedValue(null)

      await expect(
        teacherService.updateTeacher(VALID_UUID_2, { name: '新しい名前' })
      ).rejects.toThrow('教師が見つかりません')
    })

    /**
     * TSS-TEACHER-009: 教師削除正常
     * 目的: 教師削除の正常動作確認
     * 分岐カバレッジ: 削除成功分岐
     */
    it('TSS-TEACHER-009: 教師削除正常', async () => {
      mockStatementMethods.first.mockResolvedValue(mockTeacher)
      mockStatementMethods.run.mockResolvedValue({ success: true, changes: 1 })

      const result = await teacherService.deleteTeacher(VALID_UUID)

      expect(result.deletedId).toBe(VALID_UUID)
      expect(result.deletedName).toBe('田中先生')
      expect(result.deletedAt).toBeDefined()
    })

    /**
     * TSS-TEACHER-010: 教師削除失敗
     * 目的: 削除失敗の処理確認
     * 分岐カバレッジ: 削除失敗分岐
     */
    it('TSS-TEACHER-010: 教師削除失敗', async () => {
      mockStatementMethods.first.mockResolvedValue(mockTeacher)
      mockStatementMethods.run.mockResolvedValue({ success: true, changes: 0 })

      await expect(teacherService.deleteTeacher(VALID_UUID)).rejects.toThrow(
        '教師の削除に失敗しました'
      )
    })
  })

  // ======================
  // TSS-SUBJECT: 教科サービス（12分岐）
  // ======================

  describe('TypeSafeSubjectService', () => {
    /**
     * TSS-SUBJECT-001: 教科一覧取得正常
     * 目的: 基本的な教科一覧取得確認
     * 分岐カバレッジ: 基本クエリ分岐
     */
    it('TSS-SUBJECT-001: 教科一覧取得正常', async () => {
      mockStatementMethods.first.mockResolvedValue({ total: 1 })
      mockStatementMethods.all.mockResolvedValue({
        results: [
          {
            id: VALID_UUID_2,
            name: '数学',
            school_id: 'default',
            target_grades: '[1,2,3]',
            weekly_hours: 4,
            requires_special_room: 0,
            color: null,
            settings: '{}',
            is_active: 1,
            order: 1,
            special_classroom: '普通教室',
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z',
            short_name: null,
            subject_code: null,
            category: null,
          },
        ],
      })

      const result = await subjectService.getSubjects()

      expect(result.subjects).toHaveLength(1)
      expect(result.subjects[0].name).toBe('数学')
    })

    /**
     * TSS-SUBJECT-002: 教科一覧取得（検索フィルタ）
     * 目的: 教科名検索フィルタの動作確認
     * 分岐カバレッジ: search条件分岐
     */
    it('TSS-SUBJECT-002: 教科一覧取得（検索フィルタ）', async () => {
      mockStatementMethods.first.mockResolvedValue({ total: 1 })
      mockStatementMethods.all.mockResolvedValue({ results: [] })

      await subjectService.getSubjects({ search: '数学' })

      expect(mockD1Database.prepare).toHaveBeenCalledWith(expect.stringContaining('name LIKE ?'))
    })

    /**
     * TSS-SUBJECT-003: 教科詳細取得正常
     * 目的: 教科詳細取得の正常動作確認
     * 分岐カバレッジ: 詳細取得成功分岐
     */
    it('TSS-SUBJECT-003: 教科詳細取得正常', async () => {
      mockStatementMethods.first.mockResolvedValue({
        id: VALID_UUID_2,
        name: '数学',
        school_id: 'default',
        target_grades: '[1,2,3]',
        weekly_hours: 4,
        requires_special_room: 0,
        color: null,
        settings: '{}',
        is_active: 1,
        order: 1,
        special_classroom: '普通教室',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        short_name: null,
        subject_code: null,
        category: null,
      })

      const result = await subjectService.getSubject(VALID_UUID_2)

      expect(result.id).toBe(VALID_UUID_2)
      expect(result.name).toBe('数学')
      expect(result.grades).toEqual([1, 2, 3])
    })

    /**
     * TSS-SUBJECT-004: 教科詳細取得失敗
     * 目的: 存在しない教科の取得エラー確認
     * 分岐カバレッジ: 教科存在しない分岐
     */
    it('TSS-SUBJECT-004: 教科詳細取得失敗', async () => {
      mockStatementMethods.first.mockResolvedValue(null)

      await expect(subjectService.getSubject(VALID_UUID_2)).rejects.toThrow(
        '指定された教科が見つかりません'
      )
    })

    /**
     * TSS-SUBJECT-005: 教科作成正常
     * 目的: 教科作成の正常動作確認
     * 分岐カバレッジ: 作成成功分岐
     */
    it('TSS-SUBJECT-005: 教科作成正常', async () => {
      mockStatementMethods.run.mockResolvedValue({ success: true, changes: 1 })
      mockStatementMethods.first.mockResolvedValue({
        id: VALID_UUID_4,
        name: '新しい教科',
        school_id: 'default',
        target_grades: '[1,2]',
        weekly_hours: 3,
        requires_special_room: 0,
        color: null,
        settings: '{}',
        is_active: 1,
        order: 1,
        special_classroom: '普通教室',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        short_name: null,
        subject_code: null,
        category: null,
      })

      const subjectData = {
        name: '新しい教科',
        grades: [1, 2],
        weeklyHours: { '1': 3, '2': 3 },
      }

      const result = await subjectService.createSubject(subjectData)

      expect(result.id).toBe(VALID_UUID_4)
      expect(result.name).toBe('新しい教科')
    })

    /**
     * TSS-SUBJECT-006: 教科作成失敗
     * 目的: 教科作成失敗の処理確認
     * 分岐カバレッジ: 作成失敗分岐
     */
    it('TSS-SUBJECT-006: 教科作成失敗', async () => {
      mockStatementMethods.run.mockResolvedValue({ success: false, changes: 0 })

      const subjectData = {
        name: '新しい教科',
        weeklyHours: { '1': 3 },
      }

      await expect(subjectService.createSubject(subjectData)).rejects.toThrow(
        '教科の作成に失敗しました'
      )
    })

    /**
     * TSS-SUBJECT-007: 教科更新正常
     * 目的: 教科更新の正常動作確認
     * 分岐カバレッジ: 更新成功分岐
     */
    it('TSS-SUBJECT-007: 教科更新正常', async () => {
      // 既存教科取得のモック
      mockStatementMethods.first
        .mockResolvedValueOnce({
          id: VALID_UUID_2,
          name: '数学',
          school_id: 'default',
          target_grades: '[1,2]',
          weekly_hours: 4,
          requires_special_room: 0,
          color: null,
          settings: '{}',
          is_active: 1,
          order: 1,
          special_classroom: '普通教室',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          short_name: null,
          subject_code: null,
          category: null,
        })
        .mockResolvedValueOnce({
          id: VALID_UUID_2,
          name: '更新された教科',
          school_id: 'default',
          target_grades: '[1,2,3]',
          weekly_hours: 5,
          requires_special_room: 0,
          color: null,
          settings: '{}',
          is_active: 1,
          order: 1,
          special_classroom: '普通教室',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T01:00:00.000Z',
          short_name: null,
          subject_code: null,
          category: null,
        })

      mockStatementMethods.run.mockResolvedValue({ success: true, changes: 1 })

      const updateData = {
        name: '更新された教科',
        grades: [1, 2, 3],
      }

      const result = await subjectService.updateSubject(VALID_UUID_2, updateData)

      expect(result.name).toBe('更新された教科')
    })

    /**
     * TSS-SUBJECT-008: 教科削除正常
     * 目的: 教科削除の正常動作確認
     * 分岐カバレッジ: 削除成功分岐
     */
    it('TSS-SUBJECT-008: 教科削除正常', async () => {
      mockStatementMethods.first.mockResolvedValue({
        id: VALID_UUID_2,
        name: '数学',
        school_id: 'default',
        target_grades: '[1,2,3]',
        weekly_hours: 4,
        requires_special_room: 0,
        color: null,
        settings: '{}',
        is_active: 1,
        order: 1,
        special_classroom: '普通教室',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        short_name: null,
        subject_code: null,
        category: null,
      })
      mockStatementMethods.run.mockResolvedValue({ success: true, changes: 1 })

      const result = await subjectService.deleteSubject(VALID_UUID_2)

      expect(result.deletedId).toBe(VALID_UUID_2)
      expect(result.deletedName).toBe('数学')
    })
  })

  // ======================
  // TSS-CLASSROOM: 教室サービス（10分岐）
  // ======================

  describe('TypeSafeClassroomService', () => {
    /**
     * TSS-CLASSROOM-001: 教室一覧取得正常
     * 目的: 基本的な教室一覧取得確認
     * 分岐カバレッジ: 基本クエリ分岐
     */
    it('TSS-CLASSROOM-001: 教室一覧取得正常', async () => {
      mockStatementMethods.first.mockResolvedValue({ total: 1 })
      mockStatementMethods.all
        .mockResolvedValueOnce({ results: [mockClassroom] }) // main query
        .mockResolvedValueOnce({
          // summary query
          results: [{ type: '普通教室', totalCapacity: 35, typeCount: 1 }],
        })

      const result = await classroomService.getClassrooms()

      expect(result.classrooms).toHaveLength(1)
      expect(result.summary?.totalCapacity).toBe(35)
    })

    /**
     * TSS-CLASSROOM-002: 教室一覧取得（容量フィルタ）
     * 目的: 容量フィルタの動作確認
     * 分岐カバレッジ: capacity条件分岐
     */
    it('TSS-CLASSROOM-002: 教室一覧取得（容量フィルタ）', async () => {
      mockStatementMethods.first.mockResolvedValue({ total: 0 })
      mockStatementMethods.all
        .mockResolvedValueOnce({ results: [] })
        .mockResolvedValueOnce({ results: [] })

      await classroomService.getClassrooms({ capacityMin: 30, capacityMax: 50 })

      expect(mockD1Database.prepare).toHaveBeenCalledWith(expect.stringContaining('capacity >= ?'))
    })

    /**
     * TSS-CLASSROOM-003: 教室詳細取得正常
     * 目的: 教室詳細取得の正常動作確認
     * 分岐カバレッジ: 詳細取得成功分岐
     */
    it('TSS-CLASSROOM-003: 教室詳細取得正常', async () => {
      mockStatementMethods.first.mockResolvedValue(mockClassroom)

      const result = await classroomService.getClassroom(VALID_UUID_3)

      expect(result.id).toBe(VALID_UUID_3)
      expect(result.name).toBe('1年A組教室')
    })

    /**
     * TSS-CLASSROOM-004: 教室詳細取得失敗
     * 目的: 存在しない教室の取得エラー確認
     * 分岐カバレッジ: 教室存在しない分岐
     */
    it('TSS-CLASSROOM-004: 教室詳細取得失敗', async () => {
      mockStatementMethods.first.mockResolvedValue(null)

      await expect(classroomService.getClassroom(VALID_UUID_2)).rejects.toThrow(
        '指定された教室が見つかりません'
      )
    })

    /**
     * TSS-CLASSROOM-005: 教室作成正常
     * 目的: 教室作成の正常動作確認
     * 分岐カバレッジ: 作成成功分岐
     */
    it('TSS-CLASSROOM-005: 教室作成正常', async () => {
      mockStatementMethods.run.mockResolvedValue({ success: true, changes: 1 })
      mockStatementMethods.first.mockResolvedValue({
        ...mockClassroom,
        id: VALID_UUID_4,
        name: '新しい教室',
      })

      const classroomData = {
        name: '新しい教室',
        type: '普通教室',
        capacity: 30,
      }

      const result = await classroomService.createClassroom(classroomData)

      expect(result.id).toBe(VALID_UUID_4)
      expect(result.name).toBe('新しい教室')
    })

    /**
     * TSS-CLASSROOM-006: 教室作成失敗
     * 目的: 教室作成失敗の処理確認
     * 分岐カバレッジ: 作成失敗分岐
     */
    it('TSS-CLASSROOM-006: 教室作成失敗', async () => {
      mockStatementMethods.run.mockResolvedValue({ success: false, changes: 0 })

      const classroomData = {
        name: '新しい教室',
        type: '普通教室',
      }

      await expect(classroomService.createClassroom(classroomData)).rejects.toThrow(
        '教室の作成に失敗しました'
      )
    })

    /**
     * TSS-CLASSROOM-007: 教室更新正常
     * 目的: 教室更新の正常動作確認
     * 分岐カバレッジ: 更新成功分岐
     */
    it('TSS-CLASSROOM-007: 教室更新正常', async () => {
      mockStatementMethods.first.mockResolvedValueOnce(mockClassroom).mockResolvedValueOnce({
        ...mockClassroom,
        name: '更新された教室',
      })
      mockStatementMethods.run.mockResolvedValue({ success: true, changes: 1 })

      const result = await classroomService.updateClassroom(VALID_UUID_3, {
        name: '更新された教室',
      })

      expect(result.name).toBe('更新された教室')
    })

    /**
     * TSS-CLASSROOM-008: 教室削除正常
     * 目的: 教室削除の正常動作確認
     * 分岐カバレッジ: 削除成功分岐
     */
    it('TSS-CLASSROOM-008: 教室削除正常', async () => {
      // console.errorをモック化してエラーログを抑制
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockStatementMethods.first.mockResolvedValue(mockClassroom)
      mockStatementMethods.run.mockResolvedValue({ success: true, changes: 1 })

      const result = await classroomService.deleteClassroom(VALID_UUID_3)

      expect(result.deletedId).toBe(VALID_UUID_3)
      expect(result.deletedName).toBe('1年A組教室')

      consoleErrorSpy.mockRestore()
    })
  })

  // ======================
  // TSS-INTEGRATION: 統合サービス（5分岐）
  // ======================

  describe('TypeSafeSchoolService', () => {
    /**
     * TSS-INTEGRATION-001: システム統計情報取得
     * 目的: 統合サービスのメトリクス取得確認
     * 分岐カバレッジ: メトリクス取得分岐
     */
    it('TSS-INTEGRATION-001: システム統計情報取得', async () => {
      // 学校設定サービスのモック
      mockStatementMethods.first
        .mockResolvedValueOnce({
          // school_settings
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
        })
        .mockResolvedValueOnce({ count: 10 }) // teachers count
        .mockResolvedValueOnce({ count: 8 }) // subjects count
        .mockResolvedValueOnce({ count: 15 }) // classrooms count

      const result = await schoolService.getSystemMetrics()

      expect(result.statistics.teachers).toBe(10)
      expect(result.statistics.subjects).toBe(8)
      expect(result.statistics.classrooms).toBe(15)
      expect(result.api.version).toBe('1.0.0')
      expect(result.features).toContain('完全型安全性')
    })

    /**
     * TSS-INTEGRATION-002: サービス統合確認
     * 目的: 統合サービスの子サービス初期化確認
     * 分岐カバレッジ: サービス初期化分岐
     */
    it('TSS-INTEGRATION-002: サービス統合確認', async () => {
      expect(schoolService.schoolSettings).toBeInstanceOf(TypeSafeSchoolSettingsService)
      expect(schoolService.teachers).toBeInstanceOf(TypeSafeTeacherService)
      expect(schoolService.subjects).toBeInstanceOf(TypeSafeSubjectService)
      expect(schoolService.classrooms).toBeInstanceOf(TypeSafeClassroomService)
    })
  })

  // ======================
  // TSS-ERROR: エラークラステスト（5分岐）
  // ======================

  describe('TypeSafeServiceError', () => {
    /**
     * TSS-ERROR-001: エラークラス正常作成
     * 目的: カスタムエラークラスの動作確認
     * 分岐カバレッジ: エラー作成分岐
     */
    it('TSS-ERROR-001: エラークラス正常作成', () => {
      const error = new TypeSafeServiceError('テストエラー', 'TEST_ERROR', { detail: 'test' })

      expect(error.message).toBe('テストエラー')
      expect(error.code).toBe('TEST_ERROR')
      expect(error.details).toEqual({ detail: 'test' })
      expect(error.name).toBe('TypeSafeServiceError')
    })

    /**
     * TSS-ERROR-002: エラークラス詳細なし
     * 目的: 詳細なしエラーの動作確認
     * 分岐カバレッジ: 詳細なしエラー分岐
     */
    it('TSS-ERROR-002: エラークラス詳細なし', () => {
      const error = new TypeSafeServiceError('シンプルエラー', 'SIMPLE_ERROR')

      expect(error.message).toBe('シンプルエラー')
      expect(error.code).toBe('SIMPLE_ERROR')
      expect(error.details).toBeUndefined()
    })
  })
})
