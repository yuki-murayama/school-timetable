/**
 * 統合データ取得API
 */

import type { Classroom, SchoolSettings, Subject, Teacher } from '../../../shared/types'
import { classroomApi } from './classroom'
import type { ApiOptions } from './client'
import { schoolApi } from './school'
import { subjectApi } from './subject'
import { teacherApi } from './teacher'

export const dashboardApi = {
  async getAllData(options?: ApiOptions): Promise<{
    settings: SchoolSettings
    teachers: Teacher[]
    subjects: Subject[]
    classrooms: Classroom[]
  }> {
    // 並列でデータを取得してネットワーク時間を短縮
    const [settings, teachers, subjects, classrooms] = await Promise.all([
      schoolApi.getSettings(options),
      teacherApi.getTeachers(options),
      subjectApi.getSubjects(options),
      classroomApi.getClassrooms(options),
    ])

    return { settings, teachers, subjects, classrooms }
  },
}
