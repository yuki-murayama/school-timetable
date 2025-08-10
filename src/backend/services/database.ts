import type { TimetableData, TimetableStructure } from '../types'

export class DatabaseService {
  constructor(private db: D1Database) {}

  async createMasterTables(): Promise<void> {
    console.log('🔧 Dropping all existing tables...')

    // すべての既存テーブルを削除
    const tables = [
      'school_settings',
      'teachers',
      'subjects',
      'classrooms',
      'teacher_subjects',
      'users',
      'schools',
      'classes',
      'classroom_subjects',
      'schedules',
      'timetables',
    ]

    for (const table of tables) {
      try {
        await this.db.prepare(`DROP TABLE IF EXISTS ${table}`).run()
        console.log(`✅ Dropped table: ${table}`)
      } catch (_error) {
        console.log(`ℹ️ Table ${table} does not exist or could not be dropped`)
      }
    }

    console.log('📦 マスターテーブル作成開始')

    // 学校設定テーブル
    await this.db
      .prepare(`
      CREATE TABLE IF NOT EXISTS school_settings (
        id TEXT PRIMARY KEY DEFAULT 'default',
        grade1Classes INTEGER NOT NULL DEFAULT 4,
        grade2Classes INTEGER NOT NULL DEFAULT 4,
        grade3Classes INTEGER NOT NULL DEFAULT 3,
        dailyPeriods INTEGER NOT NULL DEFAULT 6,
        saturdayPeriods INTEGER NOT NULL DEFAULT 4,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
      .run()

    // 教師テーブル
    await this.db
      .prepare(`
      CREATE TABLE IF NOT EXISTS teachers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        subjects TEXT,
        \`order\` INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
      .run()

    // 科目テーブル
    await this.db
      .prepare(`
      CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
      .run()

    // データベーススキーマ確認とマイグレーション
    console.log('🔍 subjectsテーブルのスキーマ確認中...')
    try {
      // テーブル構造を確認
      const tableInfo = await this.db.prepare(`PRAGMA table_info(subjects)`).all()
      console.log('📊 現在のsubjectsテーブル構造:', tableInfo.results)

      const columns = (tableInfo.results || []).map(col => col.name)
      console.log('📋 存在するカラム:', columns)

      // weeklyHoursカラムが存在しない場合は追加
      if (!columns.includes('weeklyHours')) {
        console.log('🔧 weeklyHoursカラムを追加中...')
        await this.db.prepare(`ALTER TABLE subjects ADD COLUMN weeklyHours INTEGER DEFAULT 0`).run()
        console.log('✅ weeklyHoursカラムを追加完了')
      } else {
        console.log('📊 weeklyHoursカラムは既に存在します')
      }

      // targetGradesカラムが存在しない場合は追加
      if (!columns.includes('targetGrades')) {
        console.log('🔧 targetGradesカラムを追加中...')
        await this.db.prepare(`ALTER TABLE subjects ADD COLUMN targetGrades TEXT`).run()
        console.log('✅ targetGradesカラムを追加完了')
      } else {
        console.log('📊 targetGradesカラムは既に存在します')
      }

      // weekly_hoursカラムが存在しない場合は追加（JSON形式）
      if (!columns.includes('weekly_hours')) {
        console.log('🔧 weekly_hoursカラムを追加中...')
        await this.db
          .prepare(`ALTER TABLE subjects ADD COLUMN weekly_hours TEXT DEFAULT '{}'`)
          .run()
        console.log('✅ weekly_hoursカラムを追加完了')
      } else {
        console.log('📊 weekly_hoursカラムは既に存在します')
      }

      // requires_special_classroomカラムが存在しない場合は追加
      if (!columns.includes('requires_special_classroom')) {
        console.log('🔧 requires_special_classroomカラムを追加中...')
        await this.db
          .prepare(`ALTER TABLE subjects ADD COLUMN requires_special_classroom INTEGER DEFAULT 0`)
          .run()
        console.log('✅ requires_special_classroomカラムを追加完了')
      } else {
        console.log('📊 requires_special_classroomカラムは既に存在します')
      }

      // classroom_typeカラムが存在しない場合は追加
      if (!columns.includes('classroom_type')) {
        console.log('🔧 classroom_typeカラムを追加中...')
        await this.db
          .prepare(`ALTER TABLE subjects ADD COLUMN classroom_type TEXT DEFAULT 'normal'`)
          .run()
        console.log('✅ classroom_typeカラムを追加完了')
      } else {
        console.log('📊 classroom_typeカラムは既に存在します')
      }

      // マイグレーション後のテーブル構造を再確認
      const updatedTableInfo = await this.db.prepare(`PRAGMA table_info(subjects)`).all()
      console.log('📊 マイグレーション後のsubjectsテーブル構造:', updatedTableInfo.results)
    } catch (error) {
      console.error('❌ データベーススキーマ確認エラー:', error)
      throw error
    }

    // 教師テーブルのスキーマ確認とマイグレーション
    console.log('🔍 teachersテーブルのスキーマ確認中...')
    try {
      // テーブル構造を確認
      const teacherTableInfo = await this.db.prepare(`PRAGMA table_info(teachers)`).all()
      console.log('📊 現在のteachersテーブル構造:', teacherTableInfo.results)

      const teacherColumns = (teacherTableInfo.results || []).map(col => col.name)
      console.log('📋 存在するカラム:', teacherColumns)

      // 必要なカラムを追加
      const requiredColumns = [
        { name: 'school_id', type: 'TEXT', defaultValue: "'school-1'" },
        { name: 'employee_number', type: 'TEXT', defaultValue: 'NULL' },
        { name: 'email', type: 'TEXT', defaultValue: "''" },
        { name: 'phone', type: 'TEXT', defaultValue: 'NULL' },
        { name: 'employment_type', type: 'TEXT', defaultValue: "'full_time'" },
        { name: 'max_hours_per_week', type: 'INTEGER', defaultValue: '0' },
        { name: 'is_active', type: 'INTEGER', defaultValue: '1' },
        { name: 'grades', type: 'TEXT', defaultValue: "'[]'" },
        { name: 'assignment_restrictions', type: 'TEXT', defaultValue: "'[]'" }, // 割当制限（JSON形式）
      ]

      for (const column of requiredColumns) {
        if (!teacherColumns.includes(column.name)) {
          console.log(`🔧 ${column.name}カラムを追加中...`)
          await this.db
            .prepare(
              `ALTER TABLE teachers ADD COLUMN ${column.name} ${column.type} DEFAULT ${column.defaultValue}`
            )
            .run()
          console.log(`✅ ${column.name}カラムを追加完了`)
        } else {
          console.log(`📊 ${column.name}カラムは既に存在します`)
        }
      }

      // マイグレーション後のテーブル構造を再確認
      const updatedTeacherTableInfo = await this.db.prepare(`PRAGMA table_info(teachers)`).all()
      console.log('📊 マイグレーション後のteachersテーブル構造:', updatedTeacherTableInfo.results)
    } catch (error) {
      console.error('❌ teachersテーブルスキーマ確認エラー:', error)
      throw error
    }

    // 教室テーブル
    await this.db
      .prepare(`
      CREATE TABLE IF NOT EXISTS classrooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        capacity INTEGER DEFAULT 0,
        \`order\` INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
      .run()

    // 教室テーブルのマイグレーション
    console.log('🔍 classroomsテーブルのスキーマ確認中...')
    try {
      const classroomTableInfo = await this.db.prepare(`PRAGMA table_info(classrooms)`).all()
      console.log('📊 現在のclassroomsテーブル構造:', classroomTableInfo.results)

      const classroomColumns = (classroomTableInfo.results || []).map(col => col.name)
      console.log('📋 存在するカラム:', classroomColumns)

      // orderカラムを追加（存在しない場合）
      if (!classroomColumns.includes('order')) {
        console.log('🔧 orderカラムを追加中...')
        await this.db.prepare(`ALTER TABLE classrooms ADD COLUMN \`order\` INTEGER DEFAULT 0`).run()
        console.log('✅ 教室テーブルにorderカラムを追加しました')
      } else {
        console.log('📊 orderカラムは既に存在します')
      }

      // typeカラムを追加（存在しない場合）
      if (!classroomColumns.includes('type')) {
        console.log('🔧 typeカラムを追加中...')
        await this.db.prepare(`ALTER TABLE classrooms ADD COLUMN type TEXT DEFAULT 'normal'`).run()
        console.log('✅ 教室テーブルにtypeカラムを追加しました')
      } else {
        console.log('📊 typeカラムは既に存在します')
      }

      // マイグレーション後のテーブル構造を再確認
      const updatedClassroomTableInfo = await this.db.prepare(`PRAGMA table_info(classrooms)`).all()
      console.log(
        '📊 マイグレーション後のclassroomsテーブル構造:',
        updatedClassroomTableInfo.results
      )
    } catch (error) {
      console.error('❌ classroomsテーブルスキーマ確認エラー:', error)
      throw error
    }

    // 条件テーブル
    await this.db
      .prepare(`
      CREATE TABLE IF NOT EXISTS conditions (
        id TEXT PRIMARY KEY DEFAULT 'default',
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
      .run()

    // 時間割テーブル
    await this.db
      .prepare(`
      CREATE TABLE IF NOT EXISTS timetables (
        id TEXT PRIMARY KEY,
        name TEXT,
        timetable TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
      .run()

    // teacher_subjectsテーブル（教師と教科の関連テーブル）
    await this.db
      .prepare(`
      CREATE TABLE IF NOT EXISTS teacher_subjects (
        id TEXT PRIMARY KEY,
        teacher_id TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        qualification_level TEXT DEFAULT 'qualified',
        priority INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teacher_id) REFERENCES teachers(id),
        FOREIGN KEY (subject_id) REFERENCES subjects(id)
      )
    `)
      .run()

    // usersテーブル（認証に使用されている）
    await this.db
      .prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        hashed_password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'teacher' NOT NULL,
        is_active INTEGER DEFAULT 1 NOT NULL,
        last_login_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
      .run()

    // schoolsテーブル（学校情報）
    await this.db
      .prepare(`
      CREATE TABLE IF NOT EXISTS schools (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'middle_school' NOT NULL,
        address TEXT,
        phone TEXT,
        email TEXT,
        principal_name TEXT,
        timezone TEXT DEFAULT 'Asia/Tokyo' NOT NULL,
        settings TEXT,
        is_active INTEGER DEFAULT 1 NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
      .run()

    console.log('✅ マスターテーブル作成完了')

    // デフォルトデータの挿入
    await this.insertDefaultData()
  }

  async insertDefaultData(): Promise<void> {
    console.log('📦 デフォルトデータ挿入開始')

    // デフォルト学校データ
    await this.db
      .prepare(`
      INSERT OR IGNORE INTO schools (id, name, type)
      VALUES ('school-1', 'サンプル中学校', 'middle_school')
    `)
      .run()

    // デフォルト学校設定
    await this.db
      .prepare(`
      INSERT OR IGNORE INTO school_settings (id, grade1Classes, grade2Classes, grade3Classes, dailyPeriods, saturdayPeriods)
      VALUES ('default', 4, 4, 3, 6, 4)
    `)
      .run()

    // サンプル教師データ
    const teachers = [
      { id: 'teacher-1', name: '田中先生', subjects: '["数学"]' },
      { id: 'teacher-2', name: '佐藤先生', subjects: '["国語"]' },
      { id: 'teacher-3', name: '鈴木先生', subjects: '["英語"]' },
      { id: 'teacher-4', name: '高橋先生', subjects: '["理科"]' },
      { id: 'teacher-5', name: '伊藤先生', subjects: '["社会"]' },
    ]

    for (const teacher of teachers) {
      await this.db
        .prepare(`
        INSERT OR IGNORE INTO teachers (id, name, subjects)
        VALUES (?, ?, ?)
      `)
        .bind(teacher.id, teacher.name, teacher.subjects)
        .run()
    }

    // サンプル科目データ
    const subjects = [
      { id: 'subject-1', name: '数学' },
      { id: 'subject-2', name: '国語' },
      { id: 'subject-3', name: '英語' },
      { id: 'subject-4', name: '理科' },
      { id: 'subject-5', name: '社会' },
    ]

    for (const subject of subjects) {
      await this.db
        .prepare(`
        INSERT OR IGNORE INTO subjects (id, name)
        VALUES (?, ?)
      `)
        .bind(subject.id, subject.name)
        .run()
    }

    // スキーマ確認後にweeklyHoursとtargetGradesを更新
    try {
      // テーブル構造を再確認
      const tableInfo = await this.db.prepare(`PRAGMA table_info(subjects)`).all()
      const _columns = (tableInfo.results || []).map(col => col.name)

      // 新しいスキーマでのデータ更新
      const updatedColumns = (
        await this.db.prepare(`PRAGMA table_info(subjects)`).all()
      ).results.map(col => col.name)

      if (updatedColumns.includes('weeklyHours') && updatedColumns.includes('targetGrades')) {
        console.log('🔧 科目の詳細データを更新中...')
        const subjectsData = [
          {
            name: '数学',
            weeklyHours: 4,
            targetGrades: '[1,2,3]',
            weekly_hours: '{"1": 4, "2": 4, "3": 4}',
            requires_special_classroom: 0,
            classroom_type: 'normal',
          },
          {
            name: '国語',
            weeklyHours: 5,
            targetGrades: '[1,2,3]',
            weekly_hours: '{"1": 5, "2": 5, "3": 5}',
            requires_special_classroom: 0,
            classroom_type: 'normal',
          },
          {
            name: '英語',
            weeklyHours: 4,
            targetGrades: '[1,2,3]',
            weekly_hours: '{"1": 4, "2": 4, "3": 4}',
            requires_special_classroom: 0,
            classroom_type: 'normal',
          },
          {
            name: '理科',
            weeklyHours: 3,
            targetGrades: '[1,2,3]',
            weekly_hours: '{"1": 3, "2": 3, "3": 3}',
            requires_special_classroom: 1,
            classroom_type: 'science',
          },
          {
            name: '社会',
            weeklyHours: 3,
            targetGrades: '[1,2,3]',
            weekly_hours: '{"1": 3, "2": 3, "3": 3}',
            requires_special_classroom: 0,
            classroom_type: 'normal',
          },
        ]

        for (const data of subjectsData) {
          // すべてのフィールドを更新
          const updateFields = []
          const values = []

          if (updatedColumns.includes('weeklyHours')) {
            updateFields.push('weeklyHours = ?')
            values.push(data.weeklyHours)
          }
          if (updatedColumns.includes('targetGrades')) {
            updateFields.push('targetGrades = ?')
            values.push(data.targetGrades)
          }
          if (updatedColumns.includes('weekly_hours')) {
            updateFields.push('weekly_hours = ?')
            values.push(data.weekly_hours)
          }
          if (updatedColumns.includes('requires_special_classroom')) {
            updateFields.push('requires_special_classroom = ?')
            values.push(data.requires_special_classroom)
          }
          if (updatedColumns.includes('classroom_type')) {
            updateFields.push('classroom_type = ?')
            values.push(data.classroom_type)
          }

          if (updateFields.length > 0) {
            const result = await this.db
              .prepare(`
              UPDATE subjects SET ${updateFields.join(', ')} WHERE name = ?
            `)
              .bind(...values, data.name)
              .run()
            console.log(`📝 ${data.name}のデータ更新:`, result)
          }
        }
        console.log('✅ 科目の全データを更新完了')
      } else {
        console.log('📊 必要なカラムが見つからないため、更新をスキップ')
      }
    } catch (error) {
      console.error('❌ 科目の追加データ更新エラー:', error)
      throw error
    }

    // サンプル教室データ
    const classrooms = [
      { id: 'classroom-1', name: '1年1組教室', capacity: 35 },
      { id: 'classroom-2', name: '1年2組教室', capacity: 35 },
      { id: 'classroom-3', name: '1年3組教室', capacity: 35 },
      { id: 'classroom-4', name: '1年4組教室', capacity: 35 },
      { id: 'classroom-5', name: '特別教室', capacity: 30 },
    ]

    for (const classroom of classrooms) {
      await this.db
        .prepare(`
        INSERT OR IGNORE INTO classrooms (id, name, capacity)
        VALUES (?, ?, ?)
      `)
        .bind(classroom.id, classroom.name, classroom.capacity)
        .run()
    }

    // デフォルト条件
    await this.db
      .prepare(`
      INSERT OR IGNORE INTO conditions (id, data)
      VALUES ('default', '{"constraints": []}')
    `)
      .run()

    console.log('✅ デフォルトデータ挿入完了')
  }

  async saveTimetable(timetable: TimetableStructure): Promise<{ id: string }> {
    const timetableId = `timetable-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

    await this.db
      .prepare(`
      INSERT INTO timetables (id, name, timetable, created_at, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `)
      .bind(
        timetableId,
        `生成された時間割 ${new Date().toLocaleDateString('ja-JP')}`,
        JSON.stringify(timetable)
      )
      .run()

    return { id: timetableId }
  }

  async getTimetable(id: string): Promise<Timetable | null> {
    return await this.db
      .prepare(`
      SELECT * FROM timetables WHERE id = ?
    `)
      .bind(id)
      .first()
  }

  async collectTimetableData(): Promise<TimetableData> {
    console.log('📋 データ収集開始')

    // 並列でデータを取得 - weeklyHoursカラムが存在しない場合に備えて段階的に実行
    let subjectsResult: { results?: Subject[] }
    try {
      // まず新しいスキーマでトライ
      subjectsResult = await this.db
        .prepare(
          'SELECT id, name, weeklyHours, targetGrades, created_at, updated_at FROM subjects ORDER BY name'
        )
        .all()
      console.log('✅ 新しいスキーマでsubjects取得成功')
    } catch (error) {
      console.log('📊 新しいスキーマ失敗、古いスキーマでリトライ:', error)
      // 古いスキーマでフォールバック
      subjectsResult = await this.db
        .prepare('SELECT id, name, created_at, updated_at FROM subjects ORDER BY name')
        .all()
      console.log('✅ 古いスキーマでsubjects取得成功')
    }

    // 他のテーブルは並列で取得
    const [teachersResult, classroomsResult, schoolSettingsResult, conditionsResult] =
      await Promise.all([
        this.db.prepare('SELECT * FROM teachers ORDER BY name').all(),
        this.db.prepare('SELECT * FROM classrooms ORDER BY name').all(),
        this.db.prepare('SELECT * FROM school_settings WHERE id = "default" LIMIT 1').first(),
        this.db.prepare('SELECT * FROM conditions WHERE id = "default" LIMIT 1').first(),
      ])

    console.log('📋 データ収集結果:', {
      teachersCount: teachersResult.results?.length || 0,
      subjectsCount: subjectsResult.results?.length || 0,
      classroomsCount: classroomsResult.results?.length || 0,
      hasSchoolSettings: !!schoolSettingsResult,
      hasConditions: !!conditionsResult,
    })

    // 学校設定
    const schoolSettings = schoolSettingsResult || {
      grade1Classes: 4,
      grade2Classes: 4,
      grade3Classes: 3,
      dailyPeriods: 6,
      saturdayPeriods: 4,
    }

    // クラス生成
    const classes = []
    for (let grade = 1; grade <= 3; grade++) {
      const classCount = schoolSettings[
        `grade${grade}Classes` as keyof typeof schoolSettings
      ] as number
      for (let classNum = 1; classNum <= classCount; classNum++) {
        classes.push({
          id: `${grade}-${classNum}`,
          grade,
          class: classNum,
          students: 35,
        })
      }
    }

    return {
      teachers: teachersResult.results || [],
      subjects: subjectsResult.results || [],
      classrooms: classroomsResult.results || [],
      classes,
      schoolSettings,
      conditions: conditionsResult ? JSON.parse(conditionsResult.data) : null,
    }
  }
}
