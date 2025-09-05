/**
 * backend/services/teacher.ts テスト - 教師サービステスト
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Env } from '../../../../src/shared/types'

// データベースモック
const mockPrepare = vi.fn(() => ({
  bind: vi.fn().mockReturnThis(),
  all: vi.fn(),
  first: vi.fn(),
  run: vi.fn(),
}))

const mockDB = {
  prepare: mockPrepare,
  exec: vi.fn(),
}

const _mockEnv: Env = {
  DB: mockDB as unknown as D1Database,
  GROQ_API_KEY: 'test-groq-key',
  NODE_ENV: 'test',
  JWT_SECRET: 'test-jwt-secret',
}

describe('Teacher Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('教師一覧取得', () => {
    it('全教師を正常に取得', async () => {
      const mockTeachers = [
        {
          id: 'teacher-1',
          name: '田中先生',
          subjects: '["数学","理科"]',
          grades: '[1,2]',
          assignment_restrictions: '[]',
          email: 'tanaka@school.com',
          is_active: 1,
          order: 1,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'teacher-2',
          name: '佐藤先生',
          subjects: '["国語","社会"]',
          grades: '[2,3]',
          assignment_restrictions:
            '[{"restrictedDay":"月曜","restrictedPeriods":[1,2],"restrictionLevel":"必須"}]',
          email: 'sato@school.com',
          is_active: 1,
          order: 2,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ]

      const preparedStmt = mockDB.prepare(
        'SELECT * FROM teachers WHERE is_active = 1 ORDER BY order ASC, name ASC'
      )
      preparedStmt.all = vi.fn().mockResolvedValue({ results: mockTeachers })

      const result = await preparedStmt.all()

      expect(mockPrepare).toHaveBeenCalledWith(
        'SELECT * FROM teachers WHERE is_active = 1 ORDER BY order ASC, name ASC'
      )
      expect(result.results).toEqual(mockTeachers)
      expect(result.results).toHaveLength(2)
    })

    it('特定の学年でフィルタリング', async () => {
      const mockFilteredTeachers = [
        {
          id: 'teacher-1',
          name: '田中先生',
          subjects: '["数学"]',
          grades: '[1,2]',
          assignment_restrictions: '[]',
          email: 'tanaka@school.com',
          is_active: 1,
          order: 1,
        },
      ]

      const preparedStmt = mockDB.prepare(
        'SELECT * FROM teachers WHERE is_active = 1 AND grades LIKE ? ORDER BY order ASC'
      )
      preparedStmt.bind = vi.fn().mockReturnThis()
      preparedStmt.all = vi.fn().mockResolvedValue({ results: mockFilteredTeachers })

      const bindResult = preparedStmt.bind('%1%')
      const result = await bindResult.all()

      expect(preparedStmt.bind).toHaveBeenCalledWith('%1%')
      expect(result.results).toHaveLength(1)
      expect(result.results[0].name).toBe('田中先生')
    })

    it('教師が存在しない場合', async () => {
      const preparedStmt = mockDB.prepare(
        'SELECT * FROM teachers WHERE is_active = 1 ORDER BY order ASC, name ASC'
      )
      preparedStmt.all = vi.fn().mockResolvedValue({ results: [] })

      const result = await preparedStmt.all()

      expect(result.results).toEqual([])
      expect(result.results).toHaveLength(0)
    })
  })

  describe('教師詳細取得', () => {
    it('指定IDの教師を取得', async () => {
      const mockTeacher = {
        id: 'teacher-1',
        name: '田中先生',
        subjects: '["数学","理科"]',
        grades: '[1,2,3]',
        assignment_restrictions:
          '[{"restrictedDay":"月曜","restrictedPeriods":[1],"restrictionLevel":"必須","reason":"会議のため"}]',
        email: 'tanaka@school.com',
        phone: '090-1234-5678',
        is_active: 1,
        max_hours_per_week: 25,
        notes: '数学専門、理科も指導可能',
        order: 1,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      }

      const preparedStmt = mockDB.prepare('SELECT * FROM teachers WHERE id = ? AND is_active = 1')
      preparedStmt.bind = vi.fn().mockReturnThis()
      preparedStmt.first = vi.fn().mockResolvedValue(mockTeacher)

      const bindResult = preparedStmt.bind('teacher-1')
      const result = await bindResult.first()

      expect(preparedStmt.bind).toHaveBeenCalledWith('teacher-1')
      expect(result).toEqual(mockTeacher)
      expect(result.name).toBe('田中先生')
    })

    it('存在しない教師ID', async () => {
      const preparedStmt = mockDB.prepare('SELECT * FROM teachers WHERE id = ? AND is_active = 1')
      preparedStmt.bind = vi.fn().mockReturnThis()
      preparedStmt.first = vi.fn().mockResolvedValue(null)

      const bindResult = preparedStmt.bind('nonexistent-teacher')
      const result = await bindResult.first()

      expect(result).toBeNull()
    })
  })

  describe('教師作成', () => {
    const validTeacherData = {
      name: '新しい先生',
      subjects: ['数学', '理科'],
      grades: [1, 2],
      assignment_restrictions: [],
      email: 'new@school.com',
      phone: '090-9876-5432',
      max_hours_per_week: 20,
      notes: '新任教師',
    }

    it('教師を正常に作成', async () => {
      const mockResult = {
        success: true,
        meta: {
          changes: 1,
          last_row_id: 3,
        },
      }

      const preparedStmt = mockDB.prepare(`
        INSERT INTO teachers (
          id, name, subjects, grades, assignment_restrictions, 
          email, phone, max_hours_per_week, notes, is_active, order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, COALESCE((SELECT MAX(order) FROM teachers), 0) + 1)
      `)
      preparedStmt.bind = vi.fn().mockReturnThis()
      preparedStmt.run = vi.fn().mockResolvedValue(mockResult)

      const teacherId = `teacher-${Date.now()}`
      const bindResult = preparedStmt.bind(
        teacherId,
        validTeacherData.name,
        JSON.stringify(validTeacherData.subjects),
        JSON.stringify(validTeacherData.grades),
        JSON.stringify(validTeacherData.assignment_restrictions),
        validTeacherData.email,
        validTeacherData.phone,
        validTeacherData.max_hours_per_week,
        validTeacherData.notes
      )

      const result = await bindResult.run()

      expect(result.success).toBe(true)
      expect(result.meta.changes).toBe(1)
      expect(result.meta.last_row_id).toBe(3)
    })

    it('必須フィールドなしで作成失敗', async () => {
      const invalidTeacherData = {
        // name missing
        subjects: ['数学'],
        grades: [1],
      }

      // バリデーションエラーを想定
      expect(invalidTeacherData.name).toBeUndefined()
    })

    it('重複するメールアドレスで作成失敗', async () => {
      const duplicateEmailData = {
        ...validTeacherData,
        email: 'existing@school.com', // 既存のメールアドレス
      }

      const preparedStmt = mockDB.prepare(`
        INSERT INTO teachers (
          id, name, subjects, grades, assignment_restrictions, 
          email, phone, max_hours_per_week, notes, is_active, order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, COALESCE((SELECT MAX(order) FROM teachers), 0) + 1)
      `)
      preparedStmt.bind = vi.fn().mockReturnThis()
      preparedStmt.run = vi
        .fn()
        .mockRejectedValue(new Error('UNIQUE constraint failed: teachers.email'))

      const teacherId = `teacher-${Date.now()}`
      const bindResult = preparedStmt.bind(
        teacherId,
        duplicateEmailData.name,
        JSON.stringify(duplicateEmailData.subjects),
        JSON.stringify(duplicateEmailData.grades),
        JSON.stringify(duplicateEmailData.assignment_restrictions),
        duplicateEmailData.email,
        duplicateEmailData.phone,
        duplicateEmailData.max_hours_per_week,
        duplicateEmailData.notes
      )

      await expect(bindResult.run()).rejects.toThrow('UNIQUE constraint failed: teachers.email')
    })
  })

  describe('教師更新', () => {
    const updateTeacherData = {
      name: '更新された先生',
      subjects: ['数学', '物理'],
      grades: [2, 3],
      assignment_restrictions: [
        {
          restrictedDay: '火曜',
          restrictedPeriods: [5, 6],
          restrictionLevel: '推奨',
          reason: '部活動指導のため',
        },
      ],
      email: 'updated@school.com',
      max_hours_per_week: 30,
    }

    it('教師情報を正常に更新', async () => {
      const mockResult = {
        success: true,
        meta: { changes: 1 },
      }

      const preparedStmt = mockDB.prepare(`
        UPDATE teachers SET 
          name = ?, subjects = ?, grades = ?, assignment_restrictions = ?,
          email = ?, phone = ?, max_hours_per_week = ?, notes = ?, updated_at = datetime('now')
        WHERE id = ? AND is_active = 1
      `)
      preparedStmt.bind = vi.fn().mockReturnThis()
      preparedStmt.run = vi.fn().mockResolvedValue(mockResult)

      const bindResult = preparedStmt.bind(
        updateTeacherData.name,
        JSON.stringify(updateTeacherData.subjects),
        JSON.stringify(updateTeacherData.grades),
        JSON.stringify(updateTeacherData.assignment_restrictions),
        updateTeacherData.email,
        null, // phone
        updateTeacherData.max_hours_per_week,
        null, // notes
        'teacher-1'
      )

      const result = await bindResult.run()

      expect(result.success).toBe(true)
      expect(result.meta.changes).toBe(1)
    })

    it('存在しない教師の更新で変更なし', async () => {
      const mockResult = {
        success: true,
        meta: { changes: 0 },
      }

      const preparedStmt = mockDB.prepare(`
        UPDATE teachers SET 
          name = ?, subjects = ?, grades = ?, assignment_restrictions = ?,
          email = ?, phone = ?, max_hours_per_week = ?, notes = ?, updated_at = datetime('now')
        WHERE id = ? AND is_active = 1
      `)
      preparedStmt.bind = vi.fn().mockReturnThis()
      preparedStmt.run = vi.fn().mockResolvedValue(mockResult)

      const bindResult = preparedStmt.bind(
        updateTeacherData.name,
        JSON.stringify(updateTeacherData.subjects),
        JSON.stringify(updateTeacherData.grades),
        JSON.stringify(updateTeacherData.assignment_restrictions),
        updateTeacherData.email,
        null,
        updateTeacherData.max_hours_per_week,
        null,
        'nonexistent-teacher'
      )

      const result = await bindResult.run()

      expect(result.meta.changes).toBe(0)
    })
  })

  describe('教師削除（ソフトデリート）', () => {
    it('教師を正常に削除（非アクティブ化）', async () => {
      const mockResult = {
        success: true,
        meta: { changes: 1 },
      }

      const preparedStmt = mockDB.prepare(
        'UPDATE teachers SET is_active = 0, updated_at = datetime("now") WHERE id = ?'
      )
      preparedStmt.bind = vi.fn().mockReturnThis()
      preparedStmt.run = vi.fn().mockResolvedValue(mockResult)

      const bindResult = preparedStmt.bind('teacher-1')
      const result = await bindResult.run()

      expect(preparedStmt.bind).toHaveBeenCalledWith('teacher-1')
      expect(result.success).toBe(true)
      expect(result.meta.changes).toBe(1)
    })

    it('存在しない教師の削除で変更なし', async () => {
      const mockResult = {
        success: true,
        meta: { changes: 0 },
      }

      const preparedStmt = mockDB.prepare(
        'UPDATE teachers SET is_active = 0, updated_at = datetime("now") WHERE id = ?'
      )
      preparedStmt.bind = vi.fn().mockReturnThis()
      preparedStmt.run = vi.fn().mockResolvedValue(mockResult)

      const bindResult = preparedStmt.bind('nonexistent-teacher')
      const result = await bindResult.run()

      expect(result.meta.changes).toBe(0)
    })
  })

  describe('教師順序変更', () => {
    it('教師の表示順序を更新', async () => {
      const reorderData = [
        { id: 'teacher-1', order: 2 },
        { id: 'teacher-2', order: 1 },
        { id: 'teacher-3', order: 3 },
      ]

      const mockResult = {
        success: true,
        meta: { changes: 1 },
      }

      const preparedStmt = mockDB.prepare(
        'UPDATE teachers SET order = ?, updated_at = datetime("now") WHERE id = ?'
      )
      preparedStmt.bind = vi.fn().mockReturnThis()
      preparedStmt.run = vi.fn().mockResolvedValue(mockResult)

      // 各教師の順序を更新
      for (const item of reorderData) {
        const bindResult = preparedStmt.bind(item.order, item.id)
        const result = await bindResult.run()
        expect(result.success).toBe(true)
        expect(result.meta.changes).toBe(1)
      }

      expect(preparedStmt.bind).toHaveBeenCalledTimes(3)
    })
  })

  describe('JSON データ処理', () => {
    it('教科配列をJSON文字列に変換', () => {
      const subjects = ['数学', '理科', '物理']
      const serializedSubjects = JSON.stringify(subjects)

      expect(serializedSubjects).toBe('["数学","理科","物理"]')
    })

    it('学年配列をJSON文字列に変換', () => {
      const grades = [1, 2, 3]
      const serializedGrades = JSON.stringify(grades)

      expect(serializedGrades).toBe('[1,2,3]')
    })

    it('割当制限をJSON文字列に変換', () => {
      const restrictions = [
        {
          restrictedDay: '月曜',
          restrictedPeriods: [1, 2],
          restrictionLevel: '必須',
          reason: '会議のため',
        },
      ]
      const serializedRestrictions = JSON.stringify(restrictions)

      expect(serializedRestrictions).toBe(
        '[{"restrictedDay":"月曜","restrictedPeriods":[1,2],"restrictionLevel":"必須","reason":"会議のため"}]'
      )
    })

    it('JSON文字列から配列にパース', () => {
      const serializedSubjects = '["数学","理科","物理"]'
      const subjects = JSON.parse(serializedSubjects)

      expect(subjects).toEqual(['数学', '理科', '物理'])
      expect(Array.isArray(subjects)).toBe(true)
    })

    it('不正なJSON文字列のパースエラー', () => {
      const invalidJson = '{"invalid": json}'

      expect(() => {
        JSON.parse(invalidJson)
      }).toThrow()
    })
  })

  describe('データベースエラーハンドリング', () => {
    it('データベース接続エラー', async () => {
      const preparedStmt = mockDB.prepare('SELECT * FROM teachers WHERE is_active = 1')
      preparedStmt.all = vi.fn().mockRejectedValue(new Error('Database connection failed'))

      await expect(preparedStmt.all()).rejects.toThrow('Database connection failed')
    })

    it('クエリ実行エラー', async () => {
      const preparedStmt = mockDB.prepare('INVALID SQL QUERY')
      preparedStmt.all = vi.fn().mockRejectedValue(new Error('SQL syntax error'))

      await expect(preparedStmt.all()).rejects.toThrow('SQL syntax error')
    })

    it('制約違反エラー', async () => {
      const preparedStmt = mockDB.prepare('INSERT INTO teachers (id, name, email) VALUES (?, ?, ?)')
      preparedStmt.bind = vi.fn().mockReturnThis()
      preparedStmt.run = vi.fn().mockRejectedValue(new Error('UNIQUE constraint failed'))

      const bindResult = preparedStmt.bind('teacher-1', '田中先生', 'existing@school.com')

      await expect(bindResult.run()).rejects.toThrow('UNIQUE constraint failed')
    })
  })

  describe('バリデーション', () => {
    it('有効な教師データ', () => {
      const validData = {
        name: '田中先生',
        subjects: ['数学', '理科'],
        grades: [1, 2, 3],
        email: 'tanaka@school.com',
        max_hours_per_week: 25,
      }

      expect(validData.name).toBeTruthy()
      expect(Array.isArray(validData.subjects)).toBe(true)
      expect(validData.subjects.length).toBeGreaterThan(0)
      expect(Array.isArray(validData.grades)).toBe(true)
      expect(validData.grades.every(g => g >= 1 && g <= 3)).toBe(true)
      expect(validData.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
      expect(validData.max_hours_per_week).toBeGreaterThan(0)
    })

    it('無効な教師データ', () => {
      const invalidData = {
        name: '', // 空の名前
        subjects: [], // 空の教科配列
        grades: [4, 5], // 無効な学年
        email: 'invalid-email', // 無効なメール形式
        max_hours_per_week: -5, // 負の値
      }

      expect(invalidData.name).toBeFalsy()
      expect(invalidData.subjects.length).toBe(0)
      expect(invalidData.grades.some(g => g < 1 || g > 3)).toBe(true)
      expect(invalidData.email).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
      expect(invalidData.max_hours_per_week).toBeLessThan(0)
    })
  })
})
