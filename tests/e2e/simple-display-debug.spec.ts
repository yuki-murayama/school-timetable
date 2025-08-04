import { test, expect } from '@playwright/test'

test.describe('シンプル表示デバッグ', () => {
  test.beforeEach(async ({ page }) => {
    // 認証済み状態で開始
    await page.goto('/')
    
    // メニューを探してクリック（複数の可能性を試行）
    const menuSelectors = [
      'button:has-text("時間割管理")',
      'button:has-text("時間割")',
      'a:has-text("時間割")',
      'nav a:has-text("時間割")',
      '[href*="timetable"]'
    ];
    
    let found = false;
    for (const selector of menuSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.count() > 0) {
          console.log(`✅ Found menu with selector: ${selector}`);
          await element.click();
          found = true;
          break;
        }
      } catch (e) {
        console.log(`❌ Selector failed: ${selector}`);
      }
    }
    
    if (!found) {
      console.log('⚠️ No time table menu found, trying direct navigation');
      // 直接時間割ページに移動
      await page.goto('/#/timetable');
    }
    
    // ページが読み込まれるまで待機
    await page.waitForTimeout(2000);
  })

  test('convertToDisplayFormatのデバッグログを確認', async ({ page }) => {
    // コンソールログを収集
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(`[${msg.type()}] ${text}`);
      if (text.includes('convertToDisplayFormat呼び出し開始') || 
          text.includes('入力データ詳細') || 
          text.includes('convertFromGeneratedFormat実行完了')) {
        console.log(`🎯 [BROWSER LOG] ${text}`);
      }
    });

    // ページの状態を確認
    console.log('📋 現在のページURL:', page.url());
    await page.screenshot({ path: 'debug-page-state.png' });
    
    // 利用可能なボタンを確認
    const allButtons = page.locator('button');
    const buttonCount = await allButtons.count();
    console.log(`🔍 ページ内のボタン数: ${buttonCount}`);
    
    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const button = allButtons.nth(i);
      const text = await button.textContent();
      console.log(`   ボタン ${i + 1}: "${text}"`);
    }
    
    // 時間割関連のボタンを探す
    const timetableButtons = page.locator('button:has-text("詳細"), button:has-text("表示"), button:has-text("時間割")');
    const timetableButtonCount = await timetableButtons.count();
    console.log(`🔍 時間割関連ボタン数: ${timetableButtonCount}`);
    
    // まず時間割参照ボタンをクリックして一覧ページに移動
    console.log('🔍 時間割参照ボタンをクリック中...');
    await page.click('button:has-text("時間割参照")');
    await page.waitForTimeout(2000);
    
    // 詳細ボタンを探す
    const detailButtons = page.locator('button:has-text("詳細を見る"), button:has-text("詳細")');
    const detailButtonCount = await detailButtons.count();
    console.log(`🔍 詳細ボタン数: ${detailButtonCount}`);
    
    if (detailButtonCount > 0) {
      const firstButton = detailButtons.first();
      console.log('🔍 詳細ボタンをクリック中...');
      await firstButton.click();
      
      // ページ読み込み完了を待機
      await page.waitForTimeout(3000);
      
      // convertToDisplayFormatが呼ばれたかチェック
      const convertLogs = consoleLogs.filter(log => 
        log.includes('convertToDisplayFormat呼び出し開始')
      );
      
      console.log(`📊 convertToDisplayFormat呼び出し回数: ${convertLogs.length}`);
      convertLogs.forEach((log, index) => {
        console.log(`   ${index + 1}: ${log}`);
      });
      
      // 変換結果ログをチェック
      const resultLogs = consoleLogs.filter(log => 
        log.includes('convertFromGeneratedFormat実行完了')
      );
      
      console.log(`📊 変換結果ログ数: ${resultLogs.length}`);
      resultLogs.forEach((log, index) => {
        console.log(`   ${index + 1}: ${log}`);
      });
      
      // 現在のページ状態を確認
      const tables = page.locator('table');
      const tableCount = await tables.count();
      console.log(`📋 表示されているテーブル数: ${tableCount}`);
      
      if (tableCount > 0) {
        // 最初のテーブルの詳細な内容を確認
        const firstTable = tables.first();
        const cells = firstTable.locator('td');
        const cellCount = await cells.count();
        console.log(`📊 最初のテーブル詳細: セル数 ${cellCount}`);
        
        // 複数のセルの内容を確認（最初の10個）
        for (let i = 0; i < Math.min(cellCount, 10); i++) {
          const cell = cells.nth(i);
          const cellText = await cell.textContent();
          console.log(`   セル ${i + 1}: "${cellText}"`);
        }
        
        // 教科名や教師名が含まれているセルを探す
        const subjectCells = cells.filter({ hasText: /英語|数学|国語|理科|社会|保健体育|音楽|美術|技術|家庭|道徳|総合/ });
        const subjectCellCount = await subjectCells.count();
        console.log(`📚 教科名を含むセル数: ${subjectCellCount}`);
        
        if (subjectCellCount > 0) {
          for (let i = 0; i < Math.min(subjectCellCount, 5); i++) {
            const cell = subjectCells.nth(i);
            const cellText = await cell.textContent();
            console.log(`   教科セル ${i + 1}: "${cellText}"`);
          }
        }
        
        // 教師名が含まれているセルを探す
        const teacherCells = cells.filter({ hasText: /先生/ });
        const teacherCellCount = await teacherCells.count();
        console.log(`👨‍🏫 教師名を含むセル数: ${teacherCellCount}`);
        
        if (teacherCellCount > 0) {
          for (let i = 0; i < Math.min(teacherCellCount, 5); i++) {
            const cell = teacherCells.nth(i);
            const cellText = await cell.textContent();
            console.log(`   教師セル ${i + 1}: "${cellText}"`);
          }
        }
      }
    } else {
      console.log('❌ 詳細ボタンが見つかりません');
    }
  });
});