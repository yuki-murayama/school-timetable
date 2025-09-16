/**
 * 型安全学校設定API - Zodスキーマバリデーション統合
 */

import {
  type EnhancedSchoolSettings,
  EnhancedSchoolSettingsSchema,
  type SchoolSettings,
  SchoolSettingsSchema,
} from '@shared/schemas'

// バックエンドAPIと同じ更新用スキーマを定義
const UpdateSchoolSettingsSchema = SchoolSettingsSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

import { type ApiOptions, apiClient } from './client'

export const schoolApi = {
  async getSettings(options?: ApiOptions): Promise<EnhancedSchoolSettings> {
    return apiClient.get<EnhancedSchoolSettings>(
      '/settings',
      EnhancedSchoolSettingsSchema,
      options
    )
  },

  async updateSettings(
    settings: Partial<SchoolSettings>,
    options?: ApiOptions
  ): Promise<EnhancedSchoolSettings> {
    return apiClient.put<Partial<SchoolSettings>, EnhancedSchoolSettings>(
      '/settings',
      settings,
      UpdateSchoolSettingsSchema,
      EnhancedSchoolSettingsSchema,
      options
    )
  },
}
