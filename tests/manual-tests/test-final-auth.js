// 最終認証テスト - データベース構造確認とログイン検証
async function finalAuthTest() {
  console.log('🔧 最終認証テスト開始...')

  const baseUrl = 'http://localhost:46033'

  try {
    // 1. usersテーブルを削除
    console.log('📍 Step 1: usersテーブル削除...')
    const dropResponse = await fetch(`${baseUrl}/api/test-drop-users`, {
      method: 'POST',
    })
    console.log('🔍 Drop status:', dropResponse.status)

    console.log('🔍 Temp debug endpoint status:', response.status)

    if (response.ok) {
      const debugData = await response.json()
      console.log('✅ Temp debug endpoint response:', debugData)
    } else {
      console.log('❌ Temp debug endpoint error:', response.status, await response.text())
    }

    // 2. 一時的認証ログインエンドポイントをテスト
    console.log('📍 新しい一時的認証ログインエンドポイント /api/temp-auth/login をテスト...')

    response = await fetch(`${baseUrl}/api/temp-auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@school.local',
        password: 'password123',
      }),
    })

    console.log('🔍 Temp login endpoint status:', response.status)

    if (response.ok) {
      const loginData = await response.json()
      console.log('✅ Temp login endpoint response:', loginData)
    } else {
      console.log('❌ Temp login endpoint error:', response.status, await response.text())
    }

    // 3. 古い認証エンドポイントの状況確認
    console.log('📍 古い認証エンドポイント /api/auth/debug の状況確認...')

    response = await fetch(`${baseUrl}/api/auth/debug`)
    console.log('🔍 Old auth debug status:', response.status)

    if (response.ok) {
      const oldData = await response.json()
      console.log('⚠️ Old auth debug still works:', oldData)
    } else {
      console.log('✅ Old auth debug properly disabled:', response.status)
    }

    // 4. 古い認証ログインエンドポイントの状況確認
    console.log('📍 古い認証ログインエンドポイント /api/auth/login の状況確認...')

    response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@school.local',
        password: 'password123',
      }),
    })

    console.log('🔍 Old auth login status:', response.status)

    if (response.ok) {
      const oldLoginData = await response.json()
      console.log('⚠️ Old auth login still works:', oldLoginData)
    } else {
      console.log('✅ Old auth login properly disabled:', response.status)
    }
  } catch (error) {
    console.error('💥 テストエラー:', error)
  }
}

finalAuthTest().then(() => process.exit(0))
