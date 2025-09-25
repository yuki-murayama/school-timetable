/**
 * 型安全教科フォームフック - Zodスキーマ統合
 */

import type { Subject } from '@shared/schemas'
import { useCallback, useEffect, useState } from 'react'
import { z } from 'zod'

// フォームデータスキーマ
const SubjectFormDataSchema = z.object({
  name: z.string().min(1, '教科名は必須です').max(100, '教科名は100文字以内で入力してください'),
  specialClassroom: z.string().optional().default(''),
  weekly_hours: z
    .number()
    .min(0, '週間授業数は0以上です')
    .max(10, '週間授業数は10以下です')
    .default(1),
  target_grades: z.array(z.number().min(1).max(6)).default([]),
})

type SubjectFormData = z.infer<typeof SubjectFormDataSchema>

export const useSubjectForm = (initialSubject: Subject | null) => {
  // フォーム状態
  const [formData, setFormData] = useState<SubjectFormData>({
    name: '',
    specialClassroom: '',
    weekly_hours: 1,
    target_grades: [],
  })

  // バリデーション状態
  const [errors, setErrors] = useState<{
    name?: string
    weekly_hours?: string
    target_grades?: string
  }>({})

  // 初期化
  useEffect(() => {
    if (initialSubject) {
      // 複数のフィールドから学年データを取得（フォールバック処理）
      const targetGrades =
        initialSubject.grades || initialSubject.targetGrades || initialSubject.target_grades || []

      // 週間授業数の取得（複数のフィールドから統一）
      let weeklyHoursValue = 1

      // weeklyHoursオブジェクト形式の場合
      if (initialSubject.weeklyHours && typeof initialSubject.weeklyHours === 'object') {
        // オブジェクトから最初の値を取得（編集用に単純化）
        const hours = Object.values(initialSubject.weeklyHours)
        weeklyHoursValue = hours.length > 0 ? hours[0] : 1
      }
      // weekly_hours数値の場合
      else if (typeof initialSubject.weekly_hours === 'number') {
        weeklyHoursValue = initialSubject.weekly_hours
      }
      // weeklyHours数値の場合（統一型）
      else if (typeof initialSubject.weeklyHours === 'number') {
        weeklyHoursValue = initialSubject.weeklyHours
      }

      setFormData({
        name: initialSubject.name,
        specialClassroom:
          initialSubject.specialClassroom || (initialSubject as any).special_classroom || '',
        weekly_hours: weeklyHoursValue,
        target_grades: Array.isArray(targetGrades) ? targetGrades : [],
      })
    } else {
      // 新規作成の場合はクリア
      setFormData({
        name: '',
        specialClassroom: '',
        weekly_hours: 1,
        target_grades: [],
      })
    }
    setErrors({})
  }, [initialSubject])

  // バリデーション
  const validateForm = useCallback(() => {
    const newErrors: typeof errors = {}

    if (!formData.name || !formData.name.trim()) {
      newErrors.name = '教科名を入力してください'
    }

    if (formData.weekly_hours < 1 || formData.weekly_hours > 10) {
      newErrors.weekly_hours = '週の授業数は1から10の範囲で入力してください'
    }

    if (formData.target_grades && Array.isArray(formData.target_grades)) {
      const validGrades = [1, 2, 3]
      const invalidGrades = formData.target_grades.filter(
        (grade: number) => !validGrades.includes(grade)
      )
      if (invalidGrades.length > 0) {
        newErrors.target_grades = '対象学年は1、2、3のいずれかを指定してください'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  // フォームリセット
  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      specialClassroom: '',
      weekly_hours: 1,
      target_grades: [],
    })
    setErrors({})
  }, [])

  // フォームデータ取得（API送信用の形式に変換）- バックエンドスキーマ準拠
  const getFormData = useCallback(() => {
    const baseData: Record<string, string | number | boolean | number[]> = {
      name: formData.name.trim(),
      school_id: 'default', // 明示的に設定（必須フィールド）
    }

    // 必須フィールド：週間授業数（常に送信）
    baseData.weekly_hours = formData.weekly_hours || 1

    // 重要フィールド：対象学年（常に送信、空の場合も含む）
    const targetGrades = formData.target_grades || []
    baseData.target_grades = JSON.stringify(targetGrades) // JSON文字列として送信

    // デバッグログ追加
    console.log('📦 useSubjectForm getFormData - 対象学年情報:', {
      'formData.target_grades': formData.target_grades,
      targetGrades: targetGrades,
      target_grades送信値: baseData.target_grades,
    })

    // オプショナルフィールド：特別教室（指定された場合のみ）
    if (formData.specialClassroom?.trim()) {
      baseData.special_classroom = formData.specialClassroom.trim()
    }

    // 既存の教科を編集する場合はIDを含める
    if (initialSubject?.id) {
      baseData.id = initialSubject.id
    }

    console.log('📤 フォームからAPI送信用データ生成:', baseData)
    return baseData
  }, [formData, initialSubject])

  // 学年選択処理
  const handleGradeChange = useCallback((grade: number, checked: boolean) => {
    setFormData(prev => {
      const newTargetGrades = checked
        ? [...prev.target_grades, grade].sort()
        : prev.target_grades.filter(g => g !== grade)

      // デバッグログ追加
      console.log('📚 handleGradeChange - 学年選択変更:', {
        grade,
        checked,
        変更前target_grades: prev.target_grades,
        変更後target_grades: newTargetGrades,
      })

      return {
        ...prev,
        target_grades: newTargetGrades,
      }
    })
  }, [])

  // フィールド更新処理
  const updateField = useCallback((field: keyof SubjectFormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  return {
    // フォーム状態
    formData,
    errors,

    // アクション
    handleGradeChange,
    updateField,
    validateForm,
    resetForm,
    getFormData,

    // ヘルパー
    isValid: Object.keys(errors).length === 0,
    hasChanges: Boolean(
      formData.name.trim() ||
        formData.specialClassroom.trim() ||
        formData.weekly_hours !== 1 ||
        formData.target_grades.length > 0
    ),
  }
}
