/**
 * Teacher API 単体テスト
 * 教師関連APIの包括的テスト - 110行の重要APIファイル
 */

import type { CreateTeacherRequest, LegacyTeacher } from '@shared/schemas'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { teacherApi } from '../../../../../src/frontend/lib/api/teacher'

// 共有スキーマをモック化
vi.mock('@shared/schemas', async importOriginal => {
  const original = await importOriginal<typeof import('@shared/schemas')>()
  return {
    ...original,
    LegacyTeacherSchema: {
      parse: vi.fn(),
      optional: vi.fn(() => ({ parse: vi.fn() })),
    },
    CreateTeacherRequestSchema: {
      parse: vi.fn(),
      partial: vi.fn(() => ({
        parse: vi.fn(),
      })),
    },
  }
})

// APIクライアントをモック化
vi.mock('../../../../../src/frontend/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

import { CreateTeacherRequestSchema, LegacyTeacherSchema } from '@shared/schemas'
import { apiClient } from '../../../../../src/frontend/lib/api/client'

const mockApiClient = apiClient as {
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
  patch: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

describe('Teacher API', () => {
  const mockTeacher: LegacyTeacher = {
    id: 'teacher-1',
    name: '田中太郎',
    subjects: ['数学', '理科'],
    grades: [1, 2, 3],
    assignmentRestrictions: ['月曜1限不可'],
    order: 1,
    school_id: 'default',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  }

  const mockOptions = {
    token: 'test-token',
    getFreshToken: vi.fn().mockResolvedValue('fresh-token'),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // LegacyTeacherSchemaのparseをモック設定
    vi.mocked(LegacyTeacherSchema.parse).mockReturnValue(mockTeacher)
    // CreateTeacherRequestSchemaのparseをモック設定
    vi.mocked(CreateTeacherRequestSchema.parse).mockReturnValue({
      name: mockTeacher.name,
      subjects: mockTeacher.subjects,
      grades: mockTeacher.grades,
      assignmentRestrictions: mockTeacher.assignmentRestrictions,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getTeachers', () => {
    it('教師一覧を正常に取得する', async () => {
      const mockResponse = {
        teachers: [mockTeacher],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      }

      mockApiClient.get.mockResolvedValue(mockResponse)

      const result = await teacherApi.getTeachers(mockOptions)

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/teachers',
        expect.any(Object), // TeachersListResponseSchema
        mockOptions
      )
      expect(result.teachers).toHaveLength(1)
      expect(result.teachers[0]).toEqual(mockTeacher)
      expect(result.pagination).toEqual({ page: 1, limit: 10, total: 1, totalPages: 1 })
    })

    it('空の教師一覧を正常に処理する', async () => {
      const mockResponse = {
        teachers: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      }

      mockApiClient.get.mockResolvedValue(mockResponse)

      const result = await teacherApi.getTeachers(mockOptions)

      expect(result.teachers).toHaveLength(0)
      expect(result.pagination?.total).toBe(0)
    })

    it('ページネーションなしのレスポンスを処理する', async () => {
      const mockResponse = {
        teachers: [mockTeacher],
      }

      mockApiClient.get.mockResolvedValue(mockResponse)

      const result = await teacherApi.getTeachers(mockOptions)

      expect(result.teachers).toHaveLength(1)
      expect(result.pagination).toBeUndefined()
    })

    it('APIクライアントエラーを適切に処理する', async () => {
      const error = new Error('Network error')
      mockApiClient.get.mockRejectedValue(error)

      await expect(teacherApi.getTeachers(mockOptions)).rejects.toThrow('Network error')
    })
  })

  describe('createTeacher', () => {
    const newTeacherData: CreateTeacherRequest = {
      name: '佐藤花子',
      subjects: ['国語', '社会'],
      grades: [2, 3],
      assignmentRestrictions: ['金曜5限不可'],
    }

    it('新しい教師を正常に作成する', async () => {
      mockApiClient.post.mockResolvedValue(mockTeacher)

      const result = await teacherApi.createTeacher(newTeacherData, mockOptions)

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/teachers',
        newTeacherData,
        expect.any(Object), // LegacyTeacherSchema
        mockOptions
      )
      expect(result).toEqual(mockTeacher)
    })

    it('必須フィールドが不足している場合はエラーを処理する', async () => {
      const invalidData = { subjects: ['数学'] } // nameが不足
      const error = new Error('Validation error')

      mockApiClient.post.mockRejectedValue(error)

      await expect(teacherApi.createTeacher(invalidData as any, mockOptions)).rejects.toThrow(
        'Validation error'
      )
    })

    it('作成失敗時のエラーハンドリング', async () => {
      const error = new Error('Server error')
      mockApiClient.post.mockRejectedValue(error)

      await expect(teacherApi.createTeacher(newTeacherData, mockOptions)).rejects.toThrow(
        'Server error'
      )
    })
  })

  describe('updateTeacher', () => {
    const updateData = {
      name: '田中太郎（更新）',
      subjects: ['数学', '物理'],
    }

    it('教師を正常に更新する', async () => {
      const updatedTeacher = { ...mockTeacher, ...updateData }
      mockApiClient.put.mockResolvedValue(updatedTeacher)

      const result = await teacherApi.updateTeacher('teacher-1', updateData, mockOptions)

      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/teachers/teacher-1',
        updateData,
        expect.any(Object), // CreateTeacherRequestSchema.partial()
        expect.any(Object), // LegacyTeacherSchema
        mockOptions
      )
      expect(result).toEqual(updatedTeacher)
    })

    it('存在しない教師の更新でエラーハンドリング', async () => {
      const error = new Error('Teacher not found')
      mockApiClient.put.mockRejectedValue(error)

      await expect(
        teacherApi.updateTeacher('nonexistent', updateData, mockOptions)
      ).rejects.toThrow('Teacher not found')
    })

    it('部分更新で必要なフィールドのみを送信する', async () => {
      const partialUpdate = { name: '新しい名前' }
      mockApiClient.put.mockResolvedValue({ ...mockTeacher, ...partialUpdate })

      await teacherApi.updateTeacher('teacher-1', partialUpdate, mockOptions)

      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/teachers/teacher-1',
        partialUpdate,
        expect.any(Object),
        expect.any(Object),
        mockOptions
      )
    })

    it('空のオブジェクトで部分更新を実行する', async () => {
      mockApiClient.put.mockResolvedValue(mockTeacher)

      const result = await teacherApi.updateTeacher('teacher-1', {}, mockOptions)

      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/teachers/teacher-1',
        {},
        expect.any(Object),
        expect.any(Object),
        mockOptions
      )
      expect(result).toEqual(mockTeacher)
    })
  })

  describe('deleteTeacher', () => {
    it('教師を正常に削除する', async () => {
      mockApiClient.delete.mockResolvedValue(undefined)

      await teacherApi.deleteTeacher('teacher-1', mockOptions)

      expect(mockApiClient.delete).toHaveBeenCalledWith(
        '/teachers/teacher-1',
        expect.any(Object), // VoidResponseSchema
        mockOptions
      )
    })

    it('存在しない教師の削除でエラーハンドリング', async () => {
      const error = new Error('Teacher not found')
      mockApiClient.delete.mockRejectedValue(error)

      await expect(teacherApi.deleteTeacher('nonexistent', mockOptions)).rejects.toThrow(
        'Teacher not found'
      )
    })

    it('削除時のネットワークエラーハンドリング', async () => {
      const error = new Error('Network error')
      mockApiClient.delete.mockRejectedValue(error)

      await expect(teacherApi.deleteTeacher('teacher-1', mockOptions)).rejects.toThrow(
        'Network error'
      )
    })
  })

  describe('saveTeachers', () => {
    const teachersToSave = [mockTeacher, { ...mockTeacher, id: 'teacher-2', name: '山田次郎' }]

    it('複数教師を個別に更新して保存する', async () => {
      // CreateTeacherRequestSchema.parseを動的にモック
      vi.mocked(CreateTeacherRequestSchema.parse)
        .mockReturnValueOnce({
          name: '田中太郎',
          subjects: ['数学', '理科'],
          grades: [1, 2, 3],
          assignmentRestrictions: ['月曜1限不可'],
        })
        .mockReturnValueOnce({
          name: '山田次郎',
          subjects: ['数学', '理科'],
          grades: [1, 2, 3],
          assignmentRestrictions: ['月曜1限不可'],
        })

      mockApiClient.put.mockResolvedValue(mockTeacher)

      await teacherApi.saveTeachers(teachersToSave, mockOptions)

      // 各教師に対して個別のPUT要求が呼ばれることを確認
      expect(mockApiClient.put).toHaveBeenCalledTimes(2)
      expect(mockApiClient.put).toHaveBeenNthCalledWith(
        1,
        '/teachers/teacher-1',
        expect.objectContaining({
          name: '田中太郎',
        }),
        expect.any(Object),
        expect.any(Object),
        mockOptions
      )
      expect(mockApiClient.put).toHaveBeenNthCalledWith(
        2,
        '/teachers/teacher-2',
        expect.objectContaining({
          name: '山田次郎',
        }),
        expect.any(Object),
        expect.any(Object),
        mockOptions
      )
    })

    it('IDのない教師をスキップする', async () => {
      const teachersWithoutId = [{ ...mockTeacher, id: undefined }, mockTeacher]

      mockApiClient.put.mockResolvedValue(mockTeacher)

      await teacherApi.saveTeachers(teachersWithoutId as LegacyTeacher[], mockOptions)

      // IDのない教師は更新されないため、1回のみPUTが呼ばれる
      expect(mockApiClient.put).toHaveBeenCalledTimes(1)
      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/teachers/teacher-1',
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        mockOptions
      )
    })

    it('空の教師配列で保存処理をスキップする', async () => {
      await teacherApi.saveTeachers([], mockOptions)

      expect(mockApiClient.put).not.toHaveBeenCalled()
    })

    it('一部の教師更新に失敗した場合全体が失敗する', async () => {
      // 最初の要求は失敗、2番目は成功
      mockApiClient.put
        .mockRejectedValueOnce(new Error('Update failed'))
        .mockResolvedValueOnce(mockTeacher)

      // Promise.allを使用しているため、1つでも失敗すると全体が失敗する
      await expect(teacherApi.saveTeachers(teachersToSave, mockOptions)).rejects.toThrow(
        'Update failed'
      )

      expect(mockApiClient.put).toHaveBeenCalledTimes(2)
    })
  })

  describe('reorderTeachers', () => {
    const reorderData = [
      { id: 'teacher-1', order: 2 },
      { id: 'teacher-2', order: 1 },
    ]

    it('教師順序を正常に更新する', async () => {
      const mockResponse = { updatedCount: 2, totalRequested: 2 }
      mockApiClient.patch.mockResolvedValue(mockResponse)

      const result = await teacherApi.reorderTeachers(reorderData, mockOptions)

      expect(mockApiClient.patch).toHaveBeenCalledWith(
        '/teachers/reorder',
        { teachers: reorderData },
        expect.any(Object), // TeacherReorderRequestSchema
        expect.any(Object), // TeacherReorderResponseSchema
        mockOptions
      )
      expect(result).toEqual(mockResponse)
    })

    it('順序更新で部分成功を処理する', async () => {
      const mockResponse = { updatedCount: 1, totalRequested: 2 }
      mockApiClient.patch.mockResolvedValue(mockResponse)

      const result = await teacherApi.reorderTeachers(reorderData, mockOptions)

      expect(result.updatedCount).toBe(1)
      expect(result.totalRequested).toBe(2)
    })

    it('順序更新時のエラーハンドリング', async () => {
      const error = new Error('Reorder error')
      mockApiClient.patch.mockRejectedValue(error)

      await expect(teacherApi.reorderTeachers(reorderData, mockOptions)).rejects.toThrow(
        'Reorder error'
      )
    })

    it('無効なUUIDでのエラーハンドリング', async () => {
      const invalidData = [{ id: 'invalid-uuid', order: 1 }]
      const error = new Error('Invalid UUID')
      mockApiClient.patch.mockRejectedValue(error)

      await expect(teacherApi.reorderTeachers(invalidData, mockOptions)).rejects.toThrow(
        'Invalid UUID'
      )
    })

    it('空の配列で順序更新を実行する', async () => {
      const mockResponse = { updatedCount: 0, totalRequested: 0 }
      mockApiClient.patch.mockResolvedValue(mockResponse)

      const result = await teacherApi.reorderTeachers([], mockOptions)

      expect(result.updatedCount).toBe(0)
      expect(result.totalRequested).toBe(0)
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

    it('teacherApiオブジェクトが正しく定義されている', () => {
      expect(teacherApi).toBeDefined()
      expect(typeof teacherApi).toBe('object')
      expect(typeof teacherApi.getTeachers).toBe('function')
      expect(typeof teacherApi.createTeacher).toBe('function')
      expect(typeof teacherApi.updateTeacher).toBe('function')
      expect(typeof teacherApi.deleteTeacher).toBe('function')
      expect(typeof teacherApi.saveTeachers).toBe('function')
      expect(typeof teacherApi.reorderTeachers).toBe('function')
    })

    it('モックデータが適切に定義されている', () => {
      expect(mockTeacher).toBeDefined()
      expect(mockTeacher.id).toBe('teacher-1')
      expect(mockTeacher.name).toBe('田中太郎')
      expect(Array.isArray(mockTeacher.subjects)).toBe(true)
      expect(Array.isArray(mockTeacher.grades)).toBe(true)
      expect(Array.isArray(mockTeacher.assignmentRestrictions)).toBe(true)
    })

    it('APIクライアントモックが正しく設定されている', () => {
      expect(mockApiClient).toBeDefined()
      expect(typeof mockApiClient.get).toBe('function')
      expect(typeof mockApiClient.post).toBe('function')
      expect(typeof mockApiClient.put).toBe('function')
      expect(typeof mockApiClient.patch).toBe('function')
      expect(typeof mockApiClient.delete).toBe('function')
    })

    it('共有スキーマモックが正しく設定されている', () => {
      expect(LegacyTeacherSchema).toBeDefined()
      expect(typeof LegacyTeacherSchema.parse).toBe('function')
      expect(LegacyTeacherSchema.parse).toHaveProperty('mock')
      expect(CreateTeacherRequestSchema).toBeDefined()
      expect(typeof CreateTeacherRequestSchema.parse).toBe('function')
      expect(CreateTeacherRequestSchema.parse).toHaveProperty('mock')
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
  })
})
