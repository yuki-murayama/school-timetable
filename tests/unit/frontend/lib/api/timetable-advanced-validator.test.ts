import { beforeEach, describe, expect, it, vi } from 'vitest'
import { timetableAdvancedValidator } from '../../../../../src/frontend/lib/api/timetable-advanced-validator'
import type { Subject, Teacher } from '../../../../../src/shared/schemas'

// console.log/console.warn をモック（ログを抑制）
const mockConsoleLog = vi.fn()
const mockConsoleWarn = vi.fn()
global.console.log = mockConsoleLog
global.console.warn = mockConsoleWarn

describe('timetableAdvancedValidator', () => {
  let sampleTeachers: Teacher[]
  let sampleSubjects: Subject[]

  beforeEach(() => {
    vi.clearAllMocks()

    sampleTeachers = [
      {
        id: 'teacher-1',
        name: '田中太郎',
        subjects: ['数学', '理科'],
        grades: [1, 2, 3],
        assignmentRestrictions: [],
        order: 1,
        school_id: 'default',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'teacher-2',
        name: '佐藤花子',
        subjects: ['国語', '英語'],
        grades: [1, 2, 3],
        assignmentRestrictions: [],
        order: 2,
        school_id: 'default',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
    ]

    sampleSubjects = [
      {
        id: 'subject-1',
        name: '数学',
        grades: [1, 2, 3],
        weeklyHours: 4,
        school_id: 'default',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'subject-2',
        name: '国語',
        grades: [1, 2, 3],
        weeklyHours: 5,
        school_id: 'default',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
    ]
  })

  describe('calculateComplianceRate', () => {
    it('有効な時間割データの適合率を正しく計算する', () => {
      const validTimetableData = [
        [
          [{ subject: '数学', teacher: '田中太郎' }], // 月曜1時限
          [{ subject: '国語', teacher: '佐藤花子' }], // 月曜2時限
          [{ subject: '数学', teacher: '田中太郎' }], // 月曜3時限
          [], // 月曜4時限（空き）
          [], // 月曜5時限（空き）
          [], // 月曜6時限（空き）
        ],
        [
          [{ subject: '理科', teacher: '田中太郎' }], // 火曜1時限
          [{ subject: '英語', teacher: '佐藤花子' }], // 火曜2時限
          [], // 火曜3時限（空き）
          [], // 火曜4時限（空き）
          [], // 火曜5時限（空き）
          [], // 火曜6時限（空き）
        ],
      ]

      const result = timetableAdvancedValidator.calculateComplianceRate(
        validTimetableData,
        sampleTeachers,
        sampleSubjects
      )

      expect(result.overallRate).toBeGreaterThan(0)
      expect(result.violations).toHaveLength(7) // 空きスロットが違反として検出される
      expect(result.violations.every(v => v.type === 'empty_slot')).toBe(true)
    })

    it('教師の重複がある場合に違反を検出する', () => {
      const conflictTimetableData = [
        [
          [
            { subject: '数学', teacher: '田中太郎' },
            { subject: '理科', teacher: '田中太郎' }, // 同一教師が同時刻に複数授業
          ],
        ],
      ]

      const result = timetableAdvancedValidator.calculateComplianceRate(
        conflictTimetableData,
        sampleTeachers,
        sampleSubjects
      )

      expect(result.violations.some(v => v.type === 'teacher_conflict')).toBe(true)
      expect(result.violations.find(v => v.type === 'teacher_conflict')?.message).toContain(
        '田中太郎先生が同じ時間に複数のクラスを担当'
      )
    })

    it('教師と教科の不適合を検出する', () => {
      const mismatchTimetableData = [
        [
          [{ subject: '国語', teacher: '田中太郎' }], // 田中太郎は国語担当ではない
        ],
      ]

      const result = timetableAdvancedValidator.calculateComplianceRate(
        mismatchTimetableData,
        sampleTeachers,
        sampleSubjects
      )

      expect(result.violations.some(v => v.type === 'teacher_mismatch')).toBe(true)
      expect(result.violations.find(v => v.type === 'teacher_mismatch')?.message).toContain(
        '田中太郎先生は国語の担当ではありません'
      )
    })

    it('土曜日の午後の空きスロットは違反として扱わない', () => {
      const saturdayAfternoonData = [
        [],
        [],
        [],
        [],
        [], // 月〜金は空データ
        [
          [{ subject: '数学', teacher: '田中太郎' }], // 土曜1時限
          [{ subject: '国語', teacher: '佐藤花子' }], // 土曜2時限
          [], // 土曜3時限
          [], // 土曜4時限
          [], // 土曜5時限（午後・正常な空き）
          [], // 土曜6時限（午後・正常な空き）
        ],
      ]

      const result = timetableAdvancedValidator.calculateComplianceRate(
        saturdayAfternoonData,
        sampleTeachers,
        sampleSubjects
      )

      // 土曜5・6時限の空きは違反として検出されない
      const saturdayAfternoonViolations = result.violations.filter(
        v => v.day === 'sat' && (v.period === '5' || v.period === '6')
      )
      expect(saturdayAfternoonViolations).toHaveLength(0)
    })

    it('無効なデータ形式の場合に適切に処理する', () => {
      const invalidData = 'invalid data'

      const result = timetableAdvancedValidator.calculateComplianceRate(
        invalidData,
        sampleTeachers,
        sampleSubjects
      )

      expect(result.overallRate).toBe(0)
      expect(result.violations).toHaveLength(0)
      expect(mockConsoleWarn).toHaveBeenCalledWith('⚠️ 無効なデータ形式')
    })

    it('オブジェクト形式の教師・教科名を正しく処理する', () => {
      const objectFormData = [
        [
          [
            {
              subject: { name: '数学', id: 'math-1' },
              teacher: { name: '田中太郎', id: 'teacher-1' },
            },
          ],
        ],
      ]

      const result = timetableAdvancedValidator.calculateComplianceRate(
        objectFormData,
        sampleTeachers,
        sampleSubjects
      )

      expect(result.overallRate).toBeGreaterThan(0)
      // 教師・教科の適合性チェックが正常に動作することを確認
      expect(result.violations.every(v => v.type !== 'teacher_mismatch')).toBe(true)
    })
  })

  describe('addViolationInfo', () => {
    it('表示データに違反情報を正しく追加する', () => {
      const displayData = [
        {
          period: '1',
          mon: { subject: '数学', teacher: '田中太郎' },
          tue: { subject: '国語', teacher: '佐藤花子' },
        },
      ]

      const violations = [
        {
          period: '1',
          day: 'mon',
          type: 'teacher_conflict',
          message: 'テスト違反',
          severity: 'high',
        },
      ]

      const result = timetableAdvancedValidator.addViolationInfo(displayData, violations)

      expect(result[0].mon.violations).toHaveLength(1)
      expect(result[0].mon.hasViolation).toBe(true)
      expect(result[0].mon.violationSeverity).toBe('high')
      expect(result[0].tue.hasViolation).toBe(false)
    })

    it('複数の違反がある場合に最も深刻なレベルを設定する', () => {
      const displayData = [
        {
          period: '1',
          mon: { subject: '数学', teacher: '田中太郎' },
        },
      ]

      const violations = [
        {
          period: '1',
          day: 'mon',
          type: 'teacher_conflict',
          message: '軽微な違反',
          severity: 'low',
        },
        {
          period: '1',
          day: 'mon',
          type: 'teacher_mismatch',
          message: '重大な違反',
          severity: 'high',
        },
        {
          period: '1',
          day: 'mon',
          type: 'empty_slot',
          message: '中程度の違反',
          severity: 'medium',
        },
      ]

      const result = timetableAdvancedValidator.addViolationInfo(displayData, violations)

      expect(result[0].mon.violationSeverity).toBe('high')
      expect(result[0].mon.violations).toHaveLength(3)
    })

    it('違反がないセルの場合は違反情報を追加しない', () => {
      const displayData = [
        {
          period: '1',
          mon: { subject: '数学', teacher: '田中太郎' },
          tue: { subject: '国語', teacher: '佐藤花子' },
        },
      ]

      const violations = [
        {
          period: '2', // 異なる時限
          day: 'mon',
          type: 'teacher_conflict',
          message: 'テスト違反',
          severity: 'high',
        },
      ]

      const result = timetableAdvancedValidator.addViolationInfo(displayData, violations)

      expect(result[0].mon.hasViolation).toBe(false)
      expect(result[0].mon.violations).toHaveLength(0)
      expect(result[0].tue.hasViolation).toBe(false)
    })
  })

  describe('validateTimetableConstraints', () => {
    it('有効な時間割の場合はバリデーションが通る', () => {
      const validDisplayData = [
        {
          period: '1',
          mon: { subject: '数学', teacher: '田中太郎' },
          tue: { subject: '国語', teacher: '佐藤花子' },
        },
        {
          period: '2',
          mon: { subject: '理科', teacher: '田中太郎' },
          tue: { subject: '英語', teacher: '佐藤花子' },
        },
      ]

      const result = timetableAdvancedValidator.validateTimetableConstraints(
        validDisplayData,
        sampleTeachers,
        sampleSubjects
      )

      expect(result.isValid).toBe(true)
      expect(result.conflicts).toHaveLength(0)
    })

    it('教師の重複がある場合にコンフリクトを検出する', () => {
      const conflictDisplayData = [
        {
          period: '1',
          mon: { subject: '数学', teacher: '田中太郎' },
          tue: { subject: '理科', teacher: '田中太郎' }, // 同一時限で重複
        },
      ]

      const result = timetableAdvancedValidator.validateTimetableConstraints(
        conflictDisplayData,
        sampleTeachers,
        sampleSubjects
      )

      expect(result.isValid).toBe(false)
      expect(result.conflicts).toHaveLength(2) // 月・火それぞれにコンフリクト
      expect(result.conflicts.every(c => c.type === 'teacher_double_booking')).toBe(true)
      expect(result.conflicts[0].message).toContain(
        '田中太郎先生が同じ時限の複数曜日に割り当てられています'
      )
    })

    it('教師の資格不適合を検出する', () => {
      const mismatchDisplayData = [
        {
          period: '1',
          mon: { subject: '国語', teacher: '田中太郎' }, // 田中太郎は国語担当ではない
        },
      ]

      const result = timetableAdvancedValidator.validateTimetableConstraints(
        mismatchDisplayData,
        sampleTeachers,
        sampleSubjects
      )

      expect(result.isValid).toBe(false)
      expect(result.conflicts.some(c => c.type === 'teacher_mismatch')).toBe(true)
      expect(result.conflicts.find(c => c.type === 'teacher_mismatch')?.message).toContain(
        '田中太郎先生は国語の担当ではありません'
      )
    })

    it('影響を受けるセルの情報を正しく記録する', () => {
      const conflictDisplayData = [
        {
          period: '1',
          mon: { subject: '数学', teacher: '田中太郎' },
          tue: { subject: '理科', teacher: '田中太郎' },
          wed: { subject: '数学', teacher: '田中太郎' }, // 3つの曜日で重複
        },
      ]

      const result = timetableAdvancedValidator.validateTimetableConstraints(
        conflictDisplayData,
        sampleTeachers,
        sampleSubjects
      )

      expect(result.conflicts).toHaveLength(3)
      expect(result.conflicts[0].affectedCells).toEqual([
        { period: '1', day: 'mon' },
        { period: '1', day: 'tue' },
        { period: '1', day: 'wed' },
      ])
    })
  })

  describe('validateSchoolWideTimetableConstraints', () => {
    it('全校的な教師重複を検出する', () => {
      const allClassTimetables = new Map([
        [
          '1-1',
          [
            {
              period: '1',
              mon: { subject: '数学', teacher: '田中太郎' },
            },
          ],
        ],
        [
          '1-2',
          [
            {
              period: '1',
              mon: { subject: '理科', teacher: '田中太郎' }, // 同一時限で重複
            },
          ],
        ],
      ])

      const result = timetableAdvancedValidator.validateSchoolWideTimetableConstraints(
        allClassTimetables,
        sampleTeachers,
        sampleSubjects
      )

      expect(result.isValid).toBe(false)
      expect(result.conflicts).toHaveLength(1)
      expect(result.conflicts[0].type).toBe('teacher_conflict')
      expect(result.conflicts[0].message).toContain('田中太郎先生が同じ時限に複数クラス')
      expect(result.conflicts[0].affectedClasses).toEqual([
        { grade: 1, classNumber: 1 },
        { grade: 1, classNumber: 2 },
      ])
    })

    it('全校的な教師資格不適合を検出する', () => {
      const allClassTimetables = new Map([
        [
          '2-1',
          [
            {
              period: '1',
              mon: { subject: '国語', teacher: '田中太郎' }, // 資格不適合
            },
          ],
        ],
      ])

      const result = timetableAdvancedValidator.validateSchoolWideTimetableConstraints(
        allClassTimetables,
        sampleTeachers,
        sampleSubjects
      )

      expect(result.isValid).toBe(false)
      expect(result.conflicts.some(c => c.type === 'teacher_mismatch')).toBe(true)
      expect(result.conflicts.find(c => c.type === 'teacher_mismatch')?.message).toContain(
        '田中太郎先生は国語の担当資格がありません（2年1組）'
      )
    })

    it('有効な全校時間割の場合はバリデーションが通る', () => {
      const allClassTimetables = new Map([
        [
          '1-1',
          [
            {
              period: '1',
              mon: { subject: '数学', teacher: '田中太郎' },
            },
          ],
        ],
        [
          '1-2',
          [
            {
              period: '1',
              tue: { subject: '国語', teacher: '佐藤花子' }, // 異なる曜日・教師
            },
          ],
        ],
      ])

      const result = timetableAdvancedValidator.validateSchoolWideTimetableConstraints(
        allClassTimetables,
        sampleTeachers,
        sampleSubjects
      )

      expect(result.isValid).toBe(true)
      expect(result.conflicts).toHaveLength(0)
    })

    it('複数クラスでの教師重複メッセージを正しく生成する', () => {
      const allClassTimetables = new Map([
        ['1-1', [{ period: '1', mon: { subject: '数学', teacher: '田中太郎' } }]],
        ['1-2', [{ period: '1', mon: { subject: '理科', teacher: '田中太郎' } }]],
        ['2-1', [{ period: '1', mon: { subject: '数学', teacher: '田中太郎' } }]],
      ])

      const result = timetableAdvancedValidator.validateSchoolWideTimetableConstraints(
        allClassTimetables,
        sampleTeachers,
        sampleSubjects
      )

      expect(result.conflicts[0].message).toContain('1年1組, 1年2組, 2年1組')
    })
  })

  describe('validateTimetableConstraintsEnhanced', () => {
    it('クラス内制約チェックの結果を統合する', () => {
      const displayData = [
        {
          period: '1',
          mon: { subject: '数学', teacher: '田中太郎' },
          tue: { subject: '理科', teacher: '田中太郎' }, // クラス内重複
        },
      ]

      const result = timetableAdvancedValidator.validateTimetableConstraintsEnhanced(
        displayData,
        sampleTeachers,
        sampleSubjects,
        1,
        1
      )

      expect(result.isValid).toBe(false)
      expect(result.conflicts.some(c => c.type === 'teacher_double_booking')).toBe(true)
    })

    it('全校制約チェックの結果を統合する', () => {
      const displayData = [
        {
          period: '1',
          mon: { subject: '数学', teacher: '田中太郎' },
        },
      ]

      const allClassTimetables = new Map([
        [
          '1-2',
          [
            {
              period: '1',
              mon: { subject: '理科', teacher: '田中太郎' }, // 全校重複
            },
          ],
        ],
      ])

      const result = timetableAdvancedValidator.validateTimetableConstraintsEnhanced(
        displayData,
        sampleTeachers,
        sampleSubjects,
        1,
        1,
        allClassTimetables
      )

      expect(result.isValid).toBe(false)
      expect(result.conflicts.some(c => c.type === 'school_wide_conflict')).toBe(true)
    })

    it('現在のクラスに影響しない全校制約違反は除外する', () => {
      const displayData = [
        {
          period: '1',
          mon: { subject: '数学', teacher: '田中太郎' },
        },
      ]

      const allClassTimetables = new Map([
        [
          '2-1',
          [
            {
              period: '1',
              mon: { subject: '理科', teacher: '佐藤花子' },
            },
          ],
        ],
        [
          '2-2',
          [
            {
              period: '1',
              mon: { subject: '英語', teacher: '佐藤花子' }, // 他学年での重複
            },
          ],
        ],
      ])

      const result = timetableAdvancedValidator.validateTimetableConstraintsEnhanced(
        displayData,
        sampleTeachers,
        sampleSubjects,
        1,
        1,
        allClassTimetables
      )

      // 1年1組には影響しない違反なので検出されない
      expect(result.conflicts.every(c => c.type !== 'school_wide_conflict')).toBe(true)
    })

    it('全校データが提供されない場合はクラス内制約のみをチェックする', () => {
      const displayData = [
        {
          period: '1',
          mon: { subject: '数学', teacher: '田中太郎' },
        },
      ]

      const result = timetableAdvancedValidator.validateTimetableConstraintsEnhanced(
        displayData,
        sampleTeachers,
        sampleSubjects,
        1,
        1
        // allClassTimetables は undefined
      )

      expect(result.isValid).toBe(true)
      expect(result.conflicts).toHaveLength(0)
    })
  })

  describe('統合テスト', () => {
    it('複雑な時間割データに対して包括的なバリデーションを実行する', () => {
      const complexTimetableData = [
        [
          [{ subject: '数学', teacher: '田中太郎' }], // 月曜1時限
          [{ subject: '理科', teacher: '田中太郎' }], // 月曜2時限
          [{ subject: '国語', teacher: '佐藤花子' }], // 月曜3時限
        ],
        [
          [{ subject: '英語', teacher: '佐藤花子' }], // 火曜1時限
          [{ subject: '国語', teacher: '田中太郎' }], // 火曜2時限（資格不適合）
        ],
      ]

      const complianceResult = timetableAdvancedValidator.calculateComplianceRate(
        complexTimetableData,
        sampleTeachers,
        sampleSubjects
      )

      expect(complianceResult.violations.some(v => v.type === 'teacher_mismatch')).toBe(true)

      // 表示データ形式に変換してエンハンスドバリデーション
      const displayData = [
        {
          period: '1',
          mon: { subject: '数学', teacher: '田中太郎' },
          tue: { subject: '英語', teacher: '佐藤花子' },
        },
        {
          period: '2',
          mon: { subject: '理科', teacher: '田中太郎' },
          tue: { subject: '国語', teacher: '田中太郎' }, // 資格不適合
        },
      ]

      const enhancedResult = timetableAdvancedValidator.validateTimetableConstraintsEnhanced(
        displayData,
        sampleTeachers,
        sampleSubjects,
        1,
        1
      )

      expect(enhancedResult.isValid).toBe(false)
      expect(enhancedResult.conflicts.some(c => c.type === 'teacher_mismatch')).toBe(true)
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

    it('timetableAdvancedValidatorが正しく作成されている', () => {
      expect(timetableAdvancedValidator).toBeDefined()
      expect(typeof timetableAdvancedValidator.calculateComplianceRate).toBe('function')
      expect(typeof timetableAdvancedValidator.addViolationInfo).toBe('function')
      expect(typeof timetableAdvancedValidator.validateTimetableConstraints).toBe('function')
      expect(typeof timetableAdvancedValidator.validateSchoolWideTimetableConstraints).toBe(
        'function'
      )
      expect(typeof timetableAdvancedValidator.validateTimetableConstraintsEnhanced).toBe(
        'function'
      )
    })

    it('timetableAdvancedValidatorのプロパティが正しく設定されている', () => {
      expect(timetableAdvancedValidator).toHaveProperty('calculateComplianceRate')
      expect(timetableAdvancedValidator).toHaveProperty('addViolationInfo')
      expect(timetableAdvancedValidator).toHaveProperty('validateTimetableConstraints')
      expect(timetableAdvancedValidator).toHaveProperty('validateSchoolWideTimetableConstraints')
      expect(timetableAdvancedValidator).toHaveProperty('validateTimetableConstraintsEnhanced')
    })

    it('Teacher型とSubject型が正しくインポートされている', () => {
      expect(sampleTeachers).toBeDefined()
      expect(Array.isArray(sampleTeachers)).toBe(true)
      expect(sampleSubjects).toBeDefined()
      expect(Array.isArray(sampleSubjects)).toBe(true)
      if (sampleTeachers.length > 0) {
        expect(sampleTeachers[0]).toHaveProperty('id')
        expect(sampleTeachers[0]).toHaveProperty('name')
      }
      if (sampleSubjects.length > 0) {
        expect(sampleSubjects[0]).toHaveProperty('id')
        expect(sampleSubjects[0]).toHaveProperty('name')
      }
    })

    it('モック関数が正しく設定されている', () => {
      expect(mockConsoleLog).toBeDefined()
      expect(typeof mockConsoleLog).toBe('function')
      expect(mockConsoleWarn).toBeDefined()
      expect(typeof mockConsoleWarn).toBe('function')
      expect(global.console.log).toBe(mockConsoleLog)
      expect(global.console.warn).toBe(mockConsoleWarn)
    })

    it('テスト用サンプルデータが適切に初期化されている', () => {
      expect(sampleTeachers).toBeDefined()
      expect(sampleTeachers).toHaveLength(2)
      expect(sampleTeachers[0].name).toBe('田中太郎')
      expect(sampleTeachers[1].name).toBe('佐藤花子')
      expect(sampleSubjects).toBeDefined()
      expect(sampleSubjects).toHaveLength(2)
      expect(sampleSubjects[0].name).toBe('数学')
      expect(sampleSubjects[1].name).toBe('国語')
    })
  })
})
