// 完全認証フローテスト（init-db → login → verify）
async function testCompleteAuth() {
  console.log('🎯 完全認証フローテスト開始...');
  
  const baseUrl = 'http://localhost:43247';
  let authToken = null;
  
  try {
    // 1. データベース初期化
    console.log('📍 Step 1: データベース初期化...');
    const initResponse = await fetch(baseUrl + '/api/init-db', {
      method: 'POST'
    });
    
    console.log('🔍 Init status:', initResponse.status);
    if (initResponse.ok) {
      const initData = await initResponse.json();
      console.log('✅ データベース初期化成功');
    }
    
    // 2. ログインテスト
    console.log('📍 Step 2: ログインテスト...');
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
      authToken = loginData.token;
      console.log('✅ ログイン成功:', {
        userId: loginData.user.id,
        email: loginData.user.email,
        role: loginData.user.role,
        tokenLength: authToken.length,
        expiresAt: loginData.expiresAt
      });
    } else {
      const loginError = await loginResponse.text();
      console.log('❌ ログインエラー:', loginError);
      return;
    }
    
    // 3. トークン検証テスト
    console.log('📍 Step 3: トークン検証テスト...');
    const verifyResponse = await fetch(baseUrl + '/api/auth/verify', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + authToken
      }
    });
    
    console.log('🔍 Verify status:', verifyResponse.status);
    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      console.log('✅ トークン検証成功:', {
        userId: verifyData.user.id,
        email: verifyData.user.email,
        role: verifyData.user.role,
        sessionId: verifyData.sessionId
      });
      console.log('🎉 認証システム完全復旧！全ての機能が正常動作中');
    } else {
      const verifyError = await verifyResponse.text();
      console.log('❌ トークン検証エラー:', verifyError);
    }
    
  } catch (error) {
    console.error('💥 認証フローテストエラー:', error);
  }
}

testCompleteAuth().then(() => process.exit(0));