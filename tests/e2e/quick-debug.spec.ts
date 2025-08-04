import { test } from '@playwright/test'

test.describe('クイックデバッグ', () => {
  test('periodDataの内容を確認', async ({ page }) => {
    // 直接時間割詳細ページに移動
    await page.goto('/')
    await page.click('button:has-text("時間割参照")')
    await page.waitForTimeout(1000)
    
    // コンソールログを収集
    const logs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('📋') || text.includes('🔧') || text.includes('変換結果統計')) {
        console.log(`[LOG] ${text}`);
        logs.push(text);
      }
    });

    // 最初の詳細ボタンをクリック
    const detailButton = page.locator('button:has-text("詳細")').first();
    if (await detailButton.count() > 0) {
      await detailButton.click();
      await page.waitForTimeout(3000);
      
      console.log(`📊 収集されたログ数: ${logs.length}`);
    }
  });
});