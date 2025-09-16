import type { Classroom, Subject } from '@shared/schemas'
import { useCallback, useEffect, useState, useRef } from 'react'
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

  // 重複送信防止用の参照
  const savingRequestRef = useRef<Promise<Subject> | null>(null)
  const lastSaveTimeRef = useRef<number>(0)

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
      // 重複送信防止チェック
      const currentTime = Date.now()
      const timeSinceLastSave = currentTime - lastSaveTimeRef.current
      
      // 前回の保存から1秒以内の場合は重複送信として扱う
      if (timeSinceLastSave < 1000) {
        console.warn('🚫 重複送信を検出しました。前回の保存処理をそのまま使用します。', {
          timeSinceLastSave,
          subjectName: subjectData.name
        })
        
        // 進行中のリクエストがある場合はそれを返す
        if (savingRequestRef.current) {
          return await savingRequestRef.current
        }
      }

      // 進行中のリクエストがある場合は待機
      if (savingRequestRef.current) {
        console.warn('⏳ 既に進行中の保存処理があります。完了まで待機します。', {
          subjectName: subjectData.name
        })
        return await savingRequestRef.current
      }

      // 最終保存時刻を更新
      lastSaveTimeRef.current = currentTime
      
      setIsSaving(true)
      
      // 保存処理をPromiseとして作成
      const savePromise = (async (): Promise<Subject> => {
          let result: Subject

        if (isNewSubject) {
          // APIクライアント用にデータを正規化（レガシーフィールド対応）
          const normalizedData: any = {
            name: subjectData.name || '',
            school_id: subjectData.school_id || 'default', // 必須フィールド
          }

          // 週間授業数：複数フィールド対応
          const weeklyHours = (subjectData as any).weekly_hours || (subjectData as any).weeklyHours
          if (weeklyHours && weeklyHours !== 1) {
            normalizedData.weekly_hours = typeof weeklyHours === 'number' ? weeklyHours : Object.values(weeklyHours)[0] || 1
          }

          // 対象学年：複数フィールド対応（フロントエンドのフォームから送信される形式）
          const targetGrades = (subjectData as any).target_grades
          if (targetGrades) {
            if (typeof targetGrades === 'string') {
              // 既にJSON文字列の場合はそのまま使用
              normalizedData.target_grades = targetGrades
            } else if (Array.isArray(targetGrades) && targetGrades.length > 0) {
              // 配列の場合はJSON文字列に変換
              normalizedData.target_grades = JSON.stringify(targetGrades)
            }
          }
          
          // レガシー形式もサポート
          const targetGradesLegacy = (subjectData as any).targetGrades
          if (!normalizedData.target_grades && targetGradesLegacy) {
            if (typeof targetGradesLegacy === 'string') {
              normalizedData.target_grades = targetGradesLegacy
            } else if (Array.isArray(targetGradesLegacy)) {
              normalizedData.target_grades = JSON.stringify(targetGradesLegacy)
            }
          }

          // 特別教室：複数フィールド対応
          const specialClassroom = (subjectData as any).special_classroom || (subjectData as any).specialClassroom
          if (specialClassroom && specialClassroom.trim && specialClassroom.trim()) {
            normalizedData.special_classroom = specialClassroom
          }

          console.log('🔍 [DEBUG] フォームから受信したデータ:', JSON.stringify(subjectData, null, 2))
          console.log('🔍 [DEBUG] 正規化後データ:', JSON.stringify(normalizedData, null, 2))
          console.log('➕ 統一型安全APIで教科新規作成:', JSON.stringify(normalizedData, null, 2))
          
          const createResult = await subjectApi.createSubject(
            normalizedData as any,
            { token }
          )
          result = createResult
          console.log('✅ 教科新規作成成功:', result)
          toast({
            title: '保存完了',
            description: '新しい教科を追加しました',
          })
        } else {
          if (!subjectData.id) {
            throw new Error('教科IDが見つかりません')
          }
          // APIクライアント用にデータを正規化（レガシーフィールド対応）
          const normalizedData: any = {
            name: subjectData.name || '',
            school_id: subjectData.school_id || 'default', // 必須フィールド
          }

          // 週間授業数：複数フィールド対応
          const weeklyHours = (subjectData as any).weekly_hours || (subjectData as any).weeklyHours
          if (weeklyHours && weeklyHours !== 1) {
            normalizedData.weekly_hours = typeof weeklyHours === 'number' ? weeklyHours : Object.values(weeklyHours)[0] || 1
          }

          // 対象学年：複数フィールド対応（フロントエンドのフォームから送信される形式）
          const targetGrades = (subjectData as any).target_grades
          if (targetGrades) {
            if (typeof targetGrades === 'string') {
              // 既にJSON文字列の場合はそのまま使用
              normalizedData.target_grades = targetGrades
            } else if (Array.isArray(targetGrades) && targetGrades.length > 0) {
              // 配列の場合はJSON文字列に変換
              normalizedData.target_grades = JSON.stringify(targetGrades)
            }
          }
          
          // レガシー形式もサポート
          const targetGradesLegacy = (subjectData as any).targetGrades
          if (!normalizedData.target_grades && targetGradesLegacy) {
            if (typeof targetGradesLegacy === 'string') {
              normalizedData.target_grades = targetGradesLegacy
            } else if (Array.isArray(targetGradesLegacy)) {
              normalizedData.target_grades = JSON.stringify(targetGradesLegacy)
            }
          }

          // 特別教室：複数フィールド対応
          const specialClassroom = (subjectData as any).special_classroom || (subjectData as any).specialClassroom
          if (specialClassroom && specialClassroom.trim && specialClassroom.trim()) {
            normalizedData.special_classroom = specialClassroom
          }

          console.log('🔍 [DEBUG] 更新フォームから受信したデータ:', JSON.stringify(subjectData, null, 2))
          console.log('🔍 [DEBUG] 更新正規化後データ:', JSON.stringify(normalizedData, null, 2))
          console.log('🔄 統一型安全APIで教科更新:', JSON.stringify(normalizedData, null, 2))
          
          const updateResult = await subjectApi.updateSubject(subjectData.id, normalizedData as any, {
            token,
          })
          result = updateResult
          console.log('✅ 教科更新成功:', result)
          toast({
            title: '保存完了',
            description: '教科情報を更新しました',
          })
        }

        return result
      })()

      // 現在のリクエストを保存
      savingRequestRef.current = savePromise

      try {
        // Promise を実行
        const result = await savePromise
        console.log('✅ 重複送信防止付き教科保存成功:', {
          subjectName: result.name,
          timeTaken: Date.now() - currentTime
        })
        return result
      } catch (error) {
        console.error('❌ 教科の保存に失敗:', error)

        // エラーメッセージの安全な処理
        let errorMessage = '教科の保存に失敗しました'
        
        if (error instanceof Error) {
          // validationErrorsプロパティが存在する場合のみアクセス
          if ('validationErrors' in error && Array.isArray(error.validationErrors)) {
            const validationMessages = error.validationErrors.map(e => e.message).join(', ')
            errorMessage = `入力データが無効です: ${validationMessages}`
          } else {
            errorMessage = error.message || '教科の保存に失敗しました'
          }
        }
        
        toast({
          title: '保存エラー',
          description: errorMessage,
          variant: 'destructive',
        })
        throw error
      } finally {
        // 処理完了後にクリーンアップ
        setIsSaving(false)
        savingRequestRef.current = null
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
