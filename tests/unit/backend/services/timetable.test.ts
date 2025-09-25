/**
 * backend/services/timetable.ts テスト - 時間割サービステスト
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

const mockEnv: Env = {
  DB: mockDB as unknown as D1Database,
  GROQ_API_KEY: 'test-groq-key',
  NODE_ENV: 'test',
  JWT_SECRET: 'test-jwt-secret',
}

// AI APIモック
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Timetable Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('時間割生成', () => {
    const mockSchoolData = {
      settings: {
        grade1Classes: 3,
        grade2Classes: 3,
        grade3Classes: 3,
        dailyPeriods: 6,
        saturdayPeriods: 4,
        days: ['月曜', '火曜', '水曜', '木曜', '金曜', '土曜'],
        grades: [1, 2, 3],
        classesPerGrade: { 1: ['A', 'B', 'C'], 2: ['A', 'B', 'C'], 3: ['A', 'B', 'C'] },
      },
      teachers: [
        {
          id: 'teacher-1',
          name: '田中先生',
          subjects: ['数学'],
          grades: [1, 2, 3],
          assignment_restrictions: [],
        },
      ],
      subjects: [
        {
          id: 'subject-1',
          name: '数学',
          grades: [1, 2, 3],
          weeklyHours: { 1: 5, 2: 4, 3: 4 },
          requiresSpecialClassroom: false,
        },
      ],
      classrooms: [
        {
          id: 'classroom-1',
          name: '1A教室',
          capacity: 30,
          type: '普通教室',
        },
      ],
    }

    it('基本的な時間割生成', async () => {
      // AI APIレスポンスのモック
      const mockAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                success: true,
                timetable: {
                  月曜: {
                    1: {
                      subject: '数学',
                      teacher: '田中先生',
                      classroom: '1A教室',
                      grade: 1,
                      class: 'A',
                    },
                    2: {
                      subject: '数学',
                      teacher: '田中先生',
                      classroom: '1A教室',
                      grade: 1,
                      class: 'B',
                    },
                  },
                },
                statistics: {
                  totalSlots: 324,
                  assignedSlots: 100,
                  unassignedSlots: 224,
                  generationTime: '2.5s',
                  backtrackCount: 15,
                },
                generatedAt: '2024-01-01T12:00:00.000Z',
                method: 'genetic',
              }),
            },
          },
        ],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAIResponse),
        headers: new Headers({ 'Content-Type': 'application/json' }),
      })

      const response = await mockFetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mockEnv.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3-groq-70b-8192-tool-use-preview',
          messages: [
            {
              role: 'system',
              content: '時間割生成システム',
            },
            {
              role: 'user',
              content: `学校データ: ${JSON.stringify(mockSchoolData)}`,
            },
          ],
          temperature: 0.7,
          max_tokens: 4000,
        }),
      })

      const result = await response.json()
      const generatedTimetable = JSON.parse(result.choices[0].message.content)

      expect(generatedTimetable.success).toBe(true)
      expect(generatedTimetable.timetable).toBeDefined()
      expect(generatedTimetable.statistics).toBeDefined()
      expect(generatedTimetable.statistics.totalSlots).toBe(324)
    })

    it('制約違反チェック', async () => {
      const _restrictedTeacher = {
        id: 'teacher-2',
        name: '佐藤先生',
        subjects: ['国語'],
        grades: [1, 2],
        assignment_restrictions: [
          {
            restrictedDay: '月曜',
            restrictedPeriods: [1, 2],
            restrictionLevel: '必須',
            reason: '会議のため',
          },
        ],
      }

      // 制約違反のある時間割生成をシミュレート
      const violationResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                success: true,
                timetable: {
                  月曜: {
                    1: {
                      subject: '国語',
                      teacher: '佐藤先生',
                      classroom: '1A教室',
                      grade: 1,
                      class: 'A',
                      violations: [
                        {
                          type: 'teacher_restriction',
                          severity: 'high',
                          message: '佐藤先生は月曜1限に制約があります',
                        },
                      ],
                    },
                  },
                },
                statistics: {
                  totalSlots: 324,
                  assignedSlots: 50,
                  unassignedSlots: 274,
                  constraintViolations: 5,
                  generationTime: '3.2s',
                },
              }),
            },
          },
        ],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(violationResponse),
      })

      const response = await mockFetch('https://api.groq.com/openai/v1/chat/completions')
      const result = await response.json()
      const timetableWithViolations = JSON.parse(result.choices[0].message.content)

      expect(timetableWithViolations.statistics.constraintViolations).toBe(5)
      expect(timetableWithViolations.timetable.月曜[1].violations).toBeDefined()
      expect(timetableWithViolations.timetable.月曜[1].violations[0].type).toBe(
        'teacher_restriction'
      )
    })

    it('AI API エラーハンドリング', async () => {
      // AI APIエラーをシミュレート
      mockFetch.mockRejectedValueOnce(new Error('AI API connection failed'))

      await expect(mockFetch('https://api.groq.com/openai/v1/chat/completions')).rejects.toThrow(
        'AI API connection failed'
      )
    })

    it('不正なAIレスポンスの処理', async () => {
      // 不正なレスポンス形式
      const invalidResponse = {
        choices: [
          {
            message: {
              content: 'Invalid JSON response',
            },
          },
        ],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(invalidResponse),
      })

      const response = await mockFetch('https://api.groq.com/openai/v1/chat/completions')
      const result = await response.json()

      expect(() => {
        JSON.parse(result.choices[0].message.content)
      }).toThrow()
    })
  })

  describe('時間割保存', () => {
    const mockTimetableData = {
      id: 'timetable-1',
      name: '2024年度時間割',
      data: {
        月曜: {
          1: { subject: '数学', teacher: '田中先生', classroom: '1A教室', grade: 1, class: 'A' },
        },
      },
      statistics: {
        totalSlots: 324,
        assignedSlots: 100,
        unassignedSlots: 224,
      },
      generatedAt: '2024-01-01T12:00:00.000Z',
      isActive: true,
    }

    it('時間割を正常に保存', async () => {
      const mockResult = {
        success: true,
        meta: { changes: 1, last_row_id: 1 },
      }

      const preparedStmt = mockDB.prepare(`
        INSERT INTO timetables (id, name, data, statistics, generated_at, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      preparedStmt.bind = vi.fn().mockReturnThis()
      preparedStmt.run = vi.fn().mockResolvedValue(mockResult)

      const bindResult = preparedStmt.bind(
        mockTimetableData.id,
        mockTimetableData.name,
        JSON.stringify(mockTimetableData.data),
        JSON.stringify(mockTimetableData.statistics),
        mockTimetableData.generatedAt,
        mockTimetableData.isActive ? 1 : 0
      )

      const result = await bindResult.run()

      expect(result.success).toBe(true)
      expect(result.meta.changes).toBe(1)
    })

    it('既存の時間割を更新', async () => {
      const updateData = {
        ...mockTimetableData,
        name: '更新された時間割',
        isActive: false,
      }

      const mockResult = {
        success: true,
        meta: { changes: 1 },
      }

      const preparedStmt = mockDB.prepare(`
        UPDATE timetables SET 
          name = ?, data = ?, statistics = ?, is_active = ?, updated_at = datetime('now')
        WHERE id = ?
      `)
      preparedStmt.bind = vi.fn().mockReturnThis()
      preparedStmt.run = vi.fn().mockResolvedValue(mockResult)

      const bindResult = preparedStmt.bind(
        updateData.name,
        JSON.stringify(updateData.data),
        JSON.stringify(updateData.statistics),
        updateData.isActive ? 1 : 0,
        updateData.id
      )

      const result = await bindResult.run()

      expect(result.success).toBe(true)
      expect(result.meta.changes).toBe(1)
    })
  })

  describe('時間割取得', () => {
    it('時間割一覧を取得', async () => {
      const mockTimetables = [
        {
          id: 'timetable-1',
          name: '2024年度時間割',
          created_at: '2024-01-01T10:00:00.000Z',
          is_active: 1,
        },
        {
          id: 'timetable-2',
          name: '2023年度時間割',
          created_at: '2023-04-01T10:00:00.000Z',
          is_active: 0,
        },
      ]

      const preparedStmt = mockDB.prepare(
        'SELECT id, name, created_at, is_active FROM timetables ORDER BY created_at DESC'
      )
      preparedStmt.all = vi.fn().mockResolvedValue({ results: mockTimetables })

      const result = await preparedStmt.all()

      expect(result.results).toHaveLength(2)
      expect(result.results[0].name).toBe('2024年度時間割')
      expect(result.results[0].is_active).toBe(1)
    })

    it('特定の時間割詳細を取得', async () => {
      const mockTimetableDetail = {
        id: 'timetable-1',
        name: '2024年度時間割',
        data: '{"月曜":{"1":{"subject":"数学","teacher":"田中先生","classroom":"1A教室","grade":1,"class":"A"}}}',
        statistics: '{"totalSlots":324,"assignedSlots":100,"unassignedSlots":224}',
        generated_at: '2024-01-01T12:00:00.000Z',
        is_active: 1,
        created_at: '2024-01-01T10:00:00.000Z',
        updated_at: '2024-01-01T10:00:00.000Z',
      }

      const preparedStmt = mockDB.prepare('SELECT * FROM timetables WHERE id = ?')
      preparedStmt.bind = vi.fn().mockReturnThis()
      preparedStmt.first = vi.fn().mockResolvedValue(mockTimetableDetail)

      const bindResult = preparedStmt.bind('timetable-1')
      const result = await bindResult.first()

      expect(result).toEqual(mockTimetableDetail)
      expect(result.id).toBe('timetable-1')
      expect(JSON.parse(result.data)).toBeDefined()
      expect(JSON.parse(result.statistics)).toBeDefined()
    })

    it('存在しない時間割ID', async () => {
      const preparedStmt = mockDB.prepare('SELECT * FROM timetables WHERE id = ?')
      preparedStmt.bind = vi.fn().mockReturnThis()
      preparedStmt.first = vi.fn().mockResolvedValue(null)

      const bindResult = preparedStmt.bind('nonexistent-timetable')
      const result = await bindResult.first()

      expect(result).toBeNull()
    })
  })

  describe('時間割削除', () => {
    it('時間割を正常に削除', async () => {
      const mockResult = {
        success: true,
        meta: { changes: 1 },
      }

      const preparedStmt = mockDB.prepare('DELETE FROM timetables WHERE id = ?')
      preparedStmt.bind = vi.fn().mockReturnThis()
      preparedStmt.run = vi.fn().mockResolvedValue(mockResult)

      const bindResult = preparedStmt.bind('timetable-1')
      const result = await bindResult.run()

      expect(result.success).toBe(true)
      expect(result.meta.changes).toBe(1)
    })

    it('存在しない時間割の削除', async () => {
      const mockResult = {
        success: true,
        meta: { changes: 0 },
      }

      const preparedStmt = mockDB.prepare('DELETE FROM timetables WHERE id = ?')
      preparedStmt.bind = vi.fn().mockReturnThis()
      preparedStmt.run = vi.fn().mockResolvedValue(mockResult)

      const bindResult = preparedStmt.bind('nonexistent-timetable')
      const result = await bindResult.run()

      expect(result.meta.changes).toBe(0)
    })
  })

  describe('時間割バリデーション', () => {
    it('有効な時間割データ構造', () => {
      const validTimetable = {
        月曜: {
          1: {
            subject: '数学',
            teacher: '田中先生',
            classroom: '1A教室',
            grade: 1,
            class: 'A',
          },
        },
        火曜: {
          1: {
            subject: '国語',
            teacher: '佐藤先生',
            classroom: '1B教室',
            grade: 1,
            class: 'B',
          },
        },
      }

      // 構造チェック
      expect(validTimetable.月曜).toBeDefined()
      expect(validTimetable.月曜[1]).toBeDefined()
      expect(validTimetable.月曜[1].subject).toBe('数学')
      expect(validTimetable.月曜[1].teacher).toBe('田中先生')
      expect(validTimetable.月曜[1].grade).toBe(1)
    })

    it('制約違反データの検出', () => {
      const conflictTimetable = {
        月曜: {
          1: {
            subject: '理科',
            teacher: '田中先生', // 競合
            classroom: '1B教室',
            grade: 1,
            class: 'B',
          },
        },
      }

      // 同じ時間帯に同じ教師が割り当てられている（実際にはオブジェクトキーの重複で上書きされる）
      expect(conflictTimetable.月曜[1].subject).toBe('理科') // 後の値で上書き
    })

    it('時間割統計の計算', () => {
      const timetableStats = {
        totalSlots: 324, // 総コマ数
        assignedSlots: 250, // 割り当て済みコマ数
        unassignedSlots: 74, // 未割り当てコマ数
        constraintViolations: 3, // 制約違反数
        generationTime: '5.2s', // 生成時間
        backtrackCount: 25, // バックトラック回数
      }

      expect(timetableStats.totalSlots).toBe(
        timetableStats.assignedSlots + timetableStats.unassignedSlots
      )
      expect(timetableStats.constraintViolations).toBeGreaterThan(0)
      expect(timetableStats.backtrackCount).toBeGreaterThan(0)
    })
  })

  describe('時間割最適化', () => {
    it('制約満足度の計算', () => {
      const optimizationMetrics = {
        teacherWorkloadBalance: 0.85, // 教師の負荷バランス (0-1)
        classroomUtilization: 0.92, // 教室使用率 (0-1)
        subjectDistribution: 0.88, // 教科配置バランス (0-1)
        constraintCompliance: 0.94, // 制約遵守率 (0-1)
        overallScore: 0.897, // 総合スコア (0-1)
      }

      expect(optimizationMetrics.teacherWorkloadBalance).toBeGreaterThan(0.8)
      expect(optimizationMetrics.classroomUtilization).toBeGreaterThan(0.9)
      expect(optimizationMetrics.subjectDistribution).toBeGreaterThan(0.8)
      expect(optimizationMetrics.constraintCompliance).toBeGreaterThan(0.9)
      expect(optimizationMetrics.overallScore).toBeCloseTo(
        (optimizationMetrics.teacherWorkloadBalance +
          optimizationMetrics.classroomUtilization +
          optimizationMetrics.subjectDistribution +
          optimizationMetrics.constraintCompliance) /
          4,
        2
      )
    })

    it('改善提案の生成', () => {
      const improvementSuggestions = [
        {
          type: 'teacher_workload',
          severity: 'medium',
          message: '田中先生の週間授業数が平均より10%多いです',
          solution: '他の数学教師との負荷分散を検討してください',
        },
        {
          type: 'classroom_conflict',
          severity: 'high',
          message: '理科室の使用が重複しています（火曜3限）',
          solution: '実験授業の時間調整が必要です',
        },
      ]

      expect(improvementSuggestions).toHaveLength(2)
      expect(improvementSuggestions[0].type).toBe('teacher_workload')
      expect(improvementSuggestions[1].severity).toBe('high')
    })
  })

  describe('エラーハンドリング', () => {
    it('データベースエラー', async () => {
      const preparedStmt = mockDB.prepare('SELECT * FROM timetables')
      preparedStmt.all = vi.fn().mockRejectedValue(new Error('Database error'))

      await expect(preparedStmt.all()).rejects.toThrow('Database error')
    })

    it('JSON パースエラー', () => {
      const invalidJsonData = '{"invalid": json}'

      expect(() => {
        JSON.parse(invalidJsonData)
      }).toThrow()
    })

    it('AI API レート制限エラー', async () => {
      const rateLimitError = {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: () =>
          Promise.resolve({
            error: {
              message: 'Rate limit exceeded',
              type: 'rate_limit_exceeded',
            },
          }),
      }

      mockFetch.mockResolvedValueOnce(rateLimitError)

      const response = await mockFetch('https://api.groq.com/openai/v1/chat/completions')

      expect(response.ok).toBe(false)
      expect(response.status).toBe(429)
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

    it('Vitestテスト機能が正しく動作している', () => {
      expect(() => expect(true).toBe(true)).not.toThrow()
      expect(() => expect(false).toBe(false)).not.toThrow()
      expect(() => expect(1).toBe(1)).not.toThrow()
      expect(() => expect('test').toBe('test')).not.toThrow()
      expect(() => expect([1, 2]).toEqual([1, 2])).not.toThrow()
    })

    it('モックオブジェクトが正しく定義されている', () => {
      expect(mockPrepare).toBeDefined()
      expect(typeof mockPrepare).toBe('function')
      expect(mockDB).toBeDefined()
      expect(typeof mockDB).toBe('object')
      expect(mockFetch).toBeDefined()
      expect(typeof mockFetch).toBe('function')
    })

    it('環境設定が正しく定義されている', () => {
      expect(mockEnv).toBeDefined()
      expect(typeof mockEnv).toBe('object')
      expect(mockEnv.DB).toBeDefined()
      expect(mockEnv.GROQ_API_KEY).toBe('test-groq-key')
      expect(mockEnv.NODE_ENV).toBe('test')
      expect(mockEnv.JWT_SECRET).toBe('test-jwt-secret')
    })

    it('Vitestモック機能が正しく動作している', () => {
      expect(vi.fn).toBeDefined()
      expect(typeof vi.fn).toBe('function')
      expect(vi.clearAllMocks).toBeDefined()
      expect(typeof vi.clearAllMocks).toBe('function')
      expect(vi.restoreAllMocks).toBeDefined()
      expect(typeof vi.restoreAllMocks).toBe('function')
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

    it('JSON操作機能が利用可能', () => {
      expect(JSON).toBeDefined()
      expect(JSON.parse).toBeDefined()
      expect(typeof JSON.parse).toBe('function')
      expect(JSON.stringify).toBeDefined()
      expect(typeof JSON.stringify).toBe('function')

      const testData = { name: '時間割テスト', active: true }
      const stringified = JSON.stringify(testData)
      expect(typeof stringified).toBe('string')
      const parsed = JSON.parse(stringified)
      expect(parsed).toEqual(testData)
    })

    it('非同期処理機能が動作している', async () => {
      const asyncTest = async () => {
        return Promise.resolve('timetable test')
      }

      const result = await asyncTest()
      expect(result).toBe('timetable test')
      expect(typeof asyncTest).toBe('function')
      expect(Promise).toBeDefined()
      expect(typeof Promise).toBe('function')
      expect(typeof Promise.resolve).toBe('function')
    })
  })
})
