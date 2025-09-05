// usersテーブル修正と認証テスト
async function fixAndTestAuth() {
  console.log('🔧 usersテーブル修正と認証テスト開始...')

  const baseUrl = 'http://localhost:33781'

  try {
    // 1. usersテーブル修正
    console.log('📍 Step 1: usersテーブル修正...')
    const fixResponse = await fetch(`${baseUrl}/api/fix-users-table`, {
      method: 'POST',
    })

    console.log('🔍 Fix status:', fixResponse.status)
    if (fixResponse.ok) {
      const fixData = await fixResponse.json()
      console.log('✅ Fix result:', fixData)
    }

    // 2. 認証デバッグエンドポイントテスト
    console.log('📍 Step 2: 認証デバッグテスト...')
    const debugResponse = await fetch(`${baseUrl}/api/auth/debug`)

    console.log('🔍 Debug status:', debugResponse.status)
    if (debugResponse.ok) {
      const debugData = await debugResponse.json()
      console.log('✅ Debug result:', debugData)
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

    if (loginResponse.ok) {
      const loginData = await loginResponse.json()
      console.log('🎉 ログイン成功!', loginData)
    } else {
      const errorText = await loginResponse.text()
      console.log('❌ ログインエラー:', errorText)
    }
  } catch (error) {
    console.error('💥 テストエラー:', error)
  }
}

fixAndTestAuth().then(() => process.exit(0))
