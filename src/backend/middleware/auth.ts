import type { D1Database } from '@cloudflare/workers-types'
import type { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'

interface Env {
  DB: D1Database
  NODE_ENV?: string
  JWT_SECRET?: string
}

// ユーザー情報の型定義
interface UserInfo {
  userId: string
  email?: string
  role?: string
}

/**
 * カスタム認証トークンを検証するミドルウェア
 */
export async function customAuthMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  try {
    // 認証ヘッダーの存在確認
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      console.error('🚫 Authorization header missing')
      throw new HTTPException(401, { message: 'Authorization token required' })
    }

    // Bearer トークンフォーマットをチェック
    if (!authHeader.startsWith('Bearer ')) {
      console.error('🚫 Authorization header does not start with Bearer')
      throw new HTTPException(401, { message: 'Invalid authorization format' })
    }

    const token = authHeader.substring(7) // 'Bearer '.length = 7
    if (!token) {
      console.error('🚫 Empty token after Bearer')
      throw new HTTPException(401, { message: 'Invalid authorization format' })
    }

    // トークンの基本的な検証（JWT形式チェック）
    if (!isValidJWTFormat(token)) {
      console.error('🚫 Invalid JWT token format')
      throw new HTTPException(401, { message: 'Invalid token format' })
    }

    // カスタムJWTトークンの検証
    console.log(
      '🔍 Verifying token with length:',
      token.length,
      'first 30 chars:',
      token.substring(0, 30)
    )
    const userInfo = await verifyCustomToken(token, c.env.DB)
    if (!userInfo) {
      console.error('🚫 Token verification failed for token:', token.substring(0, 30))
      throw new HTTPException(401, { message: 'Invalid or expired token' })
    }

    // トークンが有効な場合、ユーザー情報をヘッダーに追加
    c.res.headers.set('X-User-Id', userInfo.userId)
    if (userInfo.email) {
      c.res.headers.set('X-User-Email', userInfo.email)
    }
    if (userInfo.role) {
      c.res.headers.set('X-User-Role', userInfo.role)
    }

    console.log('✅ Authentication successful for user:', userInfo.userId)
    await next()
  } catch (error) {
    console.error('❌ Authentication error details:', {
      message: error.message,
      stack: error.stack,
      type: error.constructor?.name,
      path: c.req.path,
      method: c.req.method,
      headers: {
        authorization: c.req.header('Authorization') || 'none',
        userAgent: c.req.header('User-Agent') || 'unknown',
        origin: c.req.header('Origin') || 'unknown',
      },
      timestamp: new Date().toISOString(),
    })

    if (error instanceof HTTPException) {
      console.error('❌ HTTPException thrown:', error.status, error.message)
      throw error
    }

    console.error('❌ Unknown error, wrapping as 401')
    throw new HTTPException(401, { message: 'Authentication failed' })
  }
}

/**
 * JWT形式の基本的な検証
 */
function isValidJWTFormat(token: string): boolean {
  const parts = token.split('.')
  return parts.length === 3 && parts.every(part => part.length > 0)
}

/**
 * カスタムトークンを検証し、データベースでセッションをチェック
 */
async function verifyCustomToken(token: string, db: D1Database): Promise<UserInfo | null> {
  try {
    // JWT のヘッダーとペイロードをデコード
    const [header, payload] = token.split('.')

    if (!header || !payload) {
      return null
    }

    // Base64URLデコード
    const decodedPayload = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))

    // 基本的な検証（auth.tsと互換性を持つように修正）
    if (!decodedPayload.sub || !decodedPayload.exp) {
      return null
    }

    // 有効期限チェック
    const now = Math.floor(Date.now() / 1000)
    if (decodedPayload.exp < now) {
      console.error('🚫 Token expired')
      return null
    }

    // データベースでセッションを検証（トークン自体で検索）
    const sessionQuery = `
      SELECT s.id, s.user_id, s.expires_at, u.email, u.role
      FROM user_sessions s 
      JOIN users u ON s.user_id = u.id 
      WHERE s.token = ? AND s.expires_at > datetime('now') AND u.is_active = 1
    `

    console.log(
      '🔍 Searching session for token:',
      `${token.substring(0, 30)}...`,
      'decoded user:',
      decodedPayload.sub
    )
    console.log('🔍 Token full length:', token.length)
    console.log('🔍 Executing query:', sessionQuery.trim())

    // まずトークンが完全一致するレコードの存在確認
    const exactTokenQuery = 'SELECT COUNT(*) as count FROM user_sessions WHERE token = ?'
    const exactTokenResult = await db.prepare(exactTokenQuery).bind(token).first()
    console.log('🔍 Exact token match count:', exactTokenResult?.count)

    // 有効期限チェックなしでトークン検索
    const tokenOnlyQuery = `
      SELECT s.id, s.user_id, s.expires_at, s.created_at, u.email, u.role, u.is_active
      FROM user_sessions s 
      JOIN users u ON s.user_id = u.id 
      WHERE s.token = ?
    `
    const tokenOnlyResult = await db.prepare(tokenOnlyQuery).bind(token).first()
    console.log('🔍 Token-only search result:', {
      found: !!tokenOnlyResult,
      expires_at: tokenOnlyResult?.expires_at,
      created_at: tokenOnlyResult?.created_at,
      is_active: tokenOnlyResult?.is_active,
      current_time: new Date().toISOString(),
    })

    const session = await db.prepare(sessionQuery).bind(token).first()

    if (!session) {
      console.error('🚫 Session not found or expired for token:', `${token.substring(0, 30)}...`)

      // デバッグ: 同じユーザーの他のセッションを確認
      const debugQuery = `
        SELECT s.token, s.expires_at, s.created_at
        FROM user_sessions s 
        WHERE s.user_id = ? 
        ORDER BY s.created_at DESC 
        LIMIT 3
      `
      const debugSessions = await db.prepare(debugQuery).bind(decodedPayload.sub).all()
      console.log(
        '🔍 Debug: Recent sessions for user:',
        decodedPayload.sub,
        debugSessions.results?.map(s => ({
          token_prefix: `${s.token?.substring(0, 30)}...`,
          expires_at: s.expires_at,
          created_at: s.created_at,
        }))
      )

      return null
    }

    return {
      userId: session.user_id as string,
      email: session.email as string,
      role: session.role as string,
    }
  } catch (error) {
    console.error('Token verification error:', error)
    return null
  }
}

/**
 * 認証ミドルウェアのエクスポート
 */
export const authMiddleware = customAuthMiddleware

/**
 * 管理者権限チェックミドルウェア
 */
export async function adminAuthMiddleware(c: Context, next: Next) {
  const userId = c.res.headers.get('X-User-Id')
  const userRole = c.res.headers.get('X-User-Role')

  if (!userId) {
    throw new HTTPException(401, { message: 'User not authenticated' })
  }

  // 管理者権限チェック
  if (userRole !== 'admin') {
    console.error('🚫 Admin access denied for user:', userId, 'role:', userRole)
    throw new HTTPException(403, { message: 'Admin access required' })
  }

  console.log('✅ Admin access granted for user:', userId)
  await next()
}

/**
 * リードオンリー権限チェックミドルウェア
 */
export async function readOnlyAuthMiddleware(c: Context, next: Next) {
  const userId = c.res.headers.get('X-User-Id')

  if (!userId) {
    throw new HTTPException(401, { message: 'User not authenticated' })
  }

  // リードオンリー操作は認証済みユーザーであれば許可
  console.log('✅ Read access granted for user:', userId)

  await next()
}

/**
 * セキュリティヘッダー設定ミドルウェア
 */
export async function securityHeadersMiddleware(c: Context, next: Next) {
  await next()

  // セキュリティヘッダーを設定
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('X-XSS-Protection', '1; mode=block')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // CORS設定 - 開発環境とプロダクションの両方をサポート
  const allowedOrigins = [
    'https://school-timetable-monorepo.grundhunter.workers.dev',
    'http://localhost:5174',
  ]
  const origin = c.req.header('Origin')
  if (origin && allowedOrigins.includes(origin)) {
    c.header('Access-Control-Allow-Origin', origin)
  }
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  c.header('Access-Control-Max-Age', '86400')
}
