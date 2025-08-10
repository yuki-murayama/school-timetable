/**
 * 教室関連API
 */

import type { Classroom } from '../../../shared/types'
import { type ApiOptions, apiClient } from './client'

export const classroomApi = {
  async getClassrooms(options?: ApiOptions): Promise<Classroom[]> {
    return apiClient.get<Classroom[]>('/frontend/school/classrooms', options)
  },

  async createClassroom(
    classroom: Omit<Classroom, 'id'>,
    options?: ApiOptions
  ): Promise<Classroom> {
    return apiClient.post<Classroom>('/frontend/school/classrooms', classroom, options)
  },

  async updateClassroom(
    id: string,
    classroom: Partial<Classroom>,
    options?: ApiOptions
  ): Promise<Classroom> {
    return apiClient.put<Classroom>(`/frontend/school/classrooms/${id}`, classroom, options)
  },

  async deleteClassroom(id: string, options?: ApiOptions): Promise<void> {
    return apiClient.delete<void>(`/frontend/school/classrooms/${id}`, options)
  },

  async saveClassrooms(classrooms: Classroom[], options?: ApiOptions): Promise<void> {
    // For now, just save each classroom individually
    // This could be optimized with a bulk update endpoint later
    const promises = classrooms.map(classroom => {
      if (classroom.id) {
        return apiClient.put<Classroom>(
          `/frontend/school/classrooms/${classroom.id}`,
          classroom,
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
    const response = await apiClient.patch<{ updatedCount: number; totalRequested: number }>(
      '/frontend/school/classrooms/reorder',
      {
        classrooms,
      },
      options
    )
    return response
  },
}
