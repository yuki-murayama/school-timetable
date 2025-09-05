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
})
