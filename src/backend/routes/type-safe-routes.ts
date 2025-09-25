/**
 * 型安全ルート - レガシーAPI(/api)の型安全版
 * 既存のAPIエンドポイントを型安全化したもの
 */

import type { ClassroomDbRow, Env, SubjectDbRow } from '@shared/schemas'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { timing } from 'hono/timing'
import { customAuthMiddleware } from '../middleware/auth'
// import { createDatabase } from '../services/database' // 不要
// 条件付きでコントローラーをインポートするために遅延ロード
// import { typeSafeControllers } from '../controllers/type-safe-controller'

/**
 * 型安全APIルーター作成
 */

export function createTypeSafeRoutes() {
  const app = new Hono<{ Bindings: Env }>()

  // データベース接続関数（削除済み）

  // ======================
  // ミドルウェア設定
  // ======================

  // CORS設定
  app.use(
    '*',
    cors({
      origin: [
        'http://localhost:5173',
        'https://school-timetable-monorepo.grundhunter.workers.dev',
      ],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-CSRF-Token',
        'Accept',
        'Origin',
      ],
      credentials: true,
      maxAge: 86400,
    })
  )

  // リクエストタイミング測定
  app.use('*', timing())

  // 開発環境でのリクエストログ
  app.use('*', async (c, next) => {
    if (c.env.NODE_ENV === 'development') {
      await logger()(c, next)
    } else {
      await next()
    }
  })

  // セキュリティヘッダー
  app.use('*', async (c, next) => {
    await next()

    c.header('X-Content-Type-Options', 'nosniff')
    c.header('X-Frame-Options', 'DENY')
    c.header('X-XSS-Protection', '1; mode=block')
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin')

    // API情報ヘッダー
    c.header('X-API-Version', '1.0.0')
    c.header('X-API-Type', 'type-safe-school-api')
    c.header('X-Powered-By', 'Hono + TypeScript + Zod')
  })

  // ======================
  // エラーハンドリング
  // ======================

  // グローバルエラーハンドラー
  app.onError((error, c) => {
    console.error('型安全APIエラー:', {
      error: error.message,
      stack: error.stack,
      path: c.req.path,
      method: c.req.method,
      timestamp: new Date().toISOString(),
    })

    return c.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'サーバー内部エラーが発生しました',
        timestamp: new Date().toISOString(),
        // 詳細デバッグ情報（本番環境でも一時的に有効化）
        details: {
          originalError: error.message,
          errorName: error.name,
          errorConstructor: error.constructor.name,
          stack: error.stack?.split('\n').slice(0, 15),
          path: c.req.path,
          method: c.req.method,
          url: c.req.url,
          headers: Object.fromEntries(c.req.header()),
        },
        // 追加のランタイム情報
        runtime: {
          nodeEnv: c.env?.NODE_ENV,
          timestamp: Date.now(),
        },
      },
      500
    )
  })

  // 404エラーハンドラー
  app.notFound(c => {
    return c.json(
      {
        success: false,
        error: 'NOT_FOUND',
        message: `APIエンドポイント '${c.req.path}' が見つかりません`,
        suggestions: [
          'URLが正しいか確認してください',
          '型安全API仕様書を確認してください: /api/docs',
          '利用可能なエンドポイント一覧: /api/spec',
        ],
        timestamp: new Date().toISOString(),
      },
      404
    )
  })

  // ======================
  // ヘルスチェック・情報エンドポイント
  // ======================

  app.get('/health', c => {
    return c.json({ success: true, message: 'API is healthy' })
  })

  app.get('/info', async c => {
    console.log('📍 /info エンドポイント到達')
    try {
      // まず簡単なレスポンスでテスト
      return c.json({
        success: true,
        data: {
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          message: 'Simple info response',
        },
      })
    } catch (error) {
      console.error('❌ /info エラー:', error)
      return c.json({ success: false, error: 'INFO_ERROR', message: error.message }, 500)
    }
  })

  app.get('/metrics', async c => {
    console.log('📍 /metrics エンドポイント到達')
    try {
      // まず簡単なレスポンスでテスト
      return c.json({
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          message: 'Simple metrics response',
          uptime: Date.now(),
        },
      })
    } catch (error) {
      console.error('❌ /metrics エラー:', error)
      return c.json({ success: false, error: 'METRICS_ERROR', message: error.message }, 500)
    }
  })

  // ======================
  // 学校設定管理ルート - テスト実装
  // ======================

  // セキュリティ：認証なしでアクセスできる学校設定エンドポイントは削除
  // 認証必須のAPIルートに移動済み

  // セキュリティ：認証なしでアクセスできる学校設定更新エンドポイントは削除
  // 認証必須のAPIルートに移動済み

  // ======================
  // 教師管理ルート（統合API用） - テスト実装
  // ======================

  // 認証ミドルウェア適用（教師以上の権限が必要）
  app.use('/school/*', customAuthMiddleware)

  // 学校設定APIは/api/school/settingsに移行済み（OpenAPI実装）

  // [REMOVED] Legacy school settings endpoints - now handled by OpenAPI routes

  // [REMOVED] Legacy teachers endpoints - now handled by OpenAPI routes
  // All teacher endpoints have been migrated to the unified OpenAPI implementation

  // 教科一覧取得（テスト版）
  app.get('/school/subjects', async c => {
    console.log('📍 /school/subjects エンドポイント到達')
    try {
      console.log('🗄️ データベース接続確認')
      if (!c.env?.DB) {
        throw new Error('Database connection not available')
      }

      // DBからsubjectsを取得
      const results = await c.env.DB.prepare(`
        SELECT * FROM subjects ORDER BY name
      `).all()

      console.log('🗄️ 取得結果:', results)

      if (!results?.results) {
        throw new Error('Subjects query failed')
      }

      // 安全なJSONパース関数
      const safeJsonParse = (jsonString: string | null, defaultValue: unknown) => {
        if (!jsonString) return defaultValue
        try {
          return JSON.parse(jsonString)
        } catch {
          return defaultValue
        }
      }

      // 教科データの変換（フロントエンドスキーマに合わせて）
      const convertedData = results.results.map((subject: SubjectDbRow) => ({
        id: subject.id,
        name: subject.name,
        grades: safeJsonParse(subject.target_grades, []),
        weeklyHours: subject.weekly_hours ? { '1': subject.weekly_hours } : {},
        requiresSpecialClassroom: subject.requires_special_room === 1,
        classroomType: subject.special_classroom || '普通教室',
        color: '#3B82F6', // デフォルト色
        order: Number(subject.id?.toString().slice(-2)) || 1,
        created_at: subject.created_at
          ? new Date(subject.created_at).toISOString()
          : new Date().toISOString(),
        updated_at: subject.updated_at
          ? new Date(subject.updated_at).toISOString()
          : new Date().toISOString(),
      }))

      console.log('✅ 変換後データ:', convertedData)

      return c.json({
        success: true,
        data: {
          subjects: convertedData,
          pagination: {
            page: 1,
            limit: 100,
            total: convertedData.length,
            totalPages: 1,
          },
        },
      })
    } catch (error: unknown) {
      console.error('❌ /school/subjects エラー:', error)
      return c.json(
        {
          success: false,
          error: 'SUBJECTS_ERROR',
          message: error.message,
          details: { originalError: error.message },
        },
        500
      )
    }
  })

  // 教室一覧取得（テスト版）
  app.get('/school/classrooms', async c => {
    console.log('📍 /school/classrooms エンドポイント到達')
    try {
      console.log('🗄️ データベース接続確認')
      if (!c.env?.DB) {
        throw new Error('Database connection not available')
      }

      // DBからclassroomsを取得
      const results = await c.env.DB.prepare(`
        SELECT * FROM classrooms
      `).all()

      console.log('🗄️ 取得結果:', results)

      if (!results?.results) {
        throw new Error('Classrooms query failed')
      }

      // datetimeフィールドをISO8601形式に変換
      const convertedData = results.results.map((classroom: ClassroomDbRow) => ({
        ...classroom,
        created_at: classroom.created_at
          ? new Date(classroom.created_at).toISOString()
          : new Date().toISOString(),
        updated_at: classroom.updated_at
          ? new Date(classroom.updated_at).toISOString()
          : new Date().toISOString(),
      }))

      console.log('✅ 変換後データ:', convertedData)

      return c.json({
        success: true,
        data: {
          classrooms: convertedData,
          pagination: {
            page: 1,
            limit: 100,
            total: convertedData.length,
            totalPages: 1,
          },
        },
      })
    } catch (error: unknown) {
      console.error('❌ /school/classrooms エラー:', error)
      return c.json(
        {
          success: false,
          error: 'CLASSROOMS_ERROR',
          message: error.message,
          details: { originalError: error.message },
        },
        500
      )
    }
  })

  // 教室新規作成（統合API対応）
  app.post('/school/classrooms', async c => {
    console.log('📍 POST /school/classrooms エンドポイント到達')
    try {
      console.log('🗄️ データベース接続確認')
      if (!c.env?.DB) {
        throw new Error('Database connection not available')
      }

      const body = await c.req.json()
      console.log('📝 受信データ:', body)

      // UUIDを生成
      const id = crypto.randomUUID()
      const now = new Date().toISOString()

      // DBにclassroomを挿入
      const result = await c.env.DB.prepare(`
        INSERT INTO classrooms (
          id, name, type, capacity, count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
        .bind(
          id,
          body.name || 'テスト教室',
          body.type || '普通教室',
          body.capacity || null,
          body.count || 1,
          now,
          now
        )
        .run()

      console.log('✅ 挿入結果:', result)

      // 作成されたデータを返す（フロントエンドスキーマに合わせて）
      const createdClassroom = {
        id,
        name: body.name,
        type: body.type,
        capacity: body.capacity || undefined,
        count: body.count || 1,
        created_at: now,
        updated_at: now,
      }

      return c.json({
        success: true,
        data: createdClassroom,
      })
    } catch (error: unknown) {
      console.error('❌ POST /school/classrooms エラー:', error)
      return c.json(
        {
          success: false,
          error: 'CLASSROOM_CREATE_ERROR',
          message: error.message,
          details: { originalError: error.message },
        },
        500
      )
    }
  })

  // 教科新規作成（統合API対応）
  app.post('/school/subjects', async c => {
    console.log('📍 POST /school/subjects エンドポイント到達')
    try {
      console.log('🗄️ データベース接続確認')
      if (!c.env?.DB) {
        throw new Error('Database connection not available')
      }

      const body = await c.req.json()
      console.log('📝 受信データ:', body)

      // UUIDを生成
      const id = crypto.randomUUID()
      const now = new Date().toISOString()

      // DBにsubjectを挿入
      const result = await c.env.DB.prepare(`
        INSERT INTO subjects (
          id, name, school_id, target_grades, weekly_hours, special_classroom, 
          created_at, updated_at, requires_special_room
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
        .bind(
          id,
          body.name || 'テスト教科',
          body.school_id || 'default',
          JSON.stringify(body.grades || []),
          body.weeklyHours ? Object.values(body.weeklyHours)[0] || 1 : 1,
          body.classroomType || '普通教室',
          now,
          now,
          body.requiresSpecialClassroom ? 1 : 0
        )
        .run()

      console.log('✅ 挿入結果:', result)

      // 作成されたデータを返す（フロントエンドスキーマに合わせて）
      const createdSubject = {
        id,
        name: body.name,
        grades: body.grades || [],
        weeklyHours: body.weeklyHours || {},
        requiresSpecialClassroom: body.requiresSpecialClassroom || false,
        classroomType: body.classroomType || '普通教室',
        color: '#3B82F6',
        order: Number(id.slice(-2)) || 1,
        created_at: now,
        updated_at: now,
      }

      return c.json({
        success: true,
        data: createdSubject,
      })
    } catch (error: unknown) {
      console.error('❌ POST /school/subjects エラー:', error)
      return c.json(
        {
          success: false,
          error: 'SUBJECT_CREATE_ERROR',
          message: error.message,
          details: { originalError: error.message },
        },
        500
      )
    }
  })

  // 教師新規作成（テスト版）
  app.post('/school/teachers', async c => {
    console.log('📍 POST /school/teachers エンドポイント到達')
    try {
      console.log('🗄️ データベース接続確認')
      if (!c.env?.DB) {
        throw new Error('Database connection not available')
      }

      const body = await c.req.json()
      console.log('📝 受信データ:', body)

      // UUIDを生成
      const id = crypto.randomUUID()
      const now = new Date().toISOString()

      // テーブル構造を確認してからINSERT実行
      try {
        const tableInfo = await c.env.DB.prepare(`PRAGMA table_info(teachers)`).all()
        console.log('🔍 Teachers table structure:', tableInfo.results)

        const columns = (tableInfo.results || []).map(col => col.name)
        console.log('📋 Available columns:', columns)
      } catch (debugError) {
        console.log('❌ Table info check failed:', debugError)
      }

      // DBにteacherを挿入（worker.tsのスキーマに合わせてsubjectsとgradesカラムを含める）
      const result = await c.env.DB.prepare(`
        INSERT INTO teachers (
          id, name, email, subjects, grades, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
        .bind(
          id,
          body.name || 'テスト教師',
          body.email || null,
          JSON.stringify(body.subjects || []),
          JSON.stringify(body.grades || []),
          now,
          now
        )
        .run()

      console.log('✅ 挿入結果:', result)

      // 作成されたデータを返す（フロントエンドスキーマに合わせて）
      const createdTeacher = {
        id,
        name: body.name,
        email: body.email || undefined,
        subjects: body.subjects || [],
        grades: body.grades || [],
        assignmentRestrictions: body.assignmentRestrictions || [],
        maxWeeklyHours: 25,
        preferredTimeSlots: [],
        unavailableSlots: [],
        created_at: now,
        updated_at: now,
      }

      return c.json({
        success: true,
        data: createdTeacher,
      })
    } catch (error: unknown) {
      console.error('❌ POST /school/teachers エラー:', error)
      return c.json(
        {
          success: false,
          error: 'TEACHER_CREATE_ERROR',
          message: error.message,
          details: { originalError: error.message },
        },
        500
      )
    }
  })

  // ======================
  // セキュリティ：すべての認証なしAPIエンドポイントを削除
  // すべての/school/*エンドポイントは認証必須となります
  // ======================

  // セキュリティ：認証なしエンドポイントはすべて削除済み
  // すべての/school/*エンドポイントは認証が必須です

  return app
}

/**
 * デフォルトエクスポート
 */
export default createTypeSafeRoutes
