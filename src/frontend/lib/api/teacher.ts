/**
 * 型安全教師関連API - Zodスキーマバリデーション統合
 */

import {
  type CreateTeacherRequest,
  CreateTeacherRequestSchema,
  type LegacyTeacher,
  LegacyTeacherSchema,
} from '@shared/schemas'
import { z } from 'zod'
import { type ApiOptions, apiClient } from './client'

// レスポンス型定義
const TeachersListResponseSchema = z.object({
  teachers: z.array(LegacyTeacherSchema),
  pagination: z
    .object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    })
    .optional(),
})
const TeacherReorderRequestSchema = z.object({
  teachers: z.array(
    z.object({
      id: z.string().uuid(),
      order: z.number().int().min(1),
    })
  ),
})
const TeacherReorderResponseSchema = z.object({
  updatedCount: z.number().int().min(0),
  totalRequested: z.number().int().min(0),
})
const VoidResponseSchema = z.object({}).or(z.null()).or(z.undefined())

export const teacherApi = {
  async getTeachers(options?: ApiOptions): Promise<{
    teachers: LegacyTeacher[]
    pagination?: { page: number; limit: number; total: number; totalPages: number }
  }> {
    return apiClient.get<{
      teachers: LegacyTeacher[]
      pagination?: { page: number; limit: number; total: number; totalPages: number }
    }>('/teachers', TeachersListResponseSchema, options)
  },

  async createTeacher(teacher: CreateTeacherRequest, options?: ApiOptions): Promise<LegacyTeacher> {
    return apiClient.post<LegacyTeacher>('/teachers', teacher, LegacyTeacherSchema, options)
  },

  async updateTeacher(
    id: string,
    teacher: Partial<CreateTeacherRequest>,
    options?: ApiOptions
  ): Promise<LegacyTeacher> {
    return apiClient.put<Partial<CreateTeacherRequest>, LegacyTeacher>(
      `/teachers/${id}`,
      teacher,
      CreateTeacherRequestSchema.partial(),
      LegacyTeacherSchema,
      options
    )
  },

  async deleteTeacher(id: string, options?: ApiOptions): Promise<void> {
    await apiClient.delete<void>(`/teachers/${id}`, VoidResponseSchema, options)
  },

  async saveTeachers(teachers: LegacyTeacher[], options?: ApiOptions): Promise<void> {
    // For now, just save each teacher individually
    // This could be optimized with a bulk update endpoint later
    const promises = teachers.map(teacher => {
      if (teacher.id) {
        const updateData = CreateTeacherRequestSchema.parse({
          name: teacher.name,
          subjects: teacher.subjects,
          grades: teacher.grades,
          assignmentRestrictions: teacher.assignmentRestrictions,
        })
        return apiClient.put<CreateTeacherRequest, LegacyTeacher>(
          `/teachers/${teacher.id}`,
          updateData,
          CreateTeacherRequestSchema,
          LegacyTeacherSchema,
          options
        )
      }
      return Promise.resolve()
    })
    await Promise.all(promises)
  },

  async reorderTeachers(
    teachers: Array<{ id: string; order: number }>,
    options?: ApiOptions
  ): Promise<{ updatedCount: number; totalRequested: number }> {
    const requestData = { teachers }
    return apiClient.patch<typeof requestData, { updatedCount: number; totalRequested: number }>(
      '/teachers/reorder',
      requestData,
      TeacherReorderRequestSchema,
      TeacherReorderResponseSchema,
      options
    )
  },
}
