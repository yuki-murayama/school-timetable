import { LoginPage } from '../components/LoginPage'
import { MainApp } from '../components/MainApp'
import { useCustomAuth } from '../hooks/use-auth'

export function HomePage() {
  const { isAuthenticated, isLoading, logout } = useCustomAuth()

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div
          data-testid='loading-spinner'
          className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900'
        ></div>
      </div>
    )
  }

  return <>{isAuthenticated ? <MainApp onLogout={logout} /> : <LoginPage />}</>
}
