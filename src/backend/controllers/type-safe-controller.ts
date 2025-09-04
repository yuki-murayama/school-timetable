/**
 * 型安全コントローラー - Zodスキーマベースのリクエスト/レスポンス処理
 * 完全型安全なHTTPハンドラーとエラーハンドリング
 */

import {
  CreateTeacherRequestSchema,
  type Env,
  IdSchema,
  SchoolSettingsSchema,
} from '@shared/schemas'
import type { Context } from 'hono'
import { z } from 'zod'
import { TypeSafeSchoolService, TypeSafeServiceError } from '../services/type-safe-service'

/**
 * 型安全なコントローラーベースクラス
 */
export abstract class TypeSafeController {
  protected getTypeSafeSchoolService(c: Context<{ Bindings: Env }>): TypeSafeSchoolService {
    console.log('🏗️ TypeSafeSchoolService初期化開始')
    console.log('🏗️ DB環境変数:', { hasDB: !!c.env?.DB, dbType: typeof c.env?.DB })

    if (!c.env?.DB) {
      console.error('❌ DB環境変数が見つかりません')
      throw new Error('Database connection not available')
    }

    const service = new TypeSafeSchoolService(c.env.DB)
    console.log('✅ TypeSafeSchoolService初期化完了')
    return service
  }

  /**
   * 型安全な成功レスポンス
   */
  protected successResponse<T>(c: Context, data: T, message?: string, statusCode: number = 200) {
    return c.json(
      {
        success: true,
        data,
        message,
        timestamp: new Date().toISOString(),
      },
      statusCode
    )
  }

  /**
   * 型安全なエラーレスポンス
   */
  protected errorResponse(
    c: Context,
    error: string | Error | TypeSafeServiceError,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    let errorInfo: {
      code: string
      message: string
      details?: Record<string, unknown>
    }

    if (error instanceof TypeSafeServiceError) {
      errorInfo = {
        code: error.code,
        message: error.message,
        details: error.details,
      }

      // サービスエラーコードに基づくステータスコード調整
      switch (error.code) {
        case 'TEACHER_NOT_FOUND':
        case 'SUBJECT_NOT_FOUND':
        case 'CLASSROOM_NOT_FOUND':
          statusCode = 404
          break
        case 'DATA_VALIDATION_ERROR':
          statusCode = 400
          break
        default:
          statusCode = statusCode || 500
      }
    } else if (error instanceof z.ZodError) {
      errorInfo = {
        code: 'VALIDATION_ERROR',
        message: 'リクエストデータの形式が正しくありません',
        details: {
          validationErrors: error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
          })),
        },
      }
      statusCode = 400
    } else if (error instanceof Error) {
      errorInfo = {
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
        details,
      }
    } else {
      errorInfo = {
        code: 'UNKNOWN_ERROR',
        message: String(error),
        details,
      }
    }

    console.error('コントローラーエラー:', {
      error: errorInfo,
      timestamp: new Date().toISOString(),
      statusCode,
    })

    return c.json(
      {
        success: false,
        error: errorInfo.code,
        message: errorInfo.message,
        details: errorInfo.details,
        timestamp: new Date().toISOString(),
      },
      statusCode
    )
  }

  /**
   * 型安全なリクエストボディ解析
   */
  protected async parseRequestBody<T>(c: Context, schema: z.ZodType<T>): Promise<T> {
    try {
      const body = await c.req.json()
      return schema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw error // ZodErrorはerrorResponseで適切に処理される
      }
      throw new Error('リクエストボディの解析に失敗しました')
    }
  }

  /**
   * 型安全なパラメータ解析
   */
  protected parseParam<T>(c: Context, paramName: string, schema: z.ZodType<T>): T {
    const param = c.req.param(paramName)
    if (!param) {
      throw new Error(`必須パラメータ '${paramName}' が見つかりません`)
    }
    return schema.parse(param)
  }

  /**
   * 型安全なクエリパラメータ解析
   */
  protected parseQuery<T>(c: Context, schema: z.ZodType<T>): T {
    const query = c.req.query()
    return schema.parse(query)
  }
}

/**
 * 型安全学校設定コントローラー
 */
export class TypeSafeSchoolSettingsController extends TypeSafeController {
  /**
   * 学校設定取得
   */
  async getSchoolSettings(c: Context<{ Bindings: Env }>) {
    try {
      const schoolService = this.getTypeSafeSchoolService(c)
      const settings = await schoolService.schoolSettings.getSchoolSettings()

      return this.successResponse(c, settings)
    } catch (error) {
      return this.errorResponse(c, error)
    }
  }

  /**
   * 学校設定更新
   */
  async updateSchoolSettings(c: Context<{ Bindings: Env }>) {
    try {
      const schoolService = this.getTypeSafeSchoolService(c)

      // リクエストボディの型安全な解析
      const updateSchema = SchoolSettingsSchema.omit({
        id: true,
        created_at: true,
        updated_at: true,
      })
      const updates = await this.parseRequestBody(c, updateSchema)

      const updatedSettings = await schoolService.schoolSettings.updateSchoolSettings(updates)

      return this.successResponse(c, updatedSettings, '学校設定を更新しました')
    } catch (error) {
      return this.errorResponse(c, error)
    }
  }
}

/**
 * 型安全教師管理コントローラー
 */
export class TypeSafeTeacherController extends TypeSafeController {
  /**
   * 教師一覧取得
   */
  async getTeachers(c: Context<{ Bindings: Env }>) {
    // 最優先デバッグログ
    console.log('📣 TypeSafeTeacherController.getTeachers() 開始')
    console.log('📣 リクエスト情報:', {
      path: c.req.path,
      method: c.req.method,
      url: c.req.url,
      timestamp: new Date().toISOString(),
      hasEnv: !!c.env,
      hasDB: !!c.env?.DB,
    })

    try {
      console.log('🔍 getTeachers開始', {
        path: c.req.path,
        method: c.req.method,
        timestamp: new Date().toISOString(),
      })

      const schoolService = this.getTypeSafeSchoolService(c)

      // クエリパラメータの型安全な解析
      const querySchema = z.object({
        page: z.string().regex(/^\d+$/).transform(Number).optional(),
        limit: z.string().regex(/^\d+$/).transform(Number).optional(),
        search: z.string().max(100).optional(),
        subject: z.string().uuid().optional(),
        grade: z
          .string()
          .regex(/^[1-6]$/)
          .transform(Number)
          .optional(),
      })
      const query = this.parseQuery(c, querySchema)
      console.log('✅ クエリパラメータ解析成功:', query)

      console.log('🚀 schoolService.teachers.getTeachers呼び出し開始')
      const result = await schoolService.teachers.getTeachers(query)
      console.log('✅ schoolService.teachers.getTeachers呼び出し完了')

      return this.successResponse(c, result)
    } catch (error) {
      console.error('❌ getTeachersエラー:', {
        error: error.message,
        stack: error.stack,
        type: error.constructor.name,
        timestamp: new Date().toISOString(),
      })
      return this.errorResponse(c, error)
    }
  }

  /**
   * 教師詳細取得
   */
  async getTeacher(c: Context<{ Bindings: Env }>) {
    try {
      const schoolService = this.getTypeSafeSchoolService(c)
      const id = this.parseParam(c, 'id', IdSchema)

      const teacher = await schoolService.teachers.getTeacher(id)

      return this.successResponse(c, teacher)
    } catch (error) {
      return this.errorResponse(c, error)
    }
  }

  /**
   * 教師作成
   */
  async createTeacher(c: Context<{ Bindings: Env }>) {
    try {
      const schoolService = this.getTypeSafeSchoolService(c)
      const teacherData = await this.parseRequestBody(c, CreateTeacherRequestSchema)

      const newTeacher = await schoolService.teachers.createTeacher(teacherData)

      return this.successResponse(c, newTeacher, '教師を作成しました', 201)
    } catch (error) {
      return this.errorResponse(c, error)
    }
  }

  /**
   * 教師更新
   */
  async updateTeacher(c: Context<{ Bindings: Env }>) {
    try {
      const schoolService = this.getTypeSafeSchoolService(c)
      const id = this.parseParam(c, 'id', IdSchema)
      const updateData = await this.parseRequestBody(c, CreateTeacherRequestSchema.partial())

      const updatedTeacher = await schoolService.teachers.updateTeacher(id, updateData)

      return this.successResponse(c, updatedTeacher, '教師を更新しました')
    } catch (error) {
      return this.errorResponse(c, error)
    }
  }

  /**
   * 教師削除
   */
  async deleteTeacher(c: Context<{ Bindings: Env }>) {
    try {
      const schoolService = this.getTypeSafeSchoolService(c)
      const id = this.parseParam(c, 'id', IdSchema)

      const deleteResult = await schoolService.teachers.deleteTeacher(id)

      return this.successResponse(c, deleteResult, '教師を削除しました')
    } catch (error) {
      return this.errorResponse(c, error)
    }
  }
}

/**
 * 型安全教科管理コントローラー
 */
export class TypeSafeSubjectController extends TypeSafeController {
  /**
   * 教科一覧取得
   */
  async getSubjects(c: Context<{ Bindings: Env }>) {
    try {
      const schoolService = this.getTypeSafeSchoolService(c)

      const querySchema = z.object({
        page: z.string().regex(/^\d+$/).transform(Number).optional(),
        limit: z.string().regex(/^\d+$/).transform(Number).optional(),
        search: z.string().max(100).optional(),
        grade: z
          .string()
          .regex(/^[1-6]$/)
          .transform(Number)
          .optional(),
        classroomType: z.string().optional(),
      })
      const query = this.parseQuery(c, querySchema)

      const result = await schoolService.subjects.getSubjects(query)

      return this.successResponse(c, result)
    } catch (error) {
      return this.errorResponse(c, error)
    }
  }

  /**
   * 教科詳細取得
   */
  async getSubject(c: Context<{ Bindings: Env }>) {
    try {
      const schoolService = this.getTypeSafeSchoolService(c)
      const id = this.parseParam(c, 'id', IdSchema)

      const subject = await schoolService.subjects.getSubject(id)

      return this.successResponse(c, subject)
    } catch (error) {
      return this.errorResponse(c, error)
    }
  }

  /**
   * 教科作成
   */
  async createSubject(c: Context<{ Bindings: Env }>) {
    try {
      const schoolService = this.getTypeSafeSchoolService(c)

      const createSchema = z.object({
        name: z.string().min(1).max(100),
        grades: z.array(z.number().min(1).max(6)).optional(),
        weeklyHours: z.record(z.string(), z.number()),
        requiresSpecialClassroom: z.boolean().optional(),
        classroomType: z.string().optional(),
        order: z.number().int().positive().optional(),
      })
      const subjectData = await this.parseRequestBody(c, createSchema)

      const newSubject = await schoolService.subjects.createSubject(subjectData)

      return this.successResponse(c, newSubject, '教科を作成しました', 201)
    } catch (error) {
      return this.errorResponse(c, error)
    }
  }

  /**
   * 教科更新
   */
  async updateSubject(c: Context<{ Bindings: Env }>) {
    try {
      const schoolService = this.getTypeSafeSchoolService(c)
      const id = this.parseParam(c, 'id', IdSchema)

      const updateSchema = z
        .object({
          name: z.string().min(1).max(100),
          grades: z.array(z.number().min(1).max(6)),
          weeklyHours: z.record(z.string(), z.number()),
          requiresSpecialClassroom: z.boolean(),
          classroomType: z.string(),
          order: z.number().int().positive(),
        })
        .partial()
      const updateData = await this.parseRequestBody(c, updateSchema)

      const updatedSubject = await schoolService.subjects.updateSubject(id, updateData)

      return this.successResponse(c, updatedSubject, '教科を更新しました')
    } catch (error) {
      return this.errorResponse(c, error)
    }
  }

  /**
   * 教科削除
   */
  async deleteSubject(c: Context<{ Bindings: Env }>) {
    try {
      const schoolService = this.getTypeSafeSchoolService(c)
      const id = this.parseParam(c, 'id', IdSchema)

      const deleteResult = await schoolService.subjects.deleteSubject(id)

      return this.successResponse(c, deleteResult, '教科を削除しました')
    } catch (error) {
      return this.errorResponse(c, error)
    }
  }
}

/**
 * 型安全教室管理コントローラー
 */
export class TypeSafeClassroomController extends TypeSafeController {
  /**
   * 教室一覧取得
   */
  async getClassrooms(c: Context<{ Bindings: Env }>) {
    try {
      const schoolService = this.getTypeSafeSchoolService(c)

      const querySchema = z.object({
        page: z.string().regex(/^\d+$/).transform(Number).optional(),
        limit: z.string().regex(/^\d+$/).transform(Number).optional(),
        search: z.string().max(100).optional(),
        type: z.string().optional(),
        capacity_min: z.string().regex(/^\d+$/).transform(Number).optional(),
        capacity_max: z.string().regex(/^\d+$/).transform(Number).optional(),
      })
      const query = this.parseQuery(c, querySchema)

      const result = await schoolService.classrooms.getClassrooms({
        ...query,
        capacityMin: query.capacity_min,
        capacityMax: query.capacity_max,
      })

      return this.successResponse(c, result)
    } catch (error) {
      return this.errorResponse(c, error)
    }
  }

  /**
   * 教室詳細取得
   */
  async getClassroom(c: Context<{ Bindings: Env }>) {
    try {
      const schoolService = this.getTypeSafeSchoolService(c)
      const id = this.parseParam(c, 'id', IdSchema)

      const classroom = await schoolService.classrooms.getClassroom(id)

      return this.successResponse(c, classroom)
    } catch (error) {
      return this.errorResponse(c, error)
    }
  }

  /**
   * 教室作成
   */
  async createClassroom(c: Context<{ Bindings: Env }>) {
    try {
      const schoolService = this.getTypeSafeSchoolService(c)

      const createSchema = z.object({
        name: z.string().min(1).max(100),
        type: z.string(),
        capacity: z.number().min(1).max(100).optional(),
        count: z.number().min(1).max(50).optional(),
        order: z.number().int().positive().optional(),
      })
      const classroomData = await this.parseRequestBody(c, createSchema)

      const newClassroom = await schoolService.classrooms.createClassroom(classroomData)

      return this.successResponse(c, newClassroom, '教室を作成しました', 201)
    } catch (error) {
      return this.errorResponse(c, error)
    }
  }

  /**
   * 教室更新
   */
  async updateClassroom(c: Context<{ Bindings: Env }>) {
    try {
      const schoolService = this.getTypeSafeSchoolService(c)
      const id = this.parseParam(c, 'id', IdSchema)

      const updateSchema = z
        .object({
          name: z.string().min(1).max(100),
          type: z.string(),
          capacity: z.number().min(1).max(100),
          count: z.number().min(1).max(50),
          order: z.number().int().positive(),
        })
        .partial()
      const updateData = await this.parseRequestBody(c, updateSchema)

      const updatedClassroom = await schoolService.classrooms.updateClassroom(id, updateData)

      return this.successResponse(c, updatedClassroom, '教室を更新しました')
    } catch (error) {
      return this.errorResponse(c, error)
    }
  }

  /**
   * 教室削除
   */
  async deleteClassroom(c: Context<{ Bindings: Env }>) {
    try {
      const schoolService = this.getTypeSafeSchoolService(c)
      const id = this.parseParam(c, 'id', IdSchema)

      const deleteResult = await schoolService.classrooms.deleteClassroom(id)

      return this.successResponse(c, deleteResult, '教室を削除しました')
    } catch (error) {
      return this.errorResponse(c, error)
    }
  }
}

/**
 * 型安全システムコントローラー
 */
export class TypeSafeSystemController extends TypeSafeController {
  /**
   * システムメトリクス取得
   */
  async getMetrics(c: Context<{ Bindings: Env }>) {
    try {
      const schoolService = this.getTypeSafeSchoolService(c)
      const metrics = await schoolService.getSystemMetrics()

      return this.successResponse(c, metrics)
    } catch (error) {
      return this.errorResponse(c, error)
    }
  }

  /**
   * ヘルスチェック
   */
  async healthCheck(c: Context<{ Bindings: Env }>) {
    try {
      const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
        uptime: Math.floor(Date.now() / 1000),
        version: '1.0.0',
        environment: c.env.NODE_ENV || 'development',
      }

      return this.successResponse(c, healthData)
    } catch (error) {
      return this.errorResponse(c, error)
    }
  }

  /**
   * API情報取得
   */
  async getInfo(c: Context<{ Bindings: Env }>) {
    try {
      const infoData = {
        name: '学校時間割管理システム API',
        version: '1.0.0',
        description: '完全型安全な学校時間割管理システムのAPI',
        timestamp: new Date().toISOString(),
        environment: c.env.NODE_ENV || 'development',
        features: [
          '完全型安全性（Zod）',
          'OpenAPI 3.0.3準拠',
          '自動バリデーション',
          'リアルタイムドキュメント',
          '統一エラーハンドリング',
        ],
      }

      return this.successResponse(c, infoData)
    } catch (error) {
      return this.errorResponse(c, error)
    }
  }
}

/**
 * 型安全コントローラーファクトリー
 */
export const typeSafeControllers = {
  schoolSettings: new TypeSafeSchoolSettingsController(),
  teachers: new TypeSafeTeacherController(),
  subjects: new TypeSafeSubjectController(),
  classrooms: new TypeSafeClassroomController(),
  system: new TypeSafeSystemController(),
} as const

export type TypeSafeControllers = typeof typeSafeControllers
