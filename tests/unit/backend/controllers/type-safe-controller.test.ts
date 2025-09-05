/**
 * 型安全コントローラー 単体テスト
 *
 * 目的: 統一エラーハンドリングとAPIエンドポイント管理の完全型安全性確認
 * 対象ファイル: src/backend/controllers/type-safe-controller.ts
 * カバレッジ目標: 100分岐 100%
 *
 * テスト分類:
 * - TSC-BASE: ベースコントローラー（15分岐）
 * - TSC-SCHOOL: 学校設定コントローラー（8分岐）
 * - TSC-TEACHER: 教師管理コントローラー（25分岐）
 * - TSC-SUBJECT: 教科管理コントローラー（25分岐）
 * - TSC-CLASSROOM: 教室管理コントローラー（20分岐）
 * - TSC-SYSTEM: システムコントローラー（7分岐）
 */

import type { D1Database } from '@cloudflare/workers-types'
import type { Classroom, EnhancedSchoolSettings, Env, Subject, Teacher } from '@shared/schemas'
import type { Context } from 'hono'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import {
  TypeSafeClassroomController,
  TypeSafeController,
  TypeSafeSchoolSettingsController,
  TypeSafeSubjectController,
  TypeSafeSystemController,
  TypeSafeTeacherController,
  typeSafeControllers,
} from '../../../../src/backend/controllers/type-safe-controller'
import { TypeSafeServiceError } from '../../../../src/backend/services/type-safe-service'

// ======================
// モックデータ定義
// ======================

const mockEnhancedSchoolSettings: EnhancedSchoolSettings = {
  id: 'default',
  grade1Classes: 4,
  grade2Classes: 3,
  grade3Classes: 3,
  grade4Classes: 3,
  grade5Classes: 3,
  grade6Classes: 3,
  dailyPeriods: 6,
  saturdayPeriods: 4,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  statistics: {
    totalTeachers: 10,
    totalSubjects: 8,
    totalClassrooms: 15,
    totalClasses: 22,
  },
  validation: {
    isConfigured: true,
    hasMinimumTeachers: true,
    hasMinimumSubjects: true,
    warnings: [],
  },
}

const mockTeacher: Teacher = {
  id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  name: '田中先生',
  subjects: ['数学', '理科'],
  grades: [1, 2],
  assignmentRestrictions: [],
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
}

const mockSubject: Subject = {
  id: 'f47ac10b-58cc-4372-a567-0e02b2c3d480',
  name: '数学',
  grades: [1, 2, 3],
  weeklyHours: { '1': 4, '2': 4, '3': 4 },
  requiresSpecialClassroom: false,
  classroomType: '普通教室',
  order: 1,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
}

const mockClassroom: Classroom = {
  id: 'f47ac10b-58cc-4372-a567-0e02b2c3d481',
  name: '1年A組教室',
  type: '普通教室',
  capacity: 35,
  count: 1,
  order: 1,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
}

// ======================
// モック関数定義
// ======================

// Honoのコンテキストモック
const createMockContext = (
  options: {
    env?: Partial<Env>
    body?: Record<string, unknown>
    params?: Record<string, string>
    query?: Record<string, string>
  } = {}
): Context => {
  const mockEnv: Env = {
    DB: {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue({ results: [], success: true }),
      first: vi.fn().mockResolvedValue(null),
      run: vi.fn().mockResolvedValue({ success: true, changes: 0 }),
    } as any as D1Database,
    NODE_ENV: 'test',
    ...options.env,
  }

  return {
    env: mockEnv,
    req: {
      json: vi.fn().mockResolvedValue(options.body || {}),
      param: vi.fn((key: string) => options.params?.[key]),
      query: vi.fn().mockReturnValue(options.query || {}),
      path: '/test',
      method: 'GET',
      url: 'http://localhost/test',
    },
    json: vi.fn().mockImplementation((data, status) => ({
      response: data,
      status: status || 200,
    })),
  } as Context
}

// TypeSafeSchoolService モック
const mockSchoolService = {
  db: {} as D1Database, // Mock D1Database
  schoolSettings: {
    getSchoolSettings: vi.fn(),
    updateSchoolSettings: vi.fn(),
  },
  teachers: {
    getTeachers: vi.fn(),
    getTeacher: vi.fn(),
    createTeacher: vi.fn(),
    updateTeacher: vi.fn(),
    deleteTeacher: vi.fn(),
  },
  subjects: {
    getSubjects: vi.fn(),
    getSubject: vi.fn(),
    createSubject: vi.fn(),
    updateSubject: vi.fn(),
    deleteSubject: vi.fn(),
  },
  classrooms: {
    getClassrooms: vi.fn(),
    getClassroom: vi.fn(),
    createClassroom: vi.fn(),
    updateClassroom: vi.fn(),
    deleteClassroom: vi.fn(),
  },
  getSystemMetrics: vi.fn(),
}

// TypeSafeController テスト用継承クラス
class TestController extends TypeSafeController {
  // protectedメソッドをテスト用にpublic化
  public testSuccessResponse<T>(c: Context, data: T, message?: string, statusCode?: number) {
    return this.successResponse(c, data, message, statusCode)
  }

  public testErrorResponse(
    c: Context,
    error: unknown,
    statusCode?: number,
    details?: Record<string, unknown>
  ) {
    return this.errorResponse(
      c,
      error as string | Error | TypeSafeServiceError,
      statusCode,
      details
    )
  }

  public async testParseRequestBody<T>(c: Context, schema: z.ZodType<T>) {
    return this.parseRequestBody(c, schema)
  }

  public testParseParam<T>(c: Context, paramName: string, schema: z.ZodType<T>) {
    return this.parseParam(c, paramName, schema)
  }

  public testParseQuery<T>(c: Context, schema: z.ZodType<T>) {
    return this.parseQuery(c, schema)
  }

  // getTypeSafeSchoolServiceをモック化
  protected getTypeSafeSchoolService(_c: Context) {
    return mockSchoolService as any
  }
}

// 各コントローラーのgetTypeSafeSchoolServiceもオーバーライド
class TestTypeTeacherController extends TypeSafeTeacherController {
  protected getTypeSafeSchoolService(_c: Context) {
    return mockSchoolService as any
  }
}

class TestTypeSubjectController extends TypeSafeSubjectController {
  protected getTypeSafeSchoolService(_c: Context) {
    return mockSchoolService as any
  }
}

class TestTypeClassroomController extends TypeSafeClassroomController {
  protected getTypeSafeSchoolService(_c: Context) {
    return mockSchoolService as any
  }
}

class TestTypeSchoolSettingsController extends TypeSafeSchoolSettingsController {
  protected getTypeSafeSchoolService(_c: Context) {
    return mockSchoolService as any
  }
}

class TestTypeSystemController extends TypeSafeSystemController {
  protected getTypeSafeSchoolService(_c: Context) {
    return mockSchoolService as any
  }
}

let testController: TestController
let schoolSettingsController: TestTypeSchoolSettingsController
let teacherController: TestTypeTeacherController
let subjectController: TestTypeSubjectController
let classroomController: TestTypeClassroomController
let systemController: TestTypeSystemController

describe('TypeSafeController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    testController = new TestController()

    // テスト用コントローラーインスタンス作成（getTypeSafeSchoolServiceが既にオーバーライドされている）
    schoolSettingsController = new TestTypeSchoolSettingsController()
    teacherController = new TestTypeTeacherController()
    subjectController = new TestTypeSubjectController()
    classroomController = new TestTypeClassroomController()
    systemController = new TestTypeSystemController()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ======================
  // TSC-BASE: ベースコントローラー（15分岐）
  // ======================

  describe('TypeSafeController (Base)', () => {
    /**
     * TSC-BASE-001: 成功レスポンス（デフォルトステータス）
     * 目的: 標準的な成功レスポンスの生成確認
     * 分岐カバレッジ: デフォルトステータス200分岐
     */
    it('TSC-BASE-001: 成功レスポンス（デフォルトステータス）', () => {
      const context = createMockContext()
      const testData = { id: 'test', name: 'テスト' }

      const _result = testController.testSuccessResponse(context, testData, 'テスト成功')

      expect(context.json).toHaveBeenCalledWith(
        {
          success: true,
          data: testData,
          message: 'テスト成功',
          timestamp: expect.any(String),
        },
        200
      )
    })

    /**
     * TSC-BASE-002: 成功レスポンス（カスタムステータス）
     * 目的: カスタムステータスコードでの成功レスポンス確認
     * 分岐カバレッジ: カスタムステータス分岐
     */
    it('TSC-BASE-002: 成功レスポンス（カスタムステータス）', () => {
      const context = createMockContext()
      const testData = { id: 'created' }

      const _result = testController.testSuccessResponse(context, testData, '作成完了', 201)

      expect(context.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: testData,
        }),
        201
      )
    })

    /**
     * TSC-BASE-003: エラーレスポンス（TypeSafeServiceError）
     * 目的: サービスエラーの適切な処理確認
     * 分岐カバレッジ: TypeSafeServiceError分岐
     */
    it('TSC-BASE-003: エラーレスポンス（TypeSafeServiceError）', () => {
      const context = createMockContext()
      const serviceError = new TypeSafeServiceError('データが見つかりません', 'TEACHER_NOT_FOUND', {
        id: 'test',
      })

      const _result = testController.testErrorResponse(context, serviceError)

      expect(context.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'TEACHER_NOT_FOUND',
          message: 'データが見つかりません',
          details: { id: 'test' },
          timestamp: expect.any(String),
        },
        404
      ) // NOT_FOUNDエラーは404に変換
    })

    /**
     * TSC-BASE-004: エラーレスポンス（ZodError）
     * 目的: Zodバリデーションエラーの処理確認
     * 分岐カバレッジ: ZodError分岐
     */
    it('TSC-BASE-004: エラーレスポンス（ZodError）', () => {
      const context = createMockContext()
      const zodError = new z.ZodError([
        {
          code: z.ZodIssueCode.invalid_type,
          expected: 'string',
          received: 'number',
          path: ['name'],
          message: 'Expected string, received number',
        },
      ])

      const _result = testController.testErrorResponse(context, zodError)

      expect(context.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'リクエストデータの形式が正しくありません',
          details: {
            validationErrors: [
              {
                path: 'name',
                message: 'Expected string, received number',
                code: 'invalid_type',
              },
            ],
          },
          timestamp: expect.any(String),
        },
        400
      )
    })

    /**
     * TSC-BASE-005: エラーレスポンス（通常のError）
     * 目的: 標準エラーの処理確認
     * 分岐カバレッジ: Error分岐
     */
    it('TSC-BASE-005: エラーレスポンス（通常のError）', () => {
      const context = createMockContext()
      const error = new Error('ネットワークエラー')

      const _result = testController.testErrorResponse(context, error)

      expect(context.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'INTERNAL_SERVER_ERROR',
          message: 'ネットワークエラー',
          details: undefined,
          timestamp: expect.any(String),
        },
        500
      )
    })

    /**
     * TSC-BASE-006: エラーレスポンス（未知のエラー）
     * 目的: 文字列エラーなど未知の形式の処理確認
     * 分岐カバレッジ: 未知エラー分岐
     */
    it('TSC-BASE-006: エラーレスポンス（未知のエラー）', () => {
      const context = createMockContext()
      const unknownError = 'unexpected error'

      const _result = testController.testErrorResponse(context, unknownError)

      expect(context.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'UNKNOWN_ERROR',
          message: 'unexpected error',
          details: undefined,
          timestamp: expect.any(String),
        },
        500
      )
    })

    /**
     * TSC-BASE-007: リクエストボディ解析正常
     * 目的: JSONボディの正常解析確認
     * 分岐カバレッジ: JSON解析成功分岐
     */
    it('TSC-BASE-007: リクエストボディ解析正常', async () => {
      const testData = { name: '田中先生', subjects: ['数学'] }
      const context = createMockContext({ body: testData })
      const schema = z.object({ name: z.string(), subjects: z.array(z.string()) })

      const result = await testController.testParseRequestBody(context, schema)

      expect(result).toEqual(testData)
    })

    /**
     * TSC-BASE-008: リクエストボディ解析エラー（JSON不正）
     * 目的: 不正なJSONでの解析エラー確認
     * 分岐カバレッジ: JSON解析失敗分岐
     */
    it('TSC-BASE-008: リクエストボディ解析エラー（JSON不正）', async () => {
      const context = createMockContext()
      context.req.json = vi.fn().mockRejectedValue(new Error('Invalid JSON'))
      const schema = z.object({ name: z.string() })

      await expect(testController.testParseRequestBody(context, schema)).rejects.toThrow(
        'リクエストボディの解析に失敗しました'
      )
    })

    /**
     * TSC-BASE-009: パラメータ解析正常
     * 目的: URLパラメータの正常解析確認
     * 分岐カバレッジ: パラメータ存在分岐
     */
    it('TSC-BASE-009: パラメータ解析正常', () => {
      const context = createMockContext({ params: { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d482' } })
      const schema = z.string().uuid()

      const result = testController.testParseParam(context, 'id', schema)

      expect(result).toBe('f47ac10b-58cc-4372-a567-0e02b2c3d482')
    })

    /**
     * TSC-BASE-010: パラメータ解析エラー（パラメータなし）
     * 目的: 必須パラメータが存在しない場合の処理確認
     * 分岐カバレッジ: パラメータなし分岐
     */
    it('TSC-BASE-010: パラメータ解析エラー（パラメータなし）', () => {
      const context = createMockContext()
      const schema = z.string()

      expect(() => testController.testParseParam(context, 'id', schema)).toThrow(
        "必須パラメータ 'id' が見つかりません"
      )
    })

    /**
     * TSC-BASE-011: クエリパラメータ解析正常
     * 目的: クエリパラメータの正常解析確認
     * 分岐カバレッジ: クエリ解析成功分岐
     */
    it('TSC-BASE-011: クエリパラメータ解析正常', () => {
      const context = createMockContext({ query: { page: '1', limit: '20' } })
      const schema = z.object({
        page: z.string().transform(Number),
        limit: z.string().transform(Number),
      })

      const result = testController.testParseQuery(context, schema)

      expect(result).toEqual({ page: 1, limit: 20 })
    })

    /**
     * TSC-BASE-012: サービスエラーコード別ステータス（VALIDATION_ERROR）
     * 目的: バリデーションエラーの400ステータス確認
     * 分岐カバレッジ: DATA_VALIDATION_ERROR分岐
     */
    it('TSC-BASE-012: サービスエラーコード別ステータス（VALIDATION_ERROR）', () => {
      const context = createMockContext()
      const serviceError = new TypeSafeServiceError('データ形式エラー', 'DATA_VALIDATION_ERROR')

      const _result = testController.testErrorResponse(context, serviceError)

      expect(context.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'DATA_VALIDATION_ERROR',
        }),
        400
      )
    })

    /**
     * TSC-BASE-013: サービスエラーコード別ステータス（NOT_FOUND各種）
     * 目的: 各種NOT_FOUNDエラーの404ステータス確認
     * 分岐カバレッジ: SUBJECT_NOT_FOUND, CLASSROOM_NOT_FOUND分岐
     */
    it('TSC-BASE-013: サービスエラーコード別ステータス（NOT_FOUND各種）', () => {
      const context = createMockContext()

      // SUBJECT_NOT_FOUND
      const subjectError = new TypeSafeServiceError('教科が見つかりません', 'SUBJECT_NOT_FOUND')
      testController.testErrorResponse(context, subjectError)
      expect(context.json).toHaveBeenLastCalledWith(
        expect.objectContaining({ error: 'SUBJECT_NOT_FOUND' }),
        404
      )

      // CLASSROOM_NOT_FOUND
      const classroomError = new TypeSafeServiceError('教室が見つかりません', 'CLASSROOM_NOT_FOUND')
      testController.testErrorResponse(context, classroomError)
      expect(context.json).toHaveBeenLastCalledWith(
        expect.objectContaining({ error: 'CLASSROOM_NOT_FOUND' }),
        404
      )
    })
  })

  // ======================
  // TSC-SCHOOL: 学校設定コントローラー（8分岐）
  // ======================

  describe('TypeSafeSchoolSettingsController', () => {
    /**
     * TSC-SCHOOL-001: 学校設定取得正常
     * 目的: 学校設定取得の正常動作確認
     * 分岐カバレッジ: 取得成功分岐
     */
    it('TSC-SCHOOL-001: 学校設定取得正常', async () => {
      const context = createMockContext()
      mockSchoolService.schoolSettings.getSchoolSettings.mockResolvedValue(
        mockEnhancedSchoolSettings
      )

      const _result = await schoolSettingsController.getSchoolSettings(context)

      expect(mockSchoolService.schoolSettings.getSchoolSettings).toHaveBeenCalled()
      expect(context.json).toHaveBeenCalledWith(
        {
          success: true,
          data: mockEnhancedSchoolSettings,
          message: undefined,
          timestamp: expect.any(String),
        },
        200
      )
    })

    /**
     * TSC-SCHOOL-002: 学校設定取得エラー
     * 目的: 取得時のエラー処理確認
     * 分岐カバレッジ: 取得エラー分岐
     */
    it('TSC-SCHOOL-002: 学校設定取得エラー', async () => {
      const context = createMockContext()
      const error = new Error('データベース接続エラー')
      mockSchoolService.schoolSettings.getSchoolSettings.mockRejectedValue(error)

      const _result = await schoolSettingsController.getSchoolSettings(context)

      expect(context.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'INTERNAL_SERVER_ERROR',
          message: 'データベース接続エラー',
          details: undefined,
          timestamp: expect.any(String),
        },
        500
      )
    })

    /**
     * TSC-SCHOOL-003: 学校設定更新正常
     * 目的: 学校設定更新の正常動作確認
     * 分岐カバレッジ: 更新成功分岐
     */
    it('TSC-SCHOOL-003: 学校設定更新正常', async () => {
      const updateData = {
        grade1Classes: 5,
        grade2Classes: 4,
        grade3Classes: 4,
        grade4Classes: 3,
        grade5Classes: 3,
        grade6Classes: 3,
        dailyPeriods: 7,
        saturdayPeriods: 5,
      }
      const context = createMockContext({ body: updateData })
      const updatedSettings = { ...mockEnhancedSchoolSettings, ...updateData }

      mockSchoolService.schoolSettings.updateSchoolSettings.mockResolvedValue(updatedSettings)

      const _result = await schoolSettingsController.updateSchoolSettings(context)

      expect(mockSchoolService.schoolSettings.updateSchoolSettings).toHaveBeenCalledWith(updateData)
      expect(context.json).toHaveBeenCalledWith(
        {
          success: true,
          data: updatedSettings,
          message: '学校設定を更新しました',
          timestamp: expect.any(String),
        },
        200
      )
    })

    /**
     * TSC-SCHOOL-004: 学校設定更新エラー（バリデーション）
     * 目的: 更新時のバリデーションエラー確認
     * 分岐カバレッジ: バリデーションエラー分岐
     */
    it('TSC-SCHOOL-004: 学校設定更新エラー（バリデーション）', async () => {
      const invalidData = {
        grade1Classes: -1, // 無効な値
        dailyPeriods: 'invalid', // 型が違う
      }
      const context = createMockContext({ body: invalidData })

      const _result = await schoolSettingsController.updateSchoolSettings(context)

      expect(context.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'VALIDATION_ERROR',
        }),
        400
      )
    })
  })

  // ======================
  // TSC-TEACHER: 教師管理コントローラー（25分岐）
  // ======================

  describe('TypeSafeTeacherController', () => {
    /**
     * TSC-TEACHER-001: 教師一覧取得正常（クエリなし）
     * 目的: デフォルトパラメータでの教師一覧取得確認
     * 分岐カバレッジ: 基本取得分岐
     */
    it('TSC-TEACHER-001: 教師一覧取得正常（クエリなし）', async () => {
      const context = createMockContext()
      const teachersResult = {
        teachers: [mockTeacher],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }
      mockSchoolService.teachers.getTeachers.mockResolvedValue(teachersResult)

      const _result = await teacherController.getTeachers(context)

      expect(mockSchoolService.teachers.getTeachers).toHaveBeenCalledWith({})
      expect(context.json).toHaveBeenCalledWith(
        {
          success: true,
          data: teachersResult,
          message: undefined,
          timestamp: expect.any(String),
        },
        200
      )
    })

    /**
     * TSC-TEACHER-002: 教師一覧取得（クエリパラメータ付き）
     * 目的: 検索・フィルタ付きでの教師一覧取得確認
     * 分岐カバレッジ: クエリパラメータ分岐
     */
    it('TSC-TEACHER-002: 教師一覧取得（クエリパラメータ付き）', async () => {
      const context = createMockContext({
        query: {
          page: '2',
          limit: '10',
          search: '田中',
          grade: '1',
        },
      })
      const teachersResult = {
        teachers: [mockTeacher],
        pagination: { page: 2, limit: 10, total: 1, totalPages: 1 },
      }
      mockSchoolService.teachers.getTeachers.mockResolvedValue(teachersResult)

      const _result = await teacherController.getTeachers(context)

      expect(mockSchoolService.teachers.getTeachers).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        search: '田中',
        grade: 1,
      })
    })

    /**
     * TSC-TEACHER-003: 教師詳細取得正常
     * 目的: IDによる教師詳細取得確認
     * 分岐カバレッジ: 詳細取得成功分岐
     */
    it('TSC-TEACHER-003: 教師詳細取得正常', async () => {
      const context = createMockContext({ params: { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' } })
      mockSchoolService.teachers.getTeacher.mockResolvedValue(mockTeacher)

      const _result = await teacherController.getTeacher(context)

      expect(mockSchoolService.teachers.getTeacher).toHaveBeenCalledWith(
        'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      )
      expect(context.json).toHaveBeenCalledWith(
        {
          success: true,
          data: mockTeacher,
          message: undefined,
          timestamp: expect.any(String),
        },
        200
      )
    })

    /**
     * TSC-TEACHER-004: 教師詳細取得エラー（存在しない）
     * 目的: 存在しない教師の取得エラー確認
     * 分岐カバレッジ: 教師なしエラー分岐
     */
    it('TSC-TEACHER-004: 教師詳細取得エラー（存在しない）', async () => {
      const context = createMockContext({ params: { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d483' } })
      const error = new TypeSafeServiceError('教師が見つかりません', 'TEACHER_NOT_FOUND')
      mockSchoolService.teachers.getTeacher.mockRejectedValue(error)

      const _result = await teacherController.getTeacher(context)

      expect(context.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'TEACHER_NOT_FOUND',
          message: '教師が見つかりません',
          details: undefined,
          timestamp: expect.any(String),
        },
        404
      )
    })

    /**
     * TSC-TEACHER-005: 教師作成正常
     * 目的: 新規教師作成の正常動作確認
     * 分岐カバレッジ: 作成成功分岐
     */
    it('TSC-TEACHER-005: 教師作成正常', async () => {
      const teacherData = {
        name: '新しい先生',
        school_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d478',
        subjects: '["数学"]',
        grades: '[1,2]',
        assignment_restrictions: '[]',
        email: null,
        max_hours_per_week: 25,
        is_active: 1,
        order: 1,
      }
      const context = createMockContext({ body: teacherData })
      const createdTeacher = { ...mockTeacher, ...teacherData, id: 'new-teacher' }

      mockSchoolService.teachers.createTeacher.mockResolvedValue(createdTeacher)

      const _result = await teacherController.createTeacher(context)

      expect(mockSchoolService.teachers.createTeacher).toHaveBeenCalledWith(teacherData)
      expect(context.json).toHaveBeenCalledWith(
        {
          success: true,
          data: createdTeacher,
          message: '教師を作成しました',
          timestamp: expect.any(String),
        },
        201
      )
    })

    /**
     * TSC-TEACHER-006: 教師作成エラー（バリデーション）
     * 目的: 作成時のバリデーションエラー確認
     * 分岐カバレッジ: 作成バリデーションエラー分岐
     */
    it('TSC-TEACHER-006: 教師作成エラー（バリデーション）', async () => {
      const invalidData = {
        name: '', // 空文字は無効
        subjects: 'not-array', // 配列ではない
      }
      const context = createMockContext({ body: invalidData })

      const _result = await teacherController.createTeacher(context)

      expect(context.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'VALIDATION_ERROR',
        }),
        400
      )
    })

    /**
     * TSC-TEACHER-007: 教師更新正常
     * 目的: 既存教師の更新動作確認
     * 分岐カバレッジ: 更新成功分岐
     */
    it('TSC-TEACHER-007: 教師更新正常', async () => {
      const updateData = { name: '更新された先生' }
      const context = createMockContext({
        params: { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' },
        body: updateData,
      })
      const updatedTeacher = { ...mockTeacher, ...updateData }

      mockSchoolService.teachers.updateTeacher.mockResolvedValue(updatedTeacher)

      const _result = await teacherController.updateTeacher(context)

      expect(mockSchoolService.teachers.updateTeacher).toHaveBeenCalledWith(
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        updateData
      )
      expect(context.json).toHaveBeenCalledWith(
        {
          success: true,
          data: updatedTeacher,
          message: '教師を更新しました',
          timestamp: expect.any(String),
        },
        200
      )
    })

    /**
     * TSC-TEACHER-008: 教師削除正常
     * 目的: 教師削除の正常動作確認
     * 分岐カバレッジ: 削除成功分岐
     */
    it('TSC-TEACHER-008: 教師削除正常', async () => {
      const context = createMockContext({ params: { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' } })
      const deleteResult = {
        deletedId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        deletedName: '田中先生',
        deletedAt: '2024-01-01T12:00:00.000Z',
      }

      mockSchoolService.teachers.deleteTeacher.mockResolvedValue(deleteResult)

      const _result = await teacherController.deleteTeacher(context)

      expect(mockSchoolService.teachers.deleteTeacher).toHaveBeenCalledWith(
        'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      )
      expect(context.json).toHaveBeenCalledWith(
        {
          success: true,
          data: deleteResult,
          message: '教師を削除しました',
          timestamp: expect.any(String),
        },
        200
      )
    })

    /**
     * TSC-TEACHER-009: 教師管理エラー処理（サービスエラー）
     * 目的: 各操作でのサービスエラー処理確認
     * 分岐カバレッジ: サービスエラー分岐
     */
    it('TSC-TEACHER-009: 教師管理エラー処理（サービスエラー）', async () => {
      const context = createMockContext()
      const serviceError = new Error('データベース接続失敗')
      mockSchoolService.teachers.getTeachers.mockRejectedValue(serviceError)

      const _result = await teacherController.getTeachers(context)

      expect(context.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'INTERNAL_SERVER_ERROR',
          message: 'データベース接続失敗',
          details: undefined,
          timestamp: expect.any(String),
        },
        500
      )
    })
  })

  // ======================
  // TSC-SUBJECT: 教科管理コントローラー（25分岐）
  // ======================

  describe('TypeSafeSubjectController', () => {
    /**
     * TSC-SUBJECT-001: 教科一覧取得正常
     * 目的: 教科一覧取得の正常動作確認
     * 分岐カバレッジ: 基本取得分岐
     */
    it('TSC-SUBJECT-001: 教科一覧取得正常', async () => {
      const context = createMockContext()
      const subjectsResult = {
        subjects: [mockSubject],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }
      mockSchoolService.subjects.getSubjects.mockResolvedValue(subjectsResult)

      const _result = await subjectController.getSubjects(context)

      expect(mockSchoolService.subjects.getSubjects).toHaveBeenCalledWith({})
      expect(context.json).toHaveBeenCalledWith(
        {
          success: true,
          data: subjectsResult,
          message: undefined,
          timestamp: expect.any(String),
        },
        200
      )
    })

    /**
     * TSC-SUBJECT-002: 教科一覧取得（フィルタ付き）
     * 目的: フィルタ付きでの教科一覧取得確認
     * 分岐カバレッジ: フィルタクエリ分岐
     */
    it('TSC-SUBJECT-002: 教科一覧取得（フィルタ付き）', async () => {
      const context = createMockContext({
        query: {
          search: '数学',
          grade: '2',
          classroomType: '普通教室',
        },
      })
      const subjectsResult = {
        subjects: [mockSubject],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }
      mockSchoolService.subjects.getSubjects.mockResolvedValue(subjectsResult)

      const _result = await subjectController.getSubjects(context)

      expect(mockSchoolService.subjects.getSubjects).toHaveBeenCalledWith({
        search: '数学',
        grade: 2,
        classroomType: '普通教室',
      })
    })

    /**
     * TSC-SUBJECT-003: 教科詳細取得正常
     * 目的: 教科詳細取得の正常動作確認
     * 分岐カバレッジ: 詳細取得成功分岐
     */
    it('TSC-SUBJECT-003: 教科詳細取得正常', async () => {
      const context = createMockContext({ params: { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d480' } })
      mockSchoolService.subjects.getSubject.mockResolvedValue(mockSubject)

      const _result = await subjectController.getSubject(context)

      expect(mockSchoolService.subjects.getSubject).toHaveBeenCalledWith(
        'f47ac10b-58cc-4372-a567-0e02b2c3d480'
      )
      expect(context.json).toHaveBeenCalledWith(
        {
          success: true,
          data: mockSubject,
          message: undefined,
          timestamp: expect.any(String),
        },
        200
      )
    })

    /**
     * TSC-SUBJECT-004: 教科作成正常
     * 目的: 新規教科作成の正常動作確認
     * 分岐カバレッジ: 作成成功分岐
     */
    it('TSC-SUBJECT-004: 教科作成正常', async () => {
      const subjectData = {
        name: '新しい教科',
        grades: [1, 2],
        weeklyHours: { '1': 3, '2': 3 },
        requiresSpecialClassroom: false,
        classroomType: '普通教室',
        order: 1,
      }
      const context = createMockContext({ body: subjectData })
      const createdSubject = { ...mockSubject, ...subjectData, id: 'new-subject' }

      mockSchoolService.subjects.createSubject.mockResolvedValue(createdSubject)

      const _result = await subjectController.createSubject(context)

      expect(mockSchoolService.subjects.createSubject).toHaveBeenCalledWith(subjectData)
      expect(context.json).toHaveBeenCalledWith(
        {
          success: true,
          data: createdSubject,
          message: '教科を作成しました',
          timestamp: expect.any(String),
        },
        201
      )
    })

    /**
     * TSC-SUBJECT-005: 教科作成エラー（バリデーション）
     * 目的: 作成時のバリデーションエラー確認
     * 分岐カバレッジ: 作成バリデーションエラー分岐
     */
    it('TSC-SUBJECT-005: 教科作成エラー（バリデーション）', async () => {
      const invalidData = {
        name: '', // 空文字は無効
        grades: [0, 7], // 範囲外の学年
        weeklyHours: 'invalid', // オブジェクトではない
      }
      const context = createMockContext({ body: invalidData })

      const _result = await subjectController.createSubject(context)

      expect(context.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'VALIDATION_ERROR',
        }),
        400
      )
    })

    /**
     * TSC-SUBJECT-006: 教科更新正常
     * 目的: 既存教科の更新動作確認
     * 分岐カバレッジ: 更新成功分岐
     */
    it('TSC-SUBJECT-006: 教科更新正常', async () => {
      const updateData = {
        name: '更新された教科',
        grades: [1, 2, 3],
      }
      const context = createMockContext({
        params: { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d480' },
        body: updateData,
      })
      const updatedSubject = { ...mockSubject, ...updateData }

      mockSchoolService.subjects.updateSubject.mockResolvedValue(updatedSubject)

      const _result = await subjectController.updateSubject(context)

      expect(mockSchoolService.subjects.updateSubject).toHaveBeenCalledWith(
        'f47ac10b-58cc-4372-a567-0e02b2c3d480',
        updateData
      )
      expect(context.json).toHaveBeenCalledWith(
        {
          success: true,
          data: updatedSubject,
          message: '教科を更新しました',
          timestamp: expect.any(String),
        },
        200
      )
    })

    /**
     * TSC-SUBJECT-007: 教科削除正常
     * 目的: 教科削除の正常動作確認
     * 分岐カバレッジ: 削除成功分岐
     */
    it('TSC-SUBJECT-007: 教科削除正常', async () => {
      const context = createMockContext({ params: { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d480' } })
      const deleteResult = {
        deletedId: 'f47ac10b-58cc-4372-a567-0e02b2c3d480',
        deletedName: '数学',
        deletedAt: '2024-01-01T12:00:00.000Z',
      }

      mockSchoolService.subjects.deleteSubject.mockResolvedValue(deleteResult)

      const _result = await subjectController.deleteSubject(context)

      expect(mockSchoolService.subjects.deleteSubject).toHaveBeenCalledWith(
        'f47ac10b-58cc-4372-a567-0e02b2c3d480'
      )
      expect(context.json).toHaveBeenCalledWith(
        {
          success: true,
          data: deleteResult,
          message: '教科を削除しました',
          timestamp: expect.any(String),
        },
        200
      )
    })

    /**
     * TSC-SUBJECT-008: 教科管理エラー処理
     * 目的: 各操作でのエラー処理確認
     * 分岐カバレッジ: エラー処理分岐
     */
    it('TSC-SUBJECT-008: 教科管理エラー処理', async () => {
      const context = createMockContext({ params: { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d480' } })
      const error = new TypeSafeServiceError('教科が見つかりません', 'SUBJECT_NOT_FOUND')
      mockSchoolService.subjects.getSubject.mockRejectedValue(error)

      const _result = await subjectController.getSubject(context)

      expect(context.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'SUBJECT_NOT_FOUND',
          message: '教科が見つかりません',
          details: undefined,
          timestamp: expect.any(String),
        },
        404
      )
    })
  })

  // ======================
  // TSC-CLASSROOM: 教室管理コントローラー（20分岐）
  // ======================

  describe('TypeSafeClassroomController', () => {
    /**
     * TSC-CLASSROOM-001: 教室一覧取得正常
     * 目的: 教室一覧取得の正常動作確認
     * 分岐カバレッジ: 基本取得分岐
     */
    it('TSC-CLASSROOM-001: 教室一覧取得正常', async () => {
      const context = createMockContext()
      const classroomsResult = {
        classrooms: [mockClassroom],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        summary: { totalCapacity: 35, typeDistribution: { 普通教室: 1 } },
      }
      mockSchoolService.classrooms.getClassrooms.mockResolvedValue(classroomsResult)

      const _result = await classroomController.getClassrooms(context)

      expect(mockSchoolService.classrooms.getClassrooms).toHaveBeenCalledWith({})
      expect(context.json).toHaveBeenCalledWith(
        {
          success: true,
          data: classroomsResult,
          message: undefined,
          timestamp: expect.any(String),
        },
        200
      )
    })

    /**
     * TSC-CLASSROOM-002: 教室一覧取得（容量フィルタ）
     * 目的: 容量フィルタ付きでの教室一覧取得確認
     * 分岐カバレッジ: 容量フィルタ分岐
     */
    it('TSC-CLASSROOM-002: 教室一覧取得（容量フィルタ）', async () => {
      const context = createMockContext({
        query: {
          type: '普通教室',
          capacity_min: '30',
          capacity_max: '50',
        },
      })
      const classroomsResult = {
        classrooms: [mockClassroom],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        summary: { totalCapacity: 35, typeDistribution: { 普通教室: 1 } },
      }
      mockSchoolService.classrooms.getClassrooms.mockResolvedValue(classroomsResult)

      const _result = await classroomController.getClassrooms(context)

      expect(mockSchoolService.classrooms.getClassrooms).toHaveBeenCalledWith({
        type: '普通教室',
        capacity_min: 30,
        capacity_max: 50,
        capacityMin: 30,
        capacityMax: 50,
      })
    })

    /**
     * TSC-CLASSROOM-003: 教室詳細取得正常
     * 目的: 教室詳細取得の正常動作確認
     * 分岐カバレッジ: 詳細取得成功分岐
     */
    it('TSC-CLASSROOM-003: 教室詳細取得正常', async () => {
      const context = createMockContext({ params: { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d481' } })
      mockSchoolService.classrooms.getClassroom.mockResolvedValue(mockClassroom)

      const _result = await classroomController.getClassroom(context)

      expect(mockSchoolService.classrooms.getClassroom).toHaveBeenCalledWith(
        'f47ac10b-58cc-4372-a567-0e02b2c3d481'
      )
      expect(context.json).toHaveBeenCalledWith(
        {
          success: true,
          data: mockClassroom,
          message: undefined,
          timestamp: expect.any(String),
        },
        200
      )
    })

    /**
     * TSC-CLASSROOM-004: 教室作成正常
     * 目的: 新規教室作成の正常動作確認
     * 分岐カバレッジ: 作成成功分岐
     */
    it('TSC-CLASSROOM-004: 教室作成正常', async () => {
      const classroomData = {
        name: '新しい教室',
        type: '特別教室',
        capacity: 30,
        count: 1,
        order: 1,
      }
      const context = createMockContext({ body: classroomData })
      const createdClassroom = { ...mockClassroom, ...classroomData, id: 'new-classroom' }

      mockSchoolService.classrooms.createClassroom.mockResolvedValue(createdClassroom)

      const _result = await classroomController.createClassroom(context)

      expect(mockSchoolService.classrooms.createClassroom).toHaveBeenCalledWith(classroomData)
      expect(context.json).toHaveBeenCalledWith(
        {
          success: true,
          data: createdClassroom,
          message: '教室を作成しました',
          timestamp: expect.any(String),
        },
        201
      )
    })

    /**
     * TSC-CLASSROOM-005: 教室作成エラー（バリデーション）
     * 目的: 作成時のバリデーションエラー確認
     * 分岐カバレッジ: 作成バリデーションエラー分岐
     */
    it('TSC-CLASSROOM-005: 教室作成エラー（バリデーション）', async () => {
      const invalidData = {
        name: '', // 空文字は無効
        capacity: 0, // 最小値未満
        count: -1, // 負数
      }
      const context = createMockContext({ body: invalidData })

      const _result = await classroomController.createClassroom(context)

      expect(context.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'VALIDATION_ERROR',
        }),
        400
      )
    })

    /**
     * TSC-CLASSROOM-006: 教室更新正常
     * 目的: 既存教室の更新動作確認
     * 分岐カバレッジ: 更新成功分岐
     */
    it('TSC-CLASSROOM-006: 教室更新正常', async () => {
      const updateData = {
        name: '更新された教室',
        capacity: 40,
      }
      const context = createMockContext({
        params: { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d481' },
        body: updateData,
      })
      const updatedClassroom = { ...mockClassroom, ...updateData }

      mockSchoolService.classrooms.updateClassroom.mockResolvedValue(updatedClassroom)

      const _result = await classroomController.updateClassroom(context)

      expect(mockSchoolService.classrooms.updateClassroom).toHaveBeenCalledWith(
        'f47ac10b-58cc-4372-a567-0e02b2c3d481',
        updateData
      )
      expect(context.json).toHaveBeenCalledWith(
        {
          success: true,
          data: updatedClassroom,
          message: '教室を更新しました',
          timestamp: expect.any(String),
        },
        200
      )
    })

    /**
     * TSC-CLASSROOM-007: 教室削除正常
     * 目的: 教室削除の正常動作確認
     * 分岐カバレッジ: 削除成功分岐
     */
    it('TSC-CLASSROOM-007: 教室削除正常', async () => {
      const context = createMockContext({ params: { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d481' } })
      const deleteResult = {
        deletedId: 'f47ac10b-58cc-4372-a567-0e02b2c3d481',
        deletedName: '1年A組教室',
        deletedAt: '2024-01-01T12:00:00.000Z',
      }

      mockSchoolService.classrooms.deleteClassroom.mockResolvedValue(deleteResult)

      const _result = await classroomController.deleteClassroom(context)

      expect(mockSchoolService.classrooms.deleteClassroom).toHaveBeenCalledWith(
        'f47ac10b-58cc-4372-a567-0e02b2c3d481'
      )
      expect(context.json).toHaveBeenCalledWith(
        {
          success: true,
          data: deleteResult,
          message: '教室を削除しました',
          timestamp: expect.any(String),
        },
        200
      )
    })

    /**
     * TSC-CLASSROOM-008: 教室管理エラー処理
     * 目的: 各操作でのエラー処理確認
     * 分岐カバレッジ: エラー処理分岐
     */
    it('TSC-CLASSROOM-008: 教室管理エラー処理', async () => {
      const context = createMockContext({ params: { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d481' } })
      const error = new TypeSafeServiceError('教室が見つかりません', 'CLASSROOM_NOT_FOUND')
      mockSchoolService.classrooms.getClassroom.mockRejectedValue(error)

      const _result = await classroomController.getClassroom(context)

      expect(context.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'CLASSROOM_NOT_FOUND',
          message: '教室が見つかりません',
          details: undefined,
          timestamp: expect.any(String),
        },
        404
      )
    })
  })

  // ======================
  // TSC-SYSTEM: システムコントローラー（7分岐）
  // ======================

  describe('TypeSafeSystemController', () => {
    /**
     * TSC-SYSTEM-001: システムメトリクス取得正常
     * 目的: システム統計情報取得の正常動作確認
     * 分岐カバレッジ: メトリクス取得成功分岐
     */
    it('TSC-SYSTEM-001: システムメトリクス取得正常', async () => {
      const context = createMockContext()
      const metricsData = {
        statistics: { teachers: 10, subjects: 8, classrooms: 15, schoolSettings: 1 },
        api: {
          version: '1.0.0',
          environment: 'production',
          timestamp: '2024-01-01T00:00:00.000Z',
          uptime: 123456,
        },
        features: ['完全型安全性', 'OpenAPI 3.0.3準拠'],
      }
      mockSchoolService.getSystemMetrics.mockResolvedValue(metricsData)

      const _result = await systemController.getMetrics(context)

      expect(mockSchoolService.getSystemMetrics).toHaveBeenCalled()
      expect(context.json).toHaveBeenCalledWith(
        {
          success: true,
          data: metricsData,
          message: undefined,
          timestamp: expect.any(String),
        },
        200
      )
    })

    /**
     * TSC-SYSTEM-002: システムメトリクス取得エラー
     * 目的: メトリクス取得時のエラー処理確認
     * 分岐カバレッジ: メトリクス取得エラー分岐
     */
    it('TSC-SYSTEM-002: システムメトリクス取得エラー', async () => {
      const context = createMockContext()
      const error = new Error('システムエラー')
      mockSchoolService.getSystemMetrics.mockRejectedValue(error)

      const _result = await systemController.getMetrics(context)

      expect(context.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'INTERNAL_SERVER_ERROR',
          message: 'システムエラー',
          details: undefined,
          timestamp: expect.any(String),
        },
        500
      )
    })

    /**
     * TSC-SYSTEM-003: ヘルスチェック正常
     * 目的: システムヘルスチェックの正常動作確認
     * 分岐カバレッジ: ヘルスチェック成功分岐
     */
    it('TSC-SYSTEM-003: ヘルスチェック正常', async () => {
      const context = createMockContext({ env: { NODE_ENV: 'test' } })

      const _result = await systemController.healthCheck(context)

      expect(context.json).toHaveBeenCalledWith(
        {
          success: true,
          data: {
            status: 'healthy',
            timestamp: expect.any(String),
            database: 'connected',
            uptime: expect.any(Number),
            version: '1.0.0',
            environment: 'test',
          },
          message: undefined,
          timestamp: expect.any(String),
        },
        200
      )
    })

    /**
     * TSC-SYSTEM-004: ヘルスチェックエラー
     * 目的: ヘルスチェック時のエラー処理確認
     * 分岐カバレッジ: ヘルスチェックエラー分岐
     */
    it('TSC-SYSTEM-004: ヘルスチェックエラー', async () => {
      const context = createMockContext()
      // 環境変数アクセスでエラーを起こす
      Object.defineProperty(context, 'env', {
        get: () => {
          throw new Error('Environment access error')
        },
      })

      const _result = await systemController.healthCheck(context)

      expect(context.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'INTERNAL_SERVER_ERROR',
          message: 'Environment access error',
          details: undefined,
          timestamp: expect.any(String),
        },
        500
      )
    })

    /**
     * TSC-SYSTEM-005: API情報取得正常
     * 目的: API情報取得の正常動作確認
     * 分岐カバレッジ: API情報取得成功分岐
     */
    it('TSC-SYSTEM-005: API情報取得正常', async () => {
      const context = createMockContext({ env: { NODE_ENV: 'development' } })

      const _result = await systemController.getInfo(context)

      expect(context.json).toHaveBeenCalledWith(
        {
          success: true,
          data: {
            name: '学校時間割管理システム API',
            version: '1.0.0',
            description: '完全型安全な学校時間割管理システムのAPI',
            timestamp: expect.any(String),
            environment: 'development',
            features: [
              '完全型安全性（Zod）',
              'OpenAPI 3.0.3準拠',
              '自動バリデーション',
              'リアルタイムドキュメント',
              '統一エラーハンドリング',
            ],
          },
          message: undefined,
          timestamp: expect.any(String),
        },
        200
      )
    })

    /**
     * TSC-SYSTEM-006: API情報取得エラー
     * 目的: API情報取得時のエラー処理確認
     * 分岐カバレッジ: API情報取得エラー分岐
     */
    it('TSC-SYSTEM-006: API情報取得エラー', async () => {
      const context = createMockContext()
      // 環境変数アクセスでエラーを起こす
      Object.defineProperty(context, 'env', {
        get: () => {
          throw new Error('Environment access error')
        },
      })

      const _result = await systemController.getInfo(context)

      expect(context.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'INTERNAL_SERVER_ERROR',
          message: 'Environment access error',
          details: undefined,
          timestamp: expect.any(String),
        },
        500
      )
    })
  })

  // ======================
  // TSC-FACTORY: コントローラーファクトリー（1分岐）
  // ======================

  describe('typeSafeControllers Factory', () => {
    /**
     * TSC-FACTORY-001: ファクトリーインスタンス確認
     * 目的: コントローラーファクトリーの構成確認
     * 分岐カバレッジ: ファクトリー初期化分岐
     */
    it('TSC-FACTORY-001: ファクトリーインスタンス確認', () => {
      expect(typeSafeControllers.schoolSettings).toBeInstanceOf(TypeSafeSchoolSettingsController)
      expect(typeSafeControllers.teachers).toBeInstanceOf(TypeSafeTeacherController)
      expect(typeSafeControllers.subjects).toBeInstanceOf(TypeSafeSubjectController)
      expect(typeSafeControllers.classrooms).toBeInstanceOf(TypeSafeClassroomController)
      expect(typeSafeControllers.system).toBeInstanceOf(TypeSafeSystemController)
    })
  })
})
