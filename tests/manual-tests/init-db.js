// データベース初期化スクリプト
async function initializeDatabase() {
  try {
    console.log('📦 データベース初期化を開始...');
    
    const response = await fetch('http://localhost:8787/api/init-db', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    console.log('📊 初期化結果:', result);
    
    if (result.success) {
      console.log('✅ データベース初期化が完了しました');
    } else {
      console.log('❌ 初期化に失敗しました:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('💥 初期化エラー:', error);
    return { success: false, error: error.message };
  }
}

initializeDatabase().then(() => process.exit(0));