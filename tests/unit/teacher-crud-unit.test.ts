import type { CreateTeacherRequest, Teacher } from '@shared/schemas'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  TypeSafeServiceError,
  TypeSafeTeacherService,
} from '../../src/backend/services/type-safe-service'

// テスト用有効なUUID定数
const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000'
const _VALID_UUID_2 = '456e7890-e89b-12d3-a456-426614174001'

// モック設定
const mockStatementMethods = {
  first: vi.fn(),
  all: vi.fn(),
  run: vi.fn(),
}

const mockPreparedStatement = {
  bind: vi.fn().mockReturnValue(mockStatementMethods),
  first: mockStatementMethods.first,
  all: mockStatementMethods.all,
  run: mockStatementMethods.run,
}

const mockD1Database = {
  prepare: vi.fn().mockReturnValue(mockPreparedStatement),
}

// データベースから返される形式のmockデータ
const mockTeacherRaw = {
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
  // 必須フィールドをすべて追加
  email: null,
  employment_type: null,
  max_hours_per_week: null,
}

const _mockTeacher: Teacher = {
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
}

describe('教師CRUD 単体テスト', () => {
  let teacherService: TypeSafeTeacherService

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

    teacherService = new TypeSafeTeacherService(mockD1Database as unknown as D1Database)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('教師一覧取得', () => {
    it('TEACHER-UNIT-001: 正常な教師一覧取得', async () => {
      const mockTeachers = [
        {
          ...mockTeacherRaw,
          school_id: 'default', // 必須フィールド追加
        },
      ]
      mockStatementMethods.first.mockResolvedValue({ total: 1 })
      mockStatementMethods.all.mockResolvedValue({ results: mockTeachers })

      const result = await teacherService.getTeachers()

      expect(result.teachers).toHaveLength(1)
      expect(result.pagination.total).toBe(1)
      expect(mockD1Database.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT'))
    })

    it('TEACHER-UNIT-002: 空の教師一覧取得', async () => {
      mockStatementMethods.first.mockResolvedValue({ total: 0 })
      mockStatementMethods.all.mockResolvedValue({ results: [] })

      const result = await teacherService.getTeachers()

      expect(result.teachers).toEqual([])
      expect(result.pagination.total).toBe(0)
    })
  })

  describe('教師作成', () => {
    it('TEACHER-UNIT-003: 正常な教師作成', async () => {
      const createRequest: CreateTeacherRequest = {
        name: '新しい先生',
        subjects: ['数学'],
        grades: [1],
      }

      const mockCreateResult = {
        success: true,
        meta: { last_row_id: 1 },
      }

      mockStatementMethods.run.mockResolvedValue(mockCreateResult)
      mockStatementMethods.first.mockResolvedValue({
        ...mockTeacherRaw,
        name: createRequest.name,
        school_id: 'default', // 必須フィールド追加
        subjects: JSON.stringify(createRequest.subjects),
        grades: JSON.stringify(createRequest.grades),
      })

      const result = await teacherService.createTeacher(createRequest)

      expect(result.name).toBe(createRequest.name)
      expect(mockD1Database.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT'))
    })

    it('TEACHER-UNIT-004: 必須フィールドなしで作成失敗', async () => {
      const invalidRequest = {
        subjects: ['数学'],
        grades: [1],
      } as CreateTeacherRequest

      await expect(teacherService.createTeacher(invalidRequest)).rejects.toThrow('name')
    })
  })

  describe('教師取得', () => {
    it('TEACHER-UNIT-005: 正常な教師取得', async () => {
      mockStatementMethods.first.mockResolvedValue({
        ...mockTeacherRaw,
        school_id: 'default', // 必須フィールド追加
      })

      const result = await teacherService.getTeacher(VALID_UUID)

      expect(result.id).toBe(VALID_UUID)
      expect(result.name).toBe('田中先生')
      expect(mockD1Database.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT'))
    })

    it('TEACHER-UNIT-006: 存在しない教師の取得', async () => {
      mockStatementMethods.first.mockResolvedValue(null)

      await expect(teacherService.getTeacher(VALID_UUID)).rejects.toThrow(TypeSafeServiceError)
    })
  })

  describe('教師更新', () => {
    it('TEACHER-UNIT-007: 正常な教師更新', async () => {
      const updateData = {
        name: '更新された先生',
        subjects: ['理科'],
        grades: [2, 3],
      }

      const mockUpdateResult = {
        success: true,
        meta: { changes: 1 },
      }

      mockStatementMethods.run.mockResolvedValue(mockUpdateResult)
      mockStatementMethods.first.mockResolvedValue({
        ...mockTeacherRaw,
        name: updateData.name,
        school_id: 'default', // 必須フィールド追加
        subjects: JSON.stringify(updateData.subjects),
        grades: JSON.stringify(updateData.grades),
      })

      const result = await teacherService.updateTeacher(VALID_UUID, updateData)

      expect(result.name).toBe(updateData.name)
      expect(mockD1Database.prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE'))
    })

    it('TEACHER-UNIT-008: 存在しない教師の更新', async () => {
      const mockUpdateResult = {
        success: true,
        meta: { changes: 0 },
      }

      mockStatementMethods.run.mockResolvedValue(mockUpdateResult)

      await expect(
        teacherService.updateTeacher(VALID_UUID, { name: '存在しない' })
      ).rejects.toThrow(TypeSafeServiceError)
    })
  })

  describe('教師削除', () => {
    it('TEACHER-UNIT-009: 正常な教師削除', async () => {
      // 削除前に教師が存在することをモック
      mockStatementMethods.first.mockResolvedValue({
        ...mockTeacherRaw,
        school_id: 'default', // 必須フィールド追加
      })

      const mockDeleteResult = {
        success: true,
        meta: { changes: 1 },
      }

      mockStatementMethods.run.mockResolvedValue(mockDeleteResult)

      const result = await teacherService.deleteTeacher(VALID_UUID)

      expect(result.deletedId).toBe(VALID_UUID)
      expect(result.deletedName).toBe('田中先生')
      expect(result.deletedAt).toBeDefined()
      expect(mockD1Database.prepare).toHaveBeenCalledWith(expect.stringContaining('DELETE'))
    })

    it('TEACHER-UNIT-010: 存在しない教師の削除', async () => {
      const mockDeleteResult = {
        success: true,
        meta: { changes: 0 },
      }

      mockStatementMethods.run.mockResolvedValue(mockDeleteResult)

      await expect(teacherService.deleteTeacher(VALID_UUID)).rejects.toThrow(TypeSafeServiceError)
    })
  })

  describe('データベースエラーハンドリング', () => {
    it('TEACHER-UNIT-011: データベース接続エラー', async () => {
      mockD1Database.prepare.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      await expect(teacherService.getTeachers()).rejects.toThrow(TypeSafeServiceError)
    })

    it('TEACHER-UNIT-012: クエリ実行エラー', async () => {
      mockStatementMethods.all.mockRejectedValue(new Error('Query failed'))

      await expect(teacherService.getTeachers()).rejects.toThrow('Query failed')
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

    it('Vitestモック機能が正しく動作している', () => {
      expect(vi.fn).toBeDefined()
      expect(typeof vi.fn).toBe('function')
      expect(vi.clearAllMocks).toBeDefined()
      expect(typeof vi.clearAllMocks).toBe('function')
      expect(vi.restoreAllMocks).toBeDefined()
      expect(typeof vi.restoreAllMocks).toBe('function')
    })

    it('共有スキーマ型が正しくインポートされている', () => {
      // 型定義の存在を間接的に確認
      const teacherType: Teacher = _mockTeacher
      expect(teacherType).toBeDefined()
      expect(teacherType.id).toBe(VALID_UUID)
    })

    it('TypeSafeTeacherServiceクラスが正しくインポートされている', () => {
      expect(TypeSafeTeacherService).toBeDefined()
      expect(typeof TypeSafeTeacherService).toBe('function')
      expect(TypeSafeServiceError).toBeDefined()
      expect(typeof TypeSafeServiceError).toBe('function')
    })

    it('TypeSafeTeacherServiceが正しく作成されている', () => {
      expect(teacherService).toBeDefined()
      expect(teacherService).toBeInstanceOf(TypeSafeTeacherService)
      expect(typeof teacherService.getTeachers).toBe('function')
    })

    it('TypeSafeTeacherServiceのプロパティが正しく設定されている', () => {
      expect(teacherService).toHaveProperty('getTeachers')
      expect(teacherService).toHaveProperty('createTeacher')
      expect(teacherService).toHaveProperty('updateTeacher')
      expect(teacherService).toHaveProperty('deleteTeacher')
      expect(teacherService).toHaveProperty('getTeacher')
    })

    it('モックデータベースとステートメントが正しく設定されている', () => {
      expect(mockD1Database).toBeDefined()
      expect(typeof mockD1Database.prepare).toBe('function')
      expect(mockPreparedStatement).toBeDefined()
      expect(typeof mockPreparedStatement.bind).toBe('function')
      expect(mockStatementMethods).toBeDefined()
      expect(typeof mockStatementMethods.first).toBe('function')
      expect(typeof mockStatementMethods.all).toBe('function')
      expect(typeof mockStatementMethods.run).toBe('function')
    })

    it('テスト用データが適切に定義されている', () => {
      expect(VALID_UUID).toBeDefined()
      expect(typeof VALID_UUID).toBe('string')
      expect(mockTeacherRaw).toBeDefined()
      expect(mockTeacherRaw.id).toBe(VALID_UUID)
      expect(mockTeacherRaw.name).toBe('田中先生')
    })

    it('JSON機能が利用可能', () => {
      expect(JSON).toBeDefined()
      expect(JSON.stringify).toBeDefined()
      expect(typeof JSON.stringify).toBe('function')
      expect(JSON.parse).toBeDefined()
      expect(typeof JSON.parse).toBe('function')
    })
  })
})
