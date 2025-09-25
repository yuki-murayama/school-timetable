import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DataTransformService } from '../../../../src/backend/services/DataTransformService'
import type { Classroom, SchoolSettings, Subject, Teacher } from '../../../../src/shared/schemas'

// モック用の型定義
interface MockDatabase {
  prepare: (sql: string) => {
    bind: (...args: any[]) => {
      first: () => Promise<any>
      all: () => Promise<any[]>
      run: () => Promise<{ changes: number }>
    }
    first: () => Promise<any>
    all: () => Promise<{ results?: any[] }>
  }
}

// console.log をモック（ログを抑制）
const mockConsoleLog = vi.fn()
global.console.log = mockConsoleLog

describe('DataTransformService', () => {
  let mockDB: MockDatabase
  let service: DataTransformService

  const sampleSettingsData = {
    id: 'settings-1',
    grade1Classes: 4,
    grade2Classes: 4,
    grade3Classes: 3,
    dailyPeriods: 6,
    saturdayPeriods: 4,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  }

  const sampleTeachersData = [
    {
      id: 'teacher-1',
      name: '田中太郎',
      subjects: JSON.stringify(['math-001', 'science-001']),
      grades: JSON.stringify([1, 2, 3]),
      assignment_restrictions: JSON.stringify([
        {
          displayOrder: 1,
          restrictedDay: '月曜',
          restrictedPeriods: [1, 2],
          restrictionLevel: '必須',
          reason: '会議のため',
        },
      ]),
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    },
  ]

  const sampleSubjectsData = [
    {
      id: 'subject-1',
      name: '数学',
      target_grades: JSON.stringify([1, 2, 3]),
      weekly_hours: 4,
      requires_special_classroom: false,
      classroom_type: 'normal',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    },
  ]

  const sampleClassroomsData = [
    {
      id: 'classroom-1',
      name: '1年A組',
      capacity: 35,
      type: 'normal',
      classroom_type: null,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    // データベースモックの作成
    const createPrepare = (returnValue: any, allValue?: any) => ({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(returnValue),
        all: vi
          .fn()
          .mockResolvedValue(
            allValue || { results: Array.isArray(returnValue) ? returnValue : [returnValue] }
          ),
        run: vi.fn().mockResolvedValue({ changes: 1 }),
      }),
      first: vi.fn().mockResolvedValue(returnValue),
      all: vi
        .fn()
        .mockResolvedValue(
          allValue || { results: Array.isArray(returnValue) ? returnValue : [returnValue] }
        ),
    })

    mockDB = {
      prepare: vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('SELECT * FROM school_settings')) {
          return createPrepare(sampleSettingsData)
        }
        if (sql.includes('SELECT * FROM teachers')) {
          return createPrepare(null, { results: sampleTeachersData })
        }
        if (sql.includes('SELECT * FROM subjects')) {
          return createPrepare(null, { results: sampleSubjectsData })
        }
        if (sql.includes('SELECT * FROM classrooms')) {
          return createPrepare(null, { results: sampleClassroomsData })
        }
        return createPrepare(null)
      }),
    }

    service = new DataTransformService(mockDB)
  })

  describe('constructor', () => {
    it('正常にインスタンスが作成される', () => {
      expect(service).toBeInstanceOf(DataTransformService)
    })
  })

  describe('loadSchoolData', () => {
    it('すべてのデータを正常に取得できる', async () => {
      const result = await service.loadSchoolData()

      expect(result.settings).toBeDefined()
      expect(result.teachers).toHaveLength(1)
      expect(result.subjects).toHaveLength(1)
      expect(result.classrooms).toHaveLength(1)

      expect(mockDB.prepare).toHaveBeenCalledWith('SELECT * FROM school_settings LIMIT 1')
      expect(mockDB.prepare).toHaveBeenCalledWith('SELECT * FROM teachers ORDER BY name')
      expect(mockDB.prepare).toHaveBeenCalledWith('SELECT * FROM subjects ORDER BY name')
      expect(mockDB.prepare).toHaveBeenCalledWith('SELECT * FROM classrooms ORDER BY name')
    })

    it('学校設定が見つからない場合エラーを投げる', async () => {
      mockDB.prepare = vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('SELECT * FROM school_settings')) {
          return {
            first: vi.fn().mockResolvedValue(null),
          }
        }
        return {
          first: vi.fn().mockResolvedValue(null),
          all: vi.fn().mockResolvedValue({ results: [] }),
        }
      })

      await expect(service.loadSchoolData()).rejects.toThrow('学校設定が見つかりません')
    })

    it('データが空の場合でも正常に処理される', async () => {
      mockDB.prepare = vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('SELECT * FROM school_settings')) {
          return {
            first: vi.fn().mockResolvedValue(sampleSettingsData),
          }
        }
        return {
          all: vi.fn().mockResolvedValue({ results: [] }),
        }
      })

      const result = await service.loadSchoolData()

      expect(result.teachers).toHaveLength(0)
      expect(result.subjects).toHaveLength(0)
      expect(result.classrooms).toHaveLength(0)
    })

    it('データ取得完了ログが出力される', async () => {
      await service.loadSchoolData()

      expect(mockConsoleLog).toHaveBeenCalledWith('🔍 データベースからデータを取得中...')
      expect(mockConsoleLog).toHaveBeenCalledWith('📊 データ取得完了:', {
        teachers: 1,
        subjects: 1,
        classrooms: 1,
      })
    })
  })

  describe('parseSettings', () => {
    it('設定データを正しく解析する', () => {
      const result = service.parseSettings(sampleSettingsData)

      expect(result).toEqual({
        id: 'settings-1',
        grade1Classes: 4,
        grade2Classes: 4,
        grade3Classes: 3,
        dailyPeriods: 6,
        saturdayPeriods: 4,
        days: ['月曜', '火曜', '水曜', '木曜', '金曜', '土曜'],
        grades: [1, 2, 3],
        classesPerGrade: {
          1: ['1', '2', '3', '4'],
          2: ['1', '2', '3', '4'],
          3: ['1', '2', '3'],
        },
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      })
    })

    it('無効な数値の場合デフォルト値を使用する', () => {
      const invalidData = {
        id: 'settings-1',
        grade1Classes: 'invalid',
        grade2Classes: null,
        grade3Classes: undefined,
        dailyPeriods: NaN,
        saturdayPeriods: 'abc',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      }

      const result = service.parseSettings(invalidData)

      expect(result.grade1Classes).toBe(4)
      expect(result.grade2Classes).toBe(4)
      expect(result.grade3Classes).toBe(3)
      expect(result.dailyPeriods).toBe(6)
      expect(result.saturdayPeriods).toBe(4)
    })

    it('例外が発生した場合デフォルト値を使用する', () => {
      const problematicData = {
        id: 'settings-1',
        grade1Classes: { invalid: 'object' },
        grade2Classes: [],
        grade3Classes: Symbol('invalid'),
        dailyPeriods: BigInt(10),
        saturdayPeriods: () => 'function',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      }

      const result = service.parseSettings(problematicData)

      expect(result.grade1Classes).toBe(4)
      expect(result.grade2Classes).toBe(4)
      expect(result.grade3Classes).toBe(3)
      expect(result.dailyPeriods).toBe(6)
      expect(result.saturdayPeriods).toBe(4)
    })
  })

  describe('transformTeachers', () => {
    it('教師データを正しく変換する', () => {
      const result = service.transformTeachers(sampleTeachersData)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: 'teacher-1',
        name: '田中太郎',
        grades: [1, 2, 3],
        subjects: ['math-001', 'science-001'],
        assignmentRestrictions: [
          {
            displayOrder: 1,
            restrictedDay: '月曜',
            restrictedPeriods: [1, 2],
            restrictionLevel: '必須',
            reason: '会議のため',
          },
        ],
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      })
    })

    it('JSON文字列以外の配列データも正しく処理する', () => {
      const teachersWithArrayData = [
        {
          ...sampleTeachersData[0],
          subjects: ['math-001', 'science-001'],
          grades: [1, 2],
          assignment_restrictions: [],
        },
      ]

      const result = service.transformTeachers(teachersWithArrayData)

      expect(result[0].subjects).toEqual(['math-001', 'science-001'])
      expect(result[0].grades).toEqual([1, 2])
      expect(result[0].assignmentRestrictions).toEqual([])
    })

    it('無効なJSONの場合デフォルト値を使用しエラーログを出力する', () => {
      const teachersWithInvalidJSON = [
        {
          ...sampleTeachersData[0],
          subjects: '{invalid json}',
          grades: '[1,2,3',
          assignment_restrictions: 'not json at all',
        },
      ]

      const result = service.transformTeachers(teachersWithInvalidJSON)

      expect(result[0].subjects).toEqual([])
      expect(result[0].grades).toEqual([1, 2, 3])
      expect(result[0].assignmentRestrictions).toEqual([])

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '⚠️ 教師 subjects JSON parse エラー:',
        expect.any(String)
      )
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '⚠️ 教師 grades JSON parse エラー:',
        expect.any(String)
      )
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '⚠️ 教師 assignment_restrictions JSON parse エラー:',
        expect.any(String)
      )
    })

    it('nullやundefinedの場合デフォルト値を使用する', () => {
      const teachersWithNullData = [
        {
          id: 'teacher-2',
          name: '佐藤花子',
          subjects: null,
          grades: undefined,
          assignment_restrictions: null,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ]

      const result = service.transformTeachers(teachersWithNullData)

      expect(result[0].subjects).toEqual([])
      expect(result[0].grades).toEqual([1, 2, 3])
      expect(result[0].assignmentRestrictions).toEqual([])
    })
  })

  describe('transformSubjects', () => {
    it('教科データを正しく変換する', () => {
      const result = service.transformSubjects(sampleSubjectsData)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: 'subject-1',
        name: '数学',
        grades: [1, 2, 3],
        weeklyHours: {
          1: 4,
          2: 4,
          3: 4,
        },
        requiresSpecialClassroom: false,
        classroomType: 'normal',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      })
    })

    it('無効なJSONの場合デフォルト値を使用する', () => {
      const subjectsWithInvalidJSON = [
        {
          ...sampleSubjectsData[0],
          target_grades: '{invalid json}',
        },
      ]

      const result = service.transformSubjects(subjectsWithInvalidJSON)

      expect(result[0].grades).toEqual([1, 2, 3])
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '⚠️ target_grades JSON parse エラー:',
        expect.any(String)
      )
    })

    it('週間時数が無効な場合デフォルト値を使用する', () => {
      const subjectsWithInvalidHours = [
        {
          ...sampleSubjectsData[0],
          name: 'テスト教科1',
          weekly_hours: null,
        },
        {
          ...sampleSubjectsData[0],
          id: 'subject-2',
          name: 'テスト教科2',
          weekly_hours: 'invalid',
        },
        {
          ...sampleSubjectsData[0],
          id: 'subject-3',
          name: 'テスト教科3',
          weekly_hours: 15, // 上限超過
        },
        {
          ...sampleSubjectsData[0],
          id: 'subject-4',
          name: 'テスト教科4',
          weekly_hours: -1, // 負の値
        },
      ]

      const result = service.transformSubjects(subjectsWithInvalidHours)

      result.forEach(subject => {
        expect(subject.weeklyHours[1]).toBe(1)
        expect(subject.weeklyHours[2]).toBe(1)
        expect(subject.weeklyHours[3]).toBe(1)
      })

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '⚠️ 教科 テスト教科2 の週間時数が不正: invalid, デフォルト値 1 を使用'
      )
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '⚠️ 教科 テスト教科3 の週間時数が不正: 15, デフォルト値 1 を使用'
      )
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '⚠️ 教科 テスト教科4 の週間時数が不正: -1, デフォルト値 1 を使用'
      )
    })

    it('週間時数解析でエラーが発生した場合デフォルト値を使用する', () => {
      const subjectsWithErrorProneHours = [
        {
          ...sampleSubjectsData[0],
          name: 'エラー教科',
          weekly_hours: {
            valueOf: () => {
              throw new Error('Test error')
            },
          },
        },
      ]

      const result = service.transformSubjects(subjectsWithErrorProneHours)

      expect(result[0].weeklyHours[1]).toBe(1)
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '❌ 教科 エラー教科 の週間時数解析エラー:',
        expect.any(Error)
      )
    })

    it('特別教室要否と教室タイプが正しく設定される', () => {
      const subjectsWithClassroomInfo = [
        {
          ...sampleSubjectsData[0],
          id: 'subject-lab',
          name: '理科',
          requires_special_classroom: true,
          classroom_type: 'laboratory',
        },
        {
          ...sampleSubjectsData[0],
          id: 'subject-music',
          name: '音楽',
          requires_special_classroom: 1, // truthy value
          classroom_type: null,
        },
      ]

      const result = service.transformSubjects(subjectsWithClassroomInfo)

      expect(result[0].requiresSpecialClassroom).toBe(true)
      expect(result[0].classroomType).toBe('laboratory')
      expect(result[1].requiresSpecialClassroom).toBe(true)
      expect(result[1].classroomType).toBe('normal')
    })
  })

  describe('transformClassrooms', () => {
    it('教室データを正しく変換する', () => {
      const result = service.transformClassrooms(sampleClassroomsData)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: 'classroom-1',
        name: '1年A組',
        capacity: 35,
        classroomType: 'normal',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      })
    })

    it('無効な収容人数の場合デフォルト値を使用する', () => {
      const classroomsWithInvalidCapacity = [
        {
          ...sampleClassroomsData[0],
          id: 'classroom-invalid1',
          capacity: null,
        },
        {
          ...sampleClassroomsData[0],
          id: 'classroom-invalid2',
          capacity: 'invalid',
        },
        {
          ...sampleClassroomsData[0],
          id: 'classroom-invalid3',
          capacity: undefined,
        },
      ]

      const result = service.transformClassrooms(classroomsWithInvalidCapacity)

      result.forEach(classroom => {
        expect(classroom.capacity).toBe(0)
      })
    })

    it('教室タイプの優先順位が正しく適用される', () => {
      const classroomsWithDifferentTypes = [
        {
          ...sampleClassroomsData[0],
          id: 'classroom-type1',
          type: 'laboratory',
          classroom_type: 'music_room',
        },
        {
          ...sampleClassroomsData[0],
          id: 'classroom-type2',
          type: null,
          classroom_type: 'gymnasium',
        },
        {
          ...sampleClassroomsData[0],
          id: 'classroom-type3',
          type: null,
          classroom_type: null,
        },
      ]

      const result = service.transformClassrooms(classroomsWithDifferentTypes)

      expect(result[0].classroomType).toBe('laboratory') // type が優先
      expect(result[1].classroomType).toBe('gymnasium') // classroom_type を使用
      expect(result[2].classroomType).toBe('normal') // デフォルト値
    })

    it('例外が発生した場合デフォルト値を使用する', () => {
      const classroomsWithProblematicData = [
        {
          ...sampleClassroomsData[0],
          capacity: {
            valueOf: () => {
              throw new Error('Test error')
            },
          },
        },
      ]

      const result = service.transformClassrooms(classroomsWithProblematicData)

      expect(result[0].capacity).toBe(0)
    })
  })

  describe('optimizeSubjects', () => {
    it('対象学年が空の教科を全学年対応に拡張する', () => {
      const subjects = [
        {
          id: 'subject-1',
          name: '数学',
          grades: [1, 2],
          weeklyHours: { 1: 4, 2: 4, 3: 4 },
          requiresSpecialClassroom: false,
          classroomType: 'normal',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'subject-2',
          name: '英語',
          grades: [],
          weeklyHours: { 1: 3, 2: 3, 3: 3 },
          requiresSpecialClassroom: false,
          classroomType: 'normal',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ]

      const result = service.optimizeSubjects(subjects)

      expect(result[0].grades).toEqual([1, 2]) // 変更なし
      expect(result[1].grades).toEqual([1, 2, 3]) // 全学年に拡張

      expect(mockConsoleLog).toHaveBeenCalledWith('- 教科「英語」を全学年対応に拡張')
    })

    it('gradesがnullまたはundefinedの場合も全学年対応に拡張する', () => {
      const subjects = [
        {
          id: 'subject-1',
          name: 'テスト教科1',
          grades: null as any,
          weeklyHours: { 1: 2, 2: 2, 3: 2 },
          requiresSpecialClassroom: false,
          classroomType: 'normal',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'subject-2',
          name: 'テスト教科2',
          grades: undefined as any,
          weeklyHours: { 1: 1, 2: 1, 3: 1 },
          requiresSpecialClassroom: false,
          classroomType: 'normal',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ]

      const result = service.optimizeSubjects(subjects)

      expect(result[0].grades).toEqual([1, 2, 3])
      expect(result[1].grades).toEqual([1, 2, 3])

      expect(mockConsoleLog).toHaveBeenCalledWith('- 教科「テスト教科1」を全学年対応に拡張')
      expect(mockConsoleLog).toHaveBeenCalledWith('- 教科「テスト教科2」を全学年対応に拡張')
    })

    it('正常な対象学年がある場合は変更しない', () => {
      const subjects = [
        {
          id: 'subject-1',
          name: '数学',
          grades: [1, 2, 3],
          weeklyHours: { 1: 4, 2: 4, 3: 4 },
          requiresSpecialClassroom: false,
          classroomType: 'normal',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ]

      const result = service.optimizeSubjects(subjects)

      expect(result[0].grades).toEqual([1, 2, 3])
      // 最適化ログは出力されない
      expect(mockConsoleLog).not.toHaveBeenCalledWith(expect.stringContaining('を全学年対応に拡張'))
    })
  })

  describe('getGenerationConfig', () => {
    it('生成設定のデフォルト値を返す', async () => {
      const result = await service.getGenerationConfig()

      expect(result).toEqual({
        useOptimization: false,
        useNewAlgorithm: false,
        tolerantMode: true,
        maxAttempts: 100,
        timeoutMs: 30000,
      })
    })
  })

  describe('統合テスト', () => {
    it('実際のワークフローを通してデータが正しく変換される', async () => {
      const result = await service.loadSchoolData()

      // 学校設定の検証
      expect(result.settings.grades).toEqual([1, 2, 3])
      expect(result.settings.classesPerGrade[1]).toHaveLength(4)

      // 教師データの検証
      expect(result.teachers[0].name).toBe('田中太郎')
      expect(result.teachers[0].subjects).toContain('math-001')

      // 教科データの検証
      expect(result.subjects[0].name).toBe('数学')
      expect(result.subjects[0].weeklyHours[1]).toBe(4)

      // 教室データの検証
      expect(result.classrooms[0].name).toBe('1年A組')
      expect(result.classrooms[0].capacity).toBe(35)
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

    it('DataTransformServiceクラスが正しくインポートされている', () => {
      expect(DataTransformService).toBeDefined()
      expect(typeof DataTransformService).toBe('function')
    })

    it('DataTransformServiceが正しく作成されている', () => {
      expect(service).toBeDefined()
      expect(service).toBeInstanceOf(DataTransformService)
      expect(typeof service.loadSchoolData).toBe('function')
    })

    it('DataTransformServiceのプロパティが正しく設定されている', () => {
      expect(service).toHaveProperty('loadSchoolData')
      expect(service).toHaveProperty('parseSettings')
      expect(service).toHaveProperty('transformTeachers')
      expect(service).toHaveProperty('transformSubjects')
      expect(service).toHaveProperty('transformClassrooms')
      expect(service).toHaveProperty('optimizeSubjects')
      expect(service).toHaveProperty('getGenerationConfig')
    })

    it('モックデータベースが正しく設定されている', () => {
      expect(mockDB).toBeDefined()
      expect(typeof mockDB.prepare).toBe('function')
    })

    it('テストサンプルデータが適切に定義されている', () => {
      expect(sampleSettingsData).toBeDefined()
      expect(sampleSettingsData.id).toBe('settings-1')
      expect(sampleTeachersData).toBeDefined()
      expect(sampleTeachersData).toHaveLength(1)
      expect(sampleSubjectsData).toBeDefined()
      expect(sampleSubjectsData).toHaveLength(1)
      expect(sampleClassroomsData).toBeDefined()
      expect(sampleClassroomsData).toHaveLength(1)
    })

    it('共有スキーマ型が正しくインポートされている', () => {
      // 型定義の存在を間接的にテスト（TypeScriptコンパイルで検証）
      const settingsData: SchoolSettings = sampleSettingsData
      const teacherData: Teacher = sampleTeachersData[0] as Teacher
      const subjectData: Subject = sampleSubjectsData[0] as Subject
      const classroomData: Classroom = sampleClassroomsData[0] as Classroom

      expect(settingsData).toBeDefined()
      expect(teacherData).toBeDefined()
      expect(subjectData).toBeDefined()
      expect(classroomData).toBeDefined()
    })
  })
})
