import { Hono } from 'hono'
type Env = {
  DB: D1Database
  ASSETS?: any
  GROQ_API_KEY: string
  AUTH0_DOMAIN: string
  AUTH0_AUDIENCE: string
  AUTH0_CLIENT_ID: string
  VITE_CLERK_PUBLISHABLE_KEY: string
  NODE_ENV: string
}
import schoolRoutes from './routes/school'
import timetableProgramRoutes from './routes/timetableProgram'

const app = new Hono<{ Bindings: Env }>()

// ヘルスチェック
app.get('/health', (c) => {
  return c.json({ status: 'ok', message: 'Simple backend is running' })
})

// ルートエンドポイント
app.get('/', (c) => {
  return c.json({ message: 'School Timetable Backend API', status: 'running' })
})

// 認証関連エンドポイント（簡易版）
app.get('/auth/user/me', (c) => {
  return c.json({
    success: true,
    data: {
      sub: 'test-user',
      name: 'Test User',
      email: 'test@example.com',
      permissions: ['read:timetables', 'write:timetables']
    }
  })
})

app.get('/auth/user/permissions', (c) => {
  return c.json({
    success: true,
    data: {
      permissions: ['read:timetables', 'write:timetables']
    }
  })
})

app.get('/auth/config', (c) => {
  return c.json({
    success: true,
    data: {
      domain: c.env.AUTH0_DOMAIN,
      clientId: c.env.AUTH0_CLIENT_ID,
      audience: c.env.AUTH0_AUDIENCE
    }
  })
})

app.get('/auth/health', (c) => {
  return c.json({ status: 'ok', message: 'Auth system is running' })
})

// ルーティング
app.route('/frontend/school', schoolRoutes)
app.route('/timetable/program', timetableProgramRoutes)

// レガシーエンドポイントは削除済み
// 全てのエンドポイントは適切なルートファイルで管理

export default app