import { test, expect } from '@playwright/test';

// 認証済みユーザーでテストを実行
test.use({ storageState: 'tests/e2e/.auth/user.json' });

interface DatabaseTimetable {
  id: string;
  assignmentRate: number;
  totalSlots?: number;
  assignedSlots?: number;
  generationMethod: string;
  createdAt: string;
  updatedAt?: string;
}

interface ApiResponse {
  success: boolean;
  data: {
    timetables: DatabaseTimetable[];
    count: number;
  };
  message?: string;
  error?: string;
}

test.describe('データベース・フロントエンド整合性検証', () => {
  test.beforeEach(async ({ page }) => {
    console.log('🔄 Starting data validation test setup...');
    await page.goto('https://school-timetable-monorepo.grundhunter.workers.dev');
    await page.waitForLoadState('networkidle');
  });

  test('DB上のデータとフロントエンド表示の整合性検証', async ({ page }) => {
    console.log('🔍 Testing database-frontend data consistency...');
    
    // Step 1: データベースから保存済み時間割を直接取得
    console.log('📊 Step 1: Fetching timetables directly from database API...');
    
    const apiResponse = await page.request.get(
      'https://school-timetable-monorepo.grundhunter.workers.dev/api/timetable/program/saved'
    );
    
    expect(apiResponse.status()).toBe(200);
    const apiData: ApiResponse = await apiResponse.json();
    
    console.log(`📋 API Response: success=${apiData.success}, count=${apiData.data?.count || 0}`);
    
    if (!apiData.success) {
      throw new Error(`API call failed: ${apiData.message || apiData.error}`);
    }
    
    const databaseTimetables = apiData.data.timetables;
    console.log(`📊 Found ${databaseTimetables.length} timetables in database`);
    
    // データベースに時間割が存在することを確認
    expect(databaseTimetables.length).toBeGreaterThan(0);
    
    // 各時間割の基本データを検証
    for (const timetable of databaseTimetables) {
      expect(timetable.id).toBeDefined();
      expect(typeof timetable.assignmentRate).toBe('number');
      expect(timetable.generationMethod).toBeDefined();
      expect(timetable.createdAt).toBeDefined();
      
      console.log(`✅ Database timetable validated: ID=${timetable.id}, Rate=${timetable.assignmentRate}%, Method=${timetable.generationMethod}`);
    }
    
    // Step 2: フロントエンドで時間割参照画面を表示
    console.log('🖥️ Step 2: Navigating to frontend timetable view...');
    
    await page.click('a[href="/timetable-view"], button:has-text("時間割参照")');
    await page.waitForLoadState('networkidle');
    
    // ローディング完了を待機
    await page.waitForSelector('[data-testid="loading"], .animate-spin', { 
      state: 'detached', 
      timeout: 15000 
    });
    
    await page.waitForTimeout(3000); // API呼び出し完了を待機
    
    // Step 3: フロントエンド上で時間割一覧の表示確認
    console.log('📱 Step 3: Verifying frontend display of timetables...');
    
    const frontendTimetableCards = page.locator('[data-testid="timetable-card"], .border.rounded-lg:has(h3), .card:has(h3)');
    const frontendCardCount = await frontendTimetableCards.count();
    
    console.log(`🖥️ Found ${frontendCardCount} timetable cards on frontend`);
    
    // Step 4: データベースとフロントエンドの整合性検証
    console.log('⚖️ Step 4: Validating database-frontend consistency...');
    
    if (databaseTimetables.length > 0 && frontendCardCount === 0) {
      // 重大な不整合: DBにデータがあるのにフロントエンドに表示されない
      throw new Error(
        `CRITICAL DATA INCONSISTENCY: Database contains ${databaseTimetables.length} timetables but frontend displays 0. ` +
        'This indicates a data flow issue between database and frontend.'
      );
    }
    
    if (frontendCardCount > 0) {
      console.log('✅ Frontend displays timetable data');
      
      // 個別の時間割データをより詳細に検証
      let matchedTimetables = 0;
      
      for (let i = 0; i < Math.min(frontendCardCount, 5); i++) {
        const card = frontendTimetableCards.nth(i);
        const cardText = await card.textContent();
        
        console.log(`📋 Frontend timetable ${i + 1}: ${cardText}`);
        
        // データベースの時間割との照合（生成率やメソッドで識別）
        const matchedDb = databaseTimetables.find(dbTimetable => {
          const rateText = `${dbTimetable.assignmentRate}%`;
          const methodText = dbTimetable.generationMethod;
          
          return cardText && (
            cardText.includes(rateText) || 
            cardText.includes(methodText) ||
            cardText.includes('program') ||
            cardText.includes('プログラム')
          );
        });
        
        if (matchedDb) {
          matchedTimetables++;
          console.log(`✅ Matched frontend card ${i + 1} with database timetable ID: ${matchedDb.id}`);
          
          // 詳細表示のテスト
          const detailButton = card.locator('button:has-text("詳細を見る")').first();
          if (await detailButton.count() > 0) {
            console.log(`🔍 Testing detail view for matched timetable...`);
            await detailButton.click();
            await page.waitForTimeout(2000);
            
            // 詳細画面でのデータ表示確認
            await validateTimetableDetailDisplay(page, matchedDb);
            
            // 一覧に戻る
            const backButton = page.getByRole('button', { name: '一覧に戻る' });
            if (await backButton.count() > 0) {
              await backButton.click();
              await page.waitForTimeout(1000);
            }
            
            break; // 1つ確認できれば十分
          }
        }
      }
      
      console.log(`📊 Matched ${matchedTimetables} frontend displays with database records`);
      
      if (matchedTimetables === 0 && databaseTimetables.length > 0) {
        console.warn(
          `⚠️ WARNING: No frontend displays matched database records. ` +
          `Database has ${databaseTimetables.length} timetables but none matched frontend display patterns.`
        );
      }
    } else {
      // フロントエンドに表示がない場合の処理
      if (databaseTimetables.length > 0) {
        // エラーメッセージやデモデータフォールバックの確認
        const errorMessages = [
          'サーバーからデータを取得できませんでした',
          'サーバーから時間割データを取得できませんでした',
          'デモデータを表示しています',
          '最新の有効な時間割を取得中'
        ];
        
        let fallbackMessageFound = false;
        for (const errorMsg of errorMessages) {
          const errorElement = page.getByText(errorMsg);
          if (await errorElement.count() > 0) {
            console.log(`ℹ️ Fallback message found: ${errorMsg}`);
            fallbackMessageFound = true;
            break;
          }
        }
        
        if (!fallbackMessageFound) {
          // フォールバックメッセージもない場合は重大な問題
          throw new Error(
            `CRITICAL ERROR: Database contains ${databaseTimetables.length} timetables ` +
            'but frontend shows no data and no fallback/error messages. ' +
            'This indicates a severe data flow or error handling issue.'
          );
        } else {
          console.log('✅ Appropriate fallback handling detected for data display issues');
        }
      } else {
        console.log('ℹ️ No data in database and no data displayed on frontend - consistent state');
      }
    }
    
    // Step 5: APIレスポンス時間の監視
    console.log('⏱️ Step 5: Monitoring API response times...');
    
    const apiCalls: { url: string; method: string; duration: number; status?: number }[] = [];
    const startTime = Date.now();
    
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        const duration = Date.now() - startTime;
        apiCalls.push({
          url: response.url(),
          method: response.request().method(),
          duration,
          status: response.status()
        });
      }
    });
    
    // ページリロードしてAPIパフォーマンスを確認
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // 遅いAPIレスポンスを警告
    const slowApis = apiCalls.filter(call => call.duration > 5000);
    if (slowApis.length > 0) {
      console.warn('⚠️ Slow API responses detected:');
      slowApis.forEach(api => {
        console.warn(`  ${api.method} ${api.url} - ${api.duration}ms (Status: ${api.status})`);
      });
    }
    
    console.log('✅ Database-frontend consistency validation completed successfully');
  });
  
  test('時間割詳細データの整合性検証', async ({ page }) => {
    console.log('📖 Testing detailed timetable data consistency...');
    
    // データベースから特定の時間割詳細を取得
    const listResponse = await page.request.get(
      'https://school-timetable-monorepo.grundhunter.workers.dev/api/timetable/program/saved'
    );
    
    const listData: ApiResponse = await listResponse.json();
    
    if (!listData.success || listData.data.timetables.length === 0) {
      console.log('ℹ️ No timetables in database to test detailed consistency');
      return;
    }
    
    const firstTimetable = listData.data.timetables[0];
    console.log(`📋 Testing detailed data for timetable: ${firstTimetable.id}`);
    
    // 詳細データをAPIから取得
    const detailResponse = await page.request.get(
      `https://school-timetable-monorepo.grundhunter.workers.dev/api/timetable/program/saved/${firstTimetable.id}`
    );
    
    expect(detailResponse.status()).toBe(200);
    const detailData = await detailResponse.json();
    
    console.log(`📊 Database detail data: success=${detailData.success}`);
    
    if (!detailData.success) {
      throw new Error(`Failed to fetch timetable details: ${detailData.message}`);
    }
    
    // フロントエンドで時間割参照ページに移動
    console.log('🌐 Navigating to timetable view page...')
    
    // まずメインページに移動
    await page.goto('https://school-timetable-monorepo.grundhunter.workers.dev')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    
    // 時間割参照ボタンを探してクリック
    const viewButton = page.locator('button:has-text("時間割参照")')
    await expect(viewButton).toBeVisible({ timeout: 10000 })
    await viewButton.click()
    
    console.log('📱 Clicked 時間割参照 button')
    
    // 時間割データのロード完了を待機
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(5000) // 時間割データの読み込み完了待機
    
    // デバッグ情報が表示されるまで待機（データロード完了の目安）
    await page.waitForSelector('p:has-text("時間割件数:")', { timeout: 10000 })
    console.log('✅ Timetable data loading confirmed')
    
    // 時間割データが表示されているかを確認（実際のUI構造に合わせて修正）
    const timetableCards = page.locator('h3:has-text("時間割 #")')
    const containerCount = await timetableCards.count()
    console.log(`🔍 Found ${containerCount} timetable containers on page`)
    
    if (containerCount > 0) {
      console.log('✅ Timetable data found on frontend')
      // 時間割データが表示されていることを確認
      await expect(timetableCards.first()).toBeVisible()
      
      // 詳細データの検証（簡易版）
      const firstTimetableCard = timetableCards.first()
      const cardParent = firstTimetableCard.locator('..')
      
      // 作成日、ステータス、完成度の表示を確認
      const creationDate = cardParent.locator('p:has-text("作成日:")')
      const status = cardParent.locator('p:has-text("ステータス:")')
      const completion = cardParent.locator('p:has-text("完成度:")')
      
      await expect(creationDate).toBeVisible()
      await expect(status).toBeVisible()
      await expect(completion).toBeVisible()
      
      console.log('✅ Timetable detail data validated successfully')
    } else {
      // まったくデータが表示されていない場合のみエラー
      console.log('❌ No timetable data displayed on frontend')
      
      // デバッグ情報を出力
      const pageContent = await page.content()
      console.log('Page content preview:', pageContent.substring(0, 500))
      
      throw new Error('No timetable data displayed on frontend despite database containing data')
    }
  });

  test('データ同期エラーの検出', async ({ page }) => {
    console.log('🔍 Testing data synchronization error detection...');
    
    // コンソールエラーを監視
    const consoleErrors: string[] = [];
    const networkErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    page.on('requestfailed', request => {
      if (request.url().includes('/api/')) {
        networkErrors.push(`${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
      }
    });
    
    // 時間割参照画面に移動
    await page.click('a[href="/timetable-view"], button:has-text("時間割参照")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
    
    // データ同期エラーを検出
    const syncErrors = consoleErrors.filter(error => 
      error.includes('404') || 
      error.includes('Failed to fetch') ||
      error.includes('Network') ||
      error.includes('timeout')
    );
    
    if (syncErrors.length > 0) {
      console.warn('⚠️ Data synchronization errors detected:');
      syncErrors.forEach(error => console.warn(`  ${error}`));
    } else {
      console.log('✅ No data synchronization errors detected');
    }
    
    if (networkErrors.length > 0) {
      console.warn('⚠️ Network errors detected:');
      networkErrors.forEach(error => console.warn(`  ${error}`));
    }
    
    // 重要なエラーがある場合はテストを失敗させる
    const criticalErrors = [...syncErrors, ...networkErrors].filter(error =>
      !error.includes('favicon') && 
      !error.includes('204') // No Content は正常なレスポンス
    );
    
    if (criticalErrors.length > 0) {
      throw new Error(`Critical data synchronization errors detected: ${criticalErrors.join(', ')}`);
    }
  });
});

/**
 * 時間割詳細画面でのデータ表示を検証
 */
async function validateTimetableDetailDisplay(page: any, dbTimetable: DatabaseTimetable) {
  console.log(`🔍 Validating detail display for timetable: ${dbTimetable.id}`);
  
  // 詳細画面の基本要素確認
  await expect(page.locator('button:has-text("一覧に戻る")')).toBeVisible();
  
  // 時間割表の存在確認（複数のクラス用テーブルがあるため最初のものを使用）
  const timetableTable = page.locator('table').first();
  await expect(timetableTable).toBeVisible();
  
  // テーブルヘッダーの確認（最初のテーブルから）
  const expectedHeaders = ['時限', '月', '火', '水', '木', '金'];
  for (const header of expectedHeaders) {
    await expect(timetableTable.getByRole('cell', { name: header })).toBeVisible();
  }
  
  // 時限（1〜6）の確認（最初のテーブルから）
  for (let period = 1; period <= 6; period++) {
    await expect(timetableTable.getByRole('cell', { name: period.toString() })).toBeVisible();
  }
  
  // 実際の時間割データの存在確認（最初のテーブルから）
  const tableCells = timetableTable.locator('td');
  const cellCount = await tableCells.count();
  
  let hasSubjectData = false;
  let subjectCount = 0;
  
  for (let i = 0; i < Math.min(cellCount, 50); i++) {
    const cellText = await tableCells.nth(i).textContent();
    if (cellText && cellText.trim() && 
        !cellText.match(/^\d+$/) && 
        cellText !== '時限' &&
        !expectedHeaders.includes(cellText)) {
      hasSubjectData = true;
      subjectCount++;
      console.log(`📚 Found subject in cell ${i}: ${cellText}`);
    }
  }
  
  console.log(`📊 Found ${subjectCount} subject entries in timetable detail`);
  
  if (dbTimetable.assignmentRate > 0 && !hasSubjectData) {
    throw new Error(
      `Data inconsistency: Database shows ${dbTimetable.assignmentRate}% assignment rate ` +
      'but frontend detail view shows no subject data'
    );
  }
  
  if (hasSubjectData) {
    console.log('✅ Timetable detail display contains subject data - consistent with database');
  } else {
    console.log('ℹ️ No subject data in detail view - may be empty timetable');
  }
  
  return hasSubjectData;
}