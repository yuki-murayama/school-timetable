/**
 * 型安全サービス層 - Zodスキーマベースのビジネスロジック
 * データベース操作の完全型安全化とバリデーション
 */

import {
  type Classroom,
  ClassroomSchema,
  type CreateTeacherRequest,
  CreateTeacherRequestSchema,
  type EnhancedSchoolSettings,
  EnhancedSchoolSettingsSchema,
  IdSchema,
  type LegacyTeacher,
  LegacyTeacherSchema,
  type SchoolSettings,
  SchoolSettingsSchema,
  type Subject,
  type SubjectDbRow,
  SubjectSchema,
  safeJsonParse,
  safeJsonStringify,
  type TeacherDbRow,
} from '@shared/schemas'
import { z } from 'zod'

/**
 * 型安全なデータベースクエリヘルパー
 */
export class TypeSafeDbHelper {
  constructor(private db: D1Database) {}

  /**
   * 型安全なクエリ実行（単一行取得）
   */
  async queryFirst<T>(query: string, params: unknown[], schema: z.ZodType<T>): Promise<T | null> {
    try {
      const result = await this.db
        .prepare(query)
        .bind(...params)
        .first()
      if (!result) return null

      return schema.parse(result)
    } catch (error) {
      console.error('データベースクエリエラー:', error)
      throw new TypeSafeServiceError('データベース操作に失敗しました', 'DATABASE_ERROR')
    }
  }

  /**
   * 型安全なクエリ実行（複数行取得）
   */
  async queryAll<T>(query: string, params: unknown[], schema: z.ZodType<T>): Promise<T[]> {
    try {
      const results = await this.db
        .prepare(query)
        .bind(...params)
        .all()

      return results.results.map(row => {
        try {
          return schema.parse(row)
        } catch (parseError) {
          console.warn('データ型変換警告:', parseError)
          throw new TypeSafeServiceError('データの形式が正しくありません', 'DATA_VALIDATION_ERROR')
        }
      })
    } catch (error) {
      console.error('データベースクエリエラー:', error)
      throw new TypeSafeServiceError('データベース操作に失敗しました', 'DATABASE_ERROR')
    }
  }

  /**
   * 型安全な実行（INSERT/UPDATE/DELETE）
   */
  async execute(query: string, params: unknown[]): Promise<D1Result> {
    try {
      return await this.db
        .prepare(query)
        .bind(...params)
        .run()
    } catch (error) {
      console.error('データベース実行エラー:', error)
      throw new TypeSafeServiceError('データベース操作に失敗しました', 'DATABASE_ERROR')
    }
  }
}

/**
 * 型安全サービスエラー
 */
export class TypeSafeServiceError extends Error {
  constructor(
    public message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'TypeSafeServiceError'
  }
}

/**
 * 型安全学校設定サービス
 */
export class TypeSafeSchoolSettingsService {
  private dbHelper: TypeSafeDbHelper

  constructor(private db: D1Database) {
    this.dbHelper = new TypeSafeDbHelper(db)
  }

  /**
   * 学校設定取得（拡張情報付き）
   */
  async getSchoolSettings(): Promise<EnhancedSchoolSettings> {
    // 基本設定取得
    const baseSettings = await this.dbHelper.queryFirst(
      'SELECT * FROM school_settings WHERE id = ? LIMIT 1',
      ['default'],
      SchoolSettingsSchema
    )

    // 統計情報取得
    const [teacherCount, subjectCount, classroomCount] = await Promise.all([
      this.dbHelper.queryFirst(
        'SELECT COUNT(*) as count FROM teachers',
        [],
        z.object({ count: z.number() })
      ),
      this.dbHelper.queryFirst(
        'SELECT COUNT(*) as count FROM subjects',
        [],
        z.object({ count: z.number() })
      ),
      this.dbHelper.queryFirst(
        'SELECT COUNT(*) as count FROM classrooms',
        [],
        z.object({ count: z.number() })
      ),
    ])

    // デフォルト設定の適用
    const defaultSettings: SchoolSettings = {
      id: 'default',
      grade1Classes: 4,
      grade2Classes: 4,
      grade3Classes: 4,
      grade4Classes: 3,
      grade5Classes: 3,
      grade6Classes: 3,
      dailyPeriods: 6,
      saturdayPeriods: 4,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const finalSettings = baseSettings || defaultSettings

    // 拡張情報を含む完全な設定オブジェクトを作成
    const enhancedSettings: EnhancedSchoolSettings = {
      ...finalSettings,
      statistics: {
        totalTeachers: teacherCount?.count || 0,
        totalSubjects: subjectCount?.count || 0,
        totalClassrooms: classroomCount?.count || 0,
        totalClasses: [
          finalSettings.grade1Classes,
          finalSettings.grade2Classes,
          finalSettings.grade3Classes,
          finalSettings.grade4Classes,
          finalSettings.grade5Classes,
          finalSettings.grade6Classes,
        ].reduce((sum, count) => sum + count, 0),
      },
      validation: {
        isConfigured: (teacherCount?.count || 0) > 0 && (subjectCount?.count || 0) > 0,
        hasMinimumTeachers: (teacherCount?.count || 0) >= 5,
        hasMinimumSubjects: (subjectCount?.count || 0) >= 8,
        warnings: [],
      },
    }

    // バリデーション警告の追加
    if (!enhancedSettings.validation.hasMinimumTeachers) {
      enhancedSettings.validation.warnings.push('教師が不足しています（推奨：5人以上）')
    }
    if (!enhancedSettings.validation.hasMinimumSubjects) {
      enhancedSettings.validation.warnings.push('教科が不足しています（推奨：8教科以上）')
    }

    return EnhancedSchoolSettingsSchema.parse(enhancedSettings)
  }

  /**
   * 学校設定更新
   */
  async updateSchoolSettings(
    updates: Omit<SchoolSettings, 'id' | 'created_at' | 'updated_at'>
  ): Promise<EnhancedSchoolSettings> {
    const now = new Date().toISOString()

    // バリデーション
    const validatedUpdates = SchoolSettingsSchema.omit({
      id: true,
      created_at: true,
      updated_at: true,
    }).parse(updates)

    // 更新実行
    const result = await this.dbHelper.execute(
      `
      INSERT OR REPLACE INTO school_settings 
      (id, grade1Classes, grade2Classes, grade3Classes, grade4Classes, 
       grade5Classes, grade6Classes, dailyPeriods, saturdayPeriods, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        'default',
        validatedUpdates.grade1Classes,
        validatedUpdates.grade2Classes,
        validatedUpdates.grade3Classes,
        validatedUpdates.grade4Classes,
        validatedUpdates.grade5Classes,
        validatedUpdates.grade6Classes,
        validatedUpdates.dailyPeriods,
        validatedUpdates.saturdayPeriods,
        now,
      ]
    )

    if (!result.success) {
      throw new TypeSafeServiceError('学校設定の更新に失敗しました', 'UPDATE_FAILED')
    }

    return this.getSchoolSettings()
  }
}

/**
 * 型安全教師サービス
 */
export class TypeSafeTeacherService {
  private dbHelper: TypeSafeDbHelper

  constructor(private db: D1Database) {
    this.dbHelper = new TypeSafeDbHelper(db)
  }

  /**
   * 教師一覧取得（ページネーション対応）
   */
  async getTeachers(
    options: {
      page?: number
      limit?: number
      search?: string
      subject?: string
      grade?: number
    } = {}
  ): Promise<{
    teachers: LegacyTeacher[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }> {
    try {
      console.log('🔍 getTeachers実行開始', { options })
      const page = options.page || 1
      const limit = Math.min(options.limit || 20, 100)
      const offset = (page - 1) * limit

      const whereConditions: string[] = ['1=1']
      const params: unknown[] = []

      // 検索条件構築
      if (options.search) {
        whereConditions.push('name LIKE ?')
        params.push(`%${options.search}%`)
      }

      if (options.subject) {
        whereConditions.push('subjects LIKE ?')
        params.push(`%${options.subject}%`)
      }

      if (options.grade) {
        whereConditions.push('grades LIKE ?')
        params.push(`%${options.grade}%`)
      }

      const whereClause = whereConditions.join(' AND ')

      // カウント取得
      const countResult = await this.dbHelper.queryFirst(
        `SELECT COUNT(*) as total FROM teachers WHERE ${whereClause}`,
        params,
        z.object({ total: z.number() })
      )
      const total = countResult?.total || 0

      // データ取得
      console.log('📊 データ取得クエリ実行中', { whereClause, params })
      const rawResults = await this.db
        .prepare(
          `SELECT * FROM teachers WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
        )
        .bind(...params, limit, offset)
        .all()

      console.log('📋 生データ取得完了', {
        success: rawResults.success,
        resultCount: rawResults.results?.length,
        firstResult: rawResults.results?.[0],
      })

      // 教科マッピング用データを取得（教科名→UUID変換）
      const subjectMappingResult = await this.db
        .prepare(`
      SELECT id, name FROM subjects
    `)
        .all()

      const subjectNameToIdMap = new Map<string, string>()
      subjectMappingResult.results?.forEach((subject: SubjectDbRow) => {
        subjectNameToIdMap.set(subject.name, subject.id)
      })
      console.log('📚 教科マッピング作成完了:', Object.fromEntries(subjectNameToIdMap))

      // 生データをログ出力してから変換処理
      const teachers =
        rawResults.results?.map((row: TeacherDbRow) => {
          console.log('🔧 教師データ変換中:', row)
          try {
            // subjects配列の変換：フロントエンド互換性のため教科名をそのまま保持
            let subjects: string[] = []
            if (row.subjects) {
              const subjectNames = safeJsonParse(row.subjects, [])
              console.log('📝 元の教科データ:', subjectNames)

              // フロントエンド互換性のため、教科名をそのまま返す
              subjects = subjectNames.filter((name: unknown) => typeof name === 'string')
              console.log('📚 教科データ変換完了:', subjects)
            }

            // 既知のフィールドのみを抽出して変換
            const transformedData = {
              id: row.id,
              name: row.name,
              email: row.email || undefined,
              subjects: subjects,
              grades: row.grades ? safeJsonParse(row.grades, []) : [],
              assignmentRestrictions: row.assignment_restrictions
                ? safeJsonParse(row.assignment_restrictions, [])
                : [],
              maxWeeklyHours: row.max_hours_per_week || 25,
              preferredTimeSlots: [],
              unavailableSlots: [],
              created_at: row.created_at,
              updated_at: row.updated_at,
            }
            console.log('✅ 変換後データ:', transformedData)
            const validated = LegacyTeacherSchema.parse(transformedData)
            console.log('✅ バリデーション成功')
            return validated
          } catch (error) {
            console.error('❌ 教師データ変換エラー:', { error: error.message, row })
            throw error
          }
        }) || []

      console.log('✅ getTeachers実行完了', { teachersCount: teachers.length })

      return {
        teachers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }
    } catch (error) {
      console.error('❌ getTeachersエラー:', {
        error: error.message,
        stack: error.stack,
        options,
      })
      throw error
    }
  }

  /**
   * 教師詳細取得
   */
  async getTeacher(id: string): Promise<LegacyTeacher> {
    IdSchema.parse(id)

    const rawTeacher = await this.db.prepare('SELECT * FROM teachers WHERE id = ?').bind(id).first()

    if (!rawTeacher) {
      throw new TypeSafeServiceError('指定された教師が見つかりません', 'TEACHER_NOT_FOUND')
    }

    console.log('🔍 rawTeacher データベースから取得:', Object.keys(rawTeacher), rawTeacher)

    // subjects配列の変換：フロントエンド互換性のため教科名をそのまま保持
    let subjects: string[] = []
    if (rawTeacher.subjects) {
      const subjectNames = safeJsonParse(rawTeacher.subjects, [])
      console.log('📝 単一教師の教科データ:', subjectNames)

      // フロントエンド互換性のため、教科名をそのまま返す
      subjects = subjectNames.filter((name: unknown) => typeof name === 'string')
      console.log('📚 単一教師の教科データ変換完了:', subjects)
    }

    // 既知のフィールドのみを抽出して変換
    const transformedData = {
      id: rawTeacher.id,
      name: rawTeacher.name,
      email: rawTeacher.email || undefined,
      subjects: subjects,
      grades: rawTeacher.grades ? safeJsonParse(rawTeacher.grades, []) : [],
      assignmentRestrictions: rawTeacher.assignmentRestrictions
        ? safeJsonParse(rawTeacher.assignmentRestrictions, [])
        : [],
      maxWeeklyHours: rawTeacher.maxWeeklyHours || 25,
      preferredTimeSlots: rawTeacher.preferredTimeSlots
        ? safeJsonParse(rawTeacher.preferredTimeSlots, [])
        : [],
      unavailableSlots: rawTeacher.unavailableSlots
        ? safeJsonParse(rawTeacher.unavailableSlots, [])
        : [],
      created_at: rawTeacher.created_at,
      updated_at: rawTeacher.updated_at,
    }

    console.log('🔧 transformedData:', transformedData)

    try {
      const result = LegacyTeacherSchema.parse(transformedData)
      console.log('✅ LegacyTeacherSchema.parse成功:', Object.keys(result))
      return result
    } catch (error) {
      console.error('❌ LegacyTeacherSchema.parse失敗:', error)
      console.error('❌ 入力データ:', transformedData)
      throw new TypeSafeServiceError('教師データの検証に失敗しました', 'TEACHER_VALIDATION_ERROR')
    }
  }

  /**
   * 教師作成
   */
  async createTeacher(teacherData: CreateTeacherRequest): Promise<LegacyTeacher> {
    const validatedData = CreateTeacherRequestSchema.parse(teacherData)

    const teacherId = crypto.randomUUID()
    const now = new Date().toISOString()

    const result = await this.dbHelper.execute(
      `
      INSERT INTO teachers (
        id, name, subjects, grades, assignmentRestrictions, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [
        teacherId,
        validatedData.name,
        safeJsonStringify(validatedData.subjects),
        safeJsonStringify(validatedData.grades),
        safeJsonStringify(validatedData.assignmentRestrictions || []),
        now,
        now,
      ]
    )

    if (!result.success) {
      throw new TypeSafeServiceError('教師の作成に失敗しました', 'CREATE_FAILED')
    }

    console.log('📞 createTeacher: getTeacherを呼び出し中, teacherId:', teacherId)
    try {
      const teacher = await this.getTeacher(teacherId)
      console.log('✅ createTeacher: getTeacher成功:', Object.keys(teacher))
      return teacher
    } catch (error) {
      console.error('❌ createTeacher: getTeacher失敗:', error)
      throw error
    }
  }

  /**
   * 教師更新
   */
  async updateTeacher(
    id: string,
    updateData: Partial<CreateTeacherRequest>
  ): Promise<LegacyTeacher> {
    IdSchema.parse(id)

    // 既存教師の確認
    await this.getTeacher(id) // エラーがあれば例外を投げる

    const validatedData = CreateTeacherRequestSchema.partial().parse(updateData)
    const now = new Date().toISOString()

    // 更新フィールド構築
    const updateFields: string[] = []
    const updateParams: unknown[] = []

    if (validatedData.name !== undefined) {
      updateFields.push('name = ?')
      updateParams.push(validatedData.name)
    }

    if (validatedData.subjects !== undefined) {
      updateFields.push('subjects = ?')
      updateParams.push(safeJsonStringify(validatedData.subjects))
    }

    if (validatedData.grades !== undefined) {
      updateFields.push('grades = ?')
      updateParams.push(safeJsonStringify(validatedData.grades))
    }

    if (validatedData.assignmentRestrictions !== undefined) {
      updateFields.push('assignmentRestrictions = ?')
      updateParams.push(safeJsonStringify(validatedData.assignmentRestrictions))
    }

    updateFields.push('updated_at = ?')
    updateParams.push(now)
    updateParams.push(id)

    const result = await this.dbHelper.execute(
      `UPDATE teachers SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    )

    if (result.changes === 0) {
      throw new TypeSafeServiceError('教師の更新に失敗しました', 'UPDATE_FAILED')
    }

    return this.getTeacher(id)
  }

  /**
   * 教師削除
   */
  async deleteTeacher(
    id: string
  ): Promise<{ deletedId: string; deletedName: string; deletedAt: string }> {
    IdSchema.parse(id)

    const teacher = await this.getTeacher(id)

    const result = await this.dbHelper.execute('DELETE FROM teachers WHERE id = ?', [id])

    if (result.changes === 0) {
      throw new TypeSafeServiceError('教師の削除に失敗しました', 'DELETE_FAILED')
    }

    return {
      deletedId: id,
      deletedName: teacher.name,
      deletedAt: new Date().toISOString(),
    }
  }
}

/**
 * 型安全教科サービス
 */
export class TypeSafeSubjectService {
  private dbHelper: TypeSafeDbHelper

  constructor(private db: D1Database) {
    this.dbHelper = new TypeSafeDbHelper(db)
  }

  /**
   * 教科一覧取得（ページネーション対応）
   */
  async getSubjects(
    options: {
      page?: number
      limit?: number
      search?: string
      grade?: number
      classroomType?: string
    } = {}
  ): Promise<{
    subjects: Subject[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }> {
    const page = options.page || 1
    const limit = Math.min(options.limit || 20, 100)
    const offset = (page - 1) * limit

    const whereConditions: string[] = ['1=1']
    const params: unknown[] = []

    // 検索条件構築
    if (options.search) {
      whereConditions.push('name LIKE ?')
      params.push(`%${options.search}%`)
    }

    if (options.grade) {
      whereConditions.push('target_grades LIKE ?')
      params.push(`%${options.grade}%`)
    }

    if (options.classroomType) {
      whereConditions.push('special_classroom = ?')
      params.push(options.classroomType)
    }

    const whereClause = whereConditions.join(' AND ')

    // カウント取得
    const countResult = await this.dbHelper.queryFirst(
      `SELECT COUNT(*) as total FROM subjects WHERE ${whereClause}`,
      params,
      z.object({ total: z.number() })
    )
    const total = countResult?.total || 0

    // データ取得（現在のデータベース構造に合わせて変換）
    const subjectsRaw = await this.dbHelper.queryAll(
      `SELECT * FROM subjects WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
      z
        .object({
          id: z.string(),
          name: z.string(),
          target_grades: z.string().nullable(),
          weekly_hours: z.number().nullable(),
          special_classroom: z.string().nullable(),
          created_at: z.string(),
          updated_at: z.string(),
          // 追加フィールドを許可（データベースから送信される可能性がある）
          school_id: z.string().optional(),
          short_name: z.string().nullable(),
          subject_code: z.string().nullable(),
          category: z.string().nullable(),
          requires_special_room: z.number().optional(),
          settings: z.string().optional(),
          is_active: z.number().optional(),
          description: z.string().optional(),
        })
        .passthrough() // 未知のフィールドを許可
    )

    // データ構造変換 - 明示的フィールド抽出
    const subjects = subjectsRaw.map(raw => {
      console.log('📍 教科データ変換開始:', { id: raw.id, name: raw.name })

      // 学年配列の処理（文字列の場合はパース、配列の場合はそのまま）
      let grades: number[] = []
      if (raw.target_grades) {
        if (typeof raw.target_grades === 'string') {
          grades = safeJsonParse(raw.target_grades, [])
        } else if (Array.isArray(raw.target_grades)) {
          grades = raw.target_grades
        }
      }

      // 週間時間数の処理（データベースの値を適切に変換）
      let weeklyHours: Record<string, number> = {}
      if (raw.weekly_hours) {
        if (typeof raw.weekly_hours === 'object' && !Array.isArray(raw.weekly_hours)) {
          // オブジェクト形式の場合はそのまま使用
          weeklyHours = raw.weekly_hours
        } else if (typeof raw.weekly_hours === 'number') {
          // 数値の場合は全学年に適用
          const targetGrades = grades.length > 0 ? grades : [1, 2, 3, 4, 5, 6]
          targetGrades.forEach(grade => {
            weeklyHours[grade.toString()] = raw.weekly_hours
          })
        } else if (typeof raw.weekly_hours === 'string') {
          // JSON文字列の場合はパース
          weeklyHours = safeJsonParse(raw.weekly_hours, {})
        }
      }

      const subject: Subject = {
        id: raw.id,
        name: raw.name,
        school_id: raw.school_id || 'default',
        grades: grades,
        weeklyHours: weeklyHours,
        requiresSpecialClassroom: raw.special_classroom !== null && raw.special_classroom !== '',
        classroomType: raw.special_classroom || '普通教室',
        color: '#3B82F6', // デフォルト色
        order: 1,
        description: raw.description || undefined,
        created_at: raw.created_at,
        updated_at: raw.updated_at,
      }

      console.log('📍 変換後教科データ:', subject)
      return SubjectSchema.parse(subject)
    })

    return {
      subjects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * 教科詳細取得
   */
  async getSubject(id: string): Promise<Subject> {
    IdSchema.parse(id)

    const subjectRaw = await this.dbHelper.queryFirst(
      'SELECT * FROM subjects WHERE id = ?',
      [id],
      z.object({
        id: z.string(),
        name: z.string(),
        target_grades: z.string().nullable(),
        weekly_hours: z.number().nullable(),
        special_classroom: z.string().nullable(),
        created_at: z.string(),
        updated_at: z.string(),
      })
    )

    if (!subjectRaw) {
      throw new TypeSafeServiceError('指定された教科が見つかりません', 'SUBJECT_NOT_FOUND')
    }

    // データ構造変換 - 明示的フィールド抽出
    console.log('📍 単一教科データ変換開始:', {
      id: subjectRaw.id,
      name: subjectRaw.name,
      school_id: subjectRaw.school_id,
    })
    console.log('📍 完全なsubjectRawデータ:', subjectRaw)

    // 学年配列の処理
    let grades: number[] = []
    if (subjectRaw.target_grades) {
      if (typeof subjectRaw.target_grades === 'string') {
        grades = safeJsonParse(subjectRaw.target_grades, [])
      } else if (Array.isArray(subjectRaw.target_grades)) {
        grades = subjectRaw.target_grades
      }
    }

    // 週間時間数の処理
    let weeklyHours: Record<string, number> = {}
    if (subjectRaw.weekly_hours) {
      if (typeof subjectRaw.weekly_hours === 'object' && !Array.isArray(subjectRaw.weekly_hours)) {
        weeklyHours = subjectRaw.weekly_hours
      } else if (typeof subjectRaw.weekly_hours === 'number') {
        const targetGrades = grades.length > 0 ? grades : [1, 2, 3, 4, 5, 6]
        targetGrades.forEach(grade => {
          weeklyHours[grade.toString()] = subjectRaw.weekly_hours
        })
      } else if (typeof subjectRaw.weekly_hours === 'string') {
        weeklyHours = safeJsonParse(subjectRaw.weekly_hours, {})
      }
    }

    const subject: Subject = {
      id: subjectRaw.id,
      name: subjectRaw.name,
      school_id: subjectRaw.school_id || 'default',
      grades: grades,
      weeklyHours: weeklyHours,
      requiresSpecialClassroom:
        subjectRaw.special_classroom !== null && subjectRaw.special_classroom !== '',
      classroomType: subjectRaw.special_classroom || '普通教室',
      color: '#3B82F6', // デフォルト色
      order: 1,
      description: subjectRaw.description || undefined,
      created_at: subjectRaw.created_at,
      updated_at: subjectRaw.updated_at,
    }

    return SubjectSchema.parse(subject)
  }

  /**
   * 教科作成
   */
  async createSubject(subjectData: {
    name: string
    grades?: number[]
    weeklyHours: Record<string, number>
    requiresSpecialClassroom?: boolean
    classroomType?: string
    order?: number
  }): Promise<Subject> {
    const subjectId = crypto.randomUUID()
    const now = new Date().toISOString()

    const result = await this.dbHelper.execute(
      `
      INSERT INTO subjects (
        id, name, target_grades, weekly_hours, special_classroom, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [
        subjectId,
        subjectData.name,
        safeJsonStringify(subjectData.grades || []),
        Object.values(subjectData.weeklyHours)[0] || 1,
        subjectData.classroomType || '普通教室',
        now,
        now,
      ]
    )

    if (!result.success) {
      throw new TypeSafeServiceError('教科の作成に失敗しました', 'CREATE_FAILED')
    }

    return this.getSubject(subjectId)
  }

  /**
   * 教科更新
   */
  async updateSubject(
    id: string,
    updateData: Partial<{
      name: string
      grades: number[]
      weeklyHours: Record<string, number>
      requiresSpecialClassroom: boolean
      classroomType: string
      order: number
    }>
  ): Promise<Subject> {
    IdSchema.parse(id)

    // 既存教科の確認
    await this.getSubject(id)

    const now = new Date().toISOString()
    const updateFields: string[] = []
    const updateParams: unknown[] = []

    if (updateData.name !== undefined) {
      updateFields.push('name = ?')
      updateParams.push(updateData.name)
    }

    if (updateData.grades !== undefined) {
      updateFields.push('target_grades = ?')
      updateParams.push(safeJsonStringify(updateData.grades))
    }

    if (updateData.weeklyHours !== undefined) {
      updateFields.push('weekly_hours = ?')
      updateParams.push(Object.values(updateData.weeklyHours)[0] || 1)
    }

    if (updateData.classroomType !== undefined) {
      updateFields.push('special_classroom = ?')
      updateParams.push(updateData.classroomType)
    }

    updateFields.push('updated_at = ?')
    updateParams.push(now)
    updateParams.push(id)

    const result = await this.dbHelper.execute(
      `UPDATE subjects SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    )

    if (result.changes === 0) {
      throw new TypeSafeServiceError('教科の更新に失敗しました', 'UPDATE_FAILED')
    }

    return this.getSubject(id)
  }

  /**
   * 教科削除
   */
  async deleteSubject(
    id: string
  ): Promise<{ deletedId: string; deletedName: string; deletedAt: string }> {
    IdSchema.parse(id)

    const subject = await this.getSubject(id)

    const result = await this.dbHelper.execute('DELETE FROM subjects WHERE id = ?', [id])

    if (result.changes === 0) {
      throw new TypeSafeServiceError('教科の削除に失敗しました', 'DELETE_FAILED')
    }

    return {
      deletedId: id,
      deletedName: subject.name,
      deletedAt: new Date().toISOString(),
    }
  }
}

/**
 * 型安全教室サービス
 */
export class TypeSafeClassroomService {
  private dbHelper: TypeSafeDbHelper

  constructor(private db: D1Database) {
    this.dbHelper = new TypeSafeDbHelper(db)
  }

  /**
   * 教室一覧取得（ページネーション対応）
   */
  async getClassrooms(
    options: {
      page?: number
      limit?: number
      search?: string
      type?: string
      capacityMin?: number
      capacityMax?: number
    } = {}
  ): Promise<{
    classrooms: Classroom[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
    summary?: {
      totalCapacity: number
      typeDistribution: Record<string, number>
    }
  }> {
    const page = options.page || 1
    const limit = Math.min(options.limit || 20, 100)
    const offset = (page - 1) * limit

    const whereConditions: string[] = ['1=1']
    const params: unknown[] = []

    // 検索条件構築
    if (options.search) {
      whereConditions.push('name LIKE ?')
      params.push(`%${options.search}%`)
    }

    if (options.type) {
      whereConditions.push('type = ?')
      params.push(options.type)
    }

    if (options.capacityMin) {
      whereConditions.push('capacity >= ?')
      params.push(options.capacityMin)
    }

    if (options.capacityMax) {
      whereConditions.push('capacity <= ?')
      params.push(options.capacityMax)
    }

    const whereClause = whereConditions.join(' AND ')

    // カウント取得
    const countResult = await this.dbHelper.queryFirst(
      `SELECT COUNT(*) as total FROM classrooms WHERE ${whereClause}`,
      params,
      z.object({ total: z.number() })
    )
    const total = countResult?.total || 0

    // データ取得 - 必要なフィールドのみ選択
    const classroomsRaw = await this.dbHelper.queryAll(
      `SELECT id, name, type, capacity, count, location, order, created_at, updated_at FROM classrooms WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
      z.object({
        id: z.string(),
        name: z.string(),
        type: z.string(),
        capacity: z.number().nullable(),
        count: z.number().optional(),
        location: z.string().nullable(),
        order: z.number().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
      })
    )

    // データ構造変換 - ClassroomSchemaに準拠
    const classrooms = classroomsRaw.map(raw => {
      console.log('📍 教室データ変換開始:', { id: raw.id, name: raw.name })

      const classroom: Classroom = {
        id: raw.id,
        name: raw.name,
        type: raw.type,
        capacity: raw.capacity || 30,
        location: raw.location || '',
        count: raw.count || 1,
        order: raw.order || 1,
        created_at: raw.created_at,
        updated_at: raw.updated_at,
      }

      console.log('📍 変換後教室データ:', classroom)
      return ClassroomSchema.parse(classroom)
    })

    // 統計情報取得
    const summaryResults = await this.dbHelper.queryAll(
      `SELECT type, SUM(capacity * count) as totalCapacity, SUM(count) as typeCount 
       FROM classrooms WHERE ${whereClause} GROUP BY type`,
      params,
      z.object({
        type: z.string(),
        totalCapacity: z.number().nullable(),
        typeCount: z.number(),
      })
    )

    const totalCapacity = summaryResults.reduce((sum, row) => sum + (row.totalCapacity || 0), 0)
    const typeDistribution: Record<string, number> = {}
    summaryResults.forEach(row => {
      typeDistribution[row.type] = row.typeCount || 0
    })

    return {
      classrooms,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalCapacity,
        typeDistribution,
      },
    }
  }

  /**
   * 教室詳細取得
   */
  async getClassroom(id: string): Promise<Classroom> {
    IdSchema.parse(id)

    const classroomRaw = await this.dbHelper.queryFirst(
      'SELECT id, name, type, capacity, count, location, order, created_at, updated_at FROM classrooms WHERE id = ?',
      [id],
      z.object({
        id: z.string(),
        name: z.string(),
        type: z.string(),
        capacity: z.number().nullable(),
        count: z.number().optional(),
        location: z.string().nullable(),
        order: z.number().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
      })
    )

    if (!classroomRaw) {
      throw new TypeSafeServiceError('指定された教室が見つかりません', 'CLASSROOM_NOT_FOUND')
    }

    // データ構造変換 - 明示的フィールド抽出
    console.log('📍 単一教室データ変換開始:', { id: classroomRaw.id, name: classroomRaw.name })

    const classroom: Classroom = {
      id: classroomRaw.id,
      name: classroomRaw.name,
      type: classroomRaw.type,
      capacity: classroomRaw.capacity || 30,
      location: classroomRaw.location || '',
      count: classroomRaw.count || 1,
      order: classroomRaw.order || 1,
      created_at: classroomRaw.created_at,
      updated_at: classroomRaw.updated_at,
    }

    return ClassroomSchema.parse(classroom)
  }

  /**
   * 教室作成
   */
  async createClassroom(classroomData: {
    name: string
    type: string
    capacity?: number
    count?: number
    order?: number
  }): Promise<Classroom> {
    const classroomId = crypto.randomUUID()
    const now = new Date().toISOString()

    const result = await this.dbHelper.execute(
      `
      INSERT INTO classrooms (
        id, name, type, capacity, count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [
        classroomId,
        classroomData.name,
        classroomData.type,
        classroomData.capacity || null,
        classroomData.count || 1,
        now,
        now,
      ]
    )

    if (!result.success) {
      throw new TypeSafeServiceError('教室の作成に失敗しました', 'CREATE_FAILED')
    }

    return this.getClassroom(classroomId)
  }

  /**
   * 教室更新
   */
  async updateClassroom(
    id: string,
    updateData: Partial<{
      name: string
      type: string
      capacity: number
      count: number
      order: number
    }>
  ): Promise<Classroom> {
    IdSchema.parse(id)

    // 既存教室の確認
    await this.getClassroom(id)

    const now = new Date().toISOString()
    const updateFields: string[] = []
    const updateParams: unknown[] = []

    if (updateData.name !== undefined) {
      updateFields.push('name = ?')
      updateParams.push(updateData.name)
    }

    if (updateData.type !== undefined) {
      updateFields.push('type = ?')
      updateParams.push(updateData.type)
    }

    if (updateData.capacity !== undefined) {
      updateFields.push('capacity = ?')
      updateParams.push(updateData.capacity)
    }

    if (updateData.count !== undefined) {
      updateFields.push('count = ?')
      updateParams.push(updateData.count)
    }

    updateFields.push('updated_at = ?')
    updateParams.push(now)
    updateParams.push(id)

    const result = await this.dbHelper.execute(
      `UPDATE classrooms SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    )

    if (result.changes === 0) {
      throw new TypeSafeServiceError('教室の更新に失敗しました', 'UPDATE_FAILED')
    }

    return this.getClassroom(id)
  }

  /**
   * 教室削除
   */
  async deleteClassroom(
    id: string
  ): Promise<{ deletedId: string; deletedName: string; deletedAt: string }> {
    IdSchema.parse(id)

    const classroom = await this.getClassroom(id)

    const result = await this.dbHelper.execute('DELETE FROM classrooms WHERE id = ?', [id])

    if (result.changes === 0) {
      throw new TypeSafeServiceError('教室の削除に失敗しました', 'DELETE_FAILED')
    }

    return {
      deletedId: id,
      deletedName: classroom.name,
      deletedAt: new Date().toISOString(),
    }
  }
}

/**
 * 型安全統合サービス
 */
export class TypeSafeSchoolService {
  public readonly schoolSettings: TypeSafeSchoolSettingsService
  public readonly teachers: TypeSafeTeacherService
  public readonly subjects: TypeSafeSubjectService
  public readonly classrooms: TypeSafeClassroomService

  constructor(private db: D1Database) {
    this.schoolSettings = new TypeSafeSchoolSettingsService(db)
    this.teachers = new TypeSafeTeacherService(db)
    this.subjects = new TypeSafeSubjectService(db)
    this.classrooms = new TypeSafeClassroomService(db)
  }

  /**
   * システム統計情報取得
   */
  async getSystemMetrics(): Promise<{
    statistics: {
      teachers: number
      subjects: number
      classrooms: number
      schoolSettings: number
    }
    api: {
      version: string
      environment: string
      timestamp: string
      uptime: number
    }
    features: string[]
  }> {
    const settings = await this.schoolSettings.getSchoolSettings()

    return {
      statistics: {
        teachers: settings.statistics.totalTeachers,
        subjects: settings.statistics.totalSubjects,
        classrooms: settings.statistics.totalClassrooms,
        schoolSettings: 1,
      },
      api: {
        version: '1.0.0',
        environment: 'production',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(Date.now() / 1000),
      },
      features: [
        '完全型安全性',
        'OpenAPI 3.0.3準拠',
        '自動バリデーション',
        'リアルタイムドキュメント',
        '統一エラーハンドリング',
        'CORS対応',
        'セキュリティヘッダー',
      ],
    }
  }
}
