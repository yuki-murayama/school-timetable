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
    // フロントエンド側で型検証を実行
    const validatedSubject = {
      name: subject.name?.trim() || '',
      weeklyHours: typeof subject.weeklyHours === 'number' ? subject.weeklyHours : 
        (typeof subject.weekly_hours === 'number' ? subject.weekly_hours : 1),
      grades: Array.isArray(subject.grades) ? subject.grades : 
        (Array.isArray(subject.target_grades) ? subject.target_grades : [1, 2, 3]),
      order: subject.order || 0
    }

    // 名前の検証
    if (!validatedSubject.name) {
      throw new Error('教科名は必須です')
    }
    if (validatedSubject.name.length > 50) {
      throw new Error('教科名は50文字以内で入力してください')
    }

    // 週間授業数の検証
    if (validatedSubject.weeklyHours < 0 || validatedSubject.weeklyHours > 10) {
      throw new Error('週間授業数は0〜10の範囲で入力してください')
    }

    return apiClient.post<Subject>('/frontend/school/subjects', validatedSubject, options)
  },

  async updateSubject(
    id: string,
    subject: Partial<Subject>,
    options?: ApiOptions
  ): Promise<Subject> {
    // フロントエンド側で型検証を実行（updateの場合は部分的）
    const validatedUpdates: Partial<Subject> = {}

    if (subject.name !== undefined) {
      const trimmedName = subject.name.trim()
      if (!trimmedName) {
        throw new Error('教科名は必須です')
      }
      if (trimmedName.length > 50) {
        throw new Error('教科名は50文字以内で入力してください')
      }
      validatedUpdates.name = trimmedName
    }

    if (subject.weeklyHours !== undefined || subject.weekly_hours !== undefined) {
      const hours = subject.weeklyHours !== undefined ? subject.weeklyHours : subject.weekly_hours!
      if (typeof hours !== 'number' || hours < 0 || hours > 10) {
        throw new Error('週間授業数は0〜10の数値で入力してください')
      }
      validatedUpdates.weeklyHours = hours
    }

    if (subject.grades !== undefined || subject.target_grades !== undefined) {
      const grades = subject.grades || subject.target_grades!
      if (!Array.isArray(grades) || !grades.every(g => [1, 2, 3].includes(g))) {
        throw new Error('対象学年は1、2、3年から選択してください')
      }
      validatedUpdates.grades = grades
    }

    if (subject.order !== undefined) {
      validatedUpdates.order = subject.order
    }

    return apiClient.put<Subject>(`/frontend/school/subjects/${id}`, validatedUpdates, options)
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
