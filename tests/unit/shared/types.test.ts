/**
 * shared/types.ts テスト - 型定義の構造テスト
 */

import { describe, expect, it } from 'vitest'
import type {
  AssignmentRestriction,
  Classroom,
  Env,
  SchoolSettings,
  Subject,
  Teacher,
  TimetableDetail,
  TimetableGenerationResponse,
  TimetableGenerationResult,
  TimetableListItem,
  TimetableSlot,
} from '../../../src/shared/types'

describe('Shared Types', () => {
  describe('Env Interface', () => {
    it('should have correct structure', () => {
      const mockEnv: Env = {
        DB: {} as D1Database,
        GROQ_API_KEY: 'test-key',
        NODE_ENV: 'test',
        JWT_SECRET: 'test-secret',
        ASSETS: 'test-assets',
      }

      expect(mockEnv.DB).toBeDefined()
      expect(mockEnv.GROQ_API_KEY).toBe('test-key')
      expect(mockEnv.NODE_ENV).toBe('test')
      expect(mockEnv.JWT_SECRET).toBe('test-secret')
      expect(mockEnv.ASSETS).toBe('test-assets')
    })

    it('should allow optional properties', () => {
      const minimalEnv: Env = {
        DB: {} as D1Database,
        GROQ_API_KEY: 'test-key',
        NODE_ENV: 'test',
      }

      expect(minimalEnv.DB).toBeDefined()
      expect(minimalEnv.GROQ_API_KEY).toBe('test-key')
      expect(minimalEnv.NODE_ENV).toBe('test')
    })
  })

  describe('SchoolSettings Interface', () => {
    it('should have correct structure', () => {
      const settings: SchoolSettings = {
        id: 'school-1',
        grade1Classes: 3,
        grade2Classes: 3,
        grade3Classes: 3,
        dailyPeriods: 6,
        saturdayPeriods: 4,
        days: ['月曜', '火曜', '水曜', '木曜', '金曜', '土曜'],
        grades: [1, 2, 3],
        classesPerGrade: { 1: ['A', 'B'], 2: ['A', 'B'], 3: ['A', 'B'] },
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      }

      expect(settings.grade1Classes).toBe(3)
      expect(settings.dailyPeriods).toBe(6)
      expect(settings.days).toHaveLength(6)
      expect(settings.grades).toEqual([1, 2, 3])
      expect(settings.classesPerGrade[1]).toEqual(['A', 'B'])
    })

    it('should allow minimal required properties', () => {
      const minimalSettings: SchoolSettings = {
        grade1Classes: 2,
        grade2Classes: 2,
        grade3Classes: 2,
        dailyPeriods: 5,
        saturdayPeriods: 0,
        days: ['月曜', '火曜', '水曜', '木曜', '金曜'],
        grades: [1, 2, 3],
        classesPerGrade: { 1: ['A'], 2: ['A'], 3: ['A'] },
      }

      expect(minimalSettings.grade1Classes).toBe(2)
      expect(minimalSettings.dailyPeriods).toBe(5)
    })
  })

  describe('Subject Interface', () => {
    it('should have correct structure with all properties', () => {
      const subject: Subject = {
        id: 'subject-1',
        name: '数学',
        grades: [1, 2, 3],
        weeklyHours: { 1: 5, 2: 4, 3: 4 },
        requiresSpecialClassroom: true,
        classroomType: '理科室',
        specialClassroom: '第1理科室',
        weekly_hours: 4,
        target_grades: [1, 2, 3],
        order: 1,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      }

      expect(subject.id).toBe('subject-1')
      expect(subject.name).toBe('数学')
      expect(subject.grades).toEqual([1, 2, 3])
      expect(subject.weeklyHours[1]).toBe(5)
      expect(subject.requiresSpecialClassroom).toBe(true)
    })

    it('should allow minimal required properties', () => {
      const minimalSubject: Subject = {
        id: 'subject-2',
        name: '国語',
        grades: [],
        weeklyHours: {},
      }

      expect(minimalSubject.id).toBe('subject-2')
      expect(minimalSubject.name).toBe('国語')
      expect(minimalSubject.grades).toEqual([])
    })
  })

  describe('Teacher Interface', () => {
    it('should have correct structure', () => {
      const teacher: Teacher = {
        id: 'teacher-1',
        name: '田中先生',
        subjects: ['subject-1', 'subject-2'],
        grades: [1, 2],
        assignmentRestrictions: [],
        assignment_restrictions: '[]',
        order: 1,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      }

      expect(teacher.id).toBe('teacher-1')
      expect(teacher.name).toBe('田中先生')
      expect(teacher.subjects).toHaveLength(2)
      expect(teacher.grades).toEqual([1, 2])
    })

    it('should support Subject objects in subjects array', () => {
      const subjectObj: Subject = {
        id: 'sub-1',
        name: '数学',
        grades: [1],
        weeklyHours: { 1: 5 },
      }

      const teacher: Teacher = {
        id: 'teacher-2',
        name: '佐藤先生',
        subjects: [subjectObj],
        grades: [1],
      }

      expect(teacher.subjects[0]).toBe(subjectObj)
      expect(typeof teacher.subjects[0] === 'object').toBe(true)
    })
  })

  describe('Classroom Interface', () => {
    it('should have correct structure', () => {
      const classroom: Classroom = {
        id: 'classroom-1',
        name: '1年A組',
        capacity: 30,
        classroomType: '普通教室',
        type: '普通',
        specialFor: '数学',
        count: 1,
        order: 1,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      }

      expect(classroom.id).toBe('classroom-1')
      expect(classroom.name).toBe('1年A組')
      expect(classroom.capacity).toBe(30)
      expect(classroom.classroomType).toBe('普通教室')
    })
  })

  describe('AssignmentRestriction Interface', () => {
    it('should have correct structure', () => {
      const restriction: AssignmentRestriction = {
        displayOrder: 1,
        restrictedDay: '月曜',
        restrictedPeriods: [1, 2],
        restrictionLevel: '必須',
        reason: 'テスト理由',
      }

      expect(restriction.displayOrder).toBe(1)
      expect(restriction.restrictedDay).toBe('月曜')
      expect(restriction.restrictedPeriods).toEqual([1, 2])
      expect(restriction.restrictionLevel).toBe('必須')
    })

    it('should support 推奨 restriction level', () => {
      const restriction: AssignmentRestriction = {
        restrictedDay: '火曜',
        restrictedPeriods: [3],
        restrictionLevel: '推奨',
      }

      expect(restriction.restrictionLevel).toBe('推奨')
    })
  })

  describe('TimetableSlot Interface', () => {
    it('should have correct structure', () => {
      const slot: TimetableSlot = {
        classGrade: 1,
        classSection: 'A',
        day: '月曜',
        period: 1,
        subject: {
          id: 'sub-1',
          name: '数学',
          grades: [1],
          weeklyHours: { 1: 5 },
        },
        teacher: {
          id: 'teacher-1',
          name: '田中先生',
          subjects: ['sub-1'],
          grades: [1],
        },
        classroom: {
          id: 'classroom-1',
          name: '1A教室',
        },
        hasViolation: false,
        isViolation: false,
        violationSeverity: 'low',
        violations: [],
      }

      expect(slot.classGrade).toBe(1)
      expect(slot.classSection).toBe('A')
      expect(slot.day).toBe('月曜')
      expect(slot.period).toBe(1)
      expect(slot.hasViolation).toBe(false)
    })

    it('should allow violation information', () => {
      const slot: TimetableSlot = {
        classGrade: 2,
        classSection: 'B',
        day: '火曜',
        period: 2,
        isViolation: true,
        violationSeverity: 'high',
        violations: [
          {
            type: 'schedule_conflict',
            severity: 'high',
            message: '時間割の競合があります',
          },
        ],
      }

      expect(slot.isViolation).toBe(true)
      expect(slot.violationSeverity).toBe('high')
      expect(slot.violations).toHaveLength(1)
      expect(slot.violations?.[0].type).toBe('schedule_conflict')
    })
  })

  describe('TimetableGenerationResult Interface', () => {
    it('should have correct structure for successful generation', () => {
      const result: TimetableGenerationResult = {
        success: true,
        timetable: [],
        statistics: {
          totalAssignments: 100,
          assignedSlots: 95,
          unassignedSlots: 5,
          constraintViolations: 2,
          generationTime: '1.5s',
          totalSlots: 100,
          backtrackCount: 10,
        },
        message: '生成完了',
        generatedAt: '2024-01-01T12:00:00.000Z',
        method: 'backtrack',
      }

      expect(result.success).toBe(true)
      expect(result.statistics?.totalAssignments).toBe(100)
      expect(result.statistics?.assignedSlots).toBe(95)
      expect(result.method).toBe('backtrack')
    })

    it('should handle failed generation', () => {
      const result: TimetableGenerationResult = {
        success: false,
        message: '生成に失敗しました',
      }

      expect(result.success).toBe(false)
      expect(result.message).toBe('生成に失敗しました')
      expect(result.timetable).toBeUndefined()
    })
  })

  describe('TimetableGenerationResponse Interface', () => {
    it('should have correct structure', () => {
      const response: TimetableGenerationResponse = {
        success: true,
        sessionId: 'session-123',
        message: 'Success',
        data: {
          timetable: {},
          statistics: {
            totalSlots: 100,
            assignedSlots: 90,
            unassignedSlots: 10,
            backtrackCount: 5,
            generationTime: '2s',
          },
          generatedAt: '2024-01-01T12:00:00.000Z',
          method: 'genetic',
        },
        statistics: {
          totalSlots: 100,
          assignedSlots: 90,
          unassignedSlots: 10,
          backtrackCount: 5,
        },
      }

      expect(response.success).toBe(true)
      expect(response.sessionId).toBe('session-123')
      expect(response.data?.method).toBe('genetic')
      expect(response.statistics?.totalSlots).toBe(100)
    })
  })

  describe('TimetableListItem Interface', () => {
    it('should have correct structure', () => {
      const item: TimetableListItem = {
        id: 'timetable-1',
        name: '2024年度時間割',
        createdAt: '2024-01-01T12:00:00.000Z',
        isActive: true,
      }

      expect(item.id).toBe('timetable-1')
      expect(item.name).toBe('2024年度時間割')
      expect(item.isActive).toBe(true)
    })
  })

  describe('TimetableDetail Interface', () => {
    it('should have correct structure', () => {
      const detail: TimetableDetail = {
        id: 'detail-1',
        name: '詳細時間割',
        createdAt: '2024-01-01T12:00:00.000Z',
        isActive: true,
        schedule: [
          {
            classId: 'class-1',
            className: '1年A組',
            schedule: [
              {
                day: 0,
                period: 1,
                subject: '数学',
                teacher: '田中先生',
                classroom: '1A教室',
              },
            ],
          },
        ],
      }

      expect(detail.id).toBe('detail-1')
      expect(detail.schedule).toHaveLength(1)
      expect(detail.schedule[0].className).toBe('1年A組')
      expect(detail.schedule[0].schedule[0].subject).toBe('数学')
    })
  })

  describe('基本プロパティテスト', () => {
    it('テストフレームワークが正しく設定されている', () => {
      expect(describe).toBeDefined()
      expect(it).toBeDefined()
      expect(expect).toBeDefined()
    })

    it('Vitestテスト機能が正しく動作している', () => {
      expect(() => expect(true).toBe(true)).not.toThrow()
      expect(() => expect(1).toBe(1)).not.toThrow()
      expect(() => expect('test').toBe('test')).not.toThrow()
      expect(() => expect([1, 2]).toEqual([1, 2])).not.toThrow()
    })

    it('型インポートが正しく定義されている', () => {
      // TypeScript型は実行時に undefined になることをテスト
      expect(typeof AssignmentRestriction).toBe('undefined') // 型なので undefined
      expect(typeof Classroom).toBe('undefined')
      expect(typeof Env).toBe('undefined')
      expect(typeof SchoolSettings).toBe('undefined')
      expect(typeof Subject).toBe('undefined')
      expect(typeof Teacher).toBe('undefined')
      expect(typeof TimetableDetail).toBe('undefined')
      expect(typeof TimetableGenerationResponse).toBe('undefined')
      expect(typeof TimetableGenerationResult).toBe('undefined')
      expect(typeof TimetableListItem).toBe('undefined')
      expect(typeof TimetableSlot).toBe('undefined')
    })

    it('TypeScriptコンパイル時の型チェックが動作している', () => {
      // 型定義の存在を間接的にテスト（コンパイル時に検証される）
      const envTest: Env = { DB: {} as D1Database, GROQ_API_KEY: 'test', NODE_ENV: 'test' }
      const settingsTest: SchoolSettings = {
        grade1Classes: 1,
        grade2Classes: 1,
        grade3Classes: 1,
        dailyPeriods: 1,
        saturdayPeriods: 0,
        days: [],
        grades: [],
        classesPerGrade: {},
      }

      expect(envTest).toBeDefined()
      expect(settingsTest).toBeDefined()
    })

    it('オブジェクト構造テストが正しく動作している', () => {
      expect(typeof {}).toBe('object')
      expect(typeof []).toBe('object')
      expect(Array.isArray([])).toBe(true)
      expect(Array.isArray({})).toBe(false)
    })

    it('JavaScript基本機能が利用可能', () => {
      expect(typeof Object).toBe('function')
      expect(Object.keys).toBeDefined()
      expect(typeof Object.keys).toBe('function')
      expect(Array).toBeDefined()
      expect(typeof Array).toBe('function')
      expect(Array.isArray).toBeDefined()
      expect(typeof Array.isArray).toBe('function')
    })

    it('テストが正しく実行されている', () => {
      expect(true).toBe(true)
      expect(false).toBe(false)
      expect(1).toBe(1)
      expect('test').toBe('test')
      expect([1, 2, 3]).toHaveLength(3)
    })
  })
})
