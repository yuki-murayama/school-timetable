// 認証システム完全テスト
async function testAuthComplete() {
  console.log('🔧 認証システム完全テスト開始...');
  
  const baseUrl = 'http://localhost:38421';
  
  try {
    // 1. データベース再初期化
    console.log('📍 Step 1: データベース再初期化...');
    const initResponse = await fetch(baseUrl + '/api/init-db', {
      method: 'POST'
    });
    
    console.log('🔍 Init status:', initResponse.status);
    if (initResponse.ok) {
      const initData = await initResponse.json();
      console.log('✅ データベース初期化成功:', initData);
    }
    
    // 2. 認証デバッグエンドポイントテスト
    console.log('📍 Step 2: 認証デバッグエンドポイントテスト...');
    const debugResponse = await fetch(baseUrl + '/api/auth/debug');
    
    console.log('🔍 Auth debug status:', debugResponse.status);
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
    } else {
      const errorText = await loginResponse.text();
      console.log('❌ ログインエラー:', errorText);
    }
    
  } catch (error) {
    console.error('💥 認証テストエラー:', error);
  }
}

testAuthComplete().then(() => process.exit(0));
