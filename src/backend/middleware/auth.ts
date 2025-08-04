import type { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'

interface Env {
  VITE_CLERK_PUBLISHABLE_KEY: string
  CLERK_SECRET_KEY?: string
}

/**
 * Clerk認証トークンを検証するミドルウェア
 */
export async function clerkAuthMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  try {
    // Authorizationヘッダーからトークンを取得
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      console.error('🚫 Authorization header missing')
      throw new HTTPException(401, { message: 'Authorization token required' })
    }

    // Bearer トークンフォーマットをチェック
    const token = authHeader.replace('Bearer ', '')
    if (!token || token === authHeader) {
      console.error('🚫 Invalid authorization format')
      throw new HTTPException(401, { message: 'Invalid authorization format' })
    }

    // トークンの基本的な検証（JWT形式チェック）
    if (!isValidJWTFormat(token)) {
      console.error('🚫 Invalid JWT token format')
      throw new HTTPException(401, { message: 'Invalid token format' })
    }

    // Clerk JWTトークンの検証
    const isValid = await verifyClerkToken(token, c.env.VITE_CLERK_PUBLISHABLE_KEY)
    if (!isValid) {
      console.error('🚫 Token verification failed')
      throw new HTTPException(401, { message: 'Invalid or expired token' })
    }

    // トークンが有効な場合、ユーザー情報をコンテキストに追加
    const userInfo = await extractUserInfo(token)
    c.set('user', userInfo)

    console.log('✅ Authentication successful for user:', userInfo.userId)
    await next()
  } catch (error) {
    console.error('❌ Authentication error:', error)

    if (error instanceof HTTPException) {
      throw error
    }

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
 * Clerkトークンを検証する
 */
async function verifyClerkToken(token: string, _publishableKey: string): Promise<boolean> {
  try {
    // JWT のヘッダーとペイロードをデコード
    const [header, payload] = token.split('.')

    if (!header || !payload) {
      return false
    }

    // Base64URLデコード
    const decodedPayload = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))

    // 基本的な検証
    if (!decodedPayload.sub || !decodedPayload.iss || !decodedPayload.exp) {
      return false
    }

    // 有効期限チェック
    const now = Math.floor(Date.now() / 1000)
    if (decodedPayload.exp < now) {
      console.error('🚫 Token expired')
      return false
    }

    // issuer検証（Clerkのissuerパターン）
    if (!decodedPayload.iss.includes('clerk')) {
      console.error('🚫 Invalid issuer')
      return false
    }

    // 実際のプロダクション環境では、Clerk APIでより厳密な検証を行う必要がある
    // 現在は基本的な検証のみ実装

    return true
  } catch (error) {
    console.error('Token verification error:', error)
    return false
  }
}

/**
 * JWTトークンからユーザー情報を抽出
 */
async function extractUserInfo(token: string): Promise<{ userId: string; email?: string }> {
  try {
    const [, payload] = token.split('.')
    const decodedPayload = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))

    return {
      userId: decodedPayload.sub,
      email: decodedPayload.email,
    }
  } catch (error) {
    console.error('Error extracting user info:', error)
    throw new Error('Failed to extract user information')
  }
}

/**
 * 管理者権限チェックミドルウェア
 */
export async function adminAuthMiddleware(c: Context, next: Next) {
  const user = c.get('user')

  if (!user) {
    throw new HTTPException(401, { message: 'User not authenticated' })
  }

  // 管理者権限チェック（実際の実装では、ユーザーロールをDBまたはClerkで管理）
  // 現在は基本的な実装として、全認証済みユーザーを管理者として扱う
  console.log('✅ Admin access granted for user:', user.userId)

  await next()
}

/**
 * リードオンリー権限チェックミドルウェア
 */
export async function readOnlyAuthMiddleware(c: Context, next: Next) {
  const user = c.get('user')

  if (!user) {
    throw new HTTPException(401, { message: 'User not authenticated' })
  }

  // リードオンリー操作は認証済みユーザーであれば許可
  console.log('✅ Read access granted for user:', user.userId)

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

  // CORS設定
  c.header(
    'Access-Control-Allow-Origin',
    'https://school-timetable-monorepo.grundhunter.workers.dev'
  )
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  c.header('Access-Control-Max-Age', '86400')
}
