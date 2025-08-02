import { Routes, Route } from 'react-router-dom'
import { SignIn, SignUp } from '@clerk/clerk-react'
import { Toaster } from 'sonner'
import { HomePage } from './pages/HomePage'
import { ProtectedRoute } from './components/ProtectedRoute'

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route 
          path="/sign-in/*" 
          element={
            <div className="flex items-center justify-center min-h-screen">
              <SignIn 
                path="/sign-in"
                signUpUrl="/sign-up"
                redirectUrl="/"
              />
            </div>
          } 
        />
        <Route 
          path="/sign-up/*" 
          element={
            <div className="flex items-center justify-center min-h-screen">
              <SignUp 
                path="/sign-up"
                signInUrl="/sign-in"
                redirectUrl="/"
              />
            </div>
          } 
        />
        <Route 
          path="/dashboard/*" 
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          } 
        />
      </Routes>
      <Toaster />
    </div>
  )
}

export default App
