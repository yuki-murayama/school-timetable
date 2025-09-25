import type { TimetableListItem } from '@shared/schemas'
import { ValidationError } from '@shared/schemas'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { z } from 'zod'
import { useAuth } from '../hooks/use-auth'
import { useToast } from '../hooks/use-toast'

// プロパティ検証スキーマ
const TimetableViewPropsSchema = z.object({
  onViewDetail: z.function(z.tuple([z.string()]), z.void()).optional(),
})

// ページネーション状態スキーマ
const PaginationStateSchema = z.object({
  currentPage: z.number().int().min(1),
  totalPages: z.number().int().min(0),
  totalCount: z.number().int().min(0),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
  itemsPerPage: z.number().int().min(1).max(100),
})

// ローディング状態スキーマ
const LoadingStateSchema = z.object({
  isLoading: z.boolean(),
})

// APIレスポンススキーマ（バックエンドの実際の形式に合わせて修正）
const TimetableApiResponseSchema = z
  .object({
    success: z.boolean(),
    data: z
      .object({
        timetables: z.array(z.any()),
        pagination: z.object({
          page: z.number().int().min(1),
          limit: z.number().int().min(1),
          total: z.number().int().min(0),
          totalPages: z.number().int().min(0),
        }),
      })
      .optional(),
    message: z.string().optional(),
  })
  .nullable()

type TimetableViewProps = z.infer<typeof TimetableViewPropsSchema>
type PaginationState = z.infer<typeof PaginationStateSchema>

// 時間割一覧表示コンポーネント（詳細表示機能付き）
export function TimetableView({ onViewDetail }: TimetableViewProps) {
  // Props validation
  try {
    TimetableViewPropsSchema.parse({ onViewDetail })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('TimetableView props validation failed:', error.errors)
      throw new ValidationError('時間割ビューのプロパティ検証に失敗しました', error.errors)
    }
    throw error
  }
  const { toast } = useToast()
  const { token, getFreshToken } = useAuth()

  const [timetables, setTimetables] = useState<TimetableListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 型安全なページネーション状態
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    totalPages: 0,
    totalCount: 0,
    hasNextPage: false,
    hasPrevPage: false,
    itemsPerPage: 20,
  })

  // 初期状態検証
  try {
    PaginationStateSchema.parse(pagination)
    LoadingStateSchema.parse({ isLoading })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Initial state validation failed:', error.errors)
      throw new ValidationError('初期状態の検証に失敗しました', error.errors)
    }
    throw error
  }

  // 型安全な時間割一覧取得関数（ページネーション対応）
  const loadTimetables = useCallback(
    async (page: number = pagination.currentPage) => {
      // ページパラメータの検証
      try {
        z.number().int().min(1).parse(page)
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error('Page parameter validation failed:', error.errors)
          return
        }
      }
      setIsLoading(true)

      try {
        // 認証トークンを取得
        let currentToken = token
        if (!currentToken) {
          currentToken = await getFreshToken()
        }

        // 型安全なAPI呼び出しパラメータ
        const apiParams = {
          page,
          limit: pagination.itemsPerPage,
        }

        const response = await fetch(
          `/api/timetables?page=${apiParams.page}&limit=${apiParams.limit}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${currentToken}`,
              'X-Requested-With': 'XMLHttpRequest',
            },
          }
        )

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const rawData = await response.json()

        // APIレスポンスの型安全検証
        const data = TimetableApiResponseSchema.parse(rawData)

        if (data?.success && data.data) {
          const { timetables: rawTimetables, pagination: paginationData } = data.data

          if (Array.isArray(rawTimetables)) {
            const timetablesList = rawTimetables.map(
              (item: Record<string, unknown>, index: number) => ({
                ...item,
                name:
                  item.name ||
                  `時間割 #${paginationData.total - (paginationData.page - 1) * pagination.itemsPerPage - index}`,
                status: item.assignmentRate === 100 ? '完成' : '部分完成',
                isGenerated: true,
              })
            )

            setTimetables(timetablesList)

            // 型安全なページネーション状態更新
            const newPaginationState = PaginationStateSchema.parse({
              currentPage: paginationData.page,
              totalPages: paginationData.totalPages,
              totalCount: paginationData.total,
              hasNextPage: paginationData.page < paginationData.totalPages,
              hasPrevPage: paginationData.page > 1,
              itemsPerPage: pagination.itemsPerPage,
            })
            setPagination(newPaginationState)
          } else {
            setTimetables([])
            const emptyPaginationState = PaginationStateSchema.parse({
              currentPage: 1,
              totalPages: 0,
              totalCount: 0,
              hasNextPage: false,
              hasPrevPage: false,
              itemsPerPage: pagination.itemsPerPage,
            })
            setPagination(emptyPaginationState)
          }
        } else {
          setTimetables([])
          const emptyPaginationState = PaginationStateSchema.parse({
            currentPage: 1,
            totalPages: 0,
            totalCount: 0,
            hasNextPage: false,
            hasPrevPage: false,
            itemsPerPage: pagination.itemsPerPage,
          })
          setPagination(emptyPaginationState)
        }
      } catch (error) {
        console.error('Timetable loading error:', error)
        if (error instanceof ValidationError) {
          console.error('Validation error:', error.validationErrors)
        }

        toast({
          title: 'エラー',
          description: '時間割の読み込みに失敗しました',
          variant: 'destructive',
        })

        setTimetables([])
        const errorPaginationState = PaginationStateSchema.parse({
          currentPage: 1,
          totalPages: 0,
          totalCount: 0,
          hasNextPage: false,
          hasPrevPage: false,
          itemsPerPage: pagination.itemsPerPage,
        })
        setPagination(errorPaginationState)
      } finally {
        setIsLoading(false)
      }
    },
    [token, getFreshToken, pagination.itemsPerPage, toast, pagination.currentPage]
  )

  // 型安全なページ変更ハンドラ
  const handlePageChange = (newPage: number) => {
    try {
      const validatedPage = z
        .number()
        .int()
        .min(1)
        .max(pagination.totalPages || 1)
        .parse(newPage)
      if (validatedPage >= 1 && validatedPage <= pagination.totalPages) {
        const updatedPagination = { ...pagination, currentPage: validatedPage }
        setPagination(PaginationStateSchema.parse(updatedPagination))
        loadTimetables(validatedPage)
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Page change validation failed:', error.errors)
      }
    }
  }

  // 型安全な前ページ遷移
  const goToPrevPage = () => {
    if (pagination.hasPrevPage) {
      handlePageChange(pagination.currentPage - 1)
    }
  }

  // 型安全な次ページ遷移
  const goToNextPage = () => {
    if (pagination.hasNextPage) {
      handlePageChange(pagination.currentPage + 1)
    }
  }

  // 初期データ読み込み（マウント時のみ）
  useEffect(() => {
    loadTimetables(1)
  }, [loadTimetables]) // 空の依存配列でマウント時のみ実行

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>時間割参照</h1>
        <button
          type='button'
          onClick={() => loadTimetables(pagination.currentPage)}
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
                  className='w-full text-left bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer p-0'
                  onClick={() => onViewDetail?.(timetable.id)}
                  data-testid={`view-timetable-${timetable.id}`}
                >
                  <div className='p-6'>
                    <div className='mb-4'>
                      <h3 className='text-lg font-semibold text-gray-900 mb-2'>{timetable.name}</h3>
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
                        type='button'
                        onClick={e => {
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
          {pagination.totalPages > 1 && (
            <div className='flex items-center justify-between mt-8'>
              <div className='text-sm text-gray-600'>
                全 {pagination.totalCount} 件中{' '}
                {(pagination.currentPage - 1) * pagination.itemsPerPage + 1} -{' '}
                {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalCount)}{' '}
                件を表示
              </div>

              <div className='flex items-center space-x-2'>
                <button
                  type='button'
                  onClick={goToPrevPage}
                  disabled={!pagination.hasPrevPage || isLoading}
                  className='flex items-center px-3 py-2 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  <ChevronLeft className='h-4 w-4 mr-1' />
                  前へ
                </button>

                <div className='flex items-center space-x-1'>
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let page: number
                    if (pagination.totalPages <= 5) {
                      page = i + 1
                    } else if (pagination.currentPage <= 3) {
                      page = i + 1
                    } else if (pagination.currentPage >= pagination.totalPages - 2) {
                      page = pagination.totalPages - 4 + i
                    } else {
                      page = pagination.currentPage - 2 + i
                    }

                    return (
                      <button
                        type='button'
                        key={page}
                        onClick={() => handlePageChange(page)}
                        disabled={isLoading}
                        className={`px-3 py-2 text-sm rounded transition-colors ${
                          pagination.currentPage === page
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
                  type='button'
                  onClick={goToNextPage}
                  disabled={!pagination.hasNextPage || isLoading}
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
