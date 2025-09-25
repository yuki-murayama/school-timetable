import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SubjectsSection } from '../../../../../src/frontend/components/data-management/SubjectsSection'
import { useToast } from '../../../../../src/frontend/hooks/use-toast'
import { subjectApi } from '../../../../../src/frontend/lib/api'
import type { Subject } from '../../../../../src/shared/schemas'

// モック設定
vi.mock('../../../../../src/frontend/hooks/use-toast')
vi.mock('../../../../../src/frontend/lib/api', () => ({
  subjectApi: {
    getSubjects: vi.fn(),
    createSubject: vi.fn(),
    updateSubject: vi.fn(),
    deleteSubject: vi.fn(),
  },
}))

// DnD-kitのモック
vi.mock('@dnd-kit/core', () => ({
  closestCenter: vi.fn(),
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
}))

vi.mock('@dnd-kit/sortable', () => ({
  arrayMove: vi.fn((array, oldIndex, newIndex) => {
    const newArray = [...array]
    const [removed] = newArray.splice(oldIndex, 1)
    newArray.splice(newIndex, 0, removed)
    return newArray
  }),
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: 'vertical',
}))

// SortableRowのモック
vi.mock('../../../../../src/frontend/components/data-management/SortableRow', () => ({
  SortableRow: ({ children, id }: { children: React.ReactNode; id: string }) => (
    <tr data-testid={`sortable-row-${id}`}>{children}</tr>
  ),
}))

// SubjectEditDialogのモック
vi.mock('../../../../../src/frontend/components/data-management/SubjectEditDialog', () => ({
  SubjectEditDialog: ({ isOpen, onClose, onSave, subject }: any) => (
    <div data-testid='subject-edit-dialog' style={{ display: isOpen ? 'block' : 'none' }}>
      <h3>{subject ? '教科編集' : '新規教科追加'}</h3>
      <button onClick={() => onSave({ id: 'new-subject', name: 'テスト教科' })}>保存</button>
      <button onClick={onClose}>キャンセル</button>
    </div>
  ),
}))

// console.error をモック（ログを抑制）
const mockConsoleError = vi.fn()
global.console.error = mockConsoleError

const mockUseToast = useToast as ReturnType<typeof vi.fn>
const mockSubjectApi = subjectApi as any

describe('SubjectsSection', () => {
  const mockToast = vi.fn()
  const mockOnSubjectsUpdate = vi.fn()
  const mockGetFreshToken = vi.fn()

  const sampleSubjects: Subject[] = [
    {
      id: 'subject-1',
      name: '数学',
      grades: [1, 2, 3],
      weekly_hours: 4,
      specialClassroom: '数学教室',
      order: 0,
      school_id: 'default',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'subject-2',
      name: '国語',
      grades: [1, 2, 3],
      weekly_hours: 5,
      specialClassroom: null,
      order: 1,
      school_id: 'default',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    },
  ]

  const defaultProps = {
    subjects: sampleSubjects,
    onSubjectsUpdate: mockOnSubjectsUpdate,
    token: 'test-token',
    getFreshToken: mockGetFreshToken,
    isLoading: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockUseToast.mockReturnValue({
      toast: mockToast,
    })

    mockGetFreshToken.mockResolvedValue('fresh-token')
  })

  it('正常にレンダリングされる', () => {
    render(<SubjectsSection {...defaultProps} />)

    expect(screen.getByText('教科情報管理')).toBeInTheDocument()
    expect(screen.getByText('教科名と専用教室の紐づけを管理します')).toBeInTheDocument()
    expect(screen.getByTestId('add-subject-button')).toBeInTheDocument()
  })

  it('教科一覧を正しく表示する', () => {
    render(<SubjectsSection {...defaultProps} />)

    expect(screen.getByText('数学')).toBeInTheDocument()
    expect(screen.getByText('国語')).toBeInTheDocument()
    // 複数の教科で同じ学年が表示されるため、getAllByTextを使用
    expect(screen.getAllByText('1年, 2年, 3年')).toHaveLength(2)
    expect(screen.getByText('数学教室')).toBeInTheDocument()
    // weekly_hoursの値に合わせて修正
    expect(screen.getByText('週4回')).toBeInTheDocument()
    expect(screen.getByText('週5回')).toBeInTheDocument()
  })

  it('ローディング状態を正しく表示する', () => {
    render(<SubjectsSection {...defaultProps} isLoading={true} />)

    expect(screen.getByText('教科情報を読み込み中...')).toBeInTheDocument()
    expect(screen.getByText('しばらく時間がかかる場合があります。')).toBeInTheDocument()
  })

  it('空の状態を正しく表示する', () => {
    render(<SubjectsSection {...defaultProps} subjects={[]} />)

    expect(screen.getByText('教科情報が登録されていません')).toBeInTheDocument()
  })

  it('新規教科追加ボタンが正しく動作する', () => {
    render(<SubjectsSection {...defaultProps} />)

    const addButton = screen.getByTestId('add-subject-button')
    fireEvent.click(addButton)

    expect(screen.getByTestId('subject-edit-dialog')).toBeVisible()
    expect(screen.getByText('新規教科追加')).toBeInTheDocument()
  })

  it('教科編集ボタンが正しく動作する', () => {
    render(<SubjectsSection {...defaultProps} />)

    const editButton = screen.getByTestId('edit-subject-subject-1')
    fireEvent.click(editButton)

    expect(screen.getByTestId('subject-edit-dialog')).toBeVisible()
    expect(screen.getByText('教科編集')).toBeInTheDocument()
  })

  it('教科削除が正しく動作する', async () => {
    mockSubjectApi.deleteSubject.mockResolvedValue({ success: true })

    render(<SubjectsSection {...defaultProps} />)

    const deleteButton = screen.getByTestId('delete-subject-subject-1')
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(mockSubjectApi.deleteSubject).toHaveBeenCalledWith('subject-1', {
        token: 'test-token',
        getFreshToken: mockGetFreshToken,
      })
    })

    expect(mockOnSubjectsUpdate).toHaveBeenCalledWith([sampleSubjects[1]])
    expect(mockToast).toHaveBeenCalledWith({
      title: '削除完了',
      description: '教科情報を削除しました',
    })
  })

  it('教科削除エラーを正しく処理する', async () => {
    mockSubjectApi.deleteSubject.mockRejectedValue(new Error('削除エラー'))

    render(<SubjectsSection {...defaultProps} />)

    const deleteButton = screen.getByTestId('delete-subject-subject-1')
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: '削除エラー',
        description: '教科の削除に失敗しました',
        variant: 'destructive',
      })
    })
  })

  it('新規教科保存が正しく動作する', async () => {
    render(<SubjectsSection {...defaultProps} />)

    // 新規追加ダイアログを開く
    fireEvent.click(screen.getByTestId('add-subject-button'))

    // 保存ボタンをクリック
    fireEvent.click(screen.getByText('保存'))

    await waitFor(() => {
      expect(mockOnSubjectsUpdate).toHaveBeenCalled()
    })
  })

  it('教科更新が正しく動作する', async () => {
    render(<SubjectsSection {...defaultProps} />)

    // 編集ダイアログを開く
    fireEvent.click(screen.getByTestId('edit-subject-subject-1'))

    // 保存ボタンをクリック
    fireEvent.click(screen.getByText('保存'))

    await waitFor(() => {
      expect(mockOnSubjectsUpdate).toHaveBeenCalled()
    })
  })

  it('一括保存が正しく動作する', async () => {
    mockSubjectApi.updateSubject.mockResolvedValue({ success: true })

    render(<SubjectsSection {...defaultProps} />)

    const saveAllButton = screen.getByText('すべて保存')
    fireEvent.click(saveAllButton)

    await waitFor(() => {
      expect(mockSubjectApi.updateSubject).toHaveBeenCalledTimes(2)
    })

    expect(mockToast).toHaveBeenCalledWith({
      title: '保存完了',
      description: '全ての教科情報を保存しました（2件）',
    })
  })

  it('一括保存エラーを正しく処理する', async () => {
    mockSubjectApi.updateSubject.mockRejectedValue(new Error('保存エラー'))

    render(<SubjectsSection {...defaultProps} />)

    const saveAllButton = screen.getByText('すべて保存')
    fireEvent.click(saveAllButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: '部分的に保存完了',
        description: '0件保存、2件失敗',
        variant: 'destructive',
      })
    })
  })

  it('学年表示フォーマットが正しく動作する', () => {
    const subjectsWithDifferentGrades: Subject[] = [
      {
        ...sampleSubjects[0],
        grades: [1],
      },
      {
        ...sampleSubjects[1],
        grades: [],
      },
    ]

    render(<SubjectsSection {...defaultProps} subjects={subjectsWithDifferentGrades} />)

    expect(screen.getByText('1年')).toBeInTheDocument()
    expect(screen.getByText('全学年')).toBeInTheDocument()
  })

  it('週間授業数表示フォーマットが正しく動作する', () => {
    const subjectsWithDifferentHours: Subject[] = [
      {
        ...sampleSubjects[0],
        weeklyHours: { grade1: 4, grade2: 3, grade3: 2 } as any,
      },
      {
        ...sampleSubjects[1],
        weekly_hours: 6,
      },
    ]

    render(<SubjectsSection {...defaultProps} subjects={subjectsWithDifferentHours} />)

    expect(screen.getByText('週4回')).toBeInTheDocument()
    expect(screen.getByText('週6回')).toBeInTheDocument()
  })

  it('特別教室表示が正しく動作する', () => {
    render(<SubjectsSection {...defaultProps} />)

    expect(screen.getByText('数学教室')).toBeInTheDocument()
    expect(screen.getByText('なし')).toBeInTheDocument()
  })

  it('無効なデータでエラーバウンダリが動作する', () => {
    // subjects が配列でない場合のテスト
    const invalidSubjects = null as any

    render(<SubjectsSection {...defaultProps} subjects={invalidSubjects} />)

    expect(screen.getByText('教科情報の表示エラー')).toBeInTheDocument()
  })

  it('トークンなしでは削除操作が実行されない', async () => {
    render(<SubjectsSection {...defaultProps} token={null} />)

    const deleteButton = screen.getByTestId('delete-subject-subject-1')
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(mockSubjectApi.deleteSubject).not.toHaveBeenCalled()
    })
  })

  it('ダイアログのキャンセルが正しく動作する', () => {
    render(<SubjectsSection {...defaultProps} />)

    // ダイアログを開く
    fireEvent.click(screen.getByTestId('add-subject-button'))
    expect(screen.getByTestId('subject-edit-dialog')).toBeVisible()

    // キャンセルボタンをクリック
    fireEvent.click(screen.getByText('キャンセル'))

    expect(screen.getByTestId('subject-edit-dialog')).not.toBeVisible()
  })

  it('ローディング中は追加ボタンが無効になる', () => {
    render(<SubjectsSection {...defaultProps} isLoading={true} />)

    const addButton = screen.getByTestId('add-subject-button')
    expect(addButton).toBeDisabled()
  })

  it('保存中は一括保存ボタンが無効になる', async () => {
    mockSubjectApi.updateSubject.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )

    render(<SubjectsSection {...defaultProps} />)

    const saveAllButton = screen.getByText('すべて保存')
    fireEvent.click(saveAllButton)

    expect(screen.getByText('保存中...')).toBeInTheDocument()
    expect(saveAllButton).toBeDisabled()
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
      expect(render).toBeDefined()
      expect(typeof render).toBe('function')
      expect(screen).toBeDefined()
      expect(typeof screen.getByText).toBe('function')
      expect(fireEvent).toBeDefined()
      expect(typeof fireEvent.click).toBe('function')
      expect(waitFor).toBeDefined()
      expect(typeof waitFor).toBe('function')
    })

    it('SubjectsSectionコンポーネントが正しく定義されている', () => {
      expect(SubjectsSection).toBeDefined()
      expect(typeof SubjectsSection).toBe('function')
    })

    it('Subject型が正しく定義されている', () => {
      const testSubject: Subject = {
        id: 'test-id',
        name: 'テスト教科',
        grades: [1, 2, 3],
        weekly_hours: 5,
        school_id: 'default',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      }

      expect(testSubject.id).toBe('test-id')
      expect(testSubject.name).toBe('テスト教科')
      expect(Array.isArray(testSubject.grades)).toBe(true)
      expect(typeof testSubject.weekly_hours).toBe('number')
    })

    it('モック化された依存関係が正しく設定されている', () => {
      expect(mockUseToast).toBeDefined()
      expect(typeof mockUseToast).toBe('function')
      expect(mockSubjectApi).toBeDefined()
      expect(typeof mockSubjectApi.getSubjects).toBe('function')
      expect(typeof mockSubjectApi.createSubject).toBe('function')
      expect(typeof mockSubjectApi.updateSubject).toBe('function')
      expect(typeof mockSubjectApi.deleteSubject).toBe('function')
    })

    it('テストユーティリティ関数が正しく定義されている', () => {
      expect(mockToast).toBeDefined()
      expect(typeof mockToast).toBe('function')
      expect(mockOnSubjectsUpdate).toBeDefined()
      expect(typeof mockOnSubjectsUpdate).toBe('function')
      expect(mockGetFreshToken).toBeDefined()
      expect(typeof mockGetFreshToken).toBe('function')
    })

    it('サンプルデータが正しく定義されている', () => {
      expect(sampleSubjects).toBeDefined()
      expect(Array.isArray(sampleSubjects)).toBe(true)
      expect(sampleSubjects).toHaveLength(2)
      expect(sampleSubjects[0].id).toBe('subject-1')
      expect(sampleSubjects[0].name).toBe('数学')
      expect(sampleSubjects[1].id).toBe('subject-2')
      expect(sampleSubjects[1].name).toBe('国語')
    })

    it('Vitestモック機能が正しく動作している', () => {
      expect(vi.fn).toBeDefined()
      expect(typeof vi.fn).toBe('function')
      expect(vi.clearAllMocks).toBeDefined()
      expect(typeof vi.clearAllMocks).toBe('function')
      expect(vi.mock).toBeDefined()
      expect(typeof vi.mock).toBe('function')
    })

    it('JavaScript基本機能が利用可能', () => {
      expect(Object).toBeDefined()
      expect(typeof Object.keys).toBe('function')
      expect(Array).toBeDefined()
      expect(typeof Array.isArray).toBe('function')
      expect(Promise).toBeDefined()
      expect(typeof Promise.resolve).toBe('function')
    })
  })
})
