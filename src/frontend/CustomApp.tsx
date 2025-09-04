import { Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { CustomLoginPage } from './components/CustomLoginPage'
import { CustomProtectedRoute, TeacherRoute } from './components/CustomProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import { HomePage } from './pages/HomePage'

function CustomApp() {
  return (
    <AuthProvider>
      <div className='min-h-screen bg-background'>
        <Routes>
          {/* 公開ルート */}
          <Route path='/login' element={<CustomLoginPage />} />

          {/* 認証が必要なルート */}
          <Route
            path='/'
            element={
              <CustomProtectedRoute requiredRole='user'>
                <HomePage />
              </CustomProtectedRoute>
            }
          />

          {/* 教師以上の権限が必要なルート */}
          <Route
            path='/dashboard/*'
            element={
              <TeacherRoute>
                <HomePage />
              </TeacherRoute>
            }
          />

          {/* データ管理ページ（教師以上） */}
          <Route
            path='/data-management/*'
            element={
              <TeacherRoute>
                <HomePage />
              </TeacherRoute>
            }
          />

          {/* 時間割生成ページ（教師以上） */}
          <Route
            path='/timetable/*'
            element={
              <TeacherRoute>
                <HomePage />
              </TeacherRoute>
            }
          />

          {/* デフォルトリダイレクト */}
          <Route path='*' element={<CustomLoginPage />} />
        </Routes>

        <Toaster />
      </div>
    </AuthProvider>
  )
}

export default CustomApp
