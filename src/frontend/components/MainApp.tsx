import { ValidationError } from '@shared/schemas'
import { useState } from 'react'
import { z } from 'zod'
import { DataManagementPage } from '../pages/DataManagementPage'
import { Sidebar } from './Sidebar'
// 直接インポートに変更してlazyローディング問題を回避
import { TimetableGenerate } from './TimetableGenerate'
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

// MainAppプロパティ検証スキーマ
const MainAppPropsSchema = z.object({
  onLogout: z.function(z.tuple([]), z.void()),
})

interface MainAppProps {
  onLogout: () => void
}

// ページ状態検証スキーマ
const PageStateSchema = z.union([z.literal('generate'), z.literal('data'), z.literal('view')])

type PageState = z.infer<typeof PageStateSchema>

// 時間割詳細ID検証スキーマ
const TimetableDetailIdSchema = z.string().min(1, '時間割IDは必須です').nullable()

export function MainApp({ onLogout }: MainAppProps) {
  // Props validation
  try {
    MainAppPropsSchema.parse({ onLogout })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('MainApp props validation failed:', error.errors)
      throw new ValidationError('MainAppのプロパティ検証に失敗しました', error.errors)
    }
    throw error
  }

  // 型安全なstate管理
  const [currentPage, setCurrentPage] = useState<PageState>('generate')
  const [timetableDetailId, setTimetableDetailId] = useState<string | null>(null)

  const handlePageChange = (page: string) => {
    try {
      const validatedPage = PageStateSchema.parse(page)
      setCurrentPage(validatedPage)
      // 詳細表示状態をリセット
      if (validatedPage !== 'view') {
        setTimetableDetailId(null)
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Page change validation failed:', error.errors)
        // フォールバック処理 - デフォルトページに戻る
        setCurrentPage('generate')
      }
      // エラーは静かに処理し、UIを壊さない
    }
  }

  // 型安全な時間割詳細表示ハンドラ
  const handleViewTimetableDetail = (id: string) => {
    try {
      const validatedId = TimetableDetailIdSchema.parse(id)
      setTimetableDetailId(validatedId)
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Timetable detail ID validation failed:', error.errors)
        // エラーは静かに処理し、UIを壊さない
      }
    }
  }

  // 型安全な詳細表示から一覧に戻るハンドラ
  const handleBackToList = () => {
    try {
      const validatedId = TimetableDetailIdSchema.parse(null)
      setTimetableDetailId(validatedId)
    } catch (_error) {
      // null値の検証なので、エラーは基本的に発生しない
      setTimetableDetailId(null)
    }
  }

  const renderCurrentPage = () => {
    const _LoadingSpinner = () => (
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
