// 教室テーブルの修正とテストデータ挿入用スクリプト

const testClassroomData = [
  {
    id: 'classroom-001',
    name: '1年1組教室',
    type: 'normal',
    capacity: 30,
    count: 1,
    location: '1階東棟',
    order: 1,
  },
  {
    id: 'classroom-002',
    name: '理科室',
    type: 'special',
    capacity: 24,
    count: 1,
    location: '2階西棟',
    order: 2,
  },
  {
    id: 'classroom-003',
    name: '音楽室',
    type: 'special',
    capacity: 20,
    count: 1,
    location: '3階中央',
    order: 3,
  },
]

const addClassrooms = async () => {
  try {
    // データベース初期化を実行
    const initResponse = await fetch('http://localhost:8787/api/init-db', {
      method: 'POST',
    })

    if (!initResponse.ok) {
      throw new Error('Database initialization failed')
    }

    console.log('✅ Database initialized')

    // 教室データを直接挿入
    const migrationResponse = await fetch('http://localhost:8787/api/migrate-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'classrooms',
        data: testClassroomData.map(classroom => ({
          ...classroom,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })),
      }),
    })

    if (!migrationResponse.ok) {
      const error = await migrationResponse.json()
      throw new Error(`Migration failed: ${error.error}`)
    }

    const result = await migrationResponse.json()
    console.log('✅ Classrooms migration result:', result)

    // 結果確認
    const metricsResponse = await fetch('http://localhost:8787/api/metrics')
    const metrics = await metricsResponse.json()
    console.log('📊 Updated metrics:', metrics.data.statistics)
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

addClassrooms()
