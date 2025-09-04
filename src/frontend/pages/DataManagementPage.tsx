import type { Classroom, SchoolSettings, Subject, Teacher, EnhancedSchoolSettings } from '@shared/schemas'
import { Upload } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { ClassroomsSection } from '../components/data-management/ClassroomsSection'
import { ConditionsSection } from '../components/data-management/ConditionsSection'
import { SchoolSettingsSection } from '../components/data-management/SchoolSettingsSection'
import { SubjectsSection } from '../components/data-management/SubjectsSection'
import { TeachersSection } from '../components/data-management/TeachersSection'
import { Button } from '../components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { useAuth } from '../hooks/use-auth'
import { useToast } from '../hooks/use-toast'
import { schoolApi, teacherApi, subjectApi, classroomApi } from '../lib/api'

export function DataManagementPage() {
  const { token, getFreshToken } = useAuth()
  const { toast } = useToast()

  // School settings state  
  const [classSettings, setClassSettings] = useState<EnhancedSchoolSettings | SchoolSettings>({
    grade1Classes: 0,
    grade2Classes: 0,
    grade3Classes: 0,
    dailyPeriods: 0,
    saturdayPeriods: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [showOfflineButton, setShowOfflineButton] = useState(false)
  const [hasShownTimeoutError, setHasShownTimeoutError] = useState(false)

  // Teachers state
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [isTeachersLoading, setIsTeachersLoading] = useState(true)

  // Subjects state
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [isSubjectsLoading, setIsSubjectsLoading] = useState(true)

  // Classrooms state
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [isClassroomsLoading, setIsClassroomsLoading] = useState(true)

  // Conditions state
  const [conditions, setConditions] = useState('')
  const [isConditionsLoading, setIsConditionsLoading] = useState(true)

  // Helper function to normalize teacher data
  const normalizeTeachers = useCallback((teachersData: Teacher[]) => {
    return teachersData.map(teacher => {
      let subjects = []
      let grades = []

      // subjects の安全なパース
      if (Array.isArray(teacher.subjects)) {
        subjects = teacher.subjects
          .map(s => (typeof s === 'string' ? s : s && typeof s === 'object' && s.name ? s.name : s))
          .filter(s => typeof s === 'string')
      } else if (typeof teacher.subjects === 'string') {
        try {
          const parsed = JSON.parse(teacher.subjects || '[]')
          subjects = Array.isArray(parsed)
            ? parsed
                .map(s =>
                  typeof s === 'string' ? s : s && typeof s === 'object' && s.name ? s.name : s
                )
                .filter(s => typeof s === 'string')
            : []
        } catch (_e) {
          console.warn('Failed to parse teacher subjects:', teacher.subjects)
          subjects = []
        }
      }

      // grades の安全なパース
      if (Array.isArray(teacher.grades)) {
        grades = teacher.grades.filter(g => typeof g === 'string')
      } else if (typeof teacher.grades === 'string') {
        try {
          const parsed = JSON.parse(teacher.grades || '[]')
          grades = Array.isArray(parsed) ? parsed.filter(g => typeof g === 'string') : []
        } catch (_e) {
          console.warn('Failed to parse teacher grades:', teacher.grades)
          grades = []
        }
      }

      return {
        ...teacher,
        subjects,
        grades,
      }
    })
  }, [])

  // 学校設定読み込み関数をメモ化
  const loadSettings = useCallback(async () => {
    console.log('loadSettings called, token:', !!token)

    if (!token) {
      console.log('No token available, skipping API call')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setShowOfflineButton(false)

    // 5秒後にオフラインボタンを表示
    const offlineButtonTimer = setTimeout(() => {
      setShowOfflineButton(true)
    }, 5000)

    // 10秒のタイムアウトを設定（一度だけ実行）
    const timeoutId = setTimeout(() => {
      console.warn('API call timeout after 10 seconds')
      setIsLoading(false)
      setShowOfflineButton(false)
      if (!hasShownTimeoutError) {
        setHasShownTimeoutError(true)
        // Remove toast to prevent infinite loop
        console.error('接続タイムアウト: デフォルト設定を使用します')
      }
    }, 10000)

    try {
      console.log('Calling schoolApi.getSettings...')

      const settings = (await Promise.race([
        schoolApi.getSettings({ token, getFreshToken }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 8000)),
      ])) as Promise<SchoolSettings>

      clearTimeout(timeoutId)
      clearTimeout(offlineButtonTimer)
      setClassSettings(settings)
      console.log('Settings loaded successfully:', settings)
    } catch (error: unknown) {
      clearTimeout(timeoutId)
      clearTimeout(offlineButtonTimer)
      console.error('Failed to load settings:', error)

      let errorDescription = 'デフォルト設定を使用します。'
      if (error instanceof Error && error.message.includes('timeout')) {
        errorDescription += ' バックエンドAPIがタイムアウトしました。'
      } else if (error instanceof Error && error.message.includes('500')) {
        errorDescription += ' バックエンドAPIが500エラーを返しました。'
      } else if (error instanceof Error && error.message.includes('CORS')) {
        errorDescription += ' CORS設定に問題があります。'
      } else if (error instanceof Error) {
        errorDescription += ` エラー: ${error.message}`
      } else {
        errorDescription += ' 不明なエラーが発生しました。'
      }

      if (!hasShownTimeoutError) {
        setHasShownTimeoutError(true)
        // Remove toast to prevent infinite loop
        console.error('設定読み込みエラー:', errorDescription)
      }

      // エラー時はデフォルト値を設定
      setClassSettings({
        grade1Classes: 4,
        grade2Classes: 4,
        grade3Classes: 3,
        dailyPeriods: 6,
        saturdayPeriods: 4,
      })
    } finally {
      setIsLoading(false)
      setShowOfflineButton(false)
    }
  }, [token, hasShownTimeoutError, getFreshToken])

  // Load school settings useEffect
  useEffect(() => {
    if (token) {
      loadSettings()
    }
  }, [token, loadSettings]) // loadSettingsを依存関係に含める

  // 教師読み込み関数をメモ化
  const loadTeachers = useCallback(async () => {
    if (!token) {
      setIsTeachersLoading(false)
      return
    }

    setIsTeachersLoading(true)

    try {
      const teachersResponse = await teacherApi.getTeachers({ token, getFreshToken })
      const teachers = Array.isArray(teachersResponse.teachers) ? teachersResponse.teachers : []
      const normalizedTeachers = normalizeTeachers(teachers)

      // Sort by order field, then by name if no order
      const sortedTeachers = normalizedTeachers.sort((a, b) => {
        if (a.order != null && b.order != null) {
          return a.order - b.order
        }
        if (a.order != null) return -1
        if (b.order != null) return 1
        return a.name.localeCompare(b.name)
      })
      setTeachers(sortedTeachers)
    } catch (error) {
      console.error('Error loading teachers:', error)
      // Remove toast to prevent infinite loop
      console.error('教師情報の読み込みに失敗しました')
    } finally {
      setIsTeachersLoading(false)
    }
  }, [token, getFreshToken, normalizeTeachers])

  // Load teachers useEffect
  useEffect(() => {
    if (token) {
      loadTeachers()
    }
  }, [token, loadTeachers]) // loadTeachersを依存関係に含める

  // 教科読み込み関数をメモ化
  const loadSubjects = useCallback(async () => {
    if (!token) {
      setIsSubjectsLoading(false)
      return
    }

    setIsSubjectsLoading(true)

    try {
      const subjectsResponse = await subjectApi.getSubjects({ token })
      const subjects = Array.isArray(subjectsResponse.subjects) ? subjectsResponse.subjects : []

      // Normalize subject data
      const normalizedSubjects = subjects.map(subject => {
        let targetGrades = []
        if (Array.isArray(subject.targetGrades)) {
          targetGrades = subject.targetGrades
        } else if (typeof subject.targetGrades === 'string') {
          try {
            targetGrades = JSON.parse(subject.targetGrades || '[]')
          } catch (_e) {
            console.warn('Failed to parse subject targetGrades:', subject.targetGrades)
            targetGrades = []
          }
        }
        return { ...subject, targetGrades }
      })

      // Sort by order field, then by name if no order
      const sortedSubjects = normalizedSubjects.sort((a, b) => {
        if (a.order != null && b.order != null) {
          return a.order - b.order
        }
        if (a.order != null) return -1
        if (b.order != null) return 1
        return a.name.localeCompare(b.name)
      })

      setSubjects(sortedSubjects)
    } catch (error) {
      console.error('Error loading subjects:', error)
      console.error('教科情報の読み込みに失敗しました')
      setSubjects([])
    } finally {
      setIsSubjectsLoading(false)
    }
  }, [token])

  // Load subjects useEffect
  useEffect(() => {
    if (token) {
      loadSubjects()
    }
  }, [token, loadSubjects])

  // 教室読み込み関数をメモ化
  const loadClassrooms = useCallback(async () => {
    if (!token) {
      setIsClassroomsLoading(false)
      return
    }

    setIsClassroomsLoading(true)

    try {
      const classroomsResponse = await classroomApi.getClassrooms({ token })
      const classrooms = Array.isArray(classroomsResponse.classrooms) ? classroomsResponse.classrooms : []

      // Sort by order field, then by name if no order
      const sortedClassrooms = classrooms.sort((a, b) => {
        if (a.order != null && b.order != null) {
          return a.order - b.order
        }
        if (a.order != null) return -1
        if (b.order != null) return 1
        return a.name.localeCompare(b.name)
      })

      setClassrooms(sortedClassrooms)
    } catch (error) {
      console.error('Error loading classrooms:', error)
      console.error('教室情報の読み込みに失敗しました')
      setClassrooms([])
    } finally {
      setIsClassroomsLoading(false)
    }
  }, [token])

  // Load classrooms useEffect
  useEffect(() => {
    if (token) {
      loadClassrooms()
    }
  }, [token, loadClassrooms])

  // 条件設定読み込み関数をメモ化
  const loadConditions = useCallback(async () => {
    if (!token) {
      setIsConditionsLoading(false)
      return
    }

    setIsConditionsLoading(true)

    try {
      // 一時的な簡易実装：デフォルト条件を設定
      setConditions('体育は午後に配置、数学は1時間目を避ける')
    } catch (error) {
      console.error('Error loading conditions:', error)
      console.error('条件設定の読み込みに失敗しました')
      setConditions('')
    } finally {
      setIsConditionsLoading(false)
    }
  }, [token])

  // Load conditions useEffect
  useEffect(() => {
    if (token) {
      loadConditions()
    }
  }, [token, loadConditions])

  const handleOfflineMode = () => {
    setIsLoading(false)
    setShowOfflineButton(false)
    toast({
      title: 'オフラインモード',
      description: '手動入力モードに切り替えました',
    })
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>データ登録</h1>
          <p className='text-muted-foreground mt-2'>学校の基本データを登録・管理します</p>
        </div>
        <Button className='flex items-center space-x-2'>
          <Upload className='w-4 h-4' />
          <span>Excelから一括登録</span>
        </Button>
      </div>

      <Tabs defaultValue='basic' className='space-y-6'>
        <TabsList className='grid w-full grid-cols-5'>
          <TabsTrigger value='basic'>基本設定</TabsTrigger>
          <TabsTrigger value='teachers'>教師情報</TabsTrigger>
          <TabsTrigger value='subjects'>教科情報</TabsTrigger>
          <TabsTrigger value='rooms'>教室情報</TabsTrigger>
          <TabsTrigger value='conditions'>条件設定</TabsTrigger>
        </TabsList>

        <TabsContent value='basic' className='space-y-6'>
          <SchoolSettingsSection
            settings={classSettings}
            onSettingsUpdate={setClassSettings}
            token={token}
            getFreshToken={getFreshToken}
            isLoading={isLoading}
            showOfflineButton={showOfflineButton}
            onOfflineMode={handleOfflineMode}
          />
        </TabsContent>

        <TabsContent value='teachers' className='space-y-6'>
          <TeachersSection
            teachers={teachers}
            onTeachersUpdate={setTeachers}
            token={token}
            getFreshToken={getFreshToken}
            isLoading={isTeachersLoading}
          />
        </TabsContent>

        <TabsContent value='subjects' className='space-y-6'>
          <SubjectsSection
            subjects={subjects}
            onSubjectsUpdate={setSubjects}
            token={token}
            getFreshToken={getFreshToken}
            isLoading={isSubjectsLoading}
          />
        </TabsContent>

        <TabsContent value='rooms' className='space-y-6'>
          <ClassroomsSection
            classrooms={classrooms}
            onClassroomsUpdate={setClassrooms}
            token={token}
            getFreshToken={getFreshToken}
            isLoading={isClassroomsLoading}
          />
        </TabsContent>

        <TabsContent value='conditions' className='space-y-6'>
          <ConditionsSection
            conditions={conditions}
            onConditionsUpdate={setConditions}
            token={token}
            getFreshToken={getFreshToken}
            isLoading={isConditionsLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
