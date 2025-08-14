import { lazy, Suspense, useState } from 'react'
import { Sidebar } from './Sidebar'
// 直接インポートに変更してlazyローディング問題を回避
import { TimetableGenerate } from './TimetableGenerate'
import { DataManagementPage } from '../pages/DataManagementPage'
import { TimetableView } from './TimetableView'
import { TimetableDetailView } from './timetable/TimetableDetailView'

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
  const [timetableDetailId, setTimetableDetailId] = useState<string | null>(null)
  
  const handlePageChange = (page: string) => {
    setCurrentPage(page)
    // 詳細表示状態をリセット
    if (page !== 'view') {
      setTimetableDetailId(null)
    }
  }

  // 時間割詳細表示ハンドラ
  const handleViewTimetableDetail = (id: string) => {
    setTimetableDetailId(id)
  }

  // 詳細表示から一覧に戻るハンドラ
  const handleBackToList = () => {
    setTimetableDetailId(null)
  }

  const renderCurrentPage = () => {
    const LoadingSpinner = () => (
      <div className='flex items-center justify-center p-8'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900'></div>
        <span className='ml-2'>読み込み中...</span>
      </div>
    )

    switch (currentPage) {
      case 'generate':
        return <TimetableGenerate />
      case 'data':
        return <DataManagementPage />
      case 'view':
        // 詳細表示モードかどうかチェック
        if (timetableDetailId) {
          return (
            <TimetableDetailView 
              key={timetableDetailId} 
              timetableId={timetableDetailId}
              onBackToList={handleBackToList} 
            />
          )
        } else {
          return <TimetableView onViewDetail={handleViewTimetableDetail} />
        }
      default:
        return <TimetableGenerate />
    }
  }

  return (
    <div className='flex h-screen bg-gray-50'>
      <Sidebar currentPage={currentPage} onPageChange={handlePageChange} onLogout={onLogout} />
      <main className='flex-1 overflow-auto'>
        <div className='p-6'>{renderCurrentPage()}</div>
      </main>
    </div>
  )
}
