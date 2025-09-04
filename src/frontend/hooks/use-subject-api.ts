import type { Classroom, Subject } from '@shared/schemas'
import { useCallback, useEffect, useState } from 'react'
import { classroomApi, subjectApi } from '../lib/api'
import { useToast } from './use-toast'

export const useSubjectApi = (
  token: string | null,
  _getFreshToken?: () => Promise<string | null>
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
      console.log('🔍 統一型安全APIで教室データ読み込み開始')
      const result = await classroomApi.getClassrooms({ token })
      const classrooms = Array.isArray(result.classrooms) ? result.classrooms : []
      console.log('✅ 教室データ読み込み成功:', classrooms.length, '件')
      setClassrooms(classrooms)
    } catch (error) {
      console.error('❌ 教室データの読み込みに失敗:', error)
      // 教室データの読み込みエラーは重要ではないので継続
      setClassrooms([])
    } finally {
      setIsLoading(false)
    }
  }, [token])

  // 教科保存
  const saveSubject = useCallback(
    async (subjectData: Partial<Subject>, isNewSubject: boolean) => {
      setIsSaving(true)
      try {
        let result: Subject

        if (isNewSubject) {
          const processedData = {
            ...subjectData,
            grades:
              subjectData.grades?.map(grade =>
                typeof grade === 'string' ? parseInt(grade, 10) : grade
              ) || [],
          }
          console.log('➕ 統一型安全APIで教科新規作成:', processedData)
          const createResult = await subjectApi.createSubject(
            processedData as Omit<Subject, 'id'>,
            { token }
          )
          result = createResult.data
          console.log('✅ 教科新規作成成功:', result)
          toast({
            title: '保存完了',
            description: '新しい教科を追加しました',
          })
        } else {
          if (!subjectData.id) {
            throw new Error('教科IDが見つかりません')
          }
          const processedData = {
            ...subjectData,
            grades:
              subjectData.grades?.map(grade =>
                typeof grade === 'string' ? parseInt(grade, 10) : grade
              ) || [],
          }
          console.log('🔄 統一型安全APIで教科更新:', processedData)
          const updateResult = await subjectApi.updateSubject(subjectData.id, processedData, {
            token,
          })
          result = updateResult.data
          console.log('✅ 教科更新成功:', result)
          toast({
            title: '保存完了',
            description: '教科情報を更新しました',
          })
        }

        return result
      } catch (error) {
        console.error('❌ 教科の保存に失敗:', error)

        if (error instanceof Error) {
          toast({
            title: '保存エラー',
            description: `入力データが無効です: ${error.validationErrors.map(e => e.message).join(', ')}`,
            variant: 'destructive',
          })
        } else {
          toast({
            title: 'エラー',
            description: '教科の保存に失敗しました',
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
