import { LoginPage } from '../components/LoginPage'
import { MainApp } from '../components/MainApp'
import { useAuth } from '../hooks/use-auth'

export function HomePage() {
  const { isAuthenticated, isLoading, logout } = useAuth()

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900'></div>
      </div>
    )
  }

  return <>{isAuthenticated ? <MainApp onLogout={logout} /> : <LoginPage />}</>
}
