/**
 * 教師関連API
 */

import type { Teacher } from '../../../shared/types'
import { type ApiOptions, apiClient } from './client'

export const teacherApi = {
  async getTeachers(options?: ApiOptions): Promise<Teacher[]> {
    return apiClient.get<Teacher[]>('/frontend/school/teachers', options)
  },

  async createTeacher(teacher: Omit<Teacher, 'id'>, options?: ApiOptions): Promise<Teacher> {
    // 🚀 API Request - createTeacher
    // 📝 Teacher data being created: JSON.stringify(teacher, null, 2)
    // 📚 Subjects array: teacher.subjects
    // 🎓 Grades array: teacher.grades

    const result = await apiClient.post<Teacher>('/frontend/school/teachers', teacher, options)

    // ✅ API Response - createTeacher
    // 📤 Received data: JSON.stringify(result, null, 2)
    // 📚 Returned subjects: result.subjects
    // 🎓 Returned grades: result.grades

    return result
  },

  async updateTeacher(
    id: string,
    teacher: Partial<Teacher>,
    options?: ApiOptions
  ): Promise<Teacher> {
    // 🚀 API Request - updateTeacher
    // 📝 Teacher ID: id
    // 📦 Data being sent: JSON.stringify(teacher, null, 2)
    // 📚 Subjects array: teacher.subjects
    // 🎓 Grades array: teacher.grades

    const result = await apiClient.put<Teacher>(`/frontend/school/teachers/${id}`, teacher, options)

    // ✅ API Response - updateTeacher
    // 📤 Received data: JSON.stringify(result, null, 2)
    // 📚 Returned subjects: result.subjects
    // 🎓 Returned grades: result.grades

    return result
  },

  async deleteTeacher(id: string, options?: ApiOptions): Promise<void> {
    return apiClient.delete<void>(`/frontend/school/teachers/${id}`, options)
  },

  async saveTeachers(teachers: Teacher[], options?: ApiOptions): Promise<void> {
    // For now, just save each teacher individually
    // This could be optimized with a bulk update endpoint later
    const promises = teachers.map(teacher => {
      if (teacher.id) {
        return apiClient.put<Teacher>(`/frontend/school/teachers/${teacher.id}`, teacher, options)
      }
      return Promise.resolve()
    })
    await Promise.all(promises)
  },

  async reorderTeachers(
    teachers: Array<{ id: string; order: number }>,
    options?: ApiOptions
  ): Promise<{ updatedCount: number; totalRequested: number }> {
    const response = await apiClient.patch<{ updatedCount: number; totalRequested: number }>(
      '/frontend/school/teachers/reorder',
      {
        teachers,
      },
      options
    )
    return response
  },
}
