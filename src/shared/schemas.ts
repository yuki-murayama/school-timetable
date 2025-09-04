/**
 * 厳密型安全システム - Zodスキーマ定義
 * フロントエンド・バックエンド・データベース統一型定義
 */
import { z } from 'zod'

// ======================
// プリミティブ型定義 - 厳密制約
// ======================

/** 一意識別子 - CUID2形式（21-25文字）またはUUID v4形式 */
export const IdSchema = z.string().refine(
  (val) => {
    // CUID2形式: 21-25文字の英数字（小文字・数字のみ）
    const cuid2Pattern = /^[a-z0-9]{21,25}$/
    // UUID形式
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return cuid2Pattern.test(val) || uuidPattern.test(val)
  },
  {
    message: '有効なCUID2（21-25文字）またはUUIDが必要です',
  }
)

/** 非空文字列 - 最小1文字 */
export const NonEmptyStringSchema = z.string().min(1, '値は必須です').trim()

/** 名前文字列 - 1-100文字、日本語・英語・記号対応 */
export const NameSchema = z
  .string()
  .min(1, '名前は必須です')
  .max(100, '名前は100文字以内で入力してください')
  .regex(
    /^[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\-_\s]+$/,
    '名前は日本語、英語、数字、ハイフン、アンダースコア、スペースのみ使用可能です'
  )
  .trim()

/** 正の整数 */
export const PositiveIntegerSchema = z.number().int('整数が必要です').positive('正の値が必要です')

/** 0以上の整数 */
export const NonNegativeIntegerSchema = z
  .number()
  .int('整数が必要です')
  .min(0, '0以上の値が必要です')

/** 学年 - 1-6年生 */
export const GradeSchema = z.number().int().min(1, '学年は1以上です').max(6, '学年は6以下です')

/** クラス番号 - 1-20 */
export const ClassNumberSchema = z
  .number()
  .int()
  .min(1, 'クラス番号は1以上です')
  .max(20, 'クラス番号は20以下です')

/** クラス名 - A-Z, 1-20 */
export const ClassSectionSchema = z
  .string()
  .min(1, 'クラス名は必須です')
  .max(2, 'クラス名は2文字以内です')
  .regex(/^[A-Z]$|^[1-9][0-9]?$/, 'クラス名はA-Zまたは1-20の数字です')

/** 時間 - 1-10時限 */
export const PeriodSchema = z.number().int().min(1, '時限は1以上です').max(10, '時限は10以下です')

/** 曜日番号 - 1-7（月曜=1） */
export const WeekdaySchema = z.number().int().min(1, '曜日は1以上です').max(7, '曜日は7以下です')

/** 曜日 - 厳密定義 */
export const DayOfWeekSchema = z.enum(['月曜', '火曜', '水曜', '木曜', '金曜', '土曜', '日曜'], {
  message: '有効な曜日を選択してください',
})

/** 日付時間 - ISO8601形式 */
export const ISODateTimeSchema = z
  .string()
  .datetime('有効な日付時間形式(ISO8601)が必要です')
  .optional()

/** 制約違反レベル */
export const ViolationSeveritySchema = z.enum(['critical', 'high', 'medium', 'low'], {
  message: '制約違反レベルは critical, high, medium, low のいずれかです',
})

/** 割当制限レベル */
export const RestrictionLevelSchema = z.enum(['必須', '推奨'], {
  message: '制限レベルは「必須」または「推奨」です',
})

// ======================
// 環境設定 - 厳密型定義
// ======================
export const EnvSchema = z.object({
  DB: z.custom<D1Database>().describe('D1データベースインスタンス'),
  ASSETS: z.unknown().optional().describe('静的アセット'),
  GROQ_API_KEY: NonEmptyStringSchema.optional().describe('GROQ APIキー'),
  JWT_SECRET: NonEmptyStringSchema.optional().describe('JWT認証秘密鍵'),
  NODE_ENV: z.enum(['development', 'production', 'test']).describe('実行環境'),
})

// ======================
// 学校設定 - 厳密型定義
// ======================
export const SchoolSettingsSchema = z
  .object({
    id: z.string().default('default').describe('設定ID（通常は"default"）'),
    grade1Classes: PositiveIntegerSchema.max(20, '1学年クラス数は20以下です').describe(
      '1学年のクラス数'
    ),
    grade2Classes: PositiveIntegerSchema.max(20, '2学年クラス数は20以下です').describe(
      '2学年のクラス数'
    ),
    grade3Classes: PositiveIntegerSchema.max(20, '3学年クラス数は20以下です').describe(
      '3学年のクラス数'
    ),
    grade4Classes: PositiveIntegerSchema.max(20, '4学年クラス数は20以下です')
      .default(3)
      .describe('4学年のクラス数'),
    grade5Classes: PositiveIntegerSchema.max(20, '5学年クラス数は20以下です')
      .default(3)
      .describe('5学年のクラス数'),
    grade6Classes: PositiveIntegerSchema.max(20, '6学年クラス数は20以下です')
      .default(3)
      .describe('6学年のクラス数'),
    dailyPeriods: PositiveIntegerSchema.max(10, '平日時限数は10以下です').describe('平日の時限数'),
    saturdayPeriods: NonNegativeIntegerSchema.max(8, '土曜時限数は8以下です').describe(
      '土曜日の時限数'
    ),
    created_at: ISODateTimeSchema.describe('作成日時'),
    updated_at: ISODateTimeSchema.describe('更新日時'),
  })
  .strict()

// 計算プロパティ付き学校設定
export const EnhancedSchoolSettingsSchema = SchoolSettingsSchema.extend({
  statistics: z
    .object({
      totalTeachers: NonNegativeIntegerSchema.describe('教師総数'),
      totalSubjects: NonNegativeIntegerSchema.describe('教科総数'),
      totalClassrooms: NonNegativeIntegerSchema.describe('教室総数'),
      totalClasses: NonNegativeIntegerSchema.describe('クラス総数'),
    })
    .describe('統計情報'),
  validation: z
    .object({
      isConfigured: z.boolean().describe('設定完了フラグ'),
      hasMinimumTeachers: z.boolean().describe('教師数充足フラグ'),
      hasMinimumSubjects: z.boolean().describe('教科数充足フラグ'),
      warnings: z.array(z.string()).describe('警告メッセージ配列'),
    })
    .describe('検証情報'),
}).strict()

// ======================
// 割当制限 - 厳密型定義
// ======================
export const AssignmentRestrictionSchema = z
  .object({
    id: IdSchema.describe('制限ID'),
    type: z.enum(['time', 'day', 'consecutive', 'workload', 'resource']).describe('制限タイプ'),
    level: RestrictionLevelSchema.describe('制限レベル'),
    description: z.string().max(500, '説明は500文字以内です').describe('制限説明'),
    timeSlots: z
      .array(
        z.object({
          dayOfWeek: DayOfWeekSchema,
          periods: z.array(PeriodSchema),
        })
      )
      .default([])
      .describe('時間スロット制限'),
    maxConsecutive: PositiveIntegerSchema.max(10).optional().describe('連続授業最大数'),
    maxDailyHours: PositiveIntegerSchema.max(10).optional().describe('日次最大時間数'),
    maxWeeklyHours: PositiveIntegerSchema.max(50).optional().describe('週次最大時間数'),
    excludeDays: z.array(DayOfWeekSchema).default([]).describe('除外曜日'),
    requiredResources: z.array(z.string()).default([]).describe('必要リソース'),
    created_at: ISODateTimeSchema.describe('作成日時'),
    updated_at: ISODateTimeSchema.describe('更新日時'),
  })
  .strict()

// ======================
// 教師 - 厳密型定義（本番データベース構造準拠）
// ======================

/** 本番データベース準拠教師スキーマ */
export const TeacherSchema = z
  .object({
    id: z.string().min(1, '教師IDは必須です').describe('教師ID（UUID形式推奨）'),
    name: NameSchema.describe('教師名'),
    school_id: z.string().min(1, '学校IDは必須です').describe('学校ID'),
    created_at: z.string().describe('作成日時'),
    updated_at: z.string().describe('更新日時'),
    employee_number: z.string().nullable().optional().describe('職員番号'),
    email: z.string().nullable().optional().describe('メールアドレス'),
    phone: z.string().nullable().optional().describe('電話番号'),
    specialization: z.string().nullable().optional().describe('専門分野'),
    employment_type: z.string().nullable().optional().describe('雇用形態'),
    max_hours_per_week: z.number().int().nullable().optional().describe('週最大勤務時間'),
    is_active: z.number().int().min(0).max(1).default(1).describe('有効フラグ (0/1)'),
    grades: z.string().nullable().optional().describe('担当学年JSON文字列'),
    assignment_restrictions: z.string().nullable().optional().describe('割当制限JSON文字列'),
    order: z.number().int().nullable().optional().describe('表示順序'),
    subjects: z.string().nullable().optional().describe('担当教科JSON文字列'),
  })
  .strict()

/** レガシー教師スキーマ（下位互換性用） */
export const LegacyTeacherSchema = z
  .object({
    id: z.string().min(1, '教師IDは必須です').describe('教師ID（UUID形式推奨）'),
    name: NameSchema.describe('教師名'),
    email: z.string().email('有効なメールアドレスが必要です').optional().describe('メールアドレス'),
    subjects: z.array(z.string()).default([]).describe('担当教科名配列'),
    grades: z.array(GradeSchema).default([]).describe('担当学年配列'),
    assignmentRestrictions: z.array(z.string()).default([]).describe('割当制限配列'),
    maxWeeklyHours: PositiveIntegerSchema.max(50).default(25).describe('週最大勤務時間'),
    preferredTimeSlots: z
      .array(
        z.object({
          dayOfWeek: DayOfWeekSchema,
          periods: z.array(PeriodSchema),
        })
      )
      .default([])
      .describe('希望時間スロット'),
    unavailableSlots: z
      .array(
        z.object({
          dayOfWeek: DayOfWeekSchema,
          periods: z.array(PeriodSchema),
        })
      )
      .default([])
      .describe('利用不可時間スロット'),
    order: PositiveIntegerSchema.max(100).default(1).describe('表示順序'),
    created_at: ISODateTimeSchema.describe('作成日時'),
    updated_at: ISODateTimeSchema.describe('更新日時'),
  })
  .strict()

/** バックエンド内部用教師スキーマ（レガシー） */
export const TeacherInternalSchema = LegacyTeacherSchema.extend({
  id: IdSchema.describe('教師ID'),
  subjects: z.array(IdSchema).default([]).describe('担当教科ID配列'),
  assignmentRestrictions: z.array(IdSchema).default([]).describe('割当制限ID配列'),
})

export const CreateTeacherRequestSchema = TeacherSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

/** 内部処理用作成リクエストスキーマ */
export const CreateTeacherInternalRequestSchema = TeacherInternalSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

// ======================
// 教科 - 厳密型定義（本番データベース構造準拠）
// ======================
export const SubjectSchema = z
  .object({
    id: z.string().min(1, '教科IDは必須です').describe('教科ID（UUID形式推奨）'),
    name: NameSchema.describe('教科名'),
    school_id: z.string().min(1, '学校IDは必須です').describe('学校ID'),
    created_at: z.string().optional().describe('作成日時'),
    updated_at: z.string().optional().describe('更新日時'),
    short_name: z.string().nullable().optional().describe('教科略称'),
    subject_code: z.string().nullable().optional().describe('教科コード'),
    category: z.string().nullable().optional().describe('教科カテゴリ'),
    weekly_hours: z.number().int().nullable().optional().describe('週間時間数'),
    requires_special_room: z.number().int().min(0).max(1).default(0).describe('特別教室必要フラグ (0/1)'),
    color: z.string().nullable().optional().describe('表示色'),
    settings: z.string().default('{}').describe('設定JSON文字列'),
    is_active: z.number().int().min(0).max(1).default(1).describe('有効フラグ (0/1)'),
    target_grades: z.string().nullable().optional().describe('対象学年JSON文字列'),
    order: z.number().int().nullable().optional().describe('表示順序'),
    special_classroom: z.string().nullable().optional().describe('特別教室タイプ'),
  })
  .strict()

// 下位互換性のためのレガシースキーマ（必要に応じて使用）
export const LegacySubjectSchema = z
  .object({
    id: z.string().min(1, '教科IDは必須です').describe('教科ID（UUID形式推奨）'),
    name: NameSchema.describe('教科名'),
    grades: z.array(GradeSchema).default([1, 2, 3]).describe('対象学年配列'),
    weeklyHours: z
      .record(
        z.string().regex(/^[1-6]$/, '学年キーは1-6です'),
        PositiveIntegerSchema.max(20, '週間時間数は20以下です')
      )
      .default({})
      .describe('学年別週間時間数'),
    requiresSpecialClassroom: z.boolean().default(false).describe('特別教室必要フラグ'),
    classroomType: z
      .string()
      .max(50, '教室タイプは50文字以内です')
      .default('普通教室')
      .describe('必要教室タイプ'),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, '色は16進数カラーコードです')
      .default('#3B82F6')
      .describe('表示色'),
    order: PositiveIntegerSchema.max(100).default(1).describe('表示順序'),
    description: z.string().max(1000, '説明は1000文字以内です').optional().describe('教科説明'),
    created_at: ISODateTimeSchema.describe('作成日時'),
    updated_at: ISODateTimeSchema.describe('更新日時'),
  })
  .strict()

// ======================
// 教室 - 厳密型定義
// ======================
export const ClassroomTypeSchema = z.enum(
  [
    '普通教室',
    '理科室',
    '音楽室',
    '美術室',
    '体育館',
    'コンピュータ室',
    '図書室',
    '調理室',
    '技術室',
    'その他',
  ],
  { message: '有効な教室タイプを選択してください' }
)

export const ClassroomSchema = z
  .object({
    id: z.string().min(1, '教室IDは必須です').describe('教室ID（UUID形式推奨）'),
    name: NameSchema.describe('教室名'),
    type: z.string().min(1, '教室タイプは必須です').describe('教室タイプ'),
    capacity: z.number().int().nullable().optional().describe('収容人数'),
    count: z.number().int().default(1).describe('同タイプ教室数'),
    location: z.string().nullable().optional().describe('場所'),
    order: z.number().int().default(0).describe('表示順序'),
    created_at: z.string().optional().describe('作成日時'),
    updated_at: z.string().optional().describe('更新日時'),
  })
  .strict()

// ======================
// 制約違反 - 厳密型定義
// ======================
export const ConstraintViolationSchema = z
  .object({
    id: IdSchema.describe('違反ID'),
    type: z
      .enum([
        'teacher_conflict',
        'classroom_conflict',
        'subject_hours',
        'resource_shortage',
        'time_restriction',
        'workload_exceeded',
      ])
      .describe('違反タイプ'),
    severity: ViolationSeveritySchema.describe('重要度'),
    description: z.string().max(1000, '説明は1000文字以内です').describe('違反内容'),
    affectedSlots: z
      .array(
        z.object({
          dayOfWeek: DayOfWeekSchema,
          period: PeriodSchema,
          grade: GradeSchema,
          classSection: ClassSectionSchema,
        })
      )
      .describe('影響を受けるスロット'),
    constraintId: z.string().max(100).describe('制約識別子'),
    suggestedFix: z.string().max(500, '修正提案は500文字以内です').describe('修正提案'),
  })
  .strict()

// ======================
// 時間割スロット - 厳密型定義
// ======================
export const TimetableSlotSchema = z
  .object({
    id: IdSchema.describe('スロットID'),
    grade: GradeSchema.describe('学年'),
    classSection: ClassSectionSchema.describe('クラス'),
    dayOfWeek: DayOfWeekSchema.describe('曜日'),
    period: PeriodSchema.describe('時限'),
    subjectId: IdSchema.nullable().describe('教科ID'),
    teacherId: IdSchema.nullable().describe('教師ID'),
    classroomId: IdSchema.nullable().describe('教室ID'),
    isFixed: z.boolean().default(false).describe('固定スロットフラグ'),
    constraints: z.array(ConstraintViolationSchema).default([]).describe('制約違反配列'),
  })
  .strict()

// ======================
// 時間割 - 厳密型定義
// ======================
export const TimetableSchema = z
  .object({
    id: IdSchema.describe('時間割ID'),
    grade: GradeSchema.describe('学年'),
    classNumber: ClassNumberSchema.describe('クラス番号'),
    version: z.string().min(1).max(50).describe('バージョン'),
    status: z.enum(['draft', 'active', 'archived']).describe('ステータス'),
    slots: z.array(TimetableSlotSchema).describe('スロット配列'),
    constraints: z.record(z.any()).default({}).describe('制約条件'),
    metadata: z
      .object({
        description: z.string().max(500).optional(),
        tags: z.array(z.string().max(50)).default([]),
        priority: z.enum(['low', 'normal', 'high']).default('normal'),
      })
      .default({})
      .describe('メタデータ'),
    created_at: ISODateTimeSchema.describe('作成日時'),
    updated_at: ISODateTimeSchema.describe('更新日時'),
  })
  .strict()

// ======================
// 時間割統計 - 厳密型定義
// ======================
export const TimetableStatisticsSchema = z
  .object({
    totalSlots: NonNegativeIntegerSchema.describe('総スロット数'),
    assignedSlots: NonNegativeIntegerSchema.describe('割当済みスロット数'),
    unassignedSlots: NonNegativeIntegerSchema.describe('未割当スロット数'),
    constraintViolations: NonNegativeIntegerSchema.describe('制約違反数'),
    backtrackCount: NonNegativeIntegerSchema.describe('バックトラック回数'),
    generationTimeMs: PositiveIntegerSchema.describe('生成時間(ミリ秒)'),
    assignmentRate: z
      .number()
      .min(0, '割当率は0以上です')
      .max(100, '割当率は100以下です')
      .describe('割当率(%)'),
    qualityScore: z
      .number()
      .min(0, '品質スコアは0以上です')
      .max(100, '品質スコアは100以下です')
      .describe('品質スコア(0-100)'),
  })
  .strict()

// ======================
// 時間割生成結果 - 厳密型定義
// ======================
export const TimetableGenerationResultSchema = z
  .object({
    success: z.boolean().describe('生成成功フラグ'),
    timetable: z
      .array(z.array(z.array(TimetableSlotSchema)))
      .optional()
      .describe('3次元時間割配列 [day][period][class]'),
    statistics: TimetableStatisticsSchema.optional().describe('生成統計'),
    message: z
      .string()
      .max(1000, 'メッセージは1000文字以内です')
      .optional()
      .describe('生成結果メッセージ'),
    generatedAt: ISODateTimeSchema.optional().describe('生成日時'),
    method: z.enum(['standard', 'optimized', 'ai-enhanced']).optional().describe('生成手法'),
  })
  .strict()

// ======================
// API共通レスポンス - 厳密型定義
// ======================
export const ApiSuccessResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z
    .object({
      success: z.literal(true),
      data: dataSchema,
      message: z.string().optional().describe('成功メッセージ'),
      timestamp: ISODateTimeSchema.optional().describe('レスポンス時刻'),
    })
    .strict()

export const ApiErrorResponseSchema = z
  .object({
    success: z.literal(false),
    error: NonEmptyStringSchema.describe('エラータイプ'),
    message: NonEmptyStringSchema.describe('エラーメッセージ'),
    details: z.record(z.any()).optional().describe('エラー詳細情報'),
    code: z.string().optional().describe('エラーコード'),
    timestamp: ISODateTimeSchema.optional().describe('エラー発生時刻'),
  })
  .strict()

// ======================
// 型推論エクスポート
// ======================
export type Env = z.infer<typeof EnvSchema>
export type SchoolSettings = z.infer<typeof SchoolSettingsSchema>
export type EnhancedSchoolSettings = z.infer<typeof EnhancedSchoolSettingsSchema>
export type AssignmentRestriction = z.infer<typeof AssignmentRestrictionSchema>
export type Subject = z.infer<typeof SubjectSchema>
export type Teacher = z.infer<typeof TeacherSchema>
export type TeacherInternal = z.infer<typeof TeacherInternalSchema>
export type CreateTeacherRequest = z.infer<typeof CreateTeacherRequestSchema>
export type CreateTeacherInternalRequest = z.infer<typeof CreateTeacherInternalRequestSchema>
export type Classroom = z.infer<typeof ClassroomSchema>
export type ClassroomType = z.infer<typeof ClassroomTypeSchema>
export type ConstraintViolation = z.infer<typeof ConstraintViolationSchema>
export type TimetableSlot = z.infer<typeof TimetableSlotSchema>
export type Timetable = z.infer<typeof TimetableSchema>
export type TimetableStatistics = z.infer<typeof TimetableStatisticsSchema>
export type TimetableGenerationResult = z.infer<typeof TimetableGenerationResultSchema>
export type ViolationSeverity = z.infer<typeof ViolationSeveritySchema>
export type RestrictionLevel = z.infer<typeof RestrictionLevelSchema>
export type DayOfWeek = z.infer<typeof DayOfWeekSchema>
export type ApiSuccessResponse<T> = { success: true; data: T; message?: string; timestamp?: string }
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>

// ======================
// ヘルパー関数 - 型安全なファクトリー
// ======================

/** 学校設定の計算プロパティを生成 */
export const createEnhancedSchoolSettings = (
  settings: SchoolSettings,
  statistics: {
    totalTeachers: number
    totalSubjects: number
    totalClassrooms: number
  }
): EnhancedSchoolSettings => {
  const totalClasses = [
    settings.grade1Classes,
    settings.grade2Classes,
    settings.grade3Classes,
    settings.grade4Classes,
    settings.grade5Classes,
    settings.grade6Classes,
  ].reduce((sum, count) => sum + count, 0)

  const validation = {
    isConfigured: statistics.totalTeachers > 0 && statistics.totalSubjects > 0,
    hasMinimumTeachers: statistics.totalTeachers >= 5,
    hasMinimumSubjects: statistics.totalSubjects >= 8,
    warnings: [] as string[],
  }

  if (!validation.hasMinimumTeachers) {
    validation.warnings.push('教師が不足しています（推奨：5人以上）')
  }
  if (!validation.hasMinimumSubjects) {
    validation.warnings.push('教科が不足しています（推奨：8教科以上）')
  }

  return EnhancedSchoolSettingsSchema.parse({
    ...settings,
    statistics: {
      ...statistics,
      totalClasses,
    },
    validation,
  })
}

/** 型安全なJSON文字列パース */
export const safeJsonParse = <T>(jsonString: string | null | undefined, defaultValue: T): T => {
  if (!jsonString) return defaultValue

  try {
    return JSON.parse(jsonString) as T
  } catch (error) {
    console.warn('JSON解析エラー:', error)
    return defaultValue
  }
}

/** 型安全なJSON文字列変換 */
export const safeJsonStringify = (value: unknown): string => {
  try {
    return JSON.stringify(value)
  } catch (error) {
    console.warn('JSON変換エラー:', error)
    return '[]'
  }
}

/** 空の時間割スロット作成 */
export const createEmptyTimetableSlot = (
  grade: number,
  classSection: string,
  dayOfWeek: DayOfWeek,
  period: number
): TimetableSlot => {
  return TimetableSlotSchema.parse({
    id: crypto.randomUUID(),
    grade,
    classSection,
    dayOfWeek,
    period,
    subjectId: null,
    teacherId: null,
    classroomId: null,
    isFixed: false,
    constraints: [],
  })
}

/** デフォルト学校設定作成 */
export const createDefaultSchoolSettings = (): SchoolSettings => {
  return SchoolSettingsSchema.parse({
    id: 'default',
    grade1Classes: 4,
    grade2Classes: 4,
    grade3Classes: 3,
    grade4Classes: 3,
    grade5Classes: 3,
    grade6Classes: 3,
    dailyPeriods: 6,
    saturdayPeriods: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
}

// ======================
// エラークラス定義
// ======================

/** バリデーションエラークラス */
export class ValidationError extends Error {
  constructor(
    public readonly validationErrors: z.ZodIssue[],
    public readonly originalData: unknown
  ) {
    super(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`)
    this.name = 'ValidationError'
  }
}
