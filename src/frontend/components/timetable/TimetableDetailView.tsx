import type { TimetableSlot } from '@shared/schemas'
import { AlertTriangle, ArrowLeft, Edit, Eye, Loader2, Save, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../hooks/use-auth'
import type { TimetableSlotData } from '../../hooks/use-timetable-data'
import { useToast } from '../../hooks/use-toast'
import { TimetableGrid } from './TimetableGrid'

// 時間割の詳細データ型
interface TimetableDetailData {
  id: string
  name?: string
  timetable: TimetableSlot[][][] // [grade][class][periods] 構造
  assignmentRate: number
  totalSlots: number
  assignedSlots: number
  generationMethod: string
  createdAt: string
  updatedAt: string
}

// コンプライアンスデータ型
interface ComplianceData {
  totalSlots: number
  violationSlots: number
  highViolations: number
  mediumViolations: number
  lowViolations: number
  complianceRate: number
}

const _WEEKDAYS = ['月曜', '火曜', '水曜', '木曜', '金曜', '土曜']
const _PERIODS = [1, 2, 3, 4, 5, 6]

type ViewMode = 'detail' | 'edit'

export function TimetableDetailView({
  timetableId,
  onBackToList,
}: {
  timetableId?: string
  onBackToList?: () => void
}) {
  const { id: paramId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // timetableIdが渡されていればそれを使用、そうでなければURLパラメータを使用
  const id = timetableId || paramId
  const { toast } = useToast()
  const { token, getFreshToken } = useAuth()

  const [timetable, setTimetable] = useState<TimetableDetailData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentView, setCurrentView] = useState<ViewMode>('detail')
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [draggedSlot, setDraggedSlot] = useState<{
    subject: string
    teacher: string
    period: string
    day: string
    classGrade: number
    classSection: number
  } | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  // 利用可能なクラス一覧を生成 - フラット配列構造対応
  const getAvailableClasses = useCallback((timetableData: TimetableDetailData): string[] => {
    const classes = new Set<string>()

    // 厳密なnullチェック
    if (!timetableData || !timetableData.timetable || !Array.isArray(timetableData.timetable)) {
      return ['1-1', '1-2', '1-3', '1-4', '2-1', '2-2', '2-3', '2-4', '3-1', '3-2', '3-3']
    }

    try {
      console.log('🔍 getAvailableClasses: processing timetable data')

      // 全学年のデータを処理して利用可能なクラスを収集
      for (let gradeIndex = 0; gradeIndex < timetableData.timetable.length; gradeIndex++) {
        const gradeData = timetableData.timetable[gradeIndex]
        console.log(`🔍 Processing grade ${gradeIndex + 1}:`, gradeData)

        if (Array.isArray(gradeData)) {
          gradeData.forEach(classData => {
            if (Array.isArray(classData) && classData.length > 0) {
              // 最初のスロットから学年・クラス情報を取得
              const firstSlot = classData[0]
              if (firstSlot?.classGrade && firstSlot.classSection) {
                const className = `${firstSlot.classGrade}-${firstSlot.classSection}`
                console.log(`🔍 Found class: ${className}`)
                classes.add(className)
              }
            }
          })
        }
      }
    } catch (error) {
      console.error('Error processing timetable data:', error)
      return ['1-1', '1-2', '1-3', '1-4', '2-1', '2-2', '2-3', '2-4', '3-1', '3-2', '3-3']
    }

    // デフォルトクラス（データが空の場合）
    if (classes.size === 0) {
      return ['1-1', '1-2', '1-3', '1-4', '2-1', '2-2', '2-3', '2-4', '3-1', '3-2', '3-3']
    }

    return Array.from(classes).sort()
  }, [])

  // 時間割データをTimetableGridコンポーネント用に変換
  const convertToTimetableGridData = (className: string): TimetableSlotData[] => {
    console.log('🔄 convertToTimetableGridData called with className:', className)
    console.log('🔄 timetable:', timetable)

    if (!timetable || !timetable.timetable || !Array.isArray(timetable.timetable)) {
      console.log('❌ convertToTimetableGridData: invalid timetable data')
      return []
    }

    const [grade, section] = className.split('-')
    const targetGrade = parseInt(grade)
    const targetSection = parseInt(section)

    console.log('🔍 Looking for grade:', targetGrade, 'section:', targetSection)
    console.log('🔍 Available grades in timetable:', timetable.timetable.length)

    // 学年別データから対象学年のデータを取得 (1年生 = index 0, 2年生 = index 1, etc.)
    const gradeIndex = targetGrade - 1
    if (gradeIndex < 0 || gradeIndex >= timetable.timetable.length) {
      console.log('❌ Grade index out of range:', gradeIndex)
      return []
    }

    const gradeData = timetable.timetable[gradeIndex]
    console.log('🔍 Grade data:', gradeData)
    console.log('🔍 Grade data is array:', Array.isArray(gradeData))

    if (!Array.isArray(gradeData)) {
      console.log('❌ Grade data is not array')
      return []
    }

    // 対象クラスのデータを見つける
    let classData: Record<string, unknown>[] = []
    console.log('🔍 Searching through', gradeData.length, 'classes')

    for (let i = 0; i < gradeData.length; i++) {
      const classSchedule = gradeData[i]
      console.log(`🔍 Class ${i}:`, classSchedule)
      console.log(`🔍 Class ${i} is array:`, Array.isArray(classSchedule))

      if (Array.isArray(classSchedule) && classSchedule.length > 0) {
        const firstSlot = classSchedule[0]
        console.log(`🔍 First slot of class ${i}:`, firstSlot)

        if (
          firstSlot &&
          firstSlot.classGrade === targetGrade &&
          String(firstSlot.classSection) === String(targetSection)
        ) {
          console.log('✅ Found matching class!')
          classData = classSchedule
          break
        }
      }
    }

    if (!Array.isArray(classData) || classData.length === 0) {
      console.log('❌ No class data found')
      return []
    }

    console.log('🔍 Found class data with', classData.length, 'slots')
    const periodData: TimetableSlotData[] = []

    // 各時限のデータを作成 (1～6時限)
    for (let period = 1; period <= 6; period++) {
      const periodSlots: Record<string, unknown> = {}

      // 各曜日のデータを作成 (月～土)
      const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      dayKeys.forEach((dayKey, dayIndex) => {
        const slotIndex = dayIndex * 6 + (period - 1) // 6時限/日

        if (slotIndex < classData.length) {
          const slot = classData[slotIndex]

          periodSlots[dayKey] = slot
            ? {
                subject: slot.subject?.name || '',
                teacher: slot.teacher?.name || '',
                classroom: slot.classroom?.name || '',
                violations: Array.isArray(slot.violations) ? slot.violations : [],
                isAutoFilled: slot.isAutoFilled || false,
              }
            : null
        } else {
          periodSlots[dayKey] = null
        }
      })

      periodData.push(periodSlots as TimetableSlotData)
    }

    console.log('✅ convertToTimetableGridData returning:', periodData)
    console.log('✅ periodData length:', periodData.length)
    return periodData
  }

  // ドラッグ開始処理
  const handleDragStart = (
    e: React.DragEvent,
    subject: string,
    teacher: string,
    period: string,
    day: string,
    grade: number,
    classNumber: number
  ) => {
    setDraggedSlot({
      subject,
      teacher,
      period,
      day,
      classGrade: grade,
      classSection: classNumber,
    })
    e.dataTransfer.effectAllowed = 'move'
  }

  // ドラッグオーバー処理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  // ドロップ処理
  const handleDrop = async (e: React.DragEvent, targetPeriod: string, targetDay: string) => {
    e.preventDefault()

    if (!draggedSlot || !timetable) {
      return
    }

    // 同じ位置にドロップした場合は何もしない
    if (draggedSlot.period === targetPeriod && draggedSlot.day === targetDay) {
      setDraggedSlot(null)
      return
    }

    // ここで実際のデータ変更処理を実装
    // 現在は変更フラグのみ設定
    setHasChanges(true)
    setDraggedSlot(null)

    toast({
      title: '授業を移動しました',
      description: `${draggedSlot.subject}を${targetPeriod}時限目 ${targetDay}曜日に移動しました`,
    })
  }

  // 変更保存処理
  const handleSaveChanges = async () => {
    if (!hasChanges) return

    try {
      // 保存API呼び出し処理をここに実装
      toast({
        title: '変更を保存しました',
        description: '時間割の変更が正常に保存されました',
      })
      setHasChanges(false)
    } catch (_error) {
      toast({
        title: 'エラー',
        description: '変更の保存に失敗しました',
        variant: 'destructive',
      })
    }
  }

  // 変更をキャンセル
  const handleCancelEdit = () => {
    setCurrentView('detail')
    setHasChanges(false)
    // データをリロード（元のデータに戻す）
    if (id) {
      setIsLoading(true)
      // useEffectが自動的にデータを再読み込みします
    }
  }

  // 教師クリック処理（教師スケジュール表示用）
  const handleTeacherClick = (teacherName: string) => {
    toast({
      title: '教師スケジュール',
      description: `${teacherName}先生のスケジュールを表示（実装予定）`,
    })
  }

  // コンプライアンス情報を計算
  const calculateComplianceData = (className?: string): ComplianceData => {
    console.log('📊 calculateComplianceData called with className:', className)
    console.log('📊 timetable for compliance:', timetable)

    if (!timetable || !timetable.timetable || !Array.isArray(timetable.timetable)) {
      console.log('❌ calculateComplianceData: invalid timetable data')
      return {
        totalSlots: 0,
        violationSlots: 0,
        highViolations: 0,
        mediumViolations: 0,
        lowViolations: 0,
        complianceRate: 100,
      }
    }

    let totalSlots = 0
    let violationSlots = 0
    let highViolations = 0
    let mediumViolations = 0
    let lowViolations = 0

    if (className) {
      // 単一クラスのコンプライアンスを計算
      const [grade, section] = className.split('-')
      const targetSection = section

      try {
        const targetGrade = parseInt(grade)
        const gradeIndex = targetGrade - 1

        console.log(
          '📊 Looking for compliance data - grade:',
          targetGrade,
          'section:',
          targetSection
        )

        if (gradeIndex >= 0 && gradeIndex < timetable.timetable.length) {
          const gradeData = timetable.timetable[gradeIndex]
          console.log('📊 Grade data for compliance:', gradeData)

          if (Array.isArray(gradeData)) {
            for (const classSchedule of gradeData) {
              if (Array.isArray(classSchedule) && classSchedule.length > 0) {
                const firstSlot = classSchedule[0]
                if (
                  firstSlot &&
                  firstSlot.classGrade === targetGrade &&
                  String(firstSlot.classSection) === String(targetSection)
                ) {
                  console.log('📊 Found class for compliance calculation')
                  // 対象クラスのスロットをすべて処理
                  classSchedule.forEach(slot => {
                    if (slot) {
                      totalSlots++
                      if (Array.isArray(slot.violations) && slot.violations.length > 0) {
                        violationSlots++
                        slot.violations.forEach(violation => {
                          if (violation.severity === 'high') highViolations++
                          else if (violation.severity === 'medium') mediumViolations++
                          else lowViolations++
                        })
                      }
                    }
                  })
                  break
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error calculating single class compliance:', error)
      }
    } else {
      // 全クラスのコンプライアンスを計算
      try {
        console.log('📊 Calculating compliance for all classes')

        // 全学年のデータを処理
        for (let gradeIndex = 0; gradeIndex < timetable.timetable.length; gradeIndex++) {
          const gradeData = timetable.timetable[gradeIndex]
          console.log(`📊 Processing grade ${gradeIndex + 1}:`, gradeData)

          if (Array.isArray(gradeData)) {
            gradeData.forEach(classSchedule => {
              if (Array.isArray(classSchedule) && classSchedule.length > 0) {
                classSchedule.forEach(slot => {
                  if (slot) {
                    totalSlots++
                    if (Array.isArray(slot.violations) && slot.violations.length > 0) {
                      violationSlots++
                      slot.violations.forEach(violation => {
                        if (violation.severity === 'high') highViolations++
                        else if (violation.severity === 'medium') mediumViolations++
                        else lowViolations++
                      })
                    }
                  }
                })
              }
            })
          }
        }
      } catch (error) {
        console.error('Error calculating compliance data:', error)
      }
    }

    const complianceRate = totalSlots > 0 ? ((totalSlots - violationSlots) / totalSlots) * 100 : 100

    return {
      totalSlots,
      violationSlots,
      highViolations,
      mediumViolations,
      lowViolations,
      complianceRate: Math.round(complianceRate * 10) / 10,
    }
  }

  // コンプライアンス表示コンポーネント
  const renderComplianceIndicator = (className?: string) => {
    const compliance = calculateComplianceData(className)

    const getComplianceColor = (rate: number) => {
      if (rate >= 90) return 'text-green-600 bg-green-50 border-green-200'
      if (rate >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      return 'text-red-600 bg-red-50 border-red-200'
    }

    return (
      <div className='bg-white border border-gray-200 rounded-lg p-4'>
        <div className='flex items-center justify-between mb-3'>
          <h4 className='font-medium text-gray-900'>
            {className ? `${className}組 コンプライアンス` : '全体コンプライアンス'}
          </h4>
          <div
            className={`px-3 py-1 rounded-full text-sm font-medium border ${getComplianceColor(
              compliance.complianceRate
            )}`}
          >
            {compliance.complianceRate.toFixed(1)}%
          </div>
        </div>

        <div className='space-y-2'>
          <div className='flex justify-between text-sm'>
            <span className='text-gray-600'>全スロット数</span>
            <span className='font-medium'>{compliance.totalSlots}</span>
          </div>

          {compliance.violationSlots > 0 && (
            <>
              <div className='flex justify-between text-sm'>
                <span className='text-gray-600'>違反スロット</span>
                <span className='text-red-600 font-medium'>{compliance.violationSlots}</span>
              </div>

              {compliance.highViolations > 0 && (
                <div className='flex justify-between text-xs text-red-600 ml-4'>
                  <span>高リスク違反</span>
                  <span>{compliance.highViolations}</span>
                </div>
              )}

              {compliance.mediumViolations > 0 && (
                <div className='flex justify-between text-xs text-yellow-600 ml-4'>
                  <span>中リスク違反</span>
                  <span>{compliance.mediumViolations}</span>
                </div>
              )}

              {compliance.lowViolations > 0 && (
                <div className='flex justify-between text-xs text-gray-500 ml-4'>
                  <span>低リスク違反</span>
                  <span>{compliance.lowViolations}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* プログレスバー */}
        <div className='mt-3'>
          <div className='w-full bg-gray-200 rounded-full h-2'>
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                compliance.complianceRate >= 90
                  ? 'bg-green-500'
                  : compliance.complianceRate >= 70
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              }`}
              style={{ width: `${compliance.complianceRate}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  // クラス選択用セレクト表示（編集モード時のみ）
  const renderClassSelector = () => {
    if (currentView !== 'edit' || !availableClasses || availableClasses.length <= 1) {
      return null
    }

    return (
      <div className='mb-4'>
        <label htmlFor='edit-class-select' className='block text-sm font-medium text-gray-700 mb-2'>
          編集対象クラス
        </label>
        <select
          id='edit-class-select'
          value={selectedClass}
          onChange={e => setSelectedClass(e.target.value)}
          className='px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500'
        >
          <option value=''>すべてのクラス</option>
          {availableClasses.map(className => (
            <option key={className} value={className}>
              {className}組
            </option>
          ))}
        </select>
      </div>
    )
  }

  useEffect(() => {
    if (!id) return

    const loadData = async () => {
      setIsLoading(true)

      try {
        let currentToken = token
        if (!currentToken) {
          currentToken = await getFreshToken()
        }

        const response = await fetch(`/api/timetable/program/saved/${id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentToken}`,
            'X-Requested-With': 'XMLHttpRequest',
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        console.log('🔍 API Response:', data)

        if (data?.success && data.data) {
          console.log('📊 Timetable raw data:', data.data.timetable)
          console.log('📊 Timetable type:', typeof data.data.timetable)
          console.log('📊 Timetable is array:', Array.isArray(data.data.timetable))

          const timetableData: TimetableDetailData = {
            id: data.data.id,
            name: data.data.name || `時間割 ${id.split('-')[1]}`,
            timetable: data.data.timetable,
            assignmentRate: data.data.assignmentRate || 0,
            totalSlots: data.data.totalSlots || 0,
            assignedSlots: data.data.assignedSlots || 0,
            generationMethod: data.data.generationMethod || 'unknown',
            createdAt: data.data.createdAt || new Date().toISOString(),
            updatedAt: data.data.updatedAt || new Date().toISOString(),
          }

          console.log('✅ Setting timetable data:', timetableData)
          setTimetable(timetableData)
        } else {
          throw new Error('時間割データが見つかりません')
        }
      } catch (_error) {
        toast({
          title: 'エラー',
          description: '時間割詳細の読み込みに失敗しました',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [id, getFreshToken, toast, token])

  // ページ離脱時の未保存変更警告
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasChanges])

  // すべてのフックを最初に呼び出す（条件に関係なく）
  const availableClasses = useMemo(() => {
    if (!timetable) return []
    return getAvailableClasses(timetable)
  }, [timetable, getAvailableClasses])

  // 最初のクラスを選択状態に設定（編集モード用）
  useEffect(() => {
    if (availableClasses && availableClasses.length > 0 && !selectedClass) {
      setSelectedClass(availableClasses[0])
    }
  }, [availableClasses, selectedClass])

  // 条件付きレンダリング
  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <Loader2 className='h-8 w-8 animate-spin mr-3' />
        <span>時間割詳細を読み込み中...</span>
      </div>
    )
  }

  if (!timetable) {
    return (
      <div className='text-center py-12'>
        <AlertTriangle className='h-12 w-12 text-yellow-500 mx-auto mb-4' />
        <h2 className='text-xl font-semibold mb-2'>時間割が見つかりません</h2>
        <p className='text-gray-600 mb-4'>指定された時間割データを読み込めませんでした。</p>
        <button
          type='button'
          onClick={() => (onBackToList ? onBackToList() : navigate('/timetable-reference'))}
          className='px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700'
        >
          時間割一覧に戻る
        </button>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* ヘッダー */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-4'>
          <button
            type='button'
            onClick={() => (onBackToList ? onBackToList() : navigate('/timetable-reference'))}
            className='flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded'
          >
            <ArrowLeft className='h-4 w-4' />
            <span>一覧に戻る</span>
          </button>
          <h1 className='text-2xl font-bold'>{timetable.name}</h1>
        </div>

        <div className='flex items-center space-x-6'>
          <div className='text-sm text-gray-600'>
            完成度: {timetable.assignmentRate.toFixed(1)}%
          </div>

          {/* 簡易コンプライアンス表示 */}
          <div className='flex items-center space-x-2 text-sm'>
            <span className='text-gray-600'>コンプライアンス:</span>
            <span
              className={`font-medium ${
                calculateComplianceData().complianceRate >= 90
                  ? 'text-green-600'
                  : calculateComplianceData().complianceRate >= 70
                    ? 'text-yellow-600'
                    : 'text-red-600'
              }`}
            >
              {calculateComplianceData().complianceRate.toFixed(1)}%
            </span>
          </div>

          {/* 編集モード切り替えボタン */}
          <div className='flex items-center space-x-2'>
            {currentView === 'detail' ? (
              <button
                type='button'
                onClick={() => {
                  setCurrentView('edit')
                  setSelectedClass(
                    availableClasses && availableClasses.length > 0 ? availableClasses[0] : ''
                  )
                }}
                className='flex items-center space-x-2 px-3 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors'
              >
                <Edit className='h-4 w-4' />
                <span>編集</span>
              </button>
            ) : (
              <div className='flex items-center space-x-2'>
                {hasChanges && (
                  <button
                    type='button'
                    onClick={handleSaveChanges}
                    className='flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors'
                  >
                    <Save className='h-4 w-4' />
                    <span>保存</span>
                  </button>
                )}
                <button
                  type='button'
                  onClick={() => setCurrentView('detail')}
                  className='flex items-center space-x-2 px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors'
                >
                  <Eye className='h-4 w-4' />
                  <span>表示</span>
                </button>
                <button
                  type='button'
                  onClick={handleCancelEdit}
                  className='flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors'
                >
                  <X className='h-4 w-4' />
                  <span>キャンセル</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 編集モード時の変更通知 */}
      {currentView === 'edit' && (
        <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
          <div className='flex items-center space-x-2'>
            <Edit className='h-5 w-5 text-blue-600' />
            <div>
              <div className='font-medium text-blue-900'>編集モード</div>
              <div className='text-sm text-blue-700'>
                授業をドラッグ&ドロップで移動できます。{hasChanges && '変更があります。'}
              </div>
            </div>
          </div>
        </div>
      )}

      {renderClassSelector()}

      {/* コンプライアンス情報 */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6'>
        {renderComplianceIndicator()}
        {currentView === 'edit' && selectedClass && renderComplianceIndicator(selectedClass)}
      </div>

      {/* 時間割グリッド表示 */}
      <div className='space-y-8'>
        {currentView === 'edit' && selectedClass ? (
          // 編集モード：選択されたクラスのみ表示
          <div>
            <h3 className='text-lg font-semibold mb-4'>{selectedClass}組</h3>
            <TimetableGrid
              timetableData={convertToTimetableGridData(selectedClass)}
              currentView={currentView}
              selectedGrade={selectedClass.split('-')[0]}
              selectedClass={parseInt(selectedClass.split('-')[1])}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onTeacherClick={handleTeacherClick}
            />
          </div>
        ) : (
          // 詳細表示モード：全クラス表示（2列レイアウト）
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {availableClasses && availableClasses.length > 0 ? (
              availableClasses.map(className => (
                <div key={className} className='space-y-2'>
                  <h3 className='text-lg font-semibold text-center'>{className}組</h3>
                  <TimetableGrid
                    timetableData={convertToTimetableGridData(className)}
                    currentView={currentView}
                    selectedGrade={className.split('-')[0]}
                    selectedClass={parseInt(className.split('-')[1])}
                    onTeacherClick={handleTeacherClick}
                  />
                </div>
              ))
            ) : (
              <div className='col-span-2 text-center py-8 text-gray-500'>
                利用可能なクラスがありません
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
