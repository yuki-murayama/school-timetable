import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { TimetableListItem } from '../../shared/types'
import { useAuth } from '../hooks/use-auth'
import { useToast } from '../hooks/use-toast'

// 時間割一覧表示コンポーネント（詳細表示機能付き）
export function TimetableView({ onViewDetail }: { onViewDetail?: (id: string) => void }) {
  const { toast } = useToast()
  const { token, getFreshToken } = useAuth()
  
  const [timetables, setTimetables] = useState<TimetableListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // ページネーション状態
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [hasPrevPage, setHasPrevPage] = useState(false)
  const itemsPerPage = 20

  // 時間割一覧を取得する安全な関数（ページネーション対応）
  const loadTimetables = async (page: number = currentPage) => {
    setIsLoading(true)
    
    try {
      // 認証トークンを取得
      let currentToken = token
      if (!currentToken) {
        currentToken = await getFreshToken()
      }
      
      // ページネーション対応のAPI呼び出し
      const response = await fetch(`/api/timetable/program/saved?page=${page}&limit=${itemsPerPage}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`,
          'X-Requested-With': 'XMLHttpRequest',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data && data.success && data.data) {
        const {
          timetables: rawTimetables,
          totalCount: count,
          currentPage: current,
          totalPages: total,
          hasNextPage: hasNext,
          hasPrevPage: hasPrev
        } = data.data
        
        if (Array.isArray(rawTimetables)) {
          const timetablesList = rawTimetables.map((item: any, index: number) => ({
            ...item,
            name: item.name || `時間割 #${count - (current - 1) * itemsPerPage - index}`,
            status: item.assignmentRate === 100 ? '完成' : '部分完成',
            isGenerated: true,
          }))
          
          setTimetables(timetablesList)
          setTotalCount(count)
          setCurrentPage(current)
          setTotalPages(total)
          setHasNextPage(hasNext)
          setHasPrevPage(hasPrev)
        } else {
          setTimetables([])
          setTotalCount(0)
          setTotalPages(0)
          setHasNextPage(false)
          setHasPrevPage(false)
        }
      } else {
        setTimetables([])
        setTotalCount(0)
        setTotalPages(0)
        setHasNextPage(false)
        setHasPrevPage(false)
      }
    } catch (error) {
      toast({
        title: 'エラー',
        description: '時間割の読み込みに失敗しました',
        variant: 'destructive',
      })
      setTimetables([])
      setTotalCount(0)
      setTotalPages(0)
      setHasNextPage(false)
      setHasPrevPage(false)
    } finally {
      setIsLoading(false)
    }
  }

  // ページ変更ハンドラ
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      loadTimetables(newPage)
    }
  }

  // 前のページ
  const goToPrevPage = () => {
    if (hasPrevPage) {
      handlePageChange(currentPage - 1)
    }
  }

  // 次のページ
  const goToNextPage = () => {
    if (hasNextPage) {
      handlePageChange(currentPage + 1)
    }
  }

  // 初期データ読み込み
  useEffect(() => {
    loadTimetables(1)
  }, []) // 依存配列を最小限に


  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>時間割参照</h1>
        <button
          onClick={() => loadTimetables(currentPage)}
          disabled={isLoading}
          className='px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50'
        >
          {isLoading ? '読み込み中...' : '再読み込み'}
        </button>
      </div>


      {isLoading ? (
        <div className='flex items-center justify-center py-8'>
          <Loader2 className='h-6 w-6 animate-spin mr-2' />
          <span>時間割一覧を読み込み中...</span>
        </div>
      ) : (
        <>
          {timetables.length === 0 ? (
            <div className='text-center py-8 text-gray-500'>
              <p>時間割データがありません。</p>
              <p className='text-sm'>時間割生成画面で時間割を作成してください。</p>
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
              {timetables.map(timetable => (
                <div
                  key={timetable.id}
                  className='bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer'
                  onClick={() => onViewDetail?.(timetable.id)}
                  data-testid={`view-timetable-${timetable.id}`}
                >
                  <div className='p-6'>
                    <div className='mb-4'>
                      <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                        {timetable.name}
                      </h3>
                      <p className='text-sm text-gray-600'>
                        作成日: {new Date(timetable.createdAt).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    
                    <div className='mb-4'>
                      <div className='flex items-center justify-between mb-2'>
                        <span className='text-sm text-gray-600'>完成度</span>
                        <span className='text-sm font-medium text-gray-900'>
                          {timetable.assignmentRate}%
                        </span>
                      </div>
                      <div className='w-full bg-gray-200 rounded-full h-2'>
                        <div
                          className='h-2 rounded-full bg-gray-800 transition-all duration-300'
                          style={{ width: `${timetable.assignmentRate}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className='flex items-center justify-between'>
                      <span className='px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800'>
                        {timetable.status}
                      </span>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onViewDetail?.(timetable.id)
                        }}
                        className='px-3 py-1 text-sm bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors duration-200'
                      >
                        詳細
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* ページネーション */}
          {totalPages > 1 && (
            <div className='flex items-center justify-between mt-8'>
              <div className='text-sm text-gray-600'>
                全 {totalCount} 件中 {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} 件を表示
              </div>
              
              <div className='flex items-center space-x-2'>
                <button
                  onClick={goToPrevPage}
                  disabled={!hasPrevPage || isLoading}
                  className='flex items-center px-3 py-2 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  <ChevronLeft className='h-4 w-4 mr-1' />
                  前へ
                </button>
                
                <div className='flex items-center space-x-1'>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page: number
                    if (totalPages <= 5) {
                      page = i + 1
                    } else if (currentPage <= 3) {
                      page = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i
                    } else {
                      page = currentPage - 2 + i
                    }
                    
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        disabled={isLoading}
                        className={`px-3 py-2 text-sm rounded transition-colors ${
                          currentPage === page
                            ? 'bg-gray-800 text-white'
                            : 'bg-white border border-gray-300 hover:bg-gray-50'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {page}
                      </button>
                    )
                  })}
                </div>
                
                <button
                  onClick={goToNextPage}
                  disabled={!hasNextPage || isLoading}
                  className='flex items-center px-3 py-2 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  次へ
                  <ChevronRight className='h-4 w-4 ml-1' />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}