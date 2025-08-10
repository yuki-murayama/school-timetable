import { useCallback, useEffect, useState } from 'react'
import type { Classroom, Subject } from '../../shared/types'
import { classroomApi, subjectApi } from '../lib/api'
import { useToast } from './use-toast'

export const useSubjectApi = (
  token: string | null,
  getFreshToken?: () => Promise<string | null>
) => {
  const { toast } = useToast()

  // データ状態
  const [classrooms, setClassrooms] = useState<Classroom[]>([])

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
      const classroomsData = await classroomApi.getClassrooms({ token, getFreshToken })
      const classrooms = Array.isArray(classroomsData) ? classroomsData : []
      setClassrooms(classrooms)
    } catch (error) {
      console.error('教室データの読み込みに失敗:', error)
      // 教室データの読み込みエラーは重要ではないので継続
      setClassrooms([])
    } finally {
      setIsLoading(false)
    }
  }, [token, getFreshToken])

  // 教科保存
  const saveSubject = useCallback(
    async (subjectData: Partial<Subject>, isNewSubject: boolean) => {
      setIsSaving(true)
      try {
        let result: Subject

        if (isNewSubject) {
          result = await subjectApi.createSubject(subjectData as Omit<Subject, 'id'>, {
            token,
            getFreshToken,
          })
          toast({
            title: '保存完了',
            description: '新しい教科を追加しました',
          })
        } else {
          if (!subjectData.id) {
            throw new Error('教科IDが見つかりません')
          }
          result = await subjectApi.updateSubject(subjectData.id, subjectData, {
            token,
            getFreshToken,
          })
          toast({
            title: '保存完了',
            description: '教科情報を更新しました',
          })
        }

        return result
      } catch (error) {
        console.error('教科の保存に失敗:', error)
        toast({
          title: 'エラー',
          description: '教科の保存に失敗しました',
          variant: 'destructive',
        })
        throw error
      } finally {
        setIsSaving(false)
      }
    },
    [token, getFreshToken, toast]
  )

  // 初期化
  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  return {
    // データ
    classrooms,

    // 状態
    isSaving,
    isLoading,

    // アクション
    saveSubject,
    loadInitialData,

    // ヘルパー
    availableGrades: [1, 2, 3],
  }
}
