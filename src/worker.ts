import { Hono } from 'hono'
import { cors } from 'hono/cors'
import apiApp from './backend/index'

type Env = {
  DB: D1Database
  ASSETS?: unknown
  GROQ_API_KEY: string
  AUTH0_DOMAIN: string
  AUTH0_AUDIENCE: string
  AUTH0_CLIENT_ID: string
  VITE_CLERK_PUBLISHABLE_KEY: string
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

// Database initialization endpoint
app.post('/api/init-db', async c => {
  try {
    const db = c.env.DB

    // Create school_settings table
    await db
      .prepare(`
      CREATE TABLE IF NOT EXISTS school_settings (
        id TEXT PRIMARY KEY DEFAULT 'default',
        grade1Classes INTEGER NOT NULL DEFAULT 4,
        grade2Classes INTEGER NOT NULL DEFAULT 4,
        grade3Classes INTEGER NOT NULL DEFAULT 3,
        dailyPeriods INTEGER NOT NULL DEFAULT 6,
        saturdayPeriods INTEGER NOT NULL DEFAULT 4,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
      .run()

    // Create teachers table
    await db
      .prepare(`
      CREATE TABLE IF NOT EXISTS teachers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        subjects TEXT,
        grades TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
      .run()

    // Create subjects table
    await db
      .prepare(`
      CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        special_classroom TEXT,
        description TEXT,
        weekly_lessons INTEGER DEFAULT 1,
        target_grades TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
      .run()

    // Create classrooms table
    await db
      .prepare(`
      CREATE TABLE IF NOT EXISTS classrooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        capacity INTEGER,
        count INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
      .run()

    // Create generated_timetables table for saving timetable results
    await db
      .prepare(`
      CREATE TABLE IF NOT EXISTS generated_timetables (
        id TEXT PRIMARY KEY,
        timetable_data TEXT NOT NULL,
        statistics TEXT NOT NULL,
        metadata TEXT,
        generation_method TEXT DEFAULT 'program',
        assignment_rate REAL NOT NULL DEFAULT 0,
        total_slots INTEGER NOT NULL DEFAULT 0,
        assigned_slots INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
      .run()

    // Create users table (required for authentication and FK references)
    await db
      .prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        hashed_password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'teacher' NOT NULL,
        is_active INTEGER DEFAULT 1 NOT NULL,
        last_login_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
      .run()

    // Create teacher_subjects association table
    await db
      .prepare(`
      CREATE TABLE IF NOT EXISTS teacher_subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        UNIQUE(teacher_id, subject_id)
      )
    `)
      .run()

    // Insert default settings
    await db
      .prepare(`
      INSERT OR REPLACE INTO school_settings 
      (id, grade1Classes, grade2Classes, grade3Classes, dailyPeriods, saturdayPeriods)
      VALUES ('default', 4, 4, 3, 6, 4)
    `)
      .run()

    return c.json({
      success: true,
      message: 'Database initialized successfully',
    })
  } catch (error) {
    console.error('Database initialization error:', error)
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
          (id, name, special_classroom, description, weekly_lessons, target_grades, created_at, updated_at)
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

// API routes - mount backend API at /api
app.route('/api', apiApp)

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
