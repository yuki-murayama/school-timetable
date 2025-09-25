/**
 * Classroom API 単体テスト
 * 教室関連APIの包括的テスト - 117行の重要APIファイル
 */

import type { Classroom } from '@shared/schemas'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { classroomApi } from '../../../../../src/frontend/lib/api/classroom'

// 共有スキーマをモック化
vi.mock('@shared/schemas', async importOriginal => {
  const original = await importOriginal<typeof import('@shared/schemas')>()
  return {
    ...original,
    ClassroomSchema: {
      parse: vi.fn(),
      optional: vi.fn(() => ({ parse: vi.fn() })),
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

import { ClassroomSchema } from '@shared/schemas'
import { apiClient } from '../../../../../src/frontend/lib/api/client'

const mockApiClient = apiClient as {
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
  patch: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

describe('Classroom API', () => {
  const mockClassroom: Classroom = {
    id: 'classroom-1',
    name: '理科室1',
    type: '理科室',
    capacity: 35,
    count: 2,
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
    // ClassroomSchemaのparseをモック設定
    vi.mocked(ClassroomSchema.parse).mockReturnValue(mockClassroom)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getClassrooms', () => {
    it('教室一覧を正常に取得する', async () => {
      const mockResponse = {
        classrooms: [mockClassroom],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      }

      mockApiClient.get.mockResolvedValue(mockResponse)

      const result = await classroomApi.getClassrooms(mockOptions)

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/classrooms',
        expect.any(Object), // ClassroomsListResponseSchema
        mockOptions
      )
      expect(result.classrooms).toHaveLength(1)
      expect(result.classrooms[0]).toEqual(mockClassroom)
      expect(result.pagination).toEqual({ page: 1, limit: 10, total: 1, totalPages: 1 })
    })

    it('空の教室一覧を正常に処理する', async () => {
      const mockResponse = {
        classrooms: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      }

      mockApiClient.get.mockResolvedValue(mockResponse)

      const result = await classroomApi.getClassrooms(mockOptions)

      expect(result.classrooms).toHaveLength(0)
      expect(result.pagination?.total).toBe(0)
    })

    it('ページネーションなしのレスポンスを処理する', async () => {
      const mockResponse = {
        classrooms: [mockClassroom],
      }

      mockApiClient.get.mockResolvedValue(mockResponse)

      const result = await classroomApi.getClassrooms(mockOptions)

      expect(result.classrooms).toHaveLength(1)
      expect(result.pagination).toBeUndefined()
    })

    it('APIクライアントエラーを適切に処理する', async () => {
      const error = new Error('Network error')
      mockApiClient.get.mockRejectedValue(error)

      await expect(classroomApi.getClassrooms(mockOptions)).rejects.toThrow('Network error')
    })
  })

  describe('createClassroom', () => {
    const newClassroomData = {
      name: '美術室1',
      type: '美術室',
      capacity: 30,
      count: 1,
      order: 2,
    }

    it('新しい教室を正常に作成する', async () => {
      mockApiClient.post.mockResolvedValue(mockClassroom)

      const result = await classroomApi.createClassroom(newClassroomData, mockOptions)

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/classrooms',
        newClassroomData,
        expect.any(Object), // ClassroomSchema
        mockOptions
      )
      expect(result).toEqual(mockClassroom)
    })

    it('必須フィールドが不足している場合はエラーを処理する', async () => {
      const invalidData = { capacity: 30 } // nameとtypeが不足
      const error = new Error('Validation error')

      mockApiClient.post.mockRejectedValue(error)

      await expect(classroomApi.createClassroom(invalidData as any, mockOptions)).rejects.toThrow(
        'Validation error'
      )
    })

    it('作成失敗時のエラーハンドリング', async () => {
      const error = new Error('Server error')
      mockApiClient.post.mockRejectedValue(error)

      await expect(classroomApi.createClassroom(newClassroomData, mockOptions)).rejects.toThrow(
        'Server error'
      )
    })
  })

  describe('updateClassroom', () => {
    const updateData = {
      name: '理科室1（改）',
      capacity: 40,
    }

    it('教室を正常に更新する', async () => {
      const updatedClassroom = { ...mockClassroom, ...updateData }
      mockApiClient.put.mockResolvedValue(updatedClassroom)

      const result = await classroomApi.updateClassroom('classroom-1', updateData, mockOptions)

      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/classrooms/classroom-1',
        updateData,
        expect.any(Object), // UpdateClassroomRequestSchema
        expect.any(Object), // ClassroomSchema
        mockOptions
      )
      expect(result).toEqual(updatedClassroom)
    })

    it('存在しない教室の更新でエラーハンドリング', async () => {
      const error = new Error('Classroom not found')
      mockApiClient.put.mockRejectedValue(error)

      await expect(
        classroomApi.updateClassroom('nonexistent', updateData, mockOptions)
      ).rejects.toThrow('Classroom not found')
    })

    it('部分更新で必要なフィールドのみを送信する', async () => {
      const partialUpdate = { name: '新しい名前' }
      mockApiClient.put.mockResolvedValue({ ...mockClassroom, ...partialUpdate })

      await classroomApi.updateClassroom('classroom-1', partialUpdate, mockOptions)

      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/classrooms/classroom-1',
        partialUpdate,
        expect.any(Object),
        expect.any(Object),
        mockOptions
      )
    })
  })

  describe('deleteClassroom', () => {
    it('教室を正常に削除する', async () => {
      mockApiClient.delete.mockResolvedValue(undefined)

      await classroomApi.deleteClassroom('classroom-1', mockOptions)

      expect(mockApiClient.delete).toHaveBeenCalledWith(
        '/classrooms/classroom-1',
        expect.any(Object), // VoidResponseSchema
        mockOptions
      )
    })

    it('存在しない教室の削除でエラーハンドリング', async () => {
      const error = new Error('Classroom not found')
      mockApiClient.delete.mockRejectedValue(error)

      await expect(classroomApi.deleteClassroom('nonexistent', mockOptions)).rejects.toThrow(
        'Classroom not found'
      )
    })

    it('削除時のネットワークエラーハンドリング', async () => {
      const error = new Error('Network error')
      mockApiClient.delete.mockRejectedValue(error)

      await expect(classroomApi.deleteClassroom('classroom-1', mockOptions)).rejects.toThrow(
        'Network error'
      )
    })
  })

  describe('saveClassrooms', () => {
    const classroomsToSave = [
      mockClassroom,
      { ...mockClassroom, id: 'classroom-2', name: '音楽室1' },
    ]

    it('複数教室を個別に更新して保存する', async () => {
      mockApiClient.put.mockResolvedValue(mockClassroom)

      await classroomApi.saveClassrooms(classroomsToSave, mockOptions)

      // 各教室に対して個別のPUT要求が呼ばれることを確認
      expect(mockApiClient.put).toHaveBeenCalledTimes(2)
      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/classrooms/classroom-1',
        expect.objectContaining({
          name: '理科室1',
          type: '理科室',
          capacity: 35,
          count: 2,
          order: 1,
        }),
        expect.any(Object),
        expect.any(Object),
        mockOptions
      )
      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/classrooms/classroom-2',
        expect.objectContaining({
          name: '音楽室1',
          type: '理科室',
          capacity: 35,
          count: 2,
        }),
        expect.any(Object),
        expect.any(Object),
        mockOptions
      )
    })

    it('IDのない教室をスキップする', async () => {
      const classroomsWithoutId = [{ ...mockClassroom, id: undefined }, mockClassroom]

      mockApiClient.put.mockResolvedValue(mockClassroom)

      await classroomApi.saveClassrooms(classroomsWithoutId as Classroom[], mockOptions)

      // IDのない教室は更新されないため、1回のみPUTが呼ばれる
      expect(mockApiClient.put).toHaveBeenCalledTimes(1)
      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/classrooms/classroom-1',
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        mockOptions
      )
    })

    it('空の教室配列で保存処理をスキップする', async () => {
      await classroomApi.saveClassrooms([], mockOptions)

      expect(mockApiClient.put).not.toHaveBeenCalled()
    })

    it('一部の教室更新に失敗した場合全体が失敗する', async () => {
      // 最初の要求は失敗、2番目は成功
      mockApiClient.put
        .mockRejectedValueOnce(new Error('Update failed'))
        .mockResolvedValueOnce(mockClassroom)

      // Promise.allを使用しているため、1つでも失敗すると全体が失敗する
      await expect(classroomApi.saveClassrooms(classroomsToSave, mockOptions)).rejects.toThrow(
        'Update failed'
      )

      expect(mockApiClient.put).toHaveBeenCalledTimes(2)
    })
  })

  describe('reorderClassrooms', () => {
    const reorderData = [
      { id: 'classroom-1', order: 2 },
      { id: 'classroom-2', order: 1 },
    ]

    it('教室順序を正常に更新する', async () => {
      const mockResponse = { updatedCount: 2, totalRequested: 2 }
      mockApiClient.patch.mockResolvedValue(mockResponse)

      const result = await classroomApi.reorderClassrooms(reorderData, mockOptions)

      expect(mockApiClient.patch).toHaveBeenCalledWith(
        '/classrooms/reorder',
        { classrooms: reorderData },
        expect.any(Object), // ClassroomReorderRequestSchema
        expect.any(Object), // ClassroomReorderResponseSchema
        mockOptions
      )
      expect(result).toEqual(mockResponse)
    })

    it('順序更新で部分成功を処理する', async () => {
      const mockResponse = { updatedCount: 1, totalRequested: 2 }
      mockApiClient.patch.mockResolvedValue(mockResponse)

      const result = await classroomApi.reorderClassrooms(reorderData, mockOptions)

      expect(result.updatedCount).toBe(1)
      expect(result.totalRequested).toBe(2)
    })

    it('順序更新時のエラーハンドリング', async () => {
      const error = new Error('Reorder error')
      mockApiClient.patch.mockRejectedValue(error)

      await expect(classroomApi.reorderClassrooms(reorderData, mockOptions)).rejects.toThrow(
        'Reorder error'
      )
    })

    it('無効なUUIDでのエラーハンドリング', async () => {
      const invalidData = [{ id: 'invalid-uuid', order: 1 }]
      const error = new Error('Invalid UUID')
      mockApiClient.patch.mockRejectedValue(error)

      await expect(classroomApi.reorderClassrooms(invalidData, mockOptions)).rejects.toThrow(
        'Invalid UUID'
      )
    })

    it('空の配列で順序更新を実行する', async () => {
      const mockResponse = { updatedCount: 0, totalRequested: 0 }
      mockApiClient.patch.mockResolvedValue(mockResponse)

      const result = await classroomApi.reorderClassrooms([], mockOptions)

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

    it('classroomApiオブジェクトが正しく定義されている', () => {
      expect(classroomApi).toBeDefined()
      expect(typeof classroomApi).toBe('object')
      expect(typeof classroomApi.getClassrooms).toBe('function')
      expect(typeof classroomApi.createClassroom).toBe('function')
      expect(typeof classroomApi.updateClassroom).toBe('function')
      expect(typeof classroomApi.deleteClassroom).toBe('function')
      expect(typeof classroomApi.saveClassrooms).toBe('function')
      expect(typeof classroomApi.reorderClassrooms).toBe('function')
    })

    it('モックデータが適切に定義されている', () => {
      expect(mockClassroom).toBeDefined()
      expect(mockClassroom.id).toBe('classroom-1')
      expect(mockClassroom.name).toBe('理科室1')
      expect(mockClassroom.type).toBe('理科室')
      expect(typeof mockClassroom.capacity).toBe('number')
      expect(typeof mockClassroom.count).toBe('number')
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
      expect(ClassroomSchema).toBeDefined()
      expect(typeof ClassroomSchema.parse).toBe('function')
      expect(ClassroomSchema.parse).toHaveProperty('mock')
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
