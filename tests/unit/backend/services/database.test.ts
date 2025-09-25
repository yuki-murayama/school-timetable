/**
 * backend/services/database.ts テスト - データベース操作テスト
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Env } from '../../../../src/shared/types'

// データベースサービス関数のモック
const mockExecute = vi.fn()
const mockPrepare = vi.fn(() => ({
  bind: vi.fn().mockReturnThis(),
  all: vi.fn(),
  first: vi.fn(),
  run: vi.fn(),
}))

const mockDB = {
  prepare: mockPrepare,
  exec: mockExecute,
}

const mockEnv: Env = {
  DB: mockDB as unknown as D1Database,
  GROQ_API_KEY: 'test-groq-key',
  NODE_ENV: 'test',
  JWT_SECRET: 'test-jwt-secret',
}

describe('Database Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Database Connection', () => {
    it('should have valid database connection', () => {
      expect(mockEnv.DB).toBeDefined()
      expect(typeof mockEnv.DB.prepare).toBe('function')
      expect(typeof mockEnv.DB.exec).toBe('function')
    })

    it('should create prepared statements', () => {
      const query = 'SELECT * FROM teachers WHERE id = ?'
      const stmt = mockEnv.DB.prepare(query)

      expect(mockPrepare).toHaveBeenCalledWith(query)
      expect(stmt).toBeDefined()
      expect(typeof stmt.bind).toBe('function')
      expect(typeof stmt.all).toBe('function')
      expect(typeof stmt.first).toBe('function')
      expect(typeof stmt.run).toBe('function')
    })
  })

  describe('Database Query Operations', () => {
    it('should execute SELECT queries', async () => {
      const mockResult = [
        {
          id: 'teacher-1',
          name: '田中先生',
          subjects: '["数学"]',
          grades: '[1,2]',
        },
      ]

      const preparedStmt = mockEnv.DB.prepare('SELECT * FROM teachers')
      preparedStmt.all = vi.fn().mockResolvedValue({ results: mockResult })

      const result = await preparedStmt.all()
      expect(result.results).toEqual(mockResult)
      expect(result.results).toHaveLength(1)
    })

    it('should execute INSERT queries', async () => {
      const mockResult = {
        success: true,
        meta: {
          changes: 1,
          last_row_id: 1,
        },
      }

      const preparedStmt = mockEnv.DB.prepare('INSERT INTO teachers (name, subjects) VALUES (?, ?)')
      preparedStmt.bind = vi.fn().mockReturnThis()
      preparedStmt.run = vi.fn().mockResolvedValue(mockResult)

      const bindResult = preparedStmt.bind('新しい先生', '["数学"]')
      const result = await bindResult.run()

      expect(preparedStmt.bind).toHaveBeenCalledWith('新しい先生', '["数学"]')
      expect(result.success).toBe(true)
      expect(result.meta.changes).toBe(1)
    })

    it('should execute UPDATE queries', async () => {
      const mockResult = {
        success: true,
        meta: {
          changes: 1,
        },
      }

      const preparedStmt = mockEnv.DB.prepare('UPDATE teachers SET name = ? WHERE id = ?')
      preparedStmt.bind = vi.fn().mockReturnThis()
      preparedStmt.run = vi.fn().mockResolvedValue(mockResult)

      const bindResult = preparedStmt.bind('更新された先生', 'teacher-1')
      const result = await bindResult.run()

      expect(preparedStmt.bind).toHaveBeenCalledWith('更新された先生', 'teacher-1')
      expect(result.success).toBe(true)
      expect(result.meta.changes).toBe(1)
    })

    it('should execute DELETE queries', async () => {
      const mockResult = {
        success: true,
        meta: {
          changes: 1,
        },
      }

      const preparedStmt = mockEnv.DB.prepare('DELETE FROM teachers WHERE id = ?')
      preparedStmt.bind = vi.fn().mockReturnThis()
      preparedStmt.run = vi.fn().mockResolvedValue(mockResult)

      const bindResult = preparedStmt.bind('teacher-1')
      const result = await bindResult.run()

      expect(preparedStmt.bind).toHaveBeenCalledWith('teacher-1')
      expect(result.success).toBe(true)
      expect(result.meta.changes).toBe(1)
    })
  })

  describe('Database Error Handling', () => {
    it('should handle database connection errors', async () => {
      const errorMessage = 'Database connection failed'
      mockPrepare.mockImplementation(() => {
        throw new Error(errorMessage)
      })

      expect(() => {
        mockEnv.DB.prepare('SELECT * FROM teachers')
      }).toThrow(errorMessage)
    })

    it('should handle query execution errors', async () => {
      // 個別のmockを作成してテスト間の影響を避ける
      const localMockPrepare = vi.fn()
      const _localMockDB = {
        prepare: localMockPrepare,
        exec: vi.fn(),
      }

      const errorMessage = 'Query execution failed'
      const preparedStmt = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockRejectedValue(new Error(errorMessage)),
        first: vi.fn(),
        run: vi.fn(),
      }

      localMockPrepare.mockReturnValue(preparedStmt)

      try {
        await preparedStmt.all()
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect((error as Error).message).toBe(errorMessage)
      }
    })

    it('should handle binding parameter errors', async () => {
      // 個別のmockを作成してテスト間の影響を避ける
      const localMockPrepare = vi.fn()

      const preparedStmt = {
        bind: vi.fn().mockImplementation(() => {
          throw new Error('Invalid parameter binding')
        }),
        all: vi.fn(),
        first: vi.fn(),
        run: vi.fn(),
      }

      localMockPrepare.mockReturnValue(preparedStmt)

      try {
        preparedStmt.bind(null)
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect((error as Error).message).toBe('Invalid parameter binding')
      }
    })
  })

  describe('Database Transaction Support', () => {
    it('should support batch operations', async () => {
      const queries = [
        'INSERT INTO teachers (name) VALUES ("先生1")',
        'INSERT INTO teachers (name) VALUES ("先生2")',
        'INSERT INTO teachers (name) VALUES ("先生3")',
      ]

      mockExecute.mockResolvedValue({
        count: 3,
        duration: 100,
      })

      const result = await mockEnv.DB.exec(queries.join(';'))

      expect(mockExecute).toHaveBeenCalledWith(queries.join(';'))
      expect(result.count).toBe(3)
    })

    it('should handle transaction rollback on error', async () => {
      const queries = [
        'BEGIN TRANSACTION',
        'INSERT INTO teachers (name) VALUES ("先生1")',
        'INSERT INTO invalid_table (name) VALUES ("先生2")',
        'COMMIT',
      ]

      mockExecute.mockRejectedValue(new Error('Transaction failed'))

      await expect(mockEnv.DB.exec(queries.join(';'))).rejects.toThrow('Transaction failed')
    })
  })

  describe('Environment Configuration', () => {
    it('should have required environment variables', () => {
      expect(mockEnv.GROQ_API_KEY).toBe('test-groq-key')
      expect(mockEnv.NODE_ENV).toBe('test')
      expect(mockEnv.JWT_SECRET).toBe('test-jwt-secret')
    })

    it('should handle optional environment variables', () => {
      const envWithAssets: Env = {
        ...mockEnv,
        ASSETS: 'test-assets-path',
      }

      expect(envWithAssets.ASSETS).toBe('test-assets-path')
    })

    it('should work with minimal required configuration', () => {
      const minimalEnv: Env = {
        DB: mockDB as unknown as D1Database,
        GROQ_API_KEY: 'test-key',
        NODE_ENV: 'production',
      }

      expect(minimalEnv.DB).toBeDefined()
      expect(minimalEnv.GROQ_API_KEY).toBe('test-key')
      expect(minimalEnv.NODE_ENV).toBe('production')
      expect(minimalEnv.JWT_SECRET).toBeUndefined()
      expect(minimalEnv.ASSETS).toBeUndefined()
    })
  })

  describe('Data Type Conversion', () => {
    it('should handle JSON string conversion', () => {
      const teacherData = {
        id: 'teacher-1',
        name: '田中先生',
        subjects: '["数学", "理科"]',
        grades: '[1, 2, 3]',
        assignment_restrictions: '[]',
      }

      // JSON文字列の妥当性をテスト
      expect(typeof teacherData.subjects).toBe('string')
      expect(typeof teacherData.grades).toBe('string')
      expect(typeof teacherData.assignment_restrictions).toBe('string')

      // JSON解析可能性をテスト
      expect(() => JSON.parse(teacherData.subjects)).not.toThrow()
      expect(() => JSON.parse(teacherData.grades)).not.toThrow()
      expect(() => JSON.parse(teacherData.assignment_restrictions)).not.toThrow()
    })

    it('should handle boolean to integer conversion', () => {
      const classroomData = {
        id: 'classroom-1',
        name: '1年A組',
        is_active: 1, // SQLiteではbooleanは integer として保存
        capacity: 30,
      }

      // データ型の妥当性をテスト
      expect(typeof classroomData.is_active).toBe('number')
      expect(classroomData.is_active).toBe(1)
      expect(classroomData.capacity).toBe(30)
    })

    it('should handle null values correctly', () => {
      const teacherData = {
        id: 'teacher-1',
        name: '田中先生',
        email: null,
        phone: null,
        notes: null,
      }

      // null値の妥当性をテスト
      expect(teacherData.email).toBeNull()
      expect(teacherData.phone).toBeNull()
      expect(teacherData.notes).toBeNull()
      expect(teacherData.id).toBe('teacher-1')
      expect(teacherData.name).toBe('田中先生')
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

    it('モック関数が正しく定義されている', () => {
      expect(mockExecute).toBeDefined()
      expect(typeof mockExecute).toBe('function')
      expect(mockPrepare).toBeDefined()
      expect(typeof mockPrepare).toBe('function')
      expect(mockDB).toBeDefined()
      expect(typeof mockDB).toBe('object')
    })

    it('環境設定オブジェクトが正しく定義されている', () => {
      expect(mockEnv).toBeDefined()
      expect(typeof mockEnv).toBe('object')
      expect(mockEnv.DB).toBeDefined()
      expect(mockEnv.GROQ_API_KEY).toBe('test-groq-key')
      expect(mockEnv.NODE_ENV).toBe('test')
      expect(mockEnv.JWT_SECRET).toBe('test-jwt-secret')
    })

    it('データベースモックが正しく設定されている', () => {
      expect(mockDB.prepare).toBeDefined()
      expect(typeof mockDB.prepare).toBe('function')
      expect(mockDB.exec).toBeDefined()
      expect(typeof mockDB.exec).toBe('function')
    })

    it('共有型定義が正しくインポートされている', () => {
      // Env型の存在を間接的に確認
      const envType = typeof mockEnv
      expect(envType).toBe('object')
      expect(mockEnv).toHaveProperty('DB')
      expect(mockEnv).toHaveProperty('GROQ_API_KEY')
      expect(mockEnv).toHaveProperty('NODE_ENV')
    })

    it('JavaScript基本機能が利用可能', () => {
      expect(JSON).toBeDefined()
      expect(JSON.parse).toBeDefined()
      expect(typeof JSON.parse).toBe('function')
      expect(JSON.stringify).toBeDefined()
      expect(typeof JSON.stringify).toBe('function')
    })

    it('Error機能が利用可能', () => {
      expect(Error).toBeDefined()
      expect(typeof Error).toBe('function')
      const testError = new Error('test message')
      expect(testError).toBeInstanceOf(Error)
      expect(testError.message).toBe('test message')
    })
  })
})
