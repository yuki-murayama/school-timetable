/**
 * 学校設定API
 */

import type { SchoolSettings } from '../../../shared/types'
import { type ApiOptions, apiClient } from './client'

export const schoolApi = {
  async getSettings(options?: ApiOptions): Promise<SchoolSettings> {
    return apiClient.get<SchoolSettings>('/frontend/school/settings', options)
  },

  async updateSettings(settings: SchoolSettings, options?: ApiOptions): Promise<SchoolSettings> {
    return apiClient.put<SchoolSettings>('/frontend/school/settings', settings, options)
  },
}
