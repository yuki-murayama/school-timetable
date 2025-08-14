import { useCallback, useEffect, useState } from 'react'
import type { SchoolSettings, Subject, Teacher } from '../../shared/types'
import { schoolApi, subjectApi, teacherApi } from '../lib/api'
import { useToast } from './use-toast'

export const useTeacherApi = (
  token: string | null,
  getFreshToken?: () => Promise<string | null>
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
    setIsLoading(true)
    try {
      const [subjectsData, settingsData] = await Promise.all([
        subjectApi.getSubjects({ token, getFreshToken }),
        schoolApi.getSettings({ token, getFreshToken }),
      ])

      setSubjects(subjectsData)
      setSchoolSettings(settingsData)
    } catch (error) {
      console.error('初期データの読み込みに失敗:', error)
      // Remove toast to prevent infinite loop
      console.error('初期データの読み込みに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [token]) // getFreshTokenは最新値を参照するため依存配列から除外

  // 教師保存
  const saveTeacher = useCallback(
    async (teacherData: Partial<Teacher>, isNewTeacher: boolean) => {
      setIsSaving(true)
      try {
        let result: Teacher

        if (isNewTeacher) {
          result = await teacherApi.createTeacher(teacherData as Omit<Teacher, 'id'>, {
            token,
            getFreshToken,
          })
          toast({
            title: '保存完了',
            description: '新しい教師を追加しました',
          })
        } else {
          if (!teacherData.id) {
            throw new Error('教師IDが見つかりません')
          }
          result = await teacherApi.updateTeacher(teacherData.id, teacherData, {
            token,
            getFreshToken,
          })
          toast({
            title: '保存完了',
            description: '教師情報を更新しました',
          })
        }

        return result
      } catch (error) {
        console.error('教師の保存に失敗:', error)
        toast({
          title: 'エラー',
          description: '教師の保存に失敗しました',
          variant: 'destructive',
        })
        throw error
      } finally {
        setIsSaving(false)
      }
    },
    [token] // getFreshTokenとtoastは最新値を参照するため除外
  )

  // 初期化
  useEffect(() => {
    if (token) {
      loadInitialData()
    }
  }, [token]) // loadInitialDataは安定化されたため除外

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
