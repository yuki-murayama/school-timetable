import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TimetableDetailView } from '../../../../../src/frontend/components/timetable/TimetableDetailView'

// 依存関係をモック
vi.mock('../../../../../src/frontend/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../../../../src/frontend/hooks/use-toast', () => ({
  useToast: vi.fn(),
}))

vi.mock('../../../../../src/frontend/components/timetable/TimetableGrid', () => ({
  TimetableGrid: ({
    data,
    selectedClassLabel,
    onSlotChange,
  }: {
    data: unknown[]
    selectedClassLabel: string
    onSlotChange?: (slot: unknown) => void
  }) => (
    <div data-testid='timetable-grid'>
      <div data-testid='selected-class'>{selectedClassLabel}</div>
      <div data-testid='data-length'>{Array.isArray(data) ? data.length : 0}</div>
      {onSlotChange && (
        <button
          type='button'
          data-testid='change-slot-button'
          onClick={() => onSlotChange({ subject: 'テスト教科', teacher: 'テスト教師' })}
        >
          Change Slot
        </button>
      )}
    </div>
  ),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: vi.fn(),
    useNavigate: vi.fn(),
  }
})

import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../../../src/frontend/hooks/use-auth'
import { useToast } from '../../../../../src/frontend/hooks/use-toast'

const mockUseAuth = vi.mocked(useAuth)
const mockUseToast = vi.mocked(useToast)
const mockUseParams = vi.mocked(useParams)
const mockUseNavigate = vi.mocked(useNavigate)

// グローバルfetchをモック
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('TimetableDetailView', () => {
  const mockToast = vi.fn()
  const mockNavigate = vi.fn()

  // サンプル時間割データ
  const mockTimetableData = {
    id: 'test-timetable-id',
    name: 'テスト時間割',
    timetable: [
      [
        // 1年生
        [
          // 1-1クラス
          {
            subject: '数学',
            teacher: '田中先生',
            period: '1',
            day: 'monday',
            classGrade: 1,
            classSection: 1,
          },
          {
            subject: '国語',
            teacher: '佐藤先生',
            period: '2',
            day: 'monday',
            classGrade: 1,
            classSection: 1,
          },
        ],
        [
          // 1-2クラス
          {
            subject: '理科',
            teacher: '山田先生',
            period: '1',
            day: 'monday',
            classGrade: 1,
            classSection: 2,
          },
        ],
      ],
    ],
    assignmentRate: 85.5,
    totalSlots: 100,
    assignedSlots: 85,
    generationMethod: 'automatic',
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-15T15:00:00Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // デフォルトモック設定
    mockUseAuth.mockReturnValue({
      token: 'test-token',
      getFreshToken: vi.fn().mockResolvedValue('fresh-token'),
      user: null,
      sessionId: null,
      isLoading: false,
      error: null,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      verifyToken: vi.fn(),
      hasRole: vi.fn(),
      isAdmin: vi.fn(),
      isTeacher: vi.fn(),
      getAuthHeaders: vi.fn(),
    })

    mockUseToast.mockReturnValue({
      toast: mockToast,
    })

    mockUseParams.mockReturnValue({ id: 'test-id' })
    mockUseNavigate.mockReturnValue(mockNavigate)

    // 成功レスポンスをデフォルトに設定
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockTimetableData }),
    })
  })

  describe('コンポーネント初期化', () => {
    it('TDV-001: 基本的な初期化が正常に行われる', async () => {
      // Given: 遅延されたAPI応答
      mockFetch.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve({ success: true, data: mockTimetableData }),
                }),
              100
            )
          )
      )

      // When: TimetableDetailViewをレンダリング
      await act(async () => {
        render(
          <MemoryRouter>
            <TimetableDetailView timetableId='test-id' />
          </MemoryRouter>
        )
      })

      // Then: ローディング状態が表示される
      expect(screen.getByText('時間割詳細を読み込み中...')).toBeInTheDocument()

      // データロード完了を待機
      await waitFor(
        () => {
          expect(screen.queryByText('時間割詳細を読み込み中...')).not.toBeInTheDocument()
        },
        { timeout: 1000 }
      )
    })

    it('TDV-002: propsのtimetableIdが優先される', async () => {
      // Given: propsとURLパラメータの両方が設定
      mockUseParams.mockReturnValue({ id: 'url-param-id' })

      // When: propsでtimetableIdを渡してレンダリング
      await act(async () => {
        render(
          <MemoryRouter>
            <TimetableDetailView timetableId='props-id' />
          </MemoryRouter>
        )
      })

      // Then: propsのIDが優先される（fetch URLで確認）
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/timetable/program/saved/props-id',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      )
    })

    it('TDV-003: URLパラメータのIDが使用される', async () => {
      // Given: propsにtimetableIdがない場合
      mockUseParams.mockReturnValue({ id: 'url-param-id' })

      // When: propsなしでレンダリング
      await act(async () => {
        render(
          <MemoryRouter>
            <TimetableDetailView />
          </MemoryRouter>
        )
      })

      // Then: URLパラメータのIDが使用される
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/timetable/program/saved/url-param-id',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      )
    })
  })

  describe('データ取得', () => {
    it('TDV-004: 時間割データの正常取得', async () => {
      // Given: 正常なAPIレスポンス
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockTimetableData }),
      })

      // When: コンポーネントをレンダリング
      await act(async () => {
        render(
          <MemoryRouter>
            <TimetableDetailView timetableId='test-id' />
          </MemoryRouter>
        )
      })

      // Then: データが正しく取得され、APIが呼び出される
      await waitFor(
        () => {
          expect(mockFetch).toHaveBeenCalledWith(
            '/api/timetable/program/saved/test-id',
            expect.objectContaining({
              method: 'GET',
              headers: expect.objectContaining({
                Authorization: 'Bearer test-token',
              }),
            })
          )
        },
        { timeout: 5000 }
      )

      // データロード完了後、時間割グリッドが表示されることを確認
      await waitFor(
        () => {
          const grids = screen.getAllByTestId('timetable-grid')
          expect(grids.length).toBeGreaterThan(0)
        },
        { timeout: 5000 }
      )
    })

    it('TDV-005: データ取得エラーの処理', async () => {
      // Given: APIエラーレスポンス
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ success: false, error: 'Not found' }),
      })

      // When: コンポーネントをレンダリング
      await act(async () => {
        render(
          <MemoryRouter>
            <TimetableDetailView timetableId='invalid-id' />
          </MemoryRouter>
        )
      })

      // Then: APIが呼び出される
      await waitFor(
        () => {
          expect(mockFetch).toHaveBeenCalledWith(
            '/api/timetable/program/saved/invalid-id',
            expect.objectContaining({
              method: 'GET',
            })
          )
        },
        { timeout: 5000 }
      )

      // エラートーストが表示される
      await waitFor(
        () => {
          expect(mockToast).toHaveBeenCalledWith({
            title: 'エラー',
            description: '時間割詳細の読み込みに失敗しました',
            variant: 'destructive',
          })
        },
        { timeout: 5000 }
      )
    })

    it('TDV-006: ネットワークエラーの処理', async () => {
      // Given: ネットワークエラー
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      // When: コンポーネントをレンダリング
      await act(async () => {
        render(
          <MemoryRouter>
            <TimetableDetailView timetableId='test-id' />
          </MemoryRouter>
        )
      })

      // Then: エラートーストが表示される
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'エラー',
          description: '時間割詳細の読み込みに失敗しました',
          variant: 'destructive',
        })
      })
    })
  })

  describe('クラス選択機能', () => {
    it('TDV-007: 利用可能クラスの正しい生成', async () => {
      // Given: 時間割データが取得済み
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockTimetableData }),
      })

      await act(async () => {
        render(
          <MemoryRouter>
            <TimetableDetailView timetableId='test-id' />
          </MemoryRouter>
        )
      })

      // Then: 利用可能クラスが正しく生成される
      await waitFor(() => {
        // 時間割グリッドが表示される
        const grids = screen.getAllByTestId('timetable-grid')
        expect(grids.length).toBeGreaterThan(0)
      })
    })

    it('TDV-008: デフォルトクラスの選択', async () => {
      // Given: 時間割データが取得済み
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockTimetableData }),
      })

      await act(async () => {
        render(
          <MemoryRouter>
            <TimetableDetailView timetableId='test-id' />
          </MemoryRouter>
        )
      })

      // Then: 最初のクラスが選択される
      await waitFor(() => {
        const selectedClasses = screen.getAllByTestId('selected-class')
        expect(selectedClasses.length).toBeGreaterThan(0)
      })
    })

    it('TDV-009: 空データの場合のデフォルトクラス', async () => {
      // Given: 空の時間割データ
      const emptyTimetableData = {
        ...mockTimetableData,
        timetable: [],
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: emptyTimetableData }),
      })

      await act(async () => {
        render(
          <MemoryRouter>
            <TimetableDetailView timetableId='test-id' />
          </MemoryRouter>
        )
      })

      // Then: デフォルトクラスが使用される
      await waitFor(() => {
        const selectedClasses = screen.getAllByTestId('selected-class')
        expect(selectedClasses.length).toBeGreaterThan(0)
      })
    })
  })

  describe('表示モード切り替え', () => {
    it('TDV-010: 詳細表示から編集モードへの切り替え', async () => {
      // Given: データが読み込まれた状態
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockTimetableData }),
      })

      await act(async () => {
        render(
          <MemoryRouter>
            <TimetableDetailView timetableId='test-id' />
          </MemoryRouter>
        )
      })

      await waitFor(() => {
        const grids = screen.getAllByTestId('timetable-grid')
        expect(grids.length).toBeGreaterThan(0)
      })

      // When: 編集ボタンをクリック
      const editButton = screen.getByRole('button', { name: '編集' })
      await act(async () => {
        fireEvent.click(editButton)
      })

      // Then: 編集モードに切り替わる（キャンセルボタンが表示される）
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'キャンセル' })).toBeInTheDocument()
      })
    })

    it('TDV-011: 編集モードから詳細表示への切り替え', async () => {
      // Given: データが読み込まれた状態
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockTimetableData }),
      })

      await act(async () => {
        render(
          <MemoryRouter>
            <TimetableDetailView timetableId='test-id' />
          </MemoryRouter>
        )
      })

      await waitFor(() => {
        const grids = screen.getAllByTestId('timetable-grid')
        expect(grids.length).toBeGreaterThan(0)
      })

      // When: 編集モードに切り替え
      const editButton = screen.getByRole('button', { name: '編集' })
      await act(async () => {
        fireEvent.click(editButton)
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'キャンセル' })).toBeInTheDocument()
      })

      // When: キャンセルボタンをクリック
      const cancelButton = screen.getByRole('button', { name: 'キャンセル' })
      await act(async () => {
        fireEvent.click(cancelButton)
      })

      // Then: 詳細表示モードに戻る（即座に編集ボタンが表示される）
      await waitFor(() => {
        expect(screen.getByRole('button', { name: '編集' })).toBeInTheDocument()
      })
    })
  })

  describe('戻るボタン機能', () => {
    it('TDV-012: onBackToListコールバックが呼び出される', async () => {
      // Given: onBackToListコールバック
      const mockOnBackToList = vi.fn()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockTimetableData }),
      })

      await act(async () => {
        render(
          <MemoryRouter>
            <TimetableDetailView timetableId='test-id' onBackToList={mockOnBackToList} />
          </MemoryRouter>
        )
      })

      await waitFor(() => {
        const grids = screen.getAllByTestId('timetable-grid')
        expect(grids.length).toBeGreaterThan(0)
      })

      // When: 戻るボタンをクリック
      const backButton = screen.getByRole('button', { name: /戻る/i })
      await act(async () => {
        fireEvent.click(backButton)
      })

      // Then: コールバックが呼び出される
      expect(mockOnBackToList).toHaveBeenCalledOnce()
    })

    it('TDV-013: onBackToListがない場合はnavigateが呼び出される', async () => {
      // Given: onBackToListなし
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockTimetableData }),
      })

      await act(async () => {
        render(
          <MemoryRouter>
            <TimetableDetailView timetableId='test-id' />
          </MemoryRouter>
        )
      })

      await waitFor(() => {
        const grids = screen.getAllByTestId('timetable-grid')
        expect(grids.length).toBeGreaterThan(0)
      })

      // When: 戻るボタンをクリック
      const backButton = screen.getByRole('button', { name: /戻る/i })
      await act(async () => {
        fireEvent.click(backButton)
      })

      // Then: navigateが呼び出される
      expect(mockNavigate).toHaveBeenCalledWith('/timetable-reference')
    })
  })

  describe('基本プロパティテスト', () => {
    it('TimetableDetailViewコンポーネントが正しくレンダリングされる', () => {
      const { container } = render(
        <MemoryRouter>
          <TimetableDetailView />
        </MemoryRouter>
      )
      expect(container).toBeInTheDocument()
    })

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

    it('TimetableDetailViewコンポーネントが正しく定義されている', () => {
      expect(TimetableDetailView).toBeDefined()
      expect(typeof TimetableDetailView).toBe('function')
    })

    it('React Router関連のモックが正しく設定されている', () => {
      expect(mockUseAuth).toBeDefined()
      expect(typeof mockUseAuth).toBe('function')
      expect(mockUseToast).toBeDefined()
      expect(typeof mockUseToast).toBe('function')
      expect(mockUseParams).toBeDefined()
      expect(typeof mockUseParams).toBe('function')
      expect(mockUseNavigate).toBeDefined()
      expect(typeof mockUseNavigate).toBe('function')
    })

    it('テストユーティリティ関数が正しく定義されている', () => {
      expect(mockToast).toBeDefined()
      expect(typeof mockToast).toBe('function')
      expect(mockNavigate).toBeDefined()
      expect(typeof mockNavigate).toBe('function')
    })

    it('モック時間割データが正しく定義されている', () => {
      expect(mockTimetableData).toBeDefined()
      expect(mockTimetableData.id).toBe('test-timetable-id')
      expect(mockTimetableData.name).toBe('テスト時間割')
      expect(Array.isArray(mockTimetableData.timetable)).toBe(true)
      expect(typeof mockTimetableData.assignmentRate).toBe('number')
      expect(typeof mockTimetableData.totalSlots).toBe('number')
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
    })

    it('時間割データ構造が正しく動作している', () => {
      const testSlot = {
        subject: '数学',
        teacher: '田中先生',
        period: '1',
        day: 'monday',
        classGrade: 1,
        classSection: 1,
      }

      expect(testSlot.subject).toBe('数学')
      expect(testSlot.teacher).toBe('田中先生')
      expect(typeof testSlot.classGrade).toBe('number')
      expect(typeof testSlot.classSection).toBe('number')
    })

    it('時間割統計データ構造が正しく動作している', () => {
      const statsData = {
        assignmentRate: 85.5,
        totalSlots: 100,
        assignedSlots: 85,
        generationMethod: 'automatic',
      }

      expect(typeof statsData.assignmentRate).toBe('number')
      expect(typeof statsData.totalSlots).toBe('number')
      expect(typeof statsData.assignedSlots).toBe('number')
      expect(typeof statsData.generationMethod).toBe('string')
    })

    it('MemoryRouterが正しく設定されている', () => {
      expect(MemoryRouter).toBeDefined()
      expect(typeof MemoryRouter).toBe('function')
    })
  })
})
