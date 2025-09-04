// テストユーザー強制挿入テスト
async function testForceUser() {
  console.log('🔧 テストユーザー強制挿入テスト開始...');
  
  const baseUrl = 'http://localhost:43247';
  
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
    
    // 2. テストユーザー強制挿入
    console.log('📍 Step 2: テストユーザー強制挿入...');
    const forceResponse = await fetch(baseUrl + '/api/force-test-user', {
      method: 'POST'
    });
    
    console.log('🔍 Force user status:', forceResponse.status);
    if (forceResponse.ok) {
      const forceData = await forceResponse.json();
      console.log('✅ テストユーザー強制挿入成功:', JSON.stringify(forceData, null, 2));
    } else {
      const error = await forceResponse.text();
      console.log('❌ テストユーザー挿入エラー:', error);
    }
    
    // 3. ユーザーテーブル確認
    console.log('📍 Step 3: ユーザーテーブル確認...');
    const usersResponse = await fetch(baseUrl + '/api/debug-users');
    
    console.log('🔍 Users debug status:', usersResponse.status);
    if (usersResponse.ok) {
      const usersData = await usersResponse.json();
      console.log('✅ ユーザーテーブル確認:', JSON.stringify(usersData, null, 2));
    }
    
    // 4. ログインテスト
    console.log('📍 Step 4: ログインテスト...');
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
      console.log('🎉 ログイン成功!', JSON.stringify(loginData, null, 2));
    } else {
      const loginError = await loginResponse.text();
      console.log('❌ ログインエラー:', loginError);
    }
    
  } catch (error) {
    console.error('💥 テストエラー:', error);
  }
}

testForceUser().then(() => process.exit(0));