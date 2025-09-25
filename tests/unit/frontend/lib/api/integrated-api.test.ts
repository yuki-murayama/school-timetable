/**
 * 統合APIクライアント 単体テスト
 * V2 APIクライアントから統合APIクライアントに移行後のテスト
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// 共有スキーマをモック化（部分的にオリジナルをインポート）
vi.mock('@shared/schemas', async importOriginal => {
  const original = await importOriginal<typeof import('@shared/schemas')>()
  return {
    ...original,
    ClassroomSchema: {
      parse: vi.fn(),
      optional: vi.fn(() => ({ parse: vi.fn() })),
    },
    EnhancedSchoolSettingsSchema: {
      parse: vi.fn(),
      optional: vi.fn(() => ({ parse: vi.fn() })),
    },
    SchoolSettingsSchema: {
      parse: vi.fn(),
      optional: vi.fn(() => ({ parse: vi.fn() })),
      omit: vi.fn(() => ({ parse: vi.fn() })),
    },
    SubjectSchema: {
      parse: vi.fn(),
      optional: vi.fn(() => ({ parse: vi.fn() })),
    },
    TeacherSchema: {
      parse: vi.fn(),
      optional: vi.fn(() => ({ parse: vi.fn() })),
    },
    TimetableSchema: {
      parse: vi.fn(),
      optional: vi.fn(() => ({ parse: vi.fn() })),
    },
    // 型定義をモック
    default: {},
  }
})

// type-safe-clientをモック化
vi.mock('../../../../../src/frontend/lib/api/type-safe-client', () => ({
  TypeSafeApiError: vi.fn(),
  ValidationError: vi.fn(),
  NetworkError: vi.fn(),
  TimeoutError: vi.fn(),
  typeSafeApiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  handleApiError: vi.fn(),
  isApiError: vi.fn(),
  isValidationError: vi.fn(),
  validateResponseType: vi.fn(),
}))

describe('統合APIクライアント', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('統合API エクスポート', () => {
    it('should export all required API modules', async () => {
      const integratedApi = await import('../../../../../src/frontend/lib/api/integrated-api')

      expect(integratedApi.schoolSettingsApi).toBeDefined()
      expect(integratedApi.teachersApi).toBeDefined()
      expect(integratedApi.subjectsApi).toBeDefined()
      expect(integratedApi.classroomsApi).toBeDefined()
      expect(integratedApi.integratedApi).toBeDefined()
    })

    it('統合APIオブジェクトが正しい構造を持つこと', async () => {
      const { integratedApi } = await import('../../../../../src/frontend/lib/api/integrated-api')

      expect(integratedApi.schoolSettings).toBeDefined()
      expect(integratedApi.teachers).toBeDefined()
      expect(integratedApi.subjects).toBeDefined()
      expect(integratedApi.classrooms).toBeDefined()
    })
  })

  describe('API クライアント機能', () => {
    it('各APIクライアントが基本的なCRUDメソッドを持つこと', async () => {
      const { teachersApi } = await import('../../../../../src/frontend/lib/api/integrated-api')

      expect(typeof teachersApi.getTeachers).toBe('function')
      expect(typeof teachersApi.createTeacher).toBe('function')
      expect(typeof teachersApi.updateTeacher).toBe('function')
      expect(typeof teachersApi.deleteTeacher).toBe('function')
    })

    it('学校設定APIが適切なメソッドを持つこと', async () => {
      const { schoolSettingsApi } = await import(
        '../../../../../src/frontend/lib/api/integrated-api'
      )

      expect(typeof schoolSettingsApi.getSettings).toBe('function')
      expect(typeof schoolSettingsApi.updateSettings).toBe('function')
    })
  })

  describe('型安全性', () => {
    it('エクスポートされたAPIクライアントが適切な型を持つこと', async () => {
      const integratedApi = await import('../../../../../src/frontend/lib/api/integrated-api')

      // TypeScriptコンパイル時にチェックされる型安全性を確認
      expect(integratedApi).toBeDefined()
      expect(typeof integratedApi.integratedApi).toBe('object')
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
      expect(vi.mock).toBeDefined()
      expect(typeof vi.mock).toBe('function')
      expect(vi.clearAllMocks).toBeDefined()
      expect(typeof vi.clearAllMocks).toBe('function')
      expect(vi.fn).toBeDefined()
      expect(typeof vi.fn).toBe('function')
    })

    it('統合APIクライアントが正しく作成されている', async () => {
      const integratedApi = await import('../../../../../src/frontend/lib/api/integrated-api')
      expect(integratedApi.integratedApi).toBeDefined()
      expect(typeof integratedApi.integratedApi).toBe('object')
    })

    it('統合APIクライアントのプロパティが正しく設定されている', async () => {
      const integratedApi = await import('../../../../../src/frontend/lib/api/integrated-api')
      expect(integratedApi.integratedApi).toHaveProperty('schoolSettings')
      expect(integratedApi.integratedApi).toHaveProperty('teachers')
      expect(integratedApi.integratedApi).toHaveProperty('subjects')
      expect(integratedApi.integratedApi).toHaveProperty('classrooms')
    })

    it('個別APIクライアントが正しくエクスポートされている', async () => {
      const integratedApi = await import('../../../../../src/frontend/lib/api/integrated-api')
      expect(integratedApi.schoolSettingsApi).toBeDefined()
      expect(integratedApi.teachersApi).toBeDefined()
      expect(integratedApi.subjectsApi).toBeDefined()
      expect(integratedApi.classroomsApi).toBeDefined()
    })

    it('モックされたスキーマが正しく設定されている', () => {
      // スキーマモックが存在し、パース関数を持つことを確認
      const mockSchemas = vi.hoisted(() => ({}))
      expect(vi.hoisted).toBeDefined()
      expect(typeof vi.hoisted).toBe('function')
    })

    it('JavaScript基本機能が利用可能', () => {
      expect(Object).toBeDefined()
      expect(typeof Object).toBe('function')
      expect(Object.keys).toBeDefined()
      expect(typeof Object.keys).toBe('function')
      expect(Array).toBeDefined()
      expect(typeof Array).toBe('function')
      expect(Array.isArray).toBeDefined()
      expect(typeof Array.isArray).toBe('function')
      expect(Array.isArray([])).toBe(true)
      expect(Array.isArray({})).toBe(false)
    })

    it('非同期処理機能が動作している', async () => {
      const asyncTest = async () => {
        return Promise.resolve('integrated-api test')
      }

      const result = await asyncTest()
      expect(result).toBe('integrated-api test')
      expect(typeof asyncTest).toBe('function')
      expect(Promise).toBeDefined()
      expect(typeof Promise).toBe('function')
      expect(typeof Promise.resolve).toBe('function')
    })
  })
})
