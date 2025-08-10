import type { Classroom, SchoolSettings, Subject, Teacher, TimetableGenerationResult } from '../../shared/types'
import { DataTransformService } from './DataTransformService'
import { TimetableGenerator } from './timetableGenerator'

export interface TimetableGenerationOptions {
  useOptimization?: boolean
  useNewAlgorithm?: boolean
  tolerantMode?: boolean
}

export interface TimetableOrchestratorResult {
  success: boolean
  message?: string
  timetable?: unknown
  statistics?: unknown
  savedTimetableId?: string
}

export class TimetableOrchestrator {
  private dataTransform: DataTransformService

  constructor(private db: D1Database) {
    this.dataTransform = new DataTransformService(db)
  }

  async generateTimetable(
    options: TimetableGenerationOptions = {}
  ): Promise<TimetableGenerationResult> {
    const { useOptimization = false, useNewAlgorithm = false, tolerantMode = true } = options

    console.log(
      '📅 プログラム型時間割生成開始',
      useOptimization ? '(最適化モード)' : '',
      useNewAlgorithm ? '(新アルゴリズム)' : '(従来アルゴリズム)',
      '(制約違反記録モード - デフォルト有効)'
    )

    // データ取得
    const { settings, teachers, subjects, classrooms } = await this.dataTransform.loadSchoolData()

    // データ検証
    if (teachers.length === 0) {
      throw new Error('教師データが登録されていません')
    }

    if (subjects.length === 0) {
      throw new Error('教科データが登録されていません')
    }

    // 教科を最適化モードで処理
    let processedSubjects = subjects
    if (useOptimization) {
      console.log('🚀 最適化モード: 教科の対象学年拡張中...')
      processedSubjects = this.dataTransform.optimizeSubjects(subjects)
    }

    // TimetableGeneratorインスタンス作成
    const generator = new TimetableGenerator(
      settings,
      teachers,
      processedSubjects,
      classrooms,
      false // デバッグモード無効
    )

    // 生成実行
    let result: TimetableGenerationResult | null = null

    if (useOptimization) {
      result = await this.generateWithOptimization(
        generator,
        settings,
        teachers,
        processedSubjects,
        classrooms,
        tolerantMode
      )
    } else if (useNewAlgorithm) {
      console.log('🚀 新アルゴリズムによる時間割生成を実行中...')
      result = await generator.generateTimetable({ tolerantMode, useNewAlgorithm: true })
    } else {
      console.log('📅 標準時間割生成を実行中...')
      result = await generator.generateTimetable({ tolerantMode })
    }

    console.log('📊 TimetableGenerator結果:', result.success)
    if (result.statistics) {
      console.log('📈 生成統計:', result.statistics)
    }

    if (!result.success) {
      throw new Error(result.message || '時間割生成に失敗しました')
    }

    return result
  }

  private async generateWithOptimization(
    generator: TimetableGenerator,
    settings: SchoolSettings,
    teachers: Teacher[],
    subjects: Subject[],
    classrooms: Classroom[],
    tolerantMode: boolean
  ): Promise<TimetableGenerationResult> {
    console.log('🔄 最適化リトライ機能付き時間割生成を実行中...')

    let bestResult: TimetableGenerationResult | null = null
    let bestRate = 0
    const maxRetries = 5

    for (let retry = 0; retry < maxRetries; retry++) {
      console.log(`🎯 試行 ${retry + 1}/${maxRetries}`)

      const attemptResult = await generator.generateTimetable({ tolerantMode })
      if (attemptResult.statistics) {
        const rate =
          (attemptResult.statistics.assignedSlots / attemptResult.statistics.totalSlots) * 100
        console.log(`📊 試行${retry + 1}結果: ${rate.toFixed(1)}%`)

        // 最良結果を更新
        if (rate > bestRate) {
          bestRate = rate
          bestResult = attemptResult
          console.log(`✨ 新しい最良解更新: ${rate.toFixed(1)}%`)
        }

        // 99%以上の場合は完了
        if (rate >= 99.0) {
          console.log(`🎉 完全解発見: ${rate.toFixed(1)}%`)
          return attemptResult
        }
      }

      // 次の試行のために時間割をリセット
      if (retry < maxRetries - 1) {
        const newGenerator = new TimetableGenerator(settings, teachers, subjects, classrooms, false)
        Object.setPrototypeOf(generator, Object.getPrototypeOf(newGenerator))
        Object.assign(generator, newGenerator)
      }
    }

    // 完全解が見つからなかった場合は最良解を使用
    if (bestResult) {
      console.log(`🏆 最良解を採用: ${bestRate.toFixed(1)}%`)
      return {
        ...bestResult,
        message:
          bestRate >= 90
            ? `良好な時間割を生成しました（${bestRate.toFixed(1)}%）`
            : `部分的な時間割を生成しました（${bestRate.toFixed(1)}%）。手動での調整をお勧めします。`,
        statistics: {
          ...bestResult.statistics,
          retryAttempts: maxRetries,
          bestAssignmentRate: bestRate,
        },
      }
    }

    return { success: false, message: '最適化時間割生成に失敗しました' }
  }

  formatStatistics(
    result: TimetableGenerationResult,
    useOptimization: boolean,
    tolerantMode: boolean
  ): unknown {
    const generationStats = {
      generationTime: '0.1秒', // TODO: 実際の生成時間を計算
      totalAssignments: result.statistics?.assignedSlots || 0,
      constraintViolations: result.statistics?.constraintViolations || 0,
      totalSlots: result.statistics?.totalSlots || 0,
      unassignedSlots: result.statistics?.unassignedSlots || 0,
      backtrackCount: result.statistics?.backtrackCount || 0,
      retryAttempts: result.statistics?.retryAttempts || 0,
      bestAssignmentRate: result.statistics?.bestAssignmentRate || 0,
      optimizationMode: useOptimization,
      tolerantMode: tolerantMode,
    }

    // 寛容モードで制約違反がある場合のログ出力
    if (tolerantMode && generationStats.constraintViolations > 0) {
      console.log(`⚠️ 寛容モードで${generationStats.constraintViolations}件の制約違反を記録しました`)
    }

    return generationStats
  }
}
