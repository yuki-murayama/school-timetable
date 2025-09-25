/**
 * 型安全教科関連API - Zodスキーマバリデーション統合
 */

import { type Subject, SubjectSchema } from '@shared/schemas'
import { z } from 'zod'
import { type ApiOptions, apiClient } from './client'

// APIリクエスト・レスポンス型定義
const SubjectsListResponseSchema = z.object({
  subjects: z.array(SubjectSchema),
  pagination: z
    .object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    })
    .optional(),
})
const CreateSubjectRequestSchema = z.object({
  name: z.string().min(1, '教科名は必須です').max(100, '教科名は100文字以内で入力してください'),
  school_id: z.string().default('default'), // バックエンドのschool_id制約に対応 - 必須
  weekly_hours: z.number().int().optional(),
  target_grades: z.string().optional(), // JSON文字列として送信
  special_classroom: z.string().optional(),
})
const UpdateSubjectRequestSchema = CreateSubjectRequestSchema.partial()
const SubjectReorderRequestSchema = z.object({
  subjects: z.array(
    z.object({
      id: z.string().uuid(),
      order: z.number().int().min(1),
    })
  ),
})
const SubjectReorderResponseSchema = z.object({
  updatedCount: z.number().int().min(0),
  totalRequested: z.number().int().min(0),
})
const VoidResponseSchema = z.object({}).or(z.null()).or(z.undefined())

/**
 * バックエンドからのSubjectデータを正規化
 * JSON文字列フィールドを適切な型に変換し、統一したフィールド形式を提供
 */
function normalizeSubjectData(rawSubject: Record<string, unknown>): Subject {
  // 対象学年の正規化処理（複数ソースから統一）
  let grades: number[] = []

  // 1. grades フィールド（バックエンドから新たに追加）
  if (rawSubject.grades && Array.isArray(rawSubject.grades)) {
    grades = rawSubject.grades
  }
  // 2. target_grades JSON文字列（従来のDB形式）
  else if (rawSubject.target_grades && typeof rawSubject.target_grades === 'string') {
    try {
      const parsed = JSON.parse(rawSubject.target_grades)
      grades = Array.isArray(parsed) ? parsed : []
    } catch (error) {
      console.warn('target_grades JSONパースエラー:', rawSubject.target_grades, error)
      grades = []
    }
  }
  // 3. targetGrades 配列（レガシー形式）
  else if (rawSubject.targetGrades && Array.isArray(rawSubject.targetGrades)) {
    grades = rawSubject.targetGrades
  }

  // 週間授業数の正規化処理
  let weeklyHours: Record<string, number> = {}
  let _weekly_hours: number | null = null

  if (rawSubject.weeklyHours && typeof rawSubject.weeklyHours === 'object') {
    weeklyHours = rawSubject.weeklyHours
  } else if (typeof rawSubject.weekly_hours === 'number') {
    _weekly_hours = rawSubject.weekly_hours
    // 対象学年に基づいてweeklyHoursオブジェクトも生成
    grades.forEach(grade => {
      weeklyHours[grade.toString()] = rawSubject.weekly_hours
    })
  }

  // 特別教室の正規化処理
  const requiresSpecialClassroom = Boolean(
    rawSubject.requiresSpecialClassroom ||
      (rawSubject.special_classroom &&
        rawSubject.special_classroom !== null &&
        rawSubject.special_classroom !== '' &&
        rawSubject.special_classroom !== '普通教室')
  )

  const specialClassroom = rawSubject.specialClassroom || rawSubject.special_classroom || ''
  const classroomType = rawSubject.classroomType || rawSubject.special_classroom || '普通教室'

  console.log('🔧 正規化処理:', {
    原始データ: rawSubject.name,
    grades_抽出: grades,
    target_grades_原始: rawSubject.target_grades,
    weekly_hours_原始: rawSubject.weekly_hours,
    weeklyHours_生成: weeklyHours,
  })

  // 正規化されたSubjectオブジェクトを返す
  return {
    ...rawSubject,
    // 統一されたフィールド（フロントエンド用）
    grades,
    targetGrades: grades, // 別名でも提供
    weeklyHours,
    requiresSpecialClassroom,
    specialClassroom,
    classroomType,
    // 元のDBフィールドも保持（互換性のため）
    target_grades: rawSubject.target_grades,
    weekly_hours: rawSubject.weekly_hours,
    special_classroom: rawSubject.special_classroom,
  } as Subject
}

export const subjectApi = {
  async getSubjects(options?: ApiOptions): Promise<{
    subjects: Subject[]
    pagination?: { page: number; limit: number; total: number; totalPages: number }
  }> {
    const response = await apiClient.get<{
      subjects: Subject[]
      pagination?: { page: number; limit: number; total: number; totalPages: number }
    }>('/subjects', SubjectsListResponseSchema, options)

    // バックエンドからのレスポンスを正規化（対象学年の処理）
    if (response.subjects && Array.isArray(response.subjects)) {
      response.subjects = response.subjects.map(subject => normalizeSubjectData(subject))
    }

    return response
  },

  async createSubject(
    subject: z.infer<typeof CreateSubjectRequestSchema>,
    options?: ApiOptions
  ): Promise<Subject> {
    console.log('🔍 [FRONTEND DEBUG] 教科作成リクエスト:', JSON.stringify(subject, null, 2))

    // 正しい統合OpenAPIエンドポイントを使用
    const rawResponse = await apiClient.post<z.infer<typeof CreateSubjectRequestSchema>, Subject>(
      '/subjects',
      subject,
      CreateSubjectRequestSchema,
      SubjectSchema,
      options
    )

    // レスポンスを正規化してから返す
    const normalizedResponse = normalizeSubjectData(rawResponse)
    console.log('✅ [FRONTEND DEBUG] 教科作成正規化後:', {
      作成前: rawResponse.name,
      grades_正規化前: rawResponse.grades,
      target_grades_正規化前: rawResponse.target_grades,
      grades_正規化後: normalizedResponse.grades,
      targetGrades_正規化後: normalizedResponse.targetGrades,
    })

    return normalizedResponse
  },

  async updateSubject(
    id: string,
    subject: z.infer<typeof UpdateSubjectRequestSchema>,
    options?: ApiOptions
  ): Promise<Subject> {
    const rawResponse = await apiClient.put<z.infer<typeof UpdateSubjectRequestSchema>, Subject>(
      `/subjects/${id}`,
      subject,
      UpdateSubjectRequestSchema,
      SubjectSchema,
      options
    )

    // レスポンスを正規化してから返す
    const normalizedResponse = normalizeSubjectData(rawResponse)
    console.log('✅ [FRONTEND DEBUG] 教科更新正規化後:', {
      更新前: rawResponse.name,
      grades_正規化前: rawResponse.grades,
      target_grades_正規化前: rawResponse.target_grades,
      grades_正規化後: normalizedResponse.grades,
      targetGrades_正規化後: normalizedResponse.targetGrades,
    })

    return normalizedResponse
  },

  async deleteSubject(id: string, options?: ApiOptions): Promise<void> {
    await apiClient.delete<void>(`/subjects/${id}`, VoidResponseSchema, options)
  },

  async saveSubjects(subjects: Subject[], options?: ApiOptions): Promise<Subject[]> {
    // For now, update each subject individually
    // TODO: Implement batch update endpoint on backend
    const updatedSubjects: Subject[] = []

    for (const subject of subjects) {
      try {
        const updateData = UpdateSubjectRequestSchema.parse({
          name: subject.name,
          school_id: 'default',
        })
        const rawResponse = await apiClient.put<
          z.infer<typeof UpdateSubjectRequestSchema>,
          Subject
        >(`/subjects/${subject.id}`, updateData, UpdateSubjectRequestSchema, SubjectSchema, options)

        // レスポンスを正規化してから追加
        const normalizedResponse = normalizeSubjectData(rawResponse)
        updatedSubjects.push(normalizedResponse)
      } catch (error) {
        console.error(`Failed to update subject ${subject.id}:`, error)
        // Continue with other subjects even if one fails
      }
    }

    return updatedSubjects
  },

  async reorderSubjects(
    subjects: Array<{ id: string; order: number }>,
    options?: ApiOptions
  ): Promise<{ updatedCount: number; totalRequested: number }> {
    const requestData = { subjects }
    return apiClient.patch<typeof requestData, { updatedCount: number; totalRequested: number }>(
      '/subjects/reorder',
      requestData,
      SubjectReorderRequestSchema,
      SubjectReorderResponseSchema,
      options
    )
  },
}
