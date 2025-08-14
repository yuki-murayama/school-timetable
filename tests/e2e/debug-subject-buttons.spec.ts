import { test, expect } from '@playwright/test';

test('Debug - Subject edit and delete buttons investigation', async ({ page }) => {
  console.log('🔍 教科編集・削除ボタンのデバッグ調査開始');
  
  // Navigate to the application
  await page.goto('https://school-timetable-monorepo.grundhunter.workers.dev/');
  await page.waitForLoadState('networkidle');
  
  // Check if we need to sign in
  const signInButton = page.getByText('Sign In');
  if (await signInButton.isVisible()) {
    console.log('📝 サインインが必要です');
    await signInButton.click();
    await page.fill('input[name="identifier"]', 'test@liblock.co.jp');
    await page.fill('input[name="password"]', '6dZFtWns9hEDX8i');
    await page.press('input[name="password"]', 'Enter');
    await page.waitForLoadState('networkidle');
  }
  
  // Navigate to data registration
  console.log('🚀 データ登録画面への移動');
  const dataButton = page.getByText('データ登録');
  if (await dataButton.isVisible()) {
    await dataButton.click();
    await page.waitForLoadState('networkidle');
  }
  
  // Switch to subject tab
  console.log('📚 教科情報タブに切り替え');
  const subjectTab = page.getByText('教科情報');
  if (await subjectTab.isVisible()) {
    await subjectTab.click();
    await page.waitForTimeout(3000);
  }
  
  // Debug: Check what's actually in the page
  console.log('🔍 現在のページ内容を調査...');
  
  // Check if subjects table exists
  const table = page.locator('table').first();
  const tableExists = await table.count() > 0;
  console.log(`📊 テーブル存在: ${tableExists}`);
  
  if (tableExists) {
    // Check table headers
    const headers = await table.locator('thead th').allTextContents();
    console.log('📋 テーブルヘッダー:', headers);
    
    // Check table rows
    const rows = table.locator('tbody tr');
    const rowCount = await rows.count();
    console.log(`📊 テーブル行数: ${rowCount}`);
    
    if (rowCount > 0) {
      // Check first few rows for buttons
      for (let i = 0; i < Math.min(5, rowCount); i++) {
        const row = rows.nth(i);
        const rowText = await row.textContent();
        console.log(`行 ${i + 1}: ${rowText?.substring(0, 100)}...`);
        
        // Look for edit and delete buttons
        const editButtons = row.locator('button:has(svg)');
        const buttonCount = await editButtons.count();
        console.log(`  ボタン数: ${buttonCount}`);
        
        if (buttonCount > 0) {
          for (let j = 0; j < buttonCount; j++) {
            const button = editButtons.nth(j);
            const buttonText = await button.textContent();
            const hasEditIcon = await button.locator('svg').count() > 0;
            console.log(`    ボタン ${j + 1}: テキスト="${buttonText}" アイコン=${hasEditIcon}`);
          }
        }
      }
    }
  }
  
  // Look for any button with edit or delete related classes/attributes
  console.log('🔍 編集・削除ボタンを直接検索...');
  const editButtons = page.locator('button:has-text("編集"), button[aria-label*="edit"], button[aria-label*="編集"]');
  const deleteButtons = page.locator('button:has-text("削除"), button[aria-label*="delete"], button[aria-label*="削除"]');
  const iconButtons = page.locator('button:has(svg)');
  
  console.log(`編集ボタン数: ${await editButtons.count()}`);
  console.log(`削除ボタン数: ${await deleteButtons.count()}`);
  console.log(`アイコンボタン数: ${await iconButtons.count()}`);
  
  // Take a screenshot for debugging
  await page.screenshot({ path: 'debug-subject-table.png', fullPage: true });
  console.log('📸 デバッグ用スクリーンショット保存: debug-subject-table.png');
  
  console.log('✅ 調査完了');
});