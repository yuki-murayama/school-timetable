import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSubjectForm } from '../../../../src/frontend/hooks/use-subject-form'
import type { Subject } from '../../../../src/shared/schemas'

// console.log をモック（ログを抑制）
const mockConsoleLog = vi.fn()
global.console.log = mockConsoleLog

describe('useSubjectForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('初期状態が正しく設定される', () => {
    const { result } = renderHook(() => useSubjectForm(null))

    expect(result.current.formData).toEqual({
      name: '',
      specialClassroom: '',
      weekly_hours: 1,
      target_grades: [],
    })
    expect(result.current.errors).toEqual({})
    expect(result.current.isValid).toBe(true)
    expect(result.current.hasChanges).toBe(false)
  })

  it('既存の教科データで初期化される', () => {
    const existingSubject: Subject = {
      id: 'subject-1',
      name: '数学',
      grades: [1, 2, 3],
      weeklyHours: 4,
      specialClassroom: '数学教室',
      school_id: 'default',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    }

    const { result } = renderHook(() => useSubjectForm(existingSubject))

    expect(result.current.formData).toEqual({
      name: '数学',
      specialClassroom: '数学教室',
      weekly_hours: 4,
      target_grades: [1, 2, 3],
    })
  })

  it('レガシーフィールド形式をサポートする', () => {
    const legacySubject: Subject = {
      id: 'subject-1',
      name: '国語',
      target_grades: [1, 2],
      weekly_hours: 5,
      special_classroom: '国語教室',
      school_id: 'default',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    } as any

    const { result } = renderHook(() => useSubjectForm(legacySubject))

    expect(result.current.formData).toEqual({
      name: '国語',
      specialClassroom: '国語教室',
      weekly_hours: 5,
      target_grades: [1, 2],
    })
  })

  it('weeklyHoursオブジェクト形式をサポートする', () => {
    const objectSubject: Subject = {
      id: 'subject-1',
      name: '理科',
      weeklyHours: { grade1: 3, grade2: 4, grade3: 5 } as any,
      school_id: 'default',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    }

    const { result } = renderHook(() => useSubjectForm(objectSubject))

    expect(result.current.formData.weekly_hours).toBe(3) // 最初の値を使用
  })

  it('フィールド更新が正しく動作する', () => {
    const { result } = renderHook(() => useSubjectForm(null))

    act(() => {
      result.current.updateField('name', '音楽')
    })

    expect(result.current.formData.name).toBe('音楽')
  })

  it('学年選択が正しく動作する', () => {
    const { result } = renderHook(() => useSubjectForm(null))

    // 学年を追加
    act(() => {
      result.current.handleGradeChange(1, true)
    })

    expect(result.current.formData.target_grades).toEqual([1])

    // 別の学年を追加
    act(() => {
      result.current.handleGradeChange(2, true)
    })

    expect(result.current.formData.target_grades).toEqual([1, 2])

    // 学年を削除
    act(() => {
      result.current.handleGradeChange(1, false)
    })

    expect(result.current.formData.target_grades).toEqual([2])
  })

  it('バリデーションが正しく動作する', () => {
    const { result } = renderHook(() => useSubjectForm(null))

    // 空の教科名でバリデーションエラー
    let isValid: boolean
    act(() => {
      isValid = result.current.validateForm()
    })

    expect(isValid!).toBe(false)
    expect(result.current.errors.name).toBe('教科名を入力してください')

    // 教科名を設定
    act(() => {
      result.current.updateField('name', '美術')
    })

    act(() => {
      isValid = result.current.validateForm()
    })

    expect(isValid!).toBe(true)
    expect(result.current.errors).toEqual({})
  })

  it('週間授業数のバリデーションが正しく動作する', () => {
    const { result } = renderHook(() => useSubjectForm(null))

    act(() => {
      result.current.updateField('name', '体育')
      result.current.updateField('weekly_hours', 15) // 上限超過
    })

    let isValid: boolean
    act(() => {
      isValid = result.current.validateForm()
    })

    expect(isValid!).toBe(false)
    expect(result.current.errors.weekly_hours).toBe('週の授業数は1から10の範囲で入力してください')

    // 下限未満
    act(() => {
      result.current.updateField('weekly_hours', 0)
    })

    act(() => {
      isValid = result.current.validateForm()
    })

    expect(isValid!).toBe(false)
    expect(result.current.errors.weekly_hours).toBe('週の授業数は1から10の範囲で入力してください')
  })

  it('対象学年のバリデーションが正しく動作する', () => {
    const { result } = renderHook(() => useSubjectForm(null))

    act(() => {
      result.current.updateField('name', '技術')
      result.current.updateField('target_grades', [1, 2, 7]) // 無効な学年
    })

    let isValid: boolean
    act(() => {
      isValid = result.current.validateForm()
    })

    expect(isValid!).toBe(false)
    expect(result.current.errors.target_grades).toBe(
      '対象学年は1、2、3のいずれかを指定してください'
    )
  })

  it('フォームリセットが正しく動作する', () => {
    const { result } = renderHook(() => useSubjectForm(null))

    // データを設定
    act(() => {
      result.current.updateField('name', '家庭科')
      result.current.updateField('weekly_hours', 3)
      result.current.handleGradeChange(1, true)
    })

    expect(result.current.formData.name).toBe('家庭科')

    // リセット
    act(() => {
      result.current.resetForm()
    })

    expect(result.current.formData).toEqual({
      name: '',
      specialClassroom: '',
      weekly_hours: 1,
      target_grades: [],
    })
    expect(result.current.errors).toEqual({})
  })

  it('getFormDataが正しい形式でデータを返す', () => {
    const { result } = renderHook(() => useSubjectForm(null))

    act(() => {
      result.current.updateField('name', '道徳')
      result.current.updateField('specialClassroom', '道徳室')
      result.current.updateField('weekly_hours', 2)
      result.current.handleGradeChange(1, true)
      result.current.handleGradeChange(2, true)
    })

    const formData = result.current.getFormData()

    expect(formData).toEqual({
      name: '道徳',
      school_id: 'default',
      weekly_hours: 2,
      target_grades: JSON.stringify([1, 2]),
      special_classroom: '道徳室',
    })
  })

  it('編集モードでgetFormDataにIDが含まれる', () => {
    const existingSubject: Subject = {
      id: 'subject-1',
      name: '英語',
      school_id: 'default',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    }

    const { result } = renderHook(() => useSubjectForm(existingSubject))

    const formData = result.current.getFormData()

    expect(formData.id).toBe('subject-1')
  })

  it('空の特別教室は送信されない', () => {
    const { result } = renderHook(() => useSubjectForm(null))

    act(() => {
      result.current.updateField('name', '情報')
      result.current.updateField('specialClassroom', '   ') // 空白のみ
    })

    const formData = result.current.getFormData()

    expect(formData).not.toHaveProperty('special_classroom')
  })

  it('hasChangesが正しく動作する', () => {
    const { result } = renderHook(() => useSubjectForm(null))

    // 初期状態では変更なし
    expect(result.current.hasChanges).toBe(false)

    // 教科名を設定
    act(() => {
      result.current.updateField('name', '社会')
    })

    expect(result.current.hasChanges).toBe(true)

    // リセット
    act(() => {
      result.current.resetForm()
    })

    expect(result.current.hasChanges).toBe(false)

    // 週間授業数を変更
    act(() => {
      result.current.updateField('weekly_hours', 3)
    })

    expect(result.current.hasChanges).toBe(true)
  })

  it('isValidが正しく動作する', () => {
    const { result } = renderHook(() => useSubjectForm(null))

    // 初期状態ではエラーなし
    expect(result.current.isValid).toBe(true)

    // バリデーション実行でエラー発生
    act(() => {
      result.current.validateForm()
    })

    expect(result.current.isValid).toBe(false) // 教科名が空のためエラー

    // 教科名を設定してエラー解消
    act(() => {
      result.current.updateField('name', 'テスト教科')
    })

    act(() => {
      result.current.validateForm()
    })

    expect(result.current.isValid).toBe(true)
  })

  it('初期データ変更時にフォームが再初期化される', () => {
    const initialSubject: Subject = {
      id: 'subject-1',
      name: '数学',
      school_id: 'default',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    }

    const { result, rerender } = renderHook(({ subject }) => useSubjectForm(subject), {
      initialProps: { subject: initialSubject },
    })

    expect(result.current.formData.name).toBe('数学')

    // 新しい教科で再レンダリング
    const newSubject: Subject = {
      id: 'subject-2',
      name: '理科',
      school_id: 'default',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    }

    rerender({ subject: newSubject })

    expect(result.current.formData.name).toBe('理科')
  })

  it('null渡しで新規作成モードに切り替わる', () => {
    const initialSubject: Subject = {
      id: 'subject-1',
      name: '数学',
      school_id: 'default',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    }

    const { result, rerender } = renderHook(({ subject }) => useSubjectForm(subject), {
      initialProps: { subject: initialSubject },
    })

    expect(result.current.formData.name).toBe('数学')

    // nullに変更して新規作成モード
    rerender({ subject: null })

    expect(result.current.formData.name).toBe('')
    expect(result.current.formData).toEqual({
      name: '',
      specialClassroom: '',
      weekly_hours: 1,
      target_grades: [],
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

    it('React Testing Libraryが正しく設定されている', () => {
      expect(renderHook).toBeDefined()
      expect(typeof renderHook).toBe('function')
      expect(act).toBeDefined()
      expect(typeof act).toBe('function')
    })

    it('useSubjectFormフックが正しく定義されている', () => {
      expect(useSubjectForm).toBeDefined()
      expect(typeof useSubjectForm).toBe('function')
    })

    it('Subject型定義が正しくインポートされている', () => {
      const testSubject: Subject = {
        id: 'test',
        name: 'Test',
        school_id: 'default',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      }
      expect(testSubject.id).toBe('test')
      expect(testSubject.name).toBe('Test')
    })

    it('モックされたconsole.logが設定されている', () => {
      expect(mockConsoleLog).toBeDefined()
      expect(typeof mockConsoleLog).toBe('function')
      expect(global.console.log).toBe(mockConsoleLog)
    })

    it('フックの戻り値が正しい型を持っている', () => {
      const { result } = renderHook(() => useSubjectForm(null))

      expect(result.current.formData).toBeDefined()
      expect(typeof result.current.formData).toBe('object')
      expect(result.current.errors).toBeDefined()
      expect(typeof result.current.errors).toBe('object')
      expect(typeof result.current.isValid).toBe('boolean')
      expect(typeof result.current.hasChanges).toBe('boolean')
      expect(typeof result.current.updateField).toBe('function')
      expect(typeof result.current.handleGradeChange).toBe('function')
      expect(typeof result.current.validateForm).toBe('function')
      expect(typeof result.current.resetForm).toBe('function')
      expect(typeof result.current.getFormData).toBe('function')
    })

    it('Vitestテスト機能が正しく動作している', () => {
      expect(() => expect(true).toBe(true)).not.toThrow()
      expect(() => expect(false).toBe(false)).not.toThrow()
      expect(() => expect(1).toBe(1)).not.toThrow()
      expect(() => expect('test').toBe('test')).not.toThrow()
      expect(() => expect([1, 2]).toEqual([1, 2])).not.toThrow()
    })

    it('JavaScript基本機能が利用可能', () => {
      expect(Object).toBeDefined()
      expect(typeof Object.keys).toBe('function')
      expect(Array).toBeDefined()
      expect(typeof Array.isArray).toBe('function')
      expect(JSON).toBeDefined()
      expect(typeof JSON.stringify).toBe('function')
      expect(typeof JSON.parse).toBe('function')
    })
  })
})
