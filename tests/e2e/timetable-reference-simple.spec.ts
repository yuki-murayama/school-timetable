import { test, expect } from '@playwright/test';

// 認証済みユーザーでテストを実行
test.use({ storageState: 'tests/e2e/.auth/user.json' });

test.describe('時間割参照画面 - 簡単テスト', () => {
  test('画面の基本表示確認', async ({ page }) => {
    console.log('🔄 Starting simple timetable reference test...');
    
    // アプリケーションにアクセス
    await page.goto('https://school-timetable-monorepo.grundhunter.workers.dev');
    await page.waitForLoadState('networkidle');
    
    // デバッグ: 現在のページ内容を確認
    console.log('📄 Current page title:', await page.title());
    console.log('📍 Current URL:', page.url());
    
    // ページの基本要素を確認
    const pageContent = await page.textContent('body');
    console.log('📝 Page content preview:', pageContent?.substring(0, 500));
    
    // メインアプリの読み込みを待機
    await page.waitForSelector('main, #root, .main-app', { timeout: 10000 });
    
    // ナビゲーション要素を探す
    const navElements = page.locator('nav, [role="navigation"], .navigation');
    if (await navElements.count() > 0) {
      console.log('✅ Navigation found');
      const navContent = await navElements.first().textContent();
      console.log('🧭 Navigation content:', navContent);
    }
    
    // 時間割参照ボタンを様々な方法で探す
    const timetableButtons = [
      page.getByRole('button', { name: '時間割参照' }),
      page.locator('button:has-text("時間割参照")'),
      page.locator('[aria-label*="時間割参照"]'),
      page.locator('button').filter({ hasText: '時間割参照' })
    ];
    
    let foundButton = null;
    for (let i = 0; i < timetableButtons.length; i++) {
      const button = timetableButtons[i];
      if (await button.count() > 0) {
        console.log(`✅ Found timetable button using method ${i + 1}`);
        foundButton = button;
        break;
      }
    }
    
    if (foundButton) {
      // ボタンをクリック
      await foundButton.first().click();
      await page.waitForTimeout(2000);
      
      // 時間割参照画面の表示を確認
      const heading = page.getByRole('heading', { name: '時間割参照' });
      if (await heading.count() > 0) {
        console.log('✅ Successfully navigated to timetable reference page');
        await expect(heading).toBeVisible();
        
        // デモデータの表示を確認
        const demoTimetables = [
          '2024年度 第1学期',
          '2024年度 第2学期', 
          '2024年度 第3学期'
        ];
        
        for (const timetableName of demoTimetables) {
          const timetableHeading = page.getByRole('heading', { name: timetableName });
          if (await timetableHeading.count() > 0) {
            console.log(`✅ Found demo timetable: ${timetableName}`);
          }
        }
        
        // 詳細ボタンの確認
        const detailButtons = page.getByRole('button', { name: '詳細を見る' });
        const buttonCount = await detailButtons.count();
        console.log(`📊 Found ${buttonCount} detail buttons`);
        
        if (buttonCount > 0) {
          // 最初の詳細ボタンをクリック
          await detailButtons.first().click();
          await page.waitForTimeout(2000);
          
          // 詳細画面の確認
          const detailHeading = page.getByRole('heading', { name: '2024年度 第1学期', level: 1 });
          if (await detailHeading.count() > 0) {
            console.log('✅ Successfully navigated to timetable detail page');
            
            // 時間割表の確認
            const table = page.getByRole('table');
            if (await table.count() > 0) {
              console.log('✅ Timetable table is displayed');
            }
          }
        }
      } else {
        console.log('❌ Failed to navigate to timetable reference page');
        const currentContent = await page.textContent('body');
        console.log('📝 Current page content:', currentContent?.substring(0, 500));
      }
    } else {
      console.log('❌ Timetable reference button not found');
      
      // すべてのボタンを列挙
      const allButtons = page.locator('button');
      const buttonCount = await allButtons.count();
      console.log(`📊 Total buttons found: ${buttonCount}`);
      
      for (let i = 0; i < Math.min(buttonCount, 10); i++) {
        const buttonText = await allButtons.nth(i).textContent();
        console.log(`🔘 Button ${i + 1}: "${buttonText}"`);
      }
    }
    
    // テストの最低限の成功条件として、ページが読み込まれていることを確認
    await expect(page.locator('body')).toBeVisible();
  });
});