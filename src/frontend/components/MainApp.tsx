import { lazy, Suspense, useState } from 'react'
import { Sidebar } from './Sidebar'
// 直接インポートに変更してlazyローディング問題を回避
import { TimetableGenerate } from './TimetableGenerate'
import { DataManagementPage } from '../pages/DataManagementPage'
import { TimetableView } from './TimetableView'

// Lazy load heavy components for code splitting (commented out for debugging)
// const TimetableGenerate = lazy(() =>
//   import('./TimetableGenerate').then(module => ({ default: module.TimetableGenerate }))
// )
// const DataManagementPage = lazy(() =>
//   import('../pages/DataManagementPage').then(module => ({ default: module.DataManagementPage }))
// )
// const TimetableView = lazy(() =>
//   import('./TimetableView').then(module => ({ default: module.TimetableView }))
// )

interface MainAppProps {
  onLogout: () => void
}

export function MainApp({ onLogout }: MainAppProps) {
  const [currentPage, setCurrentPage] = useState('generate')
  
  // デバッグ用: ページ変更をログ出力
  const handlePageChange = (page: string) => {
    console.log(`🔄 Page change requested: ${currentPage} -> ${page}`)
    setCurrentPage(page)
  }

  const renderCurrentPage = () => {
    const LoadingSpinner = () => (
      <div className='flex items-center justify-center p-8'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900'></div>
        <span className='ml-2'>読み込み中...</span>
      </div>
    )

    console.log(`🎯 Rendering page: ${currentPage}`)
    
    // 直接レンダリング (Suspenseなし)
    switch (currentPage) {
      case 'generate':
        console.log('📊 Rendering TimetableGenerate')
        return <TimetableGenerate />
      case 'data':
        console.log('📋 Rendering DataManagementPage')
        return <DataManagementPage />
      case 'view':
        console.log('👁️ Rendering TimetableView')
        return <TimetableView />
      default:
        console.log('🔄 Rendering default (TimetableGenerate)')
        return <TimetableGenerate />
    }
  }

  return (
    <div className='flex h-screen bg-gray-50'>
      <Sidebar currentPage={currentPage} onPageChange={handlePageChange} onLogout={onLogout} />
      <main className='flex-1 overflow-auto'>
        {/* デバッグ用の状態表示 */}
        <div className='bg-yellow-100 p-2 text-sm font-mono'>
          Debug: currentPage = "{currentPage}"
        </div>
        <div className='p-6'>{renderCurrentPage()}</div>
      </main>
    </div>
  )
}
