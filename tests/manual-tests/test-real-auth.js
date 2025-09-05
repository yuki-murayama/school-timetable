// 実際のソースコードでの認証テスト
async function testRealAuth() {
  console.log('🔧 実際のソースコードでの認証テスト開始...')

  const baseUrl = 'http://localhost:40651'

  try {
    // 1. データベース初期化（worker.tsから）
    console.log('📍 Step 1: データベース初期化...')
    const initResponse = await fetch(`${baseUrl}/api/init-db`, {
      method: 'POST',
    })

    console.log('🔍 Init status:', initResponse.status)
    if (initResponse.ok) {
      const initData = await initResponse.json()
      console.log('✅ データベース初期化成功:', initData)
    } else {
      const error = await initResponse.text()
      console.log('❌ データベース初期化エラー:', error)
    }

    // 2. 認証デバッグエンドポイント（auth.tsから）
    console.log('📍 Step 2: 認証デバッグテスト...')
    const debugResponse = await fetch(`${baseUrl}/api/auth/debug`)

    console.log('🔍 Debug status:', debugResponse.status)
    if (debugResponse.ok) {
      const debugData = await debugResponse.json()
      console.log('✅ 認証デバッグ成功:', debugData)
    } else {
      const error = await debugResponse.text()
      console.log('❌ 認証デバッグエラー:', error)
    }

    // 3. ログインテスト（auth.tsから）
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
      console.log('🎉 ログイン成功!', {
        userId: loginData.user.id,
        email: loginData.user.email,
        role: loginData.user.role,
        tokenLength: loginData.token.length,
        expiresAt: loginData.expiresAt,
      })

      // 4. トークン検証テスト
      console.log('📍 Step 4: トークン検証テスト...')
      const verifyResponse = await fetch(`${baseUrl}/api/auth/verify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${loginData.token}`,
        },
      })

      console.log('🔍 Verify status:', verifyResponse.status)
      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json()
        console.log('✅ トークン検証成功:', {
          userId: verifyData.user.id,
          email: verifyData.user.email,
          role: verifyData.user.role,
          sessionId: verifyData.sessionId,
        })
        console.log('🎉 実際のソースコードでの認証システム完全動作確認！')
      } else {
        const verifyError = await verifyResponse.text()
        console.log('❌ トークン検証エラー:', verifyError)
      }
    } else {
      const loginError = await loginResponse.text()
      console.log('❌ ログインエラー:', loginError)
    }
  } catch (error) {
    console.error('💥 認証テストエラー:', error)
  }
}

testRealAuth().then(() => process.exit(0))
