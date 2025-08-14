/**
 * E2Eテスト全体のグローバルクリーンアップ
 * すべてのテスト終了後にテストデータの最終クリーンアップを実行
 */

import { chromium } from '@playwright/test';
import { TestDataCleanup } from './utils/test-data-cleanup';

async function globalCleanup() {
  console.log('🧹 グローバルE2Eテストクリーンアップ開始');
  
  const browser = await chromium.launch();
  const context = await browser.newContext({
    storageState: 'tests/e2e/.auth/user.json', // 認証状態を使用
    baseURL: 'https://school-timetable-monorepo.grundhunter.workers.dev'
  });
  
  const page = await context.newPage();
  const cleanup = new TestDataCleanup(page);
  
  try {
    // 残存しているテストデータパターンをすべてクリーンアップ
    await cleanup.cleanupByPattern([
      // 基本的なテストパターン
      { type: 'teacher', pattern: /テスト教師_\d+_[a-z0-9]{6}/i },
      { type: 'subject', pattern: /テスト科目_\d+_[a-z0-9]{6}/i },
      { type: 'classroom', pattern: /テスト教室_\d+_[a-z0-9]{6}/i },
      
      // 削除テスト用パターン
      { type: 'teacher', pattern: /削除テスト用教師_\d{4}-\d{2}-\d{2}/i },
      { type: 'subject', pattern: /削除テスト用教科_\d{4}-\d{2}-\d{2}/i },
      { type: 'classroom', pattern: /削除テスト用教室_\d{4}-\d{2}-\d{2}/i },
      
      // その他のテストパターン
      { type: 'teacher', pattern: /test.*teacher.*\d+/i },
      { type: 'subject', pattern: /test.*subject.*\d+/i },
      { type: 'classroom', pattern: /test.*classroom.*\d+/i },
      
      // 汎用テストパターン（cautiously）
      { type: 'teacher', pattern: /test_.*\d{13,}/i }, // タイムスタンプを含むテストデータ
      { type: 'subject', pattern: /test_.*\d{13,}/i },
      { type: 'classroom', pattern: /test_.*\d{13,}/i }
    ]);
    
    console.log('✅ グローバルクリーンアップ完了');
    
  } catch (error) {
    console.error('❌ グローバルクリーンアップでエラー:', error);
  } finally {
    await browser.close();
  }
}

export default globalCleanup;