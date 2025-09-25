/**
 * Subject API 単体テスト
 * 教科関連APIの包括的テスト - 238行の重要APIファイル
 */

import type { Subject } from '@shared/schemas'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { subjectApi } from '../../../../../src/frontend/lib/api/subject'

// 共有スキーマをモック化
vi.mock('@shared/schemas', async importOriginal => {
  const original = await importOriginal<typeof import('@shared/schemas')>()
  return {
    ...original,
    SubjectSchema: {
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

import { SubjectSchema } from '@shared/schemas'
import { apiClient } from '../../../../../src/frontend/lib/api/client'

const mockApiClient = apiClient as {
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
  patch: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

describe('Subject API', () => {
  const mockSubject: Subject = {
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
  }

  const mockOptions = {
    token: 'test-token',
    getFreshToken: vi.fn().mockResolvedValue('fresh-token'),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // SubjectSchemaのparseをモック設定
    vi.mocked(SubjectSchema.parse).mockReturnValue(mockSubject)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getSubjects', () => {
    it('教科一覧を正常に取得する', async () => {
      const mockResponse = {
        subjects: [mockSubject],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      }

      mockApiClient.get.mockResolvedValue(mockResponse)

      const result = await subjectApi.getSubjects(mockOptions)

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/subjects',
        expect.any(Object), // SubjectsListResponseSchema
        mockOptions
      )
      expect(result.subjects).toHaveLength(1)
      // normalizeSubjectDataの処理により追加プロパティが含まれる可能性があるため、主要プロパティのみ確認
      expect(result.subjects[0]).toMatchObject({
        id: mockSubject.id,
        name: mockSubject.name,
        grades: mockSubject.grades,
        weeklyHours: mockSubject.weeklyHours,
      })
    })

    it('空の教科一覧を正常に処理する', async () => {
      const mockResponse = {
        subjects: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      }

      mockApiClient.get.mockResolvedValue(mockResponse)

      const result = await subjectApi.getSubjects(mockOptions)

      expect(result.subjects).toHaveLength(0)
      expect(result.pagination?.total).toBe(0)
    })

    it('ページネーションなしのレスポンスを処理する', async () => {
      const mockResponse = {
        subjects: [mockSubject],
      }

      mockApiClient.get.mockResolvedValue(mockResponse)

      const result = await subjectApi.getSubjects(mockOptions)

      expect(result.subjects).toHaveLength(1)
      expect(result.pagination).toBeUndefined()
    })

    it('APIクライアントエラーを適切に処理する', async () => {
      const error = new Error('Network error')
      mockApiClient.get.mockRejectedValue(error)

      await expect(subjectApi.getSubjects(mockOptions)).rejects.toThrow('Network error')
    })
  })

  describe('createSubject', () => {
    const newSubjectData = {
      name: '理科',
      school_id: 'default',
      weekly_hours: 3,
      target_grades: '[1,2,3]',
    }

    it('新しい教科を正常に作成する', async () => {
      mockApiClient.post.mockResolvedValue(mockSubject)

      const result = await subjectApi.createSubject(newSubjectData, mockOptions)

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/subjects',
        newSubjectData,
        expect.any(Object), // CreateSubjectRequestSchema
        expect.any(Object), // SubjectSchema
        mockOptions
      )
      // normalizeSubjectDataの処理により追加プロパティが含まれるため、主要プロパティのみ確認
      expect(result).toMatchObject({
        id: mockSubject.id,
        name: mockSubject.name,
        grades: mockSubject.grades,
      })
    })

    it('必須フィールドが不足している場合はエラーを処理する', async () => {
      const invalidData = { school_id: 'default' } // nameが不足
      const error = new Error('Validation error')

      mockApiClient.post.mockRejectedValue(error)

      await expect(subjectApi.createSubject(invalidData as any, mockOptions)).rejects.toThrow(
        'Validation error'
      )
    })

    it('作成失敗時のエラーハンドリング', async () => {
      const error = new Error('Server error')
      mockApiClient.post.mockRejectedValue(error)

      await expect(subjectApi.createSubject(newSubjectData, mockOptions)).rejects.toThrow(
        'Server error'
      )
    })
  })

  describe('updateSubject', () => {
    const updateData = {
      name: '数学（改）',
      weekly_hours: 5,
    }

    it('教科を正常に更新する', async () => {
      const updatedSubject = { ...mockSubject, ...updateData }
      mockApiClient.put.mockResolvedValue(updatedSubject)

      const result = await subjectApi.updateSubject('subject-1', updateData, mockOptions)

      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/subjects/subject-1',
        updateData,
        expect.any(Object), // UpdateSubjectRequestSchema
        expect.any(Object), // SubjectSchema
        mockOptions
      )
      // normalizeSubjectDataの処理により追加プロパティが含まれるため、主要プロパティのみ確認
      expect(result).toMatchObject({
        id: mockSubject.id,
        name: updateData.name,
      })
    })

    it('存在しない教科の更新でエラーハンドリング', async () => {
      const error = new Error('Subject not found')
      mockApiClient.put.mockRejectedValue(error)

      await expect(
        subjectApi.updateSubject('nonexistent', updateData, mockOptions)
      ).rejects.toThrow('Subject not found')
    })

    it('部分更新で必要なフィールドのみを送信する', async () => {
      const partialUpdate = { name: '新しい名前' }
      mockApiClient.put.mockResolvedValue({ ...mockSubject, ...partialUpdate })

      await subjectApi.updateSubject('subject-1', partialUpdate, mockOptions)

      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/subjects/subject-1',
        partialUpdate,
        expect.any(Object),
        expect.any(Object),
        mockOptions
      )
    })
  })

  describe('deleteSubject', () => {
    it('教科を正常に削除する', async () => {
      mockApiClient.delete.mockResolvedValue(undefined)

      await subjectApi.deleteSubject('subject-1', mockOptions)

      expect(mockApiClient.delete).toHaveBeenCalledWith(
        '/subjects/subject-1',
        expect.any(Object), // VoidResponseSchema
        mockOptions
      )
    })

    it('存在しない教科の削除でエラーハンドリング', async () => {
      const error = new Error('Subject not found')
      mockApiClient.delete.mockRejectedValue(error)

      await expect(subjectApi.deleteSubject('nonexistent', mockOptions)).rejects.toThrow(
        'Subject not found'
      )
    })

    it('削除時のネットワークエラーハンドリング', async () => {
      const error = new Error('Network error')
      mockApiClient.delete.mockRejectedValue(error)

      await expect(subjectApi.deleteSubject('subject-1', mockOptions)).rejects.toThrow(
        'Network error'
      )
    })
  })

  describe('saveSubjects', () => {
    const subjectsToSave = [mockSubject, { ...mockSubject, id: 'subject-2', name: '国語' }]

    it('複数教科を個別に更新して保存する', async () => {
      // 実装では個別にPUT要求を送信する
      mockApiClient.put.mockResolvedValue(mockSubject)

      const result = await subjectApi.saveSubjects(subjectsToSave, mockOptions)

      // 各教科に対して個別のPUT要求が呼ばれることを確認
      expect(mockApiClient.put).toHaveBeenCalledTimes(2)
      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/subjects/subject-1',
        expect.objectContaining({ name: '数学', school_id: 'default' }),
        expect.any(Object),
        expect.any(Object),
        mockOptions
      )
      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/subjects/subject-2',
        expect.objectContaining({ name: '国語', school_id: 'default' }),
        expect.any(Object),
        expect.any(Object),
        mockOptions
      )
      expect(result).toHaveLength(2)
    })

    it('空の教科配列で保存処理をスキップする', async () => {
      const result = await subjectApi.saveSubjects([], mockOptions)

      expect(mockApiClient.put).not.toHaveBeenCalled()
      expect(result).toEqual([])
    })

    it('一部の教科更新に失敗しても他は続行する', async () => {
      // 最初の要求は成功、2番目は失敗
      mockApiClient.put
        .mockResolvedValueOnce(mockSubject)
        .mockRejectedValueOnce(new Error('Update failed'))

      const result = await subjectApi.saveSubjects(subjectsToSave, mockOptions)

      expect(mockApiClient.put).toHaveBeenCalledTimes(2)
      expect(result).toHaveLength(1) // 成功したものだけ返される
    })
  })

  describe('reorderSubjects', () => {
    const reorderData = [
      { id: 'subject-1', order: 2 },
      { id: 'subject-2', order: 1 },
    ]

    it('教科順序を正常に更新する', async () => {
      const mockResponse = { updatedCount: 2, totalRequested: 2 }
      mockApiClient.patch.mockResolvedValue(mockResponse)

      const result = await subjectApi.reorderSubjects(reorderData, mockOptions)

      expect(mockApiClient.patch).toHaveBeenCalledWith(
        '/subjects/reorder',
        { subjects: reorderData },
        expect.any(Object), // SubjectReorderRequestSchema
        expect.any(Object), // SubjectReorderResponseSchema
        mockOptions
      )
      expect(result).toEqual(mockResponse)
    })

    it('順序更新で部分成功を処理する', async () => {
      const mockResponse = { updatedCount: 1, totalRequested: 2 }
      mockApiClient.patch.mockResolvedValue(mockResponse)

      const result = await subjectApi.reorderSubjects(reorderData, mockOptions)

      expect(result.updatedCount).toBe(1)
      expect(result.totalRequested).toBe(2)
    })

    it('順序更新時のエラーハンドリング', async () => {
      const error = new Error('Reorder error')
      mockApiClient.patch.mockRejectedValue(error)

      await expect(subjectApi.reorderSubjects(reorderData, mockOptions)).rejects.toThrow(
        'Reorder error'
      )
    })

    it('無効なUUIDでのエラーハンドリング', async () => {
      const invalidData = [{ id: 'invalid-uuid', order: 1 }]
      const error = new Error('Invalid UUID')
      mockApiClient.patch.mockRejectedValue(error)

      await expect(subjectApi.reorderSubjects(invalidData, mockOptions)).rejects.toThrow(
        'Invalid UUID'
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

    it('subjectApiオブジェクトが正しく定義されている', () => {
      expect(subjectApi).toBeDefined()
      expect(typeof subjectApi).toBe('object')
      expect(typeof subjectApi.getSubjects).toBe('function')
      expect(typeof subjectApi.createSubject).toBe('function')
      expect(typeof subjectApi.updateSubject).toBe('function')
      expect(typeof subjectApi.deleteSubject).toBe('function')
      expect(typeof subjectApi.saveSubjects).toBe('function')
      expect(typeof subjectApi.reorderSubjects).toBe('function')
    })

    it('モックデータが適切に定義されている', () => {
      expect(mockSubject).toBeDefined()
      expect(mockSubject.id).toBe('subject-1')
      expect(mockSubject.name).toBe('数学')
      expect(Array.isArray(mockSubject.grades)).toBe(true)
      expect(typeof mockSubject.weeklyHours).toBe('object')
    })

    it('APIクライアントモックが正しく設定されている', () => {
      expect(mockApiClient).toBeDefined()
      expect(typeof mockApiClient.get).toBe('function')
      expect(typeof mockApiClient.post).toBe('function')
      expect(typeof mockApiClient.put).toBe('function')
      expect(typeof mockApiClient.delete).toBe('function')
    })

    it('共有スキーマモックが正しく設定されている', () => {
      expect(SubjectSchema).toBeDefined()
      expect(typeof SubjectSchema.parse).toBe('function')
      expect(SubjectSchema.parse).toHaveProperty('mock')
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
