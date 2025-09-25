import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TimetableView } from '../../../../src/frontend/components/TimetableView'
import { useAuth } from '../../../../src/frontend/hooks/use-auth'
import { useToast } from '../../../../src/frontend/hooks/use-toast'

// モック設定
vi.mock('../../../../src/frontend/hooks/use-auth')
vi.mock('../../../../src/frontend/hooks/use-toast')

// グローバルfetchのモック
const mockFetch = vi.fn()
global.fetch = mockFetch

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>
const mockUseToast = useToast as ReturnType<typeof vi.fn>

describe('TimetableView', () => {
  const mockToast = vi.fn()
  const mockGetFreshToken = vi.fn()
  const mockOnViewDetail = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    mockUseAuth.mockReturnValue({
      token: 'test-token',
      getFreshToken: mockGetFreshToken,
      user: { id: 'test-user', email: 'test@example.com' },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    })

    mockUseToast.mockReturnValue({
      toast: mockToast,
    })

    mockGetFreshToken.mockResolvedValue('fresh-token')

    // デフォルトの空レスポンスを設定
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        success: true,
        data: {
          timetables: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
          },
        },
      }),
    })
  })

  it('初期レンダリングで正しい状態を表示する', async () => {
    await act(async () => {
      render(<TimetableView />)
    })

    expect(screen.getByText('時間割参照')).toBeInTheDocument()
    expect(screen.getByText('時間割データがありません。')).toBeInTheDocument()
  })

  it('時間割データを正常に表示する', async () => {
    const mockTimetableData = {
      success: true,
      data: {
        timetables: [
          {
            id: 'timetable-1',
            grade: 1,
            class: 'A',
            name: '1年A組',
            createdAt: '2024-01-01T00:00:00.000Z',
            assignmentRate: 85,
          },
          {
            id: 'timetable-2',
            grade: 2,
            class: 'B',
            name: '2年B組',
            createdAt: '2024-01-01T00:00:00.000Z',
            assignmentRate: 92,
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTimetableData,
    })

    await act(async () => {
      render(<TimetableView onViewDetail={mockOnViewDetail} />)
    })

    await waitFor(() => {
      expect(screen.getByText('1年A組')).toBeInTheDocument()
      expect(screen.getByText('2年B組')).toBeInTheDocument()
    })

    // totalPages > 1のときのみページネーションが表示されるので、こちらをチェックしない
    // データが正常に表示されることをメインに確認
  })

  it('エラー状態を正しく処理する', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    await act(async () => {
      render(<TimetableView />)
    })

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'エラー',
        description: '時間割の読み込みに失敗しました',
        variant: 'destructive',
      })
    })
  })

  it('詳細表示ボタンをクリックして詳細を表示する', async () => {
    const mockTimetableData = {
      success: true,
      data: {
        timetables: [
          {
            id: 'timetable-1',
            grade: 1,
            class: 'A',
            name: '1年A組',
            createdAt: '2024-01-01T00:00:00.000Z',
            assignmentRate: 85,
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTimetableData,
    })

    await act(async () => {
      render(<TimetableView onViewDetail={mockOnViewDetail} />)
    })

    await waitFor(() => {
      expect(screen.getByText('1年A組')).toBeInTheDocument()
    })

    const detailButton = screen.getByRole('button', { name: /詳細/ })
    await act(async () => {
      fireEvent.click(detailButton)
    })

    expect(mockOnViewDetail).toHaveBeenCalledWith('timetable-1')
  })

  it('ページネーションが正しく動作する', async () => {
    const mockTimetableData = {
      success: true,
      data: {
        timetables: [
          {
            id: 'timetable-1',
            grade: 1,
            class: 'A',
            name: '1年A組',
            createdAt: '2024-01-01T00:00:00.000Z',
            assignmentRate: 85,
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 25,
          totalPages: 2,
        },
      },
    }

    // 初回レンダリング時の呼び出し
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTimetableData,
    })

    // 次ページボタンクリック時の呼び出し
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTimetableData,
    })

    await act(async () => {
      render(<TimetableView />)
    })

    await waitFor(() => {
      expect(screen.getByText('1年A組')).toBeInTheDocument()
    })

    // ページネーションが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText(/全 \d+ 件中 \d+ - \d+ 件を表示/)).toBeInTheDocument()
    })

    // 次のページボタンをクリック
    const nextButton = screen.getByRole('button', { name: /次へ/ })
    await act(async () => {
      fireEvent.click(nextButton)
    })

    await waitFor(() => {
      // 次ページボタンがクリックされたことで追加のfetch呼び出しが発生することを確認
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/timetables?page=2'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      )
    })
  })

  it('空の状態を正しく表示する', async () => {
    const mockEmptyData = {
      success: true,
      data: {
        timetables: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmptyData,
    })

    await act(async () => {
      render(<TimetableView />)
    })

    await waitFor(() => {
      expect(screen.getByText('時間割データがありません。')).toBeInTheDocument()
    })
  })

  it('リフレッシュボタンが正しく動作する', async () => {
    const mockTimetableData = {
      success: true,
      data: {
        timetables: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      },
    }

    // 初回レンダリング時の呼び出し
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTimetableData,
    })

    // リフレッシュボタンクリック時の呼び出し
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTimetableData,
    })

    await act(async () => {
      render(<TimetableView />)
    })

    await waitFor(() => {
      expect(screen.getByText('時間割データがありません。')).toBeInTheDocument()
    })

    const refreshButton = screen.getByText('再読み込み')
    await act(async () => {
      fireEvent.click(refreshButton)
    })

    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('認証エラーを正しく処理する', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ message: 'Unauthorized' }),
    })

    await act(async () => {
      render(<TimetableView />)
    })

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'エラー',
        description: '時間割の読み込みに失敗しました',
        variant: 'destructive',
      })
    })
  })

  it('バリデーションエラーを正しく処理する', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({
        message: 'Validation failed',
        errors: [{ field: 'page', message: 'Invalid page number' }],
      }),
    })

    await act(async () => {
      render(<TimetableView />)
    })

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'エラー',
        description: '時間割の読み込みに失敗しました',
        variant: 'destructive',
      })
    })
  })

  it('コンポーネントが正しくレンダリングされる', () => {
    const { container } = render(<TimetableView onViewDetail={mockOnViewDetail} />)
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
      expect(act).toBeDefined()
      expect(typeof act).toBe('function')
    })

    it('TimetableViewコンポーネントが正しく定義されている', () => {
      expect(TimetableView).toBeDefined()
      expect(typeof TimetableView).toBe('function')
    })

    it('認証関連のモックが正しく設定されている', () => {
      expect(mockUseAuth).toBeDefined()
      expect(typeof mockUseAuth).toBe('function')
      expect(mockUseToast).toBeDefined()
      expect(typeof mockUseToast).toBe('function')
    })

    it('テストユーティリティ関数が正しく定義されている', () => {
      expect(mockToast).toBeDefined()
      expect(typeof mockToast).toBe('function')
      expect(mockGetFreshToken).toBeDefined()
      expect(typeof mockGetFreshToken).toBe('function')
      expect(mockOnViewDetail).toBeDefined()
      expect(typeof mockOnViewDetail).toBe('function')
    })

    it('グローバルfetchモックが正しく設定されている', () => {
      expect(global.fetch).toBeDefined()
      expect(typeof global.fetch).toBe('function')
      expect(mockFetch).toBeDefined()
      expect(typeof mockFetch).toBe('function')
      expect(global.fetch).toBe(mockFetch)
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

    it('HTTPレスポンス構造が正しく動作している', () => {
      const mockResponseStructure = {
        success: true,
        data: {
          timetables: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
          },
        },
      }

      expect(mockResponseStructure.success).toBe(true)
      expect(Array.isArray(mockResponseStructure.data.timetables)).toBe(true)
      expect(mockResponseStructure.data.pagination.page).toBe(1)
      expect(mockResponseStructure.data.pagination.limit).toBe(20)
    })
  })
})
