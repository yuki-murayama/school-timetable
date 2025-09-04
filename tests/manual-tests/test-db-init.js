// データベーステーブル完全再作成
async function recreateDatabase() {
  console.log('🔧 データベーステーブル完全再作成開始...');
  
  const baseUrl = 'http://localhost:38421';
  
  try {
    // 1. usersテーブルを削除
    console.log('📍 Step 1: usersテーブル削除...');
    const dropResponse = await fetch(baseUrl + '/api/test-drop-users', {
      method: 'POST'
    });
    console.log('🔍 Drop status:', dropResponse.status);
    
    if (dropResponse.ok) {
      const dropData = await dropResponse.json();
      console.log('✅ Drop result:', dropData);
    }
    
    // 2. データベース再初期化
    console.log('📍 Step 2: データベース再初期化...');
    const initResponse = await fetch(baseUrl + '/api/init-db', {
      method: 'POST'
    });
    console.log('🔍 Init status:', initResponse.status);
    
    if (initResponse.ok) {
      const initData = await initResponse.json();
      console.log('✅ Init result:', initData);
    }
    
    console.log('🎉 データベース再作成完了！');
    
  } catch (error) {
    console.error('💥 データベース再作成エラー:', error);
  }
}

recreateDatabase().then(() => process.exit(0));
