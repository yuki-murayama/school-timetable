/**
 * 条件設定API
 */

import { type ApiOptions, apiClient } from './client'

export const conditionsApi = {
  async getConditions(options?: ApiOptions): Promise<{ conditions: string }> {
    return apiClient.get<{ conditions: string }>('/frontend/school/conditions', options)
  },

  async saveConditions(
    data: { conditions: string },
    options?: ApiOptions
  ): Promise<{ conditions: string }> {
    return apiClient.put<{ conditions: string }>('/frontend/school/conditions', data, options)
  },
}
