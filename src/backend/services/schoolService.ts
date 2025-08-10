import type { SchoolSettings } from '../../shared/types'
import { defaultSettings } from '../config'
import { DatabaseService } from './database'

export interface Teacher {
  id: string
  name: string
  email?: string
  subjects?: string[]
  grades?: number[]
  assignmentRestrictions?: string[]
  order?: number
  created_at?: string
  updated_at?: string
}

export interface Subject {
  id: string
  name: string
  color?: string
  targetGrades?: number[]
  order?: number
  created_at?: string
  updated_at?: string
}

export interface Classroom {
  id: string
  name: string
  capacity?: number
  equipment?: string[]
  created_at?: string
  updated_at?: string
}

export interface TeacherSubjectRelation {
  teacherId: string
  subjectId: string
  created_at?: string
}

export class SchoolService {
  constructor(private db: D1Database) {}

  private get dbService(): DatabaseService {
    return new DatabaseService(this.db)
  }

  // 学校設定関連
  async getSchoolSettings(): Promise<SchoolSettings> {
    const result = await this.db
      .prepare('SELECT * FROM school_settings WHERE id = ? LIMIT 1')
      .bind('default')
      .first()

    if (result) {
      return {
        grade1Classes: result.grade1Classes || defaultSettings.grade1Classes,
        grade2Classes: result.grade2Classes || defaultSettings.grade2Classes,
        grade3Classes: result.grade3Classes || defaultSettings.grade3Classes,
        dailyPeriods: result.dailyPeriods || defaultSettings.dailyPeriods,
        saturdayPeriods: result.saturdayPeriods || defaultSettings.saturdayPeriods,
      }
    }

    return defaultSettings
  }

  async updateSchoolSettings(settings: Partial<SchoolSettings>): Promise<SchoolSettings> {
    const currentSettings = await this.getSchoolSettings()
    const newSettings = { ...currentSettings, ...settings }

    await this.db
      .prepare(`
        INSERT OR REPLACE INTO school_settings 
        (id, grade1Classes, grade2Classes, grade3Classes, dailyPeriods, saturdayPeriods, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `)
      .bind(
        'default',
        newSettings.grade1Classes,
        newSettings.grade2Classes,
        newSettings.grade3Classes,
        newSettings.dailyPeriods,
        newSettings.saturdayPeriods
      )
      .run()

    return newSettings
  }

  // 教師関連
  async getAllTeachers(): Promise<Teacher[]> {
    // テーブル構造確認
    const tableInfo = await this.db.prepare('PRAGMA table_info(teachers)').all()
    const hasGrades = tableInfo.results?.some(
      (col: Record<string, unknown>) => col.name === 'grades'
    )
    const hasSubjects = tableInfo.results?.some(
      (col: Record<string, unknown>) => col.name === 'subjects'
    )
    const hasAssignmentRestrictions = tableInfo.results?.some(
      (col: Record<string, unknown>) => col.name === 'assignment_restrictions'
    )

    let query = 'SELECT t.id, t.name, t.email, t.created_at'
    if (hasGrades) query += ', t.grades'
    if (hasSubjects) query += ', t.subjects'
    if (hasAssignmentRestrictions) query += ', t.assignment_restrictions'
    query += ' FROM teachers t ORDER BY t.name'

    const result = await this.db.prepare(query).all()

    return (result.results || []).map((row: Record<string, unknown>): Teacher => {
      let subjects: string[] = []
      let grades: number[] = []
      let assignmentRestrictions: string[] = []

      try {
        subjects = row.subjects ? JSON.parse(row.subjects) : []
      } catch (_e) {
        subjects = []
      }

      try {
        grades = row.grades ? JSON.parse(row.grades) : []
      } catch (_e) {
        grades = []
      }

      try {
        assignmentRestrictions = row.assignment_restrictions
          ? JSON.parse(row.assignment_restrictions)
          : []
      } catch (_e) {
        assignmentRestrictions = []
      }

      return {
        id: row.id,
        name: row.name,
        email: row.email,
        subjects,
        grades,
        assignmentRestrictions,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }
    })
  }

  async createTeacher(
    teacher: Omit<Teacher, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Teacher> {
    const teacherId = `teacher-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

    // テーブル構造確認
    const tableInfo = await this.db.prepare('PRAGMA table_info(teachers)').all()
    const hasGrades = tableInfo.results?.some(
      (col: Record<string, unknown>) => col.name === 'grades'
    )
    const hasSubjects = tableInfo.results?.some(
      (col: Record<string, unknown>) => col.name === 'subjects'
    )
    const hasAssignmentRestrictions = tableInfo.results?.some(
      (col: Record<string, unknown>) => col.name === 'assignment_restrictions'
    )

    if (hasGrades && hasSubjects && hasAssignmentRestrictions) {
      await this.db
        .prepare(`
          INSERT INTO teachers (id, name, email, grades, assignment_restrictions, subjects, school_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `)
        .bind(
          teacherId,
          teacher.name,
          teacher.email || '',
          JSON.stringify(teacher.grades || []),
          JSON.stringify(teacher.assignmentRestrictions || []),
          JSON.stringify(teacher.subjects || []),
          'school-1'
        )
        .run()
    } else {
      // 基本カラムのみでINSERT
      await this.db
        .prepare(`
          INSERT INTO teachers (id, name, email, school_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `)
        .bind(teacherId, teacher.name, teacher.email || '', 'school-1')
        .run()
    }

    return {
      id: teacherId,
      name: teacher.name,
      email: teacher.email,
      subjects: teacher.subjects || [],
      grades: teacher.grades || [],
      assignmentRestrictions: teacher.assignmentRestrictions || [],
    }
  }

  async updateTeacher(teacherId: string, updates: Partial<Teacher>): Promise<Teacher> {
    const existing = await this.db
      .prepare('SELECT * FROM teachers WHERE id = ?')
      .bind(teacherId)
      .first()

    if (!existing) {
      throw new Error('Teacher not found')
    }

    const updateFields: string[] = []
    const updateValues: unknown[] = []

    if (updates.name !== undefined) {
      updateFields.push('name = ?')
      updateValues.push(updates.name)
    }

    if (updates.email !== undefined) {
      updateFields.push('email = ?')
      updateValues.push(updates.email || '')
    }

    if (updates.grades !== undefined) {
      updateFields.push('grades = ?')
      updateValues.push(JSON.stringify(updates.grades))
    }

    if (updates.subjects !== undefined) {
      updateFields.push('subjects = ?')
      updateValues.push(JSON.stringify(updates.subjects))
    }

    if (updates.assignmentRestrictions !== undefined) {
      updateFields.push('assignment_restrictions = ?')
      updateValues.push(JSON.stringify(updates.assignmentRestrictions))
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP')

    await this.db
      .prepare(`UPDATE teachers SET ${updateFields.join(', ')} WHERE id = ?`)
      .bind(...updateValues, teacherId)
      .run()

    const updated = await this.db
      .prepare('SELECT * FROM teachers WHERE id = ?')
      .bind(teacherId)
      .first()

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      subjects: updated.subjects ? JSON.parse(updated.subjects) : [],
      grades: updated.grades ? JSON.parse(updated.grades) : [],
      assignmentRestrictions: updated.assignment_restrictions
        ? JSON.parse(updated.assignment_restrictions)
        : [],
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    }
  }

  async deleteTeacher(teacherId: string): Promise<void> {
    const existing = await this.db
      .prepare('SELECT id FROM teachers WHERE id = ?')
      .bind(teacherId)
      .first()

    if (!existing) {
      throw new Error('Teacher not found')
    }

    // 関連データ削除
    await this.db.prepare('DELETE FROM teacher_subjects WHERE teacher_id = ?').bind(teacherId).run()

    await this.db.prepare('DELETE FROM teachers WHERE id = ?').bind(teacherId).run()
  }

  // 教科関連
  async getAllSubjects(): Promise<Subject[]> {
    const result = await this.db.prepare('SELECT * FROM subjects ORDER BY name').all()

    return (result.results || []).map((row: Record<string, unknown>): Subject => {
      // target_gradesフィールドから学年データを取得
      const grades =
        row.target_grades || row.targetGrades
          ? JSON.parse(row.target_grades || row.targetGrades || '[]')
          : []

      return {
        id: row.id,
        name: row.name,
        color: row.color,
        // 統一型定義のgradesフィールド（メインフィールド）
        grades: grades,
        // 互換性フィールド
        targetGrades: grades,
        target_grades: grades,
        // 追加フィールド
        weeklyHours: row.weeklyHours || row.weekly_hours || 1,
        weekly_hours: row.weeklyHours || row.weekly_hours || 1,
        order: row.order || 0,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }
    })
  }

  async createSubject(
    subject: Omit<Subject, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Subject> {
    const subjectId = `subject-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

    // 学年データを統合処理
    const grades = subject.targetGrades || subject.grades || []

    await this.db
      .prepare(`
        INSERT INTO subjects (id, name, color, target_grades, weekly_hours, \`order\`, school_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `)
      .bind(
        subjectId,
        subject.name,
        subject.color || '#3B82F6',
        JSON.stringify(grades),
        JSON.stringify({
          1: subject.weeklyHours || subject.weekly_hours || 1,
          2: subject.weeklyHours || subject.weekly_hours || 1,
          3: subject.weeklyHours || subject.weekly_hours || 1,
        }),
        subject.order || 0,
        'school-1'
      )
      .run()

    return {
      id: subjectId,
      name: subject.name,
      color: subject.color,
      // 統一型定義のgradesフィールド（メインフィールド）
      grades: grades,
      // 互換性フィールド
      targetGrades: grades,
      target_grades: grades,
      // 追加フィールド
      weeklyHours: subject.weeklyHours || subject.weekly_hours || 1,
      weekly_hours: subject.weeklyHours || subject.weekly_hours || 1,
      order: subject.order || 0,
    }
  }

  async updateSubject(subjectId: string, updates: Partial<Subject>): Promise<Subject> {
    const existing = await this.db
      .prepare('SELECT * FROM subjects WHERE id = ?')
      .bind(subjectId)
      .first()

    if (!existing) {
      throw new Error('Subject not found')
    }

    const updateFields: string[] = []
    const updateValues: unknown[] = []

    if (updates.name !== undefined) {
      updateFields.push('name = ?')
      updateValues.push(updates.name)
    }

    if (updates.color !== undefined) {
      updateFields.push('color = ?')
      updateValues.push(updates.color)
    }

    // 学年データの更新（複数フィールドから統合）
    const grades = updates.targetGrades || updates.grades || updates.target_grades
    if (grades !== undefined) {
      updateFields.push('target_grades = ?')
      updateValues.push(JSON.stringify(grades))
    }

    // 週間授業数の更新
    const weeklyHours = updates.weeklyHours || updates.weekly_hours
    if (weeklyHours !== undefined) {
      updateFields.push('weekly_hours = ?')
      updateValues.push(JSON.stringify({ 1: weeklyHours, 2: weeklyHours, 3: weeklyHours }))
    }

    // 専用教室関連はDBスキーマに存在しないため削除

    if (updates.order !== undefined) {
      updateFields.push('`order` = ?')
      updateValues.push(updates.order)
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP')

    await this.db
      .prepare(`UPDATE subjects SET ${updateFields.join(', ')} WHERE id = ?`)
      .bind(...updateValues, subjectId)
      .run()

    const updated = await this.db
      .prepare('SELECT * FROM subjects WHERE id = ?')
      .bind(subjectId)
      .first()

    const resultGrades = updated.target_grades ? JSON.parse(updated.target_grades) : []
    return {
      id: updated.id,
      name: updated.name,
      color: updated.color,
      // 統一型定義のgradesフィールド（メインフィールド）
      grades: resultGrades,
      // 互換性フィールド
      targetGrades: resultGrades,
      target_grades: resultGrades,
      // 追加フィールド
      weeklyHours: updated.weeklyHours || updated.weekly_hours || 1,
      weekly_hours: updated.weeklyHours || updated.weekly_hours || 1,
      order: updated.order || 0,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    }
  }

  async deleteSubject(subjectId: string): Promise<void> {
    const existing = await this.db
      .prepare('SELECT id FROM subjects WHERE id = ?')
      .bind(subjectId)
      .first()

    if (!existing) {
      throw new Error('Subject not found')
    }

    // 関連データ削除
    await this.db.prepare('DELETE FROM teacher_subjects WHERE subject_id = ?').bind(subjectId).run()

    await this.db.prepare('DELETE FROM subjects WHERE id = ?').bind(subjectId).run()
  }

  // 教室関連
  async getAllClassrooms(): Promise<Classroom[]> {
    const result = await this.db.prepare('SELECT * FROM classrooms ORDER BY name').all()

    return (result.results || []).map(
      (row: Record<string, unknown>): Classroom => ({
        id: row.id,
        name: row.name,
        capacity: row.capacity,
        equipment: row.equipment ? JSON.parse(row.equipment) : [],
        created_at: row.created_at,
        updated_at: row.updated_at,
      })
    )
  }

  async createClassroom(
    classroom: Omit<Classroom, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Classroom> {
    const classroomId = `classroom-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

    await this.db
      .prepare(`
        INSERT INTO classrooms (id, name, capacity, equipment, school_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `)
      .bind(
        classroomId,
        classroom.name,
        classroom.capacity || null,
        JSON.stringify(classroom.equipment || []),
        'school-1'
      )
      .run()

    return {
      id: classroomId,
      name: classroom.name,
      capacity: classroom.capacity,
      equipment: classroom.equipment || [],
    }
  }

  async updateClassroom(classroomId: string, updates: Partial<Classroom>): Promise<Classroom> {
    const existing = await this.db
      .prepare('SELECT * FROM classrooms WHERE id = ?')
      .bind(classroomId)
      .first()

    if (!existing) {
      throw new Error('Classroom not found')
    }

    const updateFields: string[] = []
    const updateValues: unknown[] = []

    if (updates.name !== undefined) {
      updateFields.push('name = ?')
      updateValues.push(updates.name)
    }

    if (updates.capacity !== undefined) {
      updateFields.push('capacity = ?')
      updateValues.push(updates.capacity)
    }

    if (updates.equipment !== undefined) {
      updateFields.push('equipment = ?')
      updateValues.push(JSON.stringify(updates.equipment))
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP')

    await this.db
      .prepare(`UPDATE classrooms SET ${updateFields.join(', ')} WHERE id = ?`)
      .bind(...updateValues, classroomId)
      .run()

    const updated = await this.db
      .prepare('SELECT * FROM classrooms WHERE id = ?')
      .bind(classroomId)
      .first()

    return {
      id: updated.id,
      name: updated.name,
      capacity: updated.capacity,
      equipment: updated.equipment ? JSON.parse(updated.equipment) : [],
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    }
  }

  async deleteClassroom(classroomId: string): Promise<void> {
    const existing = await this.db
      .prepare('SELECT id FROM classrooms WHERE id = ?')
      .bind(classroomId)
      .first()

    if (!existing) {
      throw new Error('Classroom not found')
    }

    await this.db.prepare('DELETE FROM classrooms WHERE id = ?').bind(classroomId).run()
  }

  // 教師-教科関連付け
  async createTeacherSubjectRelation(relation: TeacherSubjectRelation): Promise<void> {
    await this.db
      .prepare(`
        INSERT INTO teacher_subjects (teacher_id, subject_id, created_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `)
      .bind(relation.teacherId, relation.subjectId)
      .run()
  }

  async getTeacherSubjectRelations(): Promise<TeacherSubjectRelation[]> {
    const result = await this.db.prepare('SELECT * FROM teacher_subjects').all()

    return (result.results || []).map(
      (row: Record<string, unknown>): TeacherSubjectRelation => ({
        teacherId: row.teacher_id,
        subjectId: row.subject_id,
        created_at: row.created_at,
      })
    )
  }

  // データ検証用
  async getValidationData(): Promise<{
    teachers: Teacher[]
    subjects: Subject[]
    classrooms: Classroom[]
  }> {
    const [teachers, subjects, classrooms] = await Promise.all([
      this.getAllTeachers(),
      this.getAllSubjects(),
      this.getAllClassrooms(),
    ])

    return { teachers, subjects, classrooms }
  }

  // 条件設定関連
  async getConditions(): Promise<string | null> {
    const result = await this.db
      .prepare('SELECT data FROM conditions WHERE id = ? LIMIT 1')
      .bind('default')
      .first()

    return result ? result.data : null
  }

  async updateConditions(conditions: string): Promise<string> {
    await this.db
      .prepare(`
        INSERT OR REPLACE INTO conditions (id, data, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `)
      .bind('default', conditions)
      .run()

    return conditions
  }
}
