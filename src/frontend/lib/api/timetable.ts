/**
 * 型安全時間割関連API - Zodスキーマバリデーション統合
 */

import type {
  TimetableDetail,
  TimetableGenerationResponse,
  TimetableListItem,
} from '@shared/schemas'
import { z } from 'zod'
import { type ApiOptions, apiClient } from './client'

// APIリクエスト・レスポンス型定義
const TimetableGenerationRequestSchema = z.object({
  options: z.record(z.unknown()).optional(),
})
const TimetableGenerationResponseSchema = z.object({
  success: z.boolean(),
  id: z.string().optional(),
  message: z.string().optional(),
  data: z.unknown().optional(),
  status: z.string().optional(),
  error: z.string().optional(),
})
const TimetableListResponseSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    createdAt: z.string(),
    grade: z.number().optional(),
    className: z.string().optional(),
  })
)

export const timetableApi = {
  async generateTimetable(
    request: z.infer<typeof TimetableGenerationRequestSchema>,
    options?: ApiOptions
  ): Promise<TimetableGenerationResponse> {
    return apiClient.post<
      z.infer<typeof TimetableGenerationRequestSchema>,
      TimetableGenerationResponse
    >(
      '/timetables/generate',
      request,
      TimetableGenerationRequestSchema,
      TimetableGenerationResponseSchema,
      options
    )
  },

  async getTimetables(options?: ApiOptions): Promise<TimetableListItem[]> {
    return apiClient.get<TimetableListItem[]>('/timetables', TimetableListResponseSchema, options)
  },

  // 生成された時間割の取得（ページネーション対応）
  async getSavedTimetables(
    page: number = 1,
    limit: number = 20,
    options?: ApiOptions
  ): Promise<{
    timetables: TimetableListItem[]
    totalCount: number
    currentPage: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }> {
    console.log('🚀 getSavedTimetables 開始 - page:', page, 'limit:', limit, 'options:', options)

    try {
      const response = await apiClient.get<{
        success: boolean
        data: {
          timetables: TimetableListItem[]
          totalCount: number
          currentPage: number
          totalPages: number
          hasNextPage: boolean
          hasPrevPage: boolean
        }
      }>(`/api/timetable/program/saved?page=${page}&limit=${limit}`, options)

      console.log('🔍 getSavedTimetables レスポンス:', response)

      // ページネーション対応のレスポンス形式: {success: true, data: {timetables: [...], totalCount: N, ...}}
      if (
        response &&
        typeof response === 'object' &&
        'success' in response &&
        response.success &&
        'data' in response
      ) {
        const data = response.data as {
          timetables: TimetableListItem[]
          totalCount: number
          currentPage: number
          totalPages: number
          hasNextPage: boolean
          hasPrevPage: boolean
        }
        if (data && 'timetables' in data && Array.isArray(data.timetables)) {
          console.log(
            '✅ ページネーション対応の時間割データを正常に抽出:',
            data.timetables.length,
            '件'
          )
          return data
        }
      }

      console.warn('⚠️ 予期しないレスポンス形式:', response)
      return {
        timetables: [],
        totalCount: 0,
        currentPage: 1,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      }
    } catch (error) {
      console.error('❌ getSavedTimetables API呼び出しでエラー:', error)
      return {
        timetables: [],
        totalCount: 0,
        currentPage: 1,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      }
    }
  },

  async getTimetableDetail(id: string, options?: ApiOptions): Promise<TimetableDetail> {
    return apiClient.get<TimetableDetail>(`/timetables/${id}`, options)
  },

  // 生成された時間割の詳細取得
  async getSavedTimetableDetail(id: string, options?: ApiOptions): Promise<TimetableDetail> {
    return apiClient.get<TimetableDetail>(`/api/timetable/program/saved/${id}`, options)
  },

  async updateTimetable(id: string, data: unknown, options?: ApiOptions): Promise<TimetableDetail> {
    return apiClient.put<TimetableDetail>(`/timetables/${id}`, data, options)
  },

  // プログラム型時間割生成
  async generateProgramTimetable(options?: ApiOptions): Promise<{
    success: boolean
    message?: string
    data?: {
      timetable: unknown
      statistics: {
        totalSlots: number
        assignedSlots: number
        unassignedSlots: number
        backtrackCount: number
      }
      generatedAt: string
      method: string
    }
    statistics?: unknown
  }> {
    return apiClient.post<{
      success: boolean
      message?: string
      data?: unknown
      statistics?: unknown
    }>(
      '/api/timetable/program/generate',
      { useOptimization: false, useNewAlgorithm: true },
      options
    )
  },

  async getProgramConfig(options?: ApiOptions): Promise<{
    algorithm: string
    description: string
    features: string[]
    statistics: {
      teachers: number
      subjects: number
      classrooms: number
      teachersWithRestrictions: number
    }
    constraints: Array<{
      name: string
      description: string
      enabled: boolean
    }>
  }> {
    return apiClient.get<{
      algorithm: string
      description: string
      features: string[]
      statistics: unknown
      constraints: unknown[]
    }>('/api/timetable/program/config', options)
  },

  async validateTimetable(
    timetableData: unknown,
    options?: ApiOptions
  ): Promise<{
    isValid: boolean
    violations: Array<{
      type: string
      message: string
      slot: unknown
      timeKey: string
    }>
    checkedConstraints: string[]
  }> {
    return apiClient.post<{
      isValid: boolean
      violations: unknown[]
      checkedConstraints: string[]
    }>('/api/timetable/program/validate', { timetableData }, options)
  },

  // 生成された時間割を保存
  async saveProgramTimetable(
    timetable: unknown,
    statistics: {
      assignmentRate?: number
      totalSlots?: number
      assignedSlots?: number
      bestAssignmentRate?: number
      totalAssignments?: number
    },
    metadata?: { name?: string },
    options?: ApiOptions
  ): Promise<{
    success: boolean
    message?: string
    data?: {
      timetableId: string
      assignmentRate: number
      totalSlots: number
      assignedSlots: number
      savedAt: string
    }
  }> {
    return apiClient.post<{
      success: boolean
      message?: string
      data?: {
        timetableId: string
        assignmentRate: number
        totalSlots: number
        assignedSlots: number
        savedAt: string
      }
    }>('/api/timetable/program/save', { timetable, statistics, metadata }, options)
  },
}
