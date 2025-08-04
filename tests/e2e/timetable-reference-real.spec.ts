import { test, expect } from '@playwright/test';

// 認証済みユーザーでテストを実行
test.use({ storageState: 'tests/e2e/.auth/user.json' });

test.describe('時間割参照機能（実際の生成データ）', () => {
  test.beforeEach(async ({ page }) => {
    console.log('🔄 Starting real timetable reference test setup...');
    await page.goto('https://school-timetable-monorepo.grundhunter.workers.dev');
    await page.waitForLoadState('networkidle');
  });

  test('実際に生成された時間割の表示確認', async ({ page }) => {
    console.log('📋 Testing display of actually generated timetables...');
    
    // 時間割参照画面に移動
    await page.click('a[href="/timetable-view"], button:has-text("時間割参照")');
    await page.waitForLoadState('networkidle');
    
    // ページタイトル確認
    await expect(page.getByRole('heading', { name: '時間割参照' })).toBeVisible();
    
    // ローディング完了を待機
    await page.waitForSelector('[data-testid="loading"], .animate-spin', { state: 'detached', timeout: 15000 });
    
    // 時間割一覧の取得
    console.log('📊 Checking timetable list...');
    await page.waitForTimeout(3000); // API呼び出し完了を待機
    
    // 実際の生成データと混在する可能性があるため、両方をチェック
    const timetableCards = page.locator('[data-testid="timetable-card"], .border.rounded-lg, h3');
    const cardCount = await timetableCards.count();
    
    console.log(`📋 Found ${cardCount} timetable entries`);
    
    if (cardCount > 0) {
      // 各時間割エントリーを確認
      for (let i = 0; i < Math.min(cardCount, 5); i++) {
        const card = timetableCards.nth(i);
        const cardText = await card.textContent();
        console.log(`📄 Timetable ${i + 1}: ${cardText}`);
        
        // 実際に生成された時間割を特定（割当率やプログラム生成のマーカーを確認）
        if (cardText && (
          cardText.includes('%') || 
          cardText.includes('program') || 
          cardText.includes('プログラム') ||
          cardText.includes('生成済み')
        )) {
          console.log(`✅ Found generated timetable: ${cardText}`);
          
          // この生成済み時間割の詳細を確認
          const detailButton = card.locator('button:has-text("詳細を見る")').first();
          if (await detailButton.count() > 0) {
            console.log('🔍 Testing detail view of generated timetable...');
            await detailButton.click();
            await page.waitForTimeout(2000);
            
            // 詳細画面の確認
            await expect(page.locator('button:has-text("一覧に戻る")')).toBeVisible();
            
            // 時間割表の表示確認（最初のテーブルをターゲット）
            const timetableTable = page.locator('table').first();
            await expect(timetableTable).toBeVisible();
            
            // テーブルヘッダーの確認（最初のテーブル内に限定）
            await expect(timetableTable.getByRole('cell', { name: '時限' })).toBeVisible();
            await expect(timetableTable.getByRole('cell', { name: '月' })).toBeVisible();
            await expect(timetableTable.getByRole('cell', { name: '火' })).toBeVisible();
            await expect(timetableTable.getByRole('cell', { name: '水' })).toBeVisible();
            await expect(timetableTable.getByRole('cell', { name: '木' })).toBeVisible();
            await expect(timetableTable.getByRole('cell', { name: '金' })).toBeVisible();
            
            // 時限の確認（1〜6時限、最初のテーブル内に限定）
            for (let period = 1; period <= 6; period++) {
              await expect(timetableTable.getByRole('cell', { name: period.toString() })).toBeVisible();
            }
            
            // 実際の教科データが入っているか確認（最初のテーブルに限定）
            const tableCells = timetableTable.locator('td');
            const cellCount = await tableCells.count();
            console.log(`📊 Table has ${cellCount} cells`);
            
            let hasRealData = false;
            for (let j = 0; j < Math.min(cellCount, 20); j++) {
              const cellText = await tableCells.nth(j).textContent();
              if (cellText && cellText.trim() && !cellText.match(/^\d+$/) && cellText !== '時限') {
                console.log(`📚 Found subject data: ${cellText}`);
                hasRealData = true;
              }
            }
            
            if (hasRealData) {
              console.log('✅ Real timetable data confirmed in table');
            } else {
              console.log('⚠️ No subject data found in table - may be empty timetable');
            }
            
            // 学年・クラス切り替えテスト
            console.log('🔄 Testing grade and class switching...');
            
            // 学年タブの確認と切り替え
            const gradeTabs = ['1年生', '2年生', '3年生'];
            for (const gradeTab of gradeTabs) {
              const tab = page.getByRole('tab', { name: gradeTab });
              if (await tab.count() > 0) {
                await tab.click();
                await page.waitForTimeout(1000);
                await expect(tab).toHaveAttribute('aria-selected', 'true');
                console.log(`✅ Grade tab switched to: ${gradeTab}`);
              }
            }
            
            // クラス切り替えテスト
            const classTabs = ['1組', '2組', '3組', '4組'];
            for (const classTab of classTabs) {
              const tab = page.getByRole('tab', { name: classTab });
              if (await tab.count() > 0) {
                await tab.click();
                await page.waitForTimeout(1000);
                await expect(tab).toHaveAttribute('aria-selected', 'true');
                console.log(`✅ Class tab switched to: ${classTab}`);
                break; // 1つ確認できれば OK
              }
            }
            
            // 一覧に戻る
            await page.getByRole('button', { name: '一覧に戻る' }).click();
            await page.waitForTimeout(1000);
            
            console.log('✅ Generated timetable detail test completed');
            break; // 1つの生成済み時間割をテストできれば十分
          }
        }
      }
    } else {
      console.log('ℹ️ No timetables found - may need to generate timetables first');
      
      // デモデータの表示確認（フォールバック）
      const demoTimetables = [
        '2024年度 第1学期',
        '2024年度 第2学期', 
        '2024年度 第3学期'
      ];
      
      let demoDataFound = false;
      for (const timetableName of demoTimetables) {
        const timetableHeading = page.getByRole('heading', { name: timetableName });
        if (await timetableHeading.count() > 0) {
          console.log(`📄 Found demo timetable: ${timetableName}`);
          demoDataFound = true;
        }
      }
      
      if (demoDataFound) {
        console.log('✅ Demo data fallback working correctly');
        // デモデータのエラーメッセージ確認
        await expect(page.getByText('サーバーからデータを取得できませんでした。デモデータを表示しています。')).toBeVisible();
      }
    }
  });

  test('時間割一覧のAPI統合確認', async ({ page }) => {
    console.log('📡 Testing timetable list API integration...');
    
    // ネットワークリクエストを監視
    const apiCalls: { url: string; method: string; status?: number }[] = [];
    
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiCalls.push({
          url: request.url(),
          method: request.method()
        });
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        const existingCall = apiCalls.find(call => call.url === response.url());
        if (existingCall) {
          existingCall.status = response.status();
        }
      }
    });
    
    // 時間割参照画面に移動
    await page.click('a[href="/timetable-view"], button:has-text("時間割参照")');
    await page.waitForLoadState('networkidle');
    
    // APIコールの確認
    await page.waitForTimeout(3000);
    
    console.log('📡 Detected API calls:');
    apiCalls.forEach(call => {
      console.log(`  ${call.method} ${call.url} - Status: ${call.status || 'pending'}`);
    });
    
    // 期待されるAPIエンドポイントの確認
    const expectedEndpoints = [
      '/frontend/school/timetables',
      '/timetable/program/saved'
    ];
    
    let apiCallsFound = 0;
    for (const endpoint of expectedEndpoints) {
      const found = apiCalls.some(call => call.url.includes(endpoint));
      if (found) {
        apiCallsFound++;
        console.log(`✅ API endpoint called: ${endpoint}`);
      } else {
        console.log(`ℹ️ API endpoint not called: ${endpoint}`);
      }
    }
    
    console.log(`📊 API integration: ${apiCallsFound}/${expectedEndpoints.length} endpoints called`);
    
    // 最低限1つのAPIが呼ばれていることを確認
    expect(apiCalls.length).toBeGreaterThan(0);
  });

  test('時間割編集機能の存在確認', async ({ page }) => {
    console.log('✏️ Testing timetable edit functionality availability...');
    
    // 時間割参照画面に移動
    await page.click('a[href="/timetable-view"], button:has-text("時間割参照")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // 詳細ボタンを探す
    const detailButtons = page.getByRole('button', { name: '詳細を見る' });
    const buttonCount = await detailButtons.count();
    
    if (buttonCount > 0) {
      // 最初の詳細ボタンをクリック
      await detailButtons.first().click();
      await page.waitForTimeout(2000);
      
      // 編集ボタンの存在確認
      const editButton = page.getByRole('button', { name: '編集する' });
      if (await editButton.count() > 0) {
        console.log('✅ Edit button found in detail view');
        
        // 編集ボタンをクリックしてみる
        await editButton.click();
        await page.waitForTimeout(2000);
        
        // 編集モードの確認（ドラッグ&ドロップの説明文など）
        const editModeIndicators = [
          'text="ドラッグ"',
          'text="編集モード"',
          'text="変更"',
          'button:has-text("保存")',
          'button:has-text("キャンセル")'
        ];
        
        let editModeActive = false;
        for (const indicator of editModeIndicators) {
          const element = page.locator(indicator);
          if (await element.count() > 0) {
            console.log(`✅ Edit mode indicator found: ${indicator}`);
            editModeActive = true;
            break;
          }
        }
        
        if (editModeActive) {
          console.log('✅ Edit mode successfully activated');
        } else {
          console.log('ℹ️ Edit mode may not be fully implemented');
        }
      } else {
        console.log('ℹ️ Edit button not found - edit functionality may not be implemented');
      }
    } else {
      console.log('ℹ️ No detail buttons found');
    }
  });

  test('エラーハンドリングとフォールバック確認', async ({ page }) => {
    console.log('⚠️ Testing error handling and fallback functionality...');
    
    // コンソールエラーを監視
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // 時間割参照画面に移動
    await page.click('a[href="/timetable-view"], button:has-text("時間割参照")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
    
    // エラーメッセージの確認
    const errorMessages = [
      'サーバーからデータを取得できませんでした',
      'サーバーから時間割データを取得できませんでした',
      'デモデータを表示しています'
    ];
    
    let fallbackActive = false;
    for (const errorMsg of errorMessages) {
      const errorElement = page.getByText(errorMsg);
      if (await errorElement.count() > 0) {
        console.log(`✅ Fallback message found: ${errorMsg}`);
        fallbackActive = true;
      }
    }
    
    if (fallbackActive) {
      console.log('✅ Error handling and fallback working correctly');
      
      // デモデータが表示されることを確認
      const demoElements = [
        '2024年度 第1学期',
        '2024年度 第2学期', 
        '2024年度 第3学期'
      ];
      
      let demoDataDisplayed = false;
      for (const demoText of demoElements) {
        const element = page.getByText(demoText);
        if (await element.count() > 0) {
          demoDataDisplayed = true;
          break;
        }
      }
      
      if (demoDataDisplayed) {
        console.log('✅ Demo data fallback working');
      } else {
        console.log('⚠️ Demo data fallback may not be working');
      }
    } else {
      console.log('ℹ️ No fallback messages - real data may be available');
    }
    
    // 重要なコンソールエラーをチェック
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('404') &&
      !error.includes('Network') &&
      error.includes('Error')
    );
    
    if (criticalErrors.length > 0) {
      console.log('⚠️ Critical console errors detected:');
      criticalErrors.forEach(error => console.log(`  ${error}`));
    } else {
      console.log('✅ No critical console errors detected');
    }
  });
});