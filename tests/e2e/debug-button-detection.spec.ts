import { test, expect } from '@playwright/test';

test('Debug - 編集・削除ボタンのアクセシビリティ属性確認', async ({ page }) => {
  console.log('🔍 編集・削除ボタンのアクセシビリティ属性をデバッグ');
  
  // 認証済み状態でアプリケーションに移動
  await page.goto('https://school-timetable-monorepo.grundhunter.workers.dev/');
  await page.waitForTimeout(2000);
  
  // データ登録ページに移動
  await page.click('button:has-text("データ登録")');
  await page.waitForTimeout(1000);
  
  // 教科情報タブに移動
  await page.click('button:has-text("教科情報")');
  await page.waitForTimeout(2000);
  
  console.log('📊 教科情報テーブルの状態確認');
  
  // 教科テーブルのすべての行を取得
  const subjectRows = page.locator('table tbody tr');
  const rowCount = await subjectRows.count();
  console.log(`📊 教科行数: ${rowCount}`);
  
  if (rowCount > 0) {
    // 最初の教科行を詳しく調査
    const firstRow = subjectRows.first();
    const rowText = await firstRow.textContent();
    console.log(`📝 最初の行内容: ${rowText?.substring(0, 100)}...`);
    
    // すべてのボタンを調査
    const allButtons = firstRow.locator('button');
    const buttonCount = await allButtons.count();
    console.log(`🔘 行内のボタン数: ${buttonCount}`);
    
    for (let i = 0; i < buttonCount; i++) {
      const button = allButtons.nth(i);
      const buttonText = await button.textContent();
      const testId = await button.getAttribute('data-testid');
      const ariaLabel = await button.getAttribute('aria-label');
      const title = await button.getAttribute('title');
      const classes = await button.getAttribute('class');
      
      console.log(`🔘 ボタン ${i + 1}:`);
      console.log(`   テキスト: "${buttonText}"`);
      console.log(`   data-testid: "${testId}"`);
      console.log(`   aria-label: "${ariaLabel}"`);
      console.log(`   title: "${title}"`);
      console.log(`   classes: "${classes}"`);
      console.log('---');
    }
    
    // 教科名を取得して具体的なボタン検索
    const subjectNameCell = firstRow.locator('td').first();
    const subjectName = await subjectNameCell.textContent();
    console.log(`📚 教科名: "${subjectName}"`);
    
    if (subjectName) {
      // 新しいdata-testid属性でボタンを検索
      const editButtonWithTestId = page.locator(`[data-testid^="edit-subject-"]`);
      const editButtonCount = await editButtonWithTestId.count();
      console.log(`✏️ edit-subject-で始まるdata-testid持ちボタン数: ${editButtonCount}`);
      
      const deleteButtonWithTestId = page.locator(`[data-testid^="delete-subject-"]`);
      const deleteButtonCount = await deleteButtonWithTestId.count();
      console.log(`🗑️ delete-subject-で始まるdata-testid持ちボタン数: ${deleteButtonCount}`);
      
      // aria-labelでボタンを検索
      const editButtonWithAria = page.locator('button[aria-label*="編集"]');
      const editAriaCount = await editButtonWithAria.count();
      console.log(`✏️ aria-label*="編集"ボタン数: ${editAriaCount}`);
      
      const deleteButtonWithAria = page.locator('button[aria-label*="削除"]');
      const deleteAriaCount = await deleteButtonWithAria.count();
      console.log(`🗑️ aria-label*="削除"ボタン数: ${deleteAriaCount}`);
      
      // 特定の教科行内のボタン検索
      const specificEditButton = page.locator(`tr:has-text("${subjectName}") button[data-testid^="edit-subject-"], tr:has-text("${subjectName}") button[aria-label*="編集"]`);
      const specificEditCount = await specificEditButton.count();
      console.log(`🎯 特定行内の編集ボタン数: ${specificEditCount}`);
      
      if (specificEditCount > 0) {
        const editTestId = await specificEditButton.first().getAttribute('data-testid');
        const editAriaLabel = await specificEditButton.first().getAttribute('aria-label');
        console.log(`✅ 編集ボタン検出成功 - data-testid: "${editTestId}", aria-label: "${editAriaLabel}"`);
      } else {
        console.log(`❌ 編集ボタンが検出できませんでした`);
      }
    }
  } else {
    console.log('⚠️ 教科データが見つかりません');
  }
  
  // スクリーンショットを保存
  await page.screenshot({ path: 'debug-button-attributes.png', fullPage: true });
  console.log('📸 スクリーンショット保存: debug-button-attributes.png');
});