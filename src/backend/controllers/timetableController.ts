import type { Context } from 'hono'
import type { Env } from '../../shared/types'
import { DataTransformService } from '../services/DataTransformService'
import { TimetableOrchestrator } from '../services/TimetableOrchestrator'
import { TimetablePersistenceService } from '../services/TimetablePersistenceService'
import { TimetableTestingService } from '../services/TimetableTestingService'
import { TimetableService } from '../services/timetableService'

export class TimetableController {
  private getTimetableService(c: Context<{ Bindings: Env }>): TimetableService {
    return new TimetableService(c.env.DB)
  }

  private getDataTransformService(c: Context<{ Bindings: Env }>): DataTransformService {
    return new DataTransformService(c.env.DB)
  }

  private getTimetableOrchestrator(c: Context<{ Bindings: Env }>): TimetableOrchestrator {
    return new TimetableOrchestrator(c.env.DB)
  }

  private getTimetablePersistenceService(
    c: Context<{ Bindings: Env }>
  ): TimetablePersistenceService {
    return new TimetablePersistenceService(c.env.DB)
  }

  private getTimetableTestingService(c: Context<{ Bindings: Env }>): TimetableTestingService {
    return new TimetableTestingService(c.env.DB)
  }

  // 時間割CRUD操作
  async getAllTimetables(c: Context<{ Bindings: Env }>) {
    try {
      const timetableService = this.getTimetableService(c)
      const timetables = await timetableService.getAllTimetables()

      return c.json({
        success: true,
        data: timetables,
      })
    } catch (error) {
      console.error('❌ 時間割一覧取得エラー:', error)
      return c.json(
        {
          success: false,
          message: '時間割一覧の取得に失敗しました',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }

  async getTimetableById(c: Context<{ Bindings: Env }>) {
    try {
      const timetableId = c.req.param('id')
      const timetableService = this.getTimetableService(c)

      const timetable = await timetableService.getTimetableById(timetableId)

      if (!timetable) {
        return c.json(
          {
            success: false,
            message: '時間割が見つかりません',
          },
          404
        )
      }

      return c.json({
        success: true,
        data: timetable,
      })
    } catch (error) {
      console.error('❌ 時間割取得エラー:', error)
      return c.json(
        {
          success: false,
          message: '時間割の取得に失敗しました',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }

  async createTimetable(c: Context<{ Bindings: Env }>) {
    try {
      const timetableData = await c.req.json()
      const timetableService = this.getTimetableService(c)

      const newTimetable = await timetableService.createTimetable(timetableData)

      return c.json({
        success: true,
        data: newTimetable,
        message: '時間割を作成しました',
      })
    } catch (error) {
      console.error('❌ 時間割作成エラー:', error)
      return c.json(
        {
          success: false,
          message: '時間割の作成に失敗しました',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }

  async updateTimetable(c: Context<{ Bindings: Env }>) {
    try {
      const timetableId = c.req.param('id')
      const updates = await c.req.json()
      const timetableService = this.getTimetableService(c)

      const updatedTimetable = await timetableService.updateTimetable(timetableId, updates)

      return c.json({
        success: true,
        data: updatedTimetable,
        message: '時間割を更新しました',
      })
    } catch (error) {
      console.error('❌ 時間割更新エラー:', error)
      return c.json(
        {
          success: false,
          message: error instanceof Error ? error.message : '時間割の更新に失敗しました',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        error instanceof Error && error.message === 'Timetable not found' ? 404 : 500
      )
    }
  }

  async deleteTimetable(c: Context<{ Bindings: Env }>) {
    try {
      const timetableId = c.req.param('id')
      const timetableService = this.getTimetableService(c)

      await timetableService.deleteTimetable(timetableId)

      return c.json({
        success: true,
        message: '時間割を削除しました',
      })
    } catch (error) {
      console.error('❌ 時間割削除エラー:', error)
      return c.json(
        {
          success: false,
          message: error instanceof Error ? error.message : '時間割の削除に失敗しました',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        error instanceof Error && error.message === 'Timetable not found' ? 404 : 500
      )
    }
  }

  async saveTimetable(c: Context<{ Bindings: Env }>) {
    try {
      const timetableData = await c.req.json()
      const timetableService = this.getTimetableService(c)

      const result = await timetableService.saveTimetable(timetableData)

      return c.json({
        success: true,
        data: result,
        message: '時間割を保存しました',
      })
    } catch (error) {
      console.error('❌ 時間割保存エラー:', error)
      return c.json(
        {
          success: false,
          message: '時間割の保存に失敗しました',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }

  // プログラム型時間割生成
  async generateProgramTimetable(c: Context<{ Bindings: Env }>) {
    try {
      const body = await c.req.json().catch(() => ({}))
      const orchestrator = this.getTimetableOrchestrator(c)

      const result = await orchestrator.generateTimetable({
        useOptimization: body.useOptimization || false,
        useNewAlgorithm: body.useNewAlgorithm || false,
        tolerantMode: true, // デフォルトで寛容モード
      })

      return c.json({
        success: result.success,
        message: result.message,
        data: {
          timetable: result.timetable,
          statistics: result.statistics,
          generatedAt: new Date().toISOString(),
          method: 'program',
          savedTimetableId: result.savedTimetableId,
        },
      })
    } catch (error) {
      console.error('❌ プログラム型時間割生成エラー:', error)
      return c.json(
        {
          success: false,
          message: '時間割生成中にエラーが発生しました',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }

  async getProgramGenerationConfig(c: Context<{ Bindings: Env }>) {
    try {
      const dataTransform = this.getDataTransformService(c)
      const config = await dataTransform.getGenerationConfig()

      return c.json({
        success: true,
        data: config,
      })
    } catch (error) {
      console.error('❌ 設定取得エラー:', error)
      return c.json(
        {
          success: false,
          message: '設定の取得に失敗しました',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }

  async validateProgramTimetable(c: Context<{ Bindings: Env }>) {
    try {
      const body = await c.req.json()
      const { timetableData } = body

      if (!timetableData) {
        return c.json(
          {
            success: false,
            message: '時間割データが必要です',
          },
          400
        )
      }

      const orchestrator = this.getTimetableOrchestrator(c)
      const validation = await orchestrator.validateTimetable(timetableData)

      return c.json({
        success: true,
        data: {
          isValid: validation.isValid,
          violations: validation.violations,
          checkedConstraints: ['teacher_conflict'],
        },
      })
    } catch (error) {
      console.error('❌ 制約チェックエラー:', error)
      return c.json(
        {
          success: false,
          message: '制約チェック中にエラーが発生しました',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }

  async saveProgramTimetable(c: Context<{ Bindings: Env }>) {
    try {
      const body = await c.req.json()
      const { timetable, statistics, metadata } = body

      if (!timetable || !statistics) {
        return c.json(
          {
            success: false,
            message: '時間割データまたは統計情報が不足しています',
          },
          400
        )
      }

      const persistence = this.getTimetablePersistenceService(c)
      const result = await persistence.saveTimetable({
        name: metadata?.name || `時間割_${new Date().toISOString().split('T')[0]}`,
        timetable,
        statistics: {
          assignmentRate: statistics.assignmentRate,
          bestAssignmentRate: statistics.bestAssignmentRate,
          totalAssignments: statistics.totalAssignments,
          totalSlots: statistics.totalSlots,
          assignedSlots: statistics.assignedSlots,
        },
      })

      return c.json({
        success: true,
        message: '時間割の保存が完了しました',
        data: {
          timetableId: result.timetableId,
          assignmentRate: result.assignmentRate,
          totalSlots: statistics.totalSlots || 0,
          assignedSlots: statistics.assignedSlots || statistics.totalAssignments || 0,
          savedAt: new Date().toISOString(),
        },
      })
    } catch (error) {
      console.error('❌ 時間割保存エラー:', error)
      return c.json(
        {
          success: false,
          message: '時間割の保存に失敗しました',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }

  async getSavedProgramTimetables(c: Context<{ Bindings: Env }>) {
    try {
      const persistence = this.getTimetablePersistenceService(c)
      
      // クエリパラメータからページングパラメータを取得
      const page = parseInt(c.req.query('page') || '1', 10)
      const limit = parseInt(c.req.query('limit') || '20', 10)

      const result = await persistence.getSavedTimetables(page, limit)

      return c.json({
        success: true,
        data: result,
      })
    } catch (error) {
      console.error('❌ 保存済み時間割一覧取得エラー:', error)
      return c.json(
        {
          success: false,
          message: '保存済み時間割の取得に失敗しました',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }

  async getSavedProgramTimetableById(c: Context<{ Bindings: Env }>) {
    try {
      const timetableId = c.req.param('id')
      const persistence = this.getTimetablePersistenceService(c)

      const timetable = await persistence.getSavedTimetableById(timetableId)

      if (!timetable) {
        return c.json(
          {
            success: false,
            message: '指定された時間割が見つかりません',
          },
          404
        )
      }

      return c.json({
        success: true,
        data: timetable,
      })
    } catch (error) {
      console.error('❌ 時間割取得エラー:', error)
      return c.json(
        {
          success: false,
          message: '時間割の取得に失敗しました',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }

  // デバッグ用エンドポイント
  async getProgramDebugData(c: Context<{ Bindings: Env }>) {
    try {
      const testing = this.getTimetableTestingService(c)
      const debugData = await testing.getDebugData()

      return c.json({
        success: true,
        data: debugData,
      })
    } catch (error) {
      console.error('❌ デバッグデータ取得エラー:', error)
      return c.json(
        {
          success: false,
          message: 'デバッグデータ取得に失敗しました',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }

  async testProgramMatching(c: Context<{ Bindings: Env }>) {
    try {
      const testing = this.getTimetableTestingService(c)
      const matchingData = await testing.testMatching()

      return c.json({
        success: true,
        data: matchingData,
      })
    } catch (error) {
      console.error('❌ ID照合テストエラー:', error)
      return c.json(
        {
          success: false,
          message: 'ID照合テスト中にエラーが発生しました',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }

  async runProgramQuickTest(c: Context<{ Bindings: Env }>) {
    try {
      const testing = this.getTimetableTestingService(c)
      const testData = await testing.runQuickTest()

      return c.json({
        success: true,
        message: '軽量テスト完了',
        data: testData,
      })
    } catch (error) {
      console.error('❌ 軽量テスト エラー:', error)
      return c.json(
        {
          success: false,
          message: '軽量テスト中にエラーが発生しました',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }

  // デバッグ用
  async getTimetableDebugInfo(c: Context<{ Bindings: Env }>) {
    try {
      const timetableService = this.getTimetableService(c)
      const debugInfo = await timetableService.getDebugInfo()

      return c.json({
        success: true,
        data: debugInfo,
      })
    } catch (error) {
      console.error('❌ デバッグ情報取得エラー:', error)
      return c.json(
        {
          success: false,
          message: 'デバッグ情報の取得に失敗しました',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }
}
