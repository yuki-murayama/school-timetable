import { Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { CustomLoginPage } from './components/CustomLoginPage'
import { CustomProtectedRoute } from './components/CustomProtectedRoute'
import { HomePage } from './pages/HomePage'

function App() {
  return (
    <div className='min-h-screen bg-background'>
      <Routes>
        <Route path='/' element={<HomePage />} />
        <Route path='/login' element={<CustomLoginPage />} />
        <Route
          path='/dashboard/*'
          element={
            <CustomProtectedRoute requiredRole='teacher'>
              <HomePage />
            </CustomProtectedRoute>
          }
        />
      </Routes>
      <Toaster />
    </div>
  )
}

export default App
