import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { TestDatabaseService } from '../services/TestDatabaseService'

type Env = {
  DB: D1Database
}

const testDbApp = new Hono<{ Bindings: Env }>()

// テストデータオプションのスキーマ
const testDataOptionsSchema = z.object({
  teacherCount: z.number().min(1).max(20).optional(),
  subjectCount: z.number().min(1).max(15).optional(),
  classroomCount: z.number().min(1).max(30).optional(),
  userCount: z.number().min(1).max(10).optional(),
})

/**
 * 統一テストデータ管理APIの初期化
 * POST /api/test-db/init
 */
testDbApp.post('/init', zValidator('json', testDataOptionsSchema.optional()), async c => {
  try {
    const options = c.req.valid('json') || {}
    const testDbService = new TestDatabaseService(c.env.DB)

    console.log('🧪 統一テストデータ管理システム初期化開始')

    // Step 1: バックアップテーブル初期化
    await testDbService.initializeBackupTables()

    // Step 2: 既存データバックアップ
    const backupData = await testDbService.backupExistingData()

    // Step 3: テスト対象テーブルクリア
    await testDbService.clearTargetTables()

    // Step 4: テストデータ挿入
    await testDbService.insertTestData(options)

    return c.json({
      success: true,
      message: '統一テストデータ管理システムが初期化されました',
      backupInfo: {
        timestamp: backupData.timestamp,
        dataCount: {
          teachers: backupData.teachers.length,
          subjects: backupData.subjects.length,
          classrooms: backupData.classrooms.length,
          users: backupData.users.length,
        },
      },
      testDataCreated: options,
    })
  } catch (error) {
    console.error('❌ 統一テストデータ管理初期化エラー:', error)
    return c.json(
      {
        success: false,
        error: 'テストデータ準備エラー',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})

/**
 * テストデータの復元
 * POST /api/test-db/restore
 */
testDbApp.post('/restore', async c => {
  try {
    const testDbService = new TestDatabaseService(c.env.DB)

    console.log('♻️ バックアップからのデータ復元開始')
    await testDbService.restoreFromBackup()
    await testDbService.cleanupBackupTables()

    return c.json({
      success: true,
      message: 'バックアップからデータを復元しました',
    })
  } catch (error) {
    console.error('❌ データ復元エラー:', error)
    return c.json(
      {
        success: false,
        error: 'データ復元エラー',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})

/**
 * 現在のテストデータ状態を確認
 * GET /api/test-db/status
 */
testDbApp.get('/status', async c => {
  try {
    const testDbService = new TestDatabaseService(c.env.DB)
    const status = await testDbService.getCurrentStatus()

    return c.json({
      success: true,
      status,
    })
  } catch (error) {
    console.error('❌ ステータス確認エラー:', error)
    return c.json(
      {
        success: false,
        error: 'ステータス確認エラー',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})

/**
 * 完全なテスト実行サイクルのデモ
 * POST /api/test-db/cycle-demo
 */
testDbApp.post('/cycle-demo', zValidator('json', testDataOptionsSchema.optional()), async c => {
  try {
    const options = c.req.valid('json') || {}
    const testDbService = new TestDatabaseService(c.env.DB)

    console.log('🔄 完全なテスト実行サイクルデモ開始')

    // テスト関数のデモ（実際の使用では外部テストフレームワークから呼ばれる）
    const demoTestFunction = async () => {
      console.log('📋 デモテスト実行中...')

      // テストデータが正しく挿入されているか確認
      const status = await testDbService.getCurrentStatus()
      console.log('📊 テスト中のデータ状態:', status)

      // デモ用の簡単な検証
      if (status.teachers === 0 && status.subjects === 0) {
        throw new Error('テストデータが正しく準備されていません')
      }

      return {
        testResult: 'success',
        dataVerification: status,
      }
    }

    // 完全サイクル実行
    const result = await testDbService.executeTestCycle(demoTestFunction, options)

    return c.json({
      success: true,
      message: '完全なテスト実行サイクルが成功しました',
      testResult: result,
    })
  } catch (error) {
    console.error('❌ テスト実行サイクルエラー:', error)
    return c.json(
      {
        success: false,
        error: 'テスト実行サイクルエラー',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})

export default testDbApp
