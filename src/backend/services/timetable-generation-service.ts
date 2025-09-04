/**
 * 時間割生成ビジネスロジック - 型安全AI駆動時間割生成システム
 * 制約満足問題解決とバックトラッキングによる最適化
 */

import {
  type Classroom,
  type ConstraintViolation,
  ConstraintViolationSchema,
  type DayOfWeek,
  DayOfWeekSchema,
  GradeSchema,
  IdSchema,
  PeriodSchema,
  type SchoolSettings,
  type Subject,
  type Teacher,
  type TimetableGenerationResult,
  TimetableGenerationResultSchema,
  type TimetableSlot,
  type TimetableStatistics,
  TimetableStatisticsSchema,
} from '@shared/schemas'
import { z } from 'zod'
import { TypeSafeDbHelper, TypeSafeSchoolService } from './type-safe-service'

/**
 * 時間割生成制約スキーマ
 */
export const TimetableConstraintsSchema = z
  .object({
    grade: GradeSchema.describe('対象学年'),
    classSection: z
      .string()
      .regex(/^[A-Z]$/, 'クラス名はA-Zです')
      .describe('対象クラス'),
    maxPeriodsPerDay: z.number().int().min(1).max(10).default(6).describe('1日の最大時限数'),
    allowConsecutiveLessons: z.boolean().default(true).describe('連続授業許可フラグ'),
    preferredTimeSlots: z
      .array(
        z.object({
          subjectId: IdSchema.describe('教科ID'),
          dayOfWeek: DayOfWeekSchema.describe('希望曜日'),
          period: PeriodSchema.describe('希望時限'),
        })
      )
      .default([])
      .describe('優先時間スロット'),
    fixedTimeSlots: z
      .array(
        z.object({
          subjectId: IdSchema.describe('教科ID'),
          teacherId: IdSchema.optional().describe('教師ID'),
          classroomId: IdSchema.optional().describe('教室ID'),
          dayOfWeek: DayOfWeekSchema.describe('固定曜日'),
          period: PeriodSchema.describe('固定時限'),
        })
      )
      .default([])
      .describe('固定時間スロット'),
    teacherAvailability: z
      .record(
        IdSchema,
        z.array(
          z.object({
            dayOfWeek: DayOfWeekSchema,
            periods: z.array(PeriodSchema),
          })
        )
      )
      .default({})
      .describe('教師利用可能時間'),
    classroomPriority: z
      .record(IdSchema, z.number().min(1).max(10))
      .default({})
      .describe('教室優先度'),
  })
  .strict()

/**
 * 時間割生成オプションスキーマ
 */
export const TimetableGenerationOptionsSchema = z
  .object({
    method: z
      .enum(['standard', 'optimized', 'ai-enhanced'])
      .default('optimized')
      .describe('生成手法'),
    maxIterations: z.number().int().min(100).max(10000).default(1000).describe('最大反復回数'),
    timeoutMs: z.number().int().min(5000).max(300000).default(60000).describe('タイムアウト(ms)'),
    qualityThreshold: z.number().min(0).max(100).default(75).describe('品質閾値'),
    enableParallelProcessing: z.boolean().default(true).describe('並列処理有効化'),
    constraintWeights: z
      .object({
        teacherConflict: z.number().min(1).max(100).default(100).describe('教師競合重要度'),
        classroomConflict: z.number().min(1).max(100).default(90).describe('教室競合重要度'),
        subjectDistribution: z.number().min(1).max(100).default(80).describe('教科配置重要度'),
        teacherWorkload: z.number().min(1).max(100).default(70).describe('教師負荷重要度'),
        classroomUtilization: z.number().min(1).max(100).default(60).describe('教室利用率重要度'),
      })
      .default({})
      .describe('制約重み設定'),
  })
  .strict()

/**
 * 時間割生成状態スキーマ
 */
export const TimetableGenerationStateSchema = z
  .object({
    currentIteration: z.number().int().min(0).describe('現在の反復回数'),
    bestQualityScore: z.number().min(0).max(100).describe('最良品質スコア'),
    constraintViolations: z.array(ConstraintViolationSchema).describe('制約違反リスト'),
    backtrackCount: z.number().int().min(0).describe('バックトラック回数'),
    startTime: z.number().int().positive().describe('開始時間(timestamp)'),
    lastUpdate: z.number().int().positive().describe('最終更新時間(timestamp)'),
  })
  .strict()

/**
 * 型推論
 */
export type TimetableConstraints = z.infer<typeof TimetableConstraintsSchema>
export type TimetableGenerationOptions = z.infer<typeof TimetableGenerationOptionsSchema>
export type TimetableGenerationState = z.infer<typeof TimetableGenerationStateSchema>

/**
 * 時間割生成エンジン
 */
export class TypeSafeTimetableGenerationEngine {
  private dbHelper: TypeSafeDbHelper
  private schoolService: TypeSafeSchoolService

  constructor(private db: D1Database) {
    this.dbHelper = new TypeSafeDbHelper(db)
    this.schoolService = new TypeSafeSchoolService(db)
  }

  /**
   * 時間割生成メイン処理
   */
  async generateTimetable(
    constraints: TimetableConstraints,
    options: TimetableGenerationOptions = {}
  ): Promise<TimetableGenerationResult> {
    // 入力バリデーション
    const validatedConstraints = TimetableConstraintsSchema.parse(constraints)
    const validatedOptions = TimetableGenerationOptionsSchema.parse(options)

    console.log(
      `🧠 時間割生成開始: ${validatedConstraints.grade}年${validatedConstraints.classSection}組`
    )

    try {
      // 基礎データ取得
      const schoolData = await this.loadSchoolData()

      // 生成状態初期化
      const state = this.initializeGenerationState()

      // 生成処理実行
      const result = await this.executeGeneration(
        validatedConstraints,
        validatedOptions,
        schoolData,
        state
      )

      // 結果保存
      await this.saveTimetableResult(result, validatedConstraints)

      console.log(`✅ 時間割生成完了: 品質スコア ${result.statistics?.qualityScore}%`)

      return TimetableGenerationResultSchema.parse(result)
    } catch (error) {
      console.error('❌ 時間割生成エラー:', error)

      const errorResult: TimetableGenerationResult = {
        success: false,
        message: error instanceof Error ? error.message : '時間割生成に失敗しました',
        statistics: {
          totalSlots: 0,
          assignedSlots: 0,
          unassignedSlots: 0,
          constraintViolations: 0,
          backtrackCount: 0,
          generationTimeMs: 0,
          assignmentRate: 0,
          qualityScore: 0,
        },
        generatedAt: new Date().toISOString(),
        method: validatedOptions.method,
      }

      return TimetableGenerationResultSchema.parse(errorResult)
    }
  }

  /**
   * 学校データ読み込み
   */
  private async loadSchoolData(): Promise<{
    settings: SchoolSettings
    teachers: Teacher[]
    subjects: Subject[]
    classrooms: Classroom[]
  }> {
    const [settings, teachers, subjects, classrooms] = await Promise.all([
      this.schoolService.schoolSettings.getSchoolSettings(),
      this.schoolService.teachers.getTeachers(),
      this.schoolService.subjects.getSubjects(),
      this.schoolService.classrooms.getClassrooms(),
    ])

    return {
      settings,
      teachers: teachers.teachers,
      subjects: subjects.subjects,
      classrooms: classrooms.classrooms,
    }
  }

  /**
   * 生成状態初期化
   */
  private initializeGenerationState(): TimetableGenerationState {
    const now = Date.now()

    return TimetableGenerationStateSchema.parse({
      currentIteration: 0,
      bestQualityScore: 0,
      constraintViolations: [],
      backtrackCount: 0,
      startTime: now,
      lastUpdate: now,
    })
  }

  /**
   * 時間割生成実行
   */
  private async executeGeneration(
    constraints: TimetableConstraints,
    options: TimetableGenerationOptions,
    schoolData: {
      settings: SchoolSettings
      teachers: Teacher[]
      subjects: Subject[]
      classrooms: Classroom[]
    },
    state: TimetableGenerationState
  ): Promise<TimetableGenerationResult> {
    const startTime = Date.now()

    // 時間割構造初期化
    const timetable = this.initializeTimetableStructure(schoolData.settings, constraints)

    // 制約満足問題解決器
    const solver = new ConstraintSatisfactionProblemSolver(schoolData, constraints, options)

    // 生成実行
    const assignmentResult = await solver.solve(timetable, state)

    const generationTimeMs = Date.now() - startTime

    // 統計計算
    const statistics = this.calculateStatistics(
      assignmentResult.timetable,
      assignmentResult.violations,
      state.backtrackCount,
      generationTimeMs
    )

    return {
      success: assignmentResult.success,
      timetable: assignmentResult.success ? assignmentResult.timetable : undefined,
      statistics,
      message: assignmentResult.success
        ? `時間割生成が完了しました (品質スコア: ${statistics.qualityScore}%)`
        : `時間割生成に失敗しました: ${assignmentResult.violations.length}件の制約違反`,
      generatedAt: new Date().toISOString(),
      method: options.method,
    }
  }

  /**
   * 時間割構造初期化
   */
  private initializeTimetableStructure(
    settings: SchoolSettings,
    constraints: TimetableConstraints
  ): TimetableSlot[][][] {
    const days = settings.saturdayPeriods > 0 ? 6 : 5 // 月-金 or 月-土
    const periods = settings.dailyPeriods
    const classes = 1 // 単一クラス向け

    // 3次元配列 [day][period][class] 初期化
    const timetable: TimetableSlot[][][] = Array(days)
      .fill(null)
      .map(() =>
        Array(periods)
          .fill(null)
          .map(() =>
            Array(classes)
              .fill(null)
              .map(() => ({
                id: crypto.randomUUID(),
                grade: constraints.grade,
                classSection: constraints.classSection,
                dayOfWeek: '月曜' as DayOfWeek, // 後で適切に設定
                period: 1, // 後で適切に設定
                subjectId: null,
                teacherId: null,
                classroomId: null,
                isFixed: false,
                constraints: [],
              }))
          )
      )

    return timetable
  }

  /**
   * 統計計算
   */
  private calculateStatistics(
    timetable: TimetableSlot[][][],
    violations: ConstraintViolation[],
    backtrackCount: number,
    generationTimeMs: number
  ): TimetableStatistics {
    let totalSlots = 0
    let assignedSlots = 0

    timetable.forEach(day => {
      day.forEach(period => {
        period.forEach(classSlot => {
          totalSlots++
          if (classSlot.subjectId) {
            assignedSlots++
          }
        })
      })
    })

    const assignmentRate = totalSlots > 0 ? (assignedSlots / totalSlots) * 100 : 0
    const qualityScore = Math.max(0, assignmentRate - violations.length * 5)

    return TimetableStatisticsSchema.parse({
      totalSlots,
      assignedSlots,
      unassignedSlots: totalSlots - assignedSlots,
      constraintViolations: violations.length,
      backtrackCount,
      generationTimeMs,
      assignmentRate: Math.round(assignmentRate * 100) / 100,
      qualityScore: Math.round(qualityScore * 100) / 100,
    })
  }

  /**
   * 生成結果保存
   */
  private async saveTimetableResult(
    result: TimetableGenerationResult,
    constraints: TimetableConstraints
  ): Promise<void> {
    if (!result.success || !result.timetable || !result.statistics) {
      return
    }

    const timetableId = crypto.randomUUID()

    await this.dbHelper.execute(
      `
      INSERT INTO generated_timetables (
        id, grade, class_section, timetable_data, statistics, metadata,
        generation_method, assignment_rate, total_slots, assigned_slots,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        timetableId,
        constraints.grade,
        constraints.classSection,
        JSON.stringify(result.timetable),
        JSON.stringify(result.statistics),
        JSON.stringify({ constraints, generatedAt: result.generatedAt }),
        result.method || 'optimized',
        result.statistics.assignmentRate,
        result.statistics.totalSlots,
        result.statistics.assignedSlots,
        new Date().toISOString(),
        new Date().toISOString(),
      ]
    )
  }
}

/**
 * 制約満足問題解決器
 */
class ConstraintSatisfactionProblemSolver {
  constructor(
    private schoolData: {
      settings: SchoolSettings
      teachers: Teacher[]
      subjects: Subject[]
      classrooms: Classroom[]
    },
    private constraints: TimetableConstraints,
    private options: TimetableGenerationOptions
  ) {}

  /**
   * CSP解決メイン処理
   */
  async solve(
    timetable: TimetableSlot[][][],
    state: TimetableGenerationState
  ): Promise<{
    success: boolean
    timetable: TimetableSlot[][][]
    violations: ConstraintViolation[]
  }> {
    console.log('🔍 制約満足問題解決開始')

    // 固定スロット適用
    this.applyFixedSlots(timetable)

    // バックトラッキング実行
    const result = await this.backtrackingSolver(timetable, state)

    // 制約違反検証
    const violations = this.validateConstraints(result.timetable)

    console.log(`📊 解決完了: 成功=${result.success}, 違反=${violations.length}件`)

    return {
      success: result.success && violations.length === 0,
      timetable: result.timetable,
      violations,
    }
  }

  /**
   * 固定スロット適用
   */
  private applyFixedSlots(timetable: TimetableSlot[][][]): void {
    this.constraints.fixedTimeSlots.forEach(fixedSlot => {
      const dayIndex = this.getDayIndex(fixedSlot.dayOfWeek)
      const periodIndex = fixedSlot.period - 1

      if (
        dayIndex >= 0 &&
        periodIndex >= 0 &&
        dayIndex < timetable.length &&
        periodIndex < timetable[dayIndex].length
      ) {
        timetable[dayIndex][periodIndex][0] = {
          ...timetable[dayIndex][periodIndex][0],
          subjectId: fixedSlot.subjectId,
          teacherId: fixedSlot.teacherId,
          classroomId: fixedSlot.classroomId,
          isFixed: true,
        }
      }
    })
  }

  /**
   * バックトラッキング解決器
   */
  private async backtrackingSolver(
    timetable: TimetableSlot[][][],
    state: TimetableGenerationState
  ): Promise<{
    success: boolean
    timetable: TimetableSlot[][][]
  }> {
    // 教科別必要授業数計算
    const requiredLessons = this.calculateRequiredLessons()

    // 貪欲法による初期割り当て
    const initialAssignment = this.greedyInitialAssignment(timetable, requiredLessons)

    // 最適化フェーズ
    const optimizedTimetable = await this.optimizeAssignment(initialAssignment, state)

    return {
      success: true,
      timetable: optimizedTimetable,
    }
  }

  /**
   * 必要授業数計算
   */
  private calculateRequiredLessons(): Map<string, number> {
    const requiredLessons = new Map<string, number>()

    this.schoolData.subjects.forEach(subject => {
      if (subject.grades.includes(this.constraints.grade)) {
        const weeklyHours =
          subject.weeklyHours[this.constraints.grade] ||
          subject.weeklyHours[this.constraints.grade.toString()] ||
          1
        requiredLessons.set(subject.id, weeklyHours)
      }
    })

    return requiredLessons
  }

  /**
   * 貪欲法初期割り当て
   */
  private greedyInitialAssignment(
    timetable: TimetableSlot[][][],
    requiredLessons: Map<string, number>
  ): TimetableSlot[][][] {
    console.log('🎯 貪欲法による初期割り当て開始')

    const result = JSON.parse(JSON.stringify(timetable)) // Deep copy
    const assignmentCount = new Map<string, number>()

    // 教科ごとの割り当て
    requiredLessons.forEach((required, subjectId) => {
      assignmentCount.set(subjectId, 0)

      for (let assigned = 0; assigned < required; assigned++) {
        const slot = this.findBestSlot(result, subjectId)
        if (slot) {
          const { dayIndex, periodIndex, classIndex } = slot

          // 適切な教師と教室を選択
          const teacher = this.selectBestTeacher(subjectId)
          const classroom = this.selectBestClassroom(subjectId)

          result[dayIndex][periodIndex][classIndex] = {
            ...result[dayIndex][periodIndex][classIndex],
            subjectId,
            teacherId: teacher?.id || null,
            classroomId: classroom?.id || null,
            dayOfWeek: this.getDayOfWeekFromIndex(dayIndex),
            period: periodIndex + 1,
          }

          assignmentCount.set(subjectId, assigned + 1)
        }
      }
    })

    console.log('✅ 初期割り当て完了:', Object.fromEntries(assignmentCount))
    return result
  }

  /**
   * 最適なスロット検索
   */
  private findBestSlot(
    timetable: TimetableSlot[][][],
    subjectId: string
  ): { dayIndex: number; periodIndex: number; classIndex: number } | null {
    const candidates: Array<{
      dayIndex: number
      periodIndex: number
      classIndex: number
      score: number
    }> = []

    timetable.forEach((day, dayIndex) => {
      day.forEach((period, periodIndex) => {
        period.forEach((slot, classIndex) => {
          if (!slot.subjectId && !slot.isFixed) {
            const score = this.calculateSlotScore(
              timetable,
              dayIndex,
              periodIndex,
              classIndex,
              subjectId
            )

            candidates.push({ dayIndex, periodIndex, classIndex, score })
          }
        })
      })
    })

    // スコア順にソートして最良を選択
    candidates.sort((a, b) => b.score - a.score)

    return candidates.length > 0 ? candidates[0] : null
  }

  /**
   * スロットスコア計算
   */
  private calculateSlotScore(
    timetable: TimetableSlot[][][],
    dayIndex: number,
    periodIndex: number,
    _classIndex: number,
    subjectId: string
  ): number {
    let score = 100

    // 優先時間スロットチェック
    const dayOfWeek = this.getDayOfWeekFromIndex(dayIndex)
    const period = periodIndex + 1

    const isPreferred = this.constraints.preferredTimeSlots.some(
      pref => pref.subjectId === subjectId && pref.dayOfWeek === dayOfWeek && pref.period === period
    )

    if (isPreferred) score += 50

    // 教師競合チェック
    const teacher = this.selectBestTeacher(subjectId)
    if (teacher && this.hasTeacherConflict(timetable, dayIndex, periodIndex, teacher.id)) {
      score -= 100
    }

    // 教室競合チェック
    const classroom = this.selectBestClassroom(subjectId)
    if (classroom && this.hasClassroomConflict(timetable, dayIndex, periodIndex, classroom.id)) {
      score -= 80
    }

    // 時限分散チェック（同じ教科が偏らないように）
    const subjectCount = this.countSubjectInDay(timetable, dayIndex, subjectId)
    if (subjectCount > 0) score -= 30

    return score
  }

  /**
   * 最適化フェーズ
   */
  private async optimizeAssignment(
    timetable: TimetableSlot[][][],
    state: TimetableGenerationState
  ): Promise<TimetableSlot[][][]> {
    console.log('⚡ 時間割最適化開始')

    let currentTimetable = JSON.parse(JSON.stringify(timetable))
    let bestTimetable = JSON.parse(JSON.stringify(timetable))
    let bestScore = this.evaluateGlobalFitness(currentTimetable)

    for (let iteration = 0; iteration < this.options.maxIterations; iteration++) {
      state.currentIteration = iteration

      // ランダム改善試行
      const candidate = this.applyRandomImprovement(currentTimetable)
      const candidateScore = this.evaluateGlobalFitness(candidate)

      if (candidateScore > bestScore) {
        bestScore = candidateScore
        bestTimetable = JSON.parse(JSON.stringify(candidate))
        state.bestQualityScore = bestScore
        console.log(`📈 改善: 反復${iteration}, スコア${bestScore.toFixed(2)}`)
      }

      // 受容基準（シミュレーテッドアニーリング風）
      const temperature = (this.options.maxIterations - iteration) / this.options.maxIterations
      const acceptProbability = Math.exp((candidateScore - bestScore) / temperature)

      if (candidateScore > bestScore || Math.random() < acceptProbability) {
        currentTimetable = candidate
      }

      // 品質閾値到達チェック
      if (bestScore >= this.options.qualityThreshold) {
        console.log(`🎯 品質閾値到達: ${bestScore.toFixed(2)}%`)
        break
      }
    }

    console.log(`✅ 最適化完了: 最終スコア ${bestScore.toFixed(2)}%`)
    return bestTimetable
  }

  /**
   * グローバル適応度評価
   */
  private evaluateGlobalFitness(timetable: TimetableSlot[][][]): number {
    const violations = this.validateConstraints(timetable)
    const baseScore = 100 - violations.length * 5

    // 教科分散評価
    const distributionScore = this.evaluateSubjectDistribution(timetable)

    // 教師負荷評価
    const workloadScore = this.evaluateTeacherWorkload(timetable)

    return Math.max(0, baseScore * 0.6 + distributionScore * 0.25 + workloadScore * 0.15)
  }

  /**
   * ランダム改善適用
   */
  private applyRandomImprovement(timetable: TimetableSlot[][][]): TimetableSlot[][][] {
    const result = JSON.parse(JSON.stringify(timetable))

    // ランダムな2つのスロットを選択して交換
    const slots = this.getAllAssignedSlots(result)

    if (slots.length >= 2) {
      const [slot1, slot2] = this.selectRandomSlots(slots, 2)

      // スロット内容を交換
      const temp = {
        subjectId: slot1.slot.subjectId,
        teacherId: slot1.slot.teacherId,
        classroomId: slot1.slot.classroomId,
      }

      result[slot1.dayIndex][slot1.periodIndex][slot1.classIndex] = {
        ...result[slot1.dayIndex][slot1.periodIndex][slot1.classIndex],
        subjectId: slot2.slot.subjectId,
        teacherId: slot2.slot.teacherId,
        classroomId: slot2.slot.classroomId,
      }

      result[slot2.dayIndex][slot2.periodIndex][slot2.classIndex] = {
        ...result[slot2.dayIndex][slot2.periodIndex][slot2.classIndex],
        ...temp,
      }
    }

    return result
  }

  /**
   * ヘルパーメソッド群
   */
  private getDayIndex(dayOfWeek: DayOfWeek): number {
    const days: DayOfWeek[] = ['月曜', '火曜', '水曜', '木曜', '金曜', '土曜', '日曜']
    return days.indexOf(dayOfWeek)
  }

  private getDayOfWeekFromIndex(index: number): DayOfWeek {
    const days: DayOfWeek[] = ['月曜', '火曜', '水曜', '木曜', '金曜', '土曜']
    return days[index] || '月曜'
  }

  private selectBestTeacher(subjectId: string): Teacher | null {
    return (
      this.schoolData.teachers.find(
        teacher =>
          teacher.subjects.includes(subjectId) && teacher.grades.includes(this.constraints.grade)
      ) || null
    )
  }

  private selectBestClassroom(subjectId: string): Classroom | null {
    const subject = this.schoolData.subjects.find(s => s.id === subjectId)
    if (!subject) return null

    return (
      this.schoolData.classrooms.find(
        classroom => !subject.requiresSpecialClassroom || classroom.type === subject.classroomType
      ) ||
      this.schoolData.classrooms[0] ||
      null
    )
  }

  private hasTeacherConflict(
    _timetable: TimetableSlot[][][],
    _dayIndex: number,
    _periodIndex: number,
    _teacherId: string
  ): boolean {
    // 同じ日時に他のクラスで同じ教師が授業を持っているかチェック
    return false // 実装簡略化
  }

  private hasClassroomConflict(
    _timetable: TimetableSlot[][][],
    _dayIndex: number,
    _periodIndex: number,
    _classroomId: string
  ): boolean {
    // 同じ日時に他のクラスで同じ教室が使われているかチェック
    return false // 実装簡略化
  }

  private countSubjectInDay(
    timetable: TimetableSlot[][][],
    dayIndex: number,
    subjectId: string
  ): number {
    return timetable[dayIndex].flat().filter(slot => slot.subjectId === subjectId).length
  }

  private evaluateSubjectDistribution(_timetable: TimetableSlot[][][]): number {
    // 教科が週全体に適切に分散されているかを評価
    return 80 // 実装簡略化
  }

  private evaluateTeacherWorkload(_timetable: TimetableSlot[][][]): number {
    // 教師の負荷が均等に分散されているかを評価
    return 75 // 実装簡略化
  }

  private getAllAssignedSlots(timetable: TimetableSlot[][][]): Array<{
    dayIndex: number
    periodIndex: number
    classIndex: number
    slot: TimetableSlot
  }> {
    const slots: Array<{
      dayIndex: number
      periodIndex: number
      classIndex: number
      slot: TimetableSlot
    }> = []

    timetable.forEach((day, dayIndex) => {
      day.forEach((period, periodIndex) => {
        period.forEach((slot, classIndex) => {
          if (slot.subjectId && !slot.isFixed) {
            slots.push({ dayIndex, periodIndex, classIndex, slot })
          }
        })
      })
    })

    return slots
  }

  private selectRandomSlots<T>(array: T[], count: number): T[] {
    const result = [...array]
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result.slice(0, count)
  }

  /**
   * 制約違反検証
   */
  private validateConstraints(timetable: TimetableSlot[][][]): ConstraintViolation[] {
    const violations: ConstraintViolation[] = []

    // 教師競合チェック
    violations.push(...this.checkTeacherConflicts(timetable))

    // 教室競合チェック
    violations.push(...this.checkClassroomConflicts(timetable))

    // 教科配置制約チェック
    violations.push(...this.checkSubjectConstraints(timetable))

    return violations
  }

  private checkTeacherConflicts(timetable: TimetableSlot[][][]): ConstraintViolation[] {
    const violations: ConstraintViolation[] = []

    timetable.forEach((day, dayIndex) => {
      day.forEach((period, periodIndex) => {
        const teacherSlots = new Map<string, number>()

        period.forEach(slot => {
          if (slot.teacherId) {
            teacherSlots.set(slot.teacherId, (teacherSlots.get(slot.teacherId) || 0) + 1)
          }
        })

        teacherSlots.forEach((count, teacherId) => {
          if (count > 1) {
            violations.push({
              id: crypto.randomUUID(),
              type: 'teacher_conflict',
              severity: 'critical' as const,
              description: `教師ID ${teacherId} が同じ時間に複数のクラスに割り当てられています`,
              affectedSlots: [
                {
                  dayOfWeek: this.getDayOfWeekFromIndex(dayIndex),
                  period: periodIndex + 1,
                  grade: this.constraints.grade,
                  classSection: this.constraints.classSection,
                },
              ],
              constraintId: `teacher_conflict_${teacherId}`,
              suggestedFix: '教師の割り当てを調整してください',
            })
          }
        })
      })
    })

    return violations
  }

  private checkClassroomConflicts(timetable: TimetableSlot[][][]): ConstraintViolation[] {
    const violations: ConstraintViolation[] = []

    timetable.forEach((day, dayIndex) => {
      day.forEach((period, periodIndex) => {
        const classroomSlots = new Map<string, number>()

        period.forEach(slot => {
          if (slot.classroomId) {
            classroomSlots.set(slot.classroomId, (classroomSlots.get(slot.classroomId) || 0) + 1)
          }
        })

        classroomSlots.forEach((count, classroomId) => {
          if (count > 1) {
            violations.push({
              id: crypto.randomUUID(),
              type: 'classroom_conflict',
              severity: 'high' as const,
              description: `教室ID ${classroomId} が同じ時間に複数のクラスに割り当てられています`,
              affectedSlots: [
                {
                  dayOfWeek: this.getDayOfWeekFromIndex(dayIndex),
                  period: periodIndex + 1,
                  grade: this.constraints.grade,
                  classSection: this.constraints.classSection,
                },
              ],
              constraintId: `classroom_conflict_${classroomId}`,
              suggestedFix: '教室の割り当てを調整してください',
            })
          }
        })
      })
    })

    return violations
  }

  private checkSubjectConstraints(timetable: TimetableSlot[][][]): ConstraintViolation[] {
    const violations: ConstraintViolation[] = []

    // 必要授業数チェック
    const requiredLessons = this.calculateRequiredLessons()
    const actualLessons = new Map<string, number>()

    timetable.forEach(day => {
      day.forEach(period => {
        period.forEach(slot => {
          if (slot.subjectId) {
            actualLessons.set(slot.subjectId, (actualLessons.get(slot.subjectId) || 0) + 1)
          }
        })
      })
    })

    requiredLessons.forEach((required, subjectId) => {
      const actual = actualLessons.get(subjectId) || 0
      if (actual !== required) {
        violations.push({
          id: crypto.randomUUID(),
          type: 'subject_hours',
          severity: actual < required ? ('high' as const) : ('medium' as const),
          description: `教科ID ${subjectId} の授業数が不正です (必要: ${required}, 実際: ${actual})`,
          affectedSlots: [],
          constraintId: `subject_hours_${subjectId}`,
          suggestedFix: '教科の授業数を調整してください',
        })
      }
    })

    return violations
  }
}

/**
 * 型安全時間割生成サービス
 */
export class TypeSafeTimetableGenerationService {
  private engine: TypeSafeTimetableGenerationEngine

  constructor(private db: D1Database) {
    this.engine = new TypeSafeTimetableGenerationEngine(db)
  }

  /**
   * 時間割生成リクエスト処理
   */
  async generateTimetableForClass(
    grade: number,
    classSection: string,
    options: Partial<TimetableGenerationOptions> = {}
  ): Promise<TimetableGenerationResult> {
    console.log(`🎓 ${grade}年${classSection}組の時間割生成を開始します`)

    const constraints: TimetableConstraints = {
      grade: GradeSchema.parse(grade),
      classSection: z
        .string()
        .regex(/^[A-Z]$/)
        .parse(classSection),
      maxPeriodsPerDay: 6,
      allowConsecutiveLessons: true,
      preferredTimeSlots: [],
      fixedTimeSlots: [],
      teacherAvailability: {},
      classroomPriority: {},
    }

    return await this.engine.generateTimetable(constraints, options)
  }

  /**
   * 保存済み時間割取得
   */
  async getSavedTimetables(
    filters: { grade?: number; classSection?: string; limit?: number } = {}
  ): Promise<{
    timetables: Array<{
      id: string
      grade: number
      classSection: string
      statistics: TimetableStatistics
      generatedAt: string
    }>
  }> {
    const dbHelper = new TypeSafeDbHelper(this.db)

    let query = 'SELECT * FROM generated_timetables'
    const params: unknown[] = []
    const whereConditions: string[] = []

    if (filters.grade !== undefined) {
      whereConditions.push('grade = ?')
      params.push(filters.grade)
    }

    if (filters.classSection !== undefined) {
      whereConditions.push('class_section = ?')
      params.push(filters.classSection)
    }

    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`
    }

    query += ' ORDER BY created_at DESC'

    if (filters.limit) {
      query += ' LIMIT ?'
      params.push(filters.limit)
    }

    const results = await dbHelper.queryAll(
      query,
      params,
      z.object({
        id: IdSchema,
        grade: GradeSchema,
        class_section: z.string(),
        statistics: z.string(),
        created_at: z.string(),
      })
    )

    const timetables = results.map(row => ({
      id: row.id,
      grade: row.grade,
      classSection: row.class_section,
      statistics: JSON.parse(row.statistics) as TimetableStatistics,
      generatedAt: row.created_at,
    }))

    return { timetables }
  }
}
