/**
 * 教科関連API
 */

import type { Subject } from '../../../shared/types'
import { type ApiOptions, apiClient } from './client'

export const subjectApi = {
  async getSubjects(options?: ApiOptions): Promise<Subject[]> {
    return apiClient.get<Subject[]>('/frontend/school/subjects', options)
  },

  async createSubject(subject: Omit<Subject, 'id'>, options?: ApiOptions): Promise<Subject> {
    return apiClient.post<Subject>('/frontend/school/subjects', subject, options)
  },

  async updateSubject(
    id: string,
    subject: Partial<Subject>,
    options?: ApiOptions
  ): Promise<Subject> {
    return apiClient.put<Subject>(`/frontend/school/subjects/${id}`, subject, options)
  },

  async deleteSubject(id: string, options?: ApiOptions): Promise<void> {
    return apiClient.delete<void>(`/frontend/school/subjects/${id}`, options)
  },

  async saveSubjects(subjects: Subject[], options?: ApiOptions): Promise<Subject[]> {
    // For now, update each subject individually
    // TODO: Implement batch update endpoint on backend
    const updatedSubjects: Subject[] = []

    for (const subject of subjects) {
      try {
        const updated = await apiClient.put<Subject>(
          `/frontend/school/subjects/${subject.id}`,
          {
            name: subject.name,
            specialClassroom: subject.specialClassroom,
            weekly_hours: subject.weekly_hours,
            target_grades: subject.target_grades,
            order: subject.order,
          },
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
    const response = await apiClient.patch<{ updatedCount: number; totalRequested: number }>(
      '/frontend/school/subjects/reorder',
      {
        subjects,
      },
      options
    )
    return response
  },
}
