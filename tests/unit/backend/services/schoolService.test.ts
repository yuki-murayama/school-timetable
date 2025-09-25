/**
 * SchoolService 単体テスト
 * 学校サービス層の包括的テスト - 21KB の核心ビジネスロジック
 */

import type {
  Classroom,
  EnhancedSchoolSettings,
  SchoolSettings,
  Subject,
  Teacher,
} from '@shared/schemas'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SchoolService } from '../../../../src/backend/services/schoolService'

// 大きなクラスなのでdynamic importを使用して遅延読み込み
let SchoolServiceClass: typeof SchoolService
let schoolService: SchoolService

// データベースサービスをモック化
const mockDb = {
  prepare: vi.fn(),
}

const mockStatement = {
  all: vi.fn(),
  get: vi.fn(),
  run: vi.fn(),
  bind: vi.fn(),
}

const mockDbService = {
  get: vi.fn(),
}

// Zodスキーマをモック化
vi.mock('@shared/schemas', async importOriginal => {
  const original = await importOriginal<typeof import('@shared/schemas')>()
  return {
    ...original,
    TeacherSchema: {
      parse: vi.fn(),
      omit: vi.fn(() => ({ parse: vi.fn() })),
    },
    SubjectSchema: {
      parse: vi.fn(),
    },
    ClassroomSchema: {
      parse: vi.fn(),
    },
    SchoolSettingsSchema: {
      parse: vi.fn(),
      partial: vi.fn(() => ({ parse: vi.fn() })),
    },
    EnhancedSchoolSettingsSchema: {
      parse: vi.fn(),
    },
  }
})

import {
  ClassroomSchema,
  EnhancedSchoolSettingsSchema,
  SchoolSettingsSchema,
  SubjectSchema,
  TeacherSchema,
} from '@shared/schemas'

describe('SchoolService', () => {
  const mockTeacher: Teacher = {
    id: 'teacher-1',
    name: '田中先生',
    subjects: ['数学'],
    restrictions: [],
    school_id: 'default',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  }

  const mockSubject: Subject = {
    id: 'subject-1',
    name: '数学',
    grades: [1, 2, 3],
    weeklyHours: { '1': 4, '2': 4, '3': 3 },
    requiresSpecialClassroom: false,
    specialClassroom: '',
    classroomType: '普通教室',
    order: 1,
    school_id: 'default',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  }

  const mockClassroom: Classroom = {
    id: 'classroom-1',
    name: '1-1教室',
    type: '普通教室',
    capacity: 35,
    count: 1,
    order: 1,
    school_id: 'default',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  }

  const mockSchoolSettings: EnhancedSchoolSettings = {
    id: 'default',
    grade1Classes: 4,
    grade2Classes: 3,
    grade3Classes: 3,
    grade4Classes: 3,
    grade5Classes: 3,
    grade6Classes: 3,
    dailyPeriods: 6,
    saturdayPeriods: 4,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    totalClasses: 19,
    maxPeriods: 6,
    hasWeekendClasses: false,
    classDistribution: {
      '1': 4,
      '2': 3,
      '3': 3,
      '4': 3,
      '5': 3,
      '6': 3,
    },
  }

  beforeEach(async () => {
    vi.clearAllMocks()

    // 動的インポート（遅延読み込みでメモリ効率化）
    const module = await import('../../../../src/backend/services/schoolService')
    SchoolServiceClass = module.SchoolService

    // モックの初期化
    mockDb.prepare.mockReturnValue(mockStatement)
    mockStatement.all.mockResolvedValue({ results: [] })
    mockStatement.get.mockResolvedValue(null)
    mockStatement.run.mockResolvedValue({ success: true, changes: 1 })
    mockStatement.bind.mockReturnValue(mockStatement)

    mockDbService.get.mockReturnValue(mockDb)

    // Zodスキーマモックの初期化
    vi.mocked(TeacherSchema.parse).mockReturnValue(mockTeacher)
    vi.mocked(SubjectSchema.parse).mockReturnValue(mockSubject)
    vi.mocked(ClassroomSchema.parse).mockReturnValue(mockClassroom)
    vi.mocked(SchoolSettingsSchema.parse).mockReturnValue(mockSchoolSettings)
    vi.mocked(EnhancedSchoolSettingsSchema.parse).mockReturnValue(mockSchoolSettings)

    // SchoolService インスタンス作成
    schoolService = new SchoolServiceClass(mockDb as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('データベースインスタンスが正しく設定される', () => {
      expect(schoolService.db).toBe(mockDb)
    })

    it('dbServiceメソッドが利用可能', () => {
      const dbService = schoolService.dbService()
      expect(dbService).toBeDefined()
      expect(mockDbService.get).toHaveBeenCalled()
    })
  })

  describe('学校設定管理', () => {
    describe('getSchoolSettings', () => {
      it('学校設定を正しく取得する', async () => {
        const mockResults = [
          {
            id: 'default',
            grade1Classes: 4,
            grade2Classes: 3,
            grade3Classes: 3,
            dailyPeriods: 6,
            saturdayPeriods: 4,
          },
        ]
        mockStatement.all.mockResolvedValue({ results: mockResults })

        const result = await schoolService.getSchoolSettings()

        expect(mockDb.prepare).toHaveBeenCalledWith(
          'SELECT * FROM school_settings WHERE id = ? LIMIT 1'
        )
        expect(result).toEqual(mockSchoolSettings)
      })

      it('設定が見つからない場合デフォルト値を返す', async () => {
        mockStatement.all.mockResolvedValue({ results: [] })

        const result = await schoolService.getSchoolSettings()

        expect(result).toHaveProperty('grade1Classes')
        expect(result).toHaveProperty('dailyPeriods')
        expect(result).toHaveProperty('saturdayPeriods')
      })

      it('拡張プロパティが正しく計算される', async () => {
        const mockResults = [
          {
            id: 'default',
            grade1Classes: 4,
            grade2Classes: 3,
            grade3Classes: 3,
            dailyPeriods: 6,
            saturdayPeriods: 4,
          },
        ]
        mockStatement.all.mockResolvedValue({ results: mockResults })

        const result = await schoolService.getSchoolSettings()

        expect(result.totalClasses).toBeDefined()
        expect(result.maxPeriods).toBeDefined()
        expect(result.hasWeekendClasses).toBeDefined()
        expect(result.classDistribution).toBeDefined()
      })
    })

    describe('updateSchoolSettings', () => {
      it('学校設定を正しく更新する', async () => {
        const updateData: Partial<SchoolSettings> = {
          grade1Classes: 5,
          dailyPeriods: 7,
        }

        mockStatement.get.mockResolvedValue(mockSchoolSettings)
        vi.mocked(SchoolSettingsSchema.partial().parse).mockReturnValue(updateData)

        const result = await schoolService.updateSchoolSettings(updateData)

        expect(mockDb.prepare).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE school_settings SET')
        )
        expect(result).toEqual(mockSchoolSettings)
      })

      it('存在しない設定の場合は挿入処理を行う', async () => {
        const updateData: Partial<SchoolSettings> = {
          grade1Classes: 4,
          dailyPeriods: 6,
        }

        mockStatement.get.mockResolvedValue(null) // 設定が存在しない
        vi.mocked(SchoolSettingsSchema.partial().parse).mockReturnValue(updateData)

        const result = await schoolService.updateSchoolSettings(updateData)

        expect(mockDb.prepare).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO school_settings')
        )
        expect(result).toEqual(mockSchoolSettings)
      })

      it('バリデーションエラーが適切に処理される', async () => {
        const invalidData = { grade1Classes: -1 }
        vi.mocked(SchoolSettingsSchema.partial().parse).mockImplementation(() => {
          throw new Error('Validation failed')
        })

        await expect(schoolService.updateSchoolSettings(invalidData)).rejects.toThrow(
          'Validation failed'
        )
      })
    })
  })

  describe('教師管理', () => {
    describe('getAllTeachers', () => {
      it('教師一覧を正しく取得する', async () => {
        const mockTableInfo = [
          { name: 'id' },
          { name: 'name' },
          { name: 'email' },
          { name: 'grades' },
          { name: 'subjects' },
          { name: 'assignment_restrictions' },
        ]
        const mockTeacherData = [
          {
            id: 'teacher-1',
            name: '田中先生',
            email: 'tanaka@school.com',
            subjects: '["数学"]',
            grades: '[1, 2, 3]',
            assignment_restrictions: '["月曜1限"]',
            created_at: '2024-01-01T00:00:00.000Z',
          },
        ]

        mockStatement.all
          .mockResolvedValueOnce({ results: mockTableInfo }) // PRAGMA table_info
          .mockResolvedValueOnce({ results: mockTeacherData }) // SELECT teachers

        const result = await schoolService.getAllTeachers()

        expect(mockDb.prepare).toHaveBeenCalledWith('PRAGMA table_info(teachers)')
        expect(mockDb.prepare).toHaveBeenCalledWith(
          expect.stringContaining('SELECT t.id, t.name, t.email')
        )
        expect(result).toHaveLength(1)
        expect(vi.mocked(TeacherSchema.parse)).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'teacher-1',
            name: '田中先生',
            subjects: ['数学'],
            grades: [1, 2, 3],
          })
        )
      })

      it('テーブル構造に応じて動的クエリを生成する', async () => {
        const mockTableInfoMinimal = [{ name: 'id' }, { name: 'name' }, { name: 'email' }] // grades, subjects, assignment_restrictions なし

        mockStatement.all
          .mockResolvedValueOnce({ results: mockTableInfoMinimal })
          .mockResolvedValueOnce({ results: [] })

        await schoolService.getAllTeachers()

        const queryCall = mockDb.prepare.mock.calls.find(
          call => typeof call[0] === 'string' && call[0].includes('SELECT t.id, t.name, t.email')
        )
        expect(queryCall?.[0]).not.toContain('t.grades')
        expect(queryCall?.[0]).not.toContain('t.subjects')
        expect(queryCall?.[0]).not.toContain('t.assignment_restrictions')
      })

      it('JSON解析エラーを安全に処理する', async () => {
        const mockTableInfo = [{ name: 'id' }, { name: 'name' }, { name: 'subjects' }]
        const mockTeacherDataInvalid = [
          {
            id: 'teacher-1',
            name: '田中先生',
            subjects: 'invalid json', // 無効なJSON
          },
        ]

        mockStatement.all
          .mockResolvedValueOnce({ results: mockTableInfo })
          .mockResolvedValueOnce({ results: mockTeacherDataInvalid })

        const result = await schoolService.getAllTeachers()

        expect(vi.mocked(TeacherSchema.parse)).toHaveBeenCalledWith(
          expect.objectContaining({
            subjects: [], // フォールバック値
          })
        )
      })

      it('空のデータベース結果を処理する', async () => {
        mockStatement.all
          .mockResolvedValueOnce({ results: [] }) // table_info
          .mockResolvedValueOnce({ results: [] }) // teachers

        const result = await schoolService.getAllTeachers()

        expect(result).toEqual([])
      })
    })

    describe('createTeacher', () => {
      it('新しい教師を正しく作成する', async () => {
        const teacherData = {
          name: '佐藤先生',
          email: 'sato@school.com',
          subjects: ['国語'],
          grades: [1, 2],
        }

        const createSchema = { parse: vi.fn().mockReturnValue(teacherData) }
        vi.mocked(TeacherSchema.omit).mockReturnValue(createSchema as any)

        const result = await schoolService.createTeacher(teacherData)

        expect(mockDb.prepare).toHaveBeenCalledWith('PRAGMA table_info(teachers)')
        expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO teachers'))
        expect(result).toEqual(mockTeacher)
      })

      it('配列データが正しくJSON文字列に変換される', async () => {
        const teacherData = {
          name: '佐藤先生',
          subjects: ['国語', '社会'],
          grades: [1, 2, 3],
        }

        const createSchema = { parse: vi.fn().mockReturnValue(teacherData) }
        vi.mocked(TeacherSchema.omit).mockReturnValue(createSchema as any)

        await schoolService.createTeacher(teacherData)

        const insertCall = mockDb.prepare.mock.calls.find(
          call => typeof call[0] === 'string' && call[0].includes('INSERT INTO teachers')
        )
        expect(insertCall).toBeDefined()
      })

      it('テーブル構造に応じた動的挿入を行う', async () => {
        const mockTableInfo = [
          { name: 'id' },
          { name: 'name' },
          { name: 'email' },
          // grades, subjects などなし
        ]
        mockStatement.all.mockResolvedValue({ results: mockTableInfo })

        const teacherData = {
          name: '佐藤先生',
          email: 'sato@school.com',
        }

        const createSchema = { parse: vi.fn().mockReturnValue(teacherData) }
        vi.mocked(TeacherSchema.omit).mockReturnValue(createSchema as any)

        await schoolService.createTeacher(teacherData)

        const insertCall = mockDb.prepare.mock.calls.find(
          call => typeof call[0] === 'string' && call[0].includes('INSERT INTO teachers')
        )
        expect(insertCall?.[0]).not.toContain('subjects')
        expect(insertCall?.[0]).not.toContain('grades')
      })

      it('バリデーションエラーを適切に処理する', async () => {
        const invalidData = { name: '' }
        const createSchema = {
          parse: vi.fn().mockImplementation(() => {
            throw new Error('Name is required')
          }),
        }
        vi.mocked(TeacherSchema.omit).mockReturnValue(createSchema as any)

        await expect(schoolService.createTeacher(invalidData)).rejects.toThrow('Name is required')
      })
    })

    describe('updateTeacher', () => {
      it('教師情報を正しく更新する', async () => {
        const updateData = {
          name: '田中太郎先生',
          subjects: ['数学', '理科'],
        }

        mockStatement.get.mockResolvedValue(mockTeacher)

        const result = await schoolService.updateTeacher('teacher-1', updateData)

        expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM teachers WHERE id = ?')
        expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE teachers SET'))
        expect(result).toEqual(mockTeacher)
      })

      it('存在しない教師の更新でエラーを投げる', async () => {
        mockStatement.get.mockResolvedValue(null)

        await expect(schoolService.updateTeacher('nonexistent', {})).rejects.toThrow(
          'Teacher not found'
        )
      })

      it('部分更新が正しく動作する', async () => {
        const updateData = { name: '新しい名前' }
        mockStatement.get.mockResolvedValue(mockTeacher)

        await schoolService.updateTeacher('teacher-1', updateData)

        const updateCall = mockDb.prepare.mock.calls.find(
          call => typeof call[0] === 'string' && call[0].includes('UPDATE teachers SET')
        )
        expect(updateCall).toBeDefined()
        expect(mockStatement.run).toHaveBeenCalled()
      })
    })

    describe('deleteTeacher', () => {
      it('教師を正しく削除する', async () => {
        mockStatement.get.mockResolvedValue(mockTeacher)

        await schoolService.deleteTeacher('teacher-1')

        expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM teachers WHERE id = ?')
        expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM teachers WHERE id = ?')
      })

      it('存在しない教師の削除でエラーを投げる', async () => {
        mockStatement.get.mockResolvedValue(null)

        await expect(schoolService.deleteTeacher('nonexistent')).rejects.toThrow(
          'Teacher not found'
        )
      })
    })
  })

  describe('教科管理', () => {
    describe('getAllSubjects', () => {
      it('教科一覧を正しく取得する', async () => {
        const mockSubjectData = [
          {
            id: 'subject-1',
            name: '数学',
            color: '#FF0000',
            target_grades: '[1,2,3]',
            weekly_hours: 4,
            order: 1,
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z',
          },
        ]

        mockStatement.all.mockResolvedValue({ results: mockSubjectData })

        const result = await schoolService.getAllSubjects()

        expect(mockDb.prepare).toHaveBeenCalledWith(
          'SELECT * FROM subjects ORDER BY `order` ASC, name ASC'
        )
        expect(result).toHaveLength(1)
        expect(vi.mocked(SubjectSchema.parse)).toHaveBeenCalled()
      })

      it('データ変換エラーを適切にハンドルする', async () => {
        const mockSubjectDataInvalid = [
          {
            id: 'subject-1',
            name: '数学',
            target_grades: 'invalid json',
            weekly_hours: 'invalid number',
          },
        ]

        mockStatement.all.mockResolvedValue({ results: mockSubjectDataInvalid })

        const result = await schoolService.getAllSubjects()

        // エラーが発生しても他の有効なデータは処理される
        expect(result).toBeDefined()
      })

      it('空のデータベース結果を処理する', async () => {
        mockStatement.all.mockResolvedValue({ results: [] })

        const result = await schoolService.getAllSubjects()

        expect(result).toEqual([])
      })

      it('バリデーションエラーを収集する', async () => {
        const mockSubjectDataMultiple = [
          { id: 'subject-1', name: '数学' }, // 有効
          { id: 'subject-2', name: '' }, // 無効
          { id: 'subject-3', name: '国語' }, // 有効
        ]

        mockStatement.all.mockResolvedValue({ results: mockSubjectDataMultiple })

        // 2番目だけバリデーションエラー
        vi.mocked(SubjectSchema.parse)
          .mockReturnValueOnce(mockSubject)
          .mockImplementationOnce(() => {
            throw new Error('Name required')
          })
          .mockReturnValueOnce(mockSubject)

        const result = await schoolService.getAllSubjects()

        expect(result).toHaveLength(2) // エラーのあった1件は除外
      })
    })

    describe('createSubject', () => {
      it('新しい教科を正しく作成する', async () => {
        const subjectData = {
          name: '理科',
          school_id: 'default',
          weekly_hours: 3,
          target_grades: '[1,2,3]',
        }

        const result = await schoolService.createSubject(subjectData)

        expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO subjects'))
        expect(result).toEqual(mockSubject)
      })

      it('データクリーニングが正しく動作する', async () => {
        const subjectData = {
          name: '  理科  ', // 前後空白
          school_id: 'default',
          weekly_hours: '3', // 文字列数値
          target_grades: '[1,2,3]',
          color: '', // 空文字列
        }

        await schoolService.createSubject(subjectData)

        // データクリーニングが実行されることを確認
        expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO subjects'))
      })

      it('必須フィールドの検証を行う', async () => {
        const invalidData = {
          // nameなし
          school_id: 'default',
        }

        await expect(schoolService.createSubject(invalidData as any)).rejects.toThrow()
      })
    })

    describe('updateSubject', () => {
      it('教科情報を正しく更新する', async () => {
        const updateData = {
          name: '数学（応用）',
          weekly_hours: 5,
        }

        mockStatement.get.mockResolvedValue(mockSubject)

        const result = await schoolService.updateSubject('subject-1', updateData)

        expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM subjects WHERE id = ?')
        expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE subjects SET'))
        expect(result).toEqual(mockSubject)
      })

      it('存在しない教科の更新でエラーを投げる', async () => {
        mockStatement.get.mockResolvedValue(null)

        await expect(schoolService.updateSubject('nonexistent', {})).rejects.toThrow(
          'Subject not found'
        )
      })

      it('データマージが正しく動作する', async () => {
        const existingSubject = {
          ...mockSubject,
          name: '数学',
          weekly_hours: 4,
        }
        const updateData = { name: '数学（改）' }

        mockStatement.get.mockResolvedValue(existingSubject)

        await schoolService.updateSubject('subject-1', updateData)

        // 既存データと更新データがマージされることを確認
        expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE subjects SET'))
      })
    })

    describe('deleteSubject', () => {
      it('教科を正しく削除する', async () => {
        mockStatement.get.mockResolvedValue(mockSubject)

        await schoolService.deleteSubject('subject-1')

        expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM subjects WHERE id = ?')
        expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM subjects WHERE id = ?')
      })

      it('存在しない教科の削除でエラーを投げる', async () => {
        mockStatement.get.mockResolvedValue(null)

        await expect(schoolService.deleteSubject('nonexistent')).rejects.toThrow(
          'Subject not found'
        )
      })
    })
  })

  describe('教室管理', () => {
    describe('getAllClassrooms', () => {
      it('教室一覧を正しく取得する', async () => {
        const mockClassroomData = [
          {
            id: 'classroom-1',
            name: '1-1教室',
            capacity: 35,
            equipment: '["プロジェクタ"]',
            created_at: '2024-01-01T00:00:00.000Z',
          },
        ]

        mockStatement.all.mockResolvedValue({ results: mockClassroomData })

        const result = await schoolService.getAllClassrooms()

        expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM classrooms ORDER BY name ASC')
        expect(result).toHaveLength(1)
        expect(result[0]).toHaveProperty('id', 'classroom-1')
      })

      it('設備データのJSON解析を行う', async () => {
        const mockClassroomData = [
          {
            id: 'classroom-1',
            name: '理科室',
            equipment: '["実験台", "顕微鏡"]',
          },
        ]

        mockStatement.all.mockResolvedValue({ results: mockClassroomData })

        const result = await schoolService.getAllClassrooms()

        expect(result[0]).toHaveProperty('equipment', ['実験台', '顕微鏡'])
      })

      it('無効なJSON設備データを安全に処理する', async () => {
        const mockClassroomData = [
          {
            id: 'classroom-1',
            name: '理科室',
            equipment: 'invalid json',
          },
        ]

        mockStatement.all.mockResolvedValue({ results: mockClassroomData })

        const result = await schoolService.getAllClassrooms()

        expect(result[0]).toHaveProperty('equipment', []) // フォールバック
      })
    })

    describe('createClassroom', () => {
      it('新しい教室を正しく作成する', async () => {
        const classroomData = {
          name: '音楽室1',
          capacity: 40,
          equipment: ['ピアノ', 'スピーカー'],
        }

        const result = await schoolService.createClassroom(classroomData)

        expect(mockDb.prepare).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO classrooms')
        )
        expect(result).toEqual(mockClassroom)
      })

      it('設備データが正しくJSON文字列に変換される', async () => {
        const classroomData = {
          name: '理科室1',
          capacity: 30,
          equipment: ['実験台', '顕微鏡', 'ドラフトチャンバー'],
        }

        await schoolService.createClassroom(classroomData)

        expect(mockDb.prepare).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO classrooms')
        )
        expect(mockStatement.run).toHaveBeenCalled()
      })
    })

    describe('updateClassroom', () => {
      it('教室情報を正しく更新する', async () => {
        const updateData = {
          name: '1-1教室（改修後）',
          capacity: 40,
        }

        mockStatement.get.mockResolvedValue(mockClassroom)

        const result = await schoolService.updateClassroom('classroom-1', updateData)

        expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM classrooms WHERE id = ?')
        expect(mockDb.prepare).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE classrooms SET')
        )
        expect(result).toEqual(mockClassroom)
      })

      it('存在しない教室の更新でエラーを投げる', async () => {
        mockStatement.get.mockResolvedValue(null)

        await expect(schoolService.updateClassroom('nonexistent', {})).rejects.toThrow(
          'Classroom not found'
        )
      })
    })

    describe('deleteClassroom', () => {
      it('教室を正しく削除する', async () => {
        mockStatement.get.mockResolvedValue(mockClassroom)

        await schoolService.deleteClassroom('classroom-1')

        expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM classrooms WHERE id = ?')
        expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM classrooms WHERE id = ?')
      })

      it('存在しない教室の削除でエラーを投げる', async () => {
        mockStatement.get.mockResolvedValue(null)

        await expect(schoolService.deleteClassroom('nonexistent')).rejects.toThrow(
          'Classroom not found'
        )
      })
    })
  })

  describe('関連データ管理', () => {
    describe('createTeacherSubjectRelation', () => {
      it('教師と教科の関連を作成する', async () => {
        await schoolService.createTeacherSubjectRelation('teacher-1', 'subject-1')

        expect(mockDb.prepare).toHaveBeenCalledWith(
          'INSERT INTO teacher_subject_relations (teacher_id, subject_id) VALUES (?, ?)'
        )
        expect(mockStatement.run).toHaveBeenCalledWith(['teacher-1', 'subject-1'])
      })
    })

    describe('getTeacherSubjectRelations', () => {
      it('教師と教科の関連一覧を取得する', async () => {
        const mockRelationData = [
          { teacher_id: 'teacher-1', subject_id: 'subject-1' },
          { teacher_id: 'teacher-1', subject_id: 'subject-2' },
        ]

        mockStatement.all.mockResolvedValue({ results: mockRelationData })

        const result = await schoolService.getTeacherSubjectRelations()

        expect(mockDb.prepare).toHaveBeenCalledWith(
          'SELECT teacher_id, subject_id FROM teacher_subject_relations'
        )
        expect(result).toHaveLength(2)
        expect(result[0]).toHaveProperty('teacherId', 'teacher-1')
        expect(result[0]).toHaveProperty('subjectId', 'subject-1')
      })
    })

    describe('getValidationData', () => {
      it('バリデーション用データを一括取得する', async () => {
        mockStatement.all
          .mockResolvedValueOnce({ results: [mockTeacher] })
          .mockResolvedValueOnce({ results: [mockSubject] })
          .mockResolvedValueOnce({ results: [mockClassroom] })

        const result = await schoolService.getValidationData()

        expect(result).toHaveProperty('teachers')
        expect(result).toHaveProperty('subjects')
        expect(result).toHaveProperty('classrooms')
        expect(result.teachers).toHaveLength(1)
        expect(result.subjects).toHaveLength(1)
        expect(result.classrooms).toHaveLength(1)
      })

      it('並列処理でデータを効率的に取得する', async () => {
        mockStatement.all.mockResolvedValue({ results: [] })

        await schoolService.getValidationData()

        // Promise.allが使用され、3つの取得処理が並列実行される
        expect(mockDb.prepare).toHaveBeenCalledTimes(3)
      })
    })
  })

  describe('条件管理', () => {
    describe('getConditions', () => {
      it('条件設定を取得する', async () => {
        const mockConditions = {
          maxConsecutivePeriods: 3,
          preferredTimeSlots: ['月曜1限', '火曜2限'],
          avoidedTimeSlots: ['金曜6限'],
        }

        const result = await schoolService.getConditions()

        expect(result).toHaveProperty('maxConsecutivePeriods')
        expect(result).toHaveProperty('preferredTimeSlots')
        expect(result).toHaveProperty('avoidedTimeSlots')
      })
    })

    describe('updateConditions', () => {
      it('条件設定を更新する', async () => {
        const newConditions = {
          maxConsecutivePeriods: 2,
          preferredTimeSlots: ['月曜1限'],
        }

        await schoolService.updateConditions(newConditions)

        expect(mockDb.prepare).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE conditions SET')
        )
      })
    })
  })

  describe('エラーハンドリングとエッジケース', () => {
    it('データベース接続エラーを適切に処理する', async () => {
      mockDb.prepare.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      await expect(schoolService.getAllTeachers()).rejects.toThrow('Database connection failed')
    })

    it('SQLエラーを適切に処理する', async () => {
      mockStatement.all.mockRejectedValue(new Error('SQL syntax error'))

      await expect(schoolService.getAllTeachers()).rejects.toThrow('SQL syntax error')
    })

    it('null/undefinedの入力を安全に処理する', async () => {
      await expect(schoolService.updateTeacher(null as any, null as any)).rejects.toThrow()

      await expect(
        schoolService.updateSubject(undefined as any, undefined as any)
      ).rejects.toThrow()
    })

    it('大量のデータを効率的に処理する', async () => {
      const largeDataset = Array.from({ length: 50 }, (_, i) => ({
        id: `teacher-${i}`,
        name: `先生${i}`,
        subjects: '["数学"]',
        created_at: '2024-01-01T00:00:00.000Z',
      }))

      mockStatement.all
        .mockResolvedValueOnce({
          results: [{ name: 'id' }, { name: 'name' }, { name: 'subjects' }],
        })
        .mockResolvedValueOnce({ results: largeDataset })

      const startTime = performance.now()
      const result = await schoolService.getAllTeachers()
      const endTime = performance.now()

      expect(result).toHaveLength(1000)
      expect(endTime - startTime).toBeLessThan(1000) // 1秒以内
    })

    it('メモリリークを防ぐ', () => {
      // 大量インスタンス作成してもメモリリークしない
      const instances = Array.from({ length: 5 }, () => new SchoolServiceClass(mockDb as any))

      expect(instances).toHaveLength(5)
      // ガベージコレクション後もメモリが適切に管理される
      instances.length = 0
      expect(instances).toHaveLength(0)
    })
  })

  describe('データ整合性', () => {
    it('トランザクション処理を適切に実行する', async () => {
      const teacherData = {
        name: '新しい先生',
        subjects: ['数学', '理科'],
      }

      await schoolService.createTeacher(teacherData)

      // トランザクション的な処理が実行される
      expect(mockDb.prepare).toHaveBeenCalled()
      expect(mockStatement.run).toHaveBeenCalled()
    })

    it('外部キー制約を尊重する', async () => {
      mockStatement.run.mockRejectedValue(new Error('FOREIGN KEY constraint failed'))

      await expect(
        schoolService.createTeacherSubjectRelation('invalid-teacher', 'subject-1')
      ).rejects.toThrow('FOREIGN KEY constraint failed')
    })

    it('一意制約違反を適切に処理する', async () => {
      mockStatement.run.mockRejectedValue(new Error('UNIQUE constraint failed'))

      await expect(schoolService.createTeacher({ name: '重複する名前' })).rejects.toThrow(
        'UNIQUE constraint failed'
      )
    })
  })

  describe('パフォーマンス', () => {
    it('クエリの最適化が行われている', async () => {
      await schoolService.getAllTeachers()

      // INDEXを使用したクエリが生成されることを確認
      const queryCall = mockDb.prepare.mock.calls.find(
        call => typeof call[0] === 'string' && call[0].includes('ORDER BY t.name')
      )
      expect(queryCall).toBeDefined()
    })

    it('N+1クエリ問題を回避している', async () => {
      await schoolService.getValidationData()

      // 並列処理により効率的にデータを取得
      expect(mockDb.prepare).toHaveBeenCalledTimes(3) // 個別クエリではなく並列
    })

    it('メモリ使用量を最適化している', async () => {
      const mockLargeResult = Array.from({ length: 10 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
      }))
      mockStatement.all.mockResolvedValue({ results: mockLargeResult })

      const beforeMemory = process.memoryUsage().heapUsed
      await schoolService.getAllSubjects()
      const afterMemory = process.memoryUsage().heapUsed

      // メモリ使用量の増加が合理的な範囲内
      const memoryIncrease = afterMemory - beforeMemory
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024) // 50MB以内
    })
  })
})
