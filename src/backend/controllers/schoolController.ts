import type { Context } from 'hono'
import type { Env } from '../../shared/types'
import { SchoolService } from '../services/schoolService'

export class SchoolController {
  private getSchoolService(c: Context<{ Bindings: Env }>): SchoolService {
    return new SchoolService(c.env.DB)
  }

  // 学校設定関連
  async getSchoolSettings(c: Context<{ Bindings: Env }>) {
    try {
      const schoolService = this.getSchoolService(c)
      const settings = await schoolService.getSchoolSettings()

      return c.json({
        success: true,
        data: settings,
      })
    } catch (error) {
      console.error('❌ 学校設定取得エラー:', error)
      return c.json(
        {
          success: false,
          message: '学校設定の取得に失敗しました',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }

  async updateSchoolSettings(c: Context<{ Bindings: Env }>) {
    try {
      const updates = await c.req.json()
      const schoolService = this.getSchoolService(c)

      const updatedSettings = await schoolService.updateSchoolSettings(updates)

      return c.json({
        success: true,
        data: updatedSettings,
        message: '学校設定を更新しました',
      })
    } catch (error) {
      console.error('❌ 学校設定更新エラー:', error)
      return c.json(
        {
          success: false,
          message: '学校設定の更新に失敗しました',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }

  // 教師関連
  async getAllTeachers(c: Context<{ Bindings: Env }>) {
    try {
      const schoolService = this.getSchoolService(c)
      const teachers = await schoolService.getAllTeachers()

      return c.json({
        success: true,
        data: teachers,
      })
    } catch (error) {
      console.error('❌ 教師一覧取得エラー:', error)
      return c.json(
        {
          success: false,
          message: '教師一覧の取得に失敗しました',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }

  async createTeacher(c: Context<{ Bindings: Env }>) {
    try {
      const teacherData = await c.req.json()
      const schoolService = this.getSchoolService(c)

      const newTeacher = await schoolService.createTeacher(teacherData)

      return c.json({
        success: true,
        data: newTeacher,
        message: '教師を追加しました',
      })
    } catch (error) {
      console.error('❌ 教師追加エラー:', error)
      return c.json(
        {
          success: false,
          message: '教師の追加に失敗しました',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }

  async updateTeacher(c: Context<{ Bindings: Env }>) {
    try {
      const teacherId = c.req.param('id')
      const updates = await c.req.json()
      const schoolService = this.getSchoolService(c)

      const updatedTeacher = await schoolService.updateTeacher(teacherId, updates)

      return c.json({
        success: true,
        data: updatedTeacher,
        message: '教師情報を更新しました',
      })
    } catch (error) {
      console.error('❌ 教師更新エラー:', error)
      return c.json(
        {
          success: false,
          message: error instanceof Error ? error.message : '教師の更新に失敗しました',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        error instanceof Error && error.message === 'Teacher not found' ? 404 : 500
      )
    }
  }

  async deleteTeacher(c: Context<{ Bindings: Env }>) {
    try {
      const teacherId = c.req.param('id')
      const schoolService = this.getSchoolService(c)

      await schoolService.deleteTeacher(teacherId)

      return c.json({
        success: true,
        message: '教師を削除しました',
      })
    } catch (error) {
      console.error('❌ 教師削除エラー:', error)
      return c.json(
        {
          success: false,
          message: error instanceof Error ? error.message : '教師の削除に失敗しました',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        error instanceof Error && error.message === 'Teacher not found' ? 404 : 500
      )
    }
  }

  // 教科関連
  async getAllSubjects(c: Context<{ Bindings: Env }>) {
    try {
      const schoolService = this.getSchoolService(c)
      const subjects = await schoolService.getAllSubjects()

      return c.json({
        success: true,
        data: subjects,
      })
    } catch (error) {
      console.error('❌ 教科一覧取得エラー:', error)
      return c.json(
        {
          success: false,
          message: '教科一覧の取得に失敗しました',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }

  async createSubject(c: Context<{ Bindings: Env }>) {
    try {
      const subjectData = await c.req.json()
      const schoolService = this.getSchoolService(c)

      const newSubject = await schoolService.createSubject(subjectData)

      return c.json({
        success: true,
        data: newSubject,
        message: '教科を追加しました',
      })
    } catch (error) {
      console.error('❌ 教科追加エラー:', error)
      return c.json(
        {
          success: false,
          message: '教科の追加に失敗しました',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }

  async updateSubject(c: Context<{ Bindings: Env }>) {
    try {
      const subjectId = c.req.param('id')
      const updates = await c.req.json()
      const schoolService = this.getSchoolService(c)

      const updatedSubject = await schoolService.updateSubject(subjectId, updates)

      return c.json({
        success: true,
        data: updatedSubject,
        message: '教科情報を更新しました',
      })
    } catch (error) {
      console.error('❌ 教科更新エラー:', error)
      return c.json(
        {
          success: false,
          message: error instanceof Error ? error.message : '教科の更新に失敗しました',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        error instanceof Error && error.message === 'Subject not found' ? 404 : 500
      )
    }
  }

  async deleteSubject(c: Context<{ Bindings: Env }>) {
    try {
      const subjectId = c.req.param('id')
      const schoolService = this.getSchoolService(c)

      await schoolService.deleteSubject(subjectId)

      return c.json({
        success: true,
        message: '教科を削除しました',
      })
    } catch (error) {
      console.error('❌ 教科削除エラー:', error)
      return c.json(
        {
          success: false,
          message: error instanceof Error ? error.message : '教科の削除に失敗しました',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        error instanceof Error && error.message === 'Subject not found' ? 404 : 500
      )
    }
  }

  // 教室関連
  async getAllClassrooms(c: Context<{ Bindings: Env }>) {
    try {
      const schoolService = this.getSchoolService(c)
      const classrooms = await schoolService.getAllClassrooms()

      return c.json({
        success: true,
        data: classrooms,
      })
    } catch (error) {
      console.error('❌ 教室一覧取得エラー:', error)
      return c.json(
        {
          success: false,
          message: '教室一覧の取得に失敗しました',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }

  async createClassroom(c: Context<{ Bindings: Env }>) {
    try {
      const classroomData = await c.req.json()
      const schoolService = this.getSchoolService(c)

      const newClassroom = await schoolService.createClassroom(classroomData)

      return c.json({
        success: true,
        data: newClassroom,
        message: '教室を追加しました',
      })
    } catch (error) {
      console.error('❌ 教室追加エラー:', error)
      return c.json(
        {
          success: false,
          message: '教室の追加に失敗しました',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }

  async updateClassroom(c: Context<{ Bindings: Env }>) {
    try {
      const classroomId = c.req.param('id')
      const updates = await c.req.json()
      const schoolService = this.getSchoolService(c)

      const updatedClassroom = await schoolService.updateClassroom(classroomId, updates)

      return c.json({
        success: true,
        data: updatedClassroom,
        message: '教室情報を更新しました',
      })
    } catch (error) {
      console.error('❌ 教室更新エラー:', error)
      return c.json(
        {
          success: false,
          message: error instanceof Error ? error.message : '教室の更新に失敗しました',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        error instanceof Error && error.message === 'Classroom not found' ? 404 : 500
      )
    }
  }

  async deleteClassroom(c: Context<{ Bindings: Env }>) {
    try {
      const classroomId = c.req.param('id')
      const schoolService = this.getSchoolService(c)

      await schoolService.deleteClassroom(classroomId)

      return c.json({
        success: true,
        message: '教室を削除しました',
      })
    } catch (error) {
      console.error('❌ 教室削除エラー:', error)
      return c.json(
        {
          success: false,
          message: error instanceof Error ? error.message : '教室の削除に失敗しました',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        error instanceof Error && error.message === 'Classroom not found' ? 404 : 500
      )
    }
  }

  // 教師-教科関連付け
  async createTeacherSubjectRelation(c: Context<{ Bindings: Env }>) {
    try {
      const relationData = await c.req.json()
      const schoolService = this.getSchoolService(c)

      await schoolService.createTeacherSubjectRelation(relationData)

      return c.json({
        success: true,
        message: '教師-教科関連付けを作成しました',
      })
    } catch (error) {
      console.error('❌ 教師-教科関連付け作成エラー:', error)
      return c.json(
        {
          success: false,
          message: '教師-教科関連付けの作成に失敗しました',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }

  async getTeacherSubjectRelations(c: Context<{ Bindings: Env }>) {
    try {
      const schoolService = this.getSchoolService(c)
      const relations = await schoolService.getTeacherSubjectRelations()

      return c.json({
        success: true,
        data: relations,
      })
    } catch (error) {
      console.error('❌ 教師-教科関連付け取得エラー:', error)
      return c.json(
        {
          success: false,
          message: '教師-教科関連付けの取得に失敗しました',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }

  // データ検証用
  async getValidationData(c: Context<{ Bindings: Env }>) {
    try {
      const schoolService = this.getSchoolService(c)
      const validationData = await schoolService.getValidationData()

      return c.json({
        success: true,
        data: validationData,
      })
    } catch (error) {
      console.error('❌ データ検証取得エラー:', error)
      return c.json(
        {
          success: false,
          message: 'データ検証の取得に失敗しました',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }

  // 条件設定取得
  async getConditions(c: Context<{ Bindings: Env }>) {
    try {
      const schoolService = this.getSchoolService(c)
      const conditions = await schoolService.getConditions()

      return c.json({
        success: true,
        data: { conditions: conditions || '{}' },
      })
    } catch (error) {
      console.error('❌ 条件設定取得エラー:', error)
      return c.json(
        {
          success: false,
          message: '条件設定の取得に失敗しました',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }

  // 条件設定更新
  async updateConditions(c: Context<{ Bindings: Env }>) {
    try {
      const body = await c.req.json()
      const { conditions } = body

      if (typeof conditions !== 'string') {
        return c.json(
          {
            success: false,
            message: '条件設定は文字列である必要があります',
          },
          400
        )
      }

      const schoolService = this.getSchoolService(c)
      const updatedConditions = await schoolService.updateConditions(conditions)

      return c.json({
        success: true,
        data: { conditions: updatedConditions },
        message: '条件設定を更新しました',
      })
    } catch (error) {
      console.error('❌ 条件設定更新エラー:', error)
      return c.json(
        {
          success: false,
          message: '条件設定の更新に失敗しました',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }
}
