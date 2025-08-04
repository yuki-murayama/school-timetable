import { test, expect } from '@playwright/test';

// 認証済みユーザーでテストを実行
test.use({ storageState: 'tests/e2e/.auth/user.json' });

test.describe('時間割データフロー詳細デバッグ', () => {
  test.beforeEach(async ({ page }) => {
    console.log('🔄 Starting debug test setup...');
    await page.goto('https://school-timetable-monorepo.grundhunter.workers.dev');
    await page.waitForLoadState('networkidle');
  });

  test('時間割詳細ページでのデータ流れを詳細デバッグ', async ({ page }) => {
    console.log('🔍 Debug: Testing detailed timetable data flow...');
    
    // コンソールログを収集
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(`[${msg.type()}] ${text}`);
      if (text.includes('時間割詳細データ分析') || 
          text.includes('生成済み時間割') || 
          text.includes('convertFromGeneratedFormat') ||
          text.includes('フォールバック時間割詳細データ分析') ||
          text.includes('スロット検索開始') ||
          text.includes('スロット[') ||
          text.includes('比較結果') ||
          text.includes('授業内容') ||
          text.includes('対象スロット検索結果') ||
          text.includes('厳密検索') ||
          text.includes('緩い検索') ||
          text.includes('詳細を見るボタンクリック検出') ||
          text.includes('handleViewTimetable呼び出し開始') ||
          text.includes('loadTimetableDetail呼び出し開始') ||
          text.includes('直接timetableDataを使用') ||
          text.includes('クラスデータ生成結果')) {
        console.log(`🎯 [BROWSER LOG] ${text}`);
      }
    });
    
    // ネットワークリクエストを監視
    const apiCalls: { url: string; method: string; status?: number }[] = [];
    
    page.on('request', request => {
      if (request.url().includes('/api/timetable/program/saved/')) {
        apiCalls.push({
          url: request.url(),
          method: request.method()
        });
        console.log(`🌐 [API REQUEST] ${request.method()} ${request.url()}`);
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/timetable/program/saved/')) {
        const existingCall = apiCalls.find(call => call.url === response.url());
        if (existingCall) {
          existingCall.status = response.status();
        }
        console.log(`📡 [API RESPONSE] ${response.status()} ${response.url()}`);
      }
    });
    
    // 時間割参照画面に移動
    await page.click('a[href="/timetable-view"], button:has-text("時間割参照")');
    await page.waitForLoadState('networkidle');
    
    // ローディング完了を待機
    await page.waitForSelector('[data-testid="loading"], .animate-spin', { 
      state: 'detached', 
      timeout: 15000 
    });
    
    await page.waitForTimeout(3000); // API呼び出し完了を待機
    
    // 詳細ボタンを探して最初のものをクリック
    const detailButtons = page.getByRole('button', { name: '詳細を見る' });
    const buttonCount = await detailButtons.count();
    
    console.log(`📋 Found ${buttonCount} detail buttons`);
    
    if (buttonCount > 0) {
      console.log('🔍 Clicking first detail button...');
      await detailButtons.first().click();
      await page.waitForTimeout(3000); // データ読み込み待機
      
      // ブラウザ内でのライブデバッグ - convertFromGeneratedFormat を直接実行
      const debugInfo = await page.evaluate(() => {
        // APIから返ってきた生データを取得
        const timetableApiData = window.localStorage.getItem('debug-timetable-data');
        
        // グローバルスコープから timetableUtils を取得
        const timetableUtils = (window as any).timetableUtils;
        
        if (!timetableUtils) {
          return { error: 'timetableUtils not found in global scope' };
        }
        
        // サンプルデータでテスト
        const sampleData = [
          [
            [
              {
                classGrade: 1,
                classSection: "1", 
                day: "月曜",
                period: 1,
                subject: { name: "テスト教科" },
                teacher: { name: "テスト先生" }
              }
            ]
          ]
        ];
        
        try {
          const converted = timetableUtils.convertFromGeneratedFormat(sampleData, 1, 1);
          return {
            success: true,
            sampleInput: sampleData,
            convertedOutput: converted,
            convertedType: typeof converted,
            isArray: Array.isArray(converted),
            length: converted ? converted.length : 0,
            firstItem: converted && converted[0] ? converted[0] : null,
          };
        } catch (error) {
          return {
            error: error.message,
            stack: error.stack
          };
        }
      });
      
      console.log('🔬 Browser Debug Info:', debugInfo);
      
      // 詳細画面でのテーブル確認
      const timetableTables = page.locator('table');
      const tableCount = await timetableTables.count();
      
      console.log(`📊 Found ${tableCount} tables in detail view`);
      
      if (tableCount > 0) {
        // 最初のテーブルのセル内容を詳細確認
        const firstTable = timetableTables.first();
        const cells = firstTable.locator('td');
        const cellCount = await cells.count();
        
        console.log(`🔍 First table has ${cellCount} cells`);
        
        // 最初の10セルの内容を確認
        for (let i = 0; i < Math.min(cellCount, 10); i++) {
          const cellText = await cells.nth(i).textContent();
          if (cellText && cellText.trim() && !cellText.match(/^\d+$/)) {
            console.log(`📚 Cell ${i}: "${cellText}"`);
          }
        }
        
        // 学年・クラス切り替えテスト
        console.log('🔄 Testing grade/class switching...');
        
        // 1年1組タブをクリック（デフォルト）
        const grade1Tab = page.getByRole('tab', { name: '1年生' });
        if (await grade1Tab.count() > 0) {
          await grade1Tab.click();
          await page.waitForTimeout(1000);
          console.log('✅ Switched to 1年生');
        }
        
        const class1Tab = page.getByRole('tab', { name: '1組' });
        if (await class1Tab.count() > 0) {
          await class1Tab.click();
          await page.waitForTimeout(1000);
          console.log('✅ Switched to 1組');
        }
        
        // 再度セル内容を確認
        await page.waitForTimeout(2000);
        const newCells = firstTable.locator('td');
        const newCellCount = await newCells.count();
        
        console.log(`🔍 After switching - First table has ${newCellCount} cells`);
        
        let hasSubjectData = false;
        for (let i = 0; i < Math.min(newCellCount, 20); i++) {
          const cellText = await newCells.nth(i).textContent();
          if (cellText && cellText.trim() && 
              !cellText.match(/^\d+$/) && 
              !['時限', '月', '火', '水', '木', '金', '土'].includes(cellText.trim())) {
            console.log(`📚 Subject Cell ${i}: "${cellText}"`);
            hasSubjectData = true;
          }
        }
        
        console.log(`📊 Has subject data: ${hasSubjectData}`);
        
        // ブラウザコンソールログの要約
        console.log('\n📋 Console Log Summary:');
        const relevantLogs = consoleLogs.filter(log => 
          log.includes('時間割詳細データ分析') ||
          log.includes('生成済み時間割') ||
          log.includes('convertFromGeneratedFormat') ||
          log.includes('変換') ||
          log.includes('フォールバック') ||
          log.includes('スロット検索') ||
          log.includes('スロット[') ||
          log.includes('比較結果') ||
          log.includes('授業内容') ||
          log.includes('厳密検索') ||
          log.includes('緩い検索')
        );
        
        relevantLogs.forEach((log, index) => {
          console.log(`  ${index + 1}. ${log}`);
        });
        
        if (relevantLogs.length === 0) {
          console.log('  ⚠️ No relevant debug logs found');
        }
        
        // さらに詳細なブラウザ内分析を実行
        console.log('\n🔬 Advanced Browser Analysis:');
        const detailedAnalysis = await page.evaluate(() => {
          // 現在表示されているテーブルのセル内容を詳細分析
          const tables = document.querySelectorAll('table');
          const analysis: any = {
            tableCount: tables.length,
            tableDetails: []
          };
          
          tables.forEach((table, tableIndex) => {
            const rows = table.querySelectorAll('tr');
            const tableDetail: any = {
              tableIndex,
              rowCount: rows.length,
              cellDetails: []
            };
            
            rows.forEach((row, rowIndex) => {
              const cells = row.querySelectorAll('td, th');
              cells.forEach((cell, cellIndex) => {
                const cellText = cell.textContent?.trim();
                if (cellText && 
                    !cellText.match(/^\\d+$/) && 
                    !['時限', '月', '火', '水', '木', '金', '土'].includes(cellText)) {
                  tableDetail.cellDetails.push({
                    row: rowIndex,
                    cell: cellIndex,
                    text: cellText,
                    hasSubjectTeacher: cellText.includes('先生') || cellText.includes('教科')
                  });
                }
              });
            });
            
            analysis.tableDetails.push(tableDetail);
          });
          
          return analysis;
        });
        
        console.log('📊 Table Analysis Result:', JSON.stringify(detailedAnalysis, null, 2));
        
      } else {
        throw new Error('No tables found in detail view');
      }
    } else {
      throw new Error('No detail buttons found');
    }
    
    // APIコールの確認
    console.log('\n📡 API Calls Summary:');
    apiCalls.forEach(call => {
      console.log(`  ${call.method} ${call.url} - Status: ${call.status || 'pending'}`);
    });
  });
});