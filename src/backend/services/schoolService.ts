import type { SchoolSettings } from '../../shared/types'
import { defaultSettings } from '../config'
import { DatabaseService } from './database'
import { SubjectValidationService, type CleanSubjectData } from './SubjectValidationService'

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
    console.log('📚 教科データ取得開始 - 型検証を適用')
    const result = await this.db.prepare('SELECT * FROM subjects ORDER BY name').all()

    const rawSubjects = result.results || []
    console.log(`📊 DBから${rawSubjects.length}件の教科データを取得`)

    const validatedSubjects: Subject[] = []
    const errors: Array<{ id: string; error: string }> = []

    for (const row of rawSubjects) {
      try {
        // 型検証とクリーンアップを適用
        const cleanData = SubjectValidationService.validateAndCleanSubject(row)
        
        validatedSubjects.push({
          id: cleanData.id,
          name: cleanData.name,
          color: (row as any).color || '#3B82F6',
          // 統一型定義のgradesフィールド（メインフィールド）
          grades: cleanData.targetGrades,
          // 互換性フィールド
          targetGrades: cleanData.targetGrades,
          target_grades: cleanData.targetGrades,
          // 週間授業数（型検証済み）
          weeklyHours: cleanData.weeklyHours,
          weekly_hours: cleanData.weeklyHours,
          order: cleanData.order || 0,
          created_at: (row as any).created_at,
          updated_at: (row as any).updated_at,
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown validation error'
        console.error(`❌ 教科ID ${row.id} の検証に失敗:`, errorMessage)
        errors.push({ 
          id: String(row.id), 
          error: errorMessage
        })
      }
    }

    if (errors.length > 0) {
      console.warn(`⚠️ 型検証エラーにより${errors.length}件の教科データをスキップしました`)
      // 管理者向けの詳細ログ
      console.log('🔍 検証エラー詳細:', errors)
    }

    console.log(`✅ 型検証完了: ${validatedSubjects.length}件の有効な教科データを返します`)
    return validatedSubjects
  }

  async createSubject(
    subject: Omit<Subject, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Subject> {
    console.log('📚 新規教科作成開始 - 型検証を適用')
    
    // 型検証とクリーンアップを適用
    const subjectId = `subject-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
    const cleanData = SubjectValidationService.validateAndCleanSubject({
      id: subjectId,
      name: subject.name,
      weekly_hours: subject.weeklyHours || subject.weekly_hours || 1,
      targetGrades: subject.targetGrades || subject.grades || [1, 2, 3],
      order: subject.order || 0
    })

    // データベース用の形式に変換
    const dbData = SubjectValidationService.validateForDatabase(cleanData)

    await this.db
      .prepare(`
        INSERT INTO subjects (id, name, color, target_grades, weeklyHours, \`order\`, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `)
      .bind(
        dbData.id,
        dbData.name,
        subject.color || '#3B82F6',
        dbData.targetGrades, // JSON文字列
        dbData.weeklyHours, // INTEGER
        dbData.order || 0
      )
      .run()

    console.log(`✅ 教科「${cleanData.name}」を作成しました（週${cleanData.weeklyHours}時間）`)

    return {
      id: cleanData.id,
      name: cleanData.name,
      color: subject.color || '#3B82F6',
      // 統一型定義のgradesフィールド（メインフィールド）
      grades: cleanData.targetGrades,
      // 互換性フィールド
      targetGrades: cleanData.targetGrades,
      target_grades: cleanData.targetGrades,
      // 週間授業数（型検証済み）
      weeklyHours: cleanData.weeklyHours,
      weekly_hours: cleanData.weeklyHours,
      order: cleanData.order || 0,
    }
  }

  async updateSubject(subjectId: string, updates: Partial<Subject>): Promise<Subject> {
    console.log(`📚 教科更新開始 - ID: ${subjectId} - 型検証を適用`)
    
    const existing = await this.db
      .prepare('SELECT * FROM subjects WHERE id = ?')
      .bind(subjectId)
      .first()

    if (!existing) {
      throw new Error('Subject not found')
    }

    // 既存データと更新データを統合して型検証
    const mergedData = {
      id: subjectId,
      name: updates.name || existing.name,
      weekly_hours: updates.weeklyHours || updates.weekly_hours || existing.weeklyHours || existing.weekly_hours || 1,
      targetGrades: updates.targetGrades || updates.grades || updates.target_grades || 
        (existing.target_grades ? JSON.parse(existing.target_grades) : [1, 2, 3]),
      order: updates.order !== undefined ? updates.order : (existing.order || 0)
    }

    // 型検証とクリーンアップを適用
    const cleanData = SubjectValidationService.validateAndCleanSubject(mergedData)
    const dbData = SubjectValidationService.validateForDatabase(cleanData)

    const updateFields: string[] = []
    const updateValues: unknown[] = []

    if (updates.name !== undefined) {
      updateFields.push('name = ?')
      updateValues.push(dbData.name)
    }

    if (updates.color !== undefined) {
      updateFields.push('color = ?')
      updateValues.push(updates.color)
    }

    // 学年データの更新（型検証済み）
    if (updates.targetGrades || updates.grades || updates.target_grades) {
      updateFields.push('target_grades = ?')
      updateValues.push(dbData.targetGrades) // JSON文字列
    }

    // 週間授業数の更新（型検証済み）
    if (updates.weeklyHours !== undefined || updates.weekly_hours !== undefined) {
      updateFields.push('weeklyHours = ?')
      updateValues.push(dbData.weeklyHours) // INTEGER
    }

    if (updates.order !== undefined) {
      updateFields.push('`order` = ?')
      updateValues.push(dbData.order)
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP')

    await this.db
      .prepare(`UPDATE subjects SET ${updateFields.join(', ')} WHERE id = ?`)
      .bind(...updateValues, subjectId)
      .run()

    // 更新後データの型検証付き取得
    const updated = await this.db
      .prepare('SELECT * FROM subjects WHERE id = ?')
      .bind(subjectId)
      .first()

    const validatedUpdated = SubjectValidationService.validateAndCleanSubject(updated)

    console.log(`✅ 教科「${validatedUpdated.name}」を更新しました（週${validatedUpdated.weeklyHours}時間）`)

    return {
      id: validatedUpdated.id,
      name: validatedUpdated.name,
      color: updated.color || '#3B82F6',
      // 統一型定義のgradesフィールド（メインフィールド）
      grades: validatedUpdated.targetGrades,
      // 互換性フィールド
      targetGrades: validatedUpdated.targetGrades,
      target_grades: validatedUpdated.targetGrades,
      // 週間授業数（型検証済み）
      weeklyHours: validatedUpdated.weeklyHours,
      weekly_hours: validatedUpdated.weeklyHours,
      order: validatedUpdated.order || 0,
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
