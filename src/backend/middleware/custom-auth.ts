import type { Context, Next } from 'hono'
import { verify } from 'hono/jwt'
import type { Database } from '../services/database'

// JWT設定
const JWT_SECRET = 'your-super-secret-jwt-key-change-in-production' // Cloudflare Workersでは環境変数はc.envから取得

// ユーザー情報型定義
interface AuthUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'teacher' | 'user'
}

// Context拡張（認証情報を追加）
declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser
    sessionId: string
  }
}

/**
 * JWT認証ミドルウェア
 * Authorizationヘッダーのトークンを検証し、ユーザー情報をコンテキストに設定
 */
export const authMiddleware = (getDB: () => Database) => {
  return async (c: Context, next: Next) => {
    try {
      const authHeader = c.req.header('Authorization')

      // Authorizationヘッダー確認
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json(
          {
            success: false,
            error: '認証トークンが必要です',
          },
          401
        )
      }

      const token = authHeader.substring(7)

      try {
        // JWTトークン検証
        const jwtSecret = c.env?.JWT_SECRET || JWT_SECRET
        const payload = (await verify(token, jwtSecret)) as any

        // セッション存在確認とユーザー状態確認
        const db = getDB()
        const session = await db
          .prepare(`
          SELECT 
            s.id as session_id,
            s.user_id,
            s.expires_at,
            u.id,
            u.email,
            u.name,
            u.role,
            u.is_active
          FROM user_sessions s
          JOIN users u ON s.user_id = u.id
          WHERE s.token = ? AND s.expires_at > datetime('now') AND u.is_active = 1
        `)
          .bind(token)
          .first<{
            session_id: string
            user_id: string
            expires_at: string
            id: string
            email: string
            name: string
            role: 'admin' | 'teacher' | 'user'
            is_active: number
          }>()

        if (!session) {
          return c.json(
            {
              success: false,
              error: 'セッションが無効です',
            },
            401
          )
        }

        // 最終アクセス時刻更新
        await db
          .prepare(`
          UPDATE user_sessions 
          SET last_accessed_at = datetime('now')
          WHERE id = ?
        `)
          .bind(session.session_id)
          .run()

        // ユーザー情報をコンテキストに設定
        c.set('user', {
          id: session.id,
          email: session.email,
          name: session.name,
          role: session.role,
        })
        c.set('sessionId', session.session_id)

        await next()
      } catch (jwtError) {
        console.error('JWT verification failed:', jwtError)
        return c.json(
          {
            success: false,
            error: 'トークンが無効です',
          },
          401
        )
      }
    } catch (error) {
      console.error('Auth middleware error:', error)
      return c.json(
        {
          success: false,
          error: '認証処理でエラーが発生しました',
        },
        500
      )
    }
  }
}

/**
 * 役割ベース認証ミドルウェア
 * 特定の役割（admin, teacher等）のユーザーのみアクセス許可
 */
export const roleAuthMiddleware = (allowedRoles: ('admin' | 'teacher' | 'user')[]) => {
  return async (c: Context, next: Next) => {
    const user = c.get('user')

    if (!user) {
      return c.json(
        {
          success: false,
          error: '認証が必要です',
        },
        401
      )
    }

    if (!allowedRoles.includes(user.role)) {
      return c.json(
        {
          success: false,
          error: 'アクセス権限がありません',
        },
        403
      )
    }

    await next()
  }
}

/**
 * 管理者専用ミドルウェア
 */
export const adminOnlyMiddleware = () => {
  return roleAuthMiddleware(['admin'])
}

/**
 * 教師以上（教師または管理者）ミドルウェア
 */
export const teacherOrAdminMiddleware = () => {
  return roleAuthMiddleware(['admin', 'teacher'])
}

/**
 * オプショナル認証ミドルウェア - セキュリティリスクのため削除
 * 認証なしでAPIにアクセスできる脆弱性があったため、このミドルウェアは削除されました。
 * すべてのAPIエンドポイントで適切な認証が必要です。
 */
// export const optionalAuthMiddleware = (getDB: () => Database) => { ... } // 削除済み

/**
 * セキュリティヘッダー設定ミドルウェア
 */
export const securityHeadersMiddleware = () => {
  return async (c: Context, next: Next) => {
    await next()

    // セキュリティヘッダー設定
    c.header('X-Content-Type-Options', 'nosniff')
    c.header('X-Frame-Options', 'DENY')
    c.header('X-XSS-Protection', '1; mode=block')
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')

    // CORS設定（必要に応じて調整）
    c.header('Access-Control-Allow-Origin', '*')
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  }
}
