/**
 * 型安全条件設定API - Zodスキーマバリデーション統合
 */

import { z } from 'zod'
import { type ApiOptions, apiClient } from './client'

// APIリクエスト・レスポンス型定義
const ConditionsSchema = z.object({
  conditions: z.string().min(0, '条件設定は文字列である必要があります'),
})

export const conditionsApi = {
  async getConditions(options?: ApiOptions): Promise<{ conditions: string }> {
    return apiClient.get<{ conditions: string }>(
      '/frontend/school/conditions',
      ConditionsSchema,
      options
    )
  },

  async saveConditions(
    data: { conditions: string },
    options?: ApiOptions
  ): Promise<{ conditions: string }> {
    return apiClient.put<{ conditions: string }, { conditions: string }>(
      '/frontend/school/conditions',
      data,
      ConditionsSchema,
      ConditionsSchema,
      options
    )
  },
}
