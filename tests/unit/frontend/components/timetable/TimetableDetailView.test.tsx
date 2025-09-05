import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { TimetableDetailView } from './TimetableDetailView'

// 依存関係をモック
vi.mock('../../hooks/use-auth', () => ({
  useAuth: vi.fn()
}))

vi.mock('../../hooks/use-toast', () => ({
  useToast: vi.fn()
}))

vi.mock('./TimetableGrid', () => ({
  TimetableGrid: ({ 
    data, 
    selectedClassLabel, 
    onSlotChange 
  }: { 
    data: unknown[], 
    selectedClassLabel: string, 
    onSlotChange?: (slot: unknown) => void 
  }) => (
    <div data-testid="timetable-grid">
      <div data-testid="selected-class">{selectedClassLabel}</div>
      <div data-testid="data-length">{data.length}</div>
      {onSlotChange && (
        <button 
          data-testid="change-slot-button" 
          onClick={() => onSlotChange({ subject: 'テスト教科', teacher: 'テスト教師' })}
        >
          Change Slot
        </button>
      )}
    </div>
  )
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: vi.fn(),
    useNavigate: vi.fn()
  }
})

import { useAuth } from '../../hooks/use-auth'
import { useToast } from '../../hooks/use-toast'
import { useParams, useNavigate } from 'react-router-dom'

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
      [ // 1年生
        [ // 1-1クラス
          {
            subject: '数学',
            teacher: '田中先生',
            period: '1',
            day: 'monday',
            classGrade: 1,
            classSection: 1
          },
          {
            subject: '国語',
            teacher: '佐藤先生',
            period: '2',
            day: 'monday',
            classGrade: 1,
            classSection: 1
          }
        ],
        [ // 1-2クラス
          {
            subject: '理科',
            teacher: '山田先生',
            period: '1',
            day: 'monday',
            classGrade: 1,
            classSection: 2
          }
        ]
      ]
    ],
    assignmentRate: 85.5,
    totalSlots: 100,
    assignedSlots: 85,
    generationMethod: 'automatic',
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-15T15:00:00Z'
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
      getAuthHeaders: vi.fn()
    })

    mockUseToast.mockReturnValue({
      toast: mockToast
    })

    mockUseParams.mockReturnValue({ id: 'test-id' })
    mockUseNavigate.mockReturnValue(mockNavigate)

    // 成功レスポンスをデフォルトに設定
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockTimetableData })
    })
  })

  describe('コンポーネント初期化', () => {
    it('TDV-001: 基本的な初期化が正常に行われる', () => {
      // When: TimetableDetailViewをレンダリング
      render(
        <MemoryRouter>
          <TimetableDetailView timetableId="test-id" />
        </MemoryRouter>
      )

      // Then: ローディング状態が表示される
      expect(screen.getByRole('generic')).toBeInTheDocument() // loader
    })

    it('TDV-002: propsのtimetableIdが優先される', () => {
      // Given: propsとURLパラメータの両方が設定
      mockUseParams.mockReturnValue({ id: 'url-param-id' })

      // When: propsでtimetableIdを渡してレンダリング
      render(
        <MemoryRouter>
          <TimetableDetailView timetableId="props-id" />
        </MemoryRouter>
      )

      // Then: propsのIDが優先される（fetch URLで確認）
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/frontend/school/timetables/props-id',
        expect.any(Object)
      )
    })

    it('TDV-003: URLパラメータのIDが使用される', () => {
      // Given: propsにtimetableIdがない場合
      mockUseParams.mockReturnValue({ id: 'url-param-id' })

      // When: propsなしでレンダリング
      render(
        <MemoryRouter>
          <TimetableDetailView />
        </MemoryRouter>
      )

      // Then: URLパラメータのIDが使用される
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/frontend/school/timetables/url-param-id',
        expect.any(Object)
      )
    })
  })

  describe('データ取得', () => {
    it('TDV-004: 時間割データの正常取得', async () => {
      // Given: 正常なAPIレスポンス
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockTimetableData })
      })

      // When: コンポーネントをレンダリング
      render(
        <MemoryRouter>
          <TimetableDetailView timetableId="test-id" />
        </MemoryRouter>
      )

      // Then: データが正しく取得される
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/frontend/school/timetables/test-id',
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              'Content-Type': 'application/json'
            })
          })
        )
      })
    })

    it('TDV-005: データ取得エラーの処理', async () => {
      // Given: APIエラーレスポンス
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ success: false, error: 'Not found' })
      })

      // When: コンポーネントをレンダリング
      render(
        <MemoryRouter>
          <TimetableDetailView timetableId="invalid-id" />
        </MemoryRouter>
      )

      // Then: エラートーストが表示される
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: '時間割の読み込みに失敗しました',
          description: 'サーバーからデータを取得できませんでした',
          variant: 'destructive'
        })
      })
    })

    it('TDV-006: ネットワークエラーの処理', async () => {
      // Given: ネットワークエラー
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      // When: コンポーネントをレンダリング
      render(
        <MemoryRouter>
          <TimetableDetailView timetableId="test-id" />
        </MemoryRouter>
      )

      // Then: エラートーストが表示される
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: '時間割の読み込みに失敗しました',
          description: 'ネットワークエラーが発生しました',
          variant: 'destructive'
        })
      })
    })
  })

  describe('クラス選択機能', () => {
    it('TDV-007: 利用可能クラスの正しい生成', async () => {
      // Given: 時間割データが取得済み
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockTimetableData })
      })

      render(
        <MemoryRouter>
          <TimetableDetailView timetableId="test-id" />
        </MemoryRouter>
      )

      // Then: 利用可能クラスが正しく生成される
      await waitFor(() => {
        // クラス選択ドロップダウンの存在を確認
        const dropdown = screen.getByRole('combobox')
        expect(dropdown).toBeInTheDocument()
      })
    })

    it('TDV-008: デフォルトクラスの選択', async () => {
      // Given: 時間割データが取得済み
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockTimetableData })
      })

      render(
        <MemoryRouter>
          <TimetableDetailView timetableId="test-id" />
        </MemoryRouter>
      )

      // Then: 最初のクラスが選択される
      await waitFor(() => {
        expect(screen.getByTestId('selected-class')).toHaveTextContent('1-1')
      })
    })

    it('TDV-009: 空データの場合のデフォルトクラス', async () => {
      // Given: 空の時間割データ
      const emptyTimetableData = {
        ...mockTimetableData,
        timetable: []
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: emptyTimetableData })
      })

      render(
        <MemoryRouter>
          <TimetableDetailView timetableId="test-id" />
        </MemoryRouter>
      )

      // Then: デフォルトクラスが使用される
      await waitFor(() => {
        expect(screen.getByTestId('selected-class')).toHaveTextContent('1-1')
      })
    })
  })

  describe('表示モード切り替え', () => {
    it('TDV-010: 詳細表示から編集モードへの切り替え', async () => {
      // Given: データが読み込まれた状態
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockTimetableData })
      })

      render(
        <MemoryRouter>
          <TimetableDetailView timetableId="test-id" />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('timetable-grid')).toBeInTheDocument()
      })

      // When: 編集ボタンをクリック
      const editButton = screen.getByRole('button', { name: /編集/i })
      fireEvent.click(editButton)

      // Then: 編集モードに切り替わる
      expect(screen.getByRole('button', { name: /保存/i })).toBeInTheDocument()
    })

    it('TDV-011: 編集モードから詳細表示への切り替え', async () => {
      // Given: 編集モードの状態
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockTimetableData })
      })

      render(
        <MemoryRouter>
          <TimetableDetailView timetableId="test-id" />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('timetable-grid')).toBeInTheDocument()
      })

      // 編集モードに切り替え
      const editButton = screen.getByRole('button', { name: /編集/i })
      fireEvent.click(editButton)

      // When: キャンセルボタンをクリック
      const cancelButton = screen.getByRole('button', { name: /キャンセル/i })
      fireEvent.click(cancelButton)

      // Then: 詳細表示モードに戻る
      expect(screen.getByRole('button', { name: /編集/i })).toBeInTheDocument()
    })
  })

  describe('戻るボタン機能', () => {
    it('TDV-012: onBackToListコールバックが呼び出される', async () => {
      // Given: onBackToListコールバック
      const mockOnBackToList = vi.fn()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockTimetableData })
      })

      render(
        <MemoryRouter>
          <TimetableDetailView timetableId="test-id" onBackToList={mockOnBackToList} />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('timetable-grid')).toBeInTheDocument()
      })

      // When: 戻るボタンをクリック
      const backButton = screen.getByRole('button', { name: /戻る/i })
      fireEvent.click(backButton)

      // Then: コールバックが呼び出される
      expect(mockOnBackToList).toHaveBeenCalledOnce()
    })

    it('TDV-013: onBackToListがない場合はnavigateが呼び出される', async () => {
      // Given: onBackToListなし
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockTimetableData })
      })

      render(
        <MemoryRouter>
          <TimetableDetailView timetableId="test-id" />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('timetable-grid')).toBeInTheDocument()
      })

      // When: 戻るボタンをクリック
      const backButton = screen.getByRole('button', { name: /戻る/i })
      fireEvent.click(backButton)

      // Then: navigateが呼び出される
      expect(mockNavigate).toHaveBeenCalledWith(-1)
    })
  })
})