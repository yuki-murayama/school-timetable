import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createTypeeSafeApiApp } from './backend/api'
import authApp from './backend/routes/auth'
import testDbApp from './backend/routes/test-db'
import { DatabaseService } from './backend/services/database'

type Env = {
  DB: D1Database
  ASSETS?: unknown
  JWT_SECRET?: string
  NODE_ENV: string
}

const app = new Hono<{ Bindings: Env }>()

// CORS設定
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
)

// Database initialization endpoint - now uses DatabaseService for consistent schema
app.post('/api/init-db', async c => {
  try {
    console.log('🚀 Database initialization started - using DatabaseService')
    const db = c.env.DB
    console.log('✅ Database connection confirmed:', !!db)

    // Use DatabaseService for consistent schema management
    const databaseService = new DatabaseService(db)
    await databaseService.createMasterTables()

    // insertDefaultData() メソッドが学校設定、条件設定、テストユーザーを作成
    // これにより本番環境と一致するデータ構造となる
    console.log('📦 基本データ挿入開始（学校設定、条件設定、テストユーザー）')
    // DatabaseServiceの insertDefaultData は createMasterTables 内で既に呼び出されている
    console.log('✅ 基本データ挿入完了')

    // Get final table schema info for debugging
    const [teachersSchema, subjectsSchema, classroomsSchema, usersSchema, userSessionsSchema] =
      await Promise.all([
        db.prepare('PRAGMA table_info(teachers)').all(),
        db.prepare('PRAGMA table_info(subjects)').all(),
        db.prepare('PRAGMA table_info(classrooms)').all(),
        db.prepare('PRAGMA table_info(users)').all(),
        db.prepare('PRAGMA table_info(user_sessions)').all(),
      ])

    return c.json({
      success: true,
      message: 'Database initialized successfully with production-matching schema',
      debug: {
        teachersColumns: teachersSchema.results?.length || 0,
        subjectsColumns: subjectsSchema.results?.length || 0,
        classroomsColumns: classroomsSchema.results?.length || 0,
        usersColumns: usersSchema.results?.length || 0,
        userSessionsColumns: userSessionsSchema.results?.length || 0,
        detailedSchema: {
          teachers: teachersSchema.results || [],
          subjects: subjectsSchema.results || [],
          classrooms: classroomsSchema.results || [],
          users: usersSchema.results || [],
          user_sessions: userSessionsSchema.results || [],
        },
      },
    })
  } catch (error) {
    console.error('Database initialization error:', error)
    return c.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      500
    )
  }
})

// Test endpoint to drop users table (for development only)
app.post('/api/test-drop-users', async c => {
  try {
    const db = c.env.DB
    await db.prepare('DROP TABLE IF EXISTS users').run()
    await db.prepare('DROP TABLE IF EXISTS user_sessions').run()
    return c.json({ success: true, message: 'Users and user_sessions tables dropped' })
  } catch (error) {
    console.error('Drop table error:', error)
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Test endpoint to drop teachers table and recreate with correct schema (for development only)
app.post('/api/test-drop-teachers', async c => {
  try {
    const db = c.env.DB
    console.log('🗑️ Dropping existing teachers table...')
    await db.prepare('DROP TABLE IF EXISTS teachers').run()
    console.log('✅ Teachers table dropped')

    console.log('🔧 Creating new teachers table with correct schema...')
    const result = await db
      .prepare(`
      CREATE TABLE IF NOT EXISTS teachers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        subjects TEXT,
        grades TEXT,
        is_active INTEGER DEFAULT 1 NOT NULL,
        created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      )
    `)
      .run()
    console.log('✅ New teachers table created:', result)

    return c.json({
      success: true,
      message: 'Teachers table dropped and recreated with correct schema',
    })
  } catch (error) {
    console.error('Drop/recreate teachers table error:', error)
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Test endpoint to drop classrooms table and recreate with correct schema (for development only)
app.post('/api/test-drop-classrooms', async c => {
  try {
    const db = c.env.DB
    console.log('🗑️ Dropping existing classrooms table...')
    await db.prepare('DROP TABLE IF EXISTS classrooms').run()
    console.log('✅ Classrooms table dropped')

    console.log('🔧 Creating new classrooms table with correct schema...')
    const result = await db
      .prepare(`
      CREATE TABLE IF NOT EXISTS classrooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        type TEXT DEFAULT 'normal',
        capacity INTEGER DEFAULT 0,
        count INTEGER DEFAULT 1,
        location TEXT,
        \`order\` INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
      .run()
    console.log('✅ New classrooms table created:', result)

    return c.json({
      success: true,
      message: 'Classrooms table dropped and recreated with correct schema successfully',
    })
  } catch (error) {
    console.error('Drop/recreate classrooms table error:', error)
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Add missing columns to users table
app.post('/api/fix-users-table', async c => {
  try {
    const db = c.env.DB

    // Try to add missing columns one by one
    const alterQueries = [
      'ALTER TABLE users ADD COLUMN login_attempts INTEGER DEFAULT 0',
      'ALTER TABLE users ADD COLUMN locked_until DATETIME',
      'ALTER TABLE users ADD COLUMN last_login_at DATETIME',
    ]

    const results = []
    for (const query of alterQueries) {
      try {
        await db.prepare(query).run()
        results.push({ query, success: true })
      } catch (error) {
        results.push({ query, success: false, error: error.message })
      }
    }

    return c.json({
      success: true,
      message: 'Users table fix attempted',
      results,
    })
  } catch (error) {
    console.error('Fix users table error:', error)
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Debug endpoint to check users table
app.get('/api/debug-users', async c => {
  try {
    const db = c.env.DB

    // Check if users table exists and has data
    const users = await db
      .prepare(`
      SELECT id, email, name, role, is_active 
      FROM users
    `)
      .all()

    return c.json({
      success: true,
      users: users.results || [],
      count: users.results?.length || 0,
    })
  } catch (error) {
    console.error('Debug users error:', error)
    return c.json(
      {
        success: false,
        error: error.message,
        tableExists: false,
      },
      500
    )
  }
})

// Debug endpoint to check sessions for a specific token
app.post('/api/debug-session', async c => {
  try {
    const db = c.env.DB
    const body = await c.req.json()
    const { token } = body

    if (!token) {
      return c.json({ success: false, error: 'Token required' }, 400)
    }

    // Check if user_sessions table exists and search for token
    const session = await db
      .prepare(`
      SELECT 
        s.id as session_id,
        s.user_id,
        s.token,
        s.expires_at,
        s.created_at,
        s.last_accessed_at,
        u.email,
        u.name,
        u.role,
        u.is_active
      FROM user_sessions s 
      LEFT JOIN users u ON s.user_id = u.id 
      WHERE s.token = ?
    `)
      .bind(token)
      .first()

    // Check all sessions for debugging
    const allSessions = await db
      .prepare(`
      SELECT 
        s.id,
        s.user_id,
        s.expires_at,
        s.created_at,
        CASE 
          WHEN length(s.token) > 50 THEN substr(s.token, 1, 30) || '...' 
          ELSE s.token 
        END as token_preview
      FROM user_sessions s 
      ORDER BY s.created_at DESC 
      LIMIT 5
    `)
      .all()

    return c.json({
      success: true,
      sessionFound: !!session,
      session: session || null,
      allSessions: allSessions.results || [],
      currentTime: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Debug session error:', error)
    return c.json(
      {
        success: false,
        error: error.message,
        details: error.toString(),
      },
      500
    )
  }
})

// Endpoint to force insert test user
app.post('/api/force-test-user', async c => {
  try {
    const db = c.env.DB

    // Force delete existing test user
    await db.prepare(`DELETE FROM users WHERE email = 'test@school.local'`).run()

    // Force insert test user with explicit timestamps
    const now = new Date().toISOString()
    const result = await db
      .prepare(`
      INSERT INTO users 
      (id, email, hashed_password, name, role, is_active, created_at, updated_at)
      VALUES ('test-user-1', 'test@school.local', '482c811da5d5b4bc6d497ffa98491e38', 'テストユーザー', 'admin', 1, ?, ?)
    `)
      .bind(now, now)
      .run()

    console.log('Force insert result:', result)

    // Verify insertion
    const user = await db
      .prepare(`
      SELECT id, email, name, role, is_active 
      FROM users 
      WHERE email = 'test@school.local'
    `)
      .first()

    return c.json({
      success: true,
      message: 'Test user inserted successfully',
      insertResult: result,
      user: user,
    })
  } catch (error) {
    console.error('Force test user error:', error)
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    )
  }
})

// Data migration endpoint
app.post('/api/migrate-data', async c => {
  try {
    const db = c.env.DB
    const body = await c.req.json()
    const { type, data } = body

    if (type === 'teachers') {
      for (const teacher of data) {
        await db
          .prepare(`
          INSERT OR REPLACE INTO teachers 
          (id, name, email, subjects, grades, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
          .bind(
            teacher.id,
            teacher.name,
            teacher.email || '',
            teacher.subjects || '[]',
            teacher.grades || '[]',
            teacher.created_at,
            teacher.updated_at
          )
          .run()
      }
    } else if (type === 'subjects') {
      for (const subject of data) {
        await db
          .prepare(`
          INSERT OR REPLACE INTO subjects 
          (id, name, special_classroom, description, weekly_hours, target_grades, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
          .bind(
            subject.id,
            subject.name,
            subject.special_classroom || '',
            subject.description || '',
            subject.weeklyLessons || 1,
            subject.target_grades || '[]',
            subject.created_at,
            subject.updated_at
          )
          .run()
      }
    } else if (type === 'classrooms') {
      for (const classroom of data) {
        // Check if count column exists, if not use only basic columns
        try {
          await db
            .prepare(`
            INSERT OR REPLACE INTO classrooms 
            (id, name, type, capacity, count, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `)
            .bind(
              classroom.id,
              classroom.name,
              classroom.type,
              classroom.capacity || null,
              classroom.count || 1,
              classroom.created_at,
              classroom.updated_at
            )
            .run()
        } catch (_error) {
          console.log('Fallback: using basic columns only for classroom:', classroom.id)
          // Fallback to basic columns if count column doesn't exist
          await db
            .prepare(`
            INSERT OR REPLACE INTO classrooms 
            (id, name, type, capacity, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `)
            .bind(
              classroom.id,
              classroom.name,
              classroom.type,
              classroom.capacity || null,
              classroom.created_at,
              classroom.updated_at
            )
            .run()
        }
      }
    }

    return c.json({
      success: true,
      message: `${data.length} ${type} migrated successfully`,
    })
  } catch (error) {
    console.error('Data migration error:', error)
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    )
  }
})

// Debug endpoint to check actual table schema
app.get('/api/debug-table-schema', async c => {
  try {
    const db = c.env.DB

    // Get table info for all main tables
    const [teachersSchema, subjectsSchema, classroomsSchema, usersSchema] = await Promise.all([
      db.prepare('PRAGMA table_info(teachers)').all(),
      db.prepare('PRAGMA table_info(subjects)').all(),
      db.prepare('PRAGMA table_info(classrooms)').all(),
      db.prepare('PRAGMA table_info(users)').all(),
    ])

    return c.json({
      success: true,
      data: {
        teachersSchema: teachersSchema.results || [],
        subjectsSchema: subjectsSchema.results || [],
        classroomsSchema: classroomsSchema.results || [],
        usersSchema: usersSchema.results || [],
        tableCount: 4,
      },
    })
  } catch (error) {
    console.error('Debug table schema error:', error)
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Endpoint to manually insert classroom data using raw SQL
app.post('/api/manual-insert-classrooms', async c => {
  try {
    const db = c.env.DB

    // First get current table structure
    const schemaInfo = await db.prepare('PRAGMA table_info(classrooms)').all()
    const columns = (schemaInfo.results || []).map(col => col.name)

    console.log('Available columns:', columns)

    // Insert data using only available columns
    const basicInserts = [
      {
        sql: 'INSERT OR REPLACE INTO classrooms (id, name, type, capacity, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        values: [
          'classroom-001',
          '1年1組教室',
          'normal',
          30,
          '2025-08-31T08:00:00.000Z',
          '2025-08-31T08:00:00.000Z',
        ],
      },
      {
        sql: 'INSERT OR REPLACE INTO classrooms (id, name, type, capacity, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        values: [
          'classroom-002',
          '理科室',
          'special',
          24,
          '2025-08-31T08:00:00.000Z',
          '2025-08-31T08:00:00.000Z',
        ],
      },
      {
        sql: 'INSERT OR REPLACE INTO classrooms (id, name, type, capacity, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        values: [
          'classroom-003',
          '音楽室',
          'special',
          20,
          '2025-08-31T08:00:00.000Z',
          '2025-08-31T08:00:00.000Z',
        ],
      },
    ]

    const results = []
    for (const insert of basicInserts) {
      try {
        const result = await db
          .prepare(insert.sql)
          .bind(...insert.values)
          .run()
        results.push({
          id: insert.values[0],
          success: true,
          changes: result.changes,
        })
        console.log(`✅ Successfully inserted classroom: ${insert.values[0]}`)
      } catch (error) {
        results.push({
          id: insert.values[0],
          success: false,
          error: error.message,
        })
        console.log(`❌ Failed to insert classroom: ${insert.values[0]} - ${error.message}`)
      }
    }

    return c.json({
      success: true,
      message: 'Manual classroom insertion attempted',
      tableColumns: columns,
      results,
    })
  } catch (error) {
    console.error('Manual insert classrooms error:', error)
    return c.json({ success: false, error: error.message }, 500)
  }
})

// 認証API
app.route('/api/auth', authApp)

// 統一テストデータ管理API
app.route('/api/test-db', testDbApp)

// 統一型安全APIシステム（OpenAPI 3.0.3対応）
const apiApp = createTypeeSafeApiApp()

// デバッグ：統合APIアプリが作成されているか確認
console.log('apiApp created:', !!apiApp)

app.route('/api', apiApp)

// デバッグ：直接テストエンドポイントを追加
app.get('/api/test-direct', c => {
  return c.json({
    success: true,
    message: 'Direct test endpoint in worker.ts',
    timestamp: new Date().toISOString(),
  })
})

// Serve static assets for frontend (only for non-API routes)
app.use('*', async (c, next) => {
  const pathname = new URL(c.req.url).pathname

  // Skip static file serving for API routes
  if (pathname.startsWith('/api/')) {
    return next()
  }

  try {
    if (c.env.ASSETS) {
      const url = new URL(c.req.url)

      // For root path or any path that doesn't have file extension, serve index.html
      if (pathname === '/' || !pathname.includes('.')) {
        const indexResponse = await c.env.ASSETS.fetch(new Request(`${url.origin}/index.html`))
        if (indexResponse.ok) {
          return new Response(indexResponse.body, {
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
            },
          })
        }
      }

      // For static assets, serve directly
      const assetResponse = await c.env.ASSETS.fetch(c.req.raw)
      if (assetResponse.ok) {
        return assetResponse
      }
    }
  } catch (error) {
    console.error('Error serving static assets:', error)
  }

  return next()
})

// Fallback HTML for when assets are not available (only for non-API routes)
app.get('*', c => {
  const pathname = new URL(c.req.url).pathname

  // Don't serve HTML fallback for API routes
  if (pathname.startsWith('/api/')) {
    return c.json({ error: 'API endpoint not found' }, 404)
  }

  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <link rel="icon" type="image/svg+xml" href="/vite.svg" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>School Timetable</title>
      </head>
      <body>
        <div id="root">
          <div style="padding: 20px; text-align: center;">
            <h1>School Timetable</h1>
            <p>Frontend assets not found. Please build the frontend first with:</p>
            <code>npm run build:frontend</code>
          </div>
        </div>
      </body>
    </html>
  `)
})

export default app
