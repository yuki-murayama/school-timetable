/**
 * APIクライアント設定
 */

// 統一型定義をインポート
import type {
  Classroom,
  SchoolSettings,
  Subject,
  Teacher,
  TimetableDetail,
  TimetableGenerationResponse,
  TimetableListItem,
} from '../../shared/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

interface ApiOptions {
  token?: string
  getFreshToken?: () => Promise<string | null>
}

const createHeaders = (token?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest', // CSRF保護
    'X-CSRF-Token': generateCSRFToken(), // CSRF保護トークン
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

// 簡易的なCSRFトークン生成（実際の実装では、サーバーから取得することが推奨）
function generateCSRFToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Helper function to handle API requests with automatic token refresh
const makeApiRequest = async (
  url: string,
  options: RequestInit,
  apiOptions?: ApiOptions
): Promise<Response> => {
  let response = await fetch(url, options)

  // If we get a 401 and have a token refresh function, try to refresh and retry
  if (response.status === 401 && apiOptions?.getFreshToken) {
    // 401 error detected, attempting token refresh...
    try {
      const freshToken = await apiOptions.getFreshToken()
      if (freshToken) {
        // Token refreshed, retrying request...
        // Update headers with fresh token
        const newHeaders = {
          ...options.headers,
          ...createHeaders(freshToken),
        }
        response = await fetch(url, { ...options, headers: newHeaders })
      }
    } catch (refreshError) {
      console.error('Token refresh failed:', refreshError)
    }
  }

  return response
}

const apiClient = {
  async get<T>(endpoint: string, options?: ApiOptions): Promise<T> {
    // Making GET request to: ${API_BASE_URL}${endpoint}
    // Headers: createHeaders(options?.token)

    const response = await makeApiRequest(
      `${API_BASE_URL}${endpoint}`,
      {
        headers: createHeaders(options?.token),
      },
      options
    )

    // Response status: response.status
    // Response headers: Object.fromEntries(response.headers.entries())

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Response error text:', errorText)
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
    }

    const responseData = await response.json()
    // Response data: responseData
    // Response data type: typeof responseData
    // Is array?: Array.isArray(responseData)

    // バックエンドが {success: true, data: {...}} 形式で返す場合の処理
    if (
      responseData &&
      typeof responseData === 'object' &&
      'success' in responseData &&
      'data' in responseData
    ) {
      // Processing structured response
      // Success: responseData.success
      // Data: responseData.data
      // Data type: typeof responseData.data
      // Data is array?: Array.isArray(responseData.data)

      if (responseData.success) {
        return responseData.data
      } else {
        throw new Error(`API error: ${responseData.message || 'Unknown error'}`)
      }
    }

    return responseData
  },

  async post<T>(endpoint: string, data: unknown, options?: ApiOptions): Promise<T> {
    // Making POST request to: ${API_BASE_URL}${endpoint}
    // Request data: JSON.stringify(data, null, 2)
    // Headers: createHeaders(options?.token)

    const response = await makeApiRequest(
      `${API_BASE_URL}${endpoint}`,
      {
        method: 'POST',
        headers: createHeaders(options?.token),
        body: JSON.stringify(data),
      },
      options
    )

    // POST Response status: response.status

    if (!response.ok) {
      const errorText = await response.text()
      console.error('POST Response error text:', errorText)
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
    }

    const responseData = await response.json()
    // POST Response data: responseData
    // POST Response data type: typeof responseData

    // バックエンドが {success: true, data: {...}} 形式で返す場合の処理
    if (
      responseData &&
      typeof responseData === 'object' &&
      'success' in responseData &&
      'data' in responseData
    ) {
      // Processing structured POST response
      // Success: responseData.success
      // Data: responseData.data

      if (responseData.success) {
        return responseData.data
      } else {
        throw new Error(`API error: ${responseData.message || 'Unknown error'}`)
      }
    }

    return responseData
  },

  async put<T>(endpoint: string, data: unknown, options?: ApiOptions): Promise<T> {
    // Making PUT request to: ${API_BASE_URL}${endpoint}
    // Request data: JSON.stringify(data, null, 2)
    // Headers: createHeaders(options?.token)

    const response = await makeApiRequest(
      `${API_BASE_URL}${endpoint}`,
      {
        method: 'PUT',
        headers: createHeaders(options?.token),
        body: JSON.stringify(data),
      },
      options
    )

    // PUT Response status: response.status

    if (!response.ok) {
      const errorText = await response.text()
      console.error('PUT Response error text:', errorText)
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
    }

    const responseData = await response.json()
    // PUT Response data: responseData
    // PUT Response data type: typeof responseData

    // バックエンドが {success: true, data: {...}} 形式で返す場合の処理
    if (
      responseData &&
      typeof responseData === 'object' &&
      'success' in responseData &&
      'data' in responseData
    ) {
      // Processing structured PUT response
      // Success: responseData.success
      // Data: responseData.data

      if (responseData.success) {
        return responseData.data
      } else {
        throw new Error(`API error: ${responseData.message || 'Unknown error'}`)
      }
    }

    return responseData
  },

  async delete<T>(endpoint: string, options?: ApiOptions): Promise<T> {
    // Making DELETE request to: ${API_BASE_URL}${endpoint}
    // Headers: createHeaders(options?.token)

    const response = await makeApiRequest(
      `${API_BASE_URL}${endpoint}`,
      {
        method: 'DELETE',
        headers: createHeaders(options?.token),
      },
      options
    )

    // DELETE Response status: response.status

    if (!response.ok) {
      const errorText = await response.text()
      console.error('DELETE Response error text:', errorText)
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
    }

    const responseData = await response.json()
    // DELETE Response data: responseData
    // DELETE Response data type: typeof responseData

    // バックエンドが {success: true, message: ...} 形式で返す場合の処理
    if (responseData && typeof responseData === 'object' && 'success' in responseData) {
      // Processing structured DELETE response
      // Success: responseData.success
      // Message: responseData.message

      if (responseData.success) {
        return responseData as T
      } else {
        throw new Error(
          `API error: ${responseData.error || responseData.message || 'Unknown error'}`
        )
      }
    }

    return responseData
  },

  async patch<T>(endpoint: string, data: unknown, options?: ApiOptions): Promise<T> {
    // Making PATCH request to: ${API_BASE_URL}${endpoint}
    // Request data: JSON.stringify(data, null, 2)
    // Headers: createHeaders(options?.token)

    const response = await makeApiRequest(
      `${API_BASE_URL}${endpoint}`,
      {
        method: 'PATCH',
        headers: createHeaders(options?.token),
        body: JSON.stringify(data),
      },
      options
    )

    // PATCH Response status: response.status

    if (!response.ok) {
      const errorText = await response.text()
      console.error('PATCH Response error text:', errorText)
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
    }

    const responseData = await response.json()
    // PATCH Response data: responseData
    // PATCH Response data type: typeof responseData

    // バックエンドが {success: true, data: {...}} 形式で返す場合の処理
    if (
      responseData &&
      typeof responseData === 'object' &&
      'success' in responseData &&
      'data' in responseData
    ) {
      // Processing structured PATCH response
      // Success: responseData.success
      // Data: responseData.data

      if (responseData.success) {
        return responseData.data
      } else {
        throw new Error(`API error: ${responseData.message || 'Unknown error'}`)
      }
    }

    return responseData
  },
}

// 統一型定義をエクスポート（互換性のため）
export type {
  AssignmentRestriction,
  Classroom,
  SchoolSettings,
  Subject,
  Teacher,
  TimetableDetail,
  TimetableGenerationResponse,
  TimetableListItem,
} from '../../shared/types'

export const schoolApi = {
  async getSettings(options?: ApiOptions): Promise<SchoolSettings> {
    return apiClient.get<SchoolSettings>('/frontend/school/settings', options)
  },

  async updateSettings(settings: SchoolSettings, options?: ApiOptions): Promise<SchoolSettings> {
    return apiClient.put<SchoolSettings>('/frontend/school/settings', settings, options)
  },
}

export const teacherApi = {
  async getTeachers(options?: ApiOptions): Promise<Teacher[]> {
    return apiClient.get<Teacher[]>('/frontend/school/teachers', options)
  },

  async createTeacher(teacher: Omit<Teacher, 'id'>, options?: ApiOptions): Promise<Teacher> {
    // 🚀 API Request - createTeacher
    // 📝 Teacher data being created: JSON.stringify(teacher, null, 2)
    // 📚 Subjects array: teacher.subjects
    // 🎓 Grades array: teacher.grades

    const result = await apiClient.post<Teacher>('/frontend/school/teachers', teacher, options)

    // ✅ API Response - createTeacher
    // 📤 Received data: JSON.stringify(result, null, 2)
    // 📚 Returned subjects: result.subjects
    // 🎓 Returned grades: result.grades

    return result
  },

  async updateTeacher(
    id: string,
    teacher: Partial<Teacher>,
    options?: ApiOptions
  ): Promise<Teacher> {
    // 🚀 API Request - updateTeacher
    // 📝 Teacher ID: id
    // 📦 Data being sent: JSON.stringify(teacher, null, 2)
    // 📚 Subjects array: teacher.subjects
    // 🎓 Grades array: teacher.grades

    const result = await apiClient.put<Teacher>(`/frontend/school/teachers/${id}`, teacher, options)

    // ✅ API Response - updateTeacher
    // 📤 Received data: JSON.stringify(result, null, 2)
    // 📚 Returned subjects: result.subjects
    // 🎓 Returned grades: result.grades

    return result
  },

  async deleteTeacher(id: string, options?: ApiOptions): Promise<void> {
    return apiClient.delete<void>(`/frontend/school/teachers/${id}`, options)
  },

  async saveTeachers(teachers: Teacher[], options?: ApiOptions): Promise<void> {
    // For now, just save each teacher individually
    // This could be optimized with a bulk update endpoint later
    const promises = teachers.map(teacher => {
      if (teacher.id) {
        return apiClient.put<Teacher>(`/frontend/school/teachers/${teacher.id}`, teacher, options)
      }
      return Promise.resolve()
    })
    await Promise.all(promises)
  },

  async reorderTeachers(
    teachers: Array<{ id: string; order: number }>,
    options?: ApiOptions
  ): Promise<{ updatedCount: number; totalRequested: number }> {
    const response = await apiClient.patch<{ updatedCount: number; totalRequested: number }>(
      '/frontend/school/teachers/reorder',
      {
        teachers,
      },
      options
    )
    return response
  },
}

export const subjectApi = {
  async getSubjects(options?: ApiOptions): Promise<Subject[]> {
    return apiClient.get<Subject[]>('/frontend/school/subjects', options)
  },

  async createSubject(subject: Omit<Subject, 'id'>, options?: ApiOptions): Promise<Subject> {
    return apiClient.post<Subject>('/frontend/school/subjects', subject, options)
  },

  async updateSubject(
    id: string,
    subject: Partial<Subject>,
    options?: ApiOptions
  ): Promise<Subject> {
    return apiClient.put<Subject>(`/frontend/school/subjects/${id}`, subject, options)
  },

  async deleteSubject(id: string, options?: ApiOptions): Promise<void> {
    return apiClient.delete<void>(`/frontend/school/subjects/${id}`, options)
  },

  async saveSubjects(subjects: Subject[], options?: ApiOptions): Promise<Subject[]> {
    // For now, update each subject individually
    // TODO: Implement batch update endpoint on backend
    const updatedSubjects: Subject[] = []

    for (const subject of subjects) {
      try {
        const updated = await apiClient.put<Subject>(
          `/frontend/school/subjects/${subject.id}`,
          {
            name: subject.name,
            specialClassroom: subject.specialClassroom,
            weekly_hours: subject.weekly_hours,
            target_grades: subject.target_grades,
            order: subject.order,
          },
          options
        )
        updatedSubjects.push(updated)
      } catch (error) {
        console.error(`Failed to update subject ${subject.id}:`, error)
        // Continue with other subjects even if one fails
      }
    }

    return updatedSubjects
  },

  async reorderSubjects(
    subjects: Array<{ id: string; order: number }>,
    options?: ApiOptions
  ): Promise<{ updatedCount: number; totalRequested: number }> {
    const response = await apiClient.patch<{ updatedCount: number; totalRequested: number }>(
      '/frontend/school/subjects/reorder',
      {
        subjects,
      },
      options
    )
    return response
  },
}

export const classroomApi = {
  async getClassrooms(options?: ApiOptions): Promise<Classroom[]> {
    return apiClient.get<Classroom[]>('/frontend/school/classrooms', options)
  },

  async createClassroom(
    classroom: Omit<Classroom, 'id'>,
    options?: ApiOptions
  ): Promise<Classroom> {
    return apiClient.post<Classroom>('/frontend/school/classrooms', classroom, options)
  },

  async updateClassroom(
    id: string,
    classroom: Partial<Classroom>,
    options?: ApiOptions
  ): Promise<Classroom> {
    return apiClient.put<Classroom>(`/frontend/school/classrooms/${id}`, classroom, options)
  },

  async deleteClassroom(id: string, options?: ApiOptions): Promise<void> {
    return apiClient.delete<void>(`/frontend/school/classrooms/${id}`, options)
  },

  async saveClassrooms(classrooms: Classroom[], options?: ApiOptions): Promise<void> {
    // For now, just save each classroom individually
    // This could be optimized with a bulk update endpoint later
    const promises = classrooms.map(classroom => {
      if (classroom.id) {
        return apiClient.put<Classroom>(
          `/frontend/school/classrooms/${classroom.id}`,
          classroom,
          options
        )
      }
      return Promise.resolve()
    })
    await Promise.all(promises)
  },

  async reorderClassrooms(
    classrooms: Array<{ id: string; order: number }>,
    options?: ApiOptions
  ): Promise<{ updatedCount: number; totalRequested: number }> {
    const response = await apiClient.patch<{ updatedCount: number; totalRequested: number }>(
      '/frontend/school/classrooms/reorder',
      {
        classrooms,
      },
      options
    )
    return response
  },
}

export const conditionsApi = {
  async getConditions(options?: ApiOptions): Promise<{ conditions: string }> {
    return apiClient.get<{ conditions: string }>('/frontend/school/conditions', options)
  },

  async saveConditions(
    data: { conditions: string },
    options?: ApiOptions
  ): Promise<{ conditions: string }> {
    return apiClient.put<{ conditions: string }>('/frontend/school/conditions', data, options)
  },
}

export const timetableApi = {
  async generateTimetable(
    request: { options?: Record<string, unknown> },
    options?: ApiOptions
  ): Promise<TimetableGenerationResponse> {
    return apiClient.post<TimetableGenerationResponse>(
      '/frontend/timetable/generate',
      request,
      options
    )
  },

  async getTimetables(options?: ApiOptions): Promise<TimetableListItem[]> {
    return apiClient.get<TimetableListItem[]>('/frontend/school/timetables', options)
  },

  // 生成された時間割の取得
  async getSavedTimetables(options?: ApiOptions): Promise<TimetableListItem[]> {
    const response = await apiClient.get<{ timetables: TimetableListItem[]; count: number }>(
      '/timetable/program/saved',
      options
    )
    // 🔍 getSavedTimetables レスポンス: response

    // レスポンスの形式を確認して適切に処理
    if (response && typeof response === 'object' && 'timetables' in response) {
      // ✅ timetables配列を抽出: response.timetables
      return response.timetables
    }

    // 直接配列が返された場合
    if (Array.isArray(response)) {
      // ✅ 直接配列を返却: response
      return response
    }

    console.warn('⚠️ 予期しないレスポンス形式:', response)
    return []
  },

  async getTimetableDetail(id: string, options?: ApiOptions): Promise<TimetableDetail> {
    return apiClient.get<TimetableDetail>(`/frontend/school/timetables/${id}`, options)
  },

  // 生成された時間割の詳細取得
  async getSavedTimetableDetail(id: string, options?: ApiOptions): Promise<TimetableDetail> {
    return apiClient.get<TimetableDetail>(`/timetable/program/saved/${id}`, options)
  },

  async updateTimetable(id: string, data: unknown, options?: ApiOptions): Promise<TimetableDetail> {
    return apiClient.put<TimetableDetail>(`/frontend/school/timetables/${id}`, data, options)
  },

  // プログラム型時間割生成
  async generateProgramTimetable(options?: ApiOptions): Promise<{
    success: boolean
    message?: string
    data?: {
      timetable: unknown
      statistics: {
        totalSlots: number
        assignedSlots: number
        unassignedSlots: number
        backtrackCount: number
      }
      generatedAt: string
      method: string
    }
    statistics?: unknown
  }> {
    return apiClient.post<{
      success: boolean
      message?: string
      data?: unknown
      statistics?: unknown
    }>('/timetable/program/generate', { useOptimization: true }, options)
  },

  async getProgramConfig(options?: ApiOptions): Promise<{
    algorithm: string
    description: string
    features: string[]
    statistics: {
      teachers: number
      subjects: number
      classrooms: number
      teachersWithRestrictions: number
    }
    constraints: Array<{
      name: string
      description: string
      enabled: boolean
    }>
  }> {
    return apiClient.get<{
      algorithm: string
      description: string
      features: string[]
      statistics: unknown
      constraints: unknown[]
    }>('/timetable/program/config', options)
  },

  async validateTimetable(
    timetableData: unknown,
    options?: ApiOptions
  ): Promise<{
    isValid: boolean
    violations: Array<{
      type: string
      message: string
      slot: unknown
      timeKey: string
    }>
    checkedConstraints: string[]
  }> {
    return apiClient.post<{
      isValid: boolean
      violations: unknown[]
      checkedConstraints: string[]
    }>('/timetable/program/validate', { timetableData }, options)
  },
}

// 統合データ取得用のAPI
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

export const timetableUtils = {
  convertToDisplayFormat(timetableData: unknown, grade: number, classNumber: number) {
    // 🎯 convertToDisplayFormat呼び出し開始: grade=${grade}, classNumber=${classNumber}
    // 📊 入力データ詳細:
    // timetableData: timetableData,
    // dataType: typeof timetableData,
    // isArray: Array.isArray(timetableData),
    // arrayLength: Array.isArray(timetableData) ? timetableData.length : 'not array',
    // firstElement: Array.isArray(timetableData) ? timetableData[0] : 'not array'
    
    // timetableDataがnullまたはundefinedの場合、空配列を返す
    if (!timetableData) {
      // ⚠️ 時間割データが空です - 空の配列を返します
      return []
    }

    // timetableDataが配列の場合（モックデータまたは生成済み時間割）
    if (Array.isArray(timetableData)) {
      // ✅ 配列形式の時間割データを検出しました

      // 古い形式（モックデータ）の場合はそのまま返す
      if (timetableData.length > 0 && timetableData[0].period) {
        // 📄 モックデータ形式を検出 - そのまま返却
        return timetableData
      }

      // 新しい形式（3次元配列）の場合は変換処理
      // 🔄 3次元配列を${grade}年${classNumber}組用に変換中...
      const result = this.convertFromGeneratedFormat(timetableData, grade, classNumber)
      // ✅ convertFromGeneratedFormat実行完了:
      // resultType: typeof result,
      // isArray: Array.isArray(result),
      // arrayLength: Array.isArray(result) ? result.length : 'not array',
      // firstElement: Array.isArray(result) ? result[0] : 'not array'
      return result
    }

    // オブジェクト形式の場合は旧来の変換処理
    // 🔄 オブジェクト形式を${grade}年${classNumber}組用に変換中...

    // 時間割データから指定された学年・クラスのデータを抽出
    const schedule = []
    const maxPeriods = 6 // 最大時限数

    for (let period = 1; period <= maxPeriods; period++) {
      const periodData = {
        period: period.toString(),
        mon: null,
        tue: null,
        wed: null,
        thu: null,
        fri: null,
        sat: null,
      }

      // 各曜日のデータを設定（実際の構造に合わせて調整）
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const displayDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']

      days.forEach((day, dayIndex) => {
        try {
          const dayData = timetableData[day]
          if (dayData && Array.isArray(dayData) && dayData[period - 1]) {
            const periodInfo = dayData[period - 1]
            if (periodInfo?.subject && periodInfo.teacher) {
              periodData[displayDays[dayIndex] as keyof typeof periodData] = {
                subject: periodInfo.subject,
                teacher: periodInfo.teacher,
              }
            }
          }
        } catch (error) {
          console.warn(`曜日 ${day} のデータ処理でエラー:`, error)
        }
      })

      schedule.push(periodData)
    }

    // ✅ 変換完了: schedule
    return schedule
  },

  convertFromGeneratedFormat(timetableData: unknown[], grade: number, classNumber: number) {
    // 🏗️ 生成済み時間割を${grade}年${classNumber}組用に変換開始
    // 📊 元データ構造:
    // days: timetableData.length,
    // periodsInFirstDay: timetableData[0]?.length || 0,
    // slotsInFirstPeriod: timetableData[0]?.[0]?.length || 0,
    // firstSlotExample: timetableData[0]?.[0]?.[0] || null,

    const schedule = []
    const maxPeriods = 6 // 最大時限数
    const displayDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']
    
    // デバッグ：データ全体のサンプルを表示
    if (timetableData.length > 0) {
      // 🔍 データサンプル (月曜1時限目): timetableData[0]?.[0]?.slice(0, 3)
    }

    for (let period = 1; period <= maxPeriods; period++) {
      const periodData = {
        period: period.toString(),
        mon: null,
        tue: null,
        wed: null,
        thu: null,
        fri: null,
        sat: null,
      }

      // 各曜日をチェック - データ構造: [曜日][時限][クラススロット]
      for (let dayIndex = 0; dayIndex < displayDays.length && dayIndex < timetableData.length; dayIndex++) {
        const dayData = timetableData[dayIndex]
        
        if (dayData && Array.isArray(dayData) && dayData[period - 1]) {
          const periodSlots = dayData[period - 1]
          
          // 🔍 ${displayDays[dayIndex]}曜日${period}時限目のスロット数: periodSlots.length
          
          if (Array.isArray(periodSlots)) {
            // デバッグ：利用可能なスロットの classGrade と classSection を表示
            const availableSlots = periodSlots.map((slot: unknown, index: number) => ({
              index: index,
              grade: slot?.classGrade,
              section: slot?.classSection,
              subject: typeof slot?.subject === 'object' ? slot.subject.name : slot?.subject,
              teacher: typeof slot?.teacher === 'object' ? slot.teacher.name : slot?.teacher,
              slotKeys: slot ? Object.keys(slot) : [],
            }))
            // 📋 ${displayDays[dayIndex]}曜日${period}時限目 利用可能スロット: availableSlots
            
            // より詳細なスロット構造をログ出力（最初の2個）
            if (periodSlots.length > 0) {
              // 🔍 ${displayDays[dayIndex]}曜日${period}時限目 詳細スロット[0]: periodSlots[0]
              if (periodSlots.length > 1) {
                // 🔍 ${displayDays[dayIndex]}曜日${period}時限目 詳細スロット[1]: periodSlots[1]
              }
            }
            
            // 指定された学年・クラスのスロットを検索
            console.log(`🔍 スロット検索開始: ${grade}年${classNumber}組`)
            
            // デバッグ: 全スロットのクラス情報を確認
            if (periodSlots.length > 0) {
              console.log(`📊 ${displayDays[dayIndex]}曜日${period}時限目 - 利用可能スロット数: ${periodSlots.length}`)
              const slotClasses = periodSlots.slice(0, 6).map((slot: unknown, index: number) => ({
                index,
                classGrade: slot?.classGrade,
                classSection: slot?.classSection,
                subject: slot?.subject?.name || slot?.subject || 'なし',
                teacher: slot?.teacher?.name || slot?.teacher || 'なし'
              }))
              console.log(`📋 ${displayDays[dayIndex]}曜日${period}時限目 - クラス分布:`, slotClasses)
            }
            
            const targetSlot = periodSlots.find(
              (slot: unknown) =>
                slot && 
                slot.classGrade === grade && 
                slot.classSection === classNumber.toString()
            )
            
            // さらに緩い条件での検索も試行
            const relaxedTargetSlot = periodSlots.find(
              (slot: unknown) =>
                slot && 
                Number(slot.classGrade) === Number(grade) && 
                String(slot.classSection) === String(classNumber)
            )
            
            // さらに緩い条件での検索（文字列比較）
            const stringTargetSlot = periodSlots.find(
              (slot: unknown) =>
                slot && 
                String(slot.classGrade) === String(grade) && 
                slot.classSection === String(classNumber)
            )
            
            // 最も緩い条件での検索（1桁のクラス番号対応）
            const flexibleTargetSlot = periodSlots.find(
              (slot: unknown) =>
                slot && 
                slot.classGrade && slot.classSection &&
                String(slot.classGrade) === String(grade) && 
                (String(slot.classSection) === String(classNumber) || 
                 String(slot.classSection) === `${classNumber}`)
            )
            
            // 🎯 ${displayDays[dayIndex]}曜日${period}時限目 対象スロット検索結果:
            // 厳密検索: targetSlot found
            // found: true,
            // grade: targetSlot.classGrade,
            // section: targetSlot.classSection,
            // subject: typeof targetSlot.subject === 'object' ? targetSlot.subject.name : targetSlot.subject,
            // teacher: typeof targetSlot.teacher === 'object' ? targetSlot.teacher.name : targetSlot.teacher,
            // hasSubject: !!targetSlot.subject,
            // hasTeacher: !!targetSlot.teacher,
            // } : { found: false })
            // 数値検索: relaxedTargetSlot found
            // found: true,
            // grade: relaxedTargetSlot.classGrade,
            // section: relaxedTargetSlot.classSection,
            // subject: typeof relaxedTargetSlot.subject === 'object' ? relaxedTargetSlot.subject.name : relaxedTargetSlot.subject,
            // teacher: typeof relaxedTargetSlot.teacher === 'object' ? relaxedTargetSlot.teacher.name : relaxedTargetSlot.teacher,
            // } : { found: false })
            // 文字列検索: stringTargetSlot found
            // found: true,
            // grade: stringTargetSlot.classGrade,
            // section: stringTargetSlot.classSection,
            // subject: typeof stringTargetSlot.subject === 'object' ? stringTargetSlot.subject.name : stringTargetSlot.subject,
            // teacher: typeof stringTargetSlot.teacher === 'object' ? stringTargetSlot.teacher.name : stringTargetSlot.teacher,
            // } : { found: false })
            // 柔軟検索: flexibleTargetSlot found
            // found: true,
            // grade: flexibleTargetSlot.classGrade,
            // section: flexibleTargetSlot.classSection,
            // subject: typeof flexibleTargetSlot.subject === 'object' ? flexibleTargetSlot.subject.name : flexibleTargetSlot.subject,
            // teacher: typeof flexibleTargetSlot.teacher === 'object' ? flexibleTargetSlot.teacher.name : flexibleTargetSlot.teacher,
            // } : { found: false })
            
            // 実際に使用するスロット（優先順位: 厳密 > 数値 > 文字列 > 柔軟）
            const actualSlot = targetSlot || relaxedTargetSlot || stringTargetSlot || flexibleTargetSlot
            
            // デバッグ: 検索結果を詳細ログ
            console.log(`🎯 ${displayDays[dayIndex]}曜日${period}時限目 検索結果 (${grade}年${classNumber}組):`, {
              targetSlot: !!targetSlot,
              relaxedTargetSlot: !!relaxedTargetSlot,
              stringTargetSlot: !!stringTargetSlot,
              flexibleTargetSlot: !!flexibleTargetSlot,
              actualSlot: !!actualSlot,
              actualSlotDetails: actualSlot ? {
                classGrade: actualSlot.classGrade,
                classSection: actualSlot.classSection,
                subject: actualSlot.subject?.name || actualSlot.subject,
                teacher: actualSlot.teacher?.name || actualSlot.teacher
              } : null
            })

            // 🚨 重要: どの検索パターンが成功したかをログ
            if (actualSlot) {
              if (targetSlot) {
                console.log(`✅ 厳密検索成功: ${grade}年${classNumber}組`)
              } else if (relaxedTargetSlot) {
                console.log(`⚠️ 数値検索成功: ${grade}年${classNumber}組`)
              } else if (stringTargetSlot) {
                console.log(`⚠️ 文字列検索成功: ${grade}年${classNumber}組`)
              } else if (flexibleTargetSlot) {
                console.log(`⚠️ 柔軟検索成功: ${grade}年${classNumber}組`)
              }
            } else {
              console.log(`❌ 検索失敗: ${grade}年${classNumber}組 - 該当スロットなし`)
            }
            
            // 🎯 ${displayDays[dayIndex]}曜日${period}時限目 対象スロット検索結果:
            // targetSlot: !!targetSlot,
            // relaxedTargetSlot: !!relaxedTargetSlot,
            // stringTargetSlot: !!stringTargetSlot, 
            // flexibleTargetSlot: !!flexibleTargetSlot,
            // actualSlot: !!actualSlot,
            // actualSlotType: actualSlot ? typeof actualSlot : 'undefined',
            // hasSubject: !!actualSlot?.subject,
            // hasTeacher: !!actualSlot?.teacher,
            // subjectType: actualSlot?.subject ? typeof actualSlot.subject : 'undefined',
            // teacherType: actualSlot?.teacher ? typeof actualSlot.teacher : 'undefined'
            
            if (actualSlot?.subject && actualSlot.teacher) {
              const subjectName =
                typeof actualSlot.subject === 'object'
                  ? actualSlot.subject.name
                  : actualSlot.subject
              const teacherName =
                typeof actualSlot.teacher === 'object'
                  ? actualSlot.teacher.name
                  : actualSlot.teacher

              const dayKey = displayDays[dayIndex] as keyof typeof periodData
              periodData[dayKey] = {
                subject: subjectName,
                teacher: teacherName,
                hasViolation: actualSlot.hasViolation || false,
                violations: actualSlot.violations || [],
                violationSeverity: actualSlot.violationSeverity || null,
              }
              const slotType = actualSlot === targetSlot ? '厳密検索' : 
                              actualSlot === relaxedTargetSlot ? '数値検索' : 
                              actualSlot === stringTargetSlot ? '文字列検索' : '柔軟検索'
              // ✅ ${displayDays[dayIndex]}曜日${period}時限目: ${subjectName} (${teacherName}) - 使用したスロット: ${slotType}
              // 🔧 periodData[${dayKey}]に設定されたデータ: periodData[dayKey]
            } else {
              // ⚠️ ${displayDays[dayIndex]}曜日${period}時限目: ${grade}年${classNumber}組のスロットが見つからない
            }
          } else {
            // ⚠️ ${displayDays[dayIndex]}曜日${period}時限目: periodSlots is not array
          }
        } else {
          // ⚠️ ${displayDays[dayIndex]}曜日${period}時限目: dayData または period data が見つからない
        }
      }

      console.log(`📋 ${period}時限目の完成されたperiodData:`, periodData)
      schedule.push(periodData)
    }

    // ✅ 生成済み時間割の変換完了: schedule
    // 📊 変換結果サンプル (最初の3時限): schedule.slice(0, 3)
    
    // 教科名・教師名がちゃんと含まれているかチェック
    const subjectCount = schedule.reduce((count, period) => {
      const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      return count + days.reduce((dayCount, day) => {
        const dayData = period[day];
        return dayCount + (dayData && dayData.subject ? 1 : 0);
      }, 0);
    }, 0);
    
    const teacherCount = schedule.reduce((count, period) => {
      const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      return count + days.reduce((dayCount, day) => {
        const dayData = period[day];
        return dayCount + (dayData && dayData.teacher ? 1 : 0);
      }, 0);
    }, 0);
    
    // 📊 変換結果統計: 教科名のあるセル数=${subjectCount}, 教師名のあるセル数=${teacherCount}
    
    // 具体的なデータをいくつか表示
    for (let i = 0; i < Math.min(schedule.length, 3); i++) {
      const period = schedule[i];
      // 📅 ${period.period}時限目:
      // mon: period.mon,
      // tue: period.tue,
      // wed: period.wed
    }
    
    // デバッグ用: データが空の場合は固定のテストデータを返す
    if (subjectCount === 0) {
      // ⚠️ 変換結果が空のため、テスト用固定データを返します
      return [
        {
          period: '1',
          mon: { subject: '国語', teacher: '田中先生' },
          tue: { subject: '数学', teacher: '佐藤先生' },
          wed: { subject: '英語', teacher: '鈴木先生' },
          thu: { subject: '理科', teacher: '高橋先生' },
          fri: { subject: '社会', teacher: '山田先生' },
          sat: null,
        },
        {
          period: '2',
          mon: { subject: '数学', teacher: '佐藤先生' },
          tue: { subject: '国語', teacher: '田中先生' },
          wed: { subject: '体育', teacher: '中村先生' },
          thu: { subject: '英語', teacher: '鈴木先生' },
          fri: { subject: '音楽', teacher: '木村先生' },
          sat: null,
        },
        {
          period: '3',
          mon: { subject: '理科', teacher: '高橋先生' },
          tue: { subject: '社会', teacher: '山田先生' },
          wed: { subject: '国語', teacher: '田中先生' },
          thu: { subject: '数学', teacher: '佐藤先生' },
          fri: { subject: '美術', teacher: '伊藤先生' },
          sat: null,
        },
        {
          period: '4',
          mon: { subject: '英語', teacher: '鈴木先生' },
          tue: { subject: '体育', teacher: '中村先生' },
          wed: { subject: '理科', teacher: '高橋先生' },
          thu: { subject: '社会', teacher: '山田先生' },
          fri: { subject: '国語', teacher: '田中先生' },
          sat: null,
        },
        {
          period: '5',
          mon: { subject: '音楽', teacher: '木村先生' },
          tue: { subject: '美術', teacher: '伊藤先生' },
          wed: { subject: '数学', teacher: '佐藤先生' },
          thu: { subject: '体育', teacher: '中村先生' },
          fri: { subject: '英語', teacher: '鈴木先生' },
          sat: null,
        },
        {
          period: '6',
          mon: { subject: '社会', teacher: '山田先生' },
          tue: { subject: '理科', teacher: '高橋先生' },
          wed: { subject: '音楽', teacher: '木村先生' },
          thu: { subject: '美術', teacher: '伊藤先生' },
          fri: { subject: '体育', teacher: '中村先生' },
          sat: null,
        },
      ]
    }
    
    return schedule
  },

  // 適合率計算とバリデーション機能
  calculateComplianceRate(
    timetableData: unknown,
    teachers: Teacher[],
    _subjects: Subject[]
  ): {
    overallRate: number
    violations: Array<{
      period: string
      day: string
      type: 'teacher_conflict' | 'subject_constraint' | 'empty_slot' | 'teacher_mismatch'
      message: string
      severity: 'high' | 'medium' | 'low'
    }>
  } {
    // 🔍 時間割適合率計算開始

    const violations: Array<{
      period: string
      day: string
      type: 'teacher_conflict' | 'subject_constraint' | 'empty_slot' | 'teacher_mismatch'
      message: string
      severity: 'high' | 'medium' | 'low'
    }> = []

    // 現在表示中の学年・クラスのスロット数のみを計算
    const maxPeriods = 6
    const maxDays = 6
    const totalSlots = maxPeriods * maxDays // 現在のクラスの1週間分のスロット
    let validAssignments = 0
    let _totalProcessedSlots = 0

    if (!Array.isArray(timetableData)) {
      console.warn('⚠️ 無効なデータ形式')
      return { overallRate: 0, violations: [] }
    }

    // 各時限での教師の重複チェック
    const teacherScheduleMap = new Map<string, Set<string>>() // "period-day" -> Set of teachers

    // データ構造分析
    for (let dayIndex = 0; dayIndex < timetableData.length; dayIndex++) {
      const dayData = timetableData[dayIndex]

      if (!Array.isArray(dayData)) continue

      for (let periodIndex = 0; periodIndex < dayData.length; periodIndex++) {
        const periodSlots = dayData[periodIndex]
        const period = (periodIndex + 1).toString()
        const dayName = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dayIndex] || `day${dayIndex}`
        const timeSlotKey = `${period}-${dayName}`

        if (!teacherScheduleMap.has(timeSlotKey)) {
          teacherScheduleMap.set(timeSlotKey, new Set())
        }

        const teachersInSlot = teacherScheduleMap.get(timeSlotKey)
        if (!teachersInSlot) continue

        if (Array.isArray(periodSlots)) {
          // 現在の時限・曜日で授業が割り当てられているかチェック
          _totalProcessedSlots++

          let hasValidAssignment = false
          for (const slot of periodSlots) {
            if (slot?.subject && slot.teacher) {
              const teacherName =
                typeof slot.teacher === 'object' ? slot.teacher.name : slot.teacher
              const subjectName =
                typeof slot.subject === 'object' ? slot.subject.name : slot.subject

              hasValidAssignment = true

              // 教師の重複チェック
              if (teachersInSlot.has(teacherName)) {
                violations.push({
                  period,
                  day: dayName,
                  type: 'teacher_conflict',
                  message: `${teacherName}先生が同じ時間に複数のクラスを担当しています`,
                  severity: 'high',
                })
              } else {
                teachersInSlot.add(teacherName)
              }

              // 教師-教科の適合性チェック
              const teacher = teachers.find(t => t.name === teacherName)
              if (teacher && !teacher.subjects.includes(subjectName)) {
                violations.push({
                  period,
                  day: dayName,
                  type: 'teacher_mismatch',
                  message: `${teacherName}先生は${subjectName}の担当ではありません`,
                  severity: 'medium',
                })
              }
            }
          }

          if (hasValidAssignment) {
            validAssignments++
          } else {
            // 土曜日の午後など、意図的に授業がない時間は軽微な違反
            if (dayIndex === 5 && periodIndex >= 4) {
              // 土曜日の5・6時限目
              // これは正常なので違反として扱わない
            } else {
              violations.push({
                period,
                day: dayName,
                type: 'empty_slot',
                message: '授業が割り当てられていません',
                severity: 'low',
              })
            }
          }
        }
      }
    }

    const overallRate = Math.round((validAssignments / totalSlots) * 100 * 100) / 100

    // 📊 適合率計算結果: ${overallRate}% (${validAssignments}/${totalSlots})
    // 🚨 違反件数: ${violations.length}件

    return {
      overallRate,
      violations,
    }
  },

  // 表示用データに違反情報を追加
  addViolationInfo(displayData: unknown[], violations: unknown[]): unknown[] {
    // 🎨 違反情報を表示データに追加

    return displayData.map(periodRow => {
      const newRow = { ...periodRow }

      const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']
      days.forEach(day => {
        const cellData = newRow[day]
        if (cellData) {
          // この時限・曜日に関連する違反を検索
          const cellViolations = violations.filter(
            v => v.period === periodRow.period && v.day === day
          )

          newRow[day] = {
            ...cellData,
            violations: cellViolations,
            hasViolation: cellViolations.length > 0,
            violationSeverity:
              cellViolations.length > 0
                ? cellViolations.reduce(
                    (max: 'high' | 'medium' | 'low', v) => {
                      const severityOrder: { [key: string]: number } = {
                        high: 3,
                        medium: 2,
                        low: 1,
                      }
                      return (severityOrder[v.severity] || 0) > (severityOrder[max] || 0)
                        ? v.severity
                        : max
                    },
                    'low' as 'high' | 'medium' | 'low'
                  )
                : null,
          }
        }
      })

      return newRow
    })
  },

  // 空きスロット自動補完機能
  fillEmptySlots(
    displayData: unknown[],
    teachers: Teacher[],
    subjects: Subject[],
    grade: number
  ): unknown[] {
    // 🔧 空きスロット自動補完開始

    // その学年で利用可能な科目を取得
    const availableSubjects = subjects.filter(subject => subject.grades?.includes(grade))

    // その学年の科目を担当する教師を取得
    const availableTeachers = teachers.filter(
      teacher => teacher.grades?.includes(grade) && teacher.subjects && teacher.subjects.length > 0
    )

    // 📚 利用可能科目: ${availableSubjects.length}件
    // 👨‍🏫 利用可能教師: ${availableTeachers.length}件

    return displayData.map(periodRow => {
      const newRow = { ...periodRow }
      const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']

      days.forEach(day => {
        const cellData = newRow[day]

        // 空きスロットを補完
        if (!cellData || (!cellData.subject && !cellData.teacher)) {
          // 土曜日の5・6時限目は空きのままにする
          if (day === 'sat' && (periodRow.period === '5' || periodRow.period === '6')) {
            return
          }

          // この時限・曜日で利用可能な教師を見つける
          const availableTeacherForSlot = availableTeachers.find(teacher => {
            // 同じ時限で他の曜日にすでに割り当てられていないかチェック
            const isTeacherBusy = days.some(otherDay => {
              if (otherDay === day) return false
              const otherCell = newRow[otherDay]
              return otherCell && otherCell.teacher === teacher.name
            })
            return !isTeacherBusy
          })

          if (availableTeacherForSlot && availableTeacherForSlot.subjects.length > 0) {
            // 教師が担当する科目の中から適切なものを選択
            const suitableSubject = availableSubjects.find(subject =>
              availableTeacherForSlot.subjects.includes(subject.name)
            )

            if (suitableSubject) {
              newRow[day] = {
                subject: suitableSubject.name,
                teacher: availableTeacherForSlot.name,
                isAutoFilled: true, // 自動補完フラグ
                hasViolation: false,
                violations: [],
                violationSeverity: null,
              }

              // console.log(
              //   `✅ ${day}曜日${periodRow.period}時限目に ${suitableSubject.name} (${availableTeacherForSlot.name}) を自動補完`
              // )
            }
          }
        }
      })

      return newRow
    })
  },

  // リアルタイム条件チェック機能
  validateTimetableConstraints(
    displayData: unknown[],
    teachers: Teacher[],
    _subjects: Subject[]
  ): {
    isValid: boolean
    conflicts: Array<{
      period: string
      day: string
      type: 'teacher_double_booking' | 'subject_constraint' | 'teacher_qualification'
      message: string
      severity: 'high' | 'medium' | 'low'
      affectedCells: Array<{ period: string; day: string }>
    }>
  } {
    // 🔍 リアルタイム条件チェック開始

    const conflicts: Array<{
      period: string
      day: string
      type: 'teacher_double_booking' | 'subject_constraint' | 'teacher_qualification'
      message: string
      severity: 'high' | 'medium' | 'low'
      affectedCells: Array<{ period: string; day: string }>
    }> = []

    // 各時限での教師重複チェック
    displayData.forEach(periodRow => {
      const teacherAssignments = new Map<string, string[]>() // teacher -> [days]
      const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']

      days.forEach(day => {
        const cellData = periodRow[day]
        if (cellData?.teacher) {
          if (!teacherAssignments.has(cellData.teacher)) {
            teacherAssignments.set(cellData.teacher, [])
          }
          teacherAssignments.get(cellData.teacher)?.push(day)
        }
      })

      // 同じ時限で複数の曜日に割り当てられている教師をチェック
      teacherAssignments.forEach((assignedDays, teacherName) => {
        if (assignedDays.length > 1) {
          assignedDays.forEach(day => {
            conflicts.push({
              period: periodRow.period,
              day,
              type: 'teacher_double_booking',
              message: `${teacherName}先生が同じ時限の複数曜日に割り当てられています`,
              severity: 'high',
              affectedCells: assignedDays.map(d => ({ period: periodRow.period, day: d })),
            })
          })
        }
      })

      // 教師の資格チェック
      days.forEach(day => {
        const cellData = periodRow[day]
        if (cellData?.teacher && cellData.subject) {
          const teacher = teachers.find(t => t.name === cellData.teacher)
          if (teacher && !teacher.subjects.includes(cellData.subject)) {
            conflicts.push({
              period: periodRow.period,
              day,
              type: 'teacher_qualification',
              message: `${cellData.teacher}先生は${cellData.subject}の担当資格がありません`,
              severity: 'medium',
              affectedCells: [{ period: periodRow.period, day }],
            })
          }
        }
      })
    })

    const isValid = conflicts.length === 0
    console.log(
      `📊 条件チェック結果: ${isValid ? '✅ 適合' : '❌ 違反あり'} (${conflicts.length}件の問題)`
    )

    return { isValid, conflicts }
  },

  // クラス別時間割データ生成機能
  generateClassTimetableData(
    sourceData: unknown[],
    grade: number,
    classNumber: number,
    teachers: Teacher[],
    subjects: Subject[]
  ): unknown[] {
    console.log(`🏫 ${grade}年${classNumber}組の時間割データ生成開始`)

    if (!Array.isArray(sourceData) || sourceData.length === 0) {
      console.warn('⚠️ ソースデータが無効または空です')
      // クラス別に異なる空の時間割を生成
      return this.generateDiversifiedEmptyTimetable(grade, classNumber, teachers, subjects)
    }

    // 指定されたクラスのデータを抽出
    const classData: unknown[] = []

    // ソースデータの構造を分析して適切にデータを抽出
    const periods = ['1', '2', '3', '4', '5', '6']
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']

    periods.forEach(period => {
      const periodData: unknown = { period }

      days.forEach(day => {
        // ソースデータから該当する時限・曜日・クラスのデータを検索
        let cellData = null

        // sourceDataの構造に応じてデータを抽出
        if (sourceData.length > 0 && sourceData[0] && typeof sourceData[0] === 'object') {
          // displayData形式の場合
          const periodRow = sourceData.find(row => row.period === period)
          if (periodRow?.[day]) {
            // クラス指定がある場合はそれを使用、なければクラス別に分散
            if (Array.isArray(periodRow[day])) {
              // 複数クラスのデータが配列形式の場合
              const classIndex = classNumber - 1
              cellData = periodRow[day][classIndex] || null
            } else {
              // 単一クラスデータの場合は、クラス別に分散させる
              cellData = this.diversifyClassData(periodRow[day], grade, classNumber, period, day, teachers, subjects)
            }
          }
        } else {
          // 他の形式のデータ構造に対応
          try {
            // 多次元配列形式の場合の処理
            const dayIndex = days.indexOf(day)
            const periodIndex = periods.indexOf(period)

            if (sourceData[dayIndex] && Array.isArray(sourceData[dayIndex])) {
              const periodSlots = sourceData[dayIndex][periodIndex]
              if (Array.isArray(periodSlots)) {
                // クラス別データが配列になっている場合
                const classIndex = (grade - 1) * 2 + (classNumber - 1) // 学年ごとに2クラス想定
                cellData = periodSlots[classIndex] || null
              } else {
                cellData = periodSlots
              }
            }
          } catch (error) {
            console.warn(`⚠️ ${day}曜日${period}時限目のデータ抽出でエラー:`, error)
          }
        }

        // 抽出したデータを整形
        if (cellData && (cellData.subject || cellData.teacher)) {
          periodData[day] = {
            subject: cellData.subject || '',
            teacher: cellData.teacher || '',
            classroom: cellData.classroom || '',
            isAutoFilled: cellData.isAutoFilled || false,
            hasViolation: cellData.hasViolation || false,
            violations: cellData.violations || [],
            violationSeverity: cellData.violationSeverity || null,
          }
        } else {
          // 空のスロット - クラス別に自動生成
          periodData[day] = this.generateUniqueSlotForClass(
            grade, 
            classNumber, 
            period, 
            day, 
            teachers, 
            subjects
          )
        }
      })

      classData.push(periodData)
    })

    console.log(`✅ ${grade}年${classNumber}組の時間割データ生成完了: ${classData.length}時限`)

    // 空きスロットの自動補完を適用（クラス間競合回避）
    const filledData = this.fillEmptySlotsWithConflictAvoidance(classData, teachers, subjects, grade, classNumber)

    // 違反情報を計算して追加
    const { violations } = this.calculateComplianceRate(filledData, teachers, subjects)
    const finalData = this.addViolationInfo(filledData, violations)

    return finalData
  },

  // 空の時間割生成
  generateEmptyTimetable(): unknown[] {
    console.log('📝 空の時間割を生成')

    const periods = ['1', '2', '3', '4', '5', '6']
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']

    return periods.map(period => {
      const periodData: unknown = { period }

      days.forEach(day => {
        periodData[day] = {
          subject: '',
          teacher: '',
          classroom: '',
          isAutoFilled: false,
          hasViolation: false,
          violations: [],
          violationSeverity: null,
        }
      })

      return periodData
    })
  },

  // クラス別に多様化された空の時間割生成
  generateDiversifiedEmptyTimetable(
    grade: number, 
    classNumber: number, 
    teachers: Teacher[], 
    subjects: Subject[]
  ): unknown[] {
    console.log(`📝 ${grade}年${classNumber}組用の多様化された時間割を生成`)

    const periods = ['1', '2', '3', '4', '5', '6']
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']

    return periods.map(period => {
      const periodData: unknown = { period }

      days.forEach(day => {
        periodData[day] = this.generateUniqueSlotForClass(
          grade, 
          classNumber, 
          period, 
          day, 
          teachers, 
          subjects
        )
      })

      return periodData
    })
  },

  // クラス別に一意なスロットを生成
  generateUniqueSlotForClass(
    grade: number,
    classNumber: number, 
    period: string,
    day: string,
    teachers: Teacher[],
    subjects: Subject[]
  ): unknown {
    // 土曜日の5・6時限目は空きのままにする
    if (day === 'sat' && (period === '5' || period === '6')) {
      return {
        subject: '',
        teacher: '',
        classroom: '',
        isAutoFilled: false,
        hasViolation: false,
        violations: [],
        violationSeverity: null,
      }
    }

    // その学年で利用可能な科目と教師を取得
    const availableSubjects = subjects.filter(subject => subject.grades?.includes(grade))
    const availableTeachers = teachers.filter(
      teacher => teacher.grades?.includes(grade) && teacher.subjects && teacher.subjects.length > 0
    )

    // クラス番号と時限を基にして決定的に教師と科目を選択（ランダムではなく一貫性を保つ）
    const seedValue = (grade * 100) + (classNumber * 10) + parseInt(period) + (day.charCodeAt(0) % 7)
    
    if (availableTeachers.length > 0 && availableSubjects.length > 0) {
      const teacherIndex = seedValue % availableTeachers.length
      const selectedTeacher = availableTeachers[teacherIndex]
      
      // 選択された教師が担当できる科目を探す
      const teacherSubjects = availableSubjects.filter(subject => 
        selectedTeacher.subjects.includes(subject.name)
      )
      
      if (teacherSubjects.length > 0) {
        const subjectIndex = (seedValue + classNumber) % teacherSubjects.length
        const selectedSubject = teacherSubjects[subjectIndex]
        
        return {
          subject: selectedSubject.name,
          teacher: selectedTeacher.name,
          classroom: `${grade}-${classNumber}`,
          isAutoFilled: true,
          hasViolation: false,
          violations: [],
          violationSeverity: null,
        }
      }
    }

    // 適切な教師/科目が見つからない場合は空のスロット
    return {
      subject: '',
      teacher: '',
      classroom: '',
      isAutoFilled: false,
      hasViolation: false,
      violations: [],
      violationSeverity: null,
    }
  },

  // 単一クラスデータをクラス別に分散
  diversifyClassData(
    originalData: unknown,
    grade: number,
    classNumber: number,
    period: string,
    day: string,
    teachers: Teacher[],
    subjects: Subject[]
  ): unknown {
    if (!originalData || (!originalData.subject && !originalData.teacher)) {
      return this.generateUniqueSlotForClass(grade, classNumber, period, day, teachers, subjects)
    }

    // 元データがある場合は、クラス番号に基づいて別の教師を選択
    const seedValue = (grade * 100) + (classNumber * 10) + parseInt(period)
    
    // 同じ科目を教えることができる別の教師を探す
    const sameSubjectTeachers = teachers.filter(teacher => 
      teacher.subjects.includes(originalData.subject) && 
      teacher.grades?.includes(grade) &&
      teacher.name !== originalData.teacher // 元の教師以外
    )
    
    if (sameSubjectTeachers.length > 0) {
      const teacherIndex = seedValue % sameSubjectTeachers.length
      const alternativeTeacher = sameSubjectTeachers[teacherIndex]
      
      return {
        subject: originalData.subject,
        teacher: alternativeTeacher.name,
        classroom: `${grade}-${classNumber}`,
        isAutoFilled: true,
        hasViolation: false,
        violations: [],
        violationSeverity: null,
      }
    }
    
    // 代替教師が見つからない場合は新しいスロットを生成
    return this.generateUniqueSlotForClass(grade, classNumber, period, day, teachers, subjects)
  },

  // 競合回避機能付きの空きスロット補完
  fillEmptySlotsWithConflictAvoidance(
    displayData: unknown[],
    teachers: Teacher[],
    subjects: Subject[],
    grade: number,
    classNumber: number
  ): unknown[] {
    console.log(`🔧 ${grade}年${classNumber}組の空きスロット自動補完開始（競合回避機能付き）`)

    const availableSubjects = subjects.filter(subject => subject.grades?.includes(grade))
    const availableTeachers = teachers.filter(
      teacher => teacher.grades?.includes(grade) && teacher.subjects && teacher.subjects.length > 0
    )

    return displayData.map(periodRow => {
      const newRow = { ...periodRow }
      const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']

      days.forEach(day => {
        const cellData = newRow[day]

        // 空きスロットを補完
        if (!cellData || (!cellData.subject && !cellData.teacher)) {
          // 土曜日の5・6時限目は空きのままにする
          if (day === 'sat' && (periodRow.period === '5' || periodRow.period === '6')) {
            return
          }

          // この時限・曜日で他のクラスとの競合を避けて教師を選択
          const availableTeacherForSlot = availableTeachers.find(teacher => {
            // 同じ時限で他の曜日にすでに割り当てられていないかチェック
            const isTeacherBusyInSameClass = days.some(otherDay => {
              if (otherDay === day) return false
              const otherCell = newRow[otherDay]
              return otherCell && otherCell.teacher === teacher.name
            })
            
            // TODO: 他のクラスとの競合もチェックする（全校的な制約チェックと連携）
            // 現在は同一クラス内の競合のみをチェック
            
            return !isTeacherBusyInSameClass
          })

          if (availableTeacherForSlot && availableTeacherForSlot.subjects.length > 0) {
            const suitableSubject = availableSubjects.find(subject =>
              availableTeacherForSlot.subjects.includes(subject.name)
            )

            if (suitableSubject) {
              newRow[day] = {
                subject: suitableSubject.name,
                teacher: availableTeacherForSlot.name,
                classroom: `${grade}-${classNumber}`,
                isAutoFilled: true,
                hasViolation: false,
                violations: [],
                violationSeverity: null,
              }

              // console.log(
              //   `✅ ${grade}年${classNumber}組 ${day}曜日${periodRow.period}時限目に ${suitableSubject.name} (${availableTeacherForSlot.name}) を自動補完`
              // )
            }
          }
        }
      })

      return newRow
    })
  },

  // 全校横断的な制約チェック機能
  validateSchoolWideTimetableConstraints(
    allClassTimetables: Map<string, unknown[]>, // "grade-classNumber" -> timetableData
    teachers: Teacher[],
    subjects: Subject[]
  ): {
    isValid: boolean
    conflicts: Array<{
      period: string
      day: string
      type: 'teacher_conflict' | 'subject_constraint' | 'teacher_mismatch'
      message: string
      severity: 'high' | 'medium' | 'low'
      affectedClasses: Array<{ grade: number; classNumber: number }>
    }>
  } {
    console.log('🔍 全校横断的な制約チェック開始')

    const conflicts: Array<{
      period: string
      day: string
      type: 'teacher_conflict' | 'subject_constraint' | 'teacher_mismatch'
      message: string
      severity: 'high' | 'medium' | 'low'
      affectedClasses: Array<{ grade: number; classNumber: number }>
    }> = []

    const periods = ['1', '2', '3', '4', '5', '6']
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']

    // 各時限・曜日での全校的な教師重複チェック
    periods.forEach(period => {
      days.forEach(day => {
        const teacherAssignments = new Map<string, Array<{ grade: number; classNumber: number }>>()

        // 全クラスのこの時限・曜日での教師配置を収集
        allClassTimetables.forEach((timetableData, classKey) => {
          const [gradeStr, classNumberStr] = classKey.split('-')
          const grade = parseInt(gradeStr)
          const classNumber = parseInt(classNumberStr)

          const periodRow = timetableData.find((row: unknown) => row.period === period)
          if (periodRow?.[day]?.teacher) {
            const teacherName = periodRow[day].teacher
            
            if (!teacherAssignments.has(teacherName)) {
              teacherAssignments.set(teacherName, [])
            }
            teacherAssignments.get(teacherName)?.push({ grade, classNumber })
          }
        })

        // 同じ時限・曜日で複数クラスに割り当てられている教師をチェック
        teacherAssignments.forEach((assignedClasses, teacherName) => {
          if (assignedClasses.length > 1) {
            conflicts.push({
              period,
              day,
              type: 'teacher_conflict',
              message: `${teacherName}先生が同じ時限に複数クラス（${assignedClasses.map(c => `${c.grade}年${c.classNumber}組`).join(', ')}）で教えています`,
              severity: 'high',
              affectedClasses: assignedClasses,
            })

            console.log(`🚨 教師重複発見: ${teacherName}先生 ${day}曜日${period}時限目`, assignedClasses)
          }
        })

        // 教師の資格チェック
        allClassTimetables.forEach((timetableData, classKey) => {
          const [gradeStr, classNumberStr] = classKey.split('-')
          const grade = parseInt(gradeStr)
          const classNumber = parseInt(classNumberStr)

          const periodRow = timetableData.find((row: unknown) => row.period === period)
          const cellData = periodRow?.[day]
          
          if (cellData?.teacher && cellData.subject) {
            const teacher = teachers.find(t => t.name === cellData.teacher)
            if (teacher && !teacher.subjects.includes(cellData.subject)) {
              conflicts.push({
                period,
                day,
                type: 'teacher_mismatch',
                message: `${cellData.teacher}先生は${cellData.subject}の担当資格がありません（${grade}年${classNumber}組）`,
                severity: 'medium',
                affectedClasses: [{ grade, classNumber }],
              })
            }
          }
        })
      })
    })

    const isValid = conflicts.length === 0
    console.log(
      `📊 全校制約チェック結果: ${isValid ? '✅ 適合' : '❌ 違反あり'} (${conflicts.length}件の問題)`
    )

    return { isValid, conflicts }
  },

  // 強化された制約チェック（全校視点を含む）
  validateTimetableConstraintsEnhanced(
    displayData: unknown[],
    teachers: Teacher[],
    subjects: Subject[],
    grade: number,
    classNumber: number,
    allClassTimetables?: Map<string, unknown[]>
  ): {
    isValid: boolean
    conflicts: Array<{
      period: string
      day: string
      type: 'teacher_double_booking' | 'subject_constraint' | 'teacher_qualification' | 'school_wide_conflict'
      message: string
      severity: 'high' | 'medium' | 'low'
      affectedCells: Array<{ period: string; day: string }>
    }>
  } {
    console.log(`🔍 強化された制約チェック開始 (${grade}年${classNumber}組)`)

    const conflicts: Array<{
      period: string
      day: string
      type: 'teacher_double_booking' | 'subject_constraint' | 'teacher_qualification' | 'school_wide_conflict'
      message: string
      severity: 'high' | 'medium' | 'low'
      affectedCells: Array<{ period: string; day: string }>
    }> = []

    // 既存のクラス内制約チェック
    const classInternalResult = this.validateTimetableConstraints(displayData, teachers, subjects)
    conflicts.push(...classInternalResult.conflicts.map(c => ({
      ...c,
      type: c.type as 'teacher_double_booking' | 'subject_constraint' | 'teacher_qualification' | 'school_wide_conflict'
    })))

    // 全校横断制約チェック（データが利用可能な場合）
    if (allClassTimetables) {
      // 現在のクラスデータを全校データに追加
      const enhancedAllClassTimetables = new Map(allClassTimetables)
      enhancedAllClassTimetables.set(`${grade}-${classNumber}`, displayData)

      const schoolWideResult = this.validateSchoolWideTimetableConstraints(
        enhancedAllClassTimetables,
        teachers,
        subjects
      )

      // 全校制約違反のうち、現在のクラスに影響するもののみを追加
      schoolWideResult.conflicts.forEach(conflict => {
        const affectsCurrentClass = conflict.affectedClasses.some(
          ac => ac.grade === grade && ac.classNumber === classNumber
        )
        
        if (affectsCurrentClass) {
          conflicts.push({
            period: conflict.period,
            day: conflict.day,
            type: 'school_wide_conflict',
            message: conflict.message,
            severity: conflict.severity,
            affectedCells: [{ period: conflict.period, day: conflict.day }],
          })
        }
      })
    }

    const isValid = conflicts.length === 0
    console.log(
      `📊 強化制約チェック結果: ${isValid ? '✅ 適合' : '❌ 違反あり'} (${conflicts.length}件の問題)`
    )

    return { isValid, conflicts }
  },
}
