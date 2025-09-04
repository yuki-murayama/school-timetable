// データベース初期化テストスクリプト
const { test, expect } = require('@playwright/test');

test.describe('統一テストデータ管理システムテスト', () => {
  test('統一テストデータ管理APIの動作確認', async ({ page }) => {
    // 統一テストデータ管理APIを使用してテストデータを準備・クリーンアップ
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:38681';
    
    // テストデータ準備
    const prepareResponse = await page.request.post(`${baseURL}/api/test-data/prepare`, {
      data: {
        includeTeachers: true,
        includeSubjects: true,
        includeClassrooms: true,
        teacherCount: 3,
        subjectCount: 2,
        classroomCount: 2
      }
    });
    
    expect(prepareResponse.status()).toBe(200);
    
    const prepareResult = await prepareResponse.json();
    console.log('📊 統一テストデータ準備結果:', prepareResult);
    
    expect(prepareResult.success).toBe(true);
    expect(prepareResult.message).toContain('統一テストデータ準備完了');
    
    // ステータス確認
    const statusResponse = await page.request.get(`${baseURL}/api/test-data/status`);
    expect(statusResponse.status()).toBe(200);
    
    const statusResult = await statusResponse.json();
    console.log('📊 テストデータ状況:', statusResult);
    
    expect(statusResult.success).toBe(true);
    expect(statusResult.data.hasBackup).toBe(true);
    
    // クリーンアップ
    const cleanupResponse = await page.request.post(`${baseURL}/api/test-data/cleanup`);
    expect(cleanupResponse.status()).toBe(200);
    
    const cleanupResult = await cleanupResponse.json();
    console.log('📊 統一テストデータクリーンアップ結果:', cleanupResult);
    
    expect(cleanupResult.success).toBe(true);
    expect(cleanupResult.message).toContain('統一テストデータクリーンアップ完了');
  });

  test('アプリケーション画面の基本ロード確認', async ({ page }) => {
    // Clerk認証画面をスキップしてアプリが基本的にロードするかを確認
    await page.goto('http://localhost:5174/');
    
    // ページタイトル確認
    await expect(page).toHaveTitle(/School Timetable/);
    
    // 基本要素の存在確認（認証画面でもページ構造は確認できる）
    const body = await page.locator('body').first();
    await expect(body).toBeVisible();
    
    console.log('✅ アプリケーション画面の基本ロードが完了しました');
  });
});