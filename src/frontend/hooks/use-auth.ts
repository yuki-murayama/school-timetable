import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

// 認証ユーザースキーマ
const AuthUserSchema = z.object({
  id: z.string().min(1, 'ユーザーIDは必須です'),
  email: z.string().email('有効なメールアドレスが必要です'),
  name: z.string().min(1, '名前は必須です'),
  role: z.enum(['admin', 'teacher', 'user']),
  lastLoginAt: z.string().optional(),
  createdAt: z.string().optional(),
})

// ログインリクエストスキーマ
const LoginRequestSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
})

// API レスポンススキーマ
const LoginResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  user: AuthUserSchema.optional(),
  token: z.string().optional(),
  sessionId: z.string().optional(),
  expiresAt: z.string().optional(),
  error: z.string().optional(),
})

const VerifyResponseSchema = z.object({
  success: z.boolean(),
  user: AuthUserSchema.optional(),
  sessionId: z.string().optional(),
  expiresAt: z.string().optional(),
  error: z.string().optional(),
})

export type AuthUser = z.infer<typeof AuthUserSchema>
export type LoginRequest = z.infer<typeof LoginRequestSchema>

// ローカルストレージキー
const TOKEN_KEY = 'auth_token'
const SESSION_KEY = 'auth_session_id'
const USER_KEY = 'auth_user'

// API基盤URL - 本番環境では必ず/apiプレフィックスを使用
const API_BASE = '/api'
console.log('🔍 認証API Base URL:', API_BASE)
console.log('🔍 VITE_API_URL 環境変数:', import.meta.env.VITE_API_URL)

export function useCustomAuth() {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const tokenRef = useRef<string | null>(null)

  // トークンヘッダー作成
  const getAuthHeaders = useCallback(() => {
    const currentToken = token || tokenRef.current
    return currentToken
      ? {
          Authorization: `Bearer ${currentToken}`,
          'Content-Type': 'application/json',
        }
      : {
          'Content-Type': 'application/json',
        }
  }, [token])

  // ローカルストレージから認証情報を復元
  const restoreAuthState = useCallback(() => {
    try {
      const savedToken = localStorage.getItem(TOKEN_KEY)
      const savedSessionId = localStorage.getItem(SESSION_KEY)
      const savedUser = localStorage.getItem(USER_KEY)

      if (savedToken && savedSessionId && savedUser) {
        const parsedUser = JSON.parse(savedUser)
        const validatedUser = AuthUserSchema.parse(parsedUser)

        setToken(savedToken)
        setSessionId(savedSessionId)
        setUser(validatedUser)
        tokenRef.current = savedToken

        return true
      }
    } catch (error) {
      console.error('認証状態の復元に失敗:', error)
      // 破損したデータをクリア
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(SESSION_KEY)
      localStorage.removeItem(USER_KEY)
    }
    return false
  }, [])

  // 認証情報をローカルストレージに保存
  const saveAuthState = useCallback(
    (authToken: string, authSessionId: string, authUser: AuthUser) => {
      localStorage.setItem(TOKEN_KEY, authToken)
      localStorage.setItem(SESSION_KEY, authSessionId)
      localStorage.setItem(USER_KEY, JSON.stringify(authUser))

      setToken(authToken)
      setSessionId(authSessionId)
      setUser(authUser)
      tokenRef.current = authToken
    },
    []
  )

  // 認証情報をクリア
  const clearAuthState = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(USER_KEY)

    setToken(null)
    setSessionId(null)
    setUser(null)
    tokenRef.current = null
  }, [])

  // トークン検証
  const verifyToken = useCallback(async (): Promise<boolean> => {
    const currentToken = token || tokenRef.current
    if (!currentToken) {
      return false
    }

    try {
      const response = await fetch(`${API_BASE}/auth/verify`, {
        method: 'POST',
        headers: getAuthHeaders(),
      })

      const data = await response.json()
      const result = VerifyResponseSchema.parse(data)

      if (result.success && result.user) {
        // ユーザー情報を更新
        setUser(result.user)
        localStorage.setItem(USER_KEY, JSON.stringify(result.user))
        return true
      } else {
        // トークンが無効
        clearAuthState()
        return false
      }
    } catch (error) {
      console.error('トークン検証エラー:', error)
      clearAuthState()
      return false
    }
  }, [token, getAuthHeaders, clearAuthState])

  // ログイン
  const login = useCallback(
    async (credentials: LoginRequest): Promise<{ success: boolean; error?: string }> => {
      try {
        setError(null)
        setIsLoading(true)

        // リクエストデータの検証
        const validatedCredentials = LoginRequestSchema.parse(credentials)

        const loginUrl = `${API_BASE}/auth/login`
        console.log('🔍 ログインリクエスト URL:', loginUrl)
        console.log('🔍 ログインリクエストデータ:', validatedCredentials)

        const response = await fetch(loginUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(validatedCredentials),
        })

        console.log('🔍 ログインレスポンスステータス:', response.status)
        console.log('🔍 ログインレスポンスヘッダー:', [...response.headers.entries()])

        const data = await response.json()
        const result = LoginResponseSchema.parse(data)

        if (result.success && result.token && result.sessionId && result.user) {
          // ログイン成功
          saveAuthState(result.token, result.sessionId, result.user)
          setError(null)
          return { success: true }
        } else {
          // ログイン失敗
          const errorMessage = result.error || 'ログインに失敗しました'
          setError(errorMessage)
          return { success: false, error: errorMessage }
        }
      } catch (error) {
        console.error('ログインエラー:', error)
        const errorMessage = 'ログイン処理でエラーが発生しました'
        setError(errorMessage)
        return { success: false, error: errorMessage }
      } finally {
        setIsLoading(false)
      }
    },
    [saveAuthState]
  )

  // ログアウト
  const logout = useCallback(async (): Promise<void> => {
    try {
      const currentToken = token || tokenRef.current
      const currentSessionId = sessionId

      if (currentToken && currentSessionId) {
        // サーバーにログアウト通知
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ sessionId: currentSessionId }),
        })
      }
    } catch (error) {
      console.error('ログアウトエラー:', error)
    } finally {
      // ローカルの認証情報をクリア
      clearAuthState()
      setError(null)
    }
  }, [token, sessionId, getAuthHeaders, clearAuthState])

  // Fresh token getter（API互換性のため）
  const getFreshToken = useCallback(async (): Promise<string | null> => {
    const isValid = await verifyToken()
    if (isValid) {
      return token || tokenRef.current
    }
    return null
  }, [verifyToken, token])

  // 初期化
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true)

      // ローカルストレージから認証状態を復元
      const restored = restoreAuthState()

      if (restored) {
        // 本番環境では初期化時のトークン検証をスキップ（リソース不足エラー回避）
        console.log('🔍 認証状態復元完了、トークン検証をスキップ')
        // const isValid = await verifyToken()
        // if (!isValid) {
        //   clearAuthState()
        // }
      }

      setIsLoading(false)
    }

    initializeAuth()
  }, []) // 依存配列を空にして、コンポーネント初期化時のみ実行

  // 自動トークン更新（本番環境では無効化）
  useEffect(() => {
    if (!token) return

    // 本番環境ではリソース不足エラーを回避するため自動検証を無効化
    console.log('🔍 自動トークン更新は本番環境では無効化されています')

    // const interval = setInterval(async () => {
    //   await verifyToken()
    // }, 15 * 60 * 1000) // 15分ごとに検証

    // return () => clearInterval(interval)
  }, [token])

  // セッション切れ時の自動ログアウト（ログインページに強制移動）
  const handleSessionExpired = useCallback((): void => {
    console.warn('🚨 セッション切れを検出、認証状態をクリアしてログインページに移動します')
    clearAuthState()
    setError('セッションが期限切れになりました。再度ログインしてください。')
    // ログインページに強制移動
    navigate('/login', { replace: true })
  }, [clearAuthState, navigate])

  // APIクライアント用の共通オプションを生成
  const getApiOptions = useCallback(() => {
    return {
      token: token || tokenRef.current,
      getFreshToken,
      onSessionExpired: handleSessionExpired,
    }
  }, [token, getFreshToken, handleSessionExpired])

  // 権限チェック関数
  const hasRole = useCallback(
    (role: 'admin' | 'teacher' | 'user'): boolean => {
      if (!user) return false

      // 管理者はすべての権限を持つ
      if (user.role === 'admin') return true

      // 教師は教師権限以下を持つ
      if (user.role === 'teacher' && (role === 'teacher' || role === 'user')) return true

      // 一般ユーザーは一般ユーザー権限のみ
      if (user.role === 'user' && role === 'user') return true

      return false
    },
    [user]
  )

  const isAdmin = useCallback(() => hasRole('admin'), [hasRole])
  const isTeacher = useCallback(() => hasRole('teacher'), [hasRole])

  return {
    // 状態
    user,
    token,
    sessionId,
    isLoading,
    error,
    isAuthenticated: !!user && !!token,

    // 関数
    login,
    logout,
    verifyToken,
    getFreshToken,
    hasRole,
    isAdmin,
    isTeacher,
    handleSessionExpired, // セッション切れ時の自動処理

    // ユーティリティ
    getAuthHeaders,
    getApiOptions, // API クライアント用共通オプション
  }
}

// 自前認証システムのメインエクスポート
export const useAuth = useCustomAuth
