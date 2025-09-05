// 基本認証機能テスト
async function testBasicAuth() {
  console.log('🔧 基本認証機能テスト開始...')

  const baseUrl = 'http://localhost:39485'

  try {
    // 1. 認証デバッグエンドポイントテスト
    console.log('📍 Step 1: 認証デバッグテスト...')
    const debugResponse = await fetch(`${baseUrl}/api/auth/debug`)

    console.log('🔍 Debug status:', debugResponse.status)
    if (debugResponse.ok) {
      const debugData = await debugResponse.json()
      console.log('✅ Debug result:', debugData)
    }

    // 2. ログインテスト
    console.log('📍 Step 2: ログインテスト...')
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

      // 3. トークン検証テスト
      console.log('📍 Step 3: トークン検証テスト...')
      const verifyResponse = await fetch(`${baseUrl}/api/auth/verify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${loginData.token}`,
        },
      })

      console.log('🔍 Verify status:', verifyResponse.status)
      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json()
        console.log('✅ トークン検証成功:', verifyData)
      }
    } else {
      const errorText = await loginResponse.text()
      console.log('❌ ログインエラー:', errorText)
    }
  } catch (error) {
    console.error('💥 認証テストエラー:', error)
  }
}

testBasicAuth().then(() => process.exit(0))
