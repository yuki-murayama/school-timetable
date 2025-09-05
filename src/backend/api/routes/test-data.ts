/**
 * テストデータ管理API
 * 環境統一化のためのバックアップ・リストア機能
 */
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { TestDatabaseService } from '../../services/TestDatabaseService'

// 環境設定の型定義
type Env = {
  DB: D1Database
}

// リクエストスキーマ
const TestDataOptionsSchema = z.object({
  teacherCount: z.number().min(1).max(20).optional().default(3),
  subjectCount: z.number().min(1).max(20).optional().default(5),
  classroomCount: z.number().min(1).max(20).optional().default(6),
  userCount: z.number().min(1).max(10).optional().default(3),
})

const BackupRestoreSchema = z.object({
  operation: z.enum(['backup', 'restore', 'full-cycle']),
  testDataOptions: TestDataOptionsSchema.optional(),
})

// レスポンススキーマ
const SuccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.record(z.any()).optional(),
  timestamp: z.string(),
})

// アプリケーション作成
export const testDataApp = new OpenAPIHono<{ Bindings: Env }>()

// OpenAPIルート定義

// テストデータ準備エンドポイント
const prepareTestDataRoute = createRoute({
  method: 'post',
  path: '/prepare',
  summary: '統一テストデータ準備',
  description: '環境に関係なく一貫したテストデータを準備します',
  tags: ['Test Data Management'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: TestDataOptionsSchema,
        },
      },
      required: false,
    },
  },
  responses: {
    200: {
      description: 'テストデータ準備完了',
      content: {
        'application/json': {
          schema: SuccessResponseSchema,
        },
      },
    },
    500: {
      description: 'サーバーエラー',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            error: z.string(),
            message: z.string(),
          }),
        },
      },
    },
  },
})

// バックアップ・リストア操作エンドポイント
const backupRestoreRoute = createRoute({
  method: 'post',
  path: '/backup-restore',
  summary: 'データバックアップ・リストア操作',
  description: 'データベースのバックアップ、リストア、完全テストサイクル実行',
  tags: ['Test Data Management'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: BackupRestoreSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'バックアップ・リストア操作完了',
      content: {
        'application/json': {
          schema: SuccessResponseSchema,
        },
      },
    },
    400: {
      description: 'リクエスト不正',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            error: z.string(),
            message: z.string(),
          }),
        },
      },
    },
  },
})

// テスト環境状態確認エンドポイント
const testStatusRoute = createRoute({
  method: 'get',
  path: '/status',
  summary: 'テスト環境状態確認',
  description: 'テスト用データベースの現在状態を確認',
  tags: ['Test Data Management'],
  responses: {
    200: {
      description: 'テスト環境状態',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.object({
              teachers: z.number(),
              subjects: z.number(),
              classrooms: z.number(),
              users: z.number(),
              hasBackupTables: z.boolean(),
              environment: z.string(),
            }),
            timestamp: z.string(),
          }),
        },
      },
    },
  },
})

// ハンドラー実装

// テストデータ準備ハンドラー
testDataApp.openapi(prepareTestDataRoute, async c => {
  try {
    const db = c.env.DB
    const testDbService = new TestDatabaseService(db)

    const options = await c.req.json().catch(() => ({}))
    const validatedOptions = TestDataOptionsSchema.parse(options)

    console.log('🧪 統一テストデータ準備開始:', validatedOptions)

    // バックアップテーブル初期化
    await testDbService.initializeBackupTables()

    // 既存データバックアップ
    const backupData = await testDbService.backupExistingData()

    // テスト用データクリア・挿入
    await testDbService.clearTargetTables()
    await testDbService.insertTestData(validatedOptions)

    return c.json({
      success: true,
      message: '統一テストデータ準備完了',
      data: {
        backup: {
          teachers: backupData.teachers.length,
          subjects: backupData.subjects.length,
          classrooms: backupData.classrooms.length,
          users: backupData.users.length,
        },
        testData: validatedOptions,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('テストデータ準備エラー:', error)
    return c.json(
      {
        success: false,
        error: 'TEST_DATA_PREPARATION_ERROR',
        message: `テストデータ準備に失敗しました: ${error.message}`,
      },
      500
    )
  }
})

// バックアップ・リストアハンドラー
testDataApp.openapi(backupRestoreRoute, async c => {
  try {
    const db = c.env.DB
    const testDbService = new TestDatabaseService(db)

    const body = await c.req.json()
    const { operation, testDataOptions } = BackupRestoreSchema.parse(body)

    console.log('🔄 バックアップ・リストア操作開始:', { operation, testDataOptions })

    let result: Record<string, unknown> = {}

    switch (operation) {
      case 'backup': {
        await testDbService.initializeBackupTables()
        const backupData = await testDbService.backupExistingData()
        result = {
          operation: 'backup',
          backedUp: {
            teachers: backupData.teachers.length,
            subjects: backupData.subjects.length,
            classrooms: backupData.classrooms.length,
            users: backupData.users.length,
          },
        }
        break
      }

      case 'restore':
        await testDbService.restoreFromBackup()
        await testDbService.cleanupBackupTables()
        result = { operation: 'restore' }
        break

      case 'full-cycle':
        result = await testDbService.executeTestCycle(async () => {
          return { operation: 'full-cycle', cycleCompleted: true }
        }, testDataOptions)
        break

      default:
        return c.json(
          {
            success: false,
            error: 'INVALID_OPERATION',
            message: '無効な操作が指定されました',
          },
          400
        )
    }

    return c.json({
      success: true,
      message: `${operation}操作完了`,
      data: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('バックアップ・リストア操作エラー:', error)
    return c.json(
      {
        success: false,
        error: 'BACKUP_RESTORE_ERROR',
        message: `バックアップ・リストア操作に失敗しました: ${error.message}`,
      },
      500
    )
  }
})

// テスト環境状態確認ハンドラー
testDataApp.openapi(testStatusRoute, async c => {
  try {
    const db = c.env.DB

    // データ件数カウント
    const [teachers, subjects, classrooms, users] = await Promise.all([
      db.prepare('SELECT COUNT(*) as count FROM teachers').first(),
      db.prepare('SELECT COUNT(*) as count FROM subjects').first(),
      db.prepare('SELECT COUNT(*) as count FROM classrooms').first(),
      db.prepare('SELECT COUNT(*) as count FROM users').first(),
    ])

    // バックアップテーブルの存在確認
    const backupTables = await db
      .prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name LIKE '%_backup'
    `)
      .all()

    return c.json({
      success: true,
      data: {
        teachers: (teachers as { count: number }).count || 0,
        subjects: (subjects as { count: number }).count || 0,
        classrooms: (classrooms as { count: number }).count || 0,
        users: (users as { count: number }).count || 0,
        hasBackupTables: (backupTables.results || []).length > 0,
        environment: c.env.NODE_ENV || 'unknown',
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('テスト環境状態確認エラー:', error)
    return c.json(
      {
        success: false,
        error: 'STATUS_CHECK_ERROR',
        message: `テスト環境状態確認に失敗しました: ${error.message}`,
      },
      500
    )
  }
})

// クリーンアップエンドポイント
const cleanupRoute = createRoute({
  method: 'post',
  path: '/cleanup',
  summary: 'テスト環境クリーンアップ',
  description: 'バックアップテーブルをクリーンアップし、元のデータを復元',
  tags: ['Test Data Management'],
  responses: {
    200: {
      description: 'クリーンアップ完了',
      content: {
        'application/json': {
          schema: SuccessResponseSchema,
        },
      },
    },
  },
})

testDataApp.openapi(cleanupRoute, async c => {
  try {
    const db = c.env.DB
    const testDbService = new TestDatabaseService(db)

    console.log('🧹 テスト環境クリーンアップ開始')

    await testDbService.restoreFromBackup()
    await testDbService.cleanupBackupTables()

    return c.json({
      success: true,
      message: 'テスト環境クリーンアップ完了',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('テスト環境クリーンアップエラー:', error)
    return c.json(
      {
        success: false,
        error: 'CLEANUP_ERROR',
        message: `テスト環境クリーンアップに失敗しました: ${error.message}`,
      },
      500
    )
  }
})

export default testDataApp
