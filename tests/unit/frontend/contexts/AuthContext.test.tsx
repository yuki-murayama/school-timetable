import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import React from 'react'
import { AuthProvider, useAuth, withAuth, usePermissions } from './AuthContext'

// useCustomAuthフックをモック
vi.mock('../hooks/use-auth', () => ({
  useCustomAuth: vi.fn()
}))

import { useCustomAuth } from '../hooks/use-auth'

const mockUseCustomAuth = vi.mocked(useCustomAuth)

// テスト用コンポーネント
function TestComponent() {
  return <div data-testid="test-component">Test Component</div>
}

function AuthContextConsumer() {
  const auth = useAuth()
  return (
    <div data-testid="auth-consumer">
      <div data-testid="is-authenticated">{auth.isAuthenticated.toString()}</div>
      <div data-testid="is-loading">{auth.isLoading.toString()}</div>
      <div data-testid="user-email">{auth.user?.email || 'No user'}</div>
    </div>
  )
}

function PermissionsConsumer() {
  const permissions = usePermissions()
  return (
    <div data-testid="permissions-consumer">
      <div data-testid="is-admin">{permissions.isAdmin.toString()}</div>
      <div data-testid="can-manage-users">{permissions.canManageUsers.toString()}</div>
      <div data-testid="can-manage-school">{permissions.canManageSchoolSettings.toString()}</div>
      <div data-testid="can-manage-teachers">{permissions.canManageTeachers.toString()}</div>
      <div data-testid="current-role">{permissions.currentRole || 'No role'}</div>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('AuthProvider', () => {
    it('AC-001: AuthProviderが子コンポーネントを正しくレンダリングする', () => {
      // Given: 基本的な認証状態
      mockUseCustomAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        logout: vi.fn(),
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
        hasRole: vi.fn().mockReturnValue(true),
        isAdmin: vi.fn().mockReturnValue(true),
        isTeacher: vi.fn().mockReturnValue(false),
        getAuthHeaders: vi.fn().mockReturnValue({})
      })

      // When: AuthProviderで子コンポーネントをラップ
      render(
        <AuthProvider>
          <AuthContextConsumer />
        </AuthProvider>
      )

      // Then: 子コンポーネントが正しくレンダリングされ、認証情報が提供される
      expect(screen.getByTestId('auth-consumer')).toBeInTheDocument()
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true')
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
    })
  })

  describe('useAuth', () => {
    it('AC-002: useAuthが正しい認証情報を返す', () => {
      // Given: 認証済み状態
      const mockAuth = {
        isAuthenticated: true,
        isLoading: false,
        logout: vi.fn(),
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'teacher' as const
        },
        token: 'test-token',
        sessionId: 'session-123',
        error: null,
        login: vi.fn(),
        verifyToken: vi.fn(),
        getFreshToken: vi.fn(),
        hasRole: vi.fn().mockReturnValue(true),
        isAdmin: vi.fn().mockReturnValue(false),
        isTeacher: vi.fn().mockReturnValue(true),
        getAuthHeaders: vi.fn().mockReturnValue({ Authorization: 'Bearer test-token' })
      }
      mockUseCustomAuth.mockReturnValue(mockAuth)

      // When: useAuthを使用
      render(
        <AuthProvider>
          <AuthContextConsumer />
        </AuthProvider>
      )

      // Then: 正しい認証情報が返される
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true')
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
    })

    it('AC-003: AuthProvider外でuseAuthを使用するとエラーが発生する', () => {
      // Given: AuthProvider外のコンポーネント
      const TestComponentOutsideProvider = () => {
        expect(() => useAuth()).toThrow('useAuth must be used within an AuthProvider')
        return <div>Test</div>
      }

      // When: AuthProvider外でuseAuthを使用
      // Then: エラーが発生する
      expect(() => render(<TestComponentOutsideProvider />)).toThrow()
    })
  })

  describe('withAuth HOC', () => {
    const WrappedComponent = withAuth(TestComponent)

    it('AC-004: 認証済みユーザーに対してコンポーネントを表示する', () => {
      // Given: 認証済み状態
      mockUseCustomAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        logout: vi.fn(),
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
        hasRole: vi.fn().mockReturnValue(true),
        isAdmin: vi.fn().mockReturnValue(true),
        isTeacher: vi.fn().mockReturnValue(false),
        getAuthHeaders: vi.fn()
      })

      // When: withAuthでラップされたコンポーネントをレンダリング
      render(
        <AuthProvider>
          <WrappedComponent />
        </AuthProvider>
      )

      // Then: コンポーネントが表示される
      expect(screen.getByTestId('test-component')).toBeInTheDocument()
    })

    it('AC-005: ローディング中にスピナーを表示する', () => {
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

      // When: withAuthでラップされたコンポーネントをレンダリング
      render(
        <AuthProvider>
          <WrappedComponent />
        </AuthProvider>
      )

      // Then: ローディングメッセージとスピナーが表示される
      expect(screen.getByText('認証状態を確認中...')).toBeInTheDocument()
      expect(screen.getByRole('generic')).toHaveClass('animate-spin')
    })

    it('AC-006: 未認証ユーザーにメッセージを表示する', () => {
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

      // When: withAuthでラップされたコンポーネントをレンダリング
      render(
        <AuthProvider>
          <WrappedComponent />
        </AuthProvider>
      )

      // Then: 未認証メッセージが表示される
      expect(screen.getByText('ログインが必要です')).toBeInTheDocument()
      expect(screen.getByText('このページを表示するには認証が必要です')).toBeInTheDocument()
      expect(screen.queryByTestId('test-component')).not.toBeInTheDocument()
    })

    it('AC-007: 権限不足ユーザーにメッセージを表示する', () => {
      // Given: 認証済みだが権限不足
      mockUseCustomAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        logout: vi.fn(),
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user'
        },
        token: 'test-token',
        sessionId: 'session-123',
        error: null,
        login: vi.fn(),
        verifyToken: vi.fn(),
        getFreshToken: vi.fn(),
        hasRole: vi.fn().mockReturnValue(false), // admin権限なし
        isAdmin: vi.fn().mockReturnValue(false),
        isTeacher: vi.fn().mockReturnValue(false),
        getAuthHeaders: vi.fn()
      })

      const AdminOnlyComponent = withAuth(TestComponent, { requiredRole: 'admin' })

      // When: admin権限が必要なコンポーネントをレンダリング
      render(
        <AuthProvider>
          <AdminOnlyComponent />
        </AuthProvider>
      )

      // Then: 権限不足メッセージが表示される
      expect(screen.getByText('アクセス権限がありません')).toBeInTheDocument()
      expect(screen.getByText('このページを表示する権限がありません')).toBeInTheDocument()
      expect(screen.queryByTestId('test-component')).not.toBeInTheDocument()
    })

    it('AC-008: カスタムfallbackコンポーネントを表示する', () => {
      // Given: 未認証状態とカスタムfallback
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

      const CustomFallback = <div data-testid="custom-fallback">Custom Fallback</div>
      const ComponentWithFallback = withAuth(TestComponent, { fallback: CustomFallback })

      // When: fallback付きコンポーネントをレンダリング
      render(
        <AuthProvider>
          <ComponentWithFallback />
        </AuthProvider>
      )

      // Then: カスタムfallbackが表示される
      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
      expect(screen.queryByText('ログインが必要です')).not.toBeInTheDocument()
    })
  })

  describe('usePermissions', () => {
    it('AC-009: admin権限でusePermissionsが正しい値を返す', () => {
      // Given: admin権限のユーザー
      mockUseCustomAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        logout: vi.fn(),
        user: {
          id: 'user-123',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin'
        },
        token: 'test-token',
        sessionId: 'session-123',
        error: null,
        login: vi.fn(),
        verifyToken: vi.fn(),
        getFreshToken: vi.fn(),
        hasRole: vi.fn().mockImplementation((role) => role === 'admin'),
        isAdmin: vi.fn().mockReturnValue(true),
        isTeacher: vi.fn().mockReturnValue(false),
        getAuthHeaders: vi.fn()
      })

      // When: usePermissionsを使用
      render(
        <AuthProvider>
          <PermissionsConsumer />
        </AuthProvider>
      )

      // Then: admin権限が正しく反映される
      expect(screen.getByTestId('is-admin')).toHaveTextContent('true')
      expect(screen.getByTestId('can-manage-users')).toHaveTextContent('true')
      expect(screen.getByTestId('can-manage-school')).toHaveTextContent('true')
      expect(screen.getByTestId('current-role')).toHaveTextContent('admin')
    })

    it('AC-010: teacher権限でusePermissionsが正しい値を返す', () => {
      // Given: teacher権限のユーザー
      mockUseCustomAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        logout: vi.fn(),
        user: {
          id: 'user-123',
          email: 'teacher@example.com',
          name: 'Teacher User',
          role: 'teacher'
        },
        token: 'test-token',
        sessionId: 'session-123',
        error: null,
        login: vi.fn(),
        verifyToken: vi.fn(),
        getFreshToken: vi.fn(),
        hasRole: vi.fn().mockImplementation((role) => role === 'teacher' || role === 'user'),
        isAdmin: vi.fn().mockReturnValue(false),
        isTeacher: vi.fn().mockReturnValue(true),
        getAuthHeaders: vi.fn()
      })

      // When: usePermissionsを使用
      render(
        <AuthProvider>
          <PermissionsConsumer />
        </AuthProvider>
      )

      // Then: teacher権限が正しく反映される
      expect(screen.getByTestId('is-admin')).toHaveTextContent('false')
      expect(screen.getByTestId('can-manage-users')).toHaveTextContent('false')
      expect(screen.getByTestId('can-manage-school')).toHaveTextContent('false')
      expect(screen.getByTestId('can-manage-teachers')).toHaveTextContent('true')
      expect(screen.getByTestId('current-role')).toHaveTextContent('teacher')
    })

    it('AC-011: user権限でusePermissionsが正しい値を返す', () => {
      // Given: user権限のユーザー
      mockUseCustomAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        logout: vi.fn(),
        user: {
          id: 'user-123',
          email: 'user@example.com',
          name: 'Regular User',
          role: 'user'
        },
        token: 'test-token',
        sessionId: 'session-123',
        error: null,
        login: vi.fn(),
        verifyToken: vi.fn(),
        getFreshToken: vi.fn(),
        hasRole: vi.fn().mockImplementation((role) => role === 'user'),
        isAdmin: vi.fn().mockReturnValue(false),
        isTeacher: vi.fn().mockReturnValue(false),
        getAuthHeaders: vi.fn()
      })

      // When: usePermissionsを使用
      render(
        <AuthProvider>
          <PermissionsConsumer />
        </AuthProvider>
      )

      // Then: user権限が正しく反映される
      expect(screen.getByTestId('is-admin')).toHaveTextContent('false')
      expect(screen.getByTestId('can-manage-users')).toHaveTextContent('false')
      expect(screen.getByTestId('can-manage-school')).toHaveTextContent('false')
      expect(screen.getByTestId('can-manage-teachers')).toHaveTextContent('false')
      expect(screen.getByTestId('current-role')).toHaveTextContent('user')
    })
  })
})