import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'

// テスト用の環境設定
const API_BASE = 'https://school-timetable-monorepo.grundhunter.workers.dev/api/frontend/school'
const TEST_TOKEN = 'test-token'

interface Teacher {
  id: string
  name: string
  email?: string
  specialization?: string
  subjects: Array<{id: string, name: string}> | string[]
  grades: string[]
  created_at: string
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// テスト用ユーティリティ関数
const apiRequest = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  const url = `${API_BASE}${endpoint}`
  const defaultHeaders = {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json'
  }
  
  return fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  })
}

const createTestTeacher = (name: string, subjects: string[] = [], grades: string[] = []) => ({
  name,
  email: `${name.toLowerCase().replace(/\s+/g, '')}@test.com`,
  specialization: '数学',
  subjects,
  grades
})

describe('教師CRUD統合テスト - 分岐網羅', () => {
  let createdTeacherIds: string[] = []

  // テスト後のクリーンアップ
  afterAll(async () => {
    console.log('🧹 テストデータクリーンアップ開始')
    for (const teacherId of createdTeacherIds) {
      try {
        await apiRequest(`/teachers/${teacherId}`, { method: 'DELETE' })
        console.log(`✅ 教師削除完了: ${teacherId}`)
      } catch (error) {
        console.log(`⚠️ 教師削除失敗: ${teacherId}`, error)
      }
    }
    createdTeacherIds = []
  })

  beforeEach(() => {
    console.log('🧪 テスト開始 ---')
  })

  describe('教師一覧取得 (GET /teachers)', () => {
    it('正常な教師一覧取得', async () => {
      console.log('🔍 テスト: 正常な教師一覧取得')
      
      const response = await apiRequest('/teachers')
      expect(response.ok).toBe(true)
      
      const result: ApiResponse<Teacher[]> = await response.json()
      console.log('📊 取得結果:', {
        success: result.success,
        count: result.data?.length || 0,
        firstTeacher: result.data?.[0]?.name || 'none'
      })
      
      expect(result.success).toBe(true)
      expect(Array.isArray(result.data)).toBe(true)
      
      // データ構造の確認
      if (result.data && result.data.length > 0) {
        const teacher = result.data[0]
        expect(teacher).toHaveProperty('id')
        expect(teacher).toHaveProperty('name')
        expect(teacher).toHaveProperty('subjects')
        expect(teacher).toHaveProperty('grades')
        expect(Array.isArray(teacher.subjects)).toBe(true)
        expect(Array.isArray(teacher.grades)).toBe(true)
      }
    })

    it('教師データの構造検証', async () => {
      console.log('🔍 テスト: 教師データ構造検証')
      
      const response = await apiRequest('/teachers')
      const result: ApiResponse<Teacher[]> = await response.json()
      
      if (result.data && result.data.length > 0) {
        const teacher = result.data[0]
        
        // 必須フィールドの存在確認
        expect(teacher.id).toBeDefined()
        expect(teacher.name).toBeDefined()
        expect(teacher.created_at).toBeDefined()
        
        // 配列フィールドの型確認
        expect(Array.isArray(teacher.subjects)).toBe(true)
        expect(Array.isArray(teacher.grades)).toBe(true)
        
        // 教科データの構造確認
        if (teacher.subjects.length > 0) {
          const subject = teacher.subjects[0]
          if (typeof subject === 'object') {
            expect(subject).toHaveProperty('id')
            expect(subject).toHaveProperty('name')
          }
        }
        
        console.log('✅ 教師データ構造検証完了')
      }
    })
  })

  describe('教師作成 (POST /teachers)', () => {
    it('必須フィールド検証: 教師名なし', async () => {
      console.log('🧪 テスト: 教師名なしエラー')
      
      const invalidData = { email: 'test@example.com' } // nameなし
      
      const response = await apiRequest('/teachers', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      })
      
      const result: ApiResponse<Teacher> = await response.json()
      console.log('❌ エラーレスポンス:', result)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('教師名は必須です')
      expect(response.status).toBe(400)
    })

    it('正常な教師作成: 基本情報のみ', async () => {
      console.log('🧪 テスト: 基本情報のみでの教師作成')
      
      const teacherData = createTestTeacher('基本テスト教師')
      
      const response = await apiRequest('/teachers', {
        method: 'POST',
        body: JSON.stringify(teacherData)
      })
      
      expect(response.ok).toBe(true)
      
      const result: ApiResponse<Teacher> = await response.json()
      console.log('✅ 作成結果:', {
        success: result.success,
        id: result.data?.id,
        name: result.data?.name,
        subjectsCount: result.data?.subjects?.length || 0,
        gradesCount: result.data?.grades?.length || 0
      })
      
      expect(result.success).toBe(true)
      expect(result.data?.name).toBe(teacherData.name)
      expect(result.data?.email).toBe(teacherData.email)
      expect(Array.isArray(result.data?.subjects)).toBe(true)
      expect(Array.isArray(result.data?.grades)).toBe(true)
      
      if (result.data?.id) {
        createdTeacherIds.push(result.data.id)
      }
    })

    it('正常な教師作成: 教科・学年データ付き', async () => {
      console.log('🧪 テスト: 教科・学年データ付きでの教師作成')
      
      const teacherData = createTestTeacher(
        'フルデータテスト教師',
        ['数学A', '数学B'],
        ['1年', '2年', '3年']
      )
      
      const response = await apiRequest('/teachers', {
        method: 'POST', 
        body: JSON.stringify(teacherData)
      })
      
      expect(response.ok).toBe(true)
      
      const result: ApiResponse<Teacher> = await response.json()
      console.log('✅ フルデータ作成結果:', {
        success: result.success,
        id: result.data?.id,
        name: result.data?.name,
        subjects: result.data?.subjects,
        grades: result.data?.grades
      })
      
      expect(result.success).toBe(true)
      expect(result.data?.name).toBe(teacherData.name)
      
      // 教科データの確認
      expect(Array.isArray(result.data?.subjects)).toBe(true)
      expect(result.data?.subjects?.length).toBeGreaterThan(0)
      
      // 学年データの確認
      expect(Array.isArray(result.data?.grades)).toBe(true)
      expect(result.data?.grades).toEqual(['1年', '2年', '3年'])
      
      if (result.data?.id) {
        createdTeacherIds.push(result.data.id)
      }
    })

    it('存在しない教科での教師作成', async () => {
      console.log('🧪 テスト: 存在しない教科での教師作成')
      
      const teacherData = createTestTeacher(
        '存在しない教科テスト教師',
        ['存在しない教科X', '存在しない教科Y'],
        ['1年']
      )
      
      const response = await apiRequest('/teachers', {
        method: 'POST',
        body: JSON.stringify(teacherData)
      })
      
      const result: ApiResponse<Teacher> = await response.json()
      console.log('⚠️ 存在しない教科での作成結果:', {
        success: result.success,
        subjectsCount: result.data?.subjects?.length || 0,
        gradesCount: result.data?.grades?.length || 0
      })
      
      // 教師作成は成功するが、教科は関連付けされない
      expect(result.success).toBe(true)
      expect(result.data?.name).toBe(teacherData.name)
      expect(result.data?.grades).toEqual(['1年']) // 学年は保存される
      
      if (result.data?.id) {
        createdTeacherIds.push(result.data.id)
      }
    })
  })

  describe('教師更新 (PUT /teachers/:id)', () => {
    let testTeacherId: string

    beforeAll(async () => {
      // テスト用教師を作成
      const teacherData = createTestTeacher('更新テスト教師', ['数学A'], ['1年'])
      const response = await apiRequest('/teachers', {
        method: 'POST',
        body: JSON.stringify(teacherData)
      })
      const result: ApiResponse<Teacher> = await response.json()
      testTeacherId = result.data!.id
      createdTeacherIds.push(testTeacherId)
    })

    it('存在しない教師の更新', async () => {
      console.log('🧪 テスト: 存在しない教師の更新')
      
      const updateData = { name: '更新教師' }
      const response = await apiRequest('/teachers/nonexistent-id', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })
      
      const result: ApiResponse<Teacher> = await response.json()
      console.log('❌ 存在しない教師更新結果:', result)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('指定された教師が見つかりません')
      expect(response.status).toBe(404)
    })

    it('正常な教師更新: 基本情報', async () => {
      console.log('🧪 テスト: 基本情報の更新')
      
      const updateData = {
        name: '更新された教師名',
        email: 'updated@example.com',
        specialization: '理科'
      }
      
      const response = await apiRequest(`/teachers/${testTeacherId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })
      
      expect(response.ok).toBe(true)
      
      const result: ApiResponse<Teacher> = await response.json()
      console.log('✅ 基本情報更新結果:', {
        success: result.success,
        name: result.data?.name,
        email: result.data?.email,
        specialization: result.data?.specialization
      })
      
      expect(result.success).toBe(true)
      expect(result.data?.name).toBe(updateData.name)
      expect(result.data?.email).toBe(updateData.email)
      expect(result.data?.specialization).toBe(updateData.specialization)
    })

    it('教科更新: 既存教科の置き換え', async () => {
      console.log('🧪 テスト: 教科の更新')
      
      const updateData = {
        name: '更新された教師名',
        subjects: ['理科A', '理科B']
      }
      
      const response = await apiRequest(`/teachers/${testTeacherId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })
      
      const result: ApiResponse<Teacher> = await response.json()
      console.log('✅ 教科更新結果:', {
        success: result.success,
        subjects: result.data?.subjects,
        subjectsCount: result.data?.subjects?.length || 0
      })
      
      expect(result.success).toBe(true)
      expect(Array.isArray(result.data?.subjects)).toBe(true)
      
      // 教科が正しく更新されているかを確認
      if (result.data?.subjects && result.data.subjects.length > 0) {
        const subjectNames = result.data.subjects.map(s => 
          typeof s === 'string' ? s : s.name
        )
        expect(subjectNames).toEqual(expect.arrayContaining(['理科A', '理科B']))
      }
    })

    it('学年更新: 新しい学年セット', async () => {
      console.log('🧪 テスト: 学年の更新')
      
      const updateData = {
        name: '更新された教師名',
        grades: ['2年', '3年']
      }
      
      const response = await apiRequest(`/teachers/${testTeacherId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })
      
      const result: ApiResponse<Teacher> = await response.json()
      console.log('✅ 学年更新結果:', {
        success: result.success,
        grades: result.data?.grades
      })
      
      expect(result.success).toBe(true)
      expect(result.data?.grades).toEqual(['2年', '3年'])
    })
  })

  describe('教師削除 (DELETE /teachers/:id)', () => {
    it('存在しない教師の削除', async () => {
      console.log('🧪 テスト: 存在しない教師の削除')
      
      const response = await apiRequest('/teachers/nonexistent-id', {
        method: 'DELETE'
      })
      
      const result: ApiResponse<any> = await response.json()
      console.log('❌ 存在しない教師削除結果:', result)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('指定された教師が見つかりません')
      expect(response.status).toBe(404)
    })

    it('正常な教師削除', async () => {
      console.log('🧪 テスト: 正常な教師削除')
      
      // 削除用テスト教師を作成
      const teacherData = createTestTeacher('削除テスト教師')
      const createResponse = await apiRequest('/teachers', {
        method: 'POST',
        body: JSON.stringify(teacherData)
      })
      const createResult: ApiResponse<Teacher> = await createResponse.json()
      const teacherId = createResult.data!.id
      
      // 削除実行
      const deleteResponse = await apiRequest(`/teachers/${teacherId}`, {
        method: 'DELETE'
      })
      
      expect(deleteResponse.ok).toBe(true)
      
      const deleteResult: ApiResponse<any> = await deleteResponse.json()
      console.log('✅ 削除結果:', deleteResult)
      
      expect(deleteResult.success).toBe(true)
      expect(deleteResult.message).toContain('削除しました')
      
      // 削除確認: 教師一覧で確認
      const listResponse = await apiRequest('/teachers')
      const listResult: ApiResponse<Teacher[]> = await listResponse.json()
      
      const deletedTeacher = listResult.data?.find(t => t.id === teacherId)
      expect(deletedTeacher).toBeUndefined()
      
      console.log('✅ 削除確認完了')
    })
  })

  describe('データ永続性テスト', () => {
    it('作成→一覧取得→更新→一覧取得の流れでデータ永続性確認', async () => {
      console.log('🔄 テスト: データ永続性の全工程確認')
      
      // Step 1: 教師作成
      const initialData = createTestTeacher(
        '永続性テスト教師',
        ['数学A'],
        ['1年', '2年']
      )
      
      const createResponse = await apiRequest('/teachers', {
        method: 'POST',
        body: JSON.stringify(initialData)
      })
      const createResult: ApiResponse<Teacher> = await createResponse.json()
      const teacherId = createResult.data!.id
      createdTeacherIds.push(teacherId)
      
      console.log('1️⃣ 教師作成完了:', {
        id: teacherId,
        subjects: createResult.data?.subjects,
        grades: createResult.data?.grades
      })
      
      // Step 2: 一覧取得で確認
      const listResponse1 = await apiRequest('/teachers')
      const listResult1: ApiResponse<Teacher[]> = await listResponse1.json()
      const createdTeacher = listResult1.data?.find(t => t.id === teacherId)
      
      expect(createdTeacher).toBeDefined()
      expect(createdTeacher?.grades).toEqual(['1年', '2年'])
      console.log('2️⃣ 作成直後の一覧確認完了:', {
        subjects: createdTeacher?.subjects,
        grades: createdTeacher?.grades
      })
      
      // Step 3: 教師更新
      const updateData = {
        name: '永続性テスト教師（更新）',
        subjects: ['理科A', '理科B'],
        grades: ['2年', '3年']
      }
      
      const updateResponse = await apiRequest(`/teachers/${teacherId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })
      const updateResult: ApiResponse<Teacher> = await updateResponse.json()
      
      console.log('3️⃣ 教師更新完了:', {
        subjects: updateResult.data?.subjects,
        grades: updateResult.data?.grades
      })
      
      // Step 4: 更新後の一覧取得で確認
      const listResponse2 = await apiRequest('/teachers')
      const listResult2: ApiResponse<Teacher[]> = await listResponse2.json()
      const updatedTeacher = listResult2.data?.find(t => t.id === teacherId)
      
      expect(updatedTeacher).toBeDefined()
      expect(updatedTeacher?.name).toBe('永続性テスト教師（更新）')
      expect(updatedTeacher?.grades).toEqual(['2年', '3年'])
      
      console.log('4️⃣ 更新後の一覧確認完了:', {
        name: updatedTeacher?.name,
        subjects: updatedTeacher?.subjects,
        grades: updatedTeacher?.grades
      })
      
      console.log('✅ データ永続性テスト完了')
    })
  })
})