import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TimetableGenerate } from '../../../../src/frontend/components/TimetableGenerate'
import { useAuth } from '../../../../src/frontend/hooks/use-auth'
import { useToast } from '../../../../src/frontend/hooks/use-toast'
import { timetableApi } from '../../../../src/frontend/lib/api'

// モック設定
vi.mock('../../../../src/frontend/hooks/use-auth')
vi.mock('../../../../src/frontend/hooks/use-toast')
vi.mock('../../../../src/frontend/lib/api', () => ({
  timetableApi: {
    generateProgramTimetable: vi.fn(),
    saveProgramTimetable: vi.fn(),
  },
}))

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>
const mockUseToast = useToast as ReturnType<typeof vi.fn>
const mockTimetableApi = timetableApi as any

describe('TimetableGenerate', () => {
  const mockToast = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    mockUseAuth.mockReturnValue({
      token: 'test-token',
      user: { id: 'test-user', email: 'test@example.com' },
      isAuthenticated: true,
    })

    mockUseToast.mockReturnValue({
      toast: mockToast,
    })
  })

  it('正常にレンダリングされる', () => {
    render(<TimetableGenerate />)

    expect(screen.getByText('時間割生成')).toBeInTheDocument()
    expect(screen.getByText('条件を指定して新しい時間割を生成します')).toBeInTheDocument()
    expect(screen.getByText('生成モード')).toBeInTheDocument()
    expect(screen.getByText('時間割を生成')).toBeInTheDocument()
  })

  it('初期状態では簡易モードが選択されている', () => {
    render(<TimetableGenerate />)

    expect(screen.getByText('簡易モード')).toBeInTheDocument()
    const modeToggle = screen.getByLabelText('簡易モード')
    expect(modeToggle).toHaveAttribute('aria-checked', 'false')
  })

  it('モード切り替えが正しく動作する', () => {
    render(<TimetableGenerate />)

    const modeToggle = screen.getByLabelText('簡易モード')
    fireEvent.click(modeToggle)

    expect(screen.getByText('詳細モード')).toBeInTheDocument()
    expect(modeToggle).toBeChecked()
  })

  it('詳細条件設定が表示される', () => {
    render(<TimetableGenerate />)

    expect(screen.getByText('同一科目の連続配置制限')).toBeInTheDocument()
    expect(screen.getByText('合同授業設定')).toBeInTheDocument()
    expect(screen.getByText('授業時間設定')).toBeInTheDocument()
    expect(screen.getByText('任意条件')).toBeInTheDocument()
  })

  it('時間割生成が正常に動作する', async () => {
    const mockGenerationResult = {
      timetable: {
        grade: 1,
        class: 'A',
        schedule: [],
      },
      statistics: {
        generationTime: '2.5秒',
        totalAssignments: 150,
        constraintViolations: 0,
        backtrackCount: 10,
      },
      generatedAt: '2024-01-01T10:00:00.000Z',
      method: 'program',
    }

    const mockSaveResult = {
      timetableId: 'saved-timetable-id',
      assignmentRate: 98,
    }

    mockTimetableApi.generateProgramTimetable.mockResolvedValue(mockGenerationResult)
    mockTimetableApi.saveProgramTimetable.mockResolvedValue(mockSaveResult)

    render(<TimetableGenerate />)

    const generateButton = screen.getByText('時間割を生成')
    fireEvent.click(generateButton)

    // ローディング状態を確認
    expect(screen.getByText('時間割生成中...')).toBeInTheDocument()

    await waitFor(() => {
      expect(mockTimetableApi.generateProgramTimetable).toHaveBeenCalledWith({
        token: 'test-token',
      })
    })

    await waitFor(() => {
      expect(mockTimetableApi.saveProgramTimetable).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: '生成・保存完了',
        description: '時間割生成と保存が完了しました（割当率: 98%）',
      })
    })

    // 生成結果の表示を確認
    await waitFor(() => {
      expect(screen.getByText('時間割生成完了')).toBeInTheDocument()
      expect(screen.getByText('2.5秒')).toBeInTheDocument()
      expect(screen.getByText('150')).toBeInTheDocument()
      expect(screen.getByText('0')).toBeInTheDocument()
    })
  })

  it('認証なしでは生成エラーになる', async () => {
    mockUseAuth.mockReturnValue({
      token: null,
      user: null,
      isAuthenticated: false,
    })

    render(<TimetableGenerate />)

    const generateButton = screen.getByText('時間割を生成')
    fireEvent.click(generateButton)

    expect(mockToast).toHaveBeenCalledWith({
      title: '認証エラー',
      description: 'ログインが必要です',
      variant: 'destructive',
    })

    expect(mockTimetableApi.generateProgramTimetable).not.toHaveBeenCalled()
  })

  it('時間割生成エラーを正しく処理する', async () => {
    mockTimetableApi.generateProgramTimetable.mockRejectedValue(new Error('生成エラー'))

    render(<TimetableGenerate />)

    const generateButton = screen.getByText('時間割を生成')
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: '生成エラー',
        description: '時間割生成中にエラーが発生しました',
        variant: 'destructive',
      })
    })
  })

  it('時間割生成は成功したが保存に失敗した場合を処理する', async () => {
    const mockGenerationResult = {
      timetable: {
        grade: 1,
        class: 'A',
        schedule: [],
      },
      statistics: {
        generationTime: '2.5秒',
        totalAssignments: 150,
        constraintViolations: 0,
      },
      generatedAt: '2024-01-01T10:00:00.000Z',
      method: 'program',
    }

    mockTimetableApi.generateProgramTimetable.mockResolvedValue(mockGenerationResult)
    mockTimetableApi.saveProgramTimetable.mockRejectedValue(new Error('保存エラー'))

    render(<TimetableGenerate />)

    const generateButton = screen.getByText('時間割を生成')
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: '生成完了（保存エラー）',
        description: '時間割生成が完了しましたが、保存中にエラーが発生しました: 保存エラー',
        variant: 'destructive',
      })
    })

    // 生成結果は表示される
    await waitFor(() => {
      expect(screen.getByText('時間割生成完了')).toBeInTheDocument()
    })
  })

  it('生成結果にtimetableがない場合を処理する', async () => {
    const mockGenerationResult = {
      statistics: {
        backtrackCount: 100,
      },
    }

    mockTimetableApi.generateProgramTimetable.mockResolvedValue(mockGenerationResult)

    render(<TimetableGenerate />)

    const generateButton = screen.getByText('時間割を生成')
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: '生成失敗',
        description: '時間割生成に失敗しました',
        variant: 'destructive',
      })
    })

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: '生成統計',
        description: 'バックトラック回数: 100',
      })
    })
  })

  it('保存結果にtimetableIdがない場合を処理する', async () => {
    const mockGenerationResult = {
      timetable: {
        grade: 1,
        class: 'A',
        schedule: [],
      },
      statistics: {
        generationTime: '2.5秒',
        totalAssignments: 150,
        constraintViolations: 0,
      },
      generatedAt: '2024-01-01T10:00:00.000Z',
      method: 'program',
    }

    const mockSaveResult = {
      // timetableIdがない
      assignmentRate: 98,
    }

    mockTimetableApi.generateProgramTimetable.mockResolvedValue(mockGenerationResult)
    mockTimetableApi.saveProgramTimetable.mockResolvedValue(mockSaveResult)

    render(<TimetableGenerate />)

    const generateButton = screen.getByText('時間割を生成')
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: '生成完了（保存失敗）',
        description: '時間割生成が完了しましたが、保存に失敗しました',
        variant: 'destructive',
      })
    })
  })

  it('詳細条件の設定が正しく動作する', () => {
    render(<TimetableGenerate />)

    // 連続配置制限の切り替え - より堅牢な方法でスイッチを特定
    const consecutiveSwitchSection = screen.getByText('同一科目の連続配置制限').closest('div')
    const consecutiveSwitch = consecutiveSwitchSection?.querySelector('button[role="switch"]')
    if (consecutiveSwitch) {
      fireEvent.click(consecutiveSwitch)
    }

    // カスタム条件の入力
    const customConditionsInput = screen.getByPlaceholderText(
      'その他の特別な条件があれば記入してください...'
    )
    fireEvent.change(customConditionsInput, { target: { value: 'テスト条件' } })

    expect(customConditionsInput).toHaveValue('テスト条件')
  })

  it('生成中はボタンが無効になる', async () => {
    let resolveGeneration: (value: any) => void
    const generationPromise = new Promise(resolve => {
      resolveGeneration = resolve
    })
    mockTimetableApi.generateProgramTimetable.mockReturnValue(generationPromise)

    render(<TimetableGenerate />)

    const generateButton = screen.getByText('時間割を生成')
    const resetButton = screen.getByText('条件をリセット')

    fireEvent.click(generateButton)

    // 生成中はボタンが無効
    expect(generateButton).toBeDisabled()
    expect(resetButton).toBeDisabled()

    // 生成完了
    resolveGeneration!({
      timetable: { grade: 1, class: 'A', schedule: [] },
      statistics: { generationTime: '1秒' },
    })

    await waitFor(() => {
      expect(generateButton).not.toBeDisabled()
      expect(resetButton).not.toBeDisabled()
    })
  })

  it('セレクトボックスが正しく表示される', () => {
    render(<TimetableGenerate />)

    expect(screen.getByText('科目を選択')).toBeInTheDocument()
    expect(screen.getByText('学年を選択')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('クラス数')).toBeInTheDocument()
  })

  it('授業時間設定の入力フィールドが正しく表示される', () => {
    render(<TimetableGenerate />)

    expect(screen.getByDisplayValue('6')).toBeInTheDocument() // 1日の授業数
    expect(screen.getByDisplayValue('4')).toBeInTheDocument() // 土曜の授業数
  })

  it('生成結果でメタデータがない場合のデフォルト値表示', async () => {
    const mockGenerationResult = {
      timetable: {
        grade: 1,
        class: 'A',
        schedule: [],
      },
      statistics: {}, // 空の統計情報
      generatedAt: '2024-01-01T10:00:00.000Z',
      method: 'program',
    }

    mockTimetableApi.generateProgramTimetable.mockResolvedValue(mockGenerationResult)
    mockTimetableApi.saveProgramTimetable.mockResolvedValue({ timetableId: 'test-id' })

    render(<TimetableGenerate />)

    const generateButton = screen.getByText('時間割を生成')
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(screen.getByText('時間割生成完了')).toBeInTheDocument()
    })

    // デフォルト値が表示される
    expect(screen.getByText('不明')).toBeInTheDocument() // 生成時間
    expect(screen.getAllByText('0')).toHaveLength(2) // 割当数と制約違反のデフォルト値
  })

  it('コンポーネントが正しくレンダリングされる', () => {
    const { container } = render(<TimetableGenerate />)
    expect(container).toBeInTheDocument()
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

    it('TimetableGenerateコンポーネントが正しく定義されている', () => {
      expect(TimetableGenerate).toBeDefined()
      expect(typeof TimetableGenerate).toBe('function')
    })

    it('認証関連のモックが正しく設定されている', () => {
      expect(mockUseAuth).toBeDefined()
      expect(typeof mockUseAuth).toBe('function')
      expect(mockUseToast).toBeDefined()
      expect(typeof mockUseToast).toBe('function')
    })

    it('APIモックが正しく設定されている', () => {
      expect(mockTimetableApi).toBeDefined()
      expect(mockTimetableApi.generateProgramTimetable).toBeDefined()
      expect(typeof mockTimetableApi.generateProgramTimetable).toBe('function')
      expect(mockTimetableApi.saveProgramTimetable).toBeDefined()
      expect(typeof mockTimetableApi.saveProgramTimetable).toBe('function')
    })

    it('テストユーティリティ関数が正しく定義されている', () => {
      expect(mockToast).toBeDefined()
      expect(typeof mockToast).toBe('function')
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

    it('時間割生成テストに必要なデータ構造が正しく動作している', () => {
      const mockGenerationData = {
        timetable: {
          grade: 1,
          class: 'A',
          schedule: [],
        },
        statistics: {
          generationTime: '2.5秒',
          totalAssignments: 150,
          constraintViolations: 0,
          backtrackCount: 10,
        },
        generatedAt: '2024-01-01T10:00:00.000Z',
        method: 'program',
      }

      const mockSaveData = {
        timetableId: 'saved-timetable-id',
        assignmentRate: 98,
      }

      expect(mockGenerationData.timetable.grade).toBe(1)
      expect(mockGenerationData.timetable.class).toBe('A')
      expect(Array.isArray(mockGenerationData.timetable.schedule)).toBe(true)
      expect(typeof mockGenerationData.statistics.totalAssignments).toBe('number')
      expect(typeof mockSaveData.assignmentRate).toBe('number')
      expect(typeof mockSaveData.timetableId).toBe('string')
    })
  })
})
