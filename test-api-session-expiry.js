// 本番環境でのAPIセッション切れテスト
const API_BASE = 'https://school-timetable-monorepo.grundhunter.workers.dev/api';

console.log('🔍 本番環境セッション切れAPIテスト開始');

// テスト1: 有効なトークンでログイン
async function testValidLogin() {
  try {
    console.log('\n📍 Step 1: 有効な認証情報でログイン');
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'password123',
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ ログイン成功:', data.user?.name || 'ユーザー不明');
      return data.token;
    } else {
      const errorData = await response.json();
      console.log('❌ ログイン失敗:', errorData);
      return null;
    }
  } catch (error) {
    console.log('❌ ログインエラー:', error.message);
    return null;
  }
}

// テスト2: 無効なトークンでAPIアクセス
async function testInvalidToken() {
  try {
    console.log('\n📍 Step 2: 無効なトークンでAPIアクセス（セッション切れシミュレーション）');
    const response = await fetch(`${API_BASE}/school/settings`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer invalid_expired_token_12345',
        'Content-Type': 'application/json',
      },
    });
    
    console.log('📊 レスポンス情報:');
    console.log(`  - Status: ${response.status} ${response.statusText}`);
    console.log(`  - Headers: ${JSON.stringify([...response.headers.entries()])}`);
    
    if (response.status === 401) {
      const errorData = await response.json();
      console.log('✅ 期待される401エラー:', errorData);
      return true;
    } else {
      const responseData = await response.text();
      console.log('⚠️ 予期しないレスポンス:', responseData);
      return false;
    }
  } catch (error) {
    console.log('❌ APIエラー:', error.message);
    return false;
  }
}

// テスト3: 有効なトークンでAPIアクセス
async function testValidToken(token) {
  if (!token) {
    console.log('\n⚠️ Step 3: スキップ（有効なトークンが取得できませんでした）');
    return false;
  }
  
  try {
    console.log('\n📍 Step 3: 有効なトークンでAPIアクセス');
    const response = await fetch(`${API_BASE}/school/settings`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ 有効トークンでAPIアクセス成功');
      return true;
    } else {
      const errorData = await response.json();
      console.log('❌ 有効トークンAPIアクセス失敗:', errorData);
      return false;
    }
  } catch (error) {
    console.log('❌ APIエラー:', error.message);
    return false;
  }
}

// メイン実行
async function main() {
  console.log('🚀 本番環境APIセッション切れテスト');
  console.log(`📡 API Base URL: ${API_BASE}\n`);
  
  // Step 1: 有効認証
  const validToken = await testValidLogin();
  
  // Step 2: 無効トークン（セッション切れシミュレーション）
  const invalidTokenTest = await testInvalidToken();
  
  // Step 3: 有効トークンで正常動作確認
  const validTokenTest = await testValidToken(validToken);
  
  console.log('\n📊 テスト結果サマリー:');
  console.log(`  - 有効ログイン: ${validToken ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`  - 無効トークン401エラー: ${invalidTokenTest ? '✅ 正常' : '❌ 異常'}`);
  console.log(`  - 有効トークンアクセス: ${validTokenTest ? '✅ 成功' : '❌ 失敗'}`);
  
  if (invalidTokenTest) {
    console.log('\n🎉 セッション切れAPI処理は正常に動作しています！');
  } else {
    console.log('\n⚠️ セッション切れAPI処理に問題があります。');
  }
}

main().catch(console.error);