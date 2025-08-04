import { test, expect } from '@playwright/test';

// 認証済みユーザーでテストを実行
test.use({ storageState: 'tests/e2e/.auth/user.json' });

test.describe('時間割変換詳細デバッグ', () => {
  test('convertFromGeneratedFormat関数の詳細デバッグ', async ({ page }) => {
    console.log('🔍 時間割変換プロセスの詳細デバッグ開始...');
    
    // コンソールログを収集
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(`[${msg.type()}] ${text}`);
      
      // 重要なログのみ表示
      if (text.includes('生成済み時間割') || 
          text.includes('スロット検索') || 
          text.includes('スロット[') ||
          text.includes('比較結果') ||
          text.includes('授業内容') ||
          text.includes('マッチしたスロット') ||
          text.includes('No subject data found')) {
        console.log(`🎯 [BROWSER] ${text}`);
      }
    });
    
    await page.goto('https://school-timetable-monorepo.grundhunter.workers.dev');
    await page.waitForLoadState('networkidle');
    
    // 時間割参照画面に移動
    await page.click('a[href="/timetable-view"], button:has-text("時間割参照")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // 最初の生成済み時間割を探す
    const timetableCards = page.locator('[data-testid="timetable-card"], .border.rounded-lg, h3');
    const cardCount = await timetableCards.count();
    
    console.log(`📋 Found ${cardCount} timetable entries`);
    
    if (cardCount > 0) {
      for (let i = 0; i < Math.min(cardCount, 3); i++) {
        const card = timetableCards.nth(i);
        const cardText = await card.textContent();
        
        if (cardText && (cardText.includes('%') || cardText.includes('program'))) {
          console.log(`✅ Testing timetable ${i + 1}: ${cardText.substring(0, 100)}...`);
          
          const detailButton = card.locator('button:has-text("詳細を見る")').first();
          if (await detailButton.count() > 0) {
            await detailButton.click();
            await page.waitForTimeout(5000); // 変換処理完了を待機
            
            // 1年1組タブがアクティブであることを確認
            const grade1Tab = page.getByRole('tab', { name: '1年生' });
            const class1Tab = page.getByRole('tab', { name: '1組' });
            
            if (await grade1Tab.count() > 0) {
              await grade1Tab.click();
              await page.waitForTimeout(1000);
            }
            
            if (await class1Tab.count() > 0) {
              await class1Tab.click();
              await page.waitForTimeout(2000);
            }
            
            // テーブルデータを確認
            const tableCells = page.locator('table td');
            const cellCount = await tableCells.count();
            console.log(`📊 Table cells: ${cellCount}`);
            
            // セルの内容を詳細確認
            let hasSubjectData = false;
            for (let j = 0; j < Math.min(cellCount, 10); j++) {
              const cellText = await tableCells.nth(j).textContent();
              if (cellText && cellText.trim() && !cellText.match(/^[0-9]+$/) && cellText !== '時限') {
                console.log(`📚 Cell ${j}: "${cellText}"`);
                hasSubjectData = true;
              }
            }
            
            if (!hasSubjectData) {
              console.log('⚠️ No subject data found - analyzing console logs...');
              
              // 関連するコンソールログを表示
              const relevantLogs = consoleLogs.filter(log => 
                log.includes('生成済み時間割') || 
                log.includes('スロット検索') ||
                log.includes('比較結果') ||
                log.includes('マッチしたスロット')
              );
              
              console.log('📋 Relevant console logs:');
              relevantLogs.slice(-20).forEach((log, index) => {
                console.log(`  ${index + 1}: ${log}`);
              });
            } else {
              console.log('✅ Subject data found in table!');
            }
            
            // 一覧に戻る
            const backButton = page.locator('button:has-text("一覧に戻る")');
            if (await backButton.count() > 0) {
              await backButton.click();
              await page.waitForTimeout(1000);
            }
            
            break; // 1つテストできれば十分
          }
        }
      }
    }
    
    // 最終的なログダンプ
    console.log('\n📋 All Console Logs Summary:');
    const importantLogs = consoleLogs.filter(log => 
      log.includes('生成済み時間割') || 
      log.includes('スロット検索') ||
      log.includes('比較結果') ||
      log.includes('マッチしたスロット') ||
      log.includes('授業内容')
    );
    
    console.log(`Found ${importantLogs.length} important logs out of ${consoleLogs.length} total`);
    importantLogs.slice(-30).forEach((log, index) => {
      console.log(`${index + 1}: ${log}`);
    });
  });
});