import { Hono } from 'hono'
import type { Env, SchoolSettings } from '../../shared/types'
// 統一型定義からEnvをインポート済み
import { defaultSettings } from '../config'
import {
  adminAuthMiddleware,
  clerkAuthMiddleware,
  readOnlyAuthMiddleware,
  securityHeadersMiddleware,
} from '../middleware/auth'
import {
  csrfProtection,
  rateLimit,
  validatePathParams,
  validateRequestBody,
  validateSqlParameters,
} from '../middleware/validation'
import { DatabaseService } from '../services/database'

const schoolRoutes = new Hono<{ Bindings: Env }>()

// セキュリティミドルウェアを全ルートに適用
schoolRoutes.use('*', securityHeadersMiddleware)
schoolRoutes.use('*', rateLimit(100, 60000)) // 1分間に100リクエスト制限
schoolRoutes.use('*', csrfProtection())

// 学校設定取得（認証必須）
schoolRoutes.get('/settings', clerkAuthMiddleware, readOnlyAuthMiddleware, async c => {
  try {
    const db = c.env.DB
    const _dbService = new DatabaseService(db)

    const result = await db
      .prepare(`
      SELECT * FROM school_settings WHERE id = 'default' LIMIT 1
    `)
      .first()

    if (result) {
      const settings: SchoolSettings = {
        grade1Classes: result.grade1Classes || defaultSettings.grade1Classes,
        grade2Classes: result.grade2Classes || defaultSettings.grade2Classes,
        grade3Classes: result.grade3Classes || defaultSettings.grade3Classes,
        dailyPeriods: result.dailyPeriods || defaultSettings.dailyPeriods,
        saturdayPeriods: result.saturdayPeriods || defaultSettings.saturdayPeriods,
      }

      return c.json({
        success: true,
        data: settings,
      })
    } else {
      return c.json({
        success: true,
        data: defaultSettings,
      })
    }
  } catch (_error) {
    return c.json({
      success: true,
      data: defaultSettings,
    })
  }
})

// 学校設定更新（管理者権限必須）
schoolRoutes.put(
  '/settings',
  clerkAuthMiddleware,
  adminAuthMiddleware,
  validateRequestBody({
    grade1Classes: { type: 'number', required: false, min: 0, max: 20 },
    grade2Classes: { type: 'number', required: false, min: 0, max: 20 },
    grade3Classes: { type: 'number', required: false, min: 0, max: 20 },
    dailyPeriods: { type: 'number', required: false, min: 1, max: 10 },
    saturdayPeriods: { type: 'number', required: false, min: 0, max: 10 },
  }),
  async c => {
    try {
      const body = c.get('validatedBody')
      const db = c.env.DB

      const newSettings = {
        grade1Classes: body.grade1Classes || defaultSettings.grade1Classes,
        grade2Classes: body.grade2Classes || defaultSettings.grade2Classes,
        grade3Classes: body.grade3Classes || defaultSettings.grade3Classes,
        dailyPeriods: body.dailyPeriods || defaultSettings.dailyPeriods,
        saturdayPeriods: body.saturdayPeriods || defaultSettings.saturdayPeriods,
      }

      // データベースに保存（SQLインジェクション対策済み）
      const params = validateSqlParameters([
        newSettings.grade1Classes,
        newSettings.grade2Classes,
        newSettings.grade3Classes,
        newSettings.dailyPeriods,
        newSettings.saturdayPeriods,
      ])

      await db
        .prepare(`
      INSERT OR REPLACE INTO school_settings 
      (id, grade1Classes, grade2Classes, grade3Classes, dailyPeriods, saturdayPeriods, updated_at)
      VALUES ('default', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `)
        .bind(...params)
        .run()

      return c.json({
        success: true,
        data: newSettings,
        message: '学校設定を更新しました',
      })
    } catch (error) {
      console.error('学校設定更新エラー:', error)
      console.error('エラーの詳細:', error.message, error.stack)
      return c.json(
        {
          success: false,
          error: '学校設定の更新に失敗しました',
          details: error.message,
        },
        500
      )
    }
  }
)

// 教師一覧取得（認証必須）
schoolRoutes.get('/teachers', clerkAuthMiddleware, readOnlyAuthMiddleware, async c => {
  try {
    const db = c.env.DB
    console.log('📚 教師一覧取得開始')

    // まずテーブル構造を確認
    const tableInfo = await db.prepare(`PRAGMA table_info(teachers)`).all()
    console.log('📊 teachersテーブル構造:', tableInfo.results)

    // grades、assignment_restrictions、subjectsカラムの存在を確認
    let hasGradesColumn = tableInfo.results?.some(col => col.name === 'grades')
    let hasAssignmentRestrictionsColumn = tableInfo.results?.some(
      col => col.name === 'assignment_restrictions'
    )
    let hasSubjectsColumn = tableInfo.results?.some(col => col.name === 'subjects')
    console.log('🎓 gradesカラム存在:', hasGradesColumn)
    console.log('🔍 assignment_restrictionsカラム存在:', hasAssignmentRestrictionsColumn)
    console.log('📚 subjectsカラム存在:', hasSubjectsColumn)

    // gradesカラムが存在しない場合は追加
    if (!hasGradesColumn) {
      try {
        console.log('🔧 gradesカラムを追加中...')
        await db.prepare(`ALTER TABLE teachers ADD COLUMN grades TEXT DEFAULT '[]'`).run()
        console.log('✅ gradesカラムを追加完了')
        hasGradesColumn = true
      } catch (addColumnError) {
        console.error('❌ gradesカラム追加エラー:', addColumnError)
        // カラム追加に失敗した場合はfalseのまま
      }
    }

    // assignment_restrictionsカラムが存在しない場合は追加
    if (!hasAssignmentRestrictionsColumn) {
      try {
        console.log('🔧 assignment_restrictionsカラムを追加中...')
        await db
          .prepare(`ALTER TABLE teachers ADD COLUMN assignment_restrictions TEXT DEFAULT '[]'`)
          .run()
        console.log('✅ assignment_restrictionsカラムを追加完了')
        hasAssignmentRestrictionsColumn = true
      } catch (addColumnError) {
        console.error('❌ assignment_restrictionsカラム追加エラー:', addColumnError)
        // カラム追加に失敗した場合はfalseのまま
      }
    }

    // subjectsカラムが存在しない場合は追加
    if (!hasSubjectsColumn) {
      try {
        console.log('🔧 subjectsカラムを追加中...')
        await db.prepare(`ALTER TABLE teachers ADD COLUMN subjects TEXT DEFAULT '[]'`).run()
        console.log('✅ subjectsカラムを追加完了')
        hasSubjectsColumn = true
      } catch (addColumnError) {
        console.error('❌ subjectsカラム追加エラー:', addColumnError)
        // カラム追加に失敗した場合はfalseのまま
      }
    }

    // orderカラムは固定でテーブルに存在するものとして扱う
    let query = ''

    if (hasGradesColumn && hasAssignmentRestrictionsColumn && hasSubjectsColumn) {
      query = `
        SELECT t.id, t.name, t.email, t.created_at,
          COALESCE(t.grades, '[]') as grades,
          COALESCE(t.assignment_restrictions, '[]') as assignment_restrictions,
          COALESCE(t.subjects, '[]') as subjects,
          COALESCE(t.\`order\`, 0) as \`order\`
        FROM teachers t
        ORDER BY COALESCE(t.\`order\`, 999999), t.name
      `
    } else if (hasGradesColumn && hasAssignmentRestrictionsColumn) {
      query = `
        SELECT t.id, t.name, t.email, t.created_at,
          COALESCE(t.grades, '[]') as grades,
          COALESCE(t.assignment_restrictions, '[]') as assignment_restrictions,
          COALESCE(t.\`order\`, 0) as \`order\`,
          COALESCE(
            JSON_GROUP_ARRAY(
              CASE WHEN s.id IS NOT NULL THEN 
                JSON_OBJECT('id', s.id, 'name', s.name)
              END
            ) FILTER (WHERE s.id IS NOT NULL), 
            JSON('[]')
          ) as subjects
        FROM teachers t
        LEFT JOIN teacher_subjects ts ON t.id = ts.teacher_id
        LEFT JOIN subjects s ON ts.subject_id = s.id
        GROUP BY t.id
        ORDER BY COALESCE(t.\`order\`, 999999), t.name
      `
    } else if (hasGradesColumn) {
      query = `
        SELECT t.id, t.name, t.email, t.created_at,
          COALESCE(t.grades, '[]') as grades,
          '[]' as assignment_restrictions,
          COALESCE(t.\`order\`, 0) as \`order\`,
          COALESCE(
            JSON_GROUP_ARRAY(
              CASE WHEN s.id IS NOT NULL THEN 
                JSON_OBJECT('id', s.id, 'name', s.name)
              END
            ) FILTER (WHERE s.id IS NOT NULL), 
            JSON('[]')
          ) as subjects
        FROM teachers t
        LEFT JOIN teacher_subjects ts ON t.id = ts.teacher_id
        LEFT JOIN subjects s ON ts.subject_id = s.id
        GROUP BY t.id
        ORDER BY COALESCE(t.\`order\`, 999999), t.name
      `
    } else {
      query = `
        SELECT t.id, t.name, t.email, t.created_at,
          '[]' as grades,
          '[]' as assignment_restrictions,
          COALESCE(t.\`order\`, 0) as \`order\`,
          COALESCE(
            JSON_GROUP_ARRAY(
              CASE WHEN s.id IS NOT NULL THEN 
                JSON_OBJECT('id', s.id, 'name', s.name)
              END
            ) FILTER (WHERE s.id IS NOT NULL), 
            JSON('[]')
          ) as subjects
        FROM teachers t
        LEFT JOIN teacher_subjects ts ON t.id = ts.teacher_id
        LEFT JOIN subjects s ON ts.subject_id = s.id
        GROUP BY t.id
        ORDER BY COALESCE(t.\`order\`, 999999), t.name
      `
    }
    console.log('🔍 実行するクエリ:', query)

    const result = await db.prepare(query).all()
    console.log('📊 取得した教師数:', result.results?.length || 0)

    // subjectsとgradesフィールドをパースして配列に変換
    const teachers = (result.results || []).map((teacher, index) => {
      console.log(`👨‍🏫 教師${index + 1} [${teacher.name}]:`)
      console.log('  📚 Raw subjects:', teacher.subjects, 'type:', typeof teacher.subjects)
      console.log('  🎓 Raw grades:', teacher.grades, 'type:', typeof teacher.grades)

      console.log('  🔍 Processing subjects:', {
        subjects: teacher.subjects,
        type: typeof teacher.subjects,
        truthy: !!teacher.subjects,
        stringCheck: typeof teacher.subjects === 'string',
      })

      if (teacher.subjects && typeof teacher.subjects === 'string') {
        try {
          console.log('  🔄 Parsing JSON string:', teacher.subjects)
          teacher.subjects = JSON.parse(teacher.subjects)
          console.log('  📚 ✅ Successfully parsed subjects:', teacher.subjects)
        } catch (e) {
          teacher.subjects = []
          console.log('  ❌ Failed to parse subjects, using empty array. Error:', e.message)
        }
      } else if (!teacher.subjects) {
        console.log('  ⚠️ No subjects found, setting empty array')
        teacher.subjects = []
      } else {
        console.log('  ℹ️ Subjects already in correct format:', teacher.subjects)
      }

      if (teacher.grades && typeof teacher.grades === 'string') {
        try {
          teacher.grades = JSON.parse(teacher.grades)
          console.log('  🎓 Parsed grades:', teacher.grades)
        } catch (_e) {
          teacher.grades = []
          console.log('  ❌ Failed to parse grades, using empty array')
        }
      } else if (!teacher.grades) {
        teacher.grades = []
      }

      // assignment_restrictionsフィールドをパース
      if (teacher.assignment_restrictions && typeof teacher.assignment_restrictions === 'string') {
        try {
          teacher.assignmentRestrictions = JSON.parse(teacher.assignment_restrictions)
          console.log('  🔍 Parsed assignment restrictions:', teacher.assignmentRestrictions)
        } catch (_e) {
          teacher.assignmentRestrictions = []
          console.log('  ❌ Failed to parse assignment restrictions, using empty array')
        }
      } else if (!teacher.assignment_restrictions) {
        teacher.assignmentRestrictions = []
      }

      console.log('  ✅ Final teacher data:', {
        name: teacher.name,
        subjects: teacher.subjects,
        subjectsLength: teacher.subjects?.length || 0,
        grades: teacher.grades,
        gradesLength: teacher.grades?.length || 0,
        assignmentRestrictions: teacher.assignmentRestrictions,
        assignmentRestrictionsLength: teacher.assignmentRestrictions?.length || 0,
      })

      return teacher
    })

    return c.json({
      success: true,
      data: teachers,
    })
  } catch (error) {
    console.error('教師一覧取得エラー:', error)
    return c.json(
      {
        success: false,
        error: '教師一覧の取得に失敗しました',
        message: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      500
    )
  }
})

// 教師作成（管理者権限必須）
schoolRoutes.post(
  '/teachers',
  clerkAuthMiddleware,
  adminAuthMiddleware,
  validateRequestBody({
    name: { type: 'string', required: true, minLength: 1, maxLength: 100 },
    email: { type: 'email', required: false },
    subjects: { type: 'array', required: false, maxItems: 20 },
    grades: { type: 'array', required: false, maxItems: 10 },
    assignmentRestrictions: { type: 'array', required: false, maxItems: 50 }, // 割当制限（最大50個）
  }),
  async c => {
    try {
      const body = c.get('validatedBody')
      const db = c.env.DB

      const teacherId = `teacher-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

      // まずテーブル構造を確認してgrades、assignment_restrictions、subjectsカラムを追加
      const createTableInfo = await db.prepare(`PRAGMA table_info(teachers)`).all()
      let hasGradesColumnForCreate = createTableInfo.results?.some(col => col.name === 'grades')
      let hasAssignmentRestrictionsColumnForCreate = createTableInfo.results?.some(
        col => col.name === 'assignment_restrictions'
      )
      let hasSubjectsColumnForCreate = createTableInfo.results?.some(col => col.name === 'subjects')
      console.log('🎓 作成時gradesカラム存在:', hasGradesColumnForCreate)
      console.log(
        '🔍 作成時assignment_restrictionsカラム存在:',
        hasAssignmentRestrictionsColumnForCreate
      )
      console.log('📚 作成時subjectsカラム存在:', hasSubjectsColumnForCreate)

      // gradesカラムが存在しない場合は追加
      if (!hasGradesColumnForCreate) {
        try {
          console.log('🔧 作成時gradesカラムを追加中...')
          await db.prepare(`ALTER TABLE teachers ADD COLUMN grades TEXT DEFAULT '[]'`).run()
          console.log('✅ 作成時gradesカラムを追加完了')
          hasGradesColumnForCreate = true
        } catch (addColumnError) {
          console.error('❌ 作成時gradesカラム追加エラー:', addColumnError)
          // カラム追加に失敗した場合はfalseのまま
        }
      }

      // assignment_restrictionsカラムが存在しない場合は追加
      if (!hasAssignmentRestrictionsColumnForCreate) {
        try {
          console.log('🔧 作成時assignment_restrictionsカラムを追加中...')
          await db
            .prepare(`ALTER TABLE teachers ADD COLUMN assignment_restrictions TEXT DEFAULT '[]'`)
            .run()
          console.log('✅ 作成時assignment_restrictionsカラムを追加完了')
          hasAssignmentRestrictionsColumnForCreate = true
        } catch (addColumnError) {
          console.error('❌ 作成時assignment_restrictionsカラム追加エラー:', addColumnError)
          // カラム追加に失敗した場合はfalseのまま
        }
      }

      // subjectsカラムが存在しない場合は追加
      if (!hasSubjectsColumnForCreate) {
        try {
          console.log('🔧 作成時subjectsカラムを追加中...')
          await db.prepare(`ALTER TABLE teachers ADD COLUMN subjects TEXT DEFAULT '[]'`).run()
          console.log('✅ 作成時subjectsカラムを追加完了')
          hasSubjectsColumnForCreate = true
        } catch (addColumnError) {
          console.error('❌ 作成時subjectsカラム追加エラー:', addColumnError)
          // カラム追加に失敗した場合はfalseのまま
        }
      }

      // grades、assignment_restrictions、subjectsカラムが存在しない場合に備えて、動的にINSERTクエリを構築
      console.log('🎓 担当学年:', body.grades)
      console.log('🔍 割当制限:', body.assignmentRestrictions)
      console.log('📚 担当教科:', body.subjects)
      const gradesValue = JSON.stringify(body.grades || [])
      const assignmentRestrictionsValue = JSON.stringify(body.assignmentRestrictions || [])
      const subjectsValue = JSON.stringify(body.subjects || [])
      console.log('💾 保存する学年JSON:', gradesValue)
      console.log('💾 保存する割当制限JSON:', assignmentRestrictionsValue)
      console.log('💾 保存する教科JSON:', subjectsValue)

      // INSERTクエリをカラムの存在に応じて構築
      if (
        hasGradesColumnForCreate &&
        hasAssignmentRestrictionsColumnForCreate &&
        hasSubjectsColumnForCreate
      ) {
        await db
          .prepare(`
        INSERT INTO teachers (id, name, email, grades, assignment_restrictions, subjects, school_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `)
          .bind(
            teacherId,
            body.name,
            body.email || '',
            gradesValue,
            assignmentRestrictionsValue,
            subjectsValue,
            'school-1' // Default school ID
          )
          .run()
        console.log('✅ 教師作成完了（grades、assignment_restrictions、subjectsカラム付き）')
      } else if (hasGradesColumnForCreate && hasAssignmentRestrictionsColumnForCreate) {
        await db
          .prepare(`
        INSERT INTO teachers (id, name, email, grades, assignment_restrictions, school_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `)
          .bind(
            teacherId,
            body.name,
            body.email || '',
            gradesValue,
            assignmentRestrictionsValue,
            'school-1' // Default school ID
          )
          .run()
        console.log('✅ 教師作成完了（gradesとassignment_restrictionsカラム付き）')
      } else if (hasGradesColumnForCreate) {
        await db
          .prepare(`
        INSERT INTO teachers (id, name, email, grades, school_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `)
          .bind(
            teacherId,
            body.name,
            body.email || '',
            gradesValue,
            'school-1' // Default school ID
          )
          .run()
        console.log('✅ 教師作成完了（gradesカラム付き）')
      } else {
        await db
          .prepare(`
        INSERT INTO teachers (id, name, email, school_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `)
          .bind(
            teacherId,
            body.name,
            body.email || '',
            'school-1' // Default school ID
          )
          .run()
        console.log('✅ 教師作成完了（基本カラムのみ）')
      }

      // 作成した教師を返す前に、担当科目の保存を完了させる
      console.log('📚 担当科目保存開始:', body.subjects)
      if (body.subjects && Array.isArray(body.subjects) && body.subjects.length > 0) {
        for (const subjectName of body.subjects) {
          console.log(`🔍 科目名で検索中: ${subjectName}`)
          // 科目名から科目IDを取得
          const subject = await db
            .prepare('SELECT id FROM subjects WHERE name = ?')
            .bind(subjectName)
            .first()
          console.log(`📖 検索結果:`, subject)
          if (subject) {
            const relationId = `teacher-subject-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
            console.log(`💾 関連付けを保存中: ${relationId}`)
            await db
              .prepare(`
            INSERT INTO teacher_subjects (id, teacher_id, subject_id, created_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          `)
              .bind(relationId, teacherId, subject.id)
              .run()
            console.log(`✅ 関連付け保存完了`)
          } else {
            console.log(`⚠️ 科目が見つかりませんでした: ${subjectName}`)
          }
        }
      } else {
        console.log('ℹ️ 担当科目が指定されていません')
      }

      // 担当科目保存完了後に教師情報を取得
      // まずテーブル構造を確認してからクエリを実行
      const tableInfo = await db.prepare(`PRAGMA table_info(teachers)`).all()
      const hasGradesColumn = tableInfo.results?.some(col => col.name === 'grades')
      const hasAssignmentRestrictionsColumn = tableInfo.results?.some(
        col => col.name === 'assignment_restrictions'
      )

      let teacherQuery = ''
      if (hasGradesColumn && hasAssignmentRestrictionsColumn) {
        teacherQuery = `
        SELECT t.id, t.name, t.email, t.created_at,
          COALESCE(t.grades, '[]') as grades,
          COALESCE(t.assignment_restrictions, '[]') as assignment_restrictions,
          COALESCE(
            JSON_GROUP_ARRAY(
              CASE WHEN s.id IS NOT NULL THEN 
                JSON_OBJECT('id', s.id, 'name', s.name)
              END
            ) FILTER (WHERE s.id IS NOT NULL), 
            JSON('[]')
          ) as subjects
        FROM teachers t
        LEFT JOIN teacher_subjects ts ON t.id = ts.teacher_id
        LEFT JOIN subjects s ON ts.subject_id = s.id
        WHERE t.id = ?
        GROUP BY t.id
      `
      } else if (hasGradesColumn) {
        teacherQuery = `
        SELECT t.id, t.name, t.email, t.created_at,
          COALESCE(t.grades, '[]') as grades,
          '[]' as assignment_restrictions,
          COALESCE(
            JSON_GROUP_ARRAY(
              CASE WHEN s.id IS NOT NULL THEN 
                JSON_OBJECT('id', s.id, 'name', s.name)
              END
            ) FILTER (WHERE s.id IS NOT NULL), 
            JSON('[]')
          ) as subjects
        FROM teachers t
        LEFT JOIN teacher_subjects ts ON t.id = ts.teacher_id
        LEFT JOIN subjects s ON ts.subject_id = s.id
        WHERE t.id = ?
        GROUP BY t.id
      `
      } else {
        teacherQuery = `
        SELECT t.id, t.name, t.email, t.created_at,
          '[]' as grades,
          '[]' as assignment_restrictions,
          COALESCE(
            JSON_GROUP_ARRAY(
              CASE WHEN s.id IS NOT NULL THEN 
                JSON_OBJECT('id', s.id, 'name', s.name)
              END
            ) FILTER (WHERE s.id IS NOT NULL), 
            JSON('[]')
          ) as subjects
        FROM teachers t
        LEFT JOIN teacher_subjects ts ON t.id = ts.teacher_id
        LEFT JOIN subjects s ON ts.subject_id = s.id
        WHERE t.id = ?
        GROUP BY t.id
      `
      }

      const newTeacher = await db.prepare(teacherQuery).bind(teacherId).first()
      console.log('🆕 新規作成教師データ:', newTeacher)

      // subjectsフィールドをパース
      if (newTeacher.subjects && typeof newTeacher.subjects === 'string') {
        try {
          newTeacher.subjects = JSON.parse(newTeacher.subjects)
        } catch (_e) {
          newTeacher.subjects = []
        }
      }

      // gradesフィールドをパース
      if (newTeacher.grades && typeof newTeacher.grades === 'string') {
        try {
          newTeacher.grades = JSON.parse(newTeacher.grades)
        } catch (_e) {
          newTeacher.grades = []
        }
      }

      // assignment_restrictionsフィールドをパース
      if (
        newTeacher.assignment_restrictions &&
        typeof newTeacher.assignment_restrictions === 'string'
      ) {
        try {
          newTeacher.assignmentRestrictions = JSON.parse(newTeacher.assignment_restrictions)
        } catch (_e) {
          newTeacher.assignmentRestrictions = []
        }
      } else {
        newTeacher.assignmentRestrictions = []
      }

      return c.json({
        success: true,
        data: newTeacher,
        message: '教師を作成しました',
      })
    } catch (error) {
      console.error('教師作成エラー:', error)
      console.error('教師作成エラー詳細:', error.message)
      return c.json(
        {
          success: false,
          error: '教師の作成に失敗しました',
          details: error.message,
        },
        500
      )
    }
  }
)

// 教師個別更新（管理者権限必須）
schoolRoutes.put(
  '/teachers/:id',
  clerkAuthMiddleware,
  adminAuthMiddleware,
  validatePathParams(['id']),
  validateRequestBody({
    name: { type: 'string', required: false, minLength: 1, maxLength: 100 },
    email: { type: 'email', required: false },
    subjects: { type: 'array', required: false, maxItems: 20 },
    grades: { type: 'array', required: false, maxItems: 10 },
    assignmentRestrictions: { type: 'array', required: false, maxItems: 50 }, // 割当制限（最大50個）
  }),
  async c => {
    try {
      const teacherId = c.req.param('id')
      const body = c.get('validatedBody')
      const db = c.env.DB

      console.log('🔄 教師更新開始')
      console.log('  📝 Teacher ID:', teacherId)
      console.log('  📦 Request body:', JSON.stringify(body, null, 2))
      console.log('  📚 Subjects in request:', body.subjects)
      console.log('  🎓 Grades in request:', body.grades)
      console.log('  🔍 subjects is Array?', Array.isArray(body.subjects))
      console.log('  🔍 subjects type:', typeof body.subjects)
      console.log('  🔍 subjects length:', body.subjects?.length)

      // 教師の存在確認
      const existing = await db
        .prepare('SELECT id FROM teachers WHERE id = ?')
        .bind(teacherId)
        .first()
      if (!existing) {
        return c.json(
          {
            success: false,
            error: '指定された教師が見つかりません',
          },
          404
        )
      }

      // 基本情報の更新
      const updateFields = []
      const updateValues = []

      if (body.name) {
        updateFields.push('name = ?')
        updateValues.push(body.name)
      }
      if (body.email !== undefined) {
        updateFields.push('email = ?')
        updateValues.push(body.email || '')
      }
      // gradesカラムが存在する場合のみ更新対象に含める
      if (body.grades !== undefined) {
        try {
          // gradesカラムの存在確認のためのダミークエリ
          await db
            .prepare('SELECT grades FROM teachers WHERE id = ? LIMIT 1')
            .bind(teacherId)
            .first()
          updateFields.push('grades = ?')
          updateValues.push(JSON.stringify(body.grades))
        } catch (error) {
          if (
            error.message &&
            (error.message.includes('no such column: grades') ||
              error.message.includes('has no column named grades'))
          ) {
            console.log('gradesカラムが存在しないため、grades更新をスキップします')
          } else {
            throw error
          }
        }
      }

      // assignment_restrictionsカラムが存在する場合のみ更新対象に含める
      if (body.assignmentRestrictions !== undefined) {
        try {
          // assignment_restrictionsカラムの存在確認のためのダミークエリ
          await db
            .prepare('SELECT assignment_restrictions FROM teachers WHERE id = ? LIMIT 1')
            .bind(teacherId)
            .first()
          updateFields.push('assignment_restrictions = ?')
          updateValues.push(JSON.stringify(body.assignmentRestrictions))
          console.log('✅ Assignment restrictions updated:', body.assignmentRestrictions)
        } catch (error) {
          if (
            error.message &&
            (error.message.includes('no such column: assignment_restrictions') ||
              error.message.includes('has no column named assignment_restrictions'))
          ) {
            console.log(
              'assignment_restrictionsカラムが存在しないため、assignment_restrictions更新をスキップします'
            )
          } else {
            throw error
          }
        }
      }

      // subjectsカラムが存在する場合のみ更新対象に含める
      if (body.subjects !== undefined) {
        try {
          // subjectsカラムの存在確認のためのダミークエリ
          await db
            .prepare('SELECT subjects FROM teachers WHERE id = ? LIMIT 1')
            .bind(teacherId)
            .first()
          updateFields.push('subjects = ?')
          updateValues.push(JSON.stringify(body.subjects))
          console.log('✅ Subjects updated:', body.subjects)
        } catch (error) {
          if (
            error.message &&
            (error.message.includes('no such column: subjects') ||
              error.message.includes('has no column named subjects'))
          ) {
            console.log('subjectsカラムが存在しないため、subjects更新をスキップします')
          } else {
            throw error
          }
        }
      }

      updateFields.push('updated_at = ?')
      updateValues.push(new Date().toISOString())
      updateValues.push(teacherId)

      if (updateFields.length > 1) {
        // updated_at以外にも更新フィールドがある場合
        await db
          .prepare(`
        UPDATE teachers 
        SET ${updateFields.join(', ')} 
        WHERE id = ?
      `)
          .bind(...updateValues)
          .run()
      }

      // 担当科目の更新
      if (body.subjects !== undefined) {
        console.log('📚 担当科目更新処理開始')
        console.log('  📋 受信したsubjects:', body.subjects)
        console.log('  🔍 subjects type:', typeof body.subjects)
        console.log('  🔍 subjects isArray:', Array.isArray(body.subjects))
        console.log('  🗑️ 既存の関連付けを削除中...')

        // 既存の科目関連付けを削除
        const deleteResult = await db
          .prepare('DELETE FROM teacher_subjects WHERE teacher_id = ?')
          .bind(teacherId)
          .run()
        console.log('  ✅ 削除完了:', deleteResult.changes, '件')

        // 新しい科目関連付けを追加
        if (Array.isArray(body.subjects) && body.subjects.length > 0) {
          console.log('  ➕ 新しい関連付けを追加中:', body.subjects)
          for (const subjectName of body.subjects) {
            console.log(`    🔍 科目名で検索中: "${subjectName}"`)
            console.log(`    🔍 subjectName type:`, typeof subjectName)

            // 全科目を確認
            const allSubjects = await db.prepare('SELECT id, name FROM subjects LIMIT 10').all()
            console.log(
              `    📚 利用可能な科目（最初の10件）:`,
              allSubjects.results?.map(s => s.name)
            )

            // 科目名から科目IDを取得（完全一致と部分一致の両方を試行）
            let subject = await db
              .prepare('SELECT id, name FROM subjects WHERE name = ?')
              .bind(subjectName)
              .first()
            console.log(`    📖 完全一致検索結果:`, subject)

            if (!subject) {
              // 部分一致でも試行
              subject = await db
                .prepare('SELECT id, name FROM subjects WHERE name LIKE ?')
                .bind(`%${subjectName}%`)
                .first()
              console.log(`    📖 部分一致検索結果:`, subject)
            }

            if (subject) {
              const relationId = `teacher-subject-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
              const currentTime = new Date().toISOString()
              console.log(
                `    💾 関連付けを保存中: ${relationId} (teacher: ${teacherId}, subject: ${subject.id})`
              )
              console.log(`    🔍 バインド値確認:`)
              console.log(`      relationId: "${relationId}" (type: ${typeof relationId})`)
              console.log(`      teacherId: "${teacherId}" (type: ${typeof teacherId})`)
              console.log(`      subject.id: "${subject.id}" (type: ${typeof subject.id})`)
              console.log(`      currentTime: "${currentTime}" (type: ${typeof currentTime})`)

              // バインド値のバリデーション
              if (!relationId || !teacherId || !subject.id) {
                throw new Error(
                  `Invalid bind values: relationId=${relationId}, teacherId=${teacherId}, subjectId=${subject.id}`
                )
              }

              try {
                const insertResult = await db
                  .prepare(`
                INSERT INTO teacher_subjects (id, teacher_id, subject_id, created_at)
                VALUES (?, ?, ?, ?)
              `)
                  .bind(relationId, teacherId, subject.id, currentTime)
                  .run()
                console.log(
                  `    ✅ 関連付け保存完了:`,
                  insertResult.changes,
                  '件',
                  insertResult.meta
                )
              } catch (insertError) {
                console.log(`    ❌ 関連付け保存エラー:`, insertError)
                console.log(
                  `    🔍 エラー詳細: relationId="${relationId}", teacherId="${teacherId}", subjectId="${subject.id}"`
                )
                throw insertError // エラーを再投げして上位で処理
              }
            } else {
              console.log(`    ❌ 科目が見つかりませんでした: "${subjectName}"`)
              console.log(`    💡 利用可能な科目名との比較:`)
              allSubjects.results?.forEach(s => {
                console.log(`      - "${s.name}" === "${subjectName}": ${s.name === subjectName}`)
              })
            }
          }
        } else {
          console.log('  ℹ️ 科目が指定されていないか、空の配列です')
        }
      } else {
        console.log('📚 subjects プロパティが未定義のため、科目更新をスキップ')
      }

      // 更新された教師情報を取得（科目情報も含む）
      // まずテーブル構造を確認してからクエリを実行
      const updateTableInfo = await db.prepare(`PRAGMA table_info(teachers)`).all()
      const hasGradesColumnForUpdate = updateTableInfo.results?.some(col => col.name === 'grades')
      const hasAssignmentRestrictionsColumn = updateTableInfo.results?.some(
        col => col.name === 'assignment_restrictions'
      )

      let updateQuery = ''
      if (hasGradesColumnForUpdate && hasAssignmentRestrictionsColumn) {
        updateQuery = `
        SELECT t.id, t.name, t.email, t.created_at,
          COALESCE(t.grades, '[]') as grades,
          COALESCE(t.assignment_restrictions, '[]') as assignment_restrictions,
          COALESCE(
            JSON_GROUP_ARRAY(
              CASE WHEN s.id IS NOT NULL THEN 
                JSON_OBJECT('id', s.id, 'name', s.name)
              END
            ) FILTER (WHERE s.id IS NOT NULL), 
            JSON('[]')
          ) as subjects
        FROM teachers t
        LEFT JOIN teacher_subjects ts ON t.id = ts.teacher_id
        LEFT JOIN subjects s ON ts.subject_id = s.id
        WHERE t.id = ?
        GROUP BY t.id
      `
      } else if (hasGradesColumnForUpdate) {
        updateQuery = `
        SELECT t.id, t.name, t.email, t.created_at,
          COALESCE(t.grades, '[]') as grades,
          '[]' as assignment_restrictions,
          COALESCE(
            JSON_GROUP_ARRAY(
              CASE WHEN s.id IS NOT NULL THEN 
                JSON_OBJECT('id', s.id, 'name', s.name)
              END
            ) FILTER (WHERE s.id IS NOT NULL), 
            JSON('[]')
          ) as subjects
        FROM teachers t
        LEFT JOIN teacher_subjects ts ON t.id = ts.teacher_id
        LEFT JOIN subjects s ON ts.subject_id = s.id
        WHERE t.id = ?
        GROUP BY t.id
      `
      } else {
        updateQuery = `
        SELECT t.id, t.name, t.email, t.created_at,
          '[]' as grades,
          '[]' as assignment_restrictions,
          COALESCE(
            JSON_GROUP_ARRAY(
              CASE WHEN s.id IS NOT NULL THEN 
                JSON_OBJECT('id', s.id, 'name', s.name)
              END
            ) FILTER (WHERE s.id IS NOT NULL), 
            JSON('[]')
          ) as subjects
        FROM teachers t
        LEFT JOIN teacher_subjects ts ON t.id = ts.teacher_id
        LEFT JOIN subjects s ON ts.subject_id = s.id
        WHERE t.id = ?
        GROUP BY t.id
      `
      }

      const updatedTeacher = await db.prepare(updateQuery).bind(teacherId).first()
      console.log('🔄 更新後教師データ:', updatedTeacher)

      // subjectsフィールドをパース
      if (updatedTeacher.subjects && typeof updatedTeacher.subjects === 'string') {
        try {
          updatedTeacher.subjects = JSON.parse(updatedTeacher.subjects)
        } catch (_e) {
          updatedTeacher.subjects = []
        }
      }

      // gradesフィールドをパース
      if (updatedTeacher.grades && typeof updatedTeacher.grades === 'string') {
        try {
          updatedTeacher.grades = JSON.parse(updatedTeacher.grades)
        } catch (_e) {
          updatedTeacher.grades = []
        }
      }

      // assignment_restrictionsフィールドをパース
      if (
        updatedTeacher.assignment_restrictions &&
        typeof updatedTeacher.assignment_restrictions === 'string'
      ) {
        try {
          updatedTeacher.assignmentRestrictions = JSON.parse(updatedTeacher.assignment_restrictions)
        } catch (_e) {
          updatedTeacher.assignmentRestrictions = []
        }
      } else {
        updatedTeacher.assignmentRestrictions = []
      }

      return c.json({
        success: true,
        data: updatedTeacher,
        message: '教師情報を更新しました',
      })
    } catch (error) {
      console.error('教師更新エラー:', error)
      console.error('教師更新エラー詳細:', error.message)
      return c.json(
        {
          success: false,
          error: '教師の更新に失敗しました',
          details: error.message,
        },
        500
      )
    }
  }
)

// 教師削除（管理者権限必須）
schoolRoutes.delete(
  '/teachers/:id',
  clerkAuthMiddleware,
  adminAuthMiddleware,
  validatePathParams(['id']),
  async c => {
    try {
      const teacherId = c.req.param('id')
      const db = c.env.DB

      // 教師の存在確認
      const existing = await db
        .prepare('SELECT id, name FROM teachers WHERE id = ?')
        .bind(teacherId)
        .first()
      if (!existing) {
        return c.json(
          {
            success: false,
            error: '指定された教師が見つかりません',
          },
          404
        )
      }

      console.log(`🗑️ 教師削除開始: ${teacherId} (${existing.name})`)

      // D1データベースの制約問題を回避するため、単純な削除処理に変更
      // 関連する教科関連付けを先に削除（FK制約順守）
      console.log('🔗 教科関連付けを削除中...')
      const deleteSubjectsResult = await db
        .prepare('DELETE FROM teacher_subjects WHERE teacher_id = ?')
        .bind(teacherId)
        .run()
      console.log('📊 教科関連付け削除結果:', deleteSubjectsResult)

      // 教師を削除
      console.log('👨‍🏫 教師レコードを削除中...')
      const deleteTeacherResult = await db
        .prepare('DELETE FROM teachers WHERE id = ?')
        .bind(teacherId)
        .run()
      console.log('📊 教師削除結果:', deleteTeacherResult)

      console.log(`✅ 教師削除完了: ${existing.name}`)

      return c.json({
        success: true,
        message: `教師「${existing.name}」を削除しました`,
      })
    } catch (error) {
      console.error('教師削除エラー:', error)
      return c.json(
        {
          success: false,
          error: '教師の削除に失敗しました',
          details: error.message,
        },
        500
      )
    }
  }
)

// 科目一覧取得（認証必須）
schoolRoutes.get('/subjects', clerkAuthMiddleware, readOnlyAuthMiddleware, async c => {
  try {
    const db = c.env.DB
    const result = await db.prepare('SELECT * FROM subjects').all()

    // targetGradesフィールドをパースして配列に変換し、weeklyLessonsフィールドをマッピング
    const subjects = (result.results || []).map(subject => {
      if (subject.target_grades) {
        try {
          subject.targetGrades = JSON.parse(subject.target_grades)
        } catch (_e) {
          subject.targetGrades = []
        }
      } else {
        subject.targetGrades = []
      }

      // TimetableGenerator用のデータ形式に変換
      // grades: フロントエンドのtargetGrades -> バックエンドのgrades
      subject.grades = subject.targetGrades || []

      // weeklyHours: フロントエンドのweekly_hours -> バックエンドのweeklyHours (全学年対応)
      if (!subject.weekly_hours) {
        subject.weekly_hours = 1
      }

      // 全学年に対して同じ時数を設定（学年別対応の場合は後で改善）
      subject.weeklyHours = {
        1: subject.weekly_hours,
        2: subject.weekly_hours,
        3: subject.weekly_hours,
      }

      return subject
    })

    return c.json({
      success: true,
      data: subjects,
    })
  } catch (error) {
    console.error('科目一覧取得エラー:', error)
    return c.json(
      {
        success: false,
        error: '科目一覧の取得に失敗しました',
      },
      500
    )
  }
})

// 科目更新（管理者権限必須）
schoolRoutes.put(
  '/subjects/:id',
  clerkAuthMiddleware,
  adminAuthMiddleware,
  validatePathParams(['id']),
  validateRequestBody({
    name: { type: 'string', required: false, minLength: 1, maxLength: 100 },
    short_name: { type: 'string', required: false, maxLength: 20 },
    category: { type: 'string', required: false, maxLength: 50 },
    weekly_hours: { type: 'number', required: false, min: 0, max: 40 },
    requires_special_room: { type: 'boolean', required: false },
    targetGrades: { type: 'array', required: false, maxItems: 10 },
    target_grades: { type: 'array', required: false, maxItems: 10 },
    specialClassroom: { type: 'string', required: false, maxLength: 100 },
    order: { type: 'number', required: false, min: 0 },
  }),
  async c => {
    try {
      const subjectId = c.req.param('id')
      const body = c.get('validatedBody')
      const db = c.env.DB

      // 科目の存在確認
      const existing = await db
        .prepare('SELECT id FROM subjects WHERE id = ?')
        .bind(subjectId)
        .first()
      if (!existing) {
        return c.json(
          {
            success: false,
            error: '指定された科目が見つかりません',
          },
          404
        )
      }

      const updateFields = []
      const updateValues = []

      if (body.name) {
        updateFields.push('name = ?')
        updateValues.push(body.name)
      }
      if (body.short_name) {
        updateFields.push('short_name = ?')
        updateValues.push(body.short_name)
      }
      if (body.category) {
        updateFields.push('category = ?')
        updateValues.push(body.category)
      }
      // 授業時数の更新処理
      if (body.weekly_hours !== undefined) {
        console.log('📚 教科更新 - 授業時数:', {
          weekly_hours: body.weekly_hours,
        })
        updateFields.push('weekly_hours = ?')
        updateValues.push(body.weekly_hours)
      }
      if (body.requires_special_room !== undefined) {
        updateFields.push('requires_special_room = ?')
        updateValues.push(body.requires_special_room)
      }
      // Handle both targetGrades and target_grades for compatibility
      const gradesData = body.targetGrades !== undefined ? body.targetGrades : body.target_grades
      if (gradesData !== undefined) {
        console.log('📊 Updating subject grades:', gradesData)

        // データベーステーブルにtargetGradesカラムがあるかチェック
        const tableInfo = await db.prepare(`PRAGMA table_info(subjects)`).all()
        const hasTargetGradesColumn = tableInfo.results?.some(col => col.name === 'target_grades')

        if (!hasTargetGradesColumn) {
          // targetGradesカラムを追加
          await db.prepare(`ALTER TABLE subjects ADD COLUMN target_grades TEXT DEFAULT '[]'`).run()
          console.log('✅ target_grades カラムを追加しました（更新時）')
        }

        updateFields.push('target_grades = ?')
        updateValues.push(JSON.stringify(gradesData))
      }

      // Handle specialClassroom field
      if (body.specialClassroom !== undefined) {
        // Check if specialClassroom column exists
        const tableInfo = await db.prepare(`PRAGMA table_info(subjects)`).all()
        const hasSpecialClassroomColumn = tableInfo.results?.some(
          col => col.name === 'special_classroom'
        )

        if (!hasSpecialClassroomColumn) {
          // Add specialClassroom column
          await db
            .prepare(`ALTER TABLE subjects ADD COLUMN special_classroom TEXT DEFAULT NULL`)
            .run()
          console.log('✅ special_classroom カラムを追加しました（更新時）')
        }

        updateFields.push('special_classroom = ?')
        updateValues.push(body.specialClassroom)
      }

      // Handle order field
      if (body.order !== undefined) {
        // Check if order column exists
        const tableInfo = await db.prepare(`PRAGMA table_info(subjects)`).all()
        const hasOrderColumn = tableInfo.results?.some(col => col.name === 'order')

        if (!hasOrderColumn) {
          // Add order column
          await db.prepare(`ALTER TABLE subjects ADD COLUMN \`order\` INTEGER DEFAULT 0`).run()
          console.log('✅ order カラムを追加しました（更新時）')
        }

        updateFields.push('`order` = ?')
        updateValues.push(body.order)
      }

      updateFields.push('updated_at = ?')
      updateValues.push(new Date().toISOString())
      updateValues.push(subjectId)

      await db
        .prepare(`
      UPDATE subjects 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `)
        .bind(...updateValues)
        .run()

      const updatedSubject = await db
        .prepare('SELECT * FROM subjects WHERE id = ?')
        .bind(subjectId)
        .first()

      // targetGradesフィールドをパースして配列に変換し、weeklyLessonsフィールドをマッピング
      if (updatedSubject?.target_grades) {
        try {
          updatedSubject.targetGrades = JSON.parse(updatedSubject.target_grades)
        } catch (_e) {
          updatedSubject.targetGrades = []
        }
      } else if (updatedSubject) {
        updatedSubject.targetGrades = []
      }

      if (updatedSubject) {
        // weekly_hoursフィールドが正しく設定されていることを確認
        if (!updatedSubject.weekly_hours) {
          updatedSubject.weekly_hours = 1
        }
      }

      return c.json({
        success: true,
        data: updatedSubject,
        message: '科目を更新しました',
      })
    } catch (error) {
      console.error('科目更新エラー:', error)
      console.error('科目更新エラー詳細:', error.message)
      return c.json(
        {
          success: false,
          error: '科目の更新に失敗しました',
          details: error.message,
        },
        500
      )
    }
  }
)

// 科目順序の一括更新（管理者権限必須）
schoolRoutes.patch(
  '/subjects/reorder',
  clerkAuthMiddleware,
  adminAuthMiddleware,
  validateRequestBody({
    subjects: {
      type: 'array',
      required: true,
      maxItems: 100,
      items: {
        type: 'object',
        required: ['id', 'order'],
        properties: {
          id: { type: 'string', required: true },
          order: { type: 'number', required: true, min: 0 },
        },
      },
    },
  }),
  async c => {
    try {
      const body = c.get('validatedBody')
      const db = c.env.DB

      console.log('📊 教科順序一括更新開始:', body.subjects.length, '件')

      // orderカラムが存在するかチェック
      const tableInfo = await db.prepare(`PRAGMA table_info(subjects)`).all()
      const hasOrderColumn = tableInfo.results?.some(col => col.name === 'order')

      if (!hasOrderColumn) {
        // orderカラムを追加
        await db.prepare(`ALTER TABLE subjects ADD COLUMN \`order\` INTEGER DEFAULT 0`).run()
        console.log('✅ order カラムを追加しました（一括更新時）')
      }

      // トランザクション内で一括更新
      const statements = body.subjects.map(subject => {
        return db
          .prepare('UPDATE subjects SET `order` = ?, updated_at = ? WHERE id = ?')
          .bind(subject.order, new Date().toISOString(), subject.id)
      })

      // 全ての更新を実行
      const results = await db.batch(statements)

      // 更新された科目数をカウント
      const updatedCount = results.filter(result => result.changes > 0).length

      console.log('✅ 教科順序一括更新完了:', updatedCount, '件更新')

      return c.json({
        success: true,
        message: `${updatedCount}件の教科順序を更新しました`,
        data: {
          updatedCount,
          totalRequested: body.subjects.length,
        },
      })
    } catch (error) {
      console.error('教科順序一括更新エラー:', error)
      return c.json(
        {
          success: false,
          error: '教科順序の一括更新に失敗しました',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }
)

// 教師順序の一括更新（管理者権限必須）
schoolRoutes.patch(
  '/teachers/reorder',
  clerkAuthMiddleware,
  adminAuthMiddleware,
  validateRequestBody({
    teachers: {
      type: 'array',
      required: true,
      maxItems: 100,
      items: {
        type: 'object',
        required: ['id', 'order'],
        properties: {
          id: { type: 'string', required: true },
          order: { type: 'number', required: true, min: 0 },
        },
      },
    },
  }),
  async c => {
    try {
      const body = c.get('validatedBody')
      const db = c.env.DB

      console.log('👨‍🏫 教師順序一括更新開始:', body.teachers.length, '件')

      // トランザクション内で一括更新
      const statements = body.teachers.map(teacher => {
        return db
          .prepare('UPDATE teachers SET `order` = ?, updated_at = ? WHERE id = ?')
          .bind(teacher.order, new Date().toISOString(), teacher.id)
      })

      // 全ての更新を実行
      const results = await db.batch(statements)

      // 更新された教師数をカウント
      const updatedCount = results.filter(result => result.changes > 0).length

      console.log('✅ 教師順序一括更新完了:', updatedCount, '件更新')

      return c.json({
        success: true,
        message: `${updatedCount}件の教師順序を更新しました`,
        data: {
          updatedCount,
          totalRequested: body.teachers.length,
        },
      })
    } catch (error) {
      console.error('教師順序一括更新エラー:', error)
      return c.json(
        {
          success: false,
          error: '教師順序の一括更新に失敗しました',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }
)

// 教室順序の一括更新（管理者権限必須）
schoolRoutes.patch(
  '/classrooms/reorder',
  clerkAuthMiddleware,
  adminAuthMiddleware,
  validateRequestBody({
    classrooms: {
      type: 'array',
      required: true,
      maxItems: 100,
      items: {
        type: 'object',
        required: ['id', 'order'],
        properties: {
          id: { type: 'string', required: true },
          order: { type: 'number', required: true, min: 0 },
        },
      },
    },
  }),
  async c => {
    try {
      const body = c.get('validatedBody')
      const db = c.env.DB

      console.log('🏢 教室順序一括更新開始:', body.classrooms.length, '件')

      // トランザクション内で一括更新
      const statements = body.classrooms.map(classroom => {
        return db
          .prepare('UPDATE classrooms SET `order` = ?, updated_at = ? WHERE id = ?')
          .bind(classroom.order, new Date().toISOString(), classroom.id)
      })

      // 全ての更新を実行
      const results = await db.batch(statements)

      // 更新された教室数をカウント
      const updatedCount = results.filter(result => result.changes > 0).length

      console.log('✅ 教室順序一括更新完了:', updatedCount, '件更新')

      return c.json({
        success: true,
        message: `${updatedCount}件の教室順序を更新しました`,
        data: {
          updatedCount,
          totalRequested: body.classrooms.length,
        },
      })
    } catch (error) {
      console.error('教室順序一括更新エラー:', error)
      return c.json(
        {
          success: false,
          error: '教室順序の一括更新に失敗しました',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }
)

// 科目作成（管理者権限必須）
schoolRoutes.post(
  '/subjects',
  clerkAuthMiddleware,
  adminAuthMiddleware,
  validateRequestBody({
    name: { type: 'string', required: true, minLength: 1, maxLength: 100 },
    short_name: { type: 'string', required: false, maxLength: 20 },
    category: { type: 'string', required: false, maxLength: 50 },
    weekly_hours: { type: 'number', required: false, min: 0, max: 40 },
    requires_special_room: { type: 'boolean', required: false },
    targetGrades: { type: 'array', required: false, maxItems: 10 }, // 対象学年フィールド追加
    target_grades: { type: 'array', required: false, maxItems: 10 }, // 互換性のため
  }),
  async c => {
    try {
      const body = c.get('validatedBody')
      const db = c.env.DB

      const subjectId = `subject-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

      // データベーステーブルにtargetGradesカラムがあるかチェック
      const tableInfo = await db.prepare(`PRAGMA table_info(subjects)`).all()
      const hasTargetGradesColumn = tableInfo.results?.some(col => col.name === 'target_grades')

      if (!hasTargetGradesColumn) {
        // targetGradesカラムを追加
        await db.prepare(`ALTER TABLE subjects ADD COLUMN target_grades TEXT DEFAULT '[]'`).run()
        console.log('✅ target_grades カラムを追加しました')
      }

      // Handle both targetGrades and target_grades for compatibility
      const gradesData = body.targetGrades !== undefined ? body.targetGrades : body.target_grades

      // 学年指定がない場合（空配列または未定義）は全学年に設定
      const finalGrades = !gradesData || gradesData.length === 0 ? [1, 2, 3] : gradesData
      const targetGradesJson = JSON.stringify(finalGrades)
      console.log('📊 Creating subject with grades:', gradesData, '→ Final grades:', finalGrades)

      // 授業時数の決定
      const weeklyHours = body.weekly_hours || 1

      console.log('📚 教科作成データ:')
      console.log('  name:', body.name)
      console.log('  weekly_hours:', body.weekly_hours)
      console.log('  週授業時数（確定値）:', weeklyHours)

      await db
        .prepare(`
      INSERT INTO subjects (id, name, short_name, category, weekly_hours, requires_special_room, target_grades, school_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `)
        .bind(
          subjectId,
          body.name,
          body.short_name || body.name,
          body.category || 'core',
          weeklyHours,
          body.requires_special_room || false,
          targetGradesJson,
          'school-1' // Default school ID
        )
        .run()

      const newSubject = await db
        .prepare('SELECT * FROM subjects WHERE id = ?')
        .bind(subjectId)
        .first()

      // targetGradesフィールドをパースして配列に変換し、weeklyLessonsフィールドをマッピング
      if (newSubject?.target_grades) {
        try {
          newSubject.targetGrades = JSON.parse(newSubject.target_grades)
        } catch (_e) {
          newSubject.targetGrades = []
        }
      } else if (newSubject) {
        newSubject.targetGrades = []
      }

      if (newSubject) {
        // weekly_hoursフィールドが正しく設定されていることを確認
        if (!newSubject.weekly_hours) {
          newSubject.weekly_hours = 1
        }
      }

      return c.json({
        success: true,
        data: newSubject,
        message: '科目を作成しました',
      })
    } catch (error) {
      console.error('科目作成エラー:', error)
      console.error('科目作成エラー詳細:', error.message)
      return c.json(
        {
          success: false,
          error: '科目の作成に失敗しました',
          details: error.message,
        },
        500
      )
    }
  }
)

// 教科削除（管理者権限必須）
schoolRoutes.delete(
  '/subjects/:id',
  clerkAuthMiddleware,
  adminAuthMiddleware,
  validatePathParams(['id']),
  async c => {
    try {
      const subjectId = c.req.param('id')
      const db = c.env.DB

      // 教科の存在確認
      const existing = await db
        .prepare('SELECT id, name FROM subjects WHERE id = ?')
        .bind(subjectId)
        .first()
      if (!existing) {
        return c.json(
          {
            success: false,
            error: '指定された教科が見つかりません',
          },
          404
        )
      }

      // 関連する教師-教科関連付けを削除
      await db.prepare('DELETE FROM teacher_subjects WHERE subject_id = ?').bind(subjectId).run()

      // 教科を削除
      await db.prepare('DELETE FROM subjects WHERE id = ?').bind(subjectId).run()

      return c.json({
        success: true,
        message: `教科「${existing.name}」を削除しました`,
      })
    } catch (error) {
      console.error('教科削除エラー:', error)
      return c.json(
        {
          success: false,
          error: '教科の削除に失敗しました',
          details: error.message,
        },
        500
      )
    }
  }
)

// 教室一覧取得（認証必須）
schoolRoutes.get('/classrooms', clerkAuthMiddleware, readOnlyAuthMiddleware, async c => {
  try {
    const db = c.env.DB
    const result = await db
      .prepare(`
      SELECT id, name, capacity, COALESCE(\`order\`, 0) as \`order\`, created_at, updated_at 
      FROM classrooms 
      ORDER BY COALESCE(\`order\`, 999999), name
    `)
      .all()

    // フロントエンド互換性のためcountフィールドを追加
    const classroomsWithCount = (result.results || []).map(classroom => ({
      ...classroom,
      count: classroom.capacity,
    }))

    return c.json({
      success: true,
      data: classroomsWithCount,
    })
  } catch (error) {
    console.error('教室一覧取得エラー:', error)
    return c.json(
      {
        success: false,
        error: '教室一覧の取得に失敗しました',
      },
      500
    )
  }
})

// 教室更新（管理者権限必須）
schoolRoutes.put(
  '/classrooms/:id',
  clerkAuthMiddleware,
  adminAuthMiddleware,
  validatePathParams(['id']),
  validateRequestBody({
    name: { type: 'string', required: false, minLength: 1, maxLength: 100 },
    room_number: { type: 'string', required: false, maxLength: 20 },
    type: { type: 'string', required: false, maxLength: 50 },
    capacity: { type: 'number', required: false, min: 1, max: 1000 },
    count: { type: 'number', required: false, min: 1, max: 1000 }, // フロントエンドからのcount対応
  }),
  async c => {
    try {
      const classroomId = c.req.param('id')
      const body = c.get('validatedBody')
      const db = c.env.DB

      // 教室の存在確認
      const existing = await db
        .prepare('SELECT id FROM classrooms WHERE id = ?')
        .bind(classroomId)
        .first()
      if (!existing) {
        return c.json(
          {
            success: false,
            error: '指定された教室が見つかりません',
          },
          404
        )
      }

      const updateFields = []
      const updateValues = []

      if (body.name) {
        updateFields.push('name = ?')
        updateValues.push(body.name)
      }
      if (body.room_number) {
        updateFields.push('room_number = ?')
        updateValues.push(body.room_number)
      }
      if (body.type) {
        updateFields.push('type = ?')
        updateValues.push(body.type)
      }
      // countフィールドがある場合はcapacityとして扱う（フロントエンド互換性）
      const roomCapacity = body.count !== undefined ? body.count : body.capacity
      if (roomCapacity !== undefined) {
        updateFields.push('capacity = ?')
        updateValues.push(roomCapacity)
      }

      updateFields.push('updated_at = ?')
      updateValues.push(new Date().toISOString())
      updateValues.push(classroomId)

      await db
        .prepare(`
      UPDATE classrooms 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `)
        .bind(...updateValues)
        .run()

      const updatedClassroom = await db
        .prepare('SELECT * FROM classrooms WHERE id = ?')
        .bind(classroomId)
        .first()

      // フロントエンド互換性のためcountフィールドを追加
      const responseData = {
        ...updatedClassroom,
        count: updatedClassroom.capacity,
      }

      return c.json({
        success: true,
        data: responseData,
        message: '教室を更新しました',
      })
    } catch (error) {
      console.error('教室更新エラー:', error)
      console.error('教室更新エラー詳細:', error.message)
      return c.json(
        {
          success: false,
          error: '教室の更新に失敗しました',
          details: error.message,
        },
        500
      )
    }
  }
)

// 教室作成（管理者権限必須）
schoolRoutes.post(
  '/classrooms',
  clerkAuthMiddleware,
  adminAuthMiddleware,
  validateRequestBody({
    name: { type: 'string', required: true, minLength: 1, maxLength: 100 },
    room_number: { type: 'string', required: false, maxLength: 20 },
    type: { type: 'string', required: false, maxLength: 50 },
    capacity: { type: 'number', required: false, min: 1, max: 1000 },
    count: { type: 'number', required: false, min: 1, max: 1000 }, // フロントエンドからのcount対応
  }),
  async c => {
    try {
      const body = c.get('validatedBody')
      const db = c.env.DB

      const classroomId = `classroom-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

      // countフィールドがある場合はcapacityとして扱う（フロントエンド互換性）
      const roomCapacity = body.count || body.capacity || 30

      await db
        .prepare(`
      INSERT INTO classrooms (id, name, capacity, \`order\`, created_at, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `)
        .bind(
          classroomId,
          body.name,
          roomCapacity,
          0 // Default order
        )
        .run()

      const newClassroom = await db
        .prepare('SELECT * FROM classrooms WHERE id = ?')
        .bind(classroomId)
        .first()

      // フロントエンド互換性のためcountフィールドを追加
      const responseData = {
        ...newClassroom,
        count: newClassroom.capacity,
      }

      return c.json({
        success: true,
        data: responseData,
        message: '教室を作成しました',
      })
    } catch (error) {
      console.error('教室作成エラー:', error)
      console.error('教室作成エラー詳細:', error.message)
      return c.json(
        {
          success: false,
          error: '教室の作成に失敗しました',
          details: error.message,
        },
        500
      )
    }
  }
)

// 教室削除（管理者権限必須）
schoolRoutes.delete(
  '/classrooms/:id',
  clerkAuthMiddleware,
  adminAuthMiddleware,
  validatePathParams(['id']),
  async c => {
    try {
      const classroomId = c.req.param('id')
      const db = c.env.DB

      console.log('🏢 教室削除開始:', classroomId)

      // 教室の存在確認
      const existing = await db
        .prepare('SELECT id, name FROM classrooms WHERE id = ?')
        .bind(classroomId)
        .first()
      if (!existing) {
        return c.json(
          {
            success: false,
            error: '教室が見つかりません',
          },
          404
        )
      }

      // 教室を削除
      const deleteResult = await db
        .prepare('DELETE FROM classrooms WHERE id = ?')
        .bind(classroomId)
        .run()

      if (deleteResult.changes > 0) {
        console.log('✅ 教室削除完了:', existing.name)
        return c.json({
          success: true,
          message: `教室「${existing.name}」を削除しました`,
        })
      } else {
        return c.json(
          {
            success: false,
            error: '教室の削除に失敗しました',
          },
          500
        )
      }
    } catch (error) {
      console.error('教室削除エラー:', error)
      return c.json(
        {
          success: false,
          error: '教室の削除に失敗しました',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }
)

// 条件設定取得（認証必須）
schoolRoutes.get('/conditions', clerkAuthMiddleware, readOnlyAuthMiddleware, async c => {
  try {
    const db = c.env.DB
    const result = await db
      .prepare(`
      SELECT * FROM conditions WHERE id = 'default' LIMIT 1
    `)
      .first()

    if (result) {
      const data = JSON.parse(result.data)
      return c.json({
        success: true,
        data: data,
      })
    } else {
      return c.json({
        success: true,
        data: { conditions: '' },
      })
    }
  } catch (error) {
    console.error('条件設定取得エラー:', error)
    return c.json({
      success: true,
      data: { conditions: '' },
    })
  }
})

// 条件設定更新（管理者権限必須）
schoolRoutes.put('/conditions', clerkAuthMiddleware, adminAuthMiddleware, async c => {
  try {
    const body = await c.req.json()
    const db = c.env.DB

    // バリデーション：conditions フィールドが存在することを確認
    if (!body.conditions && body.conditions !== '') {
      return c.json(
        {
          success: false,
          error: '条件設定データが不正です',
        },
        400
      )
    }

    await db
      .prepare(`
      INSERT OR REPLACE INTO conditions 
      (id, data, updated_at)
      VALUES ('default', ?, CURRENT_TIMESTAMP)
    `)
      .bind(JSON.stringify(body))
      .run()

    return c.json({
      success: true,
      data: body,
      message: '条件設定を更新しました',
    })
  } catch (error) {
    console.error('条件設定更新エラー:', error)
    return c.json(
      {
        success: false,
        error: '条件設定の更新に失敗しました',
      },
      500
    )
  }
})

// 時間割一覧取得（認証必須）
schoolRoutes.get('/timetables', clerkAuthMiddleware, readOnlyAuthMiddleware, async c => {
  try {
    console.log('🔍 時間割一覧取得開始')
    const db = c.env.DB

    if (!db) {
      console.error('❌ データベース接続が見つかりません')
      return c.json(
        {
          success: false,
          error: 'データベース接続エラー',
        },
        500
      )
    }

    console.log('📊 データベースクエリ実行中...')
    const result = await db
      .prepare(`
      SELECT 
        id,
        name,
        created_at,
        updated_at
      FROM timetables 
      ORDER BY created_at DESC
    `)
      .all()

    console.log('✅ クエリ結果:', {
      hasResults: !!result,
      resultType: typeof result,
      resultsCount: result?.results?.length || 0,
      results: result?.results?.slice(0, 2), // 最初の2件だけログ出力
    })

    return c.json({
      success: true,
      data: result.results || [],
    })
  } catch (error) {
    console.error('💥 時間割一覧取得エラー:', error)
    console.error('エラー詳細:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    })
    return c.json(
      {
        success: false,
        error: '時間割一覧の取得に失敗しました',
      },
      500
    )
  }
})

// 時間割詳細取得（認証必須）
schoolRoutes.get(
  '/timetables/:id',
  clerkAuthMiddleware,
  readOnlyAuthMiddleware,
  validatePathParams(['id']),
  async c => {
    try {
      const timetableId = c.req.param('id')
      const db = c.env.DB

      console.log('🔍 時間割詳細取得リクエスト - ID:', timetableId)

      // 既存の時間割IDをすべて確認
      try {
        const allTimetables = await db.prepare(`SELECT id, name FROM timetables`).all()
        console.log(
          '📋 データベース内の全時間割ID:',
          allTimetables.results?.map(t => ({ id: t.id, name: t.name })) || []
        )
        console.log('📊 全時間割数:', allTimetables.results?.length || 0)
      } catch (listError) {
        console.error('❌ 時間割一覧取得エラー:', listError)
      }

      console.log('🗃️ 指定ID検索開始:', timetableId)

      // まずテーブル構造を確認
      try {
        console.log('📋 テーブル構造確認中...')
        const tableInfo = await db.prepare('PRAGMA table_info(timetables)').all()
        console.log(
          '🏗️ テーブル構造:',
          tableInfo.results?.map(col => ({ name: col.name, type: col.type, notnull: col.notnull }))
        )
      } catch (schemaError) {
        console.error('❌ テーブル構造確認エラー:', schemaError)
      }

      console.log('🔍 実際のSQLクエリ実行...')
      const timetable = await db
        .prepare(`
      SELECT 
        id,
        name,
        settings as timetable_data,
        description,
        academic_year,
        term,
        status,
        created_at,
        updated_at
      FROM timetables 
      WHERE id = ?
    `)
        .bind(timetableId)
        .first()

      console.log('🔎 検索結果:', timetable ? '見つかりました' : '見つかりませんでした')
      if (timetable) {
        console.log('📄 時間割詳細:', {
          id: timetable.id,
          name: timetable.name,
          description: timetable.description,
          academic_year: timetable.academic_year,
          term: timetable.term,
          status: timetable.status,
          timetableDataType: typeof timetable.timetable_data,
          timetableDataValue: timetable.timetable_data,
          hasData: !!timetable.timetable_data,
          keys: Object.keys(timetable),
        })
      }

      if (!timetable) {
        console.log('❌ 404: 指定された時間割が見つかりません - ID:', timetableId)
        return c.json(
          {
            success: false,
            error: '指定された時間割が見つかりません',
          },
          404
        )
      }

      // timetable_dataフィールドの処理（実際のスキーマに対応）
      if (timetable.timetable_data && typeof timetable.timetable_data === 'string') {
        try {
          console.log('🔧 JSON パース開始 - データ長:', timetable.timetable_data.length)
          timetable.schedule = JSON.parse(timetable.timetable_data)
          delete timetable.timetable_data
          console.log('✅ JSON パース成功')
        } catch (e) {
          console.warn('⚠️ 時間割データのJSONパースに失敗:', e)
          console.warn(
            '📝 パース失敗データ (最初の100文字):',
            timetable.timetable_data?.substring(0, 100)
          )
          timetable.schedule = null
          delete timetable.timetable_data
        }
      } else if (timetable.timetable_data) {
        console.log('ℹ️ timetable_dataフィールドはすでに適切な形式です')
        timetable.schedule = timetable.timetable_data
        delete timetable.timetable_data
      } else {
        console.log('⚠️ 時間割データが存在しません - デモデータを使用します')
        // スキーマ不整合のため、フロントエンドのフォールバック機能に依存
        timetable.schedule = null
      }

      console.log('✅ 時間割詳細取得成功 - ID:', timetableId)
      return c.json({
        success: true,
        data: timetable,
      })
    } catch (error) {
      console.error('💥 時間割詳細取得エラー:', error)
      console.error('🔍 エラー詳細:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      })
      return c.json(
        {
          success: false,
          error: '時間割詳細の取得に失敗しました',
        },
        500
      )
    }
  }
)

// 時間割作成（管理者権限必須）
schoolRoutes.post(
  '/timetables',
  clerkAuthMiddleware,
  adminAuthMiddleware,
  validateRequestBody({
    name: { type: 'string', required: true, minLength: 1, maxLength: 100 },
    description: { type: 'string', required: false, maxLength: 500 },
    academic_year: { type: 'string', required: false, maxLength: 10 },
    term: { type: 'string', required: false, maxLength: 10 },
    start_date: { type: 'string', required: false },
    end_date: { type: 'string', required: false },
    status: { type: 'string', required: false, maxLength: 20 },
    is_active: { type: 'boolean', required: false },
    saturday_hours: { type: 'number', required: false, min: 0, max: 10 },
  }),
  async c => {
    try {
      const body = c.get('validatedBody')
      const db = c.env.DB

      const timetableId = `timetable-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
      const currentDate = new Date().toISOString()

      await db
        .prepare(`
      INSERT INTO timetables (
        id, name, school_id, description, academic_year, term,
        start_date, end_date, status, is_active, saturday_hours,
        settings, created_at, updated_at, version, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
        .bind(
          timetableId,
          body.name,
          body.school_id || 'school-1',
          body.description || null,
          body.academic_year || new Date().getFullYear().toString(),
          body.term || '1',
          body.start_date || currentDate,
          body.end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          body.status || 'draft',
          body.is_active || false,
          body.saturday_hours || 0,
          body.settings ? JSON.stringify(body.settings) : null,
          currentDate,
          currentDate,
          1,
          null // created_by をnullに変更
        )
        .run()

      const newTimetable = await db
        .prepare(`
      SELECT 
        id, name, description, academic_year, term,
        start_date, end_date, status, is_active,
        created_at, updated_at, version
      FROM timetables 
      WHERE id = ?
    `)
        .bind(timetableId)
        .first()

      return c.json({
        success: true,
        data: newTimetable,
        message: '時間割を作成しました',
      })
    } catch (error) {
      console.error('時間割作成エラー:', error)
      return c.json(
        {
          success: false,
          error: '時間割の作成に失敗しました',
        },
        500
      )
    }
  }
)

// 時間割更新（管理者権限必須）
schoolRoutes.put(
  '/timetables/:id',
  clerkAuthMiddleware,
  adminAuthMiddleware,
  validatePathParams(['id']),
  validateRequestBody({
    name: { type: 'string', required: false, minLength: 1, maxLength: 100 },
    description: { type: 'string', required: false, maxLength: 500 },
    status: { type: 'string', required: false, maxLength: 20 },
    is_active: { type: 'boolean', required: false },
  }),
  async c => {
    try {
      const timetableId = c.req.param('id')
      const body = c.get('validatedBody')
      const db = c.env.DB

      // 時間割の存在確認
      const existing = await db
        .prepare('SELECT id FROM timetables WHERE id = ?')
        .bind(timetableId)
        .first()
      if (!existing) {
        return c.json(
          {
            success: false,
            error: '指定された時間割が見つかりません',
          },
          404
        )
      }

      const updateFields = []
      const updateValues = []

      if (body.name) {
        updateFields.push('name = ?')
        updateValues.push(body.name)
      }
      if (body.description !== undefined) {
        updateFields.push('description = ?')
        updateValues.push(body.description)
      }
      if (body.status) {
        updateFields.push('status = ?')
        updateValues.push(body.status)
      }
      if (body.is_active !== undefined) {
        updateFields.push('is_active = ?')
        updateValues.push(body.is_active)
      }
      if (body.settings) {
        updateFields.push('settings = ?')
        updateValues.push(JSON.stringify(body.settings))
      }

      updateFields.push('updated_at = ?')
      updateValues.push(new Date().toISOString())
      updateValues.push(timetableId)

      await db
        .prepare(`
      UPDATE timetables 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `)
        .bind(...updateValues)
        .run()

      const updatedTimetable = await db
        .prepare(`
      SELECT 
        id, name, description, academic_year, term,
        start_date, end_date, status, is_active,
        created_at, updated_at, version
      FROM timetables 
      WHERE id = ?
    `)
        .bind(timetableId)
        .first()

      return c.json({
        success: true,
        data: updatedTimetable,
        message: '時間割を更新しました',
      })
    } catch (error) {
      console.error('時間割更新エラー:', error)
      return c.json(
        {
          success: false,
          error: '時間割の更新に失敗しました',
        },
        500
      )
    }
  }
)

// 時間割削除（管理者権限必須）
schoolRoutes.delete(
  '/timetables/:id',
  clerkAuthMiddleware,
  adminAuthMiddleware,
  validatePathParams(['id']),
  async c => {
    try {
      const timetableId = c.req.param('id')
      const db = c.env.DB

      // 時間割の存在確認
      const existing = await db
        .prepare('SELECT id, name FROM timetables WHERE id = ?')
        .bind(timetableId)
        .first()
      if (!existing) {
        return c.json(
          {
            success: false,
            error: '指定された時間割が見つかりません',
          },
          404
        )
      }

      await db.prepare('DELETE FROM timetables WHERE id = ?').bind(timetableId).run()

      return c.json({
        success: true,
        message: `時間割「${existing.name}」を削除しました`,
      })
    } catch (error) {
      console.error('時間割削除エラー:', error)
      return c.json(
        {
          success: false,
          error: '時間割の削除に失敗しました',
        },
        500
      )
    }
  }
)

// 教師-教科関連作成（管理者権限必須）
schoolRoutes.post(
  '/teacher-subjects',
  clerkAuthMiddleware,
  adminAuthMiddleware,
  validateRequestBody({
    teacher_id: { type: 'string', required: true, minLength: 1, maxLength: 100 },
    subject_id: { type: 'string', required: true, minLength: 1, maxLength: 100 },
    qualification_level: { type: 'string', required: false, maxLength: 50 },
    priority: { type: 'number', required: false, min: 1, max: 100 },
  }),
  async c => {
    try {
      const body = c.get('validatedBody')
      const db = c.env.DB

      const relationId = `teacher-subject-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

      await db
        .prepare(`
      INSERT INTO teacher_subjects (id, teacher_id, subject_id, qualification_level, priority, created_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `)
        .bind(
          relationId,
          body.teacher_id,
          body.subject_id,
          body.qualification_level || 'qualified',
          body.priority || 1
        )
        .run()

      const newRelation = await db
        .prepare(`
      SELECT ts.*, t.name as teacher_name, s.name as subject_name
      FROM teacher_subjects ts
      JOIN teachers t ON ts.teacher_id = t.id
      JOIN subjects s ON ts.subject_id = s.id
      WHERE ts.id = ?
    `)
        .bind(relationId)
        .first()

      return c.json({
        success: true,
        data: newRelation,
        message: '教師-教科関連を作成しました',
      })
    } catch (error) {
      console.error('教師-教科関連作成エラー:', error)
      return c.json(
        {
          success: false,
          error: '教師-教科関連の作成に失敗しました',
          details: error.message,
        },
        500
      )
    }
  }
)

// 教師-教科関連一覧取得（認証必須）
schoolRoutes.get('/teacher-subjects', clerkAuthMiddleware, readOnlyAuthMiddleware, async c => {
  try {
    const db = c.env.DB
    const result = await db
      .prepare(`
      SELECT ts.*, t.name as teacher_name, s.name as subject_name
      FROM teacher_subjects ts
      JOIN teachers t ON ts.teacher_id = t.id
      JOIN subjects s ON ts.subject_id = s.id
      ORDER BY t.name, s.name
    `)
      .all()

    return c.json({
      success: true,
      data: result.results || [],
    })
  } catch (error) {
    console.error('教師-教科関連一覧取得エラー:', error)
    return c.json(
      {
        success: false,
        error: '教師-教科関連一覧の取得に失敗しました',
      },
      500
    )
  }
})

// 🔧 一時的なデバッグエンドポイント（500エラー調査用）
schoolRoutes.get('/debug/timetables/:id', clerkAuthMiddleware, async c => {
  try {
    const timetableId = c.req.param('id')
    const db = c.env.DB

    console.log('🛠️ DEBUG: データベース詳細調査開始 - ID:', timetableId)

    // 1. テーブル構造確認
    const tableInfo = await db.prepare('PRAGMA table_info(timetables)').all()
    console.log('🏗️ テーブル構造:', tableInfo.results)

    // 2. 全レコード確認（最初の3件）
    const allRecords = await db.prepare('SELECT * FROM timetables LIMIT 3').all()
    console.log('📋 全レコード（最初の3件）:', allRecords.results)

    // 3. 指定IDのレコード詳細確認
    const targetRecord = await db
      .prepare('SELECT * FROM timetables WHERE id = ?')
      .bind(timetableId)
      .first()
    console.log('🎯 対象レコード:', targetRecord)

    // 4. timetableフィールドの詳細分析
    let timetableFieldAnalysis = null
    if (targetRecord && targetRecord.timetable !== undefined) {
      timetableFieldAnalysis = {
        exists: true,
        type: typeof targetRecord.timetable,
        isNull: targetRecord.timetable === null,
        value: targetRecord.timetable,
        length: targetRecord.timetable ? targetRecord.timetable.length : 0,
        firstChars: targetRecord.timetable ? targetRecord.timetable.substring(0, 100) : 'NULL',
      }
    }

    console.log('🔍 timetableフィールド分析:', timetableFieldAnalysis)

    // 5. JSON パーステスト
    let parseTest = null
    if (targetRecord?.timetable && typeof targetRecord.timetable === 'string') {
      try {
        const parsed = JSON.parse(targetRecord.timetable)
        parseTest = { success: true, parsedType: typeof parsed, keys: Object.keys(parsed || {}) }
      } catch (e) {
        parseTest = { success: false, error: e.message }
      }
    }

    console.log('🧪 JSONパーステスト:', parseTest)

    return c.json({
      success: true,
      debug: {
        requestedId: timetableId,
        tableStructure: tableInfo.results,
        allRecords: allRecords.results,
        targetRecord: targetRecord,
        timetableFieldAnalysis: timetableFieldAnalysis,
        parseTest: parseTest,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('🚨 DEBUG エンドポイントエラー:', error)
    return c.json(
      {
        success: false,
        error: 'デバッグ調査に失敗しました',
        details: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      },
      500
    )
  }
})

export default schoolRoutes
