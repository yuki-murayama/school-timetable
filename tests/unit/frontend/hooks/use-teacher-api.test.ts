/**
 * 教師APIカスタムフック 単体テスト
 * 全分岐網羅カバレッジ100%達成テスト
 */

import type { SchoolSettings, Subject, Teacher } from '@shared/schemas'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTeacherApi } from './use-teacher-api'

// ======================
// モック設定
// ======================

// 個別のAPIモジュールをモック化
vi.mock('../lib/api/school', () => ({
  schoolApi: {
    getSettings: vi.fn(),
  },
}))

vi.mock('../lib/api/subject', () => ({
  subjectApi: {
    getSubjects: vi.fn(),
  },
}))

vi.mock('../lib/api/teacher', () => ({
  teacherApi: {
    createTeacher: vi.fn(),
    updateTeacher: vi.fn(),
  },
}))

// use-toastモック
const mockToast = vi.fn()
vi.mock('./use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

// モック関数を取得
import { schoolApi } from '../lib/api/school'
import { subjectApi } from '../lib/api/subject'
import { teacherApi } from '../lib/api/teacher'

const mockGetSubjects = vi.mocked(subjectApi.getSubjects)
const mockGetSettings = vi.mocked(schoolApi.getSettings)
const mockCreateTeacher = vi.mocked(teacherApi.createTeacher)
const mockUpdateTeacher = vi.mocked(teacherApi.updateTeacher)

describe('useTeacherApi', () => {
  // ======================
  // テストデータ定義
  // ======================
  const mockSubjects: Subject[] = [
    {
      id: 'subject-1',
      name: '数学',
      grades: [1, 2, 3],
      weeklyHours: { '1': 4, '2': 4, '3': 4 },
      requiresSpecialClassroom: false,
      classroomType: '普通教室',
      order: 1,
    },
    {
      id: 'subject-2',
      name: '物理',
      grades: [2, 3],
      weeklyHours: { '2': 3, '3': 3 },
      requiresSpecialClassroom: true,
      classroomType: '理科室',
      order: 2,
    },
  ]

  const mockSchoolSettings: SchoolSettings = {
    grade1Classes: 4,
    grade2Classes: 3,
    grade3Classes: 3,
    dailyPeriods: 6,
    saturdayPeriods: 4,
  }

  const _mockTeacher: Teacher = {
    id: 'teacher-1',
    name: '田中先生',
    subjects: ['数学', '物理'],
    grades: [1, 2],
    assignmentRestrictions: [],
    order: 0,
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // デフォルトのモック戻り値設定（即座に解決）
    mockGetSubjects.mockImplementation(() =>
      Promise.resolve({
        subjects: mockSubjects,
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
      })
    )
    mockGetSettings.mockImplementation(() => Promise.resolve(mockSchoolSettings))
    mockCreateTeacher.mockImplementation(() =>
      Promise.resolve({
        id: 'created-teacher-1',
        name: '新規教師',
        subjects: [],
        grades: [],
        assignmentRestrictions: [],
        order: 0,
      })
    )
    mockUpdateTeacher.mockImplementation(() =>
      Promise.resolve({
        id: 'updated-teacher-1',
        name: '更新教師',
        subjects: [],
        grades: [],
        assignmentRestrictions: [],
        order: 0,
      })
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ======================
  // loadInitialData()テスト (18分岐)
  // ======================
  describe('loadInitialData()', () => {
    it('UTA-LOAD-001: 正常データ読み込みが成功する', async () => {
      const { result } = renderHook(() => useTeacherApi('test-token'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.subjects).toEqual(mockSubjects)
      expect(result.current.schoolSettings).toEqual(mockSchoolSettings)
      expect(mockGetSubjects).toHaveBeenCalledWith({ token: 'test-token' })
      expect(mockGetSettings).toHaveBeenCalledWith({ token: 'test-token' })
      expect(mockGetSubjects).toHaveBeenCalledTimes(1)
      expect(mockGetSettings).toHaveBeenCalledTimes(1)
    })

    it('UTA-LOAD-002: subjectsResult配列レスポンスを処理する', async () => {
      mockGetSubjects.mockResolvedValueOnce({ subjects: mockSubjects })

      const { result } = renderHook(() => useTeacherApi('test-token'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.subjects).toEqual(mockSubjects)
    })

    it('UTA-LOAD-003: subjectsResultオブジェクトレスポンスを処理する', async () => {
      mockGetSubjects.mockResolvedValueOnce({
        subjects: mockSubjects,
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
      })

      const { result } = renderHook(() => useTeacherApi('test-token'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.subjects).toEqual(mockSubjects)
    })

    it('UTA-LOAD-004: 予期しないsubjectsレスポンス構造を処理する', async () => {
      mockGetSubjects.mockResolvedValueOnce({
        unknownField: 'unknown value',
        data: mockSubjects,
      })

      const { result } = renderHook(() => useTeacherApi('test-token'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.subjects).toEqual([])
    })

    it('UTA-LOAD-005: subjectsResult null/undefinedを処理する', async () => {
      mockGetSubjects.mockResolvedValueOnce(null)

      const { result } = renderHook(() => useTeacherApi('test-token'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.subjects).toEqual([])
    })

    it('UTA-LOAD-006: settingsResult正常処理', async () => {
      const customSettings: SchoolSettings = {
        grade1Classes: 5,
        grade2Classes: 4,
        grade3Classes: 4,
        dailyPeriods: 7,
        saturdayPeriods: 5,
      }

      mockGetSettings.mockResolvedValueOnce(customSettings)

      const { result } = renderHook(() => useTeacherApi('test-token'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.schoolSettings).toEqual(customSettings)
    })

    it('UTA-LOAD-007: settingsResult異常データを処理する', async () => {
      mockGetSettings.mockResolvedValueOnce(null)

      const { result } = renderHook(() => useTeacherApi('test-token'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.schoolSettings).toEqual({
        grade1Classes: 4,
        grade2Classes: 3,
        grade3Classes: 3,
        dailyPeriods: 6,
        saturdayPeriods: 4,
      })
    })

    it('UTA-LOAD-008: Promise.all部分失敗を処理する', async () => {
      mockGetSubjects.mockRejectedValueOnce(new Error('Subjects API failed'))
      mockGetSettings.mockResolvedValueOnce(mockSchoolSettings)

      const { result } = renderHook(() => useTeacherApi('test-token'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.subjects).toEqual([])
      expect(result.current.schoolSettings).toEqual(mockSchoolSettings)
    })

    it('UTA-LOAD-009: Promise.all全失敗を処理する', async () => {
      mockGetSubjects.mockRejectedValueOnce(new Error('Subjects API failed'))
      mockGetSettings.mockRejectedValueOnce(new Error('Settings API failed'))

      const { result } = renderHook(() => useTeacherApi('test-token'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.subjects).toEqual([])
      expect(result.current.schoolSettings).toEqual({
        grade1Classes: 4,
        grade2Classes: 3,
        grade3Classes: 3,
        dailyPeriods: 6,
        saturdayPeriods: 4,
      })
    })

    it('UTA-LOAD-010: ネットワークエラーを処理する', async () => {
      const networkError = new Error('Network Error')
      networkError.name = 'NetworkError'

      mockGetSubjects.mockRejectedValueOnce(networkError)
      mockGetSettings.mockRejectedValueOnce(networkError)

      const { result } = renderHook(() => useTeacherApi('test-token'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.subjects).toEqual([])
    })

    it('UTA-LOAD-011: タイムアウトエラーを処理する', async () => {
      const timeoutError = new Error('Request timeout')
      timeoutError.name = 'TimeoutError'

      mockGetSubjects.mockRejectedValueOnce(timeoutError)

      const { result } = renderHook(() => useTeacherApi('test-token'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.subjects).toEqual([])
    })

    it('UTA-LOAD-012: setIsLoading(true)開始状態を確認する', async () => {
      let resolvePromise: (value: unknown) => void
      const delayedPromise = new Promise(resolve => {
        resolvePromise = resolve
      })

      mockGetSubjects.mockReturnValueOnce(delayedPromise)
      mockGetSettings.mockReturnValueOnce(delayedPromise)

      const { result } = renderHook(() => useTeacherApi('test-token'))

      expect(result.current.isLoading).toBe(true)

      resolvePromise?.({
        subjects: mockSubjects,
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('UTA-LOAD-013: setIsLoading(false)終了状態を確認する', async () => {
      const { result } = renderHook(() => useTeacherApi('test-token'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isLoading).toBe(false)
    })
  })

  // ======================
  // saveTeacher()テスト (22分岐)
  // ======================
  describe('saveTeacher()', () => {
    it('UTA-SAVE-001: 新規教師作成成功', async () => {
      const newTeacherData: Partial<Teacher> = {
        name: '新規先生',
        subjects: ['数学'],
        grades: [1],
        assignmentRestrictions: [],
        order: 1,
      }

      const createdTeacher: Teacher = {
        id: 'new-teacher-id',
        ...newTeacherData,
      } as Teacher

      mockCreateTeacher.mockResolvedValueOnce(createdTeacher)

      const { result } = renderHook(() => useTeacherApi('test-token'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let savedTeacher: Teacher | undefined
      await act(async () => {
        savedTeacher = await result.current.saveTeacher(newTeacherData, true)
      })

      expect(savedTeacher).toEqual(createdTeacher)
      expect(mockCreateTeacher).toHaveBeenCalledWith(
        {
          name: '新規先生',
          subjects: ['数学'],
          grades: [1],
          assignmentRestrictions: [],
        },
        { token: 'test-token' }
      )
      expect(mockToast).toHaveBeenCalledWith({
        title: '保存完了',
        description: '新しい教師を追加しました',
      })
    })

    it('UTA-SAVE-002: 既存教師更新成功', async () => {
      const existingTeacher: Partial<Teacher> = {
        id: 'existing-teacher-id',
        name: '更新先生',
        subjects: ['数学', '物理'],
        grades: [1, 2],
        assignmentRestrictions: [],
        order: 1,
      }

      const updatedTeacher: Teacher = existingTeacher as Teacher

      mockUpdateTeacher.mockResolvedValueOnce(updatedTeacher)

      const { result } = renderHook(() => useTeacherApi('test-token'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let savedTeacher: Teacher | undefined
      await act(async () => {
        savedTeacher = await result.current.saveTeacher(existingTeacher, false)
      })

      expect(savedTeacher).toEqual(updatedTeacher)
      expect(mockUpdateTeacher).toHaveBeenCalledWith(
        'existing-teacher-id',
        {
          name: existingTeacher.name,
          subjects: existingTeacher.subjects,
          grades: existingTeacher.grades,
          assignmentRestrictions: existingTeacher.assignmentRestrictions,
        },
        { token: 'test-token' }
      )
      expect(mockToast).toHaveBeenCalledWith({
        title: '保存完了',
        description: '教師情報を更新しました',
      })
    })

    it('UTA-SAVE-003: 教師ID未指定エラーを処理する', async () => {
      const teacherDataWithoutId: Partial<Teacher> = {
        name: 'ID未指定先生',
        subjects: ['数学'],
        grades: [1],
      }

      const { result } = renderHook(() => useTeacherApi('test-token'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await expect(result.current.saveTeacher(teacherDataWithoutId, false)).rejects.toThrow(
          '教師IDが見つかりません'
        )
      })
    })

    it('UTA-SAVE-004: 新規作成APIエラーを処理する', async () => {
      const newTeacherData: Partial<Teacher> = {
        name: '失敗先生',
        subjects: ['数学'],
        grades: [1],
      }

      mockCreateTeacher.mockRejectedValueOnce(new Error('API Error'))

      const { result } = renderHook(() => useTeacherApi('test-token'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await expect(result.current.saveTeacher(newTeacherData, true)).rejects.toThrow('API Error')
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: 'エラー',
        description: '教師の保存に失敗しました',
        variant: 'destructive',
      })
    })

    it('UTA-SAVE-005: 更新APIエラーを処理する', async () => {
      const existingTeacher: Partial<Teacher> = {
        id: 'existing-id',
        name: '更新失敗先生',
      }

      mockUpdateTeacher.mockRejectedValueOnce(new Error('Update API Error'))

      const { result } = renderHook(() => useTeacherApi('test-token'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await expect(result.current.saveTeacher(existingTeacher, false)).rejects.toThrow(
          'Update API Error'
        )
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: 'エラー',
        description: '教師の保存に失敗しました',
        variant: 'destructive',
      })
    })

    it('UTA-SAVE-006: 一般エラーを処理する', async () => {
      const teacherData: Partial<Teacher> = {
        name: '一般エラー先生',
      }

      const generalError = new Error('General Error')
      mockCreateTeacher.mockRejectedValueOnce(generalError)

      const { result } = renderHook(() => useTeacherApi('test-token'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await expect(result.current.saveTeacher(teacherData, true)).rejects.toThrow('General Error')
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: 'エラー',
        description: '教師の保存に失敗しました',
        variant: 'destructive',
      })
    })
  })

  // ======================
  // useEffect 初期化テスト (4分岐)
  // ======================
  describe('useEffect initialization', () => {
    it('UTA-INIT-001: token存在時に初期化が実行される', async () => {
      const { result } = renderHook(() => useTeacherApi('valid-token'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockGetSubjects).toHaveBeenCalledWith({ token: 'valid-token' })
      expect(mockGetSettings).toHaveBeenCalledWith({ token: 'valid-token' })
      expect(mockGetSubjects).toHaveBeenCalledTimes(1)
      expect(mockGetSettings).toHaveBeenCalledTimes(1)
    })

    it('UTA-INIT-002: token未存在時は初期化がスキップされる', async () => {
      const { result } = renderHook(() => useTeacherApi(null))

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(result.current.isLoading).toBe(false)
      expect(mockGetSubjects).not.toHaveBeenCalled()
      expect(mockGetSettings).not.toHaveBeenCalled()
    })

    it('UTA-INIT-003: token変更時に再初期化される', async () => {
      const { result, rerender } = renderHook(({ token }) => useTeacherApi(token), {
        initialProps: { token: 'initial-token' },
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockGetSubjects).toHaveBeenCalledWith({ token: 'initial-token' })
      expect(mockGetSettings).toHaveBeenCalledWith({ token: 'initial-token' })
      expect(mockGetSubjects).toHaveBeenCalledTimes(1)
      expect(mockGetSettings).toHaveBeenCalledTimes(1)

      rerender({ token: 'new-token' })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockGetSubjects).toHaveBeenCalledWith({ token: 'new-token' })
      expect(mockGetSettings).toHaveBeenCalledWith({ token: 'new-token' })
      expect(mockGetSubjects).toHaveBeenCalledTimes(2)
      expect(mockGetSettings).toHaveBeenCalledTimes(2)
    })

    it('UTA-INIT-004: loadInitialData関数が呼び出される', async () => {
      const { result } = renderHook(() => useTeacherApi('test-token'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.loadInitialData()
      })

      expect(mockGetSubjects).toHaveBeenCalledTimes(2)
      expect(mockGetSettings).toHaveBeenCalledTimes(2)
    })
  })

  // ======================
  // その他のプロパティテスト (4分岐)
  // ======================
  describe('Other properties', () => {
    it('UTA-PROP-001: availableGradesが正しく設定される', async () => {
      const { result } = renderHook(() => useTeacherApi('test-token'))

      expect(result.current.availableGrades).toEqual(['1', '2', '3'])
    })

    it('UTA-PROP-002: 初期状態のisSavingがfalse', async () => {
      const { result } = renderHook(() => useTeacherApi('test-token'))

      expect(result.current.isSaving).toBe(false)
    })

    it('UTA-PROP-003: 初期状態のisLoadingがtrue', async () => {
      const { result } = renderHook(() => useTeacherApi('test-token'))

      expect(result.current.isLoading).toBe(true)
    })

    it('UTA-PROP-004: デフォルトschoolSettingsが設定される', async () => {
      const { result } = renderHook(() => useTeacherApi('test-token'))

      expect(result.current.schoolSettings).toEqual({
        grade1Classes: 4,
        grade2Classes: 3,
        grade3Classes: 3,
        dailyPeriods: 6,
        saturdayPeriods: 4,
      })
    })
  })
})
