import type { SchoolSettings, Subject, Teacher } from '@shared/schemas'
import { useCallback, useEffect, useState } from 'react'
import { schoolApi, subjectApi, teachersApi as teacherApi } from '../lib/api'
import { useToast } from './use-toast'

export const useTeacherApi = (
  token: string | null,
  _getFreshToken?: () => Promise<string | null>
) => {
  const { toast } = useToast()

  // データ状態
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>({
    grade1Classes: 4,
    grade2Classes: 3,
    grade3Classes: 3,
    dailyPeriods: 6,
    saturdayPeriods: 4,
  })

  // ローディング状態
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // 初期データ読み込み
  const loadInitialData = useCallback(async () => {
    if (!token) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      console.log('🔍 統一型安全APIで初期データ読み込み開始')
      const [subjectsResult, settingsResult] = await Promise.all([
        subjectApi.getSubjects({ token }),
        schoolApi.getSettings({ token }),
      ])

      console.log('✅ 初期データ読み込み成功:', { subjectsResult, settingsResult })

      // 統一APIからはレスポンス構造が統一されている
      if (subjectsResult?.subjects && Array.isArray(subjectsResult.subjects)) {
        setSubjects(subjectsResult.subjects)
      } else {
        console.warn('予期しないsubjectsレスポンス構造:', subjectsResult)
        setSubjects([])
      }

      if (settingsResult && typeof settingsResult === 'object') {
        setSchoolSettings(settingsResult)
      }
    } catch (error) {
      console.log('❌ 初期データの読み込みに失敗:', error)
      console.log('初期データの読み込みに失敗しました')
      // エラー時はデフォルト値を設定
      setSubjects([])
    } finally {
      setIsLoading(false)
    }
  }, [token])

  // 教師保存
  const saveTeacher = useCallback(
    async (teacherData: Partial<Teacher>, isNewTeacher: boolean) => {
      if (!token) {
        throw new Error('認証トークンが見つかりません')
      }

      setIsSaving(true)
      try {
        let result: Teacher

        if (isNewTeacher) {
          console.log('➕ 統合型安全APIで教師新規作成:', teacherData)
          // 統合APIクライアントは完全な型安全バリデーション付き
          result = await teacherApi.createTeacher(teacherData, { token })
          console.log('✅ 教師新規作成成功:', result)
          toast({
            title: '保存完了',
            description: '新しい教師を追加しました',
          })
        } else {
          console.log('🔍 既存教師更新のデバッグ:', {
            teacherDataId: teacherData.id,
            teacherDataType: typeof teacherData.id,
            hasId: !!teacherData.id,
            teacherData: teacherData,
          })

          if (!teacherData.id) {
            console.error('❌ 教師IDが見つかりません:', {
              teacherData,
              keys: Object.keys(teacherData),
            })
            throw new Error('教師IDが見つかりません')
          }
          console.log('🔄  統合型安全APIで教師更新:', teacherData)
          result = await teacherApi.updateTeacher(
            teacherData.id,
            {
              name: teacherData.name,
              subjects: teacherData.subjects,
              grades: (teacherData.grades || []).map(grade =>
                typeof grade === 'string' ? parseInt(grade, 10) : grade
              ),
              assignmentRestrictions: teacherData.assignmentRestrictions,
            },
            { token }
          )
          console.log('✅ 教師更新成功:', result)
          toast({
            title: '保存完了',
            description: '教師情報を更新しました',
          })
        }

        return result
      } catch (error) {
        console.log('❌ 教師の保存に失敗:', error)

        if (error instanceof Error && 'validationErrors' in error) {
          toast({
            title: '保存エラー',
            description: `入力データが無効です: ${(error as { validationErrors: { message: string }[] }).validationErrors.map(e => e.message).join(', ')}`,
            variant: 'destructive',
          })
        } else {
          toast({
            title: 'エラー',
            description: '教師の保存に失敗しました',
            variant: 'destructive',
          })
        }
        throw error
      } finally {
        setIsSaving(false)
      }
    },
    [toast, token]
  )

  // 初期化
  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  return {
    // データ
    subjects,
    schoolSettings,

    // 状態
    isSaving,
    isLoading,

    // アクション
    saveTeacher,
    loadInitialData,

    // ヘルパー
    availableGrades: ['1', '2', '3'],
  }
}
