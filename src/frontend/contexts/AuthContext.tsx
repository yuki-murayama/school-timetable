import type React from 'react'
import { createContext, type ReactNode, useContext } from 'react'
import type { AuthUser } from '../hooks/use-auth'
import { useCustomAuth } from '../hooks/use-auth'

// 認証コンテキスト型定義
interface AuthContextType {
  // 状態
  user: AuthUser | null
  token: string | null
  sessionId: string | null
  isLoading: boolean
  error: string | null
  isAuthenticated: boolean

  // 関数
  login: (credentials: {
    email: string
    password: string
  }) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  verifyToken: () => Promise<boolean>
  getFreshToken: () => Promise<string | null>
  hasRole: (role: 'admin' | 'teacher' | 'user') => boolean
  isAdmin: () => boolean
  isTeacher: () => boolean

  // ユーティリティ
  getAuthHeaders: () => Record<string, string>
  getApiOptions: () => { token: string | null; getFreshToken: () => Promise<string | null>; onSessionExpired: () => void }
}

// 認証コンテキスト作成
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// プロバイダーコンポーネント
interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const auth = useCustomAuth()

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

// カスタムフック: 認証コンテキストの使用
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}

// 高階コンポーネント: 認証が必要なコンポーネントをラップ
interface WithAuthProps {
  requiredRole?: 'admin' | 'teacher' | 'user'
  fallback?: ReactNode
}

export function withAuth<T extends object>(
  Component: React.ComponentType<T>,
  options: WithAuthProps = {}
) {
  const { requiredRole, fallback } = options

  return function AuthenticatedComponent(props: T) {
    const { isAuthenticated, isLoading, hasRole } = useAuth()

    if (isLoading) {
      return (
        <div className='min-h-screen flex items-center justify-center'>
          <div className='text-center space-y-4'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto'></div>
            <p className='text-muted-foreground'>認証状態を確認中...</p>
          </div>
        </div>
      )
    }

    if (!isAuthenticated) {
      return (
        fallback || (
          <div className='min-h-screen flex items-center justify-center'>
            <div className='text-center space-y-4'>
              <p className='text-lg font-medium'>ログインが必要です</p>
              <p className='text-muted-foreground'>このページを表示するには認証が必要です</p>
            </div>
          </div>
        )
      )
    }

    if (requiredRole && !hasRole(requiredRole)) {
      return (
        fallback || (
          <div className='min-h-screen flex items-center justify-center'>
            <div className='text-center space-y-4'>
              <p className='text-lg font-medium'>アクセス権限がありません</p>
              <p className='text-muted-foreground'>このページを表示する権限がありません</p>
            </div>
          </div>
        )
      )
    }

    return <Component {...props} />
  }
}

// フック: 権限チェック
export function usePermissions() {
  const { hasRole, isAdmin, isTeacher, user } = useAuth()

  return {
    hasRole,
    isAdmin,
    isTeacher,
    canManageUsers: isAdmin(),
    canManageSchoolSettings: hasRole('admin'),
    canManageTeachers: hasRole('teacher'),
    canManageSubjects: hasRole('teacher'),
    canManageClassrooms: hasRole('teacher'),
    canGenerateTimetables: hasRole('teacher'),
    canViewTimetables: hasRole('user'),
    currentRole: user?.role,
  }
}
