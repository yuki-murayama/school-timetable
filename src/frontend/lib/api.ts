/**
 * APIクライアント設定
 */

// 統一型定義をインポート
import type {
  SchoolSettings,
  Teacher,
  Subject,
  Classroom,
  AssignmentRestriction,
  TimetableGenerationResponse,
  TimetableListItem,
  TimetableDetail
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
    'X-CSRF-Token': generateCSRFToken() // CSRF保護トークン
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
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
const makeApiRequest = async (url: string, options: RequestInit, apiOptions?: ApiOptions): Promise<Response> => {
  let response = await fetch(url, options)
  
  // If we get a 401 and have a token refresh function, try to refresh and retry
  if (response.status === 401 && apiOptions?.getFreshToken) {
    console.log('401 error detected, attempting token refresh...')
    try {
      const freshToken = await apiOptions.getFreshToken()
      if (freshToken) {
        console.log('Token refreshed, retrying request...')
        // Update headers with fresh token
        const newHeaders = {
          ...options.headers,
          ...createHeaders(freshToken)
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
    console.log(`Making GET request to: ${API_BASE_URL}${endpoint}`)
    console.log('Headers:', createHeaders(options?.token))
    
    const response = await makeApiRequest(`${API_BASE_URL}${endpoint}`, {
      headers: createHeaders(options?.token)
    }, options)
    
    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Response error text:', errorText)
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
    }
    
    const responseData = await response.json()
    console.log('Response data:', responseData)
    console.log('Response data type:', typeof responseData)
    console.log('Is array?', Array.isArray(responseData))
    
    // バックエンドが {success: true, data: {...}} 形式で返す場合の処理
    if (responseData && typeof responseData === 'object' && 'success' in responseData && 'data' in responseData) {
      console.log('Processing structured response')
      console.log('Success:', responseData.success)
      console.log('Data:', responseData.data)
      console.log('Data type:', typeof responseData.data)
      console.log('Data is array?', Array.isArray(responseData.data))
      
      if (responseData.success) {
        return responseData.data
      } else {
        throw new Error(`API error: ${responseData.message || 'Unknown error'}`)
      }
    }
    
    return responseData
  },

  async post<T>(endpoint: string, data: any, options?: ApiOptions): Promise<T> {
    console.log(`Making POST request to: ${API_BASE_URL}${endpoint}`)
    console.log('Request data:', JSON.stringify(data, null, 2))
    console.log('Headers:', createHeaders(options?.token))
    
    const response = await makeApiRequest(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: createHeaders(options?.token),
      body: JSON.stringify(data)
    }, options)
    
    console.log('POST Response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('POST Response error text:', errorText)
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
    }
    
    const responseData = await response.json()
    console.log('POST Response data:', responseData)
    console.log('POST Response data type:', typeof responseData)
    
    // バックエンドが {success: true, data: {...}} 形式で返す場合の処理
    if (responseData && typeof responseData === 'object' && 'success' in responseData && 'data' in responseData) {
      console.log('Processing structured POST response')
      console.log('Success:', responseData.success)
      console.log('Data:', responseData.data)
      
      if (responseData.success) {
        return responseData.data
      } else {
        throw new Error(`API error: ${responseData.message || 'Unknown error'}`)
      }
    }
    
    return responseData
  },

  async put<T>(endpoint: string, data: any, options?: ApiOptions): Promise<T> {
    console.log(`Making PUT request to: ${API_BASE_URL}${endpoint}`)
    console.log('Request data:', JSON.stringify(data, null, 2))
    console.log('Headers:', createHeaders(options?.token))
    
    const response = await makeApiRequest(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: createHeaders(options?.token),
      body: JSON.stringify(data)
    }, options)
    
    console.log('PUT Response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('PUT Response error text:', errorText)
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
    }
    
    const responseData = await response.json()
    console.log('PUT Response data:', responseData)
    console.log('PUT Response data type:', typeof responseData)
    
    // バックエンドが {success: true, data: {...}} 形式で返す場合の処理
    if (responseData && typeof responseData === 'object' && 'success' in responseData && 'data' in responseData) {
      console.log('Processing structured PUT response')
      console.log('Success:', responseData.success)
      console.log('Data:', responseData.data)
      
      if (responseData.success) {
        return responseData.data
      } else {
        throw new Error(`API error: ${responseData.message || 'Unknown error'}`)
      }
    }
    
    return responseData
  },
  
  async delete<T>(endpoint: string, options?: ApiOptions): Promise<T> {
    console.log(`Making DELETE request to: ${API_BASE_URL}${endpoint}`)
    console.log('Headers:', createHeaders(options?.token))
    
    const response = await makeApiRequest(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: createHeaders(options?.token)
    }, options)
    
    console.log('DELETE Response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('DELETE Response error text:', errorText)
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
    }
    
    const responseData = await response.json()
    console.log('DELETE Response data:', responseData)
    console.log('DELETE Response data type:', typeof responseData)
    
    // バックエンドが {success: true, message: ...} 形式で返す場合の処理
    if (responseData && typeof responseData === 'object' && 'success' in responseData) {
      console.log('Processing structured DELETE response')
      console.log('Success:', responseData.success)
      console.log('Message:', responseData.message)
      
      if (responseData.success) {
        return responseData as T
      } else {
        throw new Error(`API error: ${responseData.error || responseData.message || 'Unknown error'}`)
      }
    }
    
    return responseData
  },

  async patch<T>(endpoint: string, data: any, options?: ApiOptions): Promise<T> {
    console.log(`Making PATCH request to: ${API_BASE_URL}${endpoint}`)
    console.log('Request data:', JSON.stringify(data, null, 2))
    console.log('Headers:', createHeaders(options?.token))
    
    const response = await makeApiRequest(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: createHeaders(options?.token),
      body: JSON.stringify(data)
    }, options)
    
    console.log('PATCH Response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('PATCH Response error text:', errorText)
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
    }
    
    const responseData = await response.json()
    console.log('PATCH Response data:', responseData)
    console.log('PATCH Response data type:', typeof responseData)
    
    // バックエンドが {success: true, data: {...}} 形式で返す場合の処理
    if (responseData && typeof responseData === 'object' && 'success' in responseData && 'data' in responseData) {
      console.log('Processing structured PATCH response')
      console.log('Success:', responseData.success)
      console.log('Data:', responseData.data)
      
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
  SchoolSettings,
  Teacher,
  Subject,
  Classroom,
  AssignmentRestriction,
  TimetableGenerationResponse,
  TimetableListItem,
  TimetableDetail
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
    console.log('🚀 API Request - createTeacher')
    console.log('  📝 Teacher data being created:', JSON.stringify(teacher, null, 2))
    console.log('  📚 Subjects array:', teacher.subjects)
    console.log('  🎓 Grades array:', teacher.grades)
    
    const result = await apiClient.post<Teacher>('/frontend/school/teachers', teacher, options)
    
    console.log('✅ API Response - createTeacher')
    console.log('  📤 Received data:', JSON.stringify(result, null, 2))
    console.log('  📚 Returned subjects:', result.subjects)
    console.log('  🎓 Returned grades:', result.grades)
    
    return result
  },

  async updateTeacher(id: string, teacher: Partial<Teacher>, options?: ApiOptions): Promise<Teacher> {
    console.log('🚀 API Request - updateTeacher')
    console.log('  📝 Teacher ID:', id)
    console.log('  📦 Data being sent:', JSON.stringify(teacher, null, 2))
    console.log('  📚 Subjects array:', teacher.subjects)
    console.log('  🎓 Grades array:', teacher.grades)
    
    const result = await apiClient.put<Teacher>(`/frontend/school/teachers/${id}`, teacher, options)
    
    console.log('✅ API Response - updateTeacher')
    console.log('  📤 Received data:', JSON.stringify(result, null, 2))
    console.log('  📚 Returned subjects:', result.subjects)
    console.log('  🎓 Returned grades:', result.grades)
    
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

  async reorderTeachers(teachers: Array<{id: string, order: number}>, options?: ApiOptions): Promise<{updatedCount: number, totalRequested: number}> {
    const response = await apiClient.patch<{updatedCount: number, totalRequested: number}>('/frontend/school/teachers/reorder', {
      teachers
    }, options)
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

  async updateSubject(id: string, subject: Partial<Subject>, options?: ApiOptions): Promise<Subject> {
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
        const updated = await apiClient.put<Subject>(`/frontend/school/subjects/${subject.id}`, {
          name: subject.name,
          specialClassroom: subject.specialClassroom,
          weekly_hours: subject.weekly_hours,
          target_grades: subject.target_grades,
          order: subject.order
        }, options)
        updatedSubjects.push(updated)
      } catch (error) {
        console.error(`Failed to update subject ${subject.id}:`, error)
        // Continue with other subjects even if one fails
      }
    }
    
    return updatedSubjects
  },

  async reorderSubjects(subjects: Array<{id: string, order: number}>, options?: ApiOptions): Promise<{updatedCount: number, totalRequested: number}> {
    const response = await apiClient.patch<{updatedCount: number, totalRequested: number}>('/frontend/school/subjects/reorder', {
      subjects
    }, options)
    return response
  },
}

export const classroomApi = {
  async getClassrooms(options?: ApiOptions): Promise<Classroom[]> {
    return apiClient.get<Classroom[]>('/frontend/school/classrooms', options)
  },

  async createClassroom(classroom: Omit<Classroom, 'id'>, options?: ApiOptions): Promise<Classroom> {
    return apiClient.post<Classroom>('/frontend/school/classrooms', classroom, options)
  },

  async updateClassroom(id: string, classroom: Partial<Classroom>, options?: ApiOptions): Promise<Classroom> {
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
        return apiClient.put<Classroom>(`/frontend/school/classrooms/${classroom.id}`, classroom, options)
      }
      return Promise.resolve()
    })
    await Promise.all(promises)
  },

  async reorderClassrooms(classrooms: Array<{id: string, order: number}>, options?: ApiOptions): Promise<{updatedCount: number, totalRequested: number}> {
    const response = await apiClient.patch<{updatedCount: number, totalRequested: number}>('/frontend/school/classrooms/reorder', {
      classrooms
    }, options)
    return response
  },
}

export const conditionsApi = {
  async getConditions(options?: ApiOptions): Promise<{ conditions: string }> {
    return apiClient.get<{ conditions: string }>('/frontend/school/conditions', options)
  },

  async saveConditions(data: { conditions: string }, options?: ApiOptions): Promise<{ conditions: string }> {
    return apiClient.put<{ conditions: string }>('/frontend/school/conditions', data, options)
  },
}

export const timetableApi = {
  async generateTimetable(request: { options?: Record<string, any> }, options?: ApiOptions): Promise<TimetableGenerationResponse> {
    return apiClient.post<TimetableGenerationResponse>('/frontend/timetable/generate', request, options)
  },

  async getTimetables(options?: ApiOptions): Promise<TimetableListItem[]> {
    return apiClient.get<TimetableListItem[]>('/frontend/school/timetables', options)
  },

  // 生成された時間割の取得
  async getSavedTimetables(options?: ApiOptions): Promise<TimetableListItem[]> {
    const response = await apiClient.get<{timetables: TimetableListItem[], count: number}>('/timetable/program/saved', options)
    console.log("🔍 getSavedTimetables レスポンス:", response)
    
    // レスポンスの形式を確認して適切に処理
    if (response && typeof response === 'object' && 'timetables' in response) {
      console.log("✅ timetables配列を抽出:", response.timetables)
      return response.timetables
    }
    
    // 直接配列が返された場合
    if (Array.isArray(response)) {
      console.log("✅ 直接配列を返却:", response)
      return response
    }
    
    console.warn("⚠️ 予期しないレスポンス形式:", response)
    return []
  },

  async getTimetableDetail(id: string, options?: ApiOptions): Promise<TimetableDetail> {
    return apiClient.get<TimetableDetail>(`/frontend/school/timetables/${id}`, options)
  },

  // 生成された時間割の詳細取得
  async getSavedTimetableDetail(id: string, options?: ApiOptions): Promise<TimetableDetail> {
    return apiClient.get<TimetableDetail>(`/timetable/program/saved/${id}`, options)
  },

  async updateTimetable(id: string, data: any, options?: ApiOptions): Promise<TimetableDetail> {
    return apiClient.put<TimetableDetail>(`/frontend/school/timetables/${id}`, data, options)
  },

  // プログラム型時間割生成
  async generateProgramTimetable(options?: ApiOptions): Promise<{
    success: boolean
    message?: string
    data?: {
      timetable: any
      statistics: {
        totalSlots: number
        assignedSlots: number
        unassignedSlots: number
        backtrackCount: number
      }
      generatedAt: string
      method: string
    }
    statistics?: any
  }> {
    return apiClient.post<{
      success: boolean
      message?: string
      data?: any
      statistics?: any
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
      statistics: any
      constraints: any[]
    }>('/timetable/program/config', options)
  },

  async validateTimetable(timetableData: any, options?: ApiOptions): Promise<{
    isValid: boolean
    violations: Array<{
      type: string
      message: string
      slot: any
      timeKey: string
    }>
    checkedConstraints: string[]
  }> {
    return apiClient.post<{
      isValid: boolean
      violations: any[]
      checkedConstraints: string[]
    }>('/timetable/program/validate', { timetableData }, options)
  },
}

// 統合データ取得用のAPI
export const dashboardApi = {
  async getAllData(options?: ApiOptions): Promise<{
    settings: SchoolSettings,
    teachers: Teacher[],
    subjects: Subject[],
    classrooms: Classroom[]
  }> {
    // 並列でデータを取得してネットワーク時間を短縮
    const [settings, teachers, subjects, classrooms] = await Promise.all([
      schoolApi.getSettings(options),
      teacherApi.getTeachers(options),
      subjectApi.getSubjects(options),
      classroomApi.getClassrooms(options)
    ])
    
    return { settings, teachers, subjects, classrooms }
  }
}

export const timetableUtils = {
  convertToDisplayFormat(timetableData: any, grade: number, classNumber: number) {
    // timetableDataがnullまたはundefinedの場合、空配列を返す
    if (!timetableData) {
      console.log("⚠️ 時間割データが空です - 空の配列を返します")
      return []
    }

    // timetableDataが配列の場合はそのまま返す（モックデータ用）
    if (Array.isArray(timetableData)) {
      console.log("✅ 配列形式の時間割データを検出しました")
      return timetableData
    }

    // オブジェクト形式の場合は変換処理
    console.log(`🔄 時間割データを${grade}年${classNumber}組用に変換中...`, timetableData)
    
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
            if (periodInfo && periodInfo.subject && periodInfo.teacher) {
              periodData[displayDays[dayIndex] as keyof typeof periodData] = {
                subject: periodInfo.subject,
                teacher: periodInfo.teacher
              }
            }
          }
        } catch (error) {
          console.warn(`曜日 ${day} のデータ処理でエラー:`, error)
        }
      })
      
      schedule.push(periodData)
    }
    
    console.log("✅ 変換完了:", schedule)
    return schedule
  }
}