import { ArrowLeft, Calendar, Edit, Eye, Loader2, User } from 'lucide-react'
import type React from 'react'
import { useCallback, useEffect, useState } from 'react'

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

import { useAuth } from '../hooks/use-auth'
import { useToast } from '../hooks/use-toast'
import {
  type SchoolSettings,
  type Subject,
  schoolApi,
  subjectApi,
  type Teacher,
  type TimetableDetail,
  type TimetableListItem,
  teacherApi,
  timetableApi,
  timetableUtils,
} from '../lib/api'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'

interface TeacherSchedule {
  period: string
  mon: { grade: string; class: string; subject: string } | null
  tue: { grade: string; class: string; subject: string } | null
  wed: { grade: string; class: string; subject: string } | null
  thu: { grade: string; class: string; subject: string } | null
  fri: { grade: string; class: string; subject: string } | null
  sat: { grade: string; class: string; subject: string } | null
}

export function TimetableView() {
  const { toast } = useToast()
  const { token, getFreshToken } = useAuth()

  const [currentView, setCurrentView] = useState<'list' | 'detail' | 'edit' | 'teacher'>('list')
  const [selectedTimetable, setSelectedTimetable] = useState<TimetableListItem | null>(null)
  const [selectedTimetableDetail, setSelectedTimetableDetail] = useState<TimetableDetail | null>(
    null
  )
  const [selectedGrade, _setSelectedGrade] = useState('1')
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [tempTitle, setTempTitle] = useState('')
  const [draggedItem, setDraggedItem] = useState<{
    subject: string
    teacher: string
    period: string
    day: string
    grade: number
    classNumber: number
  } | null>(null)

  // API統合のためのローディング状態
  const [isLoadingTimetables, setIsLoadingTimetables] = useState(false)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // 適合率計算のためのデータ
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [complianceData, setComplianceData] = useState<{
    overallRate: number
    violations: Array<{
      period: string
      day: string
      type: 'teacher_conflict' | 'subject_constraint' | 'empty_slot' | 'teacher_mismatch'
      message: string
      severity: 'high' | 'medium' | 'low'
    }>
  } | null>(null)

  // 学校設定
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>({
    grade1Classes: 4,
    grade2Classes: 3,
    grade3Classes: 3,
    dailyPeriods: 6,
    saturdayPeriods: 4,
  })
  const [selectedClass, setSelectedClass] = useState(1)

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

  // モックデータ（フォールバック用）
  const mockTimetableData = [
    {
      period: '1',
      mon: { subject: '数学', teacher: '田中' },
      tue: { subject: '英語', teacher: '佐藤' },
      wed: { subject: '理科', teacher: '鈴木' },
      thu: { subject: '国語', teacher: '高橋' },
      fri: { subject: '社会', teacher: '伊藤' },
      sat: { subject: '体育', teacher: '山田' },
    },
    {
      period: '2',
      mon: { subject: '英語', teacher: '佐藤' },
      tue: { subject: '数学', teacher: '田中' },
      wed: { subject: '国語', teacher: '高橋' },
      thu: { subject: '理科', teacher: '鈴木' },
      fri: { subject: '音楽', teacher: '渡辺' },
      sat: { subject: '美術', teacher: '中村' },
    },
    {
      period: '3',
      mon: { subject: '理科', teacher: '鈴木' },
      tue: { subject: '国語', teacher: '高橋' },
      wed: { subject: '数学', teacher: '田中' },
      thu: { subject: '英語', teacher: '佐藤' },
      fri: { subject: '体育', teacher: '山田' },
      sat: null,
    },
    {
      period: '4',
      mon: { subject: '国語', teacher: '高橋' },
      tue: { subject: '理科', teacher: '鈴木' },
      wed: { subject: '英語', teacher: '佐藤' },
      thu: { subject: '数学', teacher: '田中' },
      fri: { subject: '技術', teacher: '小林' },
      sat: null,
    },
    {
      period: '5',
      mon: { subject: '社会', teacher: '伊藤' },
      tue: { subject: '体育', teacher: '山田' },
      wed: { subject: '音楽', teacher: '渡辺' },
      thu: { subject: '美術', teacher: '中村' },
      fri: { subject: '家庭', teacher: '加藤' },
      sat: null,
    },
    {
      period: '6',
      mon: { subject: '体育', teacher: '山田' },
      tue: { subject: '社会', teacher: '伊藤' },
      wed: { subject: '家庭', teacher: '加藤' },
      thu: { subject: '技術', teacher: '小林' },
      fri: { subject: '道徳', teacher: '高橋' },
      sat: null,
    },
  ]

  const mockTimetables: TimetableListItem[] = [
    { id: '1', name: '2024年度 第1学期', createdAt: '2024-03-15', status: 'active' },
    { id: '2', name: '2024年度 第2学期', createdAt: '2024-08-20', status: 'draft' },
    { id: '3', name: '2024年度 第3学期', createdAt: '2024-12-10', status: 'draft' },
  ]

  const [timetableData, setTimetableData] = useState(mockTimetableData)
  const [timetables, setTimetables] = useState<TimetableListItem[]>(mockTimetables)

  // 学校設定を取得
  const loadSchoolSettings = useCallback(async () => {
    try {
      const settings = await schoolApi.getSettings({ token, getFreshToken })
      setSchoolSettings(settings)
      console.log('学校設定を取得:', settings)
    } catch (error) {
      console.error('学校設定の取得に失敗:', error)
      // デフォルト値を使用
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
      console.log('バリデーション用データを取得:', {
        teachers: teachersData.length,
        subjects: subjectsData.length,
      })
    } catch (error) {
      console.error('バリデーション用データの取得に失敗:', error)
    }
  }, [token, getFreshToken])

  // API統合のロジック
  const loadTimetables = useCallback(async () => {
    setIsLoadingTimetables(true)
    try {
      // 従来の時間割データと生成された時間割データを並列取得
      const [conventionalTimetables, savedTimetables] = await Promise.allSettled([
        timetableApi.getTimetables({ token, getFreshToken }),
        timetableApi.getSavedTimetables({ token, getFreshToken }),
      ])

      let allTimetables: TimetableListItem[] = []

      // 従来の時間割データを追加
      if (conventionalTimetables.status === 'fulfilled') {
        allTimetables = [...conventionalTimetables.value]
        console.log('✅ 従来の時間割データを取得:', conventionalTimetables.value.length, '件')
      } else {
        console.warn('⚠️ 従来の時間割データ取得失敗:', conventionalTimetables.reason)
      }

      // 生成された時間割データを追加
      if (savedTimetables.status === 'fulfilled') {
        // 生成された時間割データをTimetableListItem形式に変換
        const convertedSavedTimetables = savedTimetables.value.map(timetable => ({
          id: timetable.id,
          name:
            `時間割 ${timetable.assignmentRate?.toFixed(1)}% (${timetable.generationMethod})` ||
            `生成済み時間割 ${timetable.id}`,
          createdAt: timetable.createdAt
            ? new Date(timetable.createdAt).toLocaleDateString('ja-JP')
            : new Date().toLocaleDateString('ja-JP'),
          status: 'active' as const,
        }))

        allTimetables = [...allTimetables, ...convertedSavedTimetables]
        console.log('✅ 生成された時間割データを取得・変換:', convertedSavedTimetables.length, '件')
      } else {
        console.warn('⚠️ 生成された時間割データ取得失敗:', savedTimetables.reason)
      }

      console.log('📊 合計時間割数:', allTimetables.length)
      setTimetables(allTimetables)

      // 両方とも失敗した場合のみモックデータを使用
      if (allTimetables.length === 0) {
        setTimetables(mockTimetables)
        toast({
          title: '注意',
          description: 'サーバーからデータを取得できませんでした。デモデータを表示しています。',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('時間割一覧の取得に失敗しました:', error)
      // モックデータにフォールバック
      setTimetables(mockTimetables)
      toast({
        title: '注意',
        description: 'サーバーからデータを取得できませんでした。デモデータを表示しています。',
        variant: 'destructive',
      })
    } finally {
      setIsLoadingTimetables(false)
    }
  }, [token, getFreshToken])

  const loadTimetableDetail = async (timetableId: string) => {
    console.log('🚀 loadTimetableDetail呼び出し開始:', {
      timetableId: timetableId,
      isGeneratedTimetable: timetableId.startsWith('timetable-'),
      selectedGrade: selectedGrade,
      selectedClass: selectedClass
    })
    setIsLoadingDetail(true)
    try {
      // IDから判断して適切なエンドポイントを使用
      const isGeneratedTimetable = timetableId.startsWith('timetable-')
      const result = isGeneratedTimetable
        ? await timetableApi.getSavedTimetableDetail(timetableId, { token, getFreshToken })
        : await timetableApi.getTimetableDetail(timetableId, { token, getFreshToken })

      console.log(`📋 時間割詳細取得 (${isGeneratedTimetable ? '生成済み' : '従来'}):`, result)
      setSelectedTimetableDetail(result)

      // 時間割データを表示用に変換（二重ネスト対応）
      const timetableData = result.timetable?.timetable || result.timetable

      // デバッグ情報を出力
      console.log('🔍 時間割詳細データ分析:', {
        rawResult: result,
        resultKeys: Object.keys(result || {}),
        timetableData: timetableData,
        timetableDataType: typeof timetableData,
        isArray: Array.isArray(timetableData),
        arrayLength: Array.isArray(timetableData) ? timetableData.length : 'not array',
        selectedGrade: selectedGrade,
        selectedClass: selectedClass,
        firstElement: Array.isArray(timetableData) ? timetableData[0] : 'not array',
        mondayData: timetableData?.monday,
        mondayLength: timetableData?.monday?.length,
      })

      const displayData = timetableUtils.convertToDisplayFormat(
        timetableData,
        parseInt(selectedGrade),
        selectedClass
      )

      console.log('🎯 convertToDisplayFormat戻り値詳細分析:', {
        displayData: displayData,
        dataType: typeof displayData,
        isArray: Array.isArray(displayData),
        arrayLength: Array.isArray(displayData) ? displayData.length : 'not array',
        firstElement: Array.isArray(displayData) ? displayData[0] : 'not array',
        samplePeriodData: Array.isArray(displayData) && displayData.length > 0 ? {
          period: displayData[0].period,
          mon: displayData[0].mon,
          tue: displayData[0].tue,
          hasSubjectData: !!(displayData[0].mon?.subject || displayData[0].tue?.subject)
        } : 'no sample available'
      })
      console.log('変換後の表示データ:', displayData)

      // displayDataが配列であることを確認
      if (Array.isArray(displayData)) {
        setTimetableData(displayData)
        console.log('✅ setTimetableData実行完了:', {
          setDataLength: displayData.length,
          dataStructureCheck: displayData.slice(0, 2).map(period => ({
            period: period.period,
            monHasData: !!(period.mon?.subject),
            tueHasData: !!(period.tue?.subject),
            monData: period.mon,
            tueData: period.tue
          }))
        })

        // 適合率計算
        if (teachers.length > 0 && subjects.length > 0) {
          const compliance = timetableUtils.calculateComplianceRate(
            timetableData,
            teachers,
            subjects
          )
          setComplianceData(compliance)

          // 違反情報を表示データに追加
          const dataWithViolations = timetableUtils.addViolationInfo(
            displayData,
            compliance.violations
          )
          setTimetableData(dataWithViolations)
        }
      } else {
        console.error('変換後のデータが配列ではありません:', displayData)
        setTimetableData(mockTimetableData) // フォールバック
      }
    } catch (error) {
      console.error('時間割詳細の取得に失敗しました:', error)
      
      // 404エラーの場合、最新の有効な時間割を自動取得
      if (error instanceof Error && error.message.includes('404')) {
        try {
          console.log('🔄 404エラー検出: 最新の有効な時間割を取得中...')
          const savedTimetables = await timetableApi.getSavedTimetables({ token, getFreshToken })
          
          if (savedTimetables.length > 0) {
            const latestTimetable = savedTimetables[0] // 最新の時間割
            console.log('✅ 最新の有効な時間割を発見:', latestTimetable.id)
            
            // 最新の時間割詳細を取得
            const latestResult = await timetableApi.getSavedTimetableDetail(latestTimetable.id, { token, getFreshToken })
            setSelectedTimetableDetail(latestResult)
            
            // 選択中の時間割も更新
            const updatedTimetableInfo = {
              id: latestTimetable.id,
              name: `時間割 ${latestTimetable.assignmentRate?.toFixed(1)}% (${latestTimetable.generationMethod})`,
              createdAt: latestTimetable.createdAt ? new Date(latestTimetable.createdAt).toLocaleDateString('ja-JP') : new Date().toLocaleDateString('ja-JP'),
              status: 'active' as const,
            }
            setSelectedTimetable(updatedTimetableInfo)
            
            // 時間割データを表示用に変換
            const latestTimetableData = latestResult.timetable?.timetable || latestResult.timetable
            
            // デバッグ情報を出力（404フォールバック）
            console.log('🔄 フォールバック時間割詳細データ分析:', {
              latestResult: latestResult,
              latestResultKeys: Object.keys(latestResult || {}),
              latestTimetableData: latestTimetableData,
              latestTimetableDataType: typeof latestTimetableData,
              isArray: Array.isArray(latestTimetableData),
              arrayLength: Array.isArray(latestTimetableData) ? latestTimetableData.length : 'not array',
              selectedGrade: selectedGrade,
              selectedClass: selectedClass,
              firstElement: Array.isArray(latestTimetableData) ? latestTimetableData[0] : 'not array',
            })
            
            const latestDisplayData = timetableUtils.convertToDisplayFormat(
              latestTimetableData,
              parseInt(selectedGrade),
              selectedClass
            )
            
            console.log('🎯 フォールバック時の変換結果詳細分析:', {
              latestDisplayData: latestDisplayData,
              dataType: typeof latestDisplayData,
              isArray: Array.isArray(latestDisplayData),
              arrayLength: Array.isArray(latestDisplayData) ? latestDisplayData.length : 'not array',
              firstElement: Array.isArray(latestDisplayData) ? latestDisplayData[0] : 'not array',
              samplePeriodData: Array.isArray(latestDisplayData) && latestDisplayData.length > 0 ? {
                period: latestDisplayData[0].period,
                mon: latestDisplayData[0].mon,
                tue: latestDisplayData[0].tue,
                hasSubjectData: !!(latestDisplayData[0].mon?.subject || latestDisplayData[0].tue?.subject)
              } : 'no sample available'
            })
            
            if (Array.isArray(latestDisplayData)) {
              setTimetableData(latestDisplayData)
              console.log('✅ フォールバック時のsetTimetableData実行完了:', {
                setDataLength: latestDisplayData.length,
                dataStructureCheck: latestDisplayData.slice(0, 2).map(period => ({
                  period: period.period,
                  monHasData: !!(period.mon?.subject),
                  tueHasData: !!(period.tue?.subject),
                  monData: period.mon,
                  tueData: period.tue
                }))
              })
              
              // 適合率計算
              if (teachers.length > 0 && subjects.length > 0) {
                const compliance = timetableUtils.calculateComplianceRate(
                  latestTimetableData,
                  teachers,
                  subjects
                )
                setComplianceData(compliance)
                
                // 違反情報を表示データに追加
                const dataWithViolations = timetableUtils.addViolationInfo(
                  latestDisplayData,
                  compliance.violations
                )
                setTimetableData(dataWithViolations)
              }
              
              toast({
                title: '時間割を自動修正',
                description: '指定された時間割が見つからないため、最新の有効な時間割を表示しています。',
                variant: 'default',
              })
              
              return // 正常終了
            }
          }
        } catch (fallbackError) {
          console.error('最新時間割の取得も失敗:', fallbackError)
        }
      }
      
      // フォールバック: モックデータを表示
      setTimetableData(mockTimetableData)
      toast({
        title: '注意',
        description: 'サーバーから時間割データを取得できませんでした。デモデータを表示しています。',
        variant: 'destructive',
      })
    } finally {
      setIsLoadingDetail(false)
    }
  }

  // 初期化時に学校設定と時間割一覧を取得
  useEffect(() => {
    if (token) {
      loadSchoolSettings()
      loadTimetables()
      loadValidationData()
    }
  }, [token, getFreshToken])

  // 学年が変更された時に時間割データを更新
  useEffect(() => {
    if (selectedTimetableDetail) {
      // 時間割データを表示用に変換（二重ネスト対応）
      const timetableData =
        selectedTimetableDetail.timetable?.timetable || selectedTimetableDetail.timetable

      console.log('学年変更時のデータ変換:', {
        selectedGrade: selectedGrade,
        gradeAsNumber: parseInt(selectedGrade),
        timetableData: timetableData,
        mondayFirstPeriod: timetableData?.monday?.[0],
      })

      const displayData = timetableUtils.convertToDisplayFormat(
        timetableData,
        parseInt(selectedGrade),
        selectedClass
      )

      console.log('学年変更後の表示データ:', displayData)

      // displayDataが配列であることを確認
      if (Array.isArray(displayData)) {
        setTimetableData(displayData)

        // 適合率計算（学年変更時）
        if (teachers.length > 0 && subjects.length > 0) {
          const timetableDataForValidation =
            selectedTimetableDetail.timetable?.timetable || selectedTimetableDetail.timetable
          const compliance = timetableUtils.calculateComplianceRate(
            timetableDataForValidation,
            teachers,
            subjects
          )
          setComplianceData(compliance)

          // 違反情報を表示データに追加
          const dataWithViolations = timetableUtils.addViolationInfo(
            displayData,
            compliance.violations
          )
          setTimetableData(dataWithViolations)
        }
      } else {
        console.error('学年変更後のデータが配列ではありません:', displayData)
        setTimetableData(mockTimetableData) // フォールバック
      }
    }
  }, [selectedGrade, selectedClass, selectedTimetableDetail, subjects, teachers])

  // 学年が変更されたときにクラス選択をリセット
  useEffect(() => {
    if (selectedClass > getClassesForGrade(selectedGrade)) {
      setSelectedClass(1)
    }
  }, [selectedGrade, getClassesForGrade, selectedClass])

  // 教師ごとの時間割データを生成する関数
  const generateTeacherSchedule = (teacherName: string): TeacherSchedule[] => {
    const schedule: TeacherSchedule[] = []

    for (let period = 1; period <= 6; period++) {
      const periodData: TeacherSchedule = {
        period: period.toString(),
        mon: null,
        tue: null,
        wed: null,
        thu: null,
        fri: null,
        sat: null,
      }

      // 各曜日をチェックして、該当教師の授業を探す
      const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
      days.forEach(day => {
        const periodRow = timetableData.find(row => row.period === period.toString())
        if (periodRow) {
          const cellData = periodRow[day] as { subject: string; teacher: string } | null
          if (cellData && cellData.teacher === teacherName) {
            // 現在は1年1組固定だが、実際は複数学年・クラスに対応
            periodData[day] = {
              grade: selectedGrade,
              class: '1',
              subject: cellData.subject,
            }
          }
        }
      })

      schedule.push(periodData)
    }

    return schedule
  }

  const handleDragStart = (
    e: React.DragEvent,
    subject: string,
    teacher: string,
    period: string,
    day: string,
    grade: number,
    classNumber: number
  ) => {
    setDraggedItem({ subject, teacher, period, day, grade, classNumber })
    e.dataTransfer.effectAllowed = 'move'
    console.log(
      `📦 ドラッグ開始: ${grade}年${classNumber}組 ${period}時限目${day}曜日 ${subject}(${teacher})`
    )
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (
    e: React.DragEvent,
    targetPeriod: string,
    targetDay: string,
    targetGrade: number,
    targetClassNumber: number
  ) => {
    e.preventDefault()

    if (!draggedItem) return

    console.log(
      `📥 ドロップ先: ${targetGrade}年${targetClassNumber}組 ${targetPeriod}時限目${targetDay}曜日`
    )

    // 同じクラス内での移動の場合は既存のロジックを使用
    if (draggedItem.grade === targetGrade && draggedItem.classNumber === targetClassNumber) {
      const newTimetableData = [...timetableData]

      // ドラッグ元とドロップ先のインデックスを取得
      const draggedPeriodIndex = newTimetableData.findIndex(
        row => row.period === draggedItem.period
      )
      const targetPeriodIndex = newTimetableData.findIndex(row => row.period === targetPeriod)

      if (draggedPeriodIndex === -1 || targetPeriodIndex === -1) return

      // ドラッグ元とドロップ先の値を取得
      const draggedValue =
        newTimetableData[draggedPeriodIndex][draggedItem.day as keyof (typeof newTimetableData)[0]]
      const targetValue =
        newTimetableData[targetPeriodIndex][targetDay as keyof (typeof newTimetableData)[0]]

      // 値を入れ替え
      newTimetableData[draggedPeriodIndex] = {
        ...newTimetableData[draggedPeriodIndex],
        [draggedItem.day]: targetValue,
      }

      newTimetableData[targetPeriodIndex] = {
        ...newTimetableData[targetPeriodIndex],
        [targetDay]: draggedValue,
      }

      // 既存の条件チェックロジックを実行
      applyChangesWithValidation(newTimetableData)
    } else {
      // クラス間移動の場合
      console.log(
        `🔄 クラス間移動: ${draggedItem.grade}年${draggedItem.classNumber}組 → ${targetGrade}年${targetClassNumber}組`
      )

      // TODO: クラス間移動はより複雑なデータ構造の変更が必要
      // 現在は単一クラスのデータしか管理していないため、
      // 将来的にマルチクラス対応時に実装
      toast({
        title: 'クラス間移動',
        description: `${draggedItem.grade}年${draggedItem.classNumber}組から${targetGrade}年${targetClassNumber}組への移動は今後対応予定です。`,
        variant: 'default',
      })
    }

    setDraggedItem(null)
  }

  // 変更の適用と条件チェックを分離
  const applyChangesWithValidation = (newTimetableData: TimetableSlotData[]) => {
    // リアルタイム条件チェック機能
    if (teachers.length > 0 && subjects.length > 0) {
      console.log('🔍 ドラッグ&ドロップ後の条件チェック開始')

      // 時間割制約のバリデーション
      const validation = timetableUtils.validateTimetableConstraints(
        newTimetableData,
        teachers,
        subjects
      )

      if (!validation.isValid && validation.conflicts.length > 0) {
        // 新しい違反が発生した場合、ユーザーに通知
        const conflictMessages = validation.conflicts.map(c => c.message).join('\n')
        toast({
          title: '⚠️ 制約違反が発生しました',
          description: conflictMessages,
          variant: 'destructive',
        })
      }

      // 適合率を再計算
      const compliance = timetableUtils.calculateComplianceRate(
        newTimetableData,
        teachers,
        subjects
      )
      setComplianceData(compliance)

      // 違反情報を表示データに追加
      const dataWithViolations = timetableUtils.addViolationInfo(
        newTimetableData,
        compliance.violations
      )
      setTimetableData(dataWithViolations)
    } else {
      setTimetableData(newTimetableData)
    }
  }

  const handleTeacherClick = (teacherName: string) => {
    setSelectedTeacher(teacherName)
    setCurrentView('teacher')
  }

  const handleViewTimetable = (timetable: TimetableListItem) => {
    console.log('🎯 handleViewTimetable呼び出し開始:', {
      timetableId: timetable.id,
      timetableName: timetable.name,
      currentView: currentView,
      selectedTimetable: selectedTimetable
    })
    setSelectedTimetable(timetable)
    console.log('🔄 setCurrentView("detail")実行前')
    setCurrentView('detail')
    console.log('🔄 setCurrentView("detail")実行後')
    console.log('🚀 loadTimetableDetail呼び出し準備:', timetable.id)
    loadTimetableDetail(timetable.id)
  }

  const handleEditTimetable = () => {
    setCurrentView('edit')
    setTempTitle(selectedTimetable?.name || '')
  }

  const handleBackToList = () => {
    setCurrentView('list')
    setSelectedTimetable(null)
    setSelectedTeacher(null)
  }

  const handleBackToDetail = () => {
    setCurrentView('detail')
    setSelectedTeacher(null)
  }

  const handleTitleEdit = () => {
    setEditingTitle(true)
    setTempTitle(selectedTimetable?.name || '')
  }

  const handleTitleSave = async () => {
    if (!selectedTimetable || !tempTitle.trim()) {
      setEditingTitle(false)
      return
    }

    setIsSaving(true)
    try {
      await timetableApi.updateTimetable(
        selectedTimetable.id,
        { name: tempTitle.trim() },
        { token, getFreshToken }
      )

      // 時間割一覧を更新
      const updatedTimetables = timetables.map(t =>
        t.id === selectedTimetable.id ? { ...t, name: tempTitle.trim() } : t
      )
      setTimetables(updatedTimetables)
      setSelectedTimetable({ ...selectedTimetable, name: tempTitle.trim() })

      toast({
        title: '保存完了',
        description: '時間割名が正常に更新されました。',
      })
    } catch (error) {
      console.error('時間割の更新に失敗しました:', error)
      toast({
        title: '保存エラー',
        description: '時間割名の更新に失敗しました。',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
      setEditingTitle(false)
    }
  }

  const handleTitleCancel = () => {
    setEditingTitle(false)
    setTempTitle(selectedTimetable?.name || '')
  }

  if (currentView === 'list') {
    return (
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold'>時間割参照</h1>
            <p className='text-muted-foreground mt-2'>生成済みの時間割を参照・編集できます</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center space-x-2'>
              <Calendar className='w-5 h-5' />
              <span>生成済み時間割一覧</span>
            </CardTitle>
            <CardDescription>時間割を選択して詳細を確認できます</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingTimetables ? (
              <div className='flex items-center justify-center py-8'>
                <Loader2 className='w-6 h-6 animate-spin mr-2' />
                <span>時間割一覧を読み込んでいます...</span>
              </div>
            ) : (
              <div className='space-y-4'>
                {timetables.map(timetable => (
                  <div
                    key={timetable.id}
                    className='flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors'
                  >
                    <div className='flex items-center space-x-4'>
                      <div>
                        <h3 className='font-semibold'>{timetable.name}</h3>
                        <p className='text-sm text-muted-foreground'>
                          作成日: {timetable.createdAt}
                        </p>
                      </div>
                      <Badge variant={timetable.status === 'active' ? 'default' : 'secondary'}>
                        {timetable.status === 'active' ? '運用中' : '下書き'}
                      </Badge>
                    </div>
                    <Button
                      onClick={() => {
                        console.log('🔘 詳細を見るボタンクリック検出:', {
                          timetableId: timetable.id,
                          timetableName: timetable.name,
                          isLoadingDetail: isLoadingDetail,
                          buttonDisabled: isLoadingDetail
                        })
                        handleViewTimetable(timetable)
                      }}
                      disabled={isLoadingDetail}
                    >
                      <Eye className='w-4 h-4 mr-2' />
                      詳細を見る
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (currentView === 'teacher' && selectedTeacher) {
    const teacherSchedule = generateTeacherSchedule(selectedTeacher)

    return (
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-4'>
            <Button variant='ghost' onClick={handleBackToDetail}>
              <ArrowLeft className='w-4 h-4 mr-2' />
              時間割に戻る
            </Button>
            <div>
              <h1 className='text-3xl font-bold flex items-center space-x-2'>
                <User className='w-8 h-8' />
                <span>{selectedTeacher}の時間割</span>
              </h1>
              <p className='text-muted-foreground mt-2'>{selectedTimetable?.name}</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>担当授業一覧</CardTitle>
            <CardDescription>各時限での担当クラスと科目を表示しています</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-16'>時限</TableHead>
                    <TableHead className='w-32'>月</TableHead>
                    <TableHead className='w-32'>火</TableHead>
                    <TableHead className='w-32'>水</TableHead>
                    <TableHead className='w-32'>木</TableHead>
                    <TableHead className='w-32'>金</TableHead>
                    <TableHead className='w-32'>土</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teacherSchedule.map(row => (
                    <TableRow key={row.period}>
                      <TableCell className='font-medium'>{row.period}</TableCell>
                      {['mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map(day => {
                        const cellData = row[day as keyof typeof row] as {
                          grade: string
                          class: string
                          subject: string
                        } | null
                        return (
                          <TableCell key={day}>
                            {cellData ? (
                              <div className='flex flex-col p-2 bg-blue-50 rounded'>
                                <div className='font-medium text-sm'>{cellData.subject}</div>
                                <div className='text-xs text-muted-foreground'>
                                  {cellData.grade}年{cellData.class}組
                                </div>
                              </div>
                            ) : (
                              <div className='text-center text-gray-400 text-sm'>空き時間</div>
                            )}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (currentView === 'detail' || currentView === 'edit') {
    return (
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-4'>
            <Button variant='ghost' onClick={handleBackToList}>
              <ArrowLeft className='w-4 h-4 mr-2' />
              一覧に戻る
            </Button>
            <div>
              {currentView === 'edit' && editingTitle ? (
                <div className='flex items-center space-x-2'>
                  <Input
                    value={tempTitle}
                    onChange={e => setTempTitle(e.target.value)}
                    className='text-2xl font-bold h-auto py-1'
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleTitleSave()
                      if (e.key === 'Escape') handleTitleCancel()
                    }}
                  />
                  <Button size='sm' onClick={handleTitleSave} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                        保存中...
                      </>
                    ) : (
                      '保存'
                    )}
                  </Button>
                  <Button size='sm' variant='outline' onClick={handleTitleCancel}>
                    キャンセル
                  </Button>
                </div>
              ) : (
                <div className='flex items-center space-x-2'>
                  <h1 className='text-3xl font-bold'>{selectedTimetable?.name}</h1>
                  {currentView === 'edit' && (
                    <Button variant='ghost' size='sm' onClick={handleTitleEdit}>
                      <Edit className='w-4 h-4' />
                    </Button>
                  )}
                </div>
              )}
              <p className='text-muted-foreground mt-2'>
                {currentView === 'edit' ? '時間割を編集中' : '時間割の詳細表示'}
              </p>
            </div>
          </div>
          {currentView === 'detail' && (
            <Button onClick={handleEditTimetable}>
              <Edit className='w-4 h-4 mr-2' />
              編集する
            </Button>
          )}
          {currentView === 'edit' && (
            <div className='space-x-2'>
              <Button variant='outline' onClick={() => setCurrentView('detail')}>
                キャンセル
              </Button>
              <Button>保存</Button>
            </div>
          )}
        </div>

        {/* 適合率ヘッダー */}
        {complianceData && (
          <Card className='mb-6'>
            <CardHeader>
              <div className='flex justify-between items-center'>
                <div className='flex items-center space-x-4'>
                  <div className='text-right'>
                    <div
                      className={`text-2xl font-bold ${
                        complianceData.overallRate >= 95
                          ? 'text-green-600'
                          : complianceData.overallRate >= 80
                            ? 'text-yellow-600'
                            : 'text-red-600'
                      }`}
                    >
                      {complianceData.overallRate}%
                    </div>
                    <div className='text-sm text-muted-foreground'>全体適合率</div>
                  </div>

                  {complianceData.violations.length > 0 && (
                    <div className='flex items-center space-x-2'>
                      <div className='h-2 w-2 bg-red-500 rounded-full animate-pulse'></div>
                      <div className='text-sm'>
                        <span className='font-medium text-red-600'>
                          {complianceData.violations.filter(v => v.severity === 'high').length}
                        </span>
                        <span className='text-muted-foreground'> 重要 / </span>
                        <span className='font-medium text-yellow-600'>
                          {complianceData.violations.filter(v => v.severity === 'medium').length}
                        </span>
                        <span className='text-muted-foreground'> 中程度 / </span>
                        <span className='font-medium text-gray-500'>
                          {complianceData.violations.filter(v => v.severity === 'low').length}
                        </span>
                        <span className='text-muted-foreground'> 軽微</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 自動補完ボタン */}
                {currentView === 'edit' && (
                  <Button
                    onClick={() => {
                      if (teachers.length > 0 && subjects.length > 0) {
                        const filledData = timetableUtils.fillEmptySlots(
                          timetableData,
                          teachers,
                          subjects,
                          parseInt(selectedGrade)
                        )
                        setTimetableData(filledData)
                        toast({
                          title: '自動補完完了',
                          description: '空きスロットを自動的に補完しました。',
                        })
                      }
                    }}
                    variant='outline'
                    size='sm'
                  >
                    空きスロット自動補完
                  </Button>
                )}
              </div>
            </CardHeader>
          </Card>
        )}

        {/* 全学年・全クラス並列表示 */}
        <div className='space-y-8'>
          {/* 学年ごとの表示 */}
          {[1, 2, 3].map(grade => {
            const gradeClassCount = getClassesForGrade(grade.toString())
            return (
              <Card key={grade} className='overflow-x-auto'>
                <CardHeader>
                  <CardTitle className='text-xl font-bold'>{grade}年生</CardTitle>
                  <CardDescription>横2クラス並列表示 - ドラッグ&ドロップで編集可能</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingDetail ? (
                    <div className='flex items-center justify-center py-8'>
                      <Loader2 className='w-6 h-6 animate-spin mr-2' />
                      <span>時間割詳細を読み込んでいます...</span>
                    </div>
                  ) : (
                    <div
                      className='grid gap-6'
                      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(600px, 1fr))' }}
                    >
                      {Array.from({ length: gradeClassCount }, (_, classIndex) => {
                        const classNumber = classIndex + 1
                        // 🚨 修正: クラスごとに個別にデータを変換
                        const rawTimetableData = selectedTimetableDetail?.timetable?.timetable || selectedTimetableDetail?.timetable
                        const classData = timetableUtils.convertToDisplayFormat(
                          rawTimetableData,
                          grade,
                          classNumber
                        )
                        
                        console.log(`🔍 ${grade}年${classNumber}組専用データ変換:`, {
                          grade: grade,
                          classNumber: classNumber,
                          hasValidData: Array.isArray(classData) && classData.some(row => 
                            ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'].some(day => 
                              row[day]?.subject || row[day]?.teacher
                            )
                          )
                        })

                        return (
                          <div key={classNumber} className='border rounded-lg p-4'>
                            <h4 className='font-semibold mb-4 text-center'>
                              {grade}年{classNumber}組
                            </h4>
                            <Table className='text-xs'>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className='w-12 text-center'>時限</TableHead>
                                  <TableHead className='w-20 text-center'>月</TableHead>
                                  <TableHead className='w-20 text-center'>火</TableHead>
                                  <TableHead className='w-20 text-center'>水</TableHead>
                                  <TableHead className='w-20 text-center'>木</TableHead>
                                  <TableHead className='w-20 text-center'>金</TableHead>
                                  <TableHead className='w-20 text-center'>土</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {Array.isArray(classData) ? (
                                  classData.map(row => (
                                    <TableRow key={row.period}>
                                      <TableCell className='font-medium text-center'>
                                        {row.period}
                                      </TableCell>
                                      {['mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map(day => {
                                        const cellData = row[day as keyof typeof row] as {
                                          subject: string
                                          teacher: string
                                          hasViolation?: boolean
                                          violationSeverity?: 'high' | 'medium' | 'low'
                                          violations?: Array<{
                                            message: string
                                            type: string
                                            severity: string
                                          }>
                                          isAutoFilled?: boolean
                                        } | null

                                        // 違反レベルに応じたスタイル
                                        const getViolationStyle = () => {
                                          if (!cellData?.hasViolation) return ''
                                          switch (cellData.violationSeverity) {
                                            case 'high':
                                              return 'border-2 border-red-500 bg-red-50'
                                            case 'medium':
                                              return 'border-2 border-yellow-500 bg-yellow-50'
                                            case 'low':
                                              return 'border-2 border-gray-400 bg-gray-50'
                                            default:
                                              return ''
                                          }
                                        }

                                        // 自動補完スタイル
                                        const getAutoFillStyle = () => {
                                          return cellData?.isAutoFilled
                                            ? 'bg-blue-50 border-blue-200'
                                            : ''
                                        }

                                        return (
                                          <TableCell key={day} className='p-1'>
                                            {cellData ? (
                                              currentView === 'edit' ? (
                                                <button
                                                  type='button'
                                                  aria-label={`${cellData.subject} - ${cellData.teacher}の授業をドラッグして移動`}
                                                  className={`p-2 border border-dashed border-gray-300 rounded cursor-move hover:bg-gray-50 transition-colors min-h-[50px] flex flex-col justify-center ${getViolationStyle()} ${getAutoFillStyle()}`}
                                                  draggable
                                                  onDragStart={e =>
                                                    handleDragStart(
                                                      e,
                                                      cellData.subject,
                                                      cellData.teacher,
                                                      row.period,
                                                      day,
                                                      grade,
                                                      classNumber
                                                    )
                                                  }
                                                  onDragOver={handleDragOver}
                                                  onDrop={e =>
                                                    handleDrop(
                                                      e,
                                                      row.period,
                                                      day,
                                                      grade,
                                                      classNumber
                                                    )
                                                  }
                                                  onKeyDown={e => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                      e.preventDefault()
                                                      // キーボードでの操作のため、詳細表示機能を追加可能
                                                    }
                                                  }}
                                                  title={cellData.violations
                                                    ?.map(v => v.message)
                                                    .join('\n')}
                                                >
                                                  <div className='font-medium text-xs'>
                                                    {cellData.subject}
                                                  </div>
                                                  <div className='text-xs text-muted-foreground'>
                                                    {cellData.teacher}
                                                  </div>
                                                  {cellData.hasViolation && (
                                                    <div className='mt-1 text-xs font-medium text-red-600'>
                                                      ⚠️ {cellData.violations?.length}件
                                                    </div>
                                                  )}
                                                  {cellData.isAutoFilled && (
                                                    <div className='mt-1 text-xs font-medium text-blue-600'>
                                                      🤖 自動
                                                    </div>
                                                  )}
                                                </button>
                                              ) : (
                                                <div
                                                  className={`relative ${getViolationStyle()} ${getAutoFillStyle()} p-2 rounded min-h-[50px] flex flex-col justify-center`}
                                                  title={cellData.violations
                                                    ?.map(v => v.message)
                                                    .join('\n')}
                                                >
                                                  <div className='font-medium text-xs'>
                                                    {cellData.subject}
                                                  </div>
                                                  <button
                                                    type='button'
                                                    className='text-xs text-blue-600 hover:text-blue-800 hover:underline text-left'
                                                    onClick={() =>
                                                      handleTeacherClick(cellData.teacher)
                                                    }
                                                  >
                                                    {cellData.teacher}
                                                  </button>
                                                  {cellData.hasViolation && (
                                                    <div className='absolute top-1 right-1'>
                                                      <div
                                                        className={`w-2 h-2 rounded-full ${
                                                          cellData.violationSeverity === 'high'
                                                            ? 'bg-red-500'
                                                            : cellData.violationSeverity ===
                                                                'medium'
                                                              ? 'bg-yellow-500'
                                                              : 'bg-gray-400'
                                                        } animate-pulse`}
                                                      ></div>
                                                    </div>
                                                  )}
                                                  {cellData.isAutoFilled && (
                                                    <div className='absolute bottom-1 right-1'>
                                                      <div className='text-xs text-blue-600'>
                                                        🤖
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>
                                              )
                                            ) : (
                                              currentView === 'edit' && (
                                                <button
                                                  type='button'
                                                  aria-label={`${row.period}時限目 ${day}曜日の空きスロット - 授業をドロップして配置`}
                                                  className='p-2 border border-dashed border-gray-200 rounded min-h-[50px] hover:bg-gray-50 transition-colors flex items-center justify-center'
                                                  onDragOver={handleDragOver}
                                                  onDrop={e =>
                                                    handleDrop(
                                                      e,
                                                      row.period,
                                                      day,
                                                      grade,
                                                      classNumber
                                                    )
                                                  }
                                                  onKeyDown={e => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                      e.preventDefault()
                                                      // キーボードでの操作のため、授業追加機能を追加可能
                                                    }
                                                  }}
                                                >
                                                  <div className='text-xs text-gray-400 text-center'>
                                                    空き
                                                  </div>
                                                </button>
                                              )
                                            )}
                                          </TableCell>
                                        )
                                      })}
                                    </TableRow>
                                  ))
                                ) : (
                                  <TableRow>
                                    <TableCell colSpan={7} className='text-center py-8 text-xs'>
                                      時間割データがありません
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* 違反情報の凡例 */}
        {complianceData && complianceData.violations.length > 0 && (
          <Card className='mt-6'>
            <CardContent className='p-4'>
              <h4 className='font-medium text-sm mb-3'>🔍 問題箇所の見方</h4>
              <div className='flex flex-wrap gap-4 text-xs'>
                <div className='flex items-center space-x-2'>
                  <div className='w-4 h-4 bg-red-500 rounded'></div>
                  <span>重要な問題（教師の重複など）</span>
                </div>
                <div className='flex items-center space-x-2'>
                  <div className='w-4 h-4 bg-yellow-500 rounded'></div>
                  <span>中程度の問題（担当科目の不一致など）</span>
                </div>
                <div className='flex items-center space-x-2'>
                  <div className='w-4 h-4 bg-gray-400 rounded'></div>
                  <span>軽微な問題（空きコマなど）</span>
                </div>
                <div className='flex items-center space-x-2'>
                  <div className='w-4 h-4 bg-blue-500 rounded'></div>
                  <span>自動補完済み（🤖マーク）</span>
                </div>
              </div>
              <p className='text-xs text-muted-foreground mt-2'>
                セルにマウスカーソルを置くと詳細な問題内容が表示されます。
              </p>
            </CardContent>
          </Card>
        )}

        {/* 編集時のヘルプ */}
        {currentView === 'edit' && (
          <Card className='mt-6'>
            <CardContent className='p-4'>
              <p className='text-sm text-blue-800'>
                💡
                科目をドラッグ&ドロップで移動できます。クラス間での入れ替えも可能です。問題がある場合は自動的にエラーメッセージが表示されます。
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return null
}
