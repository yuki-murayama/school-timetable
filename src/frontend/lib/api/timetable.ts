/**
 * 時間割関連API
 */

import type {
  TimetableDetail,
  TimetableGenerationResponse,
  TimetableListItem,
} from '../../../shared/types'
import { type ApiOptions, apiClient } from './client'

export const timetableApi = {
  async generateTimetable(
    request: { options?: Record<string, unknown> },
    options?: ApiOptions
  ): Promise<TimetableGenerationResponse> {
    return apiClient.post<TimetableGenerationResponse>(
      '/frontend/timetable/generate',
      request,
      options
    )
  },

  async getTimetables(options?: ApiOptions): Promise<TimetableListItem[]> {
    return apiClient.get<TimetableListItem[]>('/frontend/school/timetables', options)
  },

  // 生成された時間割の取得
  async getSavedTimetables(options?: ApiOptions): Promise<TimetableListItem[]> {
    console.log('🚀 getSavedTimetables 開始 - options:', options)
    
    try {
      const response = await apiClient.get<{ 
        success: boolean
        data: { timetables: TimetableListItem[]; count: number }
      }>(
        '/timetable/program/saved',
        options
      )

      console.log('🔍 getSavedTimetables レスポンス:', response)
      console.log('🔍 response type:', typeof response)
      console.log('🔍 response is object:', response && typeof response === 'object')
      console.log('🔍 response has success:', response && 'success' in response)
      console.log('🔍 response.success:', response?.success)
      console.log('🔍 response has data:', response && 'data' in response)
      console.log('🔍 response.data:', response?.data)

    // 新しいレスポンス形式に対応: {success: true, data: {timetables: [...], count: N}}
    if (response && typeof response === 'object' && 'success' in response && response.success && 'data' in response) {
      const data = response.data as { timetables: TimetableListItem[]; count: number }
      if (data && 'timetables' in data && Array.isArray(data.timetables)) {
        console.log('✅ 時間割データを正常に抽出:', data.timetables.length, '件')
        return data.timetables
      }
    }

    // 従来の形式に対応: {timetables: [...], count: N}
    if (response && typeof response === 'object' && 'timetables' in response) {
      const timetables = (response as any).timetables
      if (Array.isArray(timetables)) {
        console.log('✅ 従来形式の時間割データを抽出:', timetables.length, '件')
        return timetables
      }
    }

    // 直接配列が返された場合
    if (Array.isArray(response)) {
      console.log('✅ 直接配列形式の時間割データ:', response.length, '件')
      return response
    }

    console.warn('⚠️ 予期しないレスポンス形式:', response)
    return []
    } catch (error) {
      console.error('❌ getSavedTimetables API呼び出しでエラー:', error)
      return []
    }
  },

  async getTimetableDetail(id: string, options?: ApiOptions): Promise<TimetableDetail> {
    return apiClient.get<TimetableDetail>(`/frontend/school/timetables/${id}`, options)
  },

  // 生成された時間割の詳細取得
  async getSavedTimetableDetail(id: string, options?: ApiOptions): Promise<TimetableDetail> {
    return apiClient.get<TimetableDetail>(`/timetable/program/saved/${id}`, options)
  },

  async updateTimetable(id: string, data: unknown, options?: ApiOptions): Promise<TimetableDetail> {
    return apiClient.put<TimetableDetail>(`/frontend/school/timetables/${id}`, data, options)
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
    }>('/timetable/program/generate', { useOptimization: false, useNewAlgorithm: true }, options)
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
    }>('/timetable/program/config', options)
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
    }>('/timetable/program/validate', { timetableData }, options)
  },
}
