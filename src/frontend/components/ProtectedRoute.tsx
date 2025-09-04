import { ValidationError } from '@shared/schemas'
import { Navigate } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '../hooks/use-auth'

// プロテクトルートプロップス検証スキーマ
const ProtectedRoutePropsSchema = z.object({
  children: z.any().refine(val => val !== null && val !== undefined, '子要素は必須です'),
})

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  // Props validation
  try {
    ProtectedRoutePropsSchema.parse({ children })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('ProtectedRoute props validation failed:', error.errors)
      throw new ValidationError('プロテクトルートのプロパティ検証に失敗しました', error.errors)
    }
    throw error
  }

  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900'></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to='/login' replace />
  }

  return <>{children}</>
}
