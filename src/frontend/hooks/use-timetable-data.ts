import { useCallback, useState } from 'react'
import type {
  SchoolSettings,
  Subject,
  Teacher,
  TimetableDetail,
  TimetableListItem,
} from '../../shared/types'
import { schoolApi } from '../lib/api/school'
import { subjectApi } from '../lib/api/subject'
import { teacherApi } from '../lib/api/teacher'
import { timetableApi } from '../lib/api/timetable'
import { useAuth } from './use-auth'

interface TimetableSlotData {
  period: string
  subject?: string
  teacher?: string
  classroom?: string
  grade?: number
  class?: string
  violations?: Array<{
    type: string
    severity: 'high' | 'medium' | 'low'
    message: string
  }>
  isAutoFilled?: boolean
}

export const useTimetableData = () => {
  const { token, getFreshToken } = useAuth()

  // 基本状態
  const [currentView, setCurrentView] = useState<'list' | 'detail' | 'edit' | 'teacher'>('list')
  const [selectedTimetable, setSelectedTimetable] = useState<TimetableListItem | null>(null)
  const [selectedTimetableDetail, setSelectedTimetableDetail] = useState<TimetableDetail | null>(
    null
  )
  const [selectedGrade, setSelectedGrade] = useState('1')
  const [selectedClass, setSelectedClass] = useState(1)
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null)

  // ローディング状態
  const [isLoadingTimetables, setIsLoadingTimetables] = useState(false)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // データ状態
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>({
    grade1Classes: 4,
    grade2Classes: 3,
    grade3Classes: 3,
    dailyPeriods: 6,
    saturdayPeriods: 4,
  })

  // 時間割データ
  const [timetableData, setTimetableData] = useState<TimetableSlotData[]>([])
  const [timetables, setTimetables] = useState<TimetableListItem[]>([])

  // 現在選択されている学年のクラス数を取得
  const getClassesForGrade = useCallback(
    (grade: string): number => {
      switch (grade) {
        case '1':
          return schoolSettings.grade1Classes
        case '2':
          return schoolSettings.grade2Classes
        case '3':
          return schoolSettings.grade3Classes
        default:
          return 4
      }
    },
    [schoolSettings]
  )

  // 学校設定を取得
  const loadSchoolSettings = useCallback(async () => {
    try {
      const settings = await schoolApi.getSettings({ token, getFreshToken })
      setSchoolSettings(settings)
      console.log('学校設定を取得:', settings)
    } catch (error) {
      console.error('学校設定の取得に失敗:', error)
    }
  }, [token, getFreshToken])

  // 教師・教科データを取得
  const loadValidationData = useCallback(async () => {
    try {
      const [teachersData, subjectsData] = await Promise.all([
        teacherApi.getTeachers({ token, getFreshToken }),
        subjectApi.getSubjects({ token, getFreshToken }),
      ])

      setTeachers(teachersData)
      setSubjects(subjectsData)
      console.log('検証用データを取得:', {
        teachers: teachersData.length,
        subjects: subjectsData.length,
      })
    } catch (error) {
      console.error('検証用データの取得に失敗:', error)
    }
  }, [token, getFreshToken])

  // 時間割一覧を取得
  const loadTimetables = useCallback(async () => {
    console.log('🔄 loadTimetables開始 - 認証状態:', { hasToken: !!token, tokenType: typeof token })
    setIsLoadingTimetables(true)
    
    // 認証トークンを事前に取得
    let currentToken = token
    if (!currentToken) {
      console.log('🔑 トークンが空のため、新しいトークンを取得します')
      currentToken = await getFreshToken()
      console.log('🔑 新しいトークン取得結果:', { hasToken: !!currentToken, tokenType: typeof currentToken })
    }
    
    const [conventionalTimetables, savedTimetables] = await Promise.allSettled([
      timetableApi.getTimetables({ token: currentToken, getFreshToken }),
      timetableApi.getSavedTimetables({ token: currentToken, getFreshToken }),
    ])

    let combinedTimetables: TimetableListItem[] = []

    // 従来の時間割データを処理
    if (conventionalTimetables.status === 'fulfilled') {
      combinedTimetables = [...conventionalTimetables.value]
      console.log('✅ 従来の時間割を取得:', conventionalTimetables.value.length, '件')
    } else {
      console.warn('⚠️ 従来の時間割取得に失敗:', conventionalTimetables.reason)
    }

    // 生成された時間割データを処理
    console.log('🔍 savedTimetables.status:', savedTimetables.status)
    console.log('🔍 savedTimetables.value type:', typeof savedTimetables.value)
    console.log('🔍 savedTimetables.value isArray:', Array.isArray(savedTimetables.value))
    console.log('🔍 savedTimetables.value:', savedTimetables.value)
    
    if (savedTimetables.status === 'fulfilled' && Array.isArray(savedTimetables.value)) {
      const savedTimetablesList = savedTimetables.value
      console.log('📋 処理する時間割データ数:', savedTimetablesList.length)
      console.log('📋 最初の時間割データサンプル:', savedTimetablesList[0])
      
      const convertedSavedTimetables = savedTimetablesList.map((timetable, index) => {
        const converted = {
          ...timetable,
          name: timetable.name || `時間割 #${savedTimetablesList.length - index}`,
          status: timetable.assignmentRate === 100 ? '完成' : '部分完成',
          isGenerated: true,
        }
        console.log(`📋 変換後データ ${index + 1}:`, converted)
        return converted
      })
      combinedTimetables = [...combinedTimetables, ...convertedSavedTimetables]
      console.log('✅ 生成された時間割を取得:', savedTimetablesList.length, '件')
      console.log('✅ 変換後の合計:', convertedSavedTimetables.length, '件')
    } else {
      const errorDetail = savedTimetables.status === 'rejected' 
        ? (savedTimetables.reason instanceof Error 
          ? `${savedTimetables.reason.message} (${savedTimetables.reason.name})`
          : String(savedTimetables.reason))
        : `空のデータ (status: ${savedTimetables.status})`
      console.warn('⚠️ 生成された時間割取得に失敗:', errorDetail)
      
      // 詳細なデバッグ情報
      if (savedTimetables.status === 'fulfilled') {
        console.log('🔍 savedTimetables.value 詳細:', {
          value: savedTimetables.value,
          isArray: Array.isArray(savedTimetables.value),
          type: typeof savedTimetables.value,
          length: savedTimetables.value?.length
        })
      }
    }

    console.log('📊 合計時間割数:', combinedTimetables.length)
    setTimetables(combinedTimetables)
    setIsLoadingTimetables(false)
  }, [token, getFreshToken])

  return {
    // 状態
    currentView,
    selectedTimetable,
    selectedTimetableDetail,
    selectedGrade,
    selectedClass,
    selectedTeacher,
    isLoadingTimetables,
    isLoadingDetail,
    isSaving,
    teachers,
    subjects,
    schoolSettings,
    timetableData,
    timetables,

    // アクション
    setCurrentView,
    setSelectedTimetable,
    setSelectedTimetableDetail,
    setSelectedGrade,
    setSelectedClass,
    setSelectedTeacher,
    setTimetableData,
    setTimetables,
    setIsLoadingDetail,
    setIsSaving,

    // ユーティリティ
    getClassesForGrade,

    // データロード関数
    loadSchoolSettings,
    loadValidationData,
    loadTimetables,
  }
}

export type { TimetableSlotData }
