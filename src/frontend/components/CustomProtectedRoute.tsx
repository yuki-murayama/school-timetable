import { ValidationError } from '@shared/schemas'
import { Navigate } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '../contexts/AuthContext'

// プロテクトルートプロップス検証スキーマ
const ProtectedRoutePropsSchema = z.object({
  children: z.any().refine(val => val !== null && val !== undefined, '子要素は必須です'),
  requiredRole: z.enum(['admin', 'teacher', 'user']).optional(),
  redirectTo: z.string().optional(),
})

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'teacher' | 'user'
  redirectTo?: string
}

export function CustomProtectedRoute({
  children,
  requiredRole,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  // Props validation
  try {
    ProtectedRoutePropsSchema.parse({ children, requiredRole, redirectTo })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('ProtectedRoute props validation failed:', error.errors)
      throw new ValidationError('プロテクトルートのプロパティ検証に失敗しました', error.errors)
    }
    throw error
  }

  const { isAuthenticated, isLoading, hasRole, user } = useAuth()

  console.log('🔍 ProtectedRoute状態:', { isLoading, isAuthenticated, user: user?.email })

  // ローディング中
  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center space-y-4'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto'></div>
          <p className='text-muted-foreground'>認証状態を確認中...</p>
        </div>
      </div>
    )
  }

  // 未認証の場合
  if (!isAuthenticated) {
    console.log('🔄 未認証のためログインページにリダイレクト')
    return <Navigate to={redirectTo} replace />
  }

  // 権限チェック
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center space-y-4 max-w-md'>
          <h2 className='text-xl font-semibold'>アクセス権限がありません</h2>
          <p className='text-muted-foreground'>
            このページを表示するには「{requiredRole}」権限が必要です。
          </p>
          <p className='text-sm text-muted-foreground'>現在のユーザー権限: {user?.role}</p>
          <div className='mt-6'>
            <Navigate to='/' replace />
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// 管理者専用ルート
export function AdminRoute({ children }: { children: React.ReactNode }) {
  return <CustomProtectedRoute requiredRole='admin'>{children}</CustomProtectedRoute>
}

// 教師以上のルート
export function TeacherRoute({ children }: { children: React.ReactNode }) {
  return <CustomProtectedRoute requiredRole='teacher'>{children}</CustomProtectedRoute>
}

// 一般認証ルート（役割不問）
export function AuthenticatedRoute({ children }: { children: React.ReactNode }) {
  return <CustomProtectedRoute requiredRole='user'>{children}</CustomProtectedRoute>
}
