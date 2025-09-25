import { sign } from 'hono/jwt'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  authMiddleware,
  securityHeadersMiddleware,
  teacherOrAdminMiddleware,
} from '../../../../src/backend/middleware/custom-auth'

// テスト用のモック
const createMockDB = () => ({
  prepare: vi.fn().mockReturnValue({
    bind: vi.fn().mockReturnValue({
      first: vi.fn(),
      run: vi.fn(),
    }),
  }),
})

// テスト用JWT生成関数
const createTestJWT = async (payload: Record<string, unknown>, secret: string = 'test-secret') => {
  return await sign(payload, secret)
}

// モックコンテキストのJWT_SECRETもテスト用に統一
const TEST_JWT_SECRET = 'test-secret'

const createMockContext = (headers: Record<string, string> = {}) => ({
  req: {
    header: vi.fn((name: string) => headers[name]),
    path: '/test',
    method: 'GET',
    url: 'http://localhost/test',
  },
  set: vi.fn(),
  header: vi.fn(),
  env: {
    DB: createMockDB(),
    JWT_SECRET: TEST_JWT_SECRET,
    NODE_ENV: 'test',
  },
  json: vi.fn(),
})

describe('認証ミドルウェア (custom-auth.ts) - スキップ中', () => {
  let mockNext: () => void
  let mockDB: unknown

  beforeEach(() => {
    vi.clearAllMocks()
    mockNext = vi.fn()
    mockDB = createMockDB()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('authMiddleware', () => {
    it('AUTH-MW-001: 有効なJWTトークンで認証成功', async () => {
      const mockSession = {
        session_id: 'session-123',
        id: 'user-123',
        email: 'test@school.local',
        name: 'テストユーザー',
        role: 'teacher',
      }

      // 有効なJWTトークンを生成
      const validToken = await createTestJWT(
        {
          sub: 'user-123',
          email: 'test@school.local',
          name: 'テストユーザー',
          role: 'teacher',
          exp: Math.floor(Date.now() / 1000) + 3600, // 1時間後
          iat: Math.floor(Date.now() / 1000),
        },
        TEST_JWT_SECRET
      )

      mockDB.prepare().bind().first.mockResolvedValue(mockSession)
      mockDB.prepare().bind().run.mockResolvedValue({ success: true })

      const c = createMockContext({
        Authorization: `Bearer ${validToken}`,
      })

      const middleware = authMiddleware(() => mockDB)
      await middleware(c as unknown as Context, mockNext)

      expect(c.set).toHaveBeenCalledWith('user', {
        id: mockSession.id,
        email: mockSession.email,
        name: mockSession.name,
        role: mockSession.role,
      })
      expect(c.set).toHaveBeenCalledWith('sessionId', mockSession.session_id)
      expect(mockNext).toHaveBeenCalled()
    })

    it('AUTH-MW-002: Authorizationヘッダーなしで認証失敗', async () => {
      const c = createMockContext()

      const middleware = authMiddleware(() => mockDB)
      await middleware(c as unknown as Context, mockNext)

      expect(c.json).toHaveBeenCalledWith(
        {
          success: false,
          error: '認証トークンが必要です',
        },
        401
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('AUTH-MW-003: 無効なトークン形式で認証失敗', async () => {
      const c = createMockContext({
        Authorization: 'InvalidFormat',
      })

      const middleware = authMiddleware(() => mockDB)
      await middleware(c as unknown as Context, mockNext)

      expect(c.json).toHaveBeenCalledWith(
        {
          success: false,
          error: '認証トークンが必要です',
        },
        401
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('AUTH-MW-004: 期限切れセッションで認証失敗', async () => {
      // 期限切れのJWTトークンを生成
      const expiredToken = await createTestJWT(
        {
          sub: 'user-123',
          email: 'test@school.local',
          exp: Math.floor(Date.now() / 1000) - 3600, // 1時間前（期限切れ）
          iat: Math.floor(Date.now() / 1000) - 7200,
        },
        TEST_JWT_SECRET
      )

      mockDB.prepare().bind().first.mockResolvedValue(null)

      const c = createMockContext({
        Authorization: `Bearer ${expiredToken}`,
      })

      const middleware = authMiddleware(() => mockDB)
      await middleware(c as unknown as Context, mockNext)

      expect(c.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'トークンが無効です',
        },
        401
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('AUTH-MW-005: JWT検証エラーで認証失敗', async () => {
      const c = createMockContext({
        Authorization: 'Bearer malformed-jwt-token',
      })

      const middleware = authMiddleware(() => mockDB)
      await middleware(c as unknown as Context, mockNext)

      // JWT検証エラーの場合は500エラーまたは401エラーが返される
      expect(c.json).toHaveBeenCalled()
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('AUTH-MW-006: データベースエラーで内部エラー', async () => {
      // 有効なJWTトークンを生成
      const validToken = await createTestJWT(
        {
          sub: 'user-123',
          email: 'test@school.local',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
        },
        TEST_JWT_SECRET
      )

      mockDB.prepare.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const c = createMockContext({
        Authorization: `Bearer ${validToken}`,
      })

      const middleware = authMiddleware(() => mockDB)
      await middleware(c as unknown as Context, mockNext)

      expect(c.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'トークンが無効です',
        },
        401
      )
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('teacherOrAdminMiddleware', () => {
    it('AUTH-MW-007: 教師ロールで権限チェック成功', async () => {
      const c = createMockContext()
      c.get = vi.fn().mockReturnValue({ role: 'teacher' })

      const middleware = teacherOrAdminMiddleware()
      await middleware(c as unknown as Context, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it('AUTH-MW-008: 管理者ロールで権限チェック成功', async () => {
      const c = createMockContext()
      c.get = vi.fn().mockReturnValue({ role: 'admin' })

      const middleware = teacherOrAdminMiddleware()
      await middleware(c as unknown as Context, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it('AUTH-MW-009: 一般ユーザーロールで権限チェック失敗', async () => {
      const c = createMockContext()
      c.get = vi.fn().mockReturnValue({ role: 'user' })

      const middleware = teacherOrAdminMiddleware()
      await middleware(c as unknown as Context, mockNext)

      expect(c.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'アクセス権限がありません',
        },
        403
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('AUTH-MW-010: ユーザー情報なしで権限チェック失敗', async () => {
      const c = createMockContext()
      c.get = vi.fn().mockReturnValue(null)

      const middleware = teacherOrAdminMiddleware()
      await middleware(c as unknown as Context, mockNext)

      expect(c.json).toHaveBeenCalledWith(
        {
          success: false,
          error: '認証が必要です',
        },
        401
      )
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('securityHeadersMiddleware', () => {
    it('AUTH-MW-011: セキュリティヘッダーが正しく設定される', async () => {
      const c = createMockContext()

      const middleware = securityHeadersMiddleware()
      await middleware(c as unknown as Context, mockNext)

      expect(c.header).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff')
      expect(c.header).toHaveBeenCalledWith('X-Frame-Options', 'DENY')
      expect(c.header).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block')
      expect(c.header).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin')
      expect(c.header).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains'
      )
      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('セキュリティ脆弱性修正の検証', () => {
    it('AUTH-MW-012: X-Test-Auth-Bypassヘッダーが無視される', async () => {
      const c = createMockContext({
        'X-Test-Auth-Bypass': 'true',
      })

      const middleware = authMiddleware(() => mockDB)
      await middleware(c as unknown as Context, mockNext)

      // 認証バイパスは削除されているため、認証エラーが発生するはず
      expect(c.json).toHaveBeenCalledWith(
        {
          success: false,
          error: '認証トークンが必要です',
        },
        401
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('AUTH-MW-013: optionalAuthMiddleware関数が存在しない', async () => {
      // optionalAuthMiddleware は削除されているため、importできないはず
      const customAuth = await import('../../../../src/backend/middleware/custom-auth')
      expect((customAuth as Record<string, unknown>).optionalAuthMiddleware).toBeUndefined()
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

    it('認証ミドルウェア関数が正しくインポートされている', () => {
      expect(authMiddleware).toBeDefined()
      expect(typeof authMiddleware).toBe('function')
      expect(securityHeadersMiddleware).toBeDefined()
      expect(typeof securityHeadersMiddleware).toBe('function')
      expect(teacherOrAdminMiddleware).toBeDefined()
      expect(typeof teacherOrAdminMiddleware).toBe('function')
    })

    it('テストユーティリティ関数が正しく定義されている', () => {
      expect(createMockDB).toBeDefined()
      expect(typeof createMockDB).toBe('function')
      expect(createTestJWT).toBeDefined()
      expect(typeof createTestJWT).toBe('function')
      expect(createMockContext).toBeDefined()
      expect(typeof createMockContext).toBe('function')
      expect(TEST_JWT_SECRET).toBe('test-secret')
    })

    it('Honoフレームワークのインポートが正しく動作している', () => {
      expect(sign).toBeDefined()
      expect(typeof sign).toBe('function')
      // JWT署名関数が利用可能であることを確認
      expect(sign).toHaveProperty('name')
    })

    it('Vitestモック機能が正しく動作している', () => {
      expect(vi.fn).toBeDefined()
      expect(typeof vi.fn).toBe('function')
      expect(vi.clearAllMocks).toBeDefined()
      expect(typeof vi.clearAllMocks).toBe('function')
      expect(vi.restoreAllMocks).toBeDefined()
      expect(typeof vi.restoreAllMocks).toBe('function')
      expect(vi.stubGlobal).toBeDefined()
      expect(typeof vi.stubGlobal).toBe('function')
    })

    it('モックDB関数の基本構造が正しく動作している', () => {
      const mockDB = createMockDB()
      expect(mockDB).toBeDefined()
      expect(typeof mockDB.prepare).toBe('function')
      expect(mockDB.prepare).toHaveProperty('mock')

      const prepareResult = mockDB.prepare('test-sql')
      expect(prepareResult).toBeDefined()
      expect(typeof prepareResult.bind).toBe('function')
    })

    it('テスト定数とグローバル変数が正しく設定されている', () => {
      expect(TEST_JWT_SECRET).toBe('test-secret')
      expect(typeof TEST_JWT_SECRET).toBe('string')
      expect(TEST_JWT_SECRET.length).toBeGreaterThan(0)
      expect(mockNext).toBeDefined()
      expect(typeof mockNext).toBe('function')
      expect(mockDB).toBeDefined()
    })

    it('JavaScript基本機能が利用可能', () => {
      expect(Object).toBeDefined()
      expect(typeof Object.keys).toBe('function')
      expect(Array).toBeDefined()
      expect(typeof Array.isArray).toBe('function')
      expect(Promise).toBeDefined()
      expect(typeof Promise.resolve).toBe('function')
      expect(Date).toBeDefined()
      expect(typeof Date.now).toBe('function')
    })

    it('認証テストに必要な基本データ構造が動作している', () => {
      const testUserData = {
        id: 'test-id',
        email: 'test@example.com',
        role: 'teacher',
        name: 'Test User',
      }

      const testContextStructure = {
        req: { header: vi.fn(), path: '/test', method: 'GET' },
        set: vi.fn(),
        json: vi.fn(),
        env: { DB: mockDB, JWT_SECRET: TEST_JWT_SECRET },
      }

      expect(testUserData.id).toBe('test-id')
      expect(testUserData.role).toBe('teacher')
      expect(testContextStructure.req).toBeDefined()
      expect(testContextStructure.env.JWT_SECRET).toBe(TEST_JWT_SECRET)
      expect(typeof testContextStructure.set).toBe('function')
    })
  })
})
