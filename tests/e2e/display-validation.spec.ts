import { test, expect } from '@playwright/test';

test.describe('時間割表示バリデーション', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1:has-text("時間割管理")')).toBeVisible();
  });

  test('時間割詳細画面でのUI表示確認', async ({ page }) => {
    console.log('🔄 時間割詳細画面のUI表示テスト開始...');
    
    // コンソールログを収集
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(`[${msg.type()}] ${text}`);
      console.log(`🎯 [BROWSER LOG] ${text}`);
    });

    // 時間割参照画面に移動
    await page.click('a[href="/timetable"]');
    await page.waitForLoadState('networkidle');
    
    // 詳細ボタンを探す
    const detailButtons = page.locator('button:has-text("詳細を見る")');
    const buttonCount = await detailButtons.count();
    console.log(`📋 詳細ボタン数: ${buttonCount}`);
    
    if (buttonCount > 0) {
      // 最初の詳細ボタンをクリック
      console.log('🔍 最初の詳細ボタンをクリック...');
      await detailButtons.first().click();
      await page.waitForLoadState('networkidle');
      
      // 時間割テーブルを確認
      const timetableTable = page.locator('table');
      const tableExists = await timetableTable.count() > 0;
      console.log(`📊 時間割テーブル存在: ${tableExists}`);
      
      if (tableExists) {
        // テーブルの内容を確認
        const tableRows = page.locator('table tbody tr');
        const rowCount = await tableRows.count();
        console.log(`📏 テーブル行数: ${rowCount}`);
        
        // 各セルの内容を確認
        for (let i = 0; i < Math.min(rowCount, 3); i++) {
          const row = tableRows.nth(i);
          const cells = row.locator('td');
          const cellCount = await cells.count();
          console.log(`📐 行${i + 1}のセル数: ${cellCount}`);
          
          for (let j = 0; j < Math.min(cellCount, 7); j++) {
            const cell = cells.nth(j);
            const cellText = await cell.textContent();
            const cellInnerHTML = await cell.innerHTML();
            console.log(`🔤 行${i + 1}列${j + 1}: テキスト="${cellText}" HTML="${cellInnerHTML}"`);
          }
        }
        
        // 教科名と教師名を含むセルを特定検索
        const subjectCells = page.locator('table tbody td:has-text("保健体育"), table tbody td:has-text("英語A"), table tbody td:has-text("国語A"), table tbody td:has-text("美術"), table tbody td:has-text("社会A")');
        const subjectCount = await subjectCells.count();
        console.log(`📚 教科名を含むセル数: ${subjectCount}`);
        
        if (subjectCount > 0) {
          for (let i = 0; i < Math.min(subjectCount, 5); i++) {
            const cell = subjectCells.nth(i);
            const cellText = await cell.textContent();
            console.log(`✅ 教科セル${i + 1}: "${cellText}"`);
          }
        } else {
          console.log('❌ 教科名が含まれるセルが見つかりません');
          
          // 全てのセルの内容をデバッグ出力
          const allCells = page.locator('table tbody td');
          const allCellCount = await allCells.count();
          console.log(`🔍 全セル数: ${allCellCount}`);
          
          for (let i = 0; i < Math.min(allCellCount, 20); i++) {
            const cell = allCells.nth(i);
            const cellText = await cell.textContent();
            const cellHTML = await cell.innerHTML();
            console.log(`🔍 セル${i + 1}: テキスト="${cellText}" HTML="${cellHTML}"`);
          }
        }
      }
    } else {
      console.log('❌ 詳細ボタンが見つかりません');
    }
    
    // テスト終了
    console.log('🏁 UI表示テスト完了');
  });
});