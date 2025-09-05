import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { HomePage } from './HomePage'

// useCustomAuthフックをモック
vi.mock('../hooks/use-auth', () => ({
  useCustomAuth: vi.fn()
}))

// LoginPageコンポーネントをモック
vi.mock('../components/LoginPage', () => ({
  LoginPage: () => <div data-testid="login-page">Login Page</div>
}))

// MainAppコンポーネントをモック
vi.mock('../components/MainApp', () => ({
  MainApp: ({ onLogout }: { onLogout: () => void }) => (
    <div data-testid="main-app">
      Main App
      <button onClick={onLogout} data-testid="logout-button">
        Logout
      </button>
    </div>
  )
}))

import { useCustomAuth } from '../hooks/use-auth'

const mockUseCustomAuth = vi.mocked(useCustomAuth)

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ローディング状態', () => {
    it('HP-001: ローディング中にスピナーを表示する', () => {
      // Given: ローディング状態
      mockUseCustomAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        logout: vi.fn(),
        user: null,
        token: null,
        sessionId: null,
        error: null,
        login: vi.fn(),
        verifyToken: vi.fn(),
        getFreshToken: vi.fn(),
        hasRole: vi.fn(),
        isAdmin: vi.fn(),
        isTeacher: vi.fn(),
        getAuthHeaders: vi.fn()
      })

      // When: HomePage をレンダリング
      render(<HomePage />)

      // Then: ローディングスピナーが表示される
      const spinner = screen.getByRole('generic')
      expect(spinner).toBeInTheDocument()
      expect(spinner).toHaveClass('animate-spin', 'rounded-full', 'h-8', 'w-8', 'border-b-2', 'border-gray-900')

      // Then: 他のコンポーネントは表示されない
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument()
      expect(screen.queryByTestId('main-app')).not.toBeInTheDocument()
    })

    it('HP-002: ローディング画面の正しいスタイルクラスを確認', () => {
      // Given: ローディング状態
      mockUseCustomAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        logout: vi.fn(),
        user: null,
        token: null,
        sessionId: null,
        error: null,
        login: vi.fn(),
        verifyToken: vi.fn(),
        getFreshToken: vi.fn(),
        hasRole: vi.fn(),
        isAdmin: vi.fn(),
        isTeacher: vi.fn(),
        getAuthHeaders: vi.fn()
      })

      // When: HomePage をレンダリング
      const { container } = render(<HomePage />)

      // Then: 外側のコンテナが正しいクラスを持つ
      const outerContainer = container.firstChild as HTMLElement
      expect(outerContainer).toHaveClass('flex', 'items-center', 'justify-center', 'min-h-screen')
    })
  })

  describe('未認証状態', () => {
    it('HP-003: 未認証時にLoginPageを表示する', () => {
      // Given: 未認証状態
      mockUseCustomAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        logout: vi.fn(),
        user: null,
        token: null,
        sessionId: null,
        error: null,
        login: vi.fn(),
        verifyToken: vi.fn(),
        getFreshToken: vi.fn(),
        hasRole: vi.fn(),
        isAdmin: vi.fn(),
        isTeacher: vi.fn(),
        getAuthHeaders: vi.fn()
      })

      // When: HomePage をレンダリング
      render(<HomePage />)

      // Then: LoginPageが表示される
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
      expect(screen.getByText('Login Page')).toBeInTheDocument()

      // Then: MainAppは表示されない
      expect(screen.queryByTestId('main-app')).not.toBeInTheDocument()
    })
  })

  describe('認証済み状態', () => {
    it('HP-004: 認証済み時にMainAppを表示する', () => {
      // Given: 認証済み状態
      const mockLogout = vi.fn()
      mockUseCustomAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        logout: mockLogout,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'admin'
        },
        token: 'test-token',
        sessionId: 'session-123',
        error: null,
        login: vi.fn(),
        verifyToken: vi.fn(),
        getFreshToken: vi.fn(),
        hasRole: vi.fn(),
        isAdmin: vi.fn(),
        isTeacher: vi.fn(),
        getAuthHeaders: vi.fn()
      })

      // When: HomePage をレンダリング
      render(<HomePage />)

      // Then: MainAppが表示される
      expect(screen.getByTestId('main-app')).toBeInTheDocument()
      expect(screen.getByText('Main App')).toBeInTheDocument()

      // Then: LoginPageは表示されない
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument()
    })

    it('HP-005: MainAppにlogout関数が正しく渡される', () => {
      // Given: 認証済み状態
      const mockLogout = vi.fn()
      mockUseCustomAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        logout: mockLogout,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'admin'
        },
        token: 'test-token',
        sessionId: 'session-123',
        error: null,
        login: vi.fn(),
        verifyToken: vi.fn(),
        getFreshToken: vi.fn(),
        hasRole: vi.fn(),
        isAdmin: vi.fn(),
        isTeacher: vi.fn(),
        getAuthHeaders: vi.fn()
      })

      // When: HomePage をレンダリングしてログアウトボタンをクリック
      render(<HomePage />)
      const logoutButton = screen.getByTestId('logout-button')
      logoutButton.click()

      // Then: logout関数が呼び出される
      expect(mockLogout).toHaveBeenCalledOnce()
    })
  })

  describe('エラーハンドリング', () => {
    it('HP-006: エラー状態でも適切にレンダリングされる', () => {
      // Given: エラーがある未認証状態
      mockUseCustomAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        logout: vi.fn(),
        user: null,
        token: null,
        sessionId: null,
        error: 'Authentication failed',
        login: vi.fn(),
        verifyToken: vi.fn(),
        getFreshToken: vi.fn(),
        hasRole: vi.fn(),
        isAdmin: vi.fn(),
        isTeacher: vi.fn(),
        getAuthHeaders: vi.fn()
      })

      // When: HomePage をレンダリング
      render(<HomePage />)

      // Then: エラーがあってもLoginPageが表示される
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
      expect(screen.queryByTestId('main-app')).not.toBeInTheDocument()
    })
  })

  describe('状態遷移', () => {
    it('HP-007: 認証状態の変化に応じてコンポーネントが切り替わる', () => {
      // Given: 初期状態は未認証
      const mockLogout = vi.fn()
      const { rerender } = render(<HomePage />)

      // 初期状態: 未認証
      mockUseCustomAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        logout: mockLogout,
        user: null,
        token: null,
        sessionId: null,
        error: null,
        login: vi.fn(),
        verifyToken: vi.fn(),
        getFreshToken: vi.fn(),
        hasRole: vi.fn(),
        isAdmin: vi.fn(),
        isTeacher: vi.fn(),
        getAuthHeaders: vi.fn()
      })
      rerender(<HomePage />)
      expect(screen.getByTestId('login-page')).toBeInTheDocument()

      // When: 認証済み状態に変更
      mockUseCustomAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        logout: mockLogout,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'admin'
        },
        token: 'test-token',
        sessionId: 'session-123',
        error: null,
        login: vi.fn(),
        verifyToken: vi.fn(),
        getFreshToken: vi.fn(),
        hasRole: vi.fn(),
        isAdmin: vi.fn(),
        isTeacher: vi.fn(),
        getAuthHeaders: vi.fn()
      })
      rerender(<HomePage />)

      // Then: MainAppが表示される
      expect(screen.getByTestId('main-app')).toBeInTheDocument()
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument()
    })
  })
})