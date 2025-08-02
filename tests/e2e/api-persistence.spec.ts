import { test, expect } from '@playwright/test'

test.describe('API永続性テスト', () => {
  const API_BASE = 'https://school-timetable-monorepo.grundhunter.workers.dev/api/frontend/school'
  const TOKEN = 'test-token'
  
  let testTeacherId: string | null = null

  test('担当教科・学年の永続性（APIレベル）', async ({ request }) => {
    console.log('🔬 API永続性テスト開始')
    
    // Step 1: 教師を作成
    const createTeacherData = {
      name: `API永続性テスト教師_${Date.now()}`,
      email: 'api-persistence@example.com',
      specialization: '理科',
      subjects: ['理科A', '理科B'],
      grades: ['1年', '2年', '3年']
    }
    
    console.log('📝 教師作成データ:', createTeacherData)
    
    const createResponse = await request.post(`${API_BASE}/teachers`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      data: createTeacherData
    })
    
    expect(createResponse.ok()).toBeTruthy()
    const createResult = await createResponse.json()
    
    console.log('✅ 教師作成結果:', createResult)
    expect(createResult.success).toBe(true)
    expect(createResult.data.name).toBe(createTeacherData.name)
    expect(createResult.data.subjects).toHaveLength(2)
    expect(createResult.data.grades).toHaveLength(3)
    
    testTeacherId = createResult.data.id
    
    // Step 2: 教師一覧で確認
    console.log('📋 教師一覧で確認中...')
    
    const listResponse = await request.get(`${API_BASE}/teachers`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    })
    
    expect(listResponse.ok()).toBeTruthy()
    const listResult = await listResponse.json()
    
    console.log('📊 教師一覧結果（抜粋）:', {
      success: listResult.success,
      count: listResult.data?.length || 0,
      firstTeacher: listResult.data?.[0] || null
    })
    
    expect(listResult.success).toBe(true)
    expect(Array.isArray(listResult.data)).toBe(true)
    
    // 作成した教師を見つける
    const createdTeacher = listResult.data.find(t => t.id === testTeacherId)
    expect(createdTeacher).toBeTruthy()
    
    console.log('🎯 作成した教師:', createdTeacher)
    
    // 担当教科の永続性確認
    expect(createdTeacher.subjects).toHaveLength(2)
    expect(createdTeacher.subjects.map(s => s.name || s)).toEqual(
      expect.arrayContaining(['理科A', '理科B'])
    )
    
    // 担当学年の永続性確認
    expect(createdTeacher.grades).toHaveLength(3)
    expect(createdTeacher.grades).toEqual(
      expect.arrayContaining(['1年', '2年', '3年'])
    )
    
    console.log('✅ 担当教科永続性確認: OK')
    console.log('✅ 担当学年永続性確認: OK')
    
    // Step 3: 個別取得でも確認（更新エンドポイントを使って取得）
    console.log('🔍 個別教師データ確認中...')
    
    // 教師更新を使って現在のデータを取得
    const updateResponse = await request.put(`${API_BASE}/teachers/${testTeacherId}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      data: {
        name: createdTeacher.name,
        email: createdTeacher.email,
        specialization: createdTeacher.specialization
      }
    })
    
    expect(updateResponse.ok()).toBeTruthy()
    const updateResult = await updateResponse.json()
    
    console.log('🔄 更新後データ:', updateResult)
    
    expect(updateResult.success).toBe(true)
    expect(updateResult.data.subjects).toHaveLength(2)
    expect(updateResult.data.grades).toHaveLength(3)
    
    console.log('✅ API永続性テスト完了')
  })
  
  test.afterEach(async ({ request }) => {
    // クリーンアップ: テスト教師を削除
    if (testTeacherId) {
      console.log(`🧹 テスト教師を削除中: ${testTeacherId}`)
      try {
        const deleteResponse = await request.delete(`${API_BASE}/teachers/${testTeacherId}`, {
          headers: {
            'Authorization': `Bearer ${TOKEN}`
          }
        })
        
        if (deleteResponse.ok()) {
          console.log('✅ テスト教師削除完了')
        } else {
          console.log('⚠️ テスト教師削除失敗')
        }
      } catch (error) {
        console.log('⚠️ テスト教師削除エラー:', error)
      }
      testTeacherId = null
    }
  })
})