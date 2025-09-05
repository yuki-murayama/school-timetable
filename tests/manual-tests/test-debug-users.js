// ユーザーテーブル確認テスト
async function testDebugUsers() {
  console.log('🔍 ユーザーテーブル確認テスト開始...')

  const baseUrl = 'http://localhost:45629'

  try {
    // 1. データベース初期化
    console.log('📍 Step 1: データベース初期化...')
    const initResponse = await fetch(`${baseUrl}/api/init-db`, {
      method: 'POST',
    })

    console.log('🔍 Init status:', initResponse.status)
    if (initResponse.ok) {
      const initData = await initResponse.json()
      console.log('✅ データベース初期化成功:', initData)
    }

    // 2. ユーザーテーブルの内容確認
    console.log('📍 Step 2: ユーザーテーブル確認...')
    const usersResponse = await fetch(`${baseUrl}/api/debug-users`)

    console.log('🔍 Users debug status:', usersResponse.status)
    if (usersResponse.ok) {
      const usersData = await usersResponse.json()
      console.log('✅ ユーザーテーブル確認成功:', JSON.stringify(usersData, null, 2))
    } else {
      const error = await usersResponse.text()
      console.log('❌ ユーザーテーブル確認エラー:', error)
    }

    // 3. ログインテスト
    console.log('📍 Step 3: ログインテスト...')
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@school.local',
        password: 'password123',
      }),
    })

    console.log('🔍 Login status:', loginResponse.status)
    const loginData = await loginResponse.text()
    console.log('🔍 Login response:', loginData)
  } catch (error) {
    console.error('💥 テストエラー:', error)
  }
}

testDebugUsers().then(() => process.exit(0))
