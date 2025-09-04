// 完全な認証システムテスト
async function completeAuthTest() {
  console.log('🎯 完全な認証システムテスト開始...');
  
  const baseUrl = 'http://localhost:35037';
  
  try {
    // 1. データベース初期化
    console.log('📍 Step 1: データベース初期化...');
    const initResponse = await fetch(baseUrl + '/api/init-db', {
      method: 'POST'
    });
    
    console.log('🔍 Init status:', initResponse.status);
    if (initResponse.ok) {
      const initData = await initResponse.json();
      console.log('✅ データベース初期化成功:', initData);
    }
    
    // 2. 認証デバッグエンドポイントテスト
    console.log('📍 Step 2: 認証デバッグテスト...');
    const debugResponse = await fetch(baseUrl + '/api/auth/debug');
    
    console.log('🔍 Debug status:', debugResponse.status);
    if (debugResponse.ok) {
      const debugData = await debugResponse.json();
      console.log('✅ 認証デバッグ成功:', debugData);
    }
    
    // 3. ログインテスト
    console.log('📍 Step 3: ログインテスト...');
    const loginResponse = await fetch(baseUrl + '/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@school.local',
        password: 'password123'
      })
    });
    
    console.log('🔍 Login status:', loginResponse.status);
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('🎉 ログイン成功!', loginData);
      
      // 4. トークン検証テスト
      console.log('📍 Step 4: トークン検証テスト...');
      const verifyResponse = await fetch(baseUrl + '/api/auth/verify', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + loginData.token
        }
      });
      
      console.log('🔍 Verify status:', verifyResponse.status);
      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        console.log('✅ トークン検証成功:', verifyData);
        console.log('🏆 認証システム完全復旧！');
      } else {
        const verifyError = await verifyResponse.text();
        console.log('⚠️ トークン検証エラー:', verifyError);
      }
      
    } else {
      const errorText = await loginResponse.text();
      console.log('❌ ログインエラー:', errorText);
    }
    
  } catch (error) {
    console.error('💥 認証テストエラー:', error);
  }
}

completeAuthTest().then(() => process.exit(0));
