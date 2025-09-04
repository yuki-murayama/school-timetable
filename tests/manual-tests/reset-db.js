// データベーステーブル完全リセットスクリプト
async function resetDatabase() {
  try {
    console.log('💥 usersテーブルとuser_sessionsテーブルを削除...');
    
    // usersテーブルを削除
    let response = await fetch('http://localhost:8787/api/test-drop-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('📤 テーブル削除レスポンス:', response.status);
    const dropResult = await response.json();
    console.log('📋 削除結果:', dropResult);
    
    // 少し待機
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('🔄 データベース全体を再初期化...');
    
    // データベース再初期化
    response = await fetch('http://localhost:8787/api/init-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const result = await response.json();
    console.log('📊 再初期化結果:', result);
    
    if (result.success) {
      console.log('✅ データベースリセットが完了しました');
    } else {
      console.log('❌ リセットに失敗しました:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('💥 リセットエラー:', error);
    return { success: false, error: error.message };
  }
}

resetDatabase().then(() => process.exit(0));