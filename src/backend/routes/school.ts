import { Hono } from 'hono'
import type { Env } from '../../shared/types'
import { SchoolController } from '../controllers/schoolController'
import { TimetableController } from '../controllers/timetableController'
import {
  adminAuthMiddleware,
  clerkAuthMiddleware,
  readOnlyAuthMiddleware,
  securityHeadersMiddleware,
} from '../middleware/auth'
import { csrfProtection, rateLimit } from '../middleware/validation'

const schoolRoutes = new Hono<{ Bindings: Env }>()
const schoolController = new SchoolController()
const timetableController = new TimetableController()

// セキュリティミドルウェアを全ルートに適用
schoolRoutes.use('*', securityHeadersMiddleware)
schoolRoutes.use('*', rateLimit(100, 60000)) // 1分間に100リクエスト制限
schoolRoutes.use('*', csrfProtection())

// 学校設定
schoolRoutes.get('/settings', clerkAuthMiddleware, readOnlyAuthMiddleware, c =>
  schoolController.getSchoolSettings(c)
)

schoolRoutes.put('/settings', clerkAuthMiddleware, adminAuthMiddleware, c =>
  schoolController.updateSchoolSettings(c)
)

// 教師管理
schoolRoutes.get('/teachers', clerkAuthMiddleware, readOnlyAuthMiddleware, c =>
  schoolController.getAllTeachers(c)
)

schoolRoutes.post('/teachers', clerkAuthMiddleware, adminAuthMiddleware, c =>
  schoolController.createTeacher(c)
)

schoolRoutes.put('/teachers/:id', clerkAuthMiddleware, adminAuthMiddleware, c =>
  schoolController.updateTeacher(c)
)

schoolRoutes.delete('/teachers/:id', clerkAuthMiddleware, adminAuthMiddleware, c =>
  schoolController.deleteTeacher(c)
)

// 教科管理
schoolRoutes.get('/subjects', clerkAuthMiddleware, readOnlyAuthMiddleware, c =>
  schoolController.getAllSubjects(c)
)

schoolRoutes.post('/subjects', clerkAuthMiddleware, adminAuthMiddleware, c =>
  schoolController.createSubject(c)
)

schoolRoutes.put('/subjects/:id', clerkAuthMiddleware, adminAuthMiddleware, c =>
  schoolController.updateSubject(c)
)

schoolRoutes.delete('/subjects/:id', clerkAuthMiddleware, adminAuthMiddleware, c =>
  schoolController.deleteSubject(c)
)

// 教室管理
schoolRoutes.get('/classrooms', clerkAuthMiddleware, readOnlyAuthMiddleware, c =>
  schoolController.getAllClassrooms(c)
)

schoolRoutes.post('/classrooms', clerkAuthMiddleware, adminAuthMiddleware, c =>
  schoolController.createClassroom(c)
)

schoolRoutes.put('/classrooms/:id', clerkAuthMiddleware, adminAuthMiddleware, c =>
  schoolController.updateClassroom(c)
)

schoolRoutes.delete('/classrooms/:id', clerkAuthMiddleware, adminAuthMiddleware, c =>
  schoolController.deleteClassroom(c)
)

// 時間割管理
schoolRoutes.get('/timetables', clerkAuthMiddleware, readOnlyAuthMiddleware, c =>
  timetableController.getAllTimetables(c)
)

schoolRoutes.get('/timetables/:id', clerkAuthMiddleware, readOnlyAuthMiddleware, c =>
  timetableController.getTimetableById(c)
)

schoolRoutes.post('/timetables', clerkAuthMiddleware, adminAuthMiddleware, c =>
  timetableController.createTimetable(c)
)

schoolRoutes.put('/timetables/:id', clerkAuthMiddleware, adminAuthMiddleware, c =>
  timetableController.updateTimetable(c)
)

schoolRoutes.delete('/timetables/:id', clerkAuthMiddleware, adminAuthMiddleware, c =>
  timetableController.deleteTimetable(c)
)

schoolRoutes.post('/timetables/save', clerkAuthMiddleware, adminAuthMiddleware, c =>
  timetableController.saveTimetable(c)
)

// 教師-教科関連付け
schoolRoutes.post('/teacher-subjects', clerkAuthMiddleware, adminAuthMiddleware, c =>
  schoolController.createTeacherSubjectRelation(c)
)

schoolRoutes.get('/teacher-subjects', clerkAuthMiddleware, readOnlyAuthMiddleware, c =>
  schoolController.getTeacherSubjectRelations(c)
)

// データ検証用
schoolRoutes.get('/validation-data', clerkAuthMiddleware, readOnlyAuthMiddleware, c =>
  schoolController.getValidationData(c)
)

// 条件設定
schoolRoutes.get('/conditions', clerkAuthMiddleware, readOnlyAuthMiddleware, c =>
  schoolController.getConditions(c)
)

schoolRoutes.put('/conditions', clerkAuthMiddleware, adminAuthMiddleware, c =>
  schoolController.updateConditions(c)
)

// デバッグ用
schoolRoutes.get('/debug/timetables/:id', clerkAuthMiddleware, c =>
  timetableController.getTimetableDebugInfo(c)
)

export default schoolRoutes
