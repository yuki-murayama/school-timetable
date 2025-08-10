import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { TimetableListItem } from '../../shared/types'
import { useAuth } from '../hooks/use-auth'
import { useToast } from '../hooks/use-toast'

// 最小限の安全なTimetableViewコンポーネント
export function TimetableView() {
  console.log('🎯 TimetableView component mounted!')
  const { toast } = useToast()
  const { token, getFreshToken } = useAuth()
  
  const [timetables, setTimetables] = useState<TimetableListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 時間割一覧を取得する安全な関数
  const loadTimetables = async () => {
    console.log('🔄 loadTimetables開始')
    setIsLoading(true)
    
    try {
      // 認証トークンを取得
      let currentToken = token
      if (!currentToken) {
        console.log('🔑 トークンを取得中...')
        currentToken = await getFreshToken()
      }

      console.log('🚀 API呼び出し開始')
      
      // 直接fetchを使用してAPIを呼び出し
      const response = await fetch('/api/timetable/program/saved', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`,
          'X-Requested-With': 'XMLHttpRequest',
        },
      })

      console.log('📊 API応答状態:', response.status)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('📋 API応答データ:', data)

      if (data && data.success && Array.isArray(data.data?.timetables)) {
        const timetablesList = data.data.timetables.map((item: any, index: number) => ({
          ...item,
          name: item.name || `時間割 #${data.data.timetables.length - index}`,
          status: item.assignmentRate === 100 ? '完成' : '部分完成',
          isGenerated: true,
        }))
        
        setTimetables(timetablesList)
        console.log('✅ 時間割データ設定完了:', timetablesList.length, '件')
      } else {
        console.warn('⚠️ 予期しないAPI応答形式:', data)
        setTimetables([])
      }
    } catch (error) {
      console.error('❌ 時間割読み込みエラー:', error)
      toast({
        title: 'エラー',
        description: '時間割の読み込みに失敗しました',
        variant: 'destructive',
      })
      setTimetables([])
    } finally {
      setIsLoading(false)
    }
  }

  // 初期データ読み込み
  useEffect(() => {
    loadTimetables()
  }, []) // 依存配列を最小限に

  console.log('🎯 レンダリング状態:', {
    isLoading,
    timetableCount: timetables.length,
    token: !!token
  })

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>時間割参照</h1>
        <button
          onClick={loadTimetables}
          disabled={isLoading}
          className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50'
        >
          {isLoading ? '読み込み中...' : '再読み込み'}
        </button>
      </div>

      <div className='bg-blue-50 p-4 rounded-lg'>
        <h3 className='font-semibold text-blue-800 mb-2'>デバッグ情報</h3>
        <div className='space-y-1 text-sm text-blue-600'>
          <p>時間割件数: {timetables.length}</p>
          <p>読み込み状態: {isLoading ? 'loading' : 'completed'}</p>
          <p>認証状態: {token ? 'authenticated' : 'not authenticated'}</p>
        </div>
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
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
              {timetables.map(timetable => (
                <div
                  key={timetable.id}
                  className='p-4 border rounded-lg shadow hover:shadow-md transition-shadow'
                >
                  <h3 className='font-semibold mb-2'>{timetable.name}</h3>
                  <p className='text-sm text-gray-600 mb-1'>
                    作成日: {new Date(timetable.createdAt).toLocaleDateString('ja-JP')}
                  </p>
                  <p className='text-sm text-gray-600 mb-1'>
                    ステータス: {timetable.status}
                  </p>
                  <p className='text-sm text-gray-600'>
                    完成度: {timetable.assignmentRate}%
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}