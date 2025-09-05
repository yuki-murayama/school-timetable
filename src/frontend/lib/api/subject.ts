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
  grades: z.array(z.number().min(1).max(6)).optional(),
  weeklyHours: z.record(z.string(), z.number()).optional(),
  requiresSpecialClassroom: z.boolean().optional(),
  classroomType: z.string().optional(),
  order: z.number().int().positive().optional(),
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

export const subjectApi = {
  async getSubjects(options?: ApiOptions): Promise<{
    subjects: Subject[]
    pagination?: { page: number; limit: number; total: number; totalPages: number }
  }> {
    return apiClient.get<{
      subjects: Subject[]
      pagination?: { page: number; limit: number; total: number; totalPages: number }
    }>('/school/subjects', SubjectsListResponseSchema, options)
  },

  async createSubject(
    subject: z.infer<typeof CreateSubjectRequestSchema>,
    options?: ApiOptions
  ): Promise<Subject> {
    return apiClient.post<z.infer<typeof CreateSubjectRequestSchema>, Subject>(
      '/school/subjects',
      subject,
      CreateSubjectRequestSchema,
      SubjectSchema,
      options
    )
  },

  async updateSubject(
    id: string,
    subject: z.infer<typeof UpdateSubjectRequestSchema>,
    options?: ApiOptions
  ): Promise<Subject> {
    return apiClient.put<z.infer<typeof UpdateSubjectRequestSchema>, Subject>(
      `/school/subjects/${id}`,
      subject,
      UpdateSubjectRequestSchema,
      SubjectSchema,
      options
    )
  },

  async deleteSubject(id: string, options?: ApiOptions): Promise<void> {
    await apiClient.delete<void>(`/school/subjects/${id}`, VoidResponseSchema, options)
  },

  async saveSubjects(subjects: Subject[], options?: ApiOptions): Promise<Subject[]> {
    // For now, update each subject individually
    // TODO: Implement batch update endpoint on backend
    const updatedSubjects: Subject[] = []

    for (const subject of subjects) {
      try {
        const updateData = UpdateSubjectRequestSchema.parse({
          name: subject.name,
          grades: subject.grades,
          weeklyHours: subject.weeklyHours,
          requiresSpecialClassroom: subject.requiresSpecialClassroom,
          classroomType: subject.classroomType,
          order: subject.order,
        })
        const updated = await apiClient.put<z.infer<typeof UpdateSubjectRequestSchema>, Subject>(
          `/school/subjects/${subject.id}`,
          updateData,
          UpdateSubjectRequestSchema,
          SubjectSchema,
          options
        )
        updatedSubjects.push(updated)
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
      '/school/subjects/reorder',
      requestData,
      SubjectReorderRequestSchema,
      SubjectReorderResponseSchema,
      options
    )
  },
}
