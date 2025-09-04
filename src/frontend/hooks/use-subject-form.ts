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
      // デバッグ用ログ（本番環境では削除可能）
      // console.log('🔍 useSubjectForm初期化:', {
      //   subjectId: initialSubject.id,
      //   subjectName: initialSubject.name,
      //   grades: initialSubject.grades,
      //   targetGrades: initialSubject.targetGrades,
      //   target_grades: initialSubject.target_grades,
      //   finalTargetGrades: targetGrades
      // })

      setFormData({
        name: initialSubject.name,
        specialClassroom: initialSubject.specialClassroom || '',
        weekly_hours: initialSubject.weekly_hours || initialSubject.weeklyHours || 1,
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

  // フォームデータ取得
  const getFormData = useCallback(() => {
    // E2Eテストでの問題を解決するため、学年が選択されている場合はそのまま使用
    const finalGrades = formData.target_grades

    const baseData = {
      name: formData.name.trim(),
      specialClassroom: formData.specialClassroom,
      weekly_hours: formData.weekly_hours,
      // バックエンドが期待するtargetGradesフィールドで送信
      targetGrades: finalGrades,
      // 互換性のために旧フィールド名も保持
      target_grades: finalGrades,
      grades: finalGrades,
    }

    // 既存の教科を編集する場合はIDを含める
    if (initialSubject?.id) {
      return {
        ...baseData,
        id: initialSubject.id,
      }
    }

    return baseData
  }, [formData, initialSubject])

  // 学年選択処理
  const handleGradeChange = useCallback((grade: number, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      target_grades: checked
        ? [...prev.target_grades, grade].sort()
        : prev.target_grades.filter(g => g !== grade),
    }))
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
