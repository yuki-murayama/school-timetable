/**
 * E2Eテスト全体のグローバルクリーンアップ
 * 統一テストデータ管理APIを使用してテストデータをクリーンアップ
 */

async function globalCleanup() {
  console.log('🧹 グローバルE2Eテストクリーンアップ開始');
  
  try {
    // 統一テストデータ管理APIを使用してクリーンアップ
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || process.env.E2E_BASE_URL || 'http://localhost:5174';
    
    const cleanupResponse = await fetch(`${baseURL}/api/test-data/cleanup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (cleanupResponse.ok) {
      const result = await cleanupResponse.json();
      console.log('✅ 統一テストデータクリーンアップ完了:', result.message);
    } else {
      console.error('❌ テストデータクリーンアップに失敗:', await cleanupResponse.text());
    }
    
  } catch (error) {
    console.error('❌ グローバルクリーンアップでエラー:', error);
  }
}

export default globalCleanup;