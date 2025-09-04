/**
 * 統合型安全APIクライアント
 * OpenAPI型安全システムとの統合
 */

import {
  type Classroom,
  ClassroomSchema,
  type EnhancedSchoolSettings,
  EnhancedSchoolSettingsSchema,
  type SchoolSettings,
  SchoolSettingsSchema,
  type Subject,
  SubjectSchema,
  type Teacher,
  TeacherSchema,
  type Timetable,
  TimetableSchema,
} from '@shared/schemas'
import { z } from 'zod'
import {
  handleApiError,
  isApiError,
  isValidationError,
  type TypeSafeApiOptions,
  typeSafeApiClient,
} from '../type-safe-client'

// API ベースURL統一 (v1削除により統一APIとして標準化)
const API_BASE = ''

// ======================
// 学校設定API クライアント
// ======================

export const schoolSettingsApiV2 = {
  /**
   * 学校設定を取得
   * @returns 拡張学校設定データ
   */
  async getSettings(options?: TypeSafeApiOptions): Promise<EnhancedSchoolSettings> {
    return typeSafeApiClient.get(
      `${API_BASE}/school/settings`,
      EnhancedSchoolSettingsSchema,
      options
    )
  },

  /**
   * 学校設定を更新
   * @param settings 更新する学校設定
   * @returns 更新された学校設定データ
   */
  async updateSettings(
    settings: Omit<SchoolSettings, 'id' | 'created_at' | 'updated_at'>,
    options?: TypeSafeApiOptions
  ): Promise<EnhancedSchoolSettings> {
    const updateSchema = SchoolSettingsSchema.omit({
      id: true,
      created_at: true,
      updated_at: true,
    })

    return typeSafeApiClient.put(
      `${API_BASE}/school/settings`,
      settings,
      updateSchema,
      EnhancedSchoolSettingsSchema,
      options
    )
  },
}

// ======================
// 教師管理API クライアント
// ======================

// 教師検索パラメータ
const TeacherQueryParamsSchema = z.object({
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
  search: z.string().max(100).optional(),
  subject: z.string().min(1).optional(),
  grade: z.number().min(1).max(6).optional(),
  sort: z.enum(['name', 'created_at', 'order']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
})

type TeacherQueryParams = z.infer<typeof TeacherQueryParamsSchema>

// 教師一覧レスポンス
const TeachersListResponseSchema = z.object({
  teachers: z.array(TeacherSchema),
  pagination: z.object({
    page: z.number().min(1),
    limit: z.number().min(1),
    total: z.number().min(0),
    totalPages: z.number().min(0),
  }),
})

type TeachersListResponse = z.infer<typeof TeachersListResponseSchema>

// 教師作成リクエスト
const CreateTeacherRequestSchemaV2 = z.object({
  name: z.string().min(1).max(100),
  subjects: z.array(z.string().min(1)).default([]), // 空配列を許可、UUID制約を緩和
  grades: z.array(z.number().min(1).max(6)).default([]), // 空配列を許可
  assignmentRestrictions: z
    .array(
      z.object({
        period: z.number(),
        day: z.string(),
        type: z.string(),
      })
    )
    .optional(),
  order: z.number().int().positive().optional(),
  // フロントエンドから送信される可能性のあるフィールドを許可（無視）
  school_id: z.string().optional(),
})

// 教師更新リクエスト（部分更新対応）
const UpdateTeacherRequestSchemaV2 = CreateTeacherRequestSchemaV2.partial()

// 教科作成リクエスト
const CreateSubjectRequestSchemaV2 = z.object({
  name: z.string().min(1).max(100),
  grades: z.array(z.number().min(1).max(6)).optional(),
  weeklyHours: z.record(z.string().regex(/^[1-6]$/), z.number().min(1).max(10)),
  requiresSpecialClassroom: z.boolean().optional(),
  classroomType: z
    .enum([
      '普通教室',
      '理科室',
      '音楽室',
      '美術室',
      '体育館',
      '図書室',
      'コンピュータ室',
      '技術室',
      '家庭科室',
      'その他',
    ])
    .optional(),
  order: z.number().int().positive().optional(),
})

// 教科更新リクエスト（部分更新対応）
const UpdateSubjectRequestSchemaV2 = CreateSubjectRequestSchemaV2.partial()

// 教科検索パラメータ
const SubjectQueryParamsSchema = z.object({
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
  search: z.string().max(100).optional(),
  grade: z.number().min(1).max(6).optional(),
  classroomType: z
    .enum([
      '普通教室',
      '理科室',
      '音楽室',
      '美術室',
      '体育館',
      '図書室',
      'コンピュータ室',
      '技術室',
      '家庭科室',
      'その他',
    ])
    .optional(),
  sort: z.enum(['name', 'created_at', 'order']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
})

type SubjectQueryParams = z.infer<typeof SubjectQueryParamsSchema>

// 教科一覧レスポンス
const SubjectsListResponseSchema = z.object({
  subjects: z.array(SubjectSchema),
  pagination: z.object({
    page: z.number().min(1),
    limit: z.number().min(1),
    total: z.number().min(0),
    totalPages: z.number().min(0),
  }),
})

type SubjectsListResponse = z.infer<typeof SubjectsListResponseSchema>

export const teachersApiV2 = {
  /**
   * 教師一覧を取得
   * @param params 検索・フィルタリング・ページネーションパラメータ
   * @returns 教師一覧と統計情報
   */
  async getTeachers(
    params?: TeacherQueryParams,
    options?: TypeSafeApiOptions
  ): Promise<TeachersListResponse> {
    // クエリパラメータを文字列に変換
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString())
        }
      })
    }

    const queryString = searchParams.toString()
    const endpoint = queryString
      ? `${API_BASE}/school/teachers?${queryString}`
      : `${API_BASE}/school/teachers`

    const response = await typeSafeApiClient.get(endpoint, TeachersListResponseSchema, options)
    return response
  },

  /**
   * 教師詳細を取得
   * @param id 教師ID
   * @returns 教師詳細データ
   */
  async getTeacher(id: string, options?: TypeSafeApiOptions): Promise<Teacher> {
    return typeSafeApiClient.get(`${API_BASE}/school/teachers/${id}`, TeacherSchema, options)
  },

  /**
   * 教師を作成
   * @param teacherData 作成する教師データ
   * @returns 作成された教師データ
   */
  async createTeacher(
    teacherData: z.infer<typeof CreateTeacherRequestSchemaV2>,
    options?: TypeSafeApiOptions
  ): Promise<Teacher> {
    return typeSafeApiClient.post(
      `${API_BASE}/school/teachers`,
      teacherData,
      CreateTeacherRequestSchemaV2,
      TeacherSchema,
      options
    )
  },

  /**
   * 教師を更新
   * @param id 教師ID
   * @param updateData 更新データ（部分更新対応）
   * @returns 更新された教師データ
   */
  async updateTeacher(
    id: string,
    updateData: z.infer<typeof UpdateTeacherRequestSchemaV2>,
    options?: TypeSafeApiOptions
  ): Promise<Teacher> {
    return typeSafeApiClient.put(
      `${API_BASE}/school/teachers/${id}`,
      updateData,
      UpdateTeacherRequestSchemaV2,
      TeacherSchema,
      options
    )
  },

  /**
   * 教師を削除
   * @param id 教師ID
   * @returns 削除結果
   */
  async deleteTeacher(
    id: string,
    options?: TypeSafeApiOptions
  ): Promise<{ deletedId: string; deletedName: string; deletedAt: string }> {
    const DeleteResponseSchema = z.object({
      deletedId: z.string().uuid(),
      deletedName: z.string(),
      deletedAt: z.string().datetime(),
    })

    return typeSafeApiClient.delete(
      `${API_BASE}/school/teachers/${id}`,
      DeleteResponseSchema,
      options
    )
  },
}

// ======================
// 教科管理API クライアント
// ======================

export const subjectsApiV2 = {
  /**
   * 教科一覧を取得
   * @param params 検索・フィルタリング・ページネーションパラメータ
   * @returns 教科一覧と統計情報
   */
  async getSubjects(
    params?: SubjectQueryParams,
    options?: TypeSafeApiOptions
  ): Promise<SubjectsListResponse> {
    // クエリパラメータを文字列に変換
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString())
        }
      })
    }

    const queryString = searchParams.toString()
    const endpoint = queryString
      ? `${API_BASE}/school/subjects?${queryString}`
      : `${API_BASE}/school/subjects`

    return typeSafeApiClient.get(endpoint, SubjectsListResponseSchema, options)
  },

  /**
   * 教科詳細を取得
   * @param id 教科ID
   * @returns 教科詳細データ
   */
  async getSubject(id: string, options?: TypeSafeApiOptions): Promise<Subject> {
    return typeSafeApiClient.get(`${API_BASE}/school/subjects/${id}`, SubjectSchema, options)
  },

  /**
   * 教科を作成
   * @param subjectData 作成する教科データ
   * @returns 作成された教科データ
   */
  async createSubject(
    subjectData: z.infer<typeof CreateSubjectRequestSchemaV2>,
    options?: TypeSafeApiOptions
  ): Promise<Subject> {
    return typeSafeApiClient.post(
      `${API_BASE}/school/subjects`,
      subjectData,
      CreateSubjectRequestSchemaV2,
      SubjectSchema,
      options
    )
  },

  /**
   * 教科を更新
   * @param id 教科ID
   * @param updateData 更新データ（部分更新対応）
   * @returns 更新された教科データ
   */
  async updateSubject(
    id: string,
    updateData: z.infer<typeof UpdateSubjectRequestSchemaV2>,
    options?: TypeSafeApiOptions
  ): Promise<Subject> {
    return typeSafeApiClient.put(
      `${API_BASE}/school/subjects/${id}`,
      updateData,
      UpdateSubjectRequestSchemaV2,
      SubjectSchema,
      options
    )
  },

  /**
   * 教科を削除
   * @param id 教科ID
   * @returns 削除結果
   */
  async deleteSubject(
    id: string,
    options?: TypeSafeApiOptions
  ): Promise<{ deletedId: string; deletedName: string; deletedAt: string }> {
    const DeleteResponseSchema = z.object({
      deletedId: z.string().uuid(),
      deletedName: z.string(),
      deletedAt: z.string().datetime(),
    })

    return typeSafeApiClient.delete(
      `${API_BASE}/school/subjects/${id}`,
      DeleteResponseSchema,
      options
    )
  },
}

// ======================
// 教室管理API クライアント
// ======================

// 教室検索パラメータ
const ClassroomQueryParamsSchema = z.object({
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
  search: z.string().max(100).optional(),
  type: z
    .enum([
      '普通教室',
      '理科室',
      '音楽室',
      '美術室',
      '体育館',
      '図書室',
      'コンピュータ室',
      '技術室',
      '家庭科室',
      'その他',
    ])
    .optional(),
  capacity_min: z.number().min(1).optional(),
  capacity_max: z.number().max(100).optional(),
  sort: z.enum(['name', 'type', 'capacity', 'created_at', 'order']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
})

type ClassroomQueryParams = z.infer<typeof ClassroomQueryParamsSchema>

// 教室一覧レスポンス
const ClassroomsListResponseSchema = z.object({
  classrooms: z.array(ClassroomSchema),
  pagination: z.object({
    page: z.number().min(1),
    limit: z.number().min(1),
    total: z.number().min(0),
    totalPages: z.number().min(0),
  }),
  summary: z
    .object({
      totalCapacity: z.number().min(0),
      typeDistribution: z.record(z.string(), z.number()),
    })
    .optional(),
})

type ClassroomsListResponse = z.infer<typeof ClassroomsListResponseSchema>

// 教室作成リクエスト
const CreateClassroomRequestSchemaV2 = z.object({
  name: z.string().min(1).max(100),
  type: z.enum([
    '普通教室',
    '理科室',
    '音楽室',
    '美術室',
    '体育館',
    '図書室',
    'コンピュータ室',
    '技術室',
    '家庭科室',
    'その他',
  ]),
  capacity: z.number().min(1).max(100).optional(),
  count: z.number().min(1).max(50).default(1),
  order: z.number().int().positive().optional(),
})

// 教室更新リクエスト（部分更新対応）
const UpdateClassroomRequestSchemaV2 = CreateClassroomRequestSchemaV2.partial()

export const classroomsApiV2 = {
  /**
   * 教室一覧を取得
   * @param params 検索・フィルタリング・ページネーションパラメータ
   * @returns 教室一覧と統計情報
   */
  async getClassrooms(
    params?: ClassroomQueryParams,
    options?: TypeSafeApiOptions
  ): Promise<ClassroomsListResponse> {
    // クエリパラメータを文字列に変換
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString())
        }
      })
    }

    const queryString = searchParams.toString()
    const endpoint = queryString
      ? `${API_BASE}/school/classrooms?${queryString}`
      : `${API_BASE}/school/classrooms`

    return typeSafeApiClient.get(endpoint, ClassroomsListResponseSchema, options)
  },

  /**
   * 教室詳細を取得
   * @param id 教室ID
   * @returns 教室詳細データ
   */
  async getClassroom(id: string, options?: TypeSafeApiOptions): Promise<Classroom> {
    return typeSafeApiClient.get(`${API_BASE}/school/classrooms/${id}`, ClassroomSchema, options)
  },

  /**
   * 教室を作成
   * @param classroomData 作成する教室データ
   * @returns 作成された教室データ
   */
  async createClassroom(
    classroomData: z.infer<typeof CreateClassroomRequestSchemaV2>,
    options?: TypeSafeApiOptions
  ): Promise<Classroom> {
    return typeSafeApiClient.post(
      `${API_BASE}/school/classrooms`,
      classroomData,
      CreateClassroomRequestSchemaV2,
      ClassroomSchema,
      options
    )
  },

  /**
   * 教室を更新
   * @param id 教室ID
   * @param updateData 更新データ（部分更新対応）
   * @returns 更新された教室データ
   */
  async updateClassroom(
    id: string,
    updateData: z.infer<typeof UpdateClassroomRequestSchemaV2>,
    options?: TypeSafeApiOptions
  ): Promise<Classroom> {
    return typeSafeApiClient.put(
      `${API_BASE}/school/classrooms/${id}`,
      updateData,
      UpdateClassroomRequestSchemaV2,
      ClassroomSchema,
      options
    )
  },

  /**
   * 教室を削除
   * @param id 教室ID
   * @returns 削除結果
   */
  async deleteClassroom(
    id: string,
    options?: TypeSafeApiOptions
  ): Promise<{ deletedId: string; deletedName: string; deletedAt: string }> {
    const DeleteResponseSchema = z.object({
      deletedId: z.string().uuid(),
      deletedName: z.string(),
      deletedAt: z.string().datetime(),
    })

    return typeSafeApiClient.delete(
      `${API_BASE}/school/classrooms/${id}`,
      DeleteResponseSchema,
      options
    )
  },
}

// ======================
// 時間割管理API クライアント
// ======================

// 時間割検索パラメータ
const TimetableQueryParamsSchema = z.object({
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
  grade: z.number().min(1).max(6).optional(),
  classNumber: z.number().min(1).max(20).optional(),
  version: z.string().max(50).optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  sort: z.enum(['created_at', 'updated_at', 'grade', 'class_number', 'version']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
})

type TimetableQueryParams = z.infer<typeof TimetableQueryParamsSchema>

// 時間割一覧レスポンス
const TimetablesListResponseSchema = z.object({
  timetables: z.array(TimetableSchema),
  pagination: z.object({
    page: z.number().min(1),
    limit: z.number().min(1),
    total: z.number().min(0),
    totalPages: z.number().min(0),
  }),
  summary: z
    .object({
      byGrade: z.record(z.string(), z.number()),
      byStatus: z.record(z.string(), z.number()),
      totalSlots: z.number().min(0),
    })
    .optional(),
})

type TimetablesListResponse = z.infer<typeof TimetablesListResponseSchema>

// 時間割生成リクエスト
const GenerateTimetableRequestSchemaV2 = z.object({
  grade: z.number().min(1).max(6),
  classNumber: z.number().min(1).max(20),
  version: z.string().min(1).max(50).default('v1'),
  constraints: z
    .object({
      maxPeriodsPerDay: z.number().min(1).max(10).default(6),
      allowConsecutive: z.boolean().default(true),
      preferMorning: z.array(z.string().uuid()).default([]),
      avoidFriday: z.array(z.string().uuid()).default([]),
      fixedSlots: z
        .array(
          z.object({
            weekday: z.number().min(1).max(5),
            period: z.number().min(1).max(10),
            subjectId: z.string().uuid(),
            teacherId: z.string().uuid().optional(),
            classroomId: z.string().uuid().optional(),
          })
        )
        .default([]),
    })
    .optional(),
  metadata: z
    .object({
      description: z.string().max(500).optional(),
      tags: z.array(z.string().max(50)).max(10).default([]),
      priority: z.enum(['low', 'normal', 'high']).default('normal'),
    })
    .optional(),
})

// 時間割生成状況レスポンス
const TimetableGenerationStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  progress: z.number().min(0).max(100),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  result: TimetableSchema.optional(),
  errors: z
    .array(
      z.object({
        code: z.string(),
        message: z.string(),
        details: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .default([]),
  metadata: z
    .object({
      totalSlots: z.number(),
      filledSlots: z.number(),
      conflicts: z.number(),
      optimizationScore: z.number().min(0).max(1).optional(),
    })
    .optional(),
})

// 時間割更新リクエスト（部分更新対応）
const UpdateTimetableRequestSchemaV2 = z.object({
  slots: z
    .array(
      z.object({
        weekday: z.number().min(1).max(5),
        period: z.number().min(1).max(10),
        subjectId: z.string().uuid(),
        teacherId: z.string().uuid().optional(),
        classroomId: z.string().uuid().optional(),
      })
    )
    .optional(),
  version: z.string().min(1).max(50).optional(),
  metadata: z
    .object({
      description: z.string().max(500).optional(),
      tags: z.array(z.string().max(50)).max(10).optional(),
      priority: z.enum(['low', 'normal', 'high']).optional(),
    })
    .optional(),
})

export const timetablesApiV2 = {
  /**
   * 時間割一覧を取得
   * @param params 検索・フィルタリング・ページネーションパラメータ
   * @returns 時間割一覧と統計情報
   */
  async getTimetables(
    params?: TimetableQueryParams,
    options?: TypeSafeApiOptions
  ): Promise<TimetablesListResponse> {
    // クエリパラメータを文字列に変換
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString())
        }
      })
    }

    const queryString = searchParams.toString()
    const endpoint = queryString
      ? `${API_BASE}/school/timetables?${queryString}`
      : `${API_BASE}/school/timetables`

    return typeSafeApiClient.get(endpoint, TimetablesListResponseSchema, options)
  },

  /**
   * 時間割詳細を取得
   * @param id 時間割ID
   * @returns 時間割詳細データ
   */
  async getTimetable(id: string, options?: TypeSafeApiOptions): Promise<Timetable> {
    return typeSafeApiClient.get(`${API_BASE}/school/timetables/${id}`, TimetableSchema, options)
  },

  /**
   * 時間割を生成
   * @param generateData 生成パラメータ
   * @returns 生成ジョブ情報
   */
  async generateTimetable(
    generateData: z.infer<typeof GenerateTimetableRequestSchemaV2>,
    options?: TypeSafeApiOptions
  ): Promise<{ jobId: string; estimatedDuration: number; statusUrl: string }> {
    const GenerateResponseSchema = z.object({
      jobId: z.string().uuid(),
      estimatedDuration: z.number(),
      statusUrl: z.string(),
    })

    return typeSafeApiClient.post(
      `${API_BASE}/school/timetables/generate`,
      generateData,
      GenerateTimetableRequestSchemaV2,
      GenerateResponseSchema,
      options
    )
  },

  /**
   * 時間割生成状況を確認
   * @param jobId 生成ジョブID
   * @returns 生成状況と結果
   */
  async getTimetableGenerationStatus(
    jobId: string,
    options?: TypeSafeApiOptions
  ): Promise<z.infer<typeof TimetableGenerationStatusSchema>> {
    return typeSafeApiClient.get(
      `${API_BASE}/school/timetables/generate/${jobId}`,
      TimetableGenerationStatusSchema,
      options
    )
  },

  /**
   * 時間割を更新
   * @param id 時間割ID
   * @param updateData 更新データ（部分更新対応）
   * @returns 更新された時間割データ
   */
  async updateTimetable(
    id: string,
    updateData: z.infer<typeof UpdateTimetableRequestSchemaV2>,
    options?: TypeSafeApiOptions
  ): Promise<Timetable> {
    return typeSafeApiClient.put(
      `${API_BASE}/school/timetables/${id}`,
      updateData,
      UpdateTimetableRequestSchemaV2,
      TimetableSchema,
      options
    )
  },

  /**
   * 時間割を削除
   * @param id 時間割ID
   * @returns 削除結果
   */
  async deleteTimetable(
    id: string,
    options?: TypeSafeApiOptions
  ): Promise<{ deletedId: string; deletedVersion: string; deletedAt: string }> {
    const DeleteResponseSchema = z.object({
      deletedId: z.string().uuid(),
      deletedVersion: z.string(),
      deletedAt: z.string().datetime(),
    })

    return typeSafeApiClient.delete(
      `${API_BASE}/school/timetables/${id}`,
      DeleteResponseSchema,
      options
    )
  },
}

// ======================
// APIシステム情報
// ======================

// ======================
// 条件設定API クライアント
// ======================

// 条件設定スキーマ
const ConditionsSchema = z.object({
  id: z.string().default('default'),
  conditions: z.string().describe('時間割生成時の特別な条件'),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

// 条件設定更新リクエスト
const UpdateConditionsRequestSchema = z.object({
  conditions: z.string(),
})

type ConditionsData = z.infer<typeof ConditionsSchema>
type UpdateConditionsRequest = z.infer<typeof UpdateConditionsRequestSchema>

export const conditionsApiV2 = {
  /**
   * 条件設定を取得
   * @returns 条件設定データ
   */
  async getConditions(options?: TypeSafeApiOptions): Promise<ConditionsData> {
    return typeSafeApiClient.get(
      `${API_BASE}/school/conditions`,
      ConditionsSchema,
      options
    )
  },

  /**
   * 条件設定を更新
   * @param conditions 更新する条件設定
   * @returns 更新された条件設定データ
   */
  async saveConditions(
    conditions: UpdateConditionsRequest,
    options?: TypeSafeApiOptions
  ): Promise<ConditionsData> {
    return typeSafeApiClient.put(
      `${API_BASE}/school/conditions`,
      conditions,
      UpdateConditionsRequestSchema,
      ConditionsSchema,
      options
    )
  },
}

// ======================
// システム情報API クライアント
// ======================

export const systemApiV2 = {
  /**
   * APIヘルスチェック
   */
  async healthCheck(options?: TypeSafeApiOptions) {
    const HealthResponseSchema = z.object({
      status: z.string(),
      timestamp: z.string().datetime(),
      database: z.string(),
      uptime: z.number(),
      version: z.string(),
      environment: z.string(),
    })

    return typeSafeApiClient.get(`${API_BASE}/health`, HealthResponseSchema, options)
  },

  /**
   * API情報取得
   */
  async getInfo(options?: TypeSafeApiOptions) {
    const InfoResponseSchema = z.object({
      name: z.string(),
      version: z.string(),
      description: z.string(),
      timestamp: z.string().datetime(),
      environment: z.string(),
      features: z.array(z.string()),
    })

    return typeSafeApiClient.get(`${API_BASE}/info`, InfoResponseSchema, options)
  },

  /**
   * API統計情報取得
   */
  async getMetrics(options?: TypeSafeApiOptions) {
    const MetricsResponseSchema = z.object({
      statistics: z.object({
        teachers: z.number().min(0),
        subjects: z.number().min(0),
        classrooms: z.number().min(0),
        schoolSettings: z.number().min(0),
      }),
      api: z.object({
        version: z.string(),
        environment: z.string(),
        timestamp: z.string().datetime(),
        uptime: z.number(),
      }),
      features: z.array(z.string()),
    })

    return typeSafeApiClient.get(`${API_BASE}/metrics`, MetricsResponseSchema, options)
  },
}

// ======================
// 統合APIクライアント
// ======================

/**
 * 型安全APIクライアント - 統合インターフェース
 * すべてのAPIエンドポイントへの型安全アクセス
 */
export const api = {
  // 学校設定
  schoolSettings: schoolSettingsApiV2,

  // 教師管理
  teachers: teachersApiV2,

  // 教科管理
  subjects: subjectsApiV2,

  // 教室管理
  classrooms: classroomsApiV2,

  // 条件設定
  conditions: conditionsApiV2,

  // 時間割管理
  timetables: timetablesApiV2,

  // システム情報
  system: systemApiV2,

  // エラーハンドリングヘルパー
  handleError: handleApiError,
  isApiError,
  isValidationError,
} as const

// 型安全性の確保
export type ApiClient = typeof api

// デフォルトエクスポート
export default api


// ======================
// ユーティリティ関数
// ======================

/**
 * 統一API エラーハンドリングヘルパー
 * React コンポーネントでの使用に最適化
 */
export const withApiV2ErrorHandling = <T extends unknown[], R>(
  apiFunction: (...args: T) => Promise<R>
) => {
  return async (
    ...args: T
  ): Promise<{ success: true; data: R } | { success: false; error: string }> => {
    try {
      const data = await apiFunction(...args)
      return { success: true, data }
    } catch (error) {
      return {
        success: false,
        error: handleApiError(error),
      }
    }
  }
}

// 型安全なクエリキーの型定義
type QueryKeyBase = readonly string[]
type QueryKeyWithParams<T> = readonly [...QueryKeyBase, T]

/**
 * React Query / SWR用の型安全キー生成ヘルパー
 */
export const apiKeys = {
  schoolSettings: (): QueryKeyBase => ['schoolSettings'] as const,
  teachers: {
    all: (): QueryKeyBase => ['teachers'] as const,
    list: (params?: TeacherQueryParams): QueryKeyWithParams<TeacherQueryParams | undefined> =>
      ['teachers', 'list', params] as const,
    detail: (id: string): QueryKeyWithParams<string> => ['teachers', 'detail', id] as const,
  },
  subjects: {
    all: (): QueryKeyBase => ['subjects'] as const,
    list: (params?: SubjectQueryParams): QueryKeyWithParams<SubjectQueryParams | undefined> =>
      ['subjects', 'list', params] as const,
    detail: (id: string): QueryKeyWithParams<string> => ['subjects', 'detail', id] as const,
  },
  classrooms: {
    all: (): QueryKeyBase => ['classrooms'] as const,
    list: (params?: ClassroomQueryParams): QueryKeyWithParams<ClassroomQueryParams | undefined> =>
      ['classrooms', 'list', params] as const,
    detail: (id: string): QueryKeyWithParams<string> => ['classrooms', 'detail', id] as const,
  },
  timetables: {
    all: (): QueryKeyBase => ['timetables'] as const,
    list: (params?: TimetableQueryParams): QueryKeyWithParams<TimetableQueryParams | undefined> =>
      ['timetables', 'list', params] as const,
    detail: (id: string): QueryKeyWithParams<string> => ['timetables', 'detail', id] as const,
    generate: (
      data: z.infer<typeof GenerateTimetableRequestSchemaV2>
    ): QueryKeyWithParams<z.infer<typeof GenerateTimetableRequestSchemaV2>> =>
      ['timetables', 'generate', data] as const,
    generationStatus: (jobId: string): QueryKeyWithParams<string> =>
      ['timetables', 'generate', 'status', jobId] as const,
  },
  system: {
    health: (): QueryKeyBase => ['system', 'health'] as const,
    info: (): QueryKeyBase => ['system', 'info'] as const,
    metrics: (): QueryKeyBase => ['system', 'metrics'] as const,
  },
} as const

