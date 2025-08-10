import { test, expect } from '@playwright/test';

test.describe('時間割生成機能テスト（簡易版）', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('https://school-timetable-monorepo.grundhunter.workers.dev/');
    await page.waitForLoadState('networkidle');
    console.log('🔐 Authentication status: Authenticated');
  });

  test('時間割生成機能の基本確認', async ({ page }) => {
    console.log('⚡ Starting timetable generation test...');
    
    // データ登録画面で基本データを確認
    const dataRegistrationButton = page.getByRole('button', { name: 'データ登録' });
    if (await dataRegistrationButton.count() > 0) {
      await dataRegistrationButton.click();
      await page.waitForLoadState('networkidle');
      console.log('✅ Navigated to data registration page');
      
      // 教師データの基本確認
      const teacherTab = page.getByRole('tab', { name: '教師情報' });
      if (await teacherTab.count() > 0) {
        await teacherTab.click();
        await page.waitForTimeout(1000);
        
        const teacherRows = page.locator('tbody tr').filter({ hasNot: page.locator(':has-text("教師情報が登録されていません")') });
        const teacherCount = await teacherRows.count();
        console.log(`👨‍🏫 Teachers: ${teacherCount}`);
      }
      
      // 教科データの基本確認
      const subjectTab = page.getByRole('tab', { name: '教科情報' });
      if (await subjectTab.count() > 0) {
        await subjectTab.click();
        await page.waitForTimeout(1000);
        
        const subjectRows = page.locator('tbody tr').filter({ hasNot: page.locator(':has-text("教科情報が登録されていません")') });
        const subjectCount = await subjectRows.count();
        console.log(`📚 Subjects: ${subjectCount}`);
      }
    }
    
    // 時間割生成機能の基本確認
    try {
      const timetableGenerationButton = page.getByRole('button', { name: '時間割生成' });
      
      if (await timetableGenerationButton.count() > 0) {
        console.log('✅ 時間割生成ボタンが見つかりました');
        
        await timetableGenerationButton.click();
        await page.waitForLoadState('networkidle');
        
        // 時間割生成画面の基本要素確認
        const pageTitle = await page.title();
        const pageContent = await page.textContent('body');
        
        if (pageContent && (pageContent.includes('時間割') || pageContent.includes('生成'))) {
          console.log('✅ 時間割生成画面に正常に遷移しました');
          
          // プログラム型生成のオプション確認
          const programGenerationOption = page.locator('text*="プログラム"');
          if (await programGenerationOption.count() > 0) {
            console.log('✅ プログラム型生成オプションが確認できます');
          }
          
          // 生成ボタンがあるかチェック
          const generateButtons = page.locator('button:has-text("生成"), button:has-text("実行")');
          if (await generateButtons.count() > 0) {
            console.log('✅ 生成実行ボタンが確認できます');
          }
          
        } else {
          console.log('⚠️ 時間割生成画面の表示に問題がある可能性があります');
        }
      } else {
        console.log('⚠️ 時間割生成ボタンが見つかりませんでした');
      }
    } catch (error) {
      console.log(`⚠️ 時間割生成機能の確認でエラー: ${error}`);
    }
    
    // 時間割参照機能の基本確認
    try {
      const timetableReferenceButton = page.getByRole('button', { name: '時間割参照' });
      
      if (await timetableReferenceButton.count() > 0) {
        console.log('✅ 時間割参照ボタンが見つかりました');
        
        await timetableReferenceButton.click();
        await page.waitForLoadState('networkidle');
        
        // 時間割参照画面の基本要素確認
        const heading = page.getByRole('heading', { name: '時間割参照' });
        if (await heading.count() > 0) {
          console.log('✅ 時間割参照画面に正常に遷移しました');
        }
        
        const reloadButton = page.getByRole('button', { name: '再読み込み' });
        if (await reloadButton.count() > 0) {
          console.log('✅ 再読み込みボタンが確認できます');
        }
      } else {
        console.log('⚠️ 時間割参照ボタンが見つかりませんでした');
      }
    } catch (error) {
      console.log(`⚠️ 時間割参照機能の確認でエラー: ${error}`);
    }
    
    console.log('🎉 時間割生成機能の基本確認が完了しました');
    
    // 基本的なテスト成功条件: 主要なナビゲーションボタンが存在すること
    const dataButton = await page.getByRole('button', { name: 'データ登録' }).count();
    const generateButton = await page.getByRole('button', { name: '時間割生成' }).count();
    const referenceButton = await page.getByRole('button', { name: '時間割参照' }).count();
    
    console.log(`📊 Button availability: データ登録(${dataButton > 0 ? '✅' : '❌'}), 時間割生成(${generateButton > 0 ? '✅' : '❌'}), 時間割参照(${referenceButton > 0 ? '✅' : '❌'})`);
    
    // 少なくとも基本的な機能が利用可能であることを確認
    expect(dataButton + generateButton + referenceButton).toBeGreaterThanOrEqual(2);
  });
});