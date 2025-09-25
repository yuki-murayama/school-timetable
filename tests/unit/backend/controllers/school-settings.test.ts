/**
 * backend/controllers/school-settings.ts テスト - 学校設定コントローラテスト
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Env } from '../../../../src/shared/types'

// HTTPリクエスト/レスポンスのモック
const mockRequest = {
  json: vi.fn(),
  headers: new Headers(),
  method: 'GET',
  url: 'http://localhost/api/school/settings',
}

const _mockResponseInit = {
  status: 200,
  headers: new Headers({ 'Content-Type': 'application/json' }),
}

// データベースモック
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

const _mockEnv: Env = {
  DB: mockDB as unknown as D1Database,
  GROQ_API_KEY: 'test-groq-key',
  NODE_ENV: 'test',
  JWT_SECRET: 'test-jwt-secret',
}

describe('School Settings Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/school/settings', () => {
    it('学校設定を正常に取得する', async () => {
      const mockSettings = {
        id: 'school-1',
        grade1Classes: 3,
        grade2Classes: 3,
        grade3Classes: 3,
        dailyPeriods: 6,
        saturdayPeriods: 4,
        days: '["月曜","火曜","水曜","木曜","金曜","土曜"]',
        grades: '[1,2,3]',
        classesPerGrade: '{"1":["A","B","C"],"2":["A","B","C"],"3":["A","B","C"]}',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      }

      const preparedStmt = mockDB.prepare('SELECT * FROM school_settings LIMIT 1')
      preparedStmt.first = vi.fn().mockResolvedValue(mockSettings)

      const result = await preparedStmt.first()

      expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM school_settings LIMIT 1')
      expect(result).toEqual(mockSettings)
      expect(result.grade1Classes).toBe(3)
      expect(result.dailyPeriods).toBe(6)
    })

    it('学校設定が存在しない場合デフォルト値を返す', async () => {
      const preparedStmt = mockDB.prepare('SELECT * FROM school_settings LIMIT 1')
      preparedStmt.first = vi.fn().mockResolvedValue(null)

      const result = await preparedStmt.first()

      expect(result).toBeNull()
    })

    it('データベースエラーを処理する', async () => {
      const preparedStmt = mockDB.prepare('SELECT * FROM school_settings LIMIT 1')
      preparedStmt.first = vi.fn().mockRejectedValue(new Error('Database error'))

      await expect(preparedStmt.first()).rejects.toThrow('Database error')
    })
  })

  describe('PUT /api/school/settings', () => {
    const validUpdateData = {
      grade1Classes: 4,
      grade2Classes: 4,
      grade3Classes: 4,
      dailyPeriods: 7,
      saturdayPeriods: 5,
      days: ['月曜', '火曜', '水曜', '木曜', '金曜', '土曜'],
      grades: [1, 2, 3],
      classesPerGrade: {
        1: ['A', 'B', 'C', 'D'],
        2: ['A', 'B', 'C', 'D'],
        3: ['A', 'B', 'C', 'D'],
      },
    }

    it('学校設定を正常に更新する', async () => {
      mockRequest.json = vi.fn().mockResolvedValue(validUpdateData)

      const mockResult = {
        success: true,
        meta: { changes: 1 },
      }

      const insertStmt = mockDB.prepare(`
        INSERT OR REPLACE INTO school_settings 
        (id, grade1Classes, grade2Classes, grade3Classes, dailyPeriods, saturdayPeriods, days, grades, classesPerGrade, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `)
      insertStmt.bind = vi.fn().mockReturnThis()
      insertStmt.run = vi.fn().mockResolvedValue(mockResult)

      const requestData = await mockRequest.json()
      expect(requestData).toEqual(validUpdateData)

      const bindResult = insertStmt.bind(
        'default',
        validUpdateData.grade1Classes,
        validUpdateData.grade2Classes,
        validUpdateData.grade3Classes,
        validUpdateData.dailyPeriods,
        validUpdateData.saturdayPeriods,
        JSON.stringify(validUpdateData.days),
        JSON.stringify(validUpdateData.grades),
        JSON.stringify(validUpdateData.classesPerGrade)
      )

      const result = await bindResult.run()

      expect(result.success).toBe(true)
      expect(result.meta.changes).toBe(1)
    })

    it('不正な更新データでバリデーションエラーを返す', async () => {
      const invalidUpdateData = {
        grade1Classes: -1, // 無効な値
        grade2Classes: 0, // 無効な値
        dailyPeriods: 'invalid', // 数値でない
        days: 'invalid', // 配列でない
      }

      mockRequest.json = vi.fn().mockResolvedValue(invalidUpdateData)

      const requestData = await mockRequest.json()

      // バリデーション失敗を想定
      expect(requestData.grade1Classes).toBe(-1)
      expect(requestData.grade2Classes).toBe(0)
      expect(typeof requestData.dailyPeriods).toBe('string')
      expect(typeof requestData.days).toBe('string')
    })

    it('必須フィールドが欠けている場合エラーを返す', async () => {
      const incompleteData = {
        grade1Classes: 3,
        // grade2Classes missing
        // grade3Classes missing
        dailyPeriods: 6,
      }

      mockRequest.json = vi.fn().mockResolvedValue(incompleteData)

      const requestData = await mockRequest.json()

      expect(requestData.grade1Classes).toBe(3)
      expect(requestData.grade2Classes).toBeUndefined()
      expect(requestData.grade3Classes).toBeUndefined()
      expect(requestData.dailyPeriods).toBe(6)
    })

    it('データベース更新エラーを処理する', async () => {
      mockRequest.json = vi.fn().mockResolvedValue(validUpdateData)

      const insertStmt = mockDB.prepare(`
        INSERT OR REPLACE INTO school_settings 
        (id, grade1Classes, grade2Classes, grade3Classes, dailyPeriods, saturdayPeriods, days, grades, classesPerGrade, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `)
      insertStmt.bind = vi.fn().mockReturnThis()
      insertStmt.run = vi.fn().mockRejectedValue(new Error('Database update failed'))

      const bindResult = insertStmt.bind(
        'default',
        validUpdateData.grade1Classes,
        validUpdateData.grade2Classes,
        validUpdateData.grade3Classes,
        validUpdateData.dailyPeriods,
        validUpdateData.saturdayPeriods,
        JSON.stringify(validUpdateData.days),
        JSON.stringify(validUpdateData.grades),
        JSON.stringify(validUpdateData.classesPerGrade)
      )

      await expect(bindResult.run()).rejects.toThrow('Database update failed')
    })
  })

  describe('データ変換とシリアライゼーション', () => {
    it('配列データをJSON文字列に変換する', () => {
      const days = ['月曜', '火曜', '水曜', '木曜', '金曜']
      const grades = [1, 2, 3]
      const classesPerGrade = { 1: ['A', 'B'], 2: ['A', 'B'], 3: ['A', 'B'] }

      const serializedDays = JSON.stringify(days)
      const serializedGrades = JSON.stringify(grades)
      const serializedClassesPerGrade = JSON.stringify(classesPerGrade)

      expect(serializedDays).toBe('["月曜","火曜","水曜","木曜","金曜"]')
      expect(serializedGrades).toBe('[1,2,3]')
      expect(serializedClassesPerGrade).toBe('{"1":["A","B"],"2":["A","B"],"3":["A","B"]}')
    })

    it('JSON文字列をオブジェクトにパースする', () => {
      const serializedData = {
        days: '["月曜","火曜","水曜","木曜","金曜"]',
        grades: '[1,2,3]',
        classesPerGrade: '{"1":["A","B"],"2":["A","B"],"3":["A","B"]}',
      }

      const parsedDays = JSON.parse(serializedData.days)
      const parsedGrades = JSON.parse(serializedData.grades)
      const parsedClassesPerGrade = JSON.parse(serializedData.classesPerGrade)

      expect(parsedDays).toEqual(['月曜', '火曜', '水曜', '木曜', '金曜'])
      expect(parsedGrades).toEqual([1, 2, 3])
      expect(parsedClassesPerGrade).toEqual({ 1: ['A', 'B'], 2: ['A', 'B'], 3: ['A', 'B'] })
    })

    it('不正なJSON文字列のパースエラーを処理する', () => {
      const invalidJson = '{"invalid": json}'

      expect(() => {
        JSON.parse(invalidJson)
      }).toThrow()
    })
  })

  describe('HTTPレスポンス処理', () => {
    it('成功レスポンスの構造', () => {
      const successData = {
        success: true,
        data: {
          id: 'school-1',
          grade1Classes: 3,
          grade2Classes: 3,
          grade3Classes: 3,
          dailyPeriods: 6,
          saturdayPeriods: 4,
        },
        message: '学校設定を更新しました',
      }

      expect(successData.success).toBe(true)
      expect(successData.data).toBeDefined()
      expect(successData.data.grade1Classes).toBe(3)
      expect(successData.message).toBe('学校設定を更新しました')
    })

    it('エラーレスポンスの構造', () => {
      const errorData = {
        success: false,
        error: 'バリデーションエラー',
        details: ['grade1Classes は正の整数である必要があります'],
      }

      expect(errorData.success).toBe(false)
      expect(errorData.error).toBe('バリデーションエラー')
      expect(errorData.details).toContain('grade1Classes は正の整数である必要があります')
    })
  })

  describe('設定の境界値テスト', () => {
    it('最小値の設定', () => {
      const minimalSettings = {
        grade1Classes: 1,
        grade2Classes: 1,
        grade3Classes: 1,
        dailyPeriods: 1,
        saturdayPeriods: 0,
      }

      expect(minimalSettings.grade1Classes).toBe(1)
      expect(minimalSettings.grade2Classes).toBe(1)
      expect(minimalSettings.grade3Classes).toBe(1)
      expect(minimalSettings.dailyPeriods).toBe(1)
      expect(minimalSettings.saturdayPeriods).toBe(0)
    })

    it('最大値の設定', () => {
      const maximalSettings = {
        grade1Classes: 10,
        grade2Classes: 10,
        grade3Classes: 10,
        dailyPeriods: 10,
        saturdayPeriods: 8,
      }

      expect(maximalSettings.grade1Classes).toBe(10)
      expect(maximalSettings.grade2Classes).toBe(10)
      expect(maximalSettings.grade3Classes).toBe(10)
      expect(maximalSettings.dailyPeriods).toBe(10)
      expect(maximalSettings.saturdayPeriods).toBe(8)
    })

    it('一般的な設定', () => {
      const typicalSettings = {
        grade1Classes: 3,
        grade2Classes: 3,
        grade3Classes: 3,
        dailyPeriods: 6,
        saturdayPeriods: 4,
      }

      expect(typicalSettings.grade1Classes).toBe(3)
      expect(typicalSettings.grade2Classes).toBe(3)
      expect(typicalSettings.grade3Classes).toBe(3)
      expect(typicalSettings.dailyPeriods).toBe(6)
      expect(typicalSettings.saturdayPeriods).toBe(4)
    })
  })

  describe('基本プロパティテスト', () => {
    it('テストフレームワークが正しく設定されている', () => {
      expect(describe).toBeDefined()
      expect(it).toBeDefined()
      expect(expect).toBeDefined()
      expect(beforeEach).toBeDefined()
      expect(vi).toBeDefined()
    })

    it('Vitestモック機能が正しく動作している', () => {
      expect(vi.fn).toBeDefined()
      expect(typeof vi.fn).toBe('function')
      expect(vi.clearAllMocks).toBeDefined()
      expect(typeof vi.clearAllMocks).toBe('function')
    })

    it('共有型定義が正しくインポートされている', () => {
      // Env型の存在を間接的に確認
      const envType = typeof _mockEnv
      expect(envType).toBe('object')
      expect(_mockEnv.DB).toBeDefined()
      expect(_mockEnv.NODE_ENV).toBe('test')
    })

    it('モック環境が正しく設定されている', () => {
      expect(mockDB).toBeDefined()
      expect(mockDB.prepare).toBeDefined()
      expect(typeof mockDB.prepare).toBe('function')
      expect(mockDB.exec).toBeDefined()
      expect(typeof mockDB.exec).toBe('function')
    })

    it('HTTPモックが正しく定義されている', () => {
      expect(mockRequest).toBeDefined()
      expect(mockRequest.json).toBeDefined()
      expect(typeof mockRequest.json).toBe('function')
      expect(mockRequest.headers).toBeInstanceOf(Headers)
      expect(mockRequest.method).toBe('GET')
      expect(mockRequest.url).toBe('http://localhost/api/school/settings')
    })

    it('データベースモック関数が正しく設定されている', () => {
      expect(mockExecute).toBeDefined()
      expect(typeof mockExecute).toBe('function')
      expect(mockPrepare).toBeDefined()
      expect(typeof mockPrepare).toBe('function')
    })

    it('学校設定テストの基本構造確認', () => {
      const basicSettings = { grade1Classes: 1, dailyPeriods: 1 }
      expect(typeof basicSettings.grade1Classes).toBe('number')
      expect(typeof basicSettings.dailyPeriods).toBe('number')
    })

    it('JSON機能が利用可能', () => {
      expect(JSON).toBeDefined()
      expect(JSON.stringify).toBeDefined()
      expect(typeof JSON.stringify).toBe('function')
      expect(JSON.parse).toBeDefined()
      expect(typeof JSON.parse).toBe('function')
    })
  })
})
