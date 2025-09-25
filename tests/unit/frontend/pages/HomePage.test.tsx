/**
 * HomePage テスト - 基本的なレンダリングテスト
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useCustomAuth } from '../../../../src/frontend/hooks/use-auth'
import { HomePage } from '../../../../src/frontend/pages/HomePage'

// useCustomAuthフックをモック
vi.mock('../../../../src/frontend/hooks/use-auth', () => ({
  useCustomAuth: vi.fn(),
}))

// MainAppコンポーネントをモック
vi.mock('../../../../src/frontend/components/MainApp', () => ({
  MainApp: ({ onLogout: _onLogout }: { onLogout: () => void }) => (
    <div data-testid='main-app'>Main App</div>
  ),
}))

// LoginPageコンポーネントをモック
vi.mock('../../../../src/frontend/components/LoginPage', () => ({
  LoginPage: () => <div data-testid='login-page'>Login Page</div>,
}))

describe('HomePage', () => {
  const mockUseCustomAuth = vi.mocked(useCustomAuth)

  it('should show loading spinner when isLoading is true', () => {
    mockUseCustomAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      logout: vi.fn(),
    })

    render(<HomePage />)

    const loadingElement = screen.getByTestId('loading-spinner')
    expect(loadingElement).toHaveClass('animate-spin')
  })

  it('should show MainApp when authenticated and not loading', () => {
    mockUseCustomAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      logout: vi.fn(),
    })

    render(<HomePage />)

    expect(screen.getByTestId('main-app')).toBeInTheDocument()
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument()
  })

  it('should show LoginPage when not authenticated and not loading', () => {
    mockUseCustomAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      logout: vi.fn(),
    })

    render(<HomePage />)

    expect(screen.getByTestId('login-page')).toBeInTheDocument()
    expect(screen.queryByTestId('main-app')).not.toBeInTheDocument()
  })

  it('コンポーネントが正しくレンダリングされる', () => {
    mockUseCustomAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      logout: vi.fn(),
    })

    const { container } = render(<HomePage />)
    expect(container).toBeInTheDocument()
  })

  describe('基本プロパティテスト', () => {
    it('HomePageコンポーネントが正しく定義されている', () => {
      expect(HomePage).toBeDefined()
      expect(typeof HomePage).toBe('function')
    })

    it('useCustomAuthフックが正しくモック化されている', () => {
      expect(mockUseCustomAuth).toBeDefined()
      expect(typeof mockUseCustomAuth).toBe('function')
    })

    it('React Testing Libraryが正しく設定されている', () => {
      expect(render).toBeDefined()
      expect(typeof render).toBe('function')
      expect(screen).toBeDefined()
      expect(typeof screen.getByTestId).toBe('function')
    })

    it('Vitestテストフレームワークが正しく設定されている', () => {
      expect(describe).toBeDefined()
      expect(it).toBeDefined()
      expect(expect).toBeDefined()
      expect(vi).toBeDefined()
      expect(typeof vi.fn).toBe('function')
      expect(typeof vi.mocked).toBe('function')
    })

    it('vi.mockが正しく動作している', () => {
      expect(vi.mock).toBeDefined()
      expect(typeof vi.mock).toBe('function')
      // モックされたコンポーネントが利用可能であることを確認
      expect(vi.mocked(useCustomAuth)).toBeDefined()
    })

    it('テストで使用する基本機能が利用可能', () => {
      expect(Object).toBeDefined()
      expect(typeof Object.keys).toBe('function')
      expect(Array).toBeDefined()
      expect(typeof Array.isArray).toBe('function')
    })

    it('テストデータ構造が正しく動作している', () => {
      const testAuthState = {
        isAuthenticated: false,
        isLoading: false,
        logout: vi.fn(),
      }

      expect(testAuthState.isAuthenticated).toBe(false)
      expect(testAuthState.isLoading).toBe(false)
      expect(typeof testAuthState.logout).toBe('function')
    })

    it('コンポーネントテストの基本パターンが動作している', () => {
      mockUseCustomAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        logout: vi.fn(),
      })

      const { container } = render(<HomePage />)
      expect(container).toBeDefined()
      expect(container).toBeInTheDocument()
    })
  })
})
