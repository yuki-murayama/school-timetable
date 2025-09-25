import { describe, expect, it } from 'vitest'
import type {
  Class,
  DaySchedule,
  GenerationProgress,
  GenerationResponse,
  Period,
  Timetable,
  TimetableConditions,
  TimetableData,
  TimetableStructure,
  ValidationResult,
} from '../../../../src/backend/types'

describe('Backend Types', () => {
  describe('基本プロパティテスト', () => {
    it('テストフレームワークが正しく設定されている', () => {
      expect(describe).toBeDefined()
      expect(it).toBeDefined()
      expect(expect).toBeDefined()
    })

    it('TypeScriptが正しく動作している', () => {
      expect(typeof Object).toBe('function')
      expect(typeof String).toBe('function')
      expect(typeof Number).toBe('function')
      expect(typeof Boolean).toBe('function')
      expect(typeof Array).toBe('function')
    })

    it('Class型の構造が正しく定義されている', () => {
      const testClass: Class = {
        id: 'test-class',
        grade: 1,
        class: 1,
        students: 30,
      }

      expect(testClass.id).toBe('test-class')
      expect(testClass.grade).toBe(1)
      expect(testClass.class).toBe(1)
      expect(testClass.students).toBe(30)
      expect(typeof testClass.id).toBe('string')
      expect(typeof testClass.grade).toBe('number')
      expect(typeof testClass.class).toBe('number')
    })

    it('Period型の構造が正しく定義されている', () => {
      const testPeriod: Period = {
        period: 1,
        subject: 'math',
        teacher: 'teacher-1',
        classroom: 'room-1',
      }

      expect(testPeriod.period).toBe(1)
      expect(testPeriod.subject).toBe('math')
      expect(testPeriod.teacher).toBe('teacher-1')
      expect(testPeriod.classroom).toBe('room-1')
      expect(typeof testPeriod.period).toBe('number')
    })

    it('ValidationResult型の構造が正しく定義されている', () => {
      const validResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: ['test warning'],
      }

      const invalidResult: ValidationResult = {
        isValid: false,
        errors: ['test error'],
      }

      expect(validResult.isValid).toBe(true)
      expect(Array.isArray(validResult.errors)).toBe(true)
      expect(Array.isArray(validResult.warnings)).toBe(true)
      expect(invalidResult.isValid).toBe(false)
      expect(Array.isArray(invalidResult.errors)).toBe(true)
    })

    it('GenerationProgress型の構造が正しく定義されている', () => {
      const progress: GenerationProgress = {
        current: 50,
        total: 100,
        percentage: 50,
        currentStep: 'Processing classes',
      }

      expect(progress.current).toBe(50)
      expect(progress.total).toBe(100)
      expect(progress.percentage).toBe(50)
      expect(progress.currentStep).toBe('Processing classes')
      expect(typeof progress.current).toBe('number')
      expect(typeof progress.total).toBe('number')
      expect(typeof progress.percentage).toBe('number')
      expect(typeof progress.currentStep).toBe('string')
    })

    it('GenerationResponse型の構造が正しく定義されている', () => {
      const response: GenerationResponse = {
        sessionId: 'session-123',
        completed: false,
        currentDay: 'monday',
        currentClass: '1-A',
        progress: {
          current: 25,
          total: 100,
          percentage: 25,
          currentStep: 'Generating schedule',
        },
        message: 'Processing...',
      }

      expect(response.sessionId).toBe('session-123')
      expect(response.completed).toBe(false)
      expect(response.currentDay).toBe('monday')
      expect(response.currentClass).toBe('1-A')
      expect(response.message).toBe('Processing...')
      expect(typeof response.progress).toBe('object')
    })

    it('Timetable型の構造が正しく定義されている', () => {
      const timetable: Timetable = {
        id: 'timetable-1',
        name: 'Test Timetable',
        timetable: {
          monday: [{ period: 1, subject: 'math', teacher: 'teacher-1', classroom: 'room-1' }],
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      expect(timetable.id).toBe('timetable-1')
      expect(timetable.name).toBe('Test Timetable')
      expect(typeof timetable.timetable).toBe('object')
      expect(Array.isArray(timetable.timetable.monday)).toBe(true)
      expect(typeof timetable.created_at).toBe('string')
      expect(typeof timetable.updated_at).toBe('string')
    })

    it('DayScheduleとTimetableStructure型が正しく動作する', () => {
      const daySchedule: DaySchedule = {
        monday: [
          { period: 1, subject: 'math' },
          { period: 2, subject: 'english' },
        ],
        tuesday: [{ period: 1, subject: 'science' }],
      }

      const timetableStructure: TimetableStructure = {
        monday: [{ period: 1 }, { period: 2 }],
        tuesday: [{ period: 1 }],
      }

      expect(typeof daySchedule).toBe('object')
      expect(Array.isArray(daySchedule.monday)).toBe(true)
      expect(Array.isArray(daySchedule.tuesday)).toBe(true)
      expect(typeof timetableStructure).toBe('object')
      expect(Array.isArray(timetableStructure.monday)).toBe(true)
      expect(Array.isArray(timetableStructure.tuesday)).toBe(true)
    })

    it('TimetableConditions型の構造が正しく定義されている', () => {
      const conditions: TimetableConditions = {
        constraints: ['no-double-periods', 'teacher-availability'],
        preferences: { priority: 'high' },
        restrictions: { maxPeriods: 6 },
      }

      expect(Array.isArray(conditions.constraints)).toBe(true)
      expect(typeof conditions.preferences).toBe('object')
      expect(typeof conditions.restrictions).toBe('object')
      expect(conditions.constraints?.length).toBe(2)
    })

    it('TimetableData型の構造が正しく定義されている', () => {
      const timetableData: TimetableData = {
        teachers: [],
        subjects: [],
        classrooms: [],
        classes: [],
        schoolSettings: {
          id: 'default',
          grade1Classes: 4,
          grade2Classes: 3,
          grade3Classes: 3,
          grade4Classes: 3,
          grade5Classes: 3,
          grade6Classes: 3,
          dailyPeriods: 6,
          saturdayPeriods: 4,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      }

      expect(Array.isArray(timetableData.teachers)).toBe(true)
      expect(Array.isArray(timetableData.subjects)).toBe(true)
      expect(Array.isArray(timetableData.classrooms)).toBe(true)
      expect(Array.isArray(timetableData.classes)).toBe(true)
      expect(typeof timetableData.schoolSettings).toBe('object')
      expect(timetableData.schoolSettings.id).toBe('default')
      expect(typeof timetableData.schoolSettings.dailyPeriods).toBe('number')
    })
  })
})
