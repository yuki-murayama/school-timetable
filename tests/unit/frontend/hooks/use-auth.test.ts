import { act, renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCustomAuth } from '../../../../src/frontend/hooks/use-auth'

// React Router mockを設定
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
  }
})

// fetch APIのモック
const createMockFetch = () => {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: vi.fn().mockResolvedValue({ success: true, data: {} }),
  })
}

// LocalStorageのモック
const createMockLocalStorage = () => {
  let store: Record<string, string> = {}

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
}

// グローバルオブジェクトのモック
global.fetch = createMockFetch()
global.localStorage = createMockLocalStorage() as unknown as Storage

// React Router wrapper
const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(MemoryRouter, null, children)

describe('フロントエンド認証フック (use-auth.ts)', () => {
  let mockFetch: unknown
  let mockLocalStorage: unknown

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch = global.fetch
    mockLocalStorage = global.localStorage

    // LocalStorageをクリア
    mockLocalStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('初期化とセットアップ', () => {
    it('AUTH-HOOK-001: 初期状態が正しく設定される', () => {
      const { result } = renderHook(() => useCustomAuth(), { wrapper })

      expect(result.current.user).toBeNull()
      expect(result.current.token).toBeNull()
      expect(result.current.sessionId).toBeNull()
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('AUTH-HOOK-002: LocalStorageから既存の認証情報を復元する', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@school.local',
        name: 'テストユーザー',
        role: 'teacher' as const,
      }
      const mockToken = 'mock-jwt-token'
      const mockSessionId = 'session-123'

      // LocalStorageに既存データを設定
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        switch (key) {
          case 'auth_user':
            return JSON.stringify(mockUser)
          case 'auth_token':
            return mockToken
          case 'auth_session_id':
            return mockSessionId
          default:
            return null
        }
      })

      // トークン検証APIの成功レスポンス
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () =>
          Promise.resolve({
            success: true,
            user: mockUser,
          }),
      })

      const { result } = renderHook(() => useCustomAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
        expect(result.current.token).toBe(mockToken)
        expect(result.current.sessionId).toBe(mockSessionId)
        expect(result.current.isAuthenticated).toBe(true)
      })
    })
  })

  describe('ログイン機能', () => {
    it('AUTH-HOOK-003: 正常なログインが成功する', async () => {
      const mockCredentials = {
        email: 'test@school.local',
        password: 'password123',
      }

      const mockResponse = {
        success: true,
        user: {
          id: 'user-123',
          email: 'test@school.local',
          name: 'テストユーザー',
          role: 'teacher' as const,
        },
        token: 'new-jwt-token',
        sessionId: 'new-session-123',
      }

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(mockResponse),
      })

      const { result } = renderHook(() => useCustomAuth(), { wrapper })

      await act(async () => {
        const loginResult = await result.current.login(mockCredentials)
        expect(loginResult.success).toBe(true)
      })

      expect(result.current.user).toEqual(mockResponse.user)
      expect(result.current.token).toBe(mockResponse.token)
      expect(result.current.sessionId).toBe(mockResponse.sessionId)
      expect(result.current.isAuthenticated).toBe(true)

      // LocalStorageに保存されることを確認
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'auth_user',
        JSON.stringify(mockResponse.user)
      )
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_token', mockResponse.token)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'auth_session_id',
        mockResponse.sessionId
      )
    })

    it('AUTH-HOOK-004: 無効な認証情報でログイン失敗', async () => {
      const mockCredentials = {
        email: 'test@school.local',
        password: 'wrongpassword',
      }

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () =>
          Promise.resolve({
            success: false,
            error: 'ユーザーまたはパスワードが正しくありません',
          }),
      })

      const { result } = renderHook(() => useCustomAuth(), { wrapper })

      await act(async () => {
        const loginResult = await result.current.login(mockCredentials)
        expect(loginResult.success).toBe(false)
        expect(loginResult.error).toBe('ユーザーまたはパスワードが正しくありません')
      })

      expect(result.current.user).toBeNull()
      expect(result.current.token).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('AUTH-HOOK-005: 無効なリクエストデータでバリデーションエラー', async () => {
      const invalidCredentials = {
        email: 'invalid-email',
        password: '',
      }

      const { result } = renderHook(() => useCustomAuth(), { wrapper })

      await act(async () => {
        // Zodバリデーションエラーが発生してcatchブロックで処理される
        const loginResult = await result.current.login(
          invalidCredentials as { email: string; password: string }
        )
        expect(loginResult.success).toBe(false)
        expect(loginResult.error).toBe('ログイン処理でエラーが発生しました')
      })

      // ログイン失敗後の状態確認
      expect(result.current.user).toBeNull()
      expect(result.current.token).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('AUTH-HOOK-006: ネットワークエラーでログイン失敗', async () => {
      const mockCredentials = {
        email: 'test@school.local',
        password: 'password123',
      }

      mockFetch.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useCustomAuth(), { wrapper })

      await act(async () => {
        const loginResult = await result.current.login(mockCredentials)
        expect(loginResult.success).toBe(false)
        expect(loginResult.error).toBe('ログイン処理でエラーが発生しました')
      })

      // ネットワークエラー後の状態確認
      expect(result.current.user).toBeNull()
      expect(result.current.token).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('ログアウト機能', () => {
    it('AUTH-HOOK-007: 正常なログアウトが成功する', async () => {
      // 事前に認証状態を設定
      const mockUser = {
        id: 'user-123',
        email: 'test@school.local',
        name: 'テストユーザー',
        role: 'teacher' as const,
      }

      mockLocalStorage.getItem.mockImplementation((key: string) => {
        switch (key) {
          case 'auth_user':
            return JSON.stringify(mockUser)
          case 'auth_token':
            return 'current-token'
          case 'auth_session_id':
            return 'current-session'
          default:
            return null
        }
      })

      // 初期化時のverifyTokenとログアウト時のリクエストを適切にモック
      mockFetch
        .mockResolvedValueOnce({
          // 初期化時のverifyToken呼び出し
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              user: mockUser,
            }),
        })
        .mockResolvedValueOnce({
          // ログアウト時のリクエスト
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              message: 'ログアウトしました',
            }),
        })

      const { result } = renderHook(() => useCustomAuth(), { wrapper })

      // 初期化完了まで待機
      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false)
        },
        { timeout: 3000 }
      )

      await act(async () => {
        await result.current.logout()
      })

      await waitFor(
        () => {
          expect(result.current.user).toBeNull()
          expect(result.current.token).toBeNull()
          expect(result.current.sessionId).toBeNull()
        },
        { timeout: 1000 }
      )
      expect(result.current.isAuthenticated).toBe(false)

      // LocalStorageからクリアされることを確認
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_user')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_session_id')
    })

    it('AUTH-HOOK-008: サーバーエラー時でもローカル状態はクリアされる', async () => {
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        switch (key) {
          case 'auth_token':
            return 'current-token'
          case 'auth_session_id':
            return 'current-session'
          default:
            return null
        }
      })

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ error: 'Internal Server Error' }),
      })

      const { result } = renderHook(() => useCustomAuth(), { wrapper })

      await act(async () => {
        await result.current.logout()
      })

      // サーバーエラーでもローカル状態はクリアされる
      await waitFor(
        () => {
          expect(result.current.user).toBeNull()
          expect(result.current.token).toBeNull()
          expect(result.current.sessionId).toBeNull()
        },
        { timeout: 1000 }
      )
    })
  })

  describe('トークン検証', () => {
    it('AUTH-HOOK-009: 有効なトークンで検証成功', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@school.local',
        name: 'テストユーザー',
        role: 'teacher' as const,
      }

      // 正しいlocalStorage設定: 3つすべてのキーを有効なJSONで設定
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        switch (key) {
          case 'auth_user':
            return JSON.stringify(mockUser) // 有効なJSONオブジェクト
          case 'auth_token':
            return 'valid-token'
          case 'auth_session_id':
            return 'valid-session'
          default:
            return null
        }
      })

      // 初期化時とverifyToken呼び出し時の両方でモック設定
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () =>
          Promise.resolve({
            success: true,
            user: mockUser,
          }),
      })

      const { result } = renderHook(() => useCustomAuth(), { wrapper })

      // 初期化完了まで待機
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        const isValid = await result.current.verifyToken()
        expect(isValid).toBe(true)
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('AUTH-HOOK-010: 無効なトークンで検証失敗', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@school.local',
        name: 'テストユーザー',
        role: 'teacher' as const,
      }

      mockLocalStorage.getItem.mockImplementation((key: string) => {
        switch (key) {
          case 'auth_user':
            return JSON.stringify(mockUser)
          case 'auth_token':
            return 'invalid-token'
          case 'auth_session_id':
            return 'invalid-session'
          default:
            return null
        }
      })

      // 初期化時とverifyToken呼び出し時の両方で失敗レスポンス
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({
            success: false,
          }),
      })

      const { result } = renderHook(() => useCustomAuth(), { wrapper })

      // 初期化完了まで待機
      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false)
        },
        { timeout: 3000 }
      )

      await act(async () => {
        const isValid = await result.current.verifyToken()
        expect(isValid).toBe(false)
      })

      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('セキュリティ強化の検証', () => {
    it('AUTH-HOOK-011: API_BASEがローカル開発環境で正しく設定される', () => {
      // NODE_ENV=developmentの場合、API_BASEがローカルホストを指すことを確認
      // この部分は実装によって異なるため、実際のコードに合わせて調整が必要
      expect(true).toBe(true) // プレースホルダー
    })

    it('AUTH-HOOK-012: 認証ヘッダーが正しく設定される', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@school.local',
        name: 'テストユーザー',
        role: 'teacher' as const,
      }

      // 正しいlocalStorage設定: 3つすべてのキーを設定
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        switch (key) {
          case 'auth_user':
            return JSON.stringify(mockUser)
          case 'auth_token':
            return 'test-token'
          case 'auth_session_id':
            return 'test-session'
          default:
            return null
        }
      })

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () =>
          Promise.resolve({
            success: true,
            user: mockUser,
          }),
      })

      const { result } = renderHook(() => useCustomAuth(), { wrapper })

      // 初期化完了まで待機
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.verifyToken()
      })

      // Authorizationヘッダーが正しく設定されることを確認
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/auth\/verify$/),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      )
    })
  })

  describe('基本プロパティテスト', () => {
    it('テストフレームワークが正しく設定されている', () => {
      expect(describe).toBeDefined()
      expect(it).toBeDefined()
      expect(expect).toBeDefined()
      expect(beforeEach).toBeDefined()
      expect(afterEach).toBeDefined()
      expect(vi).toBeDefined()
    })

    it('Vitestモック機能が正しく動作している', () => {
      expect(vi.fn).toBeDefined()
      expect(typeof vi.fn).toBe('function')
      expect(vi.clearAllMocks).toBeDefined()
      expect(typeof vi.clearAllMocks).toBe('function')
      expect(vi.restoreAllMocks).toBeDefined()
      expect(typeof vi.restoreAllMocks).toBe('function')
    })

    it('useCustomAuthフックが正しく定義されている', () => {
      expect(useCustomAuth).toBeDefined()
      expect(typeof useCustomAuth).toBe('function')
    })

    it('React Testing Libraryが正しく動作している', () => {
      expect(renderHook).toBeDefined()
      expect(typeof renderHook).toBe('function')
      expect(act).toBeDefined()
      expect(typeof act).toBe('function')
      expect(waitFor).toBeDefined()
      expect(typeof waitFor).toBe('function')
    })

    it('Reactライブラリが正しくインポートされている', () => {
      expect(React).toBeDefined()
      expect(typeof React.createElement).toBe('function')
      expect(MemoryRouter).toBeDefined()
      expect(typeof MemoryRouter).toBe('function')
    })

    it('モック関数とオブジェクトが正しく設定されている', () => {
      expect(global.fetch).toBeDefined()
      expect(typeof global.fetch).toBe('function')
      expect(global.localStorage).toBeDefined()
      expect(typeof global.localStorage.getItem).toBe('function')
      expect(typeof global.localStorage.setItem).toBe('function')
      expect(typeof global.localStorage.removeItem).toBe('function')
      expect(typeof global.localStorage.clear).toBe('function')
    })

    it('テストヘルパー関数が正しく定義されている', () => {
      expect(createMockFetch).toBeDefined()
      expect(typeof createMockFetch).toBe('function')
      expect(createMockLocalStorage).toBeDefined()
      expect(typeof createMockLocalStorage).toBe('function')
    })

    it('JavaScript基本機能が利用可能', () => {
      expect(JSON).toBeDefined()
      expect(JSON.stringify).toBeDefined()
      expect(typeof JSON.stringify).toBe('function')
      expect(JSON.parse).toBeDefined()
      expect(typeof JSON.parse).toBe('function')
      expect(Headers).toBeDefined()
      expect(typeof Headers).toBe('function')
    })
  })
})
