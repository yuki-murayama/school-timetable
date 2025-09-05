// データベースユーザー確認テスト
async function testDbUsers() {
  console.log('🔍 データベースユーザー確認テスト開始...')

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

    // 2. ユーザーテーブルの内容確認のためのAPIエンドポイントを呼び出し
    console.log('📍 Step 2: ユーザーテーブル確認...')

    // 直接SQLクエリでユーザーを確認するAPIエンドポイントを作成する必要がある
    // 今はログインエンドポイントのデバッグログを使って間接的に確認

    console.log('📍 Step 3: ログインテストでユーザー存在確認...')
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

testDbUsers().then(() => process.exit(0))
