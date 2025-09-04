/**
 * 型安全教室関連API - Zodスキーマバリデーション統合
 */

import { type Classroom, ClassroomSchema } from '@shared/schemas'
import { z } from 'zod'
import { type ApiOptions, apiClient } from './client'

// APIリクエスト・レスポンス型定義
const ClassroomsListResponseSchema = z.object({
  classrooms: z.array(ClassroomSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }).optional(),
})
const CreateClassroomRequestSchema = z.object({
  name: z.string().min(1, '教室名は必須です').max(100, '教室名は100文字以内で入力してください'),
  type: z.string().min(1, '教室タイプは必須です'),
  capacity: z.number().min(1, '収容人数は1以上です').max(100, '収容人数は100以下です').optional(),
  count: z.number().min(1, '数量は1以上です').max(50, '数量は50以下です').optional(),
  order: z.number().int().positive().optional(),
})
const UpdateClassroomRequestSchema = CreateClassroomRequestSchema.partial()
const ClassroomReorderRequestSchema = z.object({
  classrooms: z.array(
    z.object({
      id: z.string().uuid(),
      order: z.number().int().min(1),
    })
  ),
})
const ClassroomReorderResponseSchema = z.object({
  updatedCount: z.number().int().min(0),
  totalRequested: z.number().int().min(0),
})
const VoidResponseSchema = z.object({}).or(z.null()).or(z.undefined())

export const classroomApi = {
  async getClassrooms(options?: ApiOptions): Promise<{ classrooms: Classroom[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }> {
    return apiClient.get<{ classrooms: Classroom[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }>(
      '/school/classrooms',
      ClassroomsListResponseSchema,
      options
    )
  },

  async createClassroom(
    classroom: z.infer<typeof CreateClassroomRequestSchema>,
    options?: ApiOptions
  ): Promise<Classroom> {
    return apiClient.post<z.infer<typeof CreateClassroomRequestSchema>, Classroom>(
      '/school/classrooms',
      classroom,
      CreateClassroomRequestSchema,
      ClassroomSchema,
      options
    )
  },

  async updateClassroom(
    id: string,
    classroom: z.infer<typeof UpdateClassroomRequestSchema>,
    options?: ApiOptions
  ): Promise<Classroom> {
    return apiClient.put<z.infer<typeof UpdateClassroomRequestSchema>, Classroom>(
      `/school/classrooms/${id}`,
      classroom,
      UpdateClassroomRequestSchema,
      ClassroomSchema,
      options
    )
  },

  async deleteClassroom(id: string, options?: ApiOptions): Promise<void> {
    await apiClient.delete<void>(`/school/classrooms/${id}`, VoidResponseSchema, options)
  },

  async saveClassrooms(classrooms: Classroom[], options?: ApiOptions): Promise<void> {
    // For now, just save each classroom individually
    // This could be optimized with a bulk update endpoint later
    const promises = classrooms.map(classroom => {
      if (classroom.id) {
        const updateData = UpdateClassroomRequestSchema.parse({
          name: classroom.name,
          type: classroom.type,
          capacity: classroom.capacity,
          count: classroom.count,
          order: classroom.order,
        })
        return apiClient.put<z.infer<typeof UpdateClassroomRequestSchema>, Classroom>(
          `/school/classrooms/${classroom.id}`,
          updateData,
          UpdateClassroomRequestSchema,
          ClassroomSchema,
          options
        )
      }
      return Promise.resolve()
    })
    await Promise.all(promises)
  },

  async reorderClassrooms(
    classrooms: Array<{ id: string; order: number }>,
    options?: ApiOptions
  ): Promise<{ updatedCount: number; totalRequested: number }> {
    const requestData = { classrooms }
    return apiClient.patch<typeof requestData, { updatedCount: number; totalRequested: number }>(
      '/school/classrooms/reorder',
      requestData,
      ClassroomReorderRequestSchema,
      ClassroomReorderResponseSchema,
      options
    )
  },
}
